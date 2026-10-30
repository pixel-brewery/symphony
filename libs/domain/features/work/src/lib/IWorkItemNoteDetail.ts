/**
 * One labelled fact shown with a note, such as the delivered branch or pull request.
 *
 * A detail without a URL is still worth carrying: an implementation branch that was never
 * pushed has a name but no address, and naming it is more useful than a link that 404s.
 */
export interface IWorkItemNoteDetail {
  label: string;
  value: string;
  url?: string;
}
