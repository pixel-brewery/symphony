// #region Imports

import { describe, expect, it } from 'vitest';
import { projectWorkflowGraph } from './projectWorkflowGraph';

// #endregion

describe('projectWorkflowGraph', () => {
  it('retains parallel dependencies, matrices, target environments and the exact revision', () => {
    // arrange
    const document = {
      jobs: {
        lint: {},
        test: { strategy: { matrix: { os: ['linux', 'macos'] } } },
        deploy: { needs: ['lint', 'test'], environment: { name: 'staging' }, if: 'success()' },
      },
    };
    // act
    const graph = projectWorkflowGraph(
      document,
      'executed-revision',
      '.github/workflows/delivery.yml',
    );
    // assert
    expect(graph.revision).toBe('executed-revision');
    expect(graph.jobs.find((job) => job.id === 'deploy')).toMatchObject({
      needs: ['lint', 'test'],
      environment: 'staging',
    });
    expect(graph.jobs.find((job) => job.id === 'test')?.matrix).toBe(true);
  });
  it('marks unresolved expressions without evaluating or inventing edges', () => {
    // arrange
    const document = {
      jobs: { dynamic: { name: '${{ matrix.job }}', needs: ['missing', '${{ inputs.needs }}'] } },
    };
    // act
    const graph = projectWorkflowGraph(document, 'revision', 'workflow.yml');
    // assert
    expect(graph.unresolved).toHaveLength(3);
    expect(graph.jobs[0]?.needs).toEqual(['missing', '${{ inputs.needs }}']);
  });
});
