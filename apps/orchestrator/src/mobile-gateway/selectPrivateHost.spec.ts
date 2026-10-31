// #region Imports

import type { NetworkInterfaceInfo } from 'node:os';
import { describe, expect, it } from 'vitest';
import { selectPrivateHost } from './selectPrivateHost';

// #endregion

describe('selectPrivateHost', () => {
  it('prefers the local Wi-Fi adapter over a private VPN tunnel', () => {
    // arrange
    const interfaces = {
      utun6: [address('10.20.0.2')],
      en0: [address('192.168.178.171')],
    };

    // act
    const actual = selectPrivateHost(interfaces);

    // assert
    expect(actual).toBe('192.168.178.171');
  });

  it('selects deterministically when more than one physical private adapter is available', () => {
    // arrange
    const interfaces = {
      en4: [address('192.168.1.40')],
      en0: [address('192.168.1.20')],
    };

    // act
    const actual = selectPrivateHost(interfaces);

    // assert
    expect(actual).toBe('192.168.1.20');
  });

  it('does not publish mobile access through a virtual-only private adapter', () => {
    // arrange
    const interfaces = { vmnet8: [address('192.168.64.1')] };

    // act
    const actual = (): string => selectPrivateHost(interfaces);

    // assert
    expect(actual).toThrow('No private local-network interface is available.');
  });
});

function address(value: string): NetworkInterfaceInfo {
  return {
    address: value,
    netmask: '255.255.255.0',
    family: 'IPv4',
    mac: '00:00:00:00:00:00',
    internal: false,
    cidr: `${value}/24`,
  };
}
