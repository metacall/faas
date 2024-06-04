import { callFunction } from './controller/call';
import { deployDelete } from './controller/delete';
import { deploy } from './controller/deploy';
import { globalError } from './controller/error';
import { inspect } from './controller/inspect';
import { logs } from './controller/logs';
import {
	fetchBranchList,
	fetchFileList,
	fetchFilesFromRepo
} from './controller/repository';
import { serveStatic } from './controller/static';
import { uploadPackage } from './controller/upload';
import { validate } from './controller/validate';

import { hostname } from 'os';

import express, { Express, NextFunction, Request, Response } from 'express';

import AppError from './utils/appError';

export function initializeAPI(): Express {
	const app = express();
	const host = hostname();

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	app.get('/readiness', (_req: Request, res: Response) =>
		res.sendStatus(200)
	);
	app.get('/validate', validate);
	app.get('/api/account/deploy-enabled', validate);

	app.get(`/${host}/:suffix/:version/call/:func`, callFunction);
	app.post(`/${host}/:suffix/:version/call/:func`, callFunction);
	app.get(
		`/${host}/:suffix/:version/static/.metacall/faas/apps/:suffix/:file`,
		serveStatic
	);

	app.post('/api/package/create', uploadPackage);
	app.post('/api/repository/add', fetchFilesFromRepo);

	app.post('/api/repository/branchlist', fetchBranchList);
	app.post('/api/repository/filelist', fetchFileList);
	app.post('/api/deploy/logs', logs);

	app.post('/api/deploy/create', deploy);

	app.get('/api/inspect', inspect);

	app.post('/api/deploy/delete', deployDelete);

	// For all the additional unimplemented routes
	app.all('*', (req: Request, res: Response, next: NextFunction) => {
		next(
			new AppError(`Can't find ${req.originalUrl} on this server!`, 404)
		);
	});

	app.use(globalError);

	return app;
}
