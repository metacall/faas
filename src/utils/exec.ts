import { exec as syncExec } from 'child_process';
import { promisify } from 'util';

export const exec = promisify(syncExec);
