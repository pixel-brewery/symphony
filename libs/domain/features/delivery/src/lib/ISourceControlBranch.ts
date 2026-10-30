/**
 * Branch of a source-control repository offered while a pull request is authored.
 *
 * @public
 */
export interface ISourceControlBranch {
  name: string;
  protected: boolean;
}
