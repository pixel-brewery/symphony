// #region Imports

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  BadgeComponent,
  HintComponent,
  IconComponent,
  TextComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  FLOW_DEFAULT_PROPS,
  FlowComponent,
  FlowControlsComponent,
  FlowEdgeComponent,
  FlowMinimapComponent,
  FlowNodeComponent,
} from '@pixel-brewery/mosaik-elements-angular/components/flow';
import {
  DagreLayoutEngine,
  type FlowElement,
  type IFlowSelectionChangedEventDetail,
} from '@pixel-brewery/mosaik-elements-foundation/components/flow';
import type { IWorkflowGraph } from '@symphony/domain-workflow';
import { WorkflowTriggerLabelPipe } from '../../pipes/WorkflowTriggerLabelPipe';
import { WorkflowGraphNodePresentationPipe } from '../../pipes/WorkflowGraphNodePresentationPipe';

// #endregion

/** Read-only delivery stages and transitions on the shared Mosaik viewport. */
@Component({
  selector: 'symphony-process-graph',
  host: { class: 'block h-full min-h-0 w-full' },
  imports: [
    BadgeComponent,
    HintComponent,
    IconComponent,
    TextComponent,
    FlowComponent,
    FlowControlsComponent,
    FlowEdgeComponent,
    FlowMinimapComponent,
    FlowNodeComponent,
    WorkflowTriggerLabelPipe,
    WorkflowGraphNodePresentationPipe,
  ],
  providers: [
    {
      provide: FLOW_DEFAULT_PROPS,
      useFactory: (): Partial<FlowElement.Props> => ({
        direction: 'top-to-bottom',
        edgeRouting: 'orthogonal',
        edgeMarkerEnd: 'arrow',
        fitOnLoad: true,
        fitPadding: 32,
        highlightMode: 'none',
        grid: 'none',
        layout: 'auto',
        layoutEngine: new DagreLayoutEngine(),
        layoutOptions: { nodeGap: 72, layerGap: 88, padding: 32 },
        minZoom: 0.1,
        maxZoom: 1.6,
        selectionMode: 'single',
      }),
    },
  ],
  templateUrl: './ProcessGraphComponent.html',
  styleUrl: './ProcessGraphComponent.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessGraphComponent {
  // #region Fields

  /** @public */ public readonly graph = input.required<IWorkflowGraph>();
  /** @public */ public readonly selectedStageId = input<string | undefined>(undefined);
  /** @public */ public readonly selectedTransitionId = input<string | undefined>(undefined);
  /** @public */ public readonly stageSelected = output<string>();
  /** @public */ public readonly transitionSelected = output<string>();
  /** @public */ public readonly selectedKey = computed(() => {
    const transition = this.selectedTransitionId();
    const stage = this.selectedStageId();
    return transition ? 'transition:' + transition : stage ? 'stage:' + stage : null;
  });

  // #endregion
  // #region Methods

  /** Keeps keyboard and pointer selection on the same domain commands. @public */
  public onSelectionChanged(event: IFlowSelectionChangedEventDetail): void {
    if (event.trigger === 'api' || !event.selectedKey) return;
    if (event.selectedKind === 'node')
      this.stageSelected.emit(event.selectedKey.slice('stage:'.length));
    if (event.selectedKind === 'edge')
      this.transitionSelected.emit(event.selectedKey.slice('transition:'.length));
  }

  // #endregion
}
