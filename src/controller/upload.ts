import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import busboy from 'busboy';
import { NextFunction, Request, Response } from 'express';
import { Extract, ParseOptions } from 'unzipper';

import { Deployment, deploymentMap } from '../constants';

import { MetaCallJSON } from '@metacall/protocol/deployment';
import AppError from '../utils/appError';
import { appsDirectory } from '../utils/config';
import { ensureFolderExists } from '../utils/utils';

const getUploadError = (
	on: keyof busboy.BusboyEvents,
	error: Error
): AppError => {
	const internalError = () => ({
		message: `Please upload your zip file again, Internal Server Error: ${error.toString()}`,
		code: 500
	});

	const errorUploadMessage: Record<
		string,
		{ message: string; code: number }
	> = {
		file: {
			message:
				'Error while fetching the zip file, please upload it again',
			code: 400
		},
		field: {
			message:
				'You might be sending improperly formed multipart form data fields or jsons',
			code: 400
		},
		finish: internalError()
	};

	const appError = errorUploadMessage[on.toString()] || internalError();

	return new AppError(appError.message, appError.code);
};

export const uploadPackage = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const bb = busboy({ headers: req.headers });
	const deployment: Deployment = {
		id: '',
		type: '',
		path: '',
		jsons: []
	};

	const errorHandler = (error: AppError) => {
		req.unpipe(bb);
		next(error);
	};

	const eventHandler = <T>(type: keyof busboy.BusboyEvents, listener: T) => {
		bb.on(type, (...args: unknown[]) => {
			try {
				const fn = listener as unknown as (...args: unknown[]) => void;
				fn(...args);
			} catch (e) {
				errorHandler(getUploadError(type, e as Error));
			}
		});
	};

	eventHandler(
		'file',
		(
			name: string,
			file: fs.ReadStream,
			info: { encoding: string; filename: string; mimeType: string }
		) => {
			const { mimeType, filename } = info;

			if (
				mimeType != 'application/x-zip-compressed' &&
				mimeType != 'application/zip'
			) {
				return errorHandler(
					new AppError('Please upload a zip file', 404)
				);
			}

			const appLocation = path.join(appsDirectory, deployment.id);
			deployment.path = appLocation;

			// Create temporary directory for the blob
			fs.mkdtemp(
				path.join(os.tmpdir(), `metacall-faas-${deployment.id}-`),
				(err, folder) => {
					if (err !== null) {
						return errorHandler(
							new AppError(
								'Failed to create temporary directory for the blob',
								500
							)
						);
					}

					deployment.blob = path.join(folder, filename);

					// Create the app folder
					ensureFolderExists(appLocation)
						.then(() => {
							// Create the write stream for storing the blob
							file.pipe(
								fs.createWriteStream(deployment.blob as string)
							);
						})
						.catch((error: Error) => {
							errorHandler(
								new AppError(
									`Failed to create folder for the deployment at: ${appLocation} - ${error.toString()}`,
									404
								)
							);
						});
				}
			);
		}
	);

	eventHandler('field', (name: keyof Deployment, val: string) => {
		if (name === 'runners') {
			deployment['runners'] = JSON.parse(val) as string[];
		} else if (name === 'jsons') {
			deployment['jsons'] = JSON.parse(val) as MetaCallJSON[];
		} else {
			deployment[name] = val;
		}
	});

	eventHandler('finish', () => {
		if (deployment.blob === undefined) {
			throw Error('Invalid file upload, blob path is not defined');
		}

		const deleteBlob = () => {
			if (deployment.blob !== undefined) {
				fs.unlink(deployment.blob, error => {
					if (error !== null) {
						errorHandler(
							new AppError(
								`Failed to delete the blob at: ${error.toString()}`,
								500
							)
						);
					}
				});
			}
		};

		const options: ParseOptions = { path: deployment.path };

		fs.createReadStream(deployment.blob)
			.pipe(Extract(options))
			.on('close', () => {
				deleteBlob();
				deploymentMap[deployment.id] = deployment;
			})
			.on('error', error => {
				deleteBlob();
				errorHandler(
					new AppError(
						`Failed to unzip the deployment at: ${error.toString()}`,
						500
					)
				);
			});
	});

	eventHandler('close', () => {
		res.status(201).json({
			id: deployment.id
		});
	});

	req.pipe(bb);
};
