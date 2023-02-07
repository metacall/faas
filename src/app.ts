import { hostname } from 'os';

import express, { NextFunction, Request, Response } from 'express';
import { metacall_inspect } from 'metacall';

import * as api from './api';
import { currentFile } from './constants';
import AppError from './utils/appError';
import globalErrorHandler from './utils/errorHandler';

const app = express();
const host = hostname();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/validate', api.validateAndDeployEnabled);
app.get('/api/account/deploy-enabled', api.validateAndDeployEnabled);

app.post(`/${host}/:appName/:version/call/:name`, api.callFnByName);
app.get(
	`/${host}/:appName/:version/static/.metacall/faas/apps/:app/:file`,
	api.serveStatic
);

// http://localhost:9000/Creatoon/deploy/v1/call/reverse
// http://localhost:9000/Creatoon/deploy/v1/static/dist/apps/deploy/README.md

app.post('/api/package/create', api.fetchFiles);
app.post('/api/repository/add', api.fetchFilesFromRepo);

app.post('/api/repository/branchlist', api.fetchBranchList);
app.post('/api/repository/filelist', api.fetchFileList);
app.post('/api/deploy/logs', api.showLogs);

app.post('/api/deploy/create', api.deploy);

app.get('/api/inspect', (req, res) => {
	// eslint-disable-next-line
	const packages = metacall_inspect();

	res.send([
		{
			status: 'ready',
			prefix: host,
			suffix: currentFile.id,
			version: 'v1',
			packages, // eslint-disable-line
			ports: []
		}
	]);
});

// For all the additional unimplemented routes
app.all('*', (req: Request, res: Response, next: NextFunction) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

//TODO serve fn via api

export default app;
