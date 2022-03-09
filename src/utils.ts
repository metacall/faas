import busboy, { Busboy } from 'busboy';
import { execSync, spawn } from 'child_process';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { metacall } from 'metacall';
import os from 'os';
import * as path from 'path';
import {
	currentFile,
	fetchBranchListBody,
	fetchFilesFromRepoBody,
	namearg,
	valueArg
} from './constants';

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
			`${currentFile.id}`
		);
		res.end();
	});
	return req.pipe(bb);
};

//untested api
export const fetchFilesFromRepo = (
	req: Omit<Request, 'body'> & { body: fetchFilesFromRepoBody },
	res: Response
): Response => {
	const { branch, url } = req.body;
	spawn(
		`git clone --depth=1 --branch ${branch} ${url} ${path.join(
			os.tmpdir(),
			'metacall'
		)}`
	);

	const id = url.split('/')[url.split('/').length - 1].replace('.git', '');

	currentFile['id'] = id;

	return res.json({ id });
};

export const fetchBranchList = (
	req: Omit<Request, 'body'> & { body: fetchBranchListBody },
	res: Response
): Response => {
	execSync(`git remote add random ${req.body.url} ; git remote update;`);
	const output = execSync(`git branch -r`);
	execSync(`git remote remove random`);

	//clean and prepare output
	const data: string[] = [];
	JSON.stringify(output.toString())
		.split('random/')
		.forEach(msg => {
			if (msg.includes('\\n')) {
				data.push(msg.split('\\n')[0]);
			}
		});

	return res.send({ branches: data });
};

export const fetchFileList = (
	req: Omit<Request, 'body'> & { body: fetchFilesFromRepoBody },
	res: Response
): Response => {
	execSync(`git remote add random ${req.body.url} ; git remote update;`);
	const output = execSync(`git ls-tree -r ${req.body.branch} --name-only`);
	execSync(`git remote remove random`);

	//clean and prepare output
	return res.send({ files: JSON.stringify(output.toString()).split('\\n') });
};
