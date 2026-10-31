// #region Imports

import type { DatabaseSync } from 'node:sqlite';
import type { ILocalCiExecutionRepository } from '@symphony/application-ci';
import type { SqliteDatabase } from '@symphony/persistence-core';
import type { ILocalCiExecution } from '@symphony/domain-ci';
import { localCiExecutionSchema } from './LocalCiExecutionSchema';

// #endregion

interface IPayloadRow {
  readonly payload: string;
}

/**
 * Persists only the LocalCiExecution records through a shared database owner.
 *
 * @public
 */
export class SqliteLocalCiExecutionRepository implements ILocalCiExecutionRepository {
  // #region Fields

  private readonly _database: DatabaseSync;

  // #endregion

  // #region Ctor

  /**
   * Uses the database connection supplied by composition.
   *
   * @param database - Shared SQLite connection owner.
   * @public
   */
  public constructor(database: SqliteDatabase) {
    this._database = database.connection;
  }

  // #endregion

  // #region Methods

  /**
   * Applies this feature's unchanged schema for independent adapter use.
   *
   * @public
   */
  public initialize(): void {
    this._database.exec(localCiExecutionSchema);
  }

  /**
   * Saves the local CI execution.
   *
   * @param execution - Execution.
   * @public
   */
  public saveLocalCiExecution(execution: ILocalCiExecution): void {
    const boundedExecution = boundLocalCiExecution(execution);
    this._database
      .prepare(
        `INSERT INTO local_ci_executions(
           id, repository_binding_id, workspace_id, payload, started_at
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
      )
      .run(
        boundedExecution.id,
        boundedExecution.repositoryBindingId,
        boundedExecution.workspaceId,
        JSON.stringify(boundedExecution),
        boundedExecution.startedAt,
      );
  }

  /**
   * Lists the local CI executions.
   *
   * @public
   */
  public listLocalCiExecutions(): readonly ILocalCiExecution[] {
    return (
      this._database
        .prepare('SELECT payload FROM local_ci_executions ORDER BY started_at DESC LIMIT 100')
        .all() as unknown as IPayloadRow[]
    ).map((row) => boundLocalCiExecution(JSON.parse(row.payload) as ILocalCiExecution));
  }

  // #endregion
}

function boundLocalCiExecution(execution: ILocalCiExecution): ILocalCiExecution {
  return {
    ...execution,
    ...(execution.failureLog ? { failureLog: boundedFailureLog(execution.failureLog) } : {}),
    ...(execution.localDiagnostics
      ? { localDiagnostics: execution.localDiagnostics.slice(-64_000) }
      : {}),
  };
}

function boundedFailureLog(value: string): string {
  if (value.length < 64_000) return value;
  const lines = value.split(/\r?\n/u);
  const primaryDiagnostic =
    /##\[error\]|\bassertion\b|(?:^|[\s:])error(?::|\s)|expect\(|locator\(/iu;
  const testDiagnostic = /\.(?:spec|test)\.[cm]?[jt]sx?/iu;
  const hasPrimaryDiagnostics = lines.some((line) => primaryDiagnostic.test(line));
  const hasTestDiagnostics = lines.some((line) => testDiagnostic.test(line));
  const diagnosticLines = new Set<number>();
  for (const [index, line] of lines.entries()) {
    if (
      !(hasPrimaryDiagnostics
        ? primaryDiagnostic.test(line)
        : hasTestDiagnostics
          ? testDiagnostic.test(line)
          : /\b(?:failed|failure|timeout)\b/iu.test(line))
    ) {
      continue;
    }
    for (let contextIndex = index; contextIndex <= index + 3; contextIndex += 1) {
      if (contextIndex < lines.length) diagnosticLines.add(contextIndex);
    }
  }
  if (!diagnosticLines.size) return value.slice(-64_000);
  const excerpts: string[] = [];
  let previous = -2;
  for (const index of [...diagnosticLines].toSorted((left, right) => left - right)) {
    if (excerpts.length && index > previous + 1) excerpts.push('…');
    excerpts.push(lines[index] ?? '');
    previous = index;
  }
  return excerpts.join('\n').slice(-64_000);
}
