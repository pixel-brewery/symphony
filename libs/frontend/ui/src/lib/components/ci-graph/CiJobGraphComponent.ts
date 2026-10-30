// #region Imports

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import {
  ButtonComponent,
  DisclosureComponent,
  HintComponent,
  IconComponent,
  IconNameDirective,
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
  type IFlowLayoutCompletedEventDetail,
  type IFlowSelectionChangedEventDetail,
} from '@pixel-brewery/mosaik-elements-foundation/components/flow';
import type { ICiRunJob, ICiWorkflowGraph } from '@symphony/domain-ci';
import { CiLogStatusIconPipe } from '../../pipes/CiLogStatusIconPipe';
import { CiLogStatusLabelPipe } from '../../pipes/CiLogStatusLabelPipe';
import { CiLogStatusVariantPipe } from '../../pipes/CiLogStatusVariantPipe';
import { CiRunDurationPipe } from '../../pipes/CiRunDurationPipe';
import { projectCiJobs } from './projectCiJobs';

// #endregion

/** Parallel jobs and actual matrix executions on the shared Mosaik viewport. */
@Component({
  selector: 'symphony-ci-job-graph',
  host: { class: 'block min-w-0' },
  imports: [
    ButtonComponent,
    DisclosureComponent,
    HintComponent,
    IconComponent,
    IconNameDirective,
    TextComponent,
    FlowComponent,
    FlowControlsComponent,
    FlowEdgeComponent,
    FlowMinimapComponent,
    FlowNodeComponent,
    CiLogStatusIconPipe,
    CiLogStatusLabelPipe,
    CiLogStatusVariantPipe,
    CiRunDurationPipe,
  ],
  providers: [
    {
      provide: FLOW_DEFAULT_PROPS,
      useFactory: (): Partial<FlowElement.Props> => ({
        direction: 'left-to-right',
        edgeRouting: 'orthogonal',
        edgeMarkerEnd: 'none',
        grid: 'none',
        fitPadding: 24,
        layout: 'auto',
        layoutEngine: new DagreLayoutEngine(),
        layoutOptions: { nodeGap: 40, layerGap: 64, padding: 24 },
        minZoom: 0.1,
        maxZoom: 1.6,
        selectionMode: 'single',
      }),
    },
  ],
  templateUrl: './CiJobGraphComponent.html',
  styleUrl: './CiJobGraphComponent.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CiJobGraphComponent {
  // #region Fields

  /** @public */ public readonly graph = input.required<ICiWorkflowGraph>();
  /** @public */ public readonly jobs = input<readonly ICiRunJob[]>([]);
  /** @public */ public readonly selected = output<string>();
  private readonly _flow = viewChild.required(FlowComponent);
  private readonly _nodeViews = viewChildren(FlowNodeComponent);
  private _framed = false;
  /** @public */ public readonly selectedKey = signal<string | null>(null);
  /** @public */ public readonly nodes = computed(() => projectCiJobs(this.graph(), this.jobs()));
  /** @public */ public readonly edges = computed(() => {
    const known = new Set(this.graph().jobs.map((job) => job.id));
    return this.graph().jobs.flatMap((job) =>
      [...new Set(job.needs)]
        .filter((need) => known.has(need))
        .map((need) => ({
          key: JSON.stringify([need, job.id]),
          source: 'job:' + need,
          target: 'job:' + job.id,
        })),
    );
  });
  /** @public */ public readonly inspected = computed(() =>
    this.nodes().find((node) => 'job:' + node.definition.id === this.selectedKey()),
  );
  /** @public */ public readonly unmatched = computed(() => {
    const known = new Set(this.graph().jobs.map((job) => job.id));
    return this.jobs().filter((job) => !job.workflowJobId || !known.has(job.workflowJobId));
  });

  // #endregion
  // #region Methods

  /** Keeps the native pointer and keyboard selection available for job context. @public */
  public onSelectionChanged(event: IFlowSelectionChangedEventDetail): void {
    if (event.trigger === 'api') return;
    this.selectedKey.set(event.selectedKey);
    if (event.selectedKind === 'node' && event.selectedKey)
      this.openExecution(event.selectedKey.slice('job:'.length));
  }

  /** Opens the actual log on every activation, including an already selected job. @public */
  public openExecution(workflowJobId: string): void {
    const node = this.nodes().find((job) => job.definition.id === workflowJobId);
    if (node && !node.definition.matrix && node.executions.length === 1) {
      this.selectedKey.set('job:' + workflowJobId);
      this.selected.emit(node.executions[0]!.id);
    }
  }

  /** Large graphs begin at their first job at readable scale; navigation then stays with the operator. @public */
  public onLayoutCompleted(event: IFlowLayoutCompletedEventDetail): void {
    const first = this._nodeViews()[0]?.elementRef.nativeElement;
    if (this._framed || !event.bounds || event.nodeKeys.length !== this.nodes().length || !first)
      return;
    this._framed = true;
    if (this.nodes().length > 24)
      this._flow().elementRef.nativeElement.setViewport({
        x: 24 - first.x,
        y: 24 - first.y,
        zoom: 1,
      });
  }

  // #endregion
}
