/**
 * Packages Symphony itself requires to operate the guest, independent of any repository or
 * runner image: a container engine for service containers, and the transport and archive tools
 * the managed provisioning uses. Everything a repository needs beyond this belongs in the
 * repository's own setup script, never in Symphony.
 */
export const managedGuestBasePackages = [
  'ca-certificates',
  'curl',
  'docker.io',
  'locales',
  'tzdata',
  'xz-utils',
] as const;
