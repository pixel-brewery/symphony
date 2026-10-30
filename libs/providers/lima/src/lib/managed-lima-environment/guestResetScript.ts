// #region Imports

import { GUEST_FINGERPRINT_FILE } from './GuestFingerprintFile';
import { GUEST_SETUP_SCRIPT } from './GuestSetupScript';

// #endregion

/**
 * Removes every trace of the previous run from a warm instance: workspaces, containers and their
 * volumes, leftover processes, caches of test artifacts, and the temporary transfer files. The
 * provisioned baseline and the recorded fingerprint are the only state that survives.
 */
export function guestResetScript(): string {
  return [
    'set +e',
    'pkill -f "actions-runner/run.sh" >/dev/null 2>&1',
    'pkill -f "dist/apps/backend" >/dev/null 2>&1',
    'pkill -f "http-server" >/dev/null 2>&1',
    'if command -v docker >/dev/null 2>&1; then',
    '  docker ps -aq | xargs -r docker rm --force >/dev/null 2>&1',
    '  docker volume ls -q | xargs -r docker volume rm --force >/dev/null 2>&1',
    'fi',
    'rm -rf /opt/actions-runner/_work',
    `rm -f ${GUEST_SETUP_SCRIPT}`,
    // Deleting inside the guest frees nothing on the Mac: the instance disk is a sparse file that
    // only shrinks when the guest discards the freed blocks. Without this a warm machine ratchets
    // up to its full provisioned size and fills the storage budget on its own.
    'fstrim -a >/dev/null 2>&1',
    'set -e',
    `test -s ${GUEST_FINGERPRINT_FILE}`,
    'echo "Warm guest reset complete."',
  ].join('\n');
}
