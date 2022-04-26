import express from 'express';
import {
	callFnByName,
	deploy,
	fetchBranchList,
	fetchFileList,
	fetchFiles,
	fetchFilesFromRepo,
	showLogs
} from './utils';
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/call/:name', callFnByName);

app.post('/api/package/create', fetchFiles);
app.post('/api/repository/add', fetchFilesFromRepo);

app.post('/api/repository/branchlist', fetchBranchList);
app.post('/api/repository/filelist', fetchFileList);
app.post('/api/deploy/logs', showLogs);
//TODO load script and install their packages
app.post('/api/deploy/create', deploy);
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

//TODO serve fn via api

app.listen(9000, () => {
	console.log('Server listening...');
});
