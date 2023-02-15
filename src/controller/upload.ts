import * as fs from 'fs';
import * as path from 'path';

import busboy from 'busboy';
import { NextFunction, Request, Response } from 'express';
import PQueue from 'p-queue-es5';
import { Extract } from 'unzipper';

import { currentFile, namearg } from '../constants';

import { MetaCallJSON } from '@metacall/protocol/deployment';
import AppError from '../utils/appError';
import { appsDirectory } from '../utils/config';

const appsDir = appsDirectory();

const getUploadError = (on: keyof busboy.BusboyEvents): AppError => {
	let appErr: AppError = new AppError(
		'Internal Server Error, Please upload the zip again',
		500
	);

	if (on === 'file')
		appErr = new AppError(
			'Error while fetching the zip file, please upload it again',
			500
		);

	if (on === 'field')
		appErr = new AppError(
			'You might be sending improperly formed multipart form data fields or jsons.',
			400
		);

	if (on === 'finish')
		appErr = new AppError(
			'Internal Server Error, Please upload your zip file again',
			500
		);

	return appErr;
};

export default (req: Request, res: Response, next: NextFunction): void => {
	const bb = busboy({ headers: req.headers });
	const queue = new PQueue({ concurrency: 1 });

	const handleError = (fn: () => void, on: keyof busboy.BusboyEvents) => {
		queue
			.add(() => {
				try {
					fn();
				} catch (e) {
					req.unpipe(bb);
					queue.pause();
					next(getUploadError(on));
				}
			})
			.catch(err => {
				req.unpipe(bb);
				queue.pause();
				next(err);
			});
	};

	bb.on('file', (name, file, info) => {
		const { mimeType, filename } = info;
		if (
			mimeType != 'application/x-zip-compressed' &&
			mimeType != 'application/zip'
		)
			return next(new AppError('Please upload a zip file', 404));

		handleError(() => {
			const saveTo = path.join(__dirname, filename);
			currentFile.path = saveTo;
			file.pipe(fs.createWriteStream(saveTo));
		}, 'file');
	});

	bb.on('field', (name: namearg, val: string) => {
		handleError(() => {
			if (name === 'runners') {
				currentFile['runners'] = JSON.parse(val) as string[];
			} else if (name === 'jsons') {
				currentFile['jsons'] = JSON.parse(val) as MetaCallJSON[];
			} else {
				currentFile[name] = val;
			}
		}, 'field');
	});

	bb.on('finish', () => {
		handleError(() => {
			const appLocation = path.join(appsDir, `${currentFile.id}`);

			fs.createReadStream(currentFile.path).pipe(
				Extract({ path: appLocation })
			);

			fs.unlinkSync(currentFile.path);

			currentFile.path = appLocation;
		}, 'finish');
	});

	bb.on('close', () => {
		handleError(() => {
			res.status(201).json({
				id: currentFile.id
			});
		}, 'close');
	});

	req.pipe(bb);
};
