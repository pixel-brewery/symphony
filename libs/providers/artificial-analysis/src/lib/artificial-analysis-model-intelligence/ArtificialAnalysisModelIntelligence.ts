// #region Imports

import { EFFORT_TOKENS } from './EffortTokens';
import type { IArtificialAnalysisModelDocument } from './IArtificialAnalysisModelDocument';
import type { IArtificialAnalysisModelIntelligenceOptions } from './IArtificialAnalysisModelIntelligenceOptions';
import type { ICatalogEntry } from './ICatalogEntry';
import type { IModelIntelligenceReport } from './IModelIntelligenceReport';
import type { IModelIntelligenceScore } from './IModelIntelligenceScore';
import type { IModelIntelligenceTarget } from './IModelIntelligenceTarget';
import { targetTokens } from './TargetTokens';
import { tokenize } from './tokenize';
import { unscored } from './unscored';

// #endregion

/**
 * Live client for the Artificial Analysis Data API. Local model ids are short aliases
 * ("opus", "gpt-5.6-sol"), so matching is token-based: an entry qualifies when it contains
 * every token of the alias, the requested reasoning-effort variant wins over the unmarked
 * base entry, and the newest release breaks family ties (the alias of a CLI points to the
 * latest generation). The catalog is cached because the free tier allows 100 requests per day.
 */
export class ArtificialAnalysisModelIntelligence {
  // #region Fields

  private readonly _fetchImpl: typeof globalThis.fetch;
  private readonly _baseUrl: string;
  private readonly _cacheTtlMilliseconds: number;
  private readonly _now: () => number;
  private _cached?: { readonly catalog: ICatalog; readonly expiresAt: number };
  private _pending?: Promise<ICatalog>;

  // #endregion

  // #region Ctor

  public constructor(private readonly _options: IArtificialAnalysisModelIntelligenceOptions) {
    this._fetchImpl = _options.fetch ?? globalThis.fetch;
    this._baseUrl = _options.baseUrl ?? 'https://artificialanalysis.ai/api/v2';
    this._cacheTtlMilliseconds = _options.cacheTtlMilliseconds ?? DEFAULT_CACHE_TTL_MILLISECONDS;
    this._now = _options.now ?? Date.now;
  }

  // #endregion

  // #region Methods

  /**
   * Returns the score models.
   *
   * @param targets - Targets.
   * @param signal - Signal.
   * @public
   */
  public async scoreModels(
    targets: readonly IModelIntelligenceTarget[],
    signal?: AbortSignal,
  ): Promise<IModelIntelligenceReport> {
    const apiKey = this._options.apiKey()?.trim();
    if (!apiKey) {
      return {
        scores: targets.map(unscored),
        indexVersion: null,
        retrievedAt: null,
        error:
          'No Artificial Analysis API key is configured. Set SYMPHONY_ARTIFICIAL_ANALYSIS_API_KEY to enable intelligence scores.',
      };
    }
    try {
      const catalog = await this.loadCatalog(apiKey, signal);
      return {
        scores: targets.map((target) => scoreTarget(target, catalog.entries)),
        indexVersion: catalog.indexVersion,
        retrievedAt: catalog.retrievedAt,
      };
    } catch (cause) {
      return {
        scores: targets.map(unscored),
        indexVersion: null,
        retrievedAt: null,
        error: cause instanceof Error ? cause.message : String(cause),
      };
    }
  }

  private async loadCatalog(apiKey: string, signal?: AbortSignal): Promise<ICatalog> {
    if (this._cached && this._cached.expiresAt > this._now()) return this._cached.catalog;
    // Concurrent callers share one request; an abort by the first caller surfaces to all of
    // them as an in-band error and the next call simply retries.
    this._pending ??= this.fetchCatalog(apiKey, signal).finally(() => {
      this._pending = undefined;
    });
    return this._pending;
  }

