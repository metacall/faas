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

export const packageUpload = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const bb = busboy({ headers: req.headers });
	const resource: Resource = {
		id: '',
		type: '',
		path: '',
		jsons: [],
		runners: []
	};

	let requestSettled = false;
	let fileResolve!: (value?: unknown | PromiseLike<unknown>) => void;
	let fileReject!: (reason?: unknown) => void;
	const filePromise = new Promise<unknown>((resolve, reject) => {
		fileResolve = resolve;
		fileReject = reject;
	});
	// Keep rejected upload promise from becoming an unhandled rejection
	// when multipart parsing fails before the finish handler wires the chain.
	void filePromise.catch((_error: unknown) => undefined);

	const errorHandler = (error: AppError) => {
		if (requestSettled) {
			return;
		}
		requestSettled = true;
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

			// Attach an error listener immediately so that if busboy emits an
			// error on the FileStream (e.g. "Unexpected end of form") before the
			// async mkdtemp callback fires and wires its own listener, the error
			// is handled gracefully instead of crashing the Node.js process.
			file.on('error', error => {
				fileReject(error);
				errorHandler(getUploadError('file', error));
			});

			if (
				mimeType !== 'application/x-zip-compressed' &&
				mimeType !== 'application/zip'
			) {
				file.resume();
				return errorHandler(
					new AppError('Please upload a zip file', 400)
				);
			}

			// Create temporary directory for the blob
			fs.mkdtemp(
				path.join(os.tmpdir(), `metacall-faas-upload-`),
				(err, folder) => {
					if (err !== null) {
						file.resume();
						return errorHandler(
							new AppError(
								'Failed to create temporary directory for the blob',
								500
							)
						);
					}

					resource.blob = path.join(folder, filename);

					const writeStream = fs.createWriteStream(resource.blob);

					file.on('error', error => {
						fileReject(error);
						writeStream.destroy(error);
						errorHandler(getUploadError('file', error));
					});

					writeStream.on('error', error => {
						fileReject(error);
						file.unpipe(writeStream);
						file.resume();
						errorHandler(getUploadError('file', error));
					});

					writeStream.on('finish', () => {
						fileResolve();
					});

					file.pipe(writeStream);
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
		if (requestSettled) {
			return;
		}

		if (resource.blob === undefined) {
			throw new Error('Invalid file upload, blob path is not defined');
		}
		if (resource.id === '') {
			throw new Error('Invalid upload, resource id is not defined');
		}

		resource.path = path.join(appsDirectory, resource.id);

		const deleteBlob = () => {
			if (resource.blob !== undefined) {
				fs.unlink(resource.blob, error => {
					if (error !== null && error.code !== 'ENOENT') {
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
				fs.rm(
					resource.path,
					{ recursive: true, force: true },
					error => {
						if (error !== null) {
							errorHandler(
								new AppError(
									`Failed to delete the path at: ${error.toString()}`,
									500
								)
							);
						}
					}
				);
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
					.on('error', error => {
						deleteBlob();
						deleteFolder();
						reject(
							new AppError(
								`Failed to read the uploaded blob: ${error.toString()}`,
								500
							)
						);
					})
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

		void filePromise
			.then(() => ensureFolderExists(resource.path))
			.then(() => unzipAndResolve())
			.then(() => {
				if (requestSettled) {
					return;
				}
				requestSettled = true;
				resourceResolve(resource);
				res.status(201).json({
					id: resource.id
				});
			})
			.catch(error => {
				resourceReject(error);
				if (error instanceof AppError) {
					errorHandler(error);
				} else {
					errorHandler(
						new AppError(
							`Package upload failed: ${String(error)}`,
							500
						)
					);
				}
			});
	});

	eventHandler('close', () => {
		// Do nothing
	});

	bb.on('error', error => {
		fileReject(error);
		errorHandler(
			new AppError(`Invalid multipart form data: ${String(error)}`, 400)
		);
	});

	req.on('aborted', () => {
		fileReject(new Error('Request was aborted while uploading'));
		errorHandler(
			new AppError(
				'Upload aborted before completing multipart payload',
				400
			)
		);
	});

	req.on('error', error => {
		fileReject(error);
		errorHandler(
			new AppError(
				`Request stream failed while uploading package: ${error.message}`,
				500
			)
		);
	});

	try {
		req.pipe(bb);
	} catch (error) {
		fileReject(error);
		errorHandler(
			new AppError(
				`Failed to initialize multipart parser: ${String(error)}`,
				500
			)
		);
	}
};
