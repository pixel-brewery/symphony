export interface ICiDispatchInput {
  readonly id: string;
  readonly description: string;
  readonly type: 'string' | 'boolean' | 'number' | 'choice' | 'environment';
  readonly required: boolean;
  readonly defaultValue?: string;
  readonly options?: readonly string[];
}
