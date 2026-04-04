import { exec as syncExec, execFile as syncExecFile } from 'child_process';
import { promisify } from 'util';

export const exec = promisify(syncExec);

// Shell-free alternative: use for any command with user-controlled arguments.
// execFile spawns the process directly — no shell is involved, so shell
// metacharacters in arguments are never interpreted.
export const execFile = promisify(syncExecFile);
