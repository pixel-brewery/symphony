// #region Imports

import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os';
import { isPrivate } from './isPrivate';

// #endregion

const VIRTUAL_INTERFACE_PATTERN =
  /^(?:awdl|br-|bridge|docker|ham|llw|tap|tailscale|tun|utun|vboxnet|veth|vmnet|wg|wsl|zerotier)/iu;

function interfacePriority(name: string): number {
  if (/^(?:en0|wi-?fi|wlan|wl)/iu.test(name)) return 0;
  if (/^(?:en|eth)/iu.test(name)) return 1;
  return 2;
}

function physicalCandidates(
  interfaces: NodeJS.Dict<readonly NetworkInterfaceInfo[]>,
): readonly { readonly name: string; readonly address: string; readonly priority: number }[] {
  return Object.entries(interfaces)
    .flatMap(([name, addresses]) =>
      (addresses ?? [])
        .filter(
          (address) =>
            address.family === 'IPv4' &&
            !address.internal &&
            isPrivate(address.address) &&
            !VIRTUAL_INTERFACE_PATTERN.test(name),
        )
        .map((address) => ({ name, address: address.address, priority: interfacePriority(name) })),
    )
    .filter(
      (candidate, index, candidates) =>
        candidates.findIndex((other) => other.address === candidate.address) === index,
    )
    .toSorted(
      (left, right) =>
        left.priority - right.priority ||
        left.name.localeCompare(right.name) ||
        left.address.localeCompare(right.address),
    );
}

/**
 * Selects the most likely phone-reachable private IPv4 interface while excluding tunnels and
 * virtual-machine adapters that cannot serve the current local Wi-Fi network.
 *
 * @param interfaces - Network interfaces to inspect.
 * @public
 */
export function selectPrivateHost(
  interfaces: NodeJS.Dict<readonly NetworkInterfaceInfo[]> = networkInterfaces(),
): string {
  const candidate = physicalCandidates(interfaces)[0];
  if (!candidate) throw new Error('No private local-network interface is available.');
  return candidate.address;
}
