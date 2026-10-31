// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

interface IOpenCodeModel {
  readonly id: string;
  readonly providerId: string;
  readonly displayName: string;
}

@Pipe({ name: 'openCodeModels', standalone: true, pure: true })
export class OpenCodeModelsPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param models - Models.
   * @param providerId - Provider id.
   * @param search - Search.
   * @public
   */
  public transform(
    models: readonly IOpenCodeModel[],
    providerId: string,
    search: string,
  ): readonly IOpenCodeModel[] {
    const query = search.trim().toLocaleLowerCase();
    const providerMatches = providerId.toLocaleLowerCase().includes(query);
    return models
      .filter((model) => model.providerId === providerId)
      .filter(
        (model) =>
          !query ||
          providerMatches ||
          `${model.id} ${model.displayName}`.toLocaleLowerCase().includes(query),
      )
      .slice(0, 24);
  }

  // #endregion
}