  private async fetchCatalog(apiKey: string, signal?: AbortSignal): Promise<ICatalog> {
    const entries: ICatalogEntry[] = [];
    let indexVersion: string | null = null;
    let page = 1;
    for (let requestCount = 0; requestCount < MAXIMUM_PAGES; requestCount += 1) {
      const response = await this._fetchImpl(`${this._baseUrl}/language/models/free?page=${page}`, {
        headers: { 'x-api-key': apiKey, accept: 'application/json' },
        ...(signal ? { signal } : {}),
      });
      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? 'The Artificial Analysis API rate limit is exhausted. Scores refresh after the daily window resets.'
            : `The Artificial Analysis API request failed with status ${response.status}.`,
        );
      }
      const body = (await response.json()) as IArtificialAnalysisListResponse;
      if (indexVersion === null && body.intelligence_index_version !== undefined) {
        indexVersion = String(body.intelligence_index_version);
      }
      for (const document of body.data ?? []) {
        const entry = catalogEntry(document);
        if (entry) entries.push(entry);
      }
      const pagination = body.pagination;
      // Stop unless the server confirms this page and announces another one; a server that
      // ignores the page parameter would otherwise loop over the first page forever.
      if (!pagination?.has_more || (pagination.page ?? page) !== page) break;
      page += 1;
    }
    const catalog: ICatalog = {
      entries,
      indexVersion,
      retrievedAt: new Date(this._now()).toISOString(),
    };
    this._cached = { catalog, expiresAt: this._now() + this._cacheTtlMilliseconds };
    return catalog;
  }

  // #endregion
}

interface IArtificialAnalysisListResponse {
  readonly intelligence_index_version?: number | string;
  readonly pagination?: {
    readonly page?: number;
    readonly total_pages?: number;
    readonly has_more?: boolean;
  };
  readonly data?: readonly IArtificialAnalysisModelDocument[];
}

interface ICatalog {
  readonly entries: readonly ICatalogEntry[];
  readonly indexVersion: string | null;
  readonly retrievedAt: string;
}

const MAXIMUM_PAGES = 10;

const DEFAULT_CACHE_TTL_MILLISECONDS = 12 * 60 * 60 * 1000;

function catalogEntry(document: IArtificialAnalysisModelDocument): ICatalogEntry | undefined {
  const intelligenceIndex = document.evaluations?.artificial_analysis_intelligence_index;
  if (!document.name || typeof intelligenceIndex !== 'number') return undefined;
  const nameTokens = tokenize(document.name);
  const tokens = new Set([...nameTokens, ...tokenize(document.slug ?? '')]);
  const effortToken = [...nameTokens].reverse().find((token) => EFFORT_TOKENS.has(token)) ?? null;
  return {
    name: document.name,
    tokens,
    effortToken,
    intelligenceIndex,
    releaseDate: document.release_date ?? '',
  };
}

function scoreTarget(
  target: IModelIntelligenceTarget,
  entries: readonly ICatalogEntry[],
): IModelIntelligenceScore {
  const modelTokens = targetTokens(target.model);
  if (!modelTokens.length) return unscored(target);
  const candidates = entries.filter((entry) =>
    modelTokens.every((token) => entry.tokens.has(token)),
  );
  if (!candidates.length) return unscored(target);
  const effortToken = target.reasoningEffort ? (tokenize(target.reasoningEffort)[0] ?? null) : null;
  const exactEffort = effortToken
    ? candidates.filter((entry) => entry.effortToken === effortToken)
    : [];
  const unmarked = candidates.filter((entry) => entry.effortToken === null);
  const preferred = exactEffort.length ? exactEffort : unmarked.length ? unmarked : candidates;
  const best = [...preferred].sort(
    (left, right) =>
      right.releaseDate.localeCompare(left.releaseDate) ||
      left.tokens.size - right.tokens.size ||
      left.name.localeCompare(right.name),
  )[0];
  return best
    ? { ...target, intelligenceIndex: best.intelligenceIndex, matchedModelName: best.name }
    : unscored(target);
}
