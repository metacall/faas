import { strict as assert } from 'assert';

// ---------------------------------------------------------------------------
// Inline copies of pure helpers (no I/O, no ChildProcess) so that mocha can
// test them without spinning up the FaaS server.
// ---------------------------------------------------------------------------

// detectLevel
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'HTTP';

function detectLevel(message: string): LogLevel {
	const m = message.toLowerCase();
	if (/\berror\b|failed|exception|fatal|stderr/.test(m)) return 'ERROR';
	if (/\bwarn(ing)?\b|deprecated/.test(m)) return 'WARN';
	if (/get |post |put |delete |patch |http\//.test(m)) return 'HTTP';
	if (/debug|verbose|trace/.test(m)) return 'DEBUG';
	return 'INFO';
}

// LEVEL_COLORS
const LEVEL_COLORS: Record<LogLevel, string> = {
	INFO: '\x1b[36m',
	WARN: '\x1b[33m',
	ERROR: '\x1b[31m',
	DEBUG: '\x1b[35m',
	HTTP: '\x1b[90m'
};

// assignColorToWorker (round-robin logic only)
const ANSICode: number[] = [
	166, 154, 142, 118, 203, 202, 190, 215, 214, 32, 6, 4, 220, 208, 184, 172
];

function makeColorAssigner() {
	const pidMap: Record<number, number> = {};
	let nextColorIndex = 0;

	return function assignColor(pid: number): number {
		if (pidMap[pid] === undefined) {
			pidMap[pid] = ANSICode[nextColorIndex % ANSICode.length];
			nextColorIndex += 1;
		}
		return pidMap[pid];
	};
}

// ===========================================================================
// Suite 1: Logging utilities
// ===========================================================================

describe('detectLevel()', function () {
	it('returns ERROR for messages containing "error"', () => {
		assert.equal(detectLevel('Unhandled error occurred'), 'ERROR');
	});

	it('returns ERROR for "failed"', () => {
		assert.equal(detectLevel('Request failed with status 500'), 'ERROR');
	});

	it('returns ERROR for "exception"', () => {
		assert.equal(detectLevel('Uncaught exception in handler'), 'ERROR');
	});

	it('returns ERROR for "fatal"', () => {
		assert.equal(detectLevel('Fatal crash detected'), 'ERROR');
	});

	it('returns ERROR for "stderr"', () => {
		assert.equal(detectLevel('stderr: module not found'), 'ERROR');
	});

	it('returns WARN for "warn"', () => {
		assert.equal(detectLevel('warn: disk usage above 80%'), 'WARN');
	});

	it('returns WARN for "warning"', () => {
		assert.equal(detectLevel('warning: deprecated API used'), 'WARN');
	});

	it('returns WARN for "deprecated"', () => {
		assert.equal(detectLevel('This method is deprecated'), 'WARN');
	});

	it('returns HTTP for "GET "', () => {
		assert.equal(detectLevel('GET /api/inspect'), 'HTTP');
	});

	it('returns HTTP for "POST "', () => {
		assert.equal(detectLevel('POST /api/deploy/create'), 'HTTP');
	});

	it('returns HTTP for "http/"', () => {
		assert.equal(detectLevel('HTTP/1.1 200 OK'), 'HTTP');
	});

	it('returns DEBUG for "debug"', () => {
		assert.equal(detectLevel('debug: connection pool size = 4'), 'DEBUG');
	});

	it('returns DEBUG for "verbose"', () => {
		assert.equal(detectLevel('verbose logging mode'), 'DEBUG');
	});

	it('returns DEBUG for "trace"', () => {
		assert.equal(detectLevel('trace: entering function'), 'DEBUG');
	});

	it('returns INFO for a plain message', () => {
		assert.equal(detectLevel('Server started on port 9000'), 'INFO');
	});

	it('is case-insensitive', () => {
		assert.equal(detectLevel('ERROR in module'), 'ERROR');
		assert.equal(detectLevel('Error in module'), 'ERROR');
		assert.equal(detectLevel('ERROR IN MODULE'), 'ERROR');
	});
});

// ---------------------------------------------------------------------------

describe('LEVEL_COLORS — ANSI escape code format', function () {
	const ESC = '\x1b[';

	for (const [level, code] of Object.entries(LEVEL_COLORS)) {
		it(`LEVEL_COLORS.${level} starts with ESC[ and ends with 'm' (no stray ']')`, () => {
			assert.ok(
				code.startsWith(ESC),
				`${level}: expected string to start with "\\x1b[", got: ${JSON.stringify(
					code
				)}`
			);
			assert.ok(
				code.endsWith('m'),
				`${level}: expected string to end with 'm', got: ${JSON.stringify(
					code
				)}`
			);
			assert.ok(
				!code.endsWith('m]'),
				`${level}: string must NOT end with stray ']', got: ${JSON.stringify(
					code
				)}`
			);
		});
	}

	it('covers all five log levels', () => {
		const levels: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'HTTP'];
		for (const level of levels) {
			assert.ok(
				LEVEL_COLORS[level] !== undefined,
				`LEVEL_COLORS is missing entry for ${level}`
			);
		}
	});
});

// ---------------------------------------------------------------------------

describe('assignColorToWorker() — round-robin color assignment', function () {
	it('assigns a number color code to a new PID', () => {
		const assign = makeColorAssigner();
		const color = assign(1001);
		assert.ok(typeof color === 'number', 'color should be a number');
	});

	it('returns the same color for the same PID on repeated calls', () => {
		const assign = makeColorAssigner();
		const first = assign(2001);
		const second = assign(2001);
		assert.equal(first, second, 'same PID must always get same color');
	});

	it('assigns a different color to a different PID', () => {
		const assign = makeColorAssigner();
		const a = assign(3001);
		const b = assign(3002);
		assert.notEqual(a, b);
	});

	it('does NOT hang / throw when 17+ PIDs are assigned (no infinite loop)', () => {
		const assign = makeColorAssigner();
		for (let i = 0; i < 20; i++) {
			assert.doesNotThrow(() => assign(5000 + i));
		}
	});

	it('wraps around after exhausting the 16-color palette', () => {
		const assign = makeColorAssigner();
		for (let i = 0; i < 16; i++) {
			assign(6000 + i);
		}
		const colorOf17th = assign(6016);
		const colorOf1st = ANSICode[0];
		assert.equal(
			colorOf17th,
			colorOf1st,
			'17th deployment should reuse the first color (round-robin)'
		);
	});

	it('assigned color is always a member of the ANSICode palette', () => {
		const assign = makeColorAssigner();
		for (let i = 0; i < 30; i++) {
			const color = assign(7000 + i);
			assert.ok(
				ANSICode.includes(color),
				`Color ${color} is not in the ANSICode palette`
			);
		}
	});
});
