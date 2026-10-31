// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

interface IOpenCodeModel {
  readonly id: string;
  readonly providerId: string;
  readonly displayName: string;
}

@Pipe({ name: 'openCodeProviders', standalone: true, pure: true })
export class OpenCodeProvidersPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param models - Models.
   * @param search - Search.
   * @public
   */
  public transform(
    models: readonly IOpenCodeModel[],
    search: string,
  ): readonly { readonly id: string; readonly label: string }[] {
    const providers = new Map<string, string>();
    for (const model of models) {
      if (providers.has(model.providerId)) continue;
      const displayNameParts = model.displayName.split(' · ');
      providers.set(
        model.providerId,
        displayNameParts.length > 1
          ? (displayNameParts[displayNameParts.length - 1] ?? model.providerId)
          : model.providerId,
      );
    }
    const query = search.trim().toLocaleLowerCase();
    return [...providers]
      .map(([id, label]) => ({ id, label }))
      .filter(
        (provider) =>
          !query ||
          `${provider.id} ${provider.label}`.toLocaleLowerCase().includes(query) ||
          models.some(
            (model) =>
              model.providerId === provider.id &&
              `${model.id} ${model.displayName}`.toLocaleLowerCase().includes(query),
          ),
      );
  }

  // #endregion
}
