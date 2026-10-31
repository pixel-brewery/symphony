// #region Imports

import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// #endregion

export default defineConfig({
  oxc: {
    decorator: { legacy: true },
  },
  resolve: {
    alias: {
      '@symphony/frontend-core/delivery': resolve('libs/frontend/core/src/delivery.ts'),
      '@symphony/frontend-core/testing/orchestration': resolve(
        'libs/frontend/core/src/testing-orchestration.ts',
      ),
      '@symphony/frontend-core/testing': resolve('libs/frontend/core/src/testing.ts'),
      '@symphony/frontend-core/navigation': resolve('libs/frontend/core/src/navigation.ts'),
      '@symphony/frontend-core/work': resolve('libs/frontend/core/src/work.ts'),
      '@symphony/frontend-core/workspace': resolve('libs/frontend/core/src/workspace.ts'),
      '@symphony/frontend-core/execution': resolve('libs/frontend/core/src/execution.ts'),
      '@symphony/frontend-core/workflow': resolve('libs/frontend/core/src/workflow.ts'),
      '@symphony/frontend-core/desktop': resolve('libs/frontend/core/src/desktop.ts'),
      '@symphony/frontend-feature-execution/projections': resolve(
        'libs/frontend/features/execution/src/projections.ts',
      ),
      '@symphony/frontend-core/ai': resolve('libs/frontend/core/src/ai.ts'),
      '@symphony/frontend-core/mobile-access': resolve('libs/frontend/core/src/mobile-access.ts'),
      '@symphony/frontend-core/mobile': resolve('libs/frontend/core/src/mobile.ts'),
      '@symphony/frontend-core/feedback': resolve('libs/frontend/core/src/feedback.ts'),
      '@symphony/frontend-core/team': resolve('libs/frontend/core/src/team.ts'),
      '@symphony/frontend-core/automation': resolve('libs/frontend/core/src/automation.ts'),
      '@symphony/frontend-core/platform': resolve('libs/frontend/core/src/platform.ts'),
      '@symphony/frontend-core/configuration': resolve('libs/frontend/core/src/configuration.ts'),
      '@symphony/frontend-core/bootstrap': resolve('libs/frontend/core/src/bootstrap.ts'),
      '@symphony/frontend-core/projection': resolve('libs/frontend/core/src/projection.ts'),
      '@symphony/frontend-core/ci': resolve('libs/frontend/core/src/ci.ts'),
      '@symphony/frontend-core/delivery-operations': resolve(
        'libs/frontend/core/src/delivery-operations.ts',
      ),
      '@symphony/frontend-core/snapshot': resolve('libs/frontend/core/src/snapshot.ts'),
      '@symphony/frontend-core/synchronization': resolve(
        'libs/frontend/core/src/synchronization.ts',
      ),
      '@symphony/frontend-presentation/context': resolve(
        'libs/frontend/presentation/src/context.ts',
      ),
      '@symphony/frontend-core': resolve('libs/frontend/core/src/index.ts'),
      '@symphony/mobile-contracts': resolve('libs/mobile-contracts/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['apps/renderer/src/test-setup.ts'],
    server: {
      deps: {
        inline: [/@pixel-brewery\/mosaik-elements-(angular|foundation)/],
      },
    },
    include: ['apps/renderer/**/*.spec.ts', 'libs/frontend/**/*.spec.ts'],
    exclude: [
      // Game journeys remain suspended; feature registration and settings are verified here.
      'libs/frontend/features/arcade/src/lib/games/**/*.spec.ts',
      'libs/frontend/features/mobile/src/lib/browser/state/MobileCompanionStore.spec.ts',
      'libs/frontend/features/mobile/src/lib/browser/theme/MobileThemeStore.spec.ts',
      'libs/frontend/features/work/src/lib/board/mobile/MobileHomeViewPresenter.spec.ts',
      'libs/frontend/features/work/src/lib/board/mobile/MobileTicketDetailViewPresenter.spec.ts',
      'libs/frontend/features/work/src/lib/board/mobile/MobileWorkItemCreateViewPresenter.spec.ts',
    ],
  },
});
