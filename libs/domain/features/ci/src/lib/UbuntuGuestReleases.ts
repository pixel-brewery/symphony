/**
 * Ubuntu releases Symphony can boot as a managed local CI guest. The codename selects the
 * cloud-image directory; the version matches the GitHub runner image family it reproduces.
 */
export const ubuntuGuestReleases = [
  { version: '22.04', codename: 'jammy', family: 'ubuntu22' },
  { version: '24.04', codename: 'noble', family: 'ubuntu24' },
  { version: '26.04', codename: 'resolute', family: 'ubuntu26' },
] as const;
