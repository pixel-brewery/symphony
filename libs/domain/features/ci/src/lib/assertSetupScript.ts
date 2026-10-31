/**
 * Validates a repository setup script before it is transferred into the guest. The script is
 * repository-owned configuration, so Symphony bounds it rather than interpreting it.
 */
export function assertSetupScript(script: string): void {
  if (script.includes('\0')) {
    throw new Error('The setup script must not contain null bytes.');
  }
  if (script.length > 32_768) {
    throw new Error('The setup script must not exceed 32768 characters.');
  }
}
