import { NextFunction, Request, Response } from 'express';

// Default origins when FAAS_CORS_ORIGINS is unset (not used in production).
export const DEV_CORS_ORIGINS = [
	'http://localhost:5173',
	'http://127.0.0.1:5173',
	'http://localhost:3000'
];

// Seconds a browser may cache a preflight answer.
const PREFLIGHT_MAX_AGE = '600';

// Origins from FAAS_CORS_ORIGINS (comma-separated). If unset: dev origins,
// or none (CORS off) when NODE_ENV=production.
export const resolveAllowedOrigins = (
	env: NodeJS.ProcessEnv = process.env
): string[] => {
	const configured = env.FAAS_CORS_ORIGINS;
	if (configured !== undefined) {
		return configured
			.split(',')
			.map(origin => origin.trim().replace(/\/+$/, ''))
			.filter(origin => origin !== '');
	}
	return env.NODE_ENV === 'production' ? [] : DEV_CORS_ORIGINS;
};

// Adds CORS headers for allowed origins and answers their preflights.
// Other origins get no CORS headers.
export const createCors = (
	allowedOrigins: string[] = resolveAllowedOrigins()
) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		// The response varies by Origin.
		res.setHeader('Vary', 'Origin');

		const origin = req.headers.origin;
		if (!origin || !allowedOrigins.includes(origin)) {
			return next();
		}

		res.setHeader('Access-Control-Allow-Origin', origin);

		if (req.method === 'OPTIONS') {
			res.setHeader(
				'Access-Control-Allow-Methods',
				'GET, POST, PUT, DELETE, OPTIONS'
			);
			res.setHeader(
				'Access-Control-Allow-Headers',
				'Content-Type, Authorization, Accept'
			);
			res.setHeader('Access-Control-Max-Age', PREFLIGHT_MAX_AGE);
			res.sendStatus(204);
			return;
		}

		next();
	};
};
