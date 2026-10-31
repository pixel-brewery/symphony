// #region Imports

import type { IExternalServiceIncident } from '@symphony/domain-platform';

// #endregion

const COMPONENTS_URL = 'https://www.githubstatus.com/api/v2/components.json';
const MAX_RESPONSE_CHARACTERS = 512 * 1024;

type IncidentCapability = IExternalServiceIncident['affectedCapabilities'][number];

interface IStatusComponent {
  readonly name: string;
  readonly status: string;
  readonly updatedAt: string;
}

const CAPABILITIES_BY_COMPONENT: Readonly<Record<string, readonly IncidentCapability[]>> = {
  'Git Operations': ['repository-sync'],
  'API Requests': ['repository-sync', 'work-items', 'pull-requests', 'automation'],
  Issues: ['work-items'],
  'Pull Requests': ['pull-requests'],
  Actions: ['automation'],
  Packages: ['automation'],
};

function severityOf(status: string): IExternalServiceIncident['severity'] | undefined {
  switch (status) {
    case 'major_outage':
      return 'outage';
    case 'degraded_performance':
    case 'partial_outage':
    case 'under_maintenance':
      return 'degraded';
    default:
      return undefined;
  }
}

function statusComponents(value: unknown): readonly IStatusComponent[] {
  if (typeof value !== 'object' || value === null) return [];
  const components = (value as { readonly components?: unknown }).components;
  if (!Array.isArray(components)) return [];
  return components.flatMap((component) => {
    if (typeof component !== 'object' || component === null) return [];
    const candidate = component as {
      readonly name?: unknown;
      readonly status?: unknown;
      readonly updated_at?: unknown;
    };
    return typeof candidate.name === 'string' &&
      typeof candidate.status === 'string' &&
      typeof candidate.updated_at === 'string' &&
      Number.isFinite(Date.parse(candidate.updated_at))
      ? [{ name: candidate.name, status: candidate.status, updatedAt: candidate.updated_at }]
      : [];
  });
}

/**
 * Reads the public GitHub component status without credentials or repository data.
 *
 * @public
 */
export class GitHubServiceStatusProvider {
  // #region Fields

  private readonly _fetchImplementation: typeof fetch;

  // #endregion

  // #region Ctor

  public constructor(fetchImplementation: typeof fetch = fetch) {
    this._fetchImplementation = fetchImplementation;
  }

  // #endregion

  // #region Methods

  /**
   * Returns one aggregated incident when a GitHub component used by Symphony is disrupted.
   *
   * @param signal - Request cancellation signal.
   * @public
   */
  public async incidents(signal: AbortSignal): Promise<readonly IExternalServiceIncident[]> {
    const response = await this._fetchImplementation(COMPONENTS_URL, {
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal,
    });
    if (!response.ok) throw new Error(`GitHub status returned HTTP ${response.status}.`);
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_CHARACTERS) {
      throw new Error('GitHub status response exceeded the allowed size.');
    }
    const body = await response.text();
    if (body.length > MAX_RESPONSE_CHARACTERS) {
      throw new Error('GitHub status response exceeded the allowed size.');
    }
    const affected = statusComponents(JSON.parse(body)).filter(
      (component) =>
        CAPABILITIES_BY_COMPONENT[component.name] !== undefined &&
        severityOf(component.status) !== undefined,
    );
    if (!affected.length) return [];

    const affectedCapabilities = [
      ...new Set(affected.flatMap((component) => CAPABILITIES_BY_COMPONENT[component.name] ?? [])),
    ];
    const severity = affected.some((component) => severityOf(component.status) === 'outage')
      ? 'outage'
      : 'degraded';
    const updatedAt = affected
      .map((component) => component.updatedAt)
      .toSorted((left, right) => right.localeCompare(left))[0]!;
    return [
      {
        id: 'github-service-status',
        providerName: 'GitHub',
        severity,
        affectedComponents: affected.map((component) => component.name),
        affectedCapabilities,
        updatedAt,
      },
    ];
  }

  // #endregion
}
