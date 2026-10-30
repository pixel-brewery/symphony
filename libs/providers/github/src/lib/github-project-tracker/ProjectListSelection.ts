export const projectListSelection = `projectsV2(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id number title url closed
        owner { __typename ... on User { login } ... on Organization { login } }
      }
    }`;
