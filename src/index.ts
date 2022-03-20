import express from 'express';
import { metacall_inspect } from 'metacall';
import {
	callFnByName,
	fetchFiles,
	fetchFilesFromRepo,
	fetchBranchList,
	fetchFileList,
	showLogs,
	deploy
} from './utils';
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/inspect', (req, res) => {
	res.send(metacall_inspect());
});
app.post('/call/:name', callFnByName);

app.post('/api/package/create', fetchFiles);
app.post('/api/repository/add', fetchFilesFromRepo);

app.post('/api/repository/branchlist', fetchBranchList);
app.post('/api/repository/filelist', fetchFileList);
app.post('/api/deploy/logs', showLogs);
//TODO load script and install their packages
app.post('/api/deploy/create', deploy);

//TODO serve fn via api

app.listen(9000, () => {
	console.log('Server listening...');
});
