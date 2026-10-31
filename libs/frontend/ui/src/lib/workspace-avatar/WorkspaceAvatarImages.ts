// #region Imports

import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { IconRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { IIconDefinition } from '@pixel-brewery/mosaik-icons';
import type { WorkspaceAvatarSource } from './WorkspaceAvatarSource';

// #endregion

/** Composes the FLAMOX icon, emoji and monogram preview for workspace identities. @public */
@Injectable({ providedIn: 'root' })
export class WorkspaceAvatarImages {
  // #region Fields

  private readonly _images = new Map<string, Promise<string | null>>();

  // #endregion

  // #region Ctor

  /** Receives browser drawing capabilities and the application's registered glyphs. @public */
  public constructor(
    @Inject(DOCUMENT) private readonly _document: Document,
    @Inject(IconRegistry) private readonly _icons: IconRegistry,
  ) {}

  // #endregion

  // #region Methods

  /** Shares bounded preview work and leaves Mosaik's text fallback available on failure. @public */
  public render(workspace: WorkspaceAvatarSource | null | undefined): Promise<string | null> {
    if (!workspace || !/^#[0-9a-f]{6}$/iu.test(workspace.color)) return Promise.resolve(null);
    const avatar = workspace.avatar ?? {
      kind: 'monogram',
      value: workspace.shortCode.slice(0, 2).toUpperCase(),
    };
    const key = JSON.stringify([avatar.kind, avatar.value, workspace.color, workspace.shortCode]);
    const cached = this._images.get(key);
    if (cached) return cached;
    const rendering: Promise<string | null> = this.draw(workspace, avatar.kind, avatar.value).catch(
      () => {
        if (this._images.get(key) === rendering) this._images.delete(key);
        return null;
      },
    );
    this._images.set(key, rendering);
    if (this._images.size > 128) {
      const oldest = this._images.keys().next().value;
      if (oldest !== undefined) this._images.delete(oldest);
    }
    return rendering;
  }

  private async draw(
    workspace: WorkspaceAvatarSource,
    kind: NonNullable<WorkspaceAvatarSource['avatar']>['kind'],
    value: string,
  ): Promise<string | null> {
    const icon = kind === 'icon' ? this._icons.resolve(value) : null;
    const glyph =
      kind === 'icon' && !icon ? workspace.shortCode.slice(0, 2).toUpperCase() : value.trim();
    if (!glyph) return null;
    const canvas = this._document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 256, 256);
    if (kind !== 'emoji') {
      context.fillStyle = workspace.color;
      context.globalAlpha = 0.14;
      context.fillRect(0, 0, 256, 256);
      context.globalAlpha = 1;
    }
    if (icon) {
      const image = this._document.createElement('img');
      const serializer = this._document.defaultView?.XMLSerializer;
      if (!serializer) return null;
      const svg = this._document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', IIconDefinition.toViewBox(icon));
      svg.setAttribute('fill', 'currentColor');
      svg.setAttribute('color', workspace.color);
      svg.innerHTML = icon.body;
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new serializer().serializeToString(svg))}`;
      await image.decode();
      context.save();
      context.translate(128, 128);
      context.rotate(((icon.rotation ?? 0) * Math.PI) / 180);
      context.drawImage(image, -72, -72, 144, 144);
      context.restore();
    } else {
      await this._document.fonts?.ready;
      context.fillStyle = workspace.color;
      context.font =
        kind === 'emoji'
          ? '144px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
          : 'bold 112px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(kind === 'emoji' ? glyph : glyph.toUpperCase(), 128, 136, 220);
    }
    return canvas.toDataURL('image/png');
  }

  // #endregion
}
