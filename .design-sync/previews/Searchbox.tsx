import { Icon, Searchbox, Stack } from '@pixel-brewery/mosaik-elements-react';

export const GlobalSearch = () => (
  <Searchbox placeholder="Search workspace…" variant="primary" mode="enter" isClearable />
);

export const WithQuery = () => (
  <Stack orientation="vertical" gap="medium">
    <Searchbox placeholder="Title or ticket ID" value="SYM-418" mode="delay" isClearable />
    <Searchbox placeholder="Title, branch, author or number" value="codex/fix-ci" isClearable />
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="medium">
    {(['default', 'outline', 'soft', 'plain'] as const).map((appearance) => (
      <Searchbox
        key={appearance}
        appearance={appearance}
        placeholder={`Search available skills… (${appearance})`}
      />
    ))}
  </Stack>
);

export const States = () => (
  <Stack orientation="vertical" gap="medium">
    <Searchbox placeholder="Search executions…" value="delivery failed" isBusy />
    <Searchbox placeholder="Search work items…" value="archived only" disabled />
    <Searchbox placeholder="Search repositories…" variant="danger" value="no matches" />
  </Stack>
);

export const WithFilterSuffix = () => (
  <Searchbox placeholder="Search work items…" variant="primary" mode="enter" isClearable>
    <Icon slot="suffix" icon="filter" size="small" />
  </Searchbox>
);
