import * as fs from 'fs';
import * as path from 'path';

import busboy from 'busboy';
import { NextFunction, Request, Response } from 'express';
import { Extract } from 'unzipper';

import { CurrentUploadedFile, namearg } from '../constants';

import { MetaCallJSON } from '@metacall/protocol/deployment';
import AppError from '../utils/appError';
import { appsDirectory } from '../utils/config';

const appsDir = appsDirectory();

const getUploadError = (on: keyof busboy.BusboyEvents): AppError => {
	const errorUploadMessage: Record<string, string> = {
		file: 'Error while fetching the zip file, please upload it again',
		field: 'You might be sending improperly formed multipart form data fields or jsons',
		finish: 'Internal Server Error, Please upload your zip file again'
	};

	const message =
		errorUploadMessage[on.toString()] ||
		'Internal Server Error, Please upload the zip again';

	return new AppError(message, 500);
};

export default (req: Request, res: Response, next: NextFunction): void => {
	const bb = busboy({ headers: req.headers });
	const currentFile: CurrentUploadedFile = {
		id: '',
		type: '',
		path: '',
		jsons: []
	};

	const handleError = (fn: () => void, on: keyof busboy.BusboyEvents) => {
		try {
			fn();
		} catch (e) {
			console.error(e);
			req.unpipe(bb);
			next(getUploadError(on));
		}
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
			const appLocation = path.join(appsDir, currentFile.id);

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
