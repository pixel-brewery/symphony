// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { ArtificialAnalysisModelIntelligence } from './ArtificialAnalysisModelIntelligence';

// #endregion

interface ICatalogModel {
  name: string;
  slug?: string;
  release_date?: string;
  evaluations?: { artificial_analysis_intelligence_index?: number };
}

function catalogFetch(models: ICatalogModel[], indexVersion = '4.1.1') {
  return vi.fn(async () =>
    Response.json({
      intelligence_index_version: indexVersion,
      pagination: { page: 1, total_pages: 1, has_more: false },
      data: models,
    }),
  );
}

function client(fetch: typeof globalThis.fetch) {
  return new ArtificialAnalysisModelIntelligence({ apiKey: () => 'test-key', fetch });
}

const OPUS_CATALOG: ICatalogModel[] = [
  {
    name: 'Claude Opus 5 (max)',
    slug: 'claude-opus-5-max',
    release_date: '2026-05-01',
    evaluations: { artificial_analysis_intelligence_index: 63 },
  },
  {
    name: 'Claude Opus 5 (low)',
    slug: 'claude-opus-5-low',
    release_date: '2026-05-01',
    evaluations: { artificial_analysis_intelligence_index: 52 },
  },
  {
    name: 'Claude Opus 4.6 (max)',
    slug: 'claude-opus-4-6-max',
    release_date: '2025-11-01',
    evaluations: { artificial_analysis_intelligence_index: 58 },
  },
];

describe('ArtificialAnalysisModelIntelligence', () => {
  it('scores a local model alias with the requested effort variant of the newest release', async () => {
    // act
    // arrange
    const report = await client(catalogFetch(OPUS_CATALOG)).scoreModels([
      { model: 'opus', reasoningEffort: 'max' },
      { model: 'opus', reasoningEffort: 'low' },
    ]);
    // assert
    expect(report.scores).toEqual([
      {
        model: 'opus',
        reasoningEffort: 'max',
        intelligenceIndex: 63,
        matchedModelName: 'Claude Opus 5 (max)',
      },
      {
        model: 'opus',
        reasoningEffort: 'low',
        intelligenceIndex: 52,
        matchedModelName: 'Claude Opus 5 (low)',
      },
    ]);
    expect(report.indexVersion).toBe('4.1.1');
    expect(report.error).toBeUndefined();
  });

  it('falls back to the unmarked base entry when the effort variant is not benchmarked', async () => {
    // arrange
    const fetch = catalogFetch([
      {
        name: 'GPT-5.6 Sol (high)',
        slug: 'gpt-5-6-sol-high',
        evaluations: { artificial_analysis_intelligence_index: 57 },
      },
      {
        name: 'GPT-5.6 Sol',
        slug: 'gpt-5-6-sol',
        evaluations: { artificial_analysis_intelligence_index: 55 },
      },
    ]);
    const report = await client(fetch).scoreModels([
      { model: 'gpt-5.6-sol', reasoningEffort: 'xhigh' },
      { model: 'gpt-5.6-sol', reasoningEffort: null },
    ]);
    // act
    const actual = report.scores.map((score) => score.intelligenceIndex);

    // assert
    expect(actual).toEqual([55, 55]);
  });

  it('ignores gateway provider prefixes and free-tier suffixes of local model ids', async () => {
    // arrange
    const fetch = catalogFetch([
      {
        name: 'DeepSeek V4 Flash',
        slug: 'deepseek-v4-flash',
        evaluations: { artificial_analysis_intelligence_index: 44 },
      },
    ]);
    // act
    const report = await client(fetch).scoreModels([
      { model: 'opencode/deepseek-v4-flash-free', reasoningEffort: null },
    ]);
    // assert
    expect(report.scores[0]?.intelligenceIndex).toBe(44);
  });

  it('returns a null score for models the benchmark does not know', async () => {
    // act
    // arrange
    const report = await client(catalogFetch(OPUS_CATALOG)).scoreModels([
      { model: 'totally-unknown-model', reasoningEffort: 'high' },
    ]);
    // assert
    expect(report.scores[0]).toEqual({
      model: 'totally-unknown-model',
      reasoningEffort: 'high',
      intelligenceIndex: null,
      matchedModelName: null,
    });
  });

  it('reports a configuration error without any request when no API key is set', async () => {
    // arrange
    const fetch = catalogFetch(OPUS_CATALOG);
    const intelligence = new ArtificialAnalysisModelIntelligence({
      apiKey: () => undefined,
      fetch,
    });
    // act
    const report = await intelligence.scoreModels([{ model: 'opus', reasoningEffort: 'max' }]);
    // assert
    expect(report.error).toContain('SYMPHONY_ARTIFICIAL_ANALYSIS_API_KEY');
    expect(report.scores[0]?.intelligenceIndex).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports HTTP failures in-band without leaking the API key', async () => {
    // arrange
    const fetch = vi.fn(async () => new Response('nope', { status: 429 }));
    // act
    const report = await client(fetch).scoreModels([{ model: 'opus', reasoningEffort: 'max' }]);
    // assert
    expect(report.error).toContain('rate limit');
    expect(report.error).not.toContain('test-key');
    expect(report.scores[0]?.intelligenceIndex).toBeNull();
  });

  it('caches the catalog between calls and sends the key as x-api-key', async () => {
    // arrange
    const fetch = catalogFetch(OPUS_CATALOG);
    const intelligence = client(fetch);
    await intelligence.scoreModels([{ model: 'opus', reasoningEffort: 'max' }]);
    // act
    await intelligence.scoreModels([{ model: 'opus', reasoningEffort: 'low' }]);
    // assert
    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get('x-api-key')).toBe('test-key');
  });

  it('aggregates paginated catalogs and stops when the server reports no further pages', async () => {
    // arrange
    const pages = [
      {
        intelligence_index_version: '4.1.1',
        pagination: { page: 1, total_pages: 2, has_more: true },
        data: [OPUS_CATALOG[0]],
      },
      {
        pagination: { page: 2, total_pages: 2, has_more: false },
        data: [OPUS_CATALOG[1]],
      },
    ];
    const fetch = vi.fn(async (input: string | URL | Request) => {
      const page = Number(new URL(String(input)).searchParams.get('page'));
      return Response.json(pages[page - 1]);
    });
    // act
    const report = await client(fetch).scoreModels([
      { model: 'opus', reasoningEffort: 'low' },
      { model: 'opus', reasoningEffort: 'max' },
    ]);
    // assert
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(report.scores.map((score) => score.intelligenceIndex)).toEqual([52, 63]);
  });
});
