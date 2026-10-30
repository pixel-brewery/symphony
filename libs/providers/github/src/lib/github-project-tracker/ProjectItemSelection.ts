// #region Imports

import { projectFieldValueSelection } from './ProjectFieldValueSelection';

// #endregion

export /**
 * One project item in the exact shape the board projection parses.
 *
 * The board query, the single-item read-back, and the field mutations all select this, so a
 * write can answer with the item it just changed instead of forcing a reload of the project.
 */
const projectItemSelection = `
  id
  content {
    __typename
    ... on DraftIssue { id title createdAt updatedAt assignees(first: 100) { pageInfo { hasNextPage endCursor } nodes { login } } }
    ... on Issue {
      id number title url createdAt updatedAt repository { nameWithOwner }
      labels(first: 100) { pageInfo { hasNextPage endCursor } nodes { name } }
      assignees(first: 100) { pageInfo { hasNextPage endCursor } nodes { login } }
    }
    ... on PullRequest {
      id number title url createdAt updatedAt repository { nameWithOwner }
      labels(first: 100) { pageInfo { hasNextPage endCursor } nodes { name } }
      assignees(first: 100) { pageInfo { hasNextPage endCursor } nodes { login } }
    }
  }
  fieldValues(first: 100) {
    pageInfo { hasNextPage endCursor }
    nodes { ${projectFieldValueSelection} }
  }
`;
