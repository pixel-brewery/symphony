// #region Imports

import type { IRunnerImageDefinition } from '@symphony/domain-core';
import { managedGuestBasePackages } from '@symphony/domain-ci';
import { GUEST_NODE_MOUNT } from './GuestNodeMount';
import { GUEST_NODE_PREFIX } from './GuestNodePrefix';
function singleQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

// #endregion

/**
 * Provisions the guest from the selected image definition. Symphony's own packages must install;
 * the image's declared packages are installed best effort so a single renamed upstream package
 * cannot fail an otherwise healthy run. Locale, timezone, watcher limits, and shared-memory size
 * are host-runtime concerns that a GitHub-hosted image also settles before any job step runs.
 */
export function guestProvisioningScript(image: IRunnerImageDefinition): string {
  const declaredPackages = [...new Set(image.aptPackages)]
    .filter((name) => !(managedGuestBasePackages as readonly string[]).includes(name))
    .sort();
  const nodeInstallRoot = `/opt/node-${image.nodeVersion}`;
  const environmentExports = Object.entries(image.environment).map(
    ([name, value]) => `export ${name}=${singleQuote(value)}`,
  );
  return [
    'set -euo pipefail',
    'export DEBIAN_FRONTEND=noninteractive',
    'apt-get update',
    `apt-get install -y ${[...managedGuestBasePackages].sort().join(' ')}`,
    // One batched install keeps provisioning fast; the per-package fallback only runs when the
    // batch fails, so a single renamed upstream package cannot cost the whole run.
    ...(declaredPackages.length
      ? [
          `if ! apt-get install -y ${declaredPackages.join(' ')} >/dev/null 2>&1; then`,
          '  echo "Batched runner image install failed; retrying package by package."',
          `  for package in ${declaredPackages.join(' ')}; do`,
          '    apt-get install -y "$package" >/dev/null 2>&1 || echo "Runner image package unavailable: $package"',
          '  done',
          'fi',
        ]
      : []),
    'systemctl enable --now docker',
    "sed -i 's/^# *en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen",
    'locale-gen en_US.UTF-8 >/dev/null',
    'update-locale LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8',
    'ln -sf /usr/share/zoneinfo/UTC /etc/localtime',
    'echo UTC > /etc/timezone',
    "printf 'fs.inotify.max_user_watches=524288\\nfs.inotify.max_user_instances=512\\n' > /etc/sysctl.d/99-symphony-runner.conf",
    'sysctl --system >/dev/null',
    'mount -o remount,size=2G /dev/shm || true',
    `echo '${image.nodeSha256}  ${GUEST_NODE_MOUNT}/${image.nodeArchive}' | sha256sum --check`,
    `rm -rf ${nodeInstallRoot}`,
    `mkdir -p ${nodeInstallRoot}`,
    `tar -xJf '${GUEST_NODE_MOUNT}/${image.nodeArchive}' -C ${nodeInstallRoot} --strip-components=1`,
    `ln -sfn ${nodeInstallRoot} ${GUEST_NODE_PREFIX}`,
    ...['node', 'npm', 'npx', 'corepack'].map(
      (binary) => `ln -sf ${GUEST_NODE_PREFIX}/bin/${binary} /usr/local/bin/${binary}`,
    ),
    'corepack enable --install-directory /usr/local/bin',
    [
      "tee /etc/profile.d/symphony-runner-image.sh >/dev/null <<'SYMPHONY_RUNNER_IMAGE'",
      `export PATH=${GUEST_NODE_PREFIX}/bin:$PATH`,
      'export LANG=en_US.UTF-8',
      'export LC_ALL=en_US.UTF-8',
      'export TZ=UTC',
      ...environmentExports,
      'SYMPHONY_RUNNER_IMAGE',
    ].join('\n'),
    'chmod 0644 /etc/profile.d/symphony-runner-image.sh',
    'node --version',
  ].join('\n');
}
