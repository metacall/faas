import { hostname } from 'os';

import express, { NextFunction, Request, Response } from 'express';

import api from './api';
import { allApplications } from './constants';
import AppError from './utils/appError';

const app = express();
const host = hostname();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/readiness', (_req: Request, res: Response) => res.sendStatus(200));
app.get('/validate', api.validate);
app.get('/api/account/deploy-enabled', api.validate);

app.get(`/${host}/:appName/:version/call/:name`, api.callFunction);
app.post(`/${host}/:appName/:version/call/:name`, api.callFunction);
app.get(
	`/${host}/:appName/:version/static/.metacall/faas/apps/:app/:file`,
	api.serveStatic
);

app.post('/api/package/create', api.uploadPackage);
app.post('/api/repository/add', api.fetchFilesFromRepo);

app.post('/api/repository/branchlist', api.fetchBranchList);
app.post('/api/repository/filelist', api.fetchFileList);
app.post('/api/deploy/logs', api.logs);

app.post('/api/deploy/create', api.deploy);

app.get('/api/inspect', (_req, res) => {
	res.send(Object.values(allApplications));
});

app.post('/api/deploy/delete', api.deployDelete);

// For all the additional unimplemented routes
app.all('*', (req: Request, res: Response, next: NextFunction) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(api.globalError);

export default app;
