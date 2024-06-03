import { ChildProcess } from 'child_process';
import concat from 'concat-stream';
import { spawn } from 'cross-spawn';
import { existsSync } from 'fs';
import { constants } from 'os';

const INPUT_DELAY = 4000;
const KILL_TIMEOUT_DELAY = 4000;

export const inputKeys = {
	enter: '\n',
	space: ' ',
	kill: '^C'
} as const;

export const executeProcess = (
	path: string,
	args: string[] = []
): ChildProcess => {
	if (!path || !existsSync(path)) {
		throw new Error('Invalid or non-existent process path: ' + path);
	}

	const child = spawn('node', [path, ...args], {
		stdio: [null, null, null, 'ipc']
	});

	child.stdin?.setDefaultEncoding('utf-8');
	return child;
};

export const executeProcessWithInput = (
	path: string,
	args: string[] = [],
	inputs: string[] = []
): { promise: Promise<string>; child: ChildProcess } => {
	const child = executeProcess(path, args);

	let childTimeout: NodeJS.Timeout | undefined,
		killTimeout: NodeJS.Timeout | undefined;

	const loop = (inputs: string[]) => {
		if (killTimeout) {
			clearTimeout(killTimeout);
		}

		if (inputs.length === 0 || inputs[0] === inputKeys.kill) {
			child.stdin?.end();
			killTimeout = setTimeout(() => {
				child.kill(constants.signals.SIGTERM);
			}, KILL_TIMEOUT_DELAY);
			return;
		}

		childTimeout = setTimeout(() => {
			child.stdin?.cork();
			child.stdin?.write(inputs.shift() || '');
			child.stdin?.uncork();
			loop(inputs);
		}, INPUT_DELAY);
	};

	return {
		promise: new Promise<string>((resolve, reject) => {
			child.stderr?.once('data', err => {
				child.stdin?.end();
				if (childTimeout) {
					clearTimeout(childTimeout);
					inputs = [];
				}
				reject(String(err));
			});
			child.on('error', reject);

			loop(inputs);

			child.stdout?.pipe(
				concat(result => {
					if (killTimeout) {
						clearTimeout(killTimeout);
					}

					resolve(result.toString());
				})
			);
		}),
		child
	};
};

// export const deployed = async (suffix: string): Promise<boolean> => {};
