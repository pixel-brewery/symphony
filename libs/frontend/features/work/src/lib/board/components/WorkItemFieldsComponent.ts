// #region Imports

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import {
  AvatarComponent,
  CheckboxComponent,
  DateBoxComponent,
  NumberBoxComponent,
  SelectComponent,
  SelectItemComponent,
  TextBoxComponent,
  TextComponent,
  TypographyDirective,
  FormFieldDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { AiDirective } from '@symphony/frontend-ui';
import type { WorkItemForm } from '../view-presenters/workItemForm';

// #endregion

/**
 * The provider details of a work item - its type, the project fields, labels and assignees - as
 * one block of controls bound to a {@link WorkItemForm}. The new-work-item sheet and the
 * work-item screen's edit mode render the same block.
 *
 * @public
 */
@Component({
  selector: 'symphony-work-item-fields',
  host: { class: 'flex min-w-0 flex-col gap-2' },
  imports: [
    FormFieldDirective,
    AiDirective,
    AvatarComponent,
    CheckboxComponent,
    DateBoxComponent,
    FormField,
    NumberBoxComponent,
    SelectComponent,
    SelectItemComponent,
    TextBoxComponent,
    TextComponent,
    TypographyDirective,
  ],
  templateUrl: './WorkItemFieldsComponent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkItemFieldsComponent {
  // #region Fields

  /**
   * The form the controls write to.
   *
   * @public
   * @readonly
   */
  public readonly editor = input.required<WorkItemForm>();

  /**
   * Whether the values come from an AI draft under review, which highlights them.
   *
   * @public
   * @readonly
   */
  public readonly aiDraft = input(false);

  /**
   * Whether the work-item type can be chosen (only while creating).
   *
   * @public
   * @readonly
   */
  public readonly showWorkItemType = input(false);

  /**
   * Whether labels are chosen here; the sheet chooses them with `Add label` instead.
   *
   * @public
   * @readonly
   */
  public readonly showLabels = input(true);

  /**
   * Whether the workflow-state field is left out because a `Column` control sets it.
   *
   * @public
   * @readonly
   */
  public readonly omitWorkflowState = input(false);

  /**
   * The project fields to render.
   *
   * @protected
   * @readonly
   */
  protected readonly fields = computed(() =>
    this.editor()
      .projectFields()
      .filter((field) => !this.omitWorkflowState() || field.role !== 'workflow-state'),
  );

  // #endregion
}
