export interface ICatalogEntry {
  readonly name: string;
  readonly tokens: ReadonlySet<string>;
  readonly effortToken: string | null;
  readonly intelligenceIndex: number;
  readonly releaseDate: string;
}
