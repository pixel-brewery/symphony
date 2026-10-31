export interface IIdGenerator {
  next(prefix: string): string;
}
