/** A GitHub Project discovered for a connection, offered as a board candidate. */
export interface IGitHubProjectCandidate {
  id: string;
  ownerType: 'organization' | 'user';
  owner: string;
  projectNumber: number;
  title: string;
  url: string;
  closed: boolean;
  /** How the project was found: owned by the signed-in account or linked to a configured repository. */
  origin: 'account' | 'repository';
}
