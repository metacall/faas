export const defaultPort = 9000;

const parsePort = (value: string, source: string): number => {
	const port = Number(value);
	if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
		throw new Error(
			`Invalid port '${value}' from ${source}, it must be a number between 1 and 65535`
		);
	}
	return port;
};

// Resolve the port with precedence: --port flag > PORT env var > default
export const getPort = (
	args: string[],
	env: NodeJS.ProcessEnv = process.env
): number => {
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--port') {
			const value = args[i + 1];
			if (value === undefined || value.startsWith('--')) {
				throw new Error('Missing value for --port');
			}
			return parsePort(value, '--port');
		}
		if (args[i].startsWith('--port=')) {
			return parsePort(args[i].slice('--port='.length), '--port');
		}
	}

	if (env.PORT !== undefined && env.PORT !== '') {
		return parsePort(env.PORT, 'PORT environment variable');
	}

	return defaultPort;
};
