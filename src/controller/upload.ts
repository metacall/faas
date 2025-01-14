import * as fs from 'fs';
import os from 'os';
import path from 'path';

import busboy from 'busboy';
import { NextFunction, Request, Response } from 'express';
import { Extract } from 'unzipper';

import { MetaCallJSON } from '@metacall/protocol/deployment';
import { Application, Applications, Resource } from '../app';
import AppError from '../utils/appError';
import { appsDirectory } from '../utils/config';
import { ensureFolderExists } from '../utils/filesystem';

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
	const resource: Resource = {
		id: '',
		type: '',
		path: '',
		jsons: []
	};

	let fileResolve: (value?: unknown | PromiseLike<unknown>) => void;
	const filePromise = new Promise<unknown>(resolve => {
		fileResolve = resolve;
	});

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
				mimeType !== 'application/x-zip-compressed' &&
				mimeType !== 'application/zip'
			) {
				return errorHandler(
					new AppError('Please upload a zip file', 404)
				);
			}

			const appLocation = path.join(appsDirectory, resource.id);
			resource.path = appLocation;

			// Create temporary directory for the blob
			fs.mkdtemp(
				path.join(os.tmpdir(), `metacall-faas-${resource.id}-`),
				(err, folder) => {
					if (err !== null) {
						return errorHandler(
							new AppError(
								'Failed to create temporary directory for the blob',
								500
							)
						);
					}

					resource.blob = path.join(folder, filename);

					// Create the app folder
					ensureFolderExists(appLocation)
						.then(() => {
							// Create the write stream for storing the blob
							file.pipe(
								fs.createWriteStream(resource.blob as string)
							).on('finish', () => {
								fileResolve();
							});
						})
						.catch((error: Error) => {
							errorHandler(
								new AppError(
									`Failed to create folder for the resource at: ${appLocation} - ${error.toString()}`,
									404
								)
							);
						});
				}
			);
		}
	);

	eventHandler('field', (name: keyof Resource, val: string) => {
		if (name === 'runners') {
			resource.runners = JSON.parse(val) as string[];
		} else if (name === 'jsons') {
			resource.jsons = JSON.parse(val) as MetaCallJSON[];
		} else {
			resource[name] = val;
		}
	});

	eventHandler('finish', () => {
		if (resource.blob === undefined) {
			throw new Error('Invalid file upload, blob path is not defined');
		}

		const deleteBlob = () => {
			if (resource.blob !== undefined) {
				fs.unlink(resource.blob, error => {
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

		const deleteFolder = () => {
			if (resource.path !== undefined) {
				fs.unlink(resource.path, error => {
					if (error !== null) {
						errorHandler(
							new AppError(
								`Failed to delete the path at: ${error.toString()}`,
								500
							)
						);
					}
				});
			}
		};

		if (Applications[resource.id]) {
			deleteBlob();
			return errorHandler(
				new AppError(
					`There is an application with name '${resource.id}' already deployed, delete it first.`,
					400
				)
			);
		}

		let resourceResolve: (value: Resource | PromiseLike<Resource>) => void;
		let resourceReject: (reason?: unknown) => void;

		Applications[resource.id] = new Application();
		Applications[resource.id].resource = new Promise<Resource>(
			(resolve, reject) => {
				resourceResolve = resolve;
				resourceReject = reject;
			}
		);

		const unzipAndResolve = () => {
			return new Promise<void>((resolve, reject) => {
				fs.createReadStream(resource.blob as string)
					.pipe(Extract({ path: resource.path }))
					.on('close', () => {
						deleteBlob();
						resolve();
					})
					.on('error', error => {
						deleteBlob();
						deleteFolder();
						reject(
							new AppError(
								`Failed to unzip the resource at: ${error.toString()}`,
								500
							)
						);
					});
			});
		};

		void filePromise.then(() => {
			unzipAndResolve()
				.then(() => {
					resourceResolve(resource);
					res.status(201).json({
						id: resource.id
					});
				})
				.catch(error => {
					resourceReject(error);
					errorHandler(error);
				});
		});
	});

	eventHandler('close', () => {
		// Do nothing
	});

	req.pipe(bb);
};
