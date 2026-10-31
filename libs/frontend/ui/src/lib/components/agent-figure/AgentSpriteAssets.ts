// #region Imports

import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { AGENT_SPRITE_ATLAS } from './AgentSpriteAtlas';

// #endregion

/** Shares decoded, geometry-checked local atlases across every employee instance. @public */
@Injectable({ providedIn: 'root' })
export class AgentSpriteAssets {
  // #region Fields

  private readonly _document = inject(DOCUMENT);
  private readonly _images = new Map<string, Promise<string>>();

  // #endregion

  // #region Methods

  /** FLAMOX's decoded-image gate, cached for a team rather than fetched per employee. @public */
  public load(source: string): Promise<string> {
    const cached = this._images.get(source);
    if (cached) return cached;
    const loading = this.decode(source);
    this._images.set(source, loading);
    void loading.catch(() => this._images.delete(source));
    return loading;
  }

  private async decode(source: string): Promise<string> {
    const ImageConstructor = this._document.defaultView?.Image;
    if (!ImageConstructor) throw new Error('Employee animation requires a browser window');
    const image = new ImageConstructor();
    image.src = new URL(source, this._document.baseURI).href;
    await image.decode();
    if (
      image.naturalWidth !== AGENT_SPRITE_ATLAS.width ||
      image.naturalHeight !== AGENT_SPRITE_ATLAS.height
    )
      throw new Error('Employee atlas must contain the complete v2 frame layout');
    return image.src;
  }

  // #endregion
}
