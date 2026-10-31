import { Avatar, Button, Chip, Comment, Stack } from '@pixel-brewery/mosaik-elements-react';

export const TaskComment = () => (
  <Comment
    author="André Wehlert"
    at="15 May 2024, 12:04"
    content="The renderer file names diverge between macOS and the Linux runner. Rename the four files before we retry the delivery — CI will keep failing on the import paths otherwise."
  >
    <Avatar slot="avatar" text="AW" size="tiny" appearance="soft" />
  </Comment>
);

export const SlottedMetadata = () => (
  <Comment content="Analysis finished. The failure is a case-only rename that git did not record; the fix is four `git mv` calls plus the barrel update.">
    <Avatar slot="avatar" icon="claude" size="tiny" appearance="soft" />
    <span slot="author">claude-opus · Analyzer</span>
    <span slot="at">15 May 2024, 12:09</span>
    <Stack slot="actions" orientation="horizontal" gap="tiny">
      <Chip
        label="Qualified → Ready"
        appearance="soft"
        size="tiny"
        variant="success"
        icon="checkmarkCircle"
      />
      <Button
        label="Open execution"
        icon="executionOutline"
        appearance="plain"
        variant="neutral"
        size="small"
      />
    </Stack>
  </Comment>
);

export const Thread = () => (
  <Comment
    author="André Wehlert"
    at="15 May 2024, 12:04"
    content="Can the Analyzer take SYM-482 before the next delivery window?"
  >
    <Avatar slot="avatar" text="AW" size="tiny" appearance="soft" />
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
  </Comment>
);

export const EventStream = () => (
  <Stack orientation="vertical" gap="medium">
    <Comment
      author="github-actions"
      at="15 May 2024, 12:12"
      content="Workflow ci.yml failed on ubuntu-latest: cannot find module './app.html'."
    >
      <Avatar slot="avatar" icon="github" size="tiny" appearance="soft" />
    </Comment>
    <Comment
      author="claude-opus"
      at="15 May 2024, 12:19"
      content="Diagnosed as a source failure, not infrastructure. Repairing the branch in the managed worktree."
    >
      <Avatar slot="avatar" icon="claude" size="tiny" appearance="soft" />
    </Comment>
    <Comment
      author="github-actions"
      at="15 May 2024, 12:34"
      content="Workflow ci.yml passed on ubuntu-latest in 4m 51s."
    >
      <Avatar slot="avatar" icon="github" size="tiny" appearance="soft" />
    </Comment>
  </Stack>
);
