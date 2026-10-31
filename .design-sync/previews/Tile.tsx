import { Hint, Icon, Stack, Text, Tile } from '@pixel-brewery/mosaik-elements-react';

// Symphony's Arcade lists each game as a plain, borderless button tile filled by
// its cover image; these tiles show the same surface with text content.
const cover = { width: '186px', height: '240px' };

const Game = ({ title, meta }: { title: string; meta: string }) => (
  <Stack
    orientation="vertical"
    gap="small"
    horizontalAlignment="center"
    verticalAlignment="center"
    fit="both"
  >
    <Icon icon="games" size="large" />
    <Text text={title} />
    <Hint text={meta} />
  </Stack>
);

export const ArcadeTiles = () => (
  <Stack orientation="horizontal" gap="large" wrap>
    <div style={cover}>
      <Tile type="button" fit="both" appearance="plain" variant="neutral" elevation="none">
        <Game title="Jungle run" meta="1 player · 20 min" />
      </Tile>
    </div>
    <div style={cover}>
      <Tile type="button" fit="both" appearance="plain" variant="neutral" elevation="none">
        <Game title="Cavern dive" meta="1 player · 30 min" />
      </Tile>
    </div>
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="horizontal" gap="medium" wrap>
    {(['plain', 'outline', 'soft'] as const).map((appearance) => (
      <div key={appearance} style={{ width: '150px', height: '120px' }}>
        <Tile type="button" fit="both" appearance={appearance} variant="neutral" elevation="none">
          <Game title={appearance} meta="variant neutral" />
        </Tile>
      </div>
    ))}
  </Stack>
);

export const States = () => (
  <Stack orientation="horizontal" gap="medium" wrap>
    <div style={{ width: '150px', height: '120px' }}>
      <Tile type="button" fit="both" appearance="outline" variant="neutral" elevation="light">
        <Game title="Elevated" meta="elevation light" />
      </Tile>
    </div>
    <div style={{ width: '150px', height: '120px' }}>
      <Tile type="button" fit="both" appearance="outline" variant="neutral" disabled>
        <Game title="Unavailable" meta="disabled" />
      </Tile>
    </div>
  </Stack>
);
