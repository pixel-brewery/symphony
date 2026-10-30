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
  DismissComponent,
  DrawerContentDirective,
  DrawerFooterDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
  FileBoxComponent,
  SkeletonComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { HeadlineComponent } from '@symphony/frontend-ui';
import { SkillImportEditorViewPresenter } from './SkillImportEditorViewPresenter';
// #endregion
/** The existing portable import drawer rendered by the Skills owner. @public */
@Component({
  selector: 'symphony-skill-import-editor',
  host: { class: 'block' },
  imports: [
    ButtonComponent,
    DismissComponent,
    DrawerContentDirective,
    DrawerFooterDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
    FileBoxComponent,
    SkeletonComponent,
    HeadlineComponent,
    IconNameDirective,
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
  /** Preserves the existing native drawer's render scheduling after hydration. @public */
  public constructor() {
    super();
    effect(() => {
      if (this.presenter.isHydrating()) return;
      window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }
  // #endregion
}
