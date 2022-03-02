import express from 'express';
import { metacall_inspect } from 'metacall';
import { callFnByName, fetchFiles } from './utils';
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/inspect', (req, res) => {
	res.send(metacall_inspect());
});
app.post('/call/:name', callFnByName);

app.post('/api/package/create', fetchFiles);
//TODO fetch from repository
// app.post('/api/repository/add', fetchFilesFromRepo);

//TODO load script and install their packages
//TODO server fn via api

app.listen(9000, () => {
	console.log('Server listening...');
});
