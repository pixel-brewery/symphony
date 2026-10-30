/**
 * Secondary entry point for the graph surface.
 *
 * Kept out of the main barrel on purpose: it is the only code that pulls in the graph
 * rendering library, and everything importing `@symphony/frontend-ui` would otherwise carry
 * that library into the eager bundle.
 */
export * from './lib/components/process-graph/ProcessGraphComponent';
export * from './lib/pipes/WorkflowTriggerLabelPipe';
