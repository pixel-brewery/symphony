/** One bounded transport chunk from a CI log that may be much larger than an IPC message. */
export interface ICiRunLogChunk {
  runId: string;
  kind: 'output' | 'failure';
  offset: number;
  content: string;
  nextOffset: number;
  complete: boolean;
}
