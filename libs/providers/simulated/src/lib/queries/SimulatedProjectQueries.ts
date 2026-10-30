// #region Imports
import { type IApplicationSettings } from '@symphony/configuration-composition';
// #endregion

/**
 * Supplies the existing deterministic SimulatedProjectQueries provider behavior.
 *
 * @public
 */
export class SimulatedProjectQueries {
  // #region Fields
  private readonly _settings: () => Pick<IApplicationSettings, 'repositoryBindings'>;
  // #endregion
  // #region Ctor
  /**
   * Reads the live configuration and existing local evidence on demand.
   *
   * @public
   */
  public constructor(settings: () => Pick<IApplicationSettings, 'repositoryBindings'>) {
    this._settings = settings;
  }
  // #endregion
  // #region Methods
  /**
   * Projects the existing deterministic listProjects response.
   *
   * @public
   */
  public listProjects(workspaceId: string) {
    const owner =
      this._settings().repositoryBindings.find((binding) => binding.workspaceId === workspaceId)
        ?.owner ?? 'symphony';
    return {
      projects: [
        {
          id: 'PVT_simulated_delivery',
          ownerType: 'user' as const,
          owner,
          projectNumber: 1,
          title: 'Delivery board',
          url: `https://github.com/users/${owner}/projects/1`,
          closed: false,
          origin: 'repository' as const,
        },
        {
          id: 'PVT_simulated_platform',
          ownerType: 'user' as const,
          owner,
          projectNumber: 2,
          title: 'Platform roadmap',
          url: `https://github.com/users/${owner}/projects/2`,
          closed: false,
          origin: 'account' as const,
        },
      ],
    };
  }

  // #endregion
}
