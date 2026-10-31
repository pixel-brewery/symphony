// #region Imports
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import {
  ButtonComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  DismissComponent,
  FileBoxComponent,
  IconNameDirective,
  SkeletonComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SkillImportEditorViewPresenter } from './SkillImportEditorViewPresenter';
// #endregion
/** The `Import skill` sheet of the Skills section. @public */
@Component({
  selector: 'symphony-skill-import-editor',
  host: { class: 'block' },
  imports: [
    ButtonComponent,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    DismissComponent,
    FileBoxComponent,
    IconNameDirective,
    SkeletonComponent,
    TextComponent,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: SkillImportEditorViewPresenter }],
  templateUrl: './SkillImportEditorView.html',
  styleUrl: './SkillImportEditorView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillImportEditorView extends View<SkillImportEditorViewPresenter> {
  // #region Fields
  private readonly _changeDetector = inject(ChangeDetectorRef);
  // #endregion
  // #region Ctor
  /** Preserves the existing sheet render scheduling after hydration. @public */
  public constructor() {
    super();
    effect(() => {
      if (this.presenter.isHydrating()) return;
      window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }
  // #endregion
}
