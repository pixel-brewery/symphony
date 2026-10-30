export /**
 * An installed Symphony is started by the desktop environment, not by a shell. macOS hands those
 * processes the launchd default PATH, so package managers and CLIs installed through Homebrew or a
 * version manager are invisible and every subprocess fails with ENOENT, even though the same
 * command works in the user's terminal. Symphony therefore imports the login shell's PATH once and
 * keeps well-known installation directories as a fallback for shells that cannot be read.
 */

const LOGIN_SHELL_TIMEOUT_MS = 5_000;
