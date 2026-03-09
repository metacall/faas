import { callFunction } from './controller/call';
import { deployDelete } from './controller/delete';
import { deploy } from './controller/deploy';
import { globalError } from './controller/error';
import { inspect } from './controller/inspect';
import { logs } from './controller/logs';
import { packageUpload } from './controller/package';
import {
	repositoryBranchList,
	repositoryClone,
	repositoryFileList
} from './controller/repository';
import { serveStatic } from './controller/static';
import { validate } from './controller/validate';
import { login, signup } from './controller/auth';
import { verifyToken } from './utils/auth';

import { hostname } from 'os';

import express, { Express, NextFunction, Request, Response } from 'express';

import AppError from './utils/appError';

// CORS Middleware
function cors(req: Request, res: Response, next: NextFunction): void {
	const allowedOrigins = [
		'http://localhost:5173',
		'http://localhost:3000',
		'http://127.0.0.1:5173'
	];
	//note:
	const origin = req.headers.origin;
	if (origin && allowedOrigins.includes(origin)) {
		res.setHeader('Access-Control-Allow-Origin', origin);
	}
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, PUT, DELETE, OPTIONS'
	);
	res.setHeader(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorization, Accept'
	);
	if (req.method === 'OPTIONS') {
		res.sendStatus(204);
		return;
	}
	next();
}

// JWT Auth Middleware
function requireAuth(req: Request, res: Response, next: NextFunction): void {
	const authHeader = req.headers['authorization'];
	const token = authHeader?.startsWith('Bearer ')
		? authHeader.slice(7)
		: authHeader?.startsWith('jwt ')
		? authHeader.slice(4)
		: null;

	if (!token) {
		res.status(401).json({ error: 'Missing authorization token.' });
		return;
	}

	const payload = verifyToken(token);
	if (!payload) {
		res.status(401).json({ error: 'Invalid or expired token.' });
		return;
	}

	next();
}

export function initializeAPI(): Express {
	const app = express();
	const host = hostname();

	// Apply CORS to all routes
	app.use(cors);
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	// Public routes
	app.get('/api/readiness', (_req: Request, res: Response) =>
		res.sendStatus(200)
	);
	app.post('/api/auth/login', (req, res, next) => {
		login(req, res).catch(next);
	});
	app.post('/api/auth/signup', (req, res, next) => {
		signup(req, res).catch(next);
	});

	// Protected routes — only enforced when METACALL_AUTH_REQUIRED=true.
	// Defaults to open for backward-compatibility with local dev and CI
	// (metacall-deploy --dev does not send auth headers).
	if (process.env.METACALL_AUTH_REQUIRED === 'true') {
		app.use(requireAuth);
	}

	app.get('/validate', validate);
	app.get('/api/account/deploy-enabled', validate);

	app.get(`/${host}/:suffix/:version/call/:func`, callFunction);
	app.post(`/${host}/:suffix/:version/call/:func`, callFunction);
	app.get(
		`/${host}/:suffix/:version/static/.metacall/faas/apps/:suffix/:file`,
		serveStatic
	);

	app.post('/api/package/create', packageUpload);

	app.post('/api/repository/branchlist', repositoryBranchList);
	app.post('/api/repository/filelist', repositoryFileList);
	app.post('/api/repository/add', repositoryClone);

	app.post('/api/deploy/create', deploy);
	app.post('/api/deploy/logs', logs);
	app.post('/api/deploy/delete', deployDelete);

	app.get('/api/inspect', inspect);

	app.get(
		'/api/billing/list-subscriptions',
		(_req: Request, res: Response) => {
			return res.status(200).json(['Essential', 'Essential']);
		}
	);
	app.post(
		'/api/billing/list-subscriptions',
		(_req: Request, res: Response) => {
			return res.status(200).json(['Essential', 'Essential']);
		}
	);
	app.get(
		'/api/billing/list-subscriptions-deploys',
		(_req: Request, res: Response) => {
			return res.status(200).json([]);
		}
	);
	app.post(
		'/api/billing/list-subscriptions-deploys',
		(_req: Request, res: Response) => {
			return res.status(200).json([]);
		}
	);

	// For all the additional unimplemented routes
	app.all('*', (req: Request, res: Response, next: NextFunction) => {
		next(
			new AppError(`Can't find ${req.originalUrl} on this server!`, 404)
		);
	});

	app.use(globalError);

	return app;
}
