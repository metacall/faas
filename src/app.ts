import express, { NextFunction, Request, Response } from 'express';

import * as api from './api';
import AppError from './utils/appError';
import globalErrorHandler from './utils/errorHandler';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/validate', api.validateAndDeployEnabled);
app.get('/api/account/deploy-enabled', api.validateAndDeployEnabled);

app.post('/call/:name', api.callFnByName);

app.post('/api/package/create', api.fetchFiles);
app.post('/api/repository/add', api.fetchFilesFromRepo);

app.post('/api/repository/branchlist', api.fetchBranchList);
app.post('/api/repository/filelist', api.fetchFileList);
app.post('/api/deploy/logs', api.showLogs);

app.post('/api/deploy/create', api.deploy);

app.get('/api/inspect', (req, res) => {
	// res.send(metacall_inspect());
	//dummy for now
	res.send([
		{
			status: 'create',
			prefix: 'josead',
			suffix: 'deploy',
			version: 'v1',
			packages: {},
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
