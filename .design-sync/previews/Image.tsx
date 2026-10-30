import { Icon, Image, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

// Screenshots of Symphony surfaces, inlined so the preview needs no network.
const svg = (markup: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

const boardShot = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300">
     <rect width="480" height="300" fill="#efeae1"/>
     <g fill="#ffffff" stroke="#ddd5c8">
       <rect x="16" y="16" width="140" height="268" rx="6"/>
       <rect x="170" y="16" width="140" height="268" rx="6"/>
       <rect x="324" y="16" width="140" height="268" rx="6"/>
     </g>
     <g fill="#1b1a19" font-family="monospace" font-size="11">
       <text x="28" y="40">Ready</text><text x="182" y="40">Running</text><text x="336" y="40">Review</text>
     </g>
     <g fill="#f7f3ec" stroke="#ddd5c8">
       <rect x="28" y="52" width="116" height="40" rx="4"/>
       <rect x="28" y="100" width="116" height="40" rx="4"/>
       <rect x="182" y="52" width="116" height="40" rx="4"/>
       <rect x="336" y="52" width="116" height="40" rx="4"/>
     </g>
     <rect x="182" y="52" width="3" height="40" fill="#b23a2f"/>
   </svg>`,
);

const diffShot = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300">
     <rect width="480" height="300" fill="#1b1a19"/>
     <g font-family="monospace" font-size="12" fill="#d8d2c8">
       <text x="20" y="40">apps/mobile/src/app/App.html</text>
       <text x="20" y="86">- import { app } from './app';</text>
       <text x="20" y="112">+ import { App } from './App';</text>
       <text x="20" y="158">  renderer bootstraps the shell view</text>
       <text x="20" y="184">  git mv keeps the index casing</text>
     </g>
     <rect x="12" y="72" width="3" height="20" fill="#b23a2f"/>
     <rect x="12" y="98" width="3" height="20" fill="#4f7a4a"/>
   </svg>`,
);

export const ExecutionScreenshot = () => (
  <Stack orientation="vertical" gap="tiny">
    <Image
      width="440px"
      height="275px"
      fit="cover"
      src={boardShot}
      alt="Board with three columns and one running work item"
    />
    <Text
      text="Board state captured when execution 4f21a9 moved WS-7 into Running."
      variant="neutral"
      wrap
    />
  </Stack>
);

export const Fit = () => (
  <Stack orientation="horizontal" gap="small" wrap>
    {(['cover', 'contain', 'fill', 'scale-down'] as const).map((fit) => (
      <Stack key={fit} orientation="vertical" gap="tiny">
        <Text text={`fit=${fit}`} variant="neutral" />
        <Image
          width="200px"
          height="150px"
          fit={fit}
          src={diffShot}
          alt={`Diff rendered with fit ${fit}`}
        />
      </Stack>
    ))}
  </Stack>
);

export const EmptyStates = () => (
  <Stack orientation="horizontal" gap="medium">
    <Stack orientation="vertical" gap="tiny">
      <Text text="No artifact recorded for this run" variant="neutral" wrap />
      <Image width="240px" height="160px" showEmpty>
        <Icon slot="empty" icon="folder" size="large" variant="neutral" />
      </Image>
    </Stack>
    <Stack orientation="vertical" gap="tiny">
      <Text text="Workspace has never been captured" variant="neutral" wrap />
      <Image width="240px" height="160px" showEmpty>
        <Stack slot="empty" orientation="vertical" gap="tiny" horizontalAlignment="center">
          <Icon icon="executionOutline" size="large" variant="neutral" />
          <Text text="Run WS-7 to capture" variant="neutral" />
        </Stack>
      </Image>
    </Stack>
  </Stack>
);

export const FailedState = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Failed — the run artifact was pruned by GitHub before Symphony fetched it." wrap />
    <Image
      width="440px"
      height="200px"
      src="artifact-run-1284.png"
      alt="Missing run artifact"
      state="failed"
      showFailed
      variant="danger"
    >
      <Stack slot="failed" orientation="vertical" gap="tiny" horizontalAlignment="center">
        <Icon icon="errorCircle" size="large" variant="danger" />
        <Text text="Artifact expired" variant="danger" />
      </Stack>
    </Image>
  </Stack>
);
