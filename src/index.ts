import express from 'express';
import { metacall_inspect, metacall } from 'metacall';

const app = express();

app.use(express.json());

app.get('/inspect', (req, res) => {
	res.send(metacall_inspect());
});

app.post('/call/:name', (req, res) => {
	if (!(req.params && req.params.name)) {
		return res
			.status(400)
			.send('A function name is required in the path; i.e: /call/sum.');
	}

	if (!Array.isArray(req.body)) {
		return res
			.status(401)
			.send(
				'Invalid function parameters, the request body must be an array; i.e [3, 5].'
			);
	}

	// TODO:
	/*
	if (!(req.params && req.params.name && metacall_function(req.params.name)) {
		return res.status(404).send(`Function ${req.params.name} not found.`);
	}
	*/

	res.send(JSON.stringify(metacall(req.params.name, ...req.body)));
});

app.listen(9000, () => {
	console.log('Server listening...');
});
