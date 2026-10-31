// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import {
  Cancel,
  DIALOG_REF,
  DIALOG_REF_DATA,
  IconRegistry,
  type IDialogRef,
} from '@pixel-brewery/mosaik-elements-angular';
import { IColorPalette } from '@pixel-brewery/mosaik-elements-foundation';
import { ReiconAliases } from '@pixel-brewery/mosaik-elements-foundation/icons/reicon';
import { WorkspaceAvatarValidator } from '@symphony/domain-workspace';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import type { IWorkspaceAvatarSelection } from './IWorkspaceAvatarSelection';

// #endregion

type WorkspaceAvatarInput = Pick<
  ApplicationSettingsDto['workspaces'][number],
  'shortCode' | 'color' | 'avatar'
>;

/**
 * Owns one transient icon, emoji or monogram selection without writing settings.
 *
 * @public
 */
@Injectable()
export class WorkspaceAvatarDialogViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _workspace = inject<WorkspaceAvatarInput>(DIALOG_REF_DATA);
  private readonly _dialog = inject(DIALOG_REF) as IDialogRef<
    WorkspaceAvatarInput,
    IWorkspaceAvatarSelection
  >;
  private readonly _registry = inject(IconRegistry);
  private readonly _kind = signal<IWorkspaceAvatarSelection['avatar']['kind']>(
    this._workspace.avatar?.kind ?? 'monogram',
  );
  private readonly _icon = signal(
    this._workspace.avatar?.kind === 'icon' ? this._workspace.avatar.value : 'folder',
  );
  private readonly _emoji = signal(
    this._workspace.avatar?.kind === 'emoji' ? this._workspace.avatar.value : '🚀',
  );
  private readonly _monogram = signal(
    this._workspace.avatar?.kind === 'monogram'
      ? this._workspace.avatar.value
      : this._workspace.shortCode.slice(0, 2).toUpperCase() || 'WS',
  );
  private readonly _color = signal(this._workspace.color);
  private readonly _search = signal('');

  /** Current representation. @public @readonly */
  public readonly kind = this._kind.asReadonly();
  /** Selected registered alias. @public @readonly */
  public readonly icon = this._icon.asReadonly();
  /** Entered or selected emoji. @public @readonly */
  public readonly emoji = this._emoji.asReadonly();
  /** Entered monogram. @public @readonly */
  public readonly monogram = this._monogram.asReadonly();
  /** Existing workspace color being edited. @public @readonly */
  public readonly color = this._color.asReadonly();
  /** Icon filter text. @public @readonly */
  public readonly search = this._search.asReadonly();
  /** Selectable registered Reicon aliases. @public @readonly */
  public readonly icons = Object.keys(ReiconAliases).filter(
    (name) => this._registry.resolve(name) !== null,
  );
  /** Reference color palette. @public @readonly */
  public readonly colors = IColorPalette.TAILWIND_PALETTE.colors;
  /** Reference emoji suggestions. @public @readonly */
  public readonly emojis = [
    '💻',
    '🛠️',
    '🚀',
    '🤖',
    '✨',
    '⚡',
    '🌐',
    '📱',
    '🖥️',
    '⌨️',
    '⚙️',
    '🗄️',
    '☁️',
    '📦',
    '📚',
    '🧪',
    '🔒',
    '🎮',
    '🎵',
    '🎬',
    '🖼️',
    '🛍️',
    '🔥',
    '💡',
    '🧩',
    '📊',
    '🧠',
    '🦄',
    '🐙',
    '🌱',
  ];
  /** Structured result retained only for this dialog. @public @readonly */
  public readonly selection = computed<IWorkspaceAvatarSelection>(() => {
    const color = this.color();
    switch (this.kind()) {
      case 'icon':
        return { avatar: { kind: 'icon', value: this.icon() }, color };
      case 'emoji':
        return { avatar: { kind: 'emoji', value: this.emoji().trim() }, color };
      case 'monogram':
        return { avatar: { kind: 'monogram', value: this.monogram().trim().toUpperCase() }, color };
    }
  });
  /** Workspace-shaped input for the shared asynchronous avatar renderer. @public @readonly */
  public readonly preview = computed(() => ({
    shortCode: this._workspace.shortCode || 'WS',
    ...this.selection(),
  }));
  /** Invalid selection category; the View owns the corresponding copy. @public @readonly */
  public readonly error = computed<'icon' | 'emoji' | 'monogram' | 'color' | undefined>(() => {
    if (!/^#[0-9a-fA-F]{6}$/u.test(this.color())) return 'color';
    switch (this.kind()) {
      case 'icon':
        return this.icons.includes(this.icon()) ? undefined : 'icon';
      case 'emoji':
        return WorkspaceAvatarValidator.isEmoji(this.emoji()) ? undefined : 'emoji';
      case 'monogram':
        return WorkspaceAvatarValidator.isMonogram(this.monogram()) ? undefined : 'monogram';
    }
  });
  /** Changes representation while retaining the other drafts. @public @readonly */
  public readonly selectKindCommand = new Command<IWorkspaceAvatarSelection['avatar']['kind']>(
    (kind) => this._kind.set(kind),
  );
  /** Selects a glyph from the registered list. @public @readonly */
  public readonly selectIconCommand = new Command<string>((icon) => this._icon.set(icon));
  /** Updates the emoji draft. @public @readonly */
  public readonly selectEmojiCommand = new Command<string>((emoji) => this._emoji.set(emoji));
  /** Updates the monogram draft. @public @readonly */
  public readonly setMonogramCommand = new Command<string>((monogram) =>
    this._monogram.set(monogram),
  );
  /** Updates the search without changing the selection. @public @readonly */
  public readonly searchCommand = new Command<string>((search) => this._search.set(search));
  /** Accepts an opaque RGB selection from the palette or custom picker. @public @readonly */
  public readonly selectColorCommand = new Command<unknown>((color) => {
    if (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/u.test(color))
      this._color.set(color.toUpperCase());
  });
  /** Discards this transient selection. @public @readonly */
  public readonly closeCommand = new Command<void>(() => this._dialog.close(Cancel.negative()));
  /** Returns a valid structured selection to the workspace draft. @public @readonly */
  public readonly applyCommand = new Command<void>(
    () => this._dialog.close(Cancel.positive(this.selection())),
    computed(() => this.error() === undefined),
  );

  // #endregion
}
