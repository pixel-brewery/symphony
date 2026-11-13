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
  TranslateDirective,
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
  FlowEdgeComponent,
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

const initialZoom = 0.8;
const graphPadding = 24;

/** Parallel jobs and actual matrix executions on the shared Mosaik viewport. */
@Component({
  selector: 'symphony-ci-job-graph',
  host: { class: 'block h-full min-w-0' },
  imports: [
    TranslateDirective,
    ButtonComponent,
    DisclosureComponent,
    HintComponent,
    IconComponent,
    IconNameDirective,
    TextComponent,
    FlowComponent,
    FlowEdgeComponent,
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
        edgeMarkerEnd: 'arrow',
        grid: 'dots',
        fitPadding: graphPadding,
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
  /** @public */ public readonly pending = input(false);
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

  /**
   * Frames the graph once at a readable scale while preserving subsequent operator navigation.
   *
   * @param event - Measured layout and node keys.
   * @public
   */
  public onLayoutCompleted(event: IFlowLayoutCompletedEventDetail): void {
    if (this._framed || !event.bounds || event.nodeKeys.length !== this.nodes().length) return;
    const flow = this._flow();
    const element = flow.elementRef.nativeElement;
    if (!element.clientWidth || !element.clientHeight) return;

    const { bounds } = event;
    const width = bounds.width * initialZoom;
    const height = bounds.height * initialZoom;
    const fits =
      width + 2 * graphPadding <= element.clientWidth &&
      height + 2 * graphPadding <= element.clientHeight;
    if (fits) {
      this._framed = true;
      flow.setZoom(initialZoom);
      flow.centerOn({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
      return;
    }

    const hasIncomingEdge = new Set(this.edges().map((edge) => edge.target));
    const nodes = this._nodeViews().map((node) => node.elementRef.nativeElement);
    const first = nodes.find((node) => !hasIncomingEdge.has(node.nodeKey)) ?? nodes[0];
    if (!first) return;
    this._framed = true;
    flow.setViewport({
      x: graphPadding - bounds.x * initialZoom,
      y: (element.clientHeight - first.offsetHeight * initialZoom) / 2 - first.y * initialZoom,
      zoom: initialZoom,
    });
  }

  // #endregion
}
