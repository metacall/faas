import { Request, Response } from 'express';
import { metacall } from 'metacall';
import os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import busboy, { Busboy } from 'busboy';
import { currentFile, namearg, valueArg } from './constants';
import clone from 'git-clone/promise';
import crypto from 'crypto';

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
	bb.on('file', (name, file) => {
		const saveTo = path.join(os.tmpdir(), 'metacall', `${name}`);
		console.log(saveTo);
		file.pipe(fs.createWriteStream(saveTo));
	});

	bb.on('field', (name: namearg, val: valueArg) => {
		currentFile[name] = val;
	});
	bb.on('close', () => {
		currentFile.path = path.join(
			os.tmpdir(),
			'metacall',
			`${currentFile.id as string}`
		);
		res.end();
	});
	return req.pipe(bb);
};

export const fetchFilesFromRepo = async (
	req: Omit<Request, 'body'> & { body: 'branch' & 'url' },
	res: Response
): Promise<Response> => {
	const { branch, url } = req.body;
	const filename = `${crypto.randomBytes(4).toString('hex')}.zip`;

	await clone(url, path.join(os.tmpdir(), 'metacall', filename), {
		checkout: branch
	});

	return res.json({ id: filename });
};
