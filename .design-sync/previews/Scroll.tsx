import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Comment,
  Hint,
  Scroll,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

// Scroll inherits its height, so a vertical scroller only becomes one when the
// host is given an explicit height.
const vertical = { height: '320px', display: 'block' };
const panel = {
  border: '1px solid var(--mosaik-scheme-middlelight)',
  borderRadius: 'var(--mosaik-layout-radius)',
  background: 'var(--mosaik-scheme-surface)',
};

const events: Array<[string, string, string]> = [
  ['12:04:01', 'Workspace prepared', 'symphony · codex/fix-ci-case-paths'],
  ['12:04:18', 'Skill resolved', 'repository-investigator'],
  ['12:05:02', 'Reading apps/renderer/src', '218 files scanned'],
  ['12:06:44', 'Renamed 4 preview files', 'app.html → App.html'],
  ['12:07:30', 'yarn nx run renderer:lint', 'passed in 42s'],
  ['12:09:11', 'yarn nx run renderer:test', 'passed in 1m 18s'],
  ['12:10:52', 'Commit pushed', 'chore: clean up code structure'],
  ['12:11:26', 'Pull request opened', '#1284 · Closes SYM-482'],
];

export const ExecutionLog = () => (
  <div style={{ ...panel, ...vertical }}>
    <Scroll showScrollbar style={vertical}>
      <Stack orientation="vertical" gap="small" style={{ padding: '12px' }}>
        {events.map(([at, title, detail]) => (
          <Stack key={at} orientation="vertical" gap="tiny">
            <Text text={`${at}  ${title}`} wrap />
            <Hint text={detail} textOverflow="wrap" />
          </Stack>
        ))}
      </Stack>
    </Scroll>
  </div>
);

export const WorkspacePanorama = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Workspaces" wrap />
    <Scroll showScrollbar style={{ display: 'block', width: '100%' }}>
      <div style={{ display: 'flex', width: 'max-content', gap: '12px', padding: '4px 2px 10px' }}>
        {[
          ['symphony', '8.2 GB · 3 executions today', 'Ready'],
          ['mosaik', '6.1 GB · 1 execution today', 'Idle'],
          ['flamox', '4.1 GB · no executions', 'Idle'],
          ['platform-engine-frontend', '2.4 GB · 2 executions today', 'Ready'],
        ].map(([name, meta, state]) => (
          <Card key={name} style={{ width: '260px' }}>
            <CardHeader text={name} subText={meta} />
            <CardContent>
              <Stack orientation="horizontal" gap="tiny">
                <Chip
                  label={state}
                  appearance="soft"
                  size="small"
                  variant={state === 'Ready' ? 'success' : 'neutral'}
                />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </div>
    </Scroll>
    <Hint
      text="A row wider than its container scrolls horizontally without any orientation prop."
      textOverflow="wrap"
    />
  </Stack>
);

export const DrawerComments = () => (
  <div style={{ ...panel, height: '260px' }}>
    <Scroll showScrollbar style={{ height: '260px', display: 'block' }}>
      <Stack orientation="vertical" gap="medium" style={{ padding: '12px' }}>
        <Comment
          author="André Wehlert"
          at="15 May 2024, 12:04"
          content="Can the Analyzer take SYM-482 before the next delivery window?"
        >
          <Avatar slot="avatar" text="AW" size="tiny" appearance="soft" />
        </Comment>
        <Comment
          author="claude-opus"
          at="15 May 2024, 12:06"
          content="Picked it up. Workspace symphony is prepared and the repository-investigator skill is resolved."
        >
          <Avatar slot="avatar" icon="claude" size="tiny" appearance="soft" />
        </Comment>
        <Comment
          author="codex"
          at="15 May 2024, 12:31"
          content="Delivery opened pull request #1284 on codex/fix-ci-case-paths. Closes SYM-482."
        >
          <Avatar slot="avatar" icon="openai" size="tiny" appearance="soft" />
        </Comment>
        <Comment
          author="github-actions"
          at="15 May 2024, 12:34"
          content="Workflow ci.yml passed on ubuntu-latest in 4m 51s. The pull request is ready to review."
        >
          <Avatar slot="avatar" icon="github" size="tiny" appearance="soft" />
        </Comment>
      </Stack>
    </Scroll>
  </div>
);
