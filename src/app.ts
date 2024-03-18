import { hostname } from 'os';

import express, { NextFunction, Request, Response } from 'express';

import * as api from './api';
import { allApplications } from './constants';
import AppError from './utils/appError';
import { findJsonFilesRecursively } from './utils/autoDeploy';
import { appsDirectory } from './utils/config';
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

app.post('/api/package/create', api.fetchFiles);
app.post('/api/repository/add', api.fetchFilesFromRepo);

app.post('/api/repository/branchlist', api.fetchBranchList);
app.post('/api/repository/filelist', api.fetchFileList);
app.post('/api/deploy/logs', api.showLogs);

app.post('/api/deploy/create', api.deploy);

app.get('/api/inspect', (req, res) => {
	res.send(Object.values(allApplications));
});

app.post('/api/deploy/delete', api.deployDelete);

// For all the additional unimplemented routes
app.all('*', (req: Request, res: Response, next: NextFunction) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

const appsDir = appsDirectory();
findJsonFilesRecursively(appsDir)
	.then(() => {
		console.log('Previously deployed apllications deployed successfully');
	})
	.catch(error => {
		console.error('Error while re-deploying applications', error);
	});

app.use(globalErrorHandler);

export default app;
