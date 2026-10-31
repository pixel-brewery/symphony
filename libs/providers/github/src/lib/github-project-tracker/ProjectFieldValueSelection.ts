export const projectFieldValueSelection = `
  __typename
  ... on ProjectV2ItemFieldTextValue {
    field { ... on ProjectV2Field { id } ... on ProjectV2SingleSelectField { id } ... on ProjectV2MultiSelectField { id } ... on ProjectV2IterationField { id } }
    text
  }
  ... on ProjectV2ItemFieldNumberValue {
    field { ... on ProjectV2Field { id } ... on ProjectV2SingleSelectField { id } ... on ProjectV2MultiSelectField { id } ... on ProjectV2IterationField { id } }
    number
  }
  ... on ProjectV2ItemFieldDateValue {
    field { ... on ProjectV2Field { id } ... on ProjectV2SingleSelectField { id } ... on ProjectV2MultiSelectField { id } ... on ProjectV2IterationField { id } }
    date
  }
  ... on ProjectV2ItemFieldSingleSelectValue {
    field { ... on ProjectV2Field { id } ... on ProjectV2SingleSelectField { id } ... on ProjectV2MultiSelectField { id } ... on ProjectV2IterationField { id } }
    optionId
  }
  ... on ProjectV2ItemFieldMultiSelectValue {
    field { ... on ProjectV2Field { id } ... on ProjectV2SingleSelectField { id } ... on ProjectV2MultiSelectField { id } ... on ProjectV2IterationField { id } }
    options { id }
  }
  ... on ProjectV2ItemFieldIterationValue {
    field { ... on ProjectV2Field { id } ... on ProjectV2SingleSelectField { id } ... on ProjectV2MultiSelectField { id } ... on ProjectV2IterationField { id } }
    iterationId
  }
`;
