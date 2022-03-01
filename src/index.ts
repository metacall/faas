import express from 'express';
import { metacall_inspect } from 'metacall';
import { callFnByName, fetchFiles } from './utils';
export const startDevServer = (): void => {
	const app = express();

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	app.get('/inspect', (req, res) => {
		res.send(metacall_inspect());
	});
	app.post('/call/:name', callFnByName);

	app.post('/api/repository/add', fetchFiles);

	app.listen(9000, () => {
		console.log('Server listening...');
	});
};
