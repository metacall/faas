import { execFile as syncExecFile } from 'child_process';
import { promisify } from 'util';

/**
 * Safe alternative to exec that doesn't use a shell.
 * Uses execFile with argument arrays instead of shell string interpolation.
 * Prevents command injection attacks.
 */
export const execFile = promisify(syncExecFile);
