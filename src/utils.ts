import { Request, Response } from 'express';
import { metacall } from 'metacall';
import os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import busboy, { Busboy } from 'busboy';

export const callFnByName = (req: Request, res: Response): Response => {
	if (!(req.params && req.params.name)) {
		return res
			.status(400)
			.send('A function name is required in the path; i.e: /call/sum.');
	}

	const args = Object.values(req.body);

	return res.send(JSON.stringify(metacall(req.params.name, ...args)));
};

export const fetchFiles = (req: Request, res: Response): Busboy => {
	const bb = busboy({ headers: req.headers });
	bb.on('file', (name, file, info) => {
		const { filename, encoding, mimeType } = info;
		console.log(
			`File [${name}]: filename: %j, encoding: %j, mimeType: %j`,
			filename,
			encoding,
			mimeType
		);
		const saveTo = path.join(os.tmpdir(), `${filename}`);
		file.pipe(fs.createWriteStream(saveTo));
	});
	bb.on('field', (name, val) => {
		console.log(`Field [${name}]: value: %j`, val);
	});
	bb.on('close', () => {
		res.end();
	});
	return req.pipe(bb);
};
