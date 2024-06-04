/* eslint-disable */

import { MetaCallJSON } from '@metacall/protocol';
import { findFilesPath, findMetaCallJsons } from '@metacall/protocol/package';
import { promises as fs } from 'fs';
import {
	metacall_inspect,
	metacall_load_from_configuration_export
} from 'metacall';
import { hostname } from 'os';
import { join } from 'path';
import { App, Deployment } from '../constants';
import {
	WorkerMessage,
	WorkerMessageType,
	WorkerMessageUnknown
} from '../worker/master';

const functions: Record<string, (...args: any[]) => any> = {};

const createMetacallJsonFiles = async (
	path: string,
	jsons: MetaCallJSON[]
): Promise<void> => {
	for (const el of jsons) {
		const filePath = join(path, `metacall-${el.language_id}.json`);
		await fs.writeFile(filePath, JSON.stringify(el));
	}
};

const loadDeployment = (deployment: Deployment, jsonPaths: string[]): App => {
	const app = new App('create', hostname(), deployment.id, 'v1', {}, []);

	for (const path of jsonPaths) {
		// Load the json into metacall
		const fullPath = join(deployment.path, path);
		const exports = metacall_load_from_configuration_export(fullPath);

		// Get the inspect information
		const inspect = metacall_inspect();
		const json = require(fullPath);

		if (!json.language_id) {
			throw new Error(`language_id not found in ${path}`);
		}

		app.packages = inspect[json.language_id][path];

		// Store the functions
		Object.keys(exports).forEach(func => {
			functions[func] = exports[func];
		});
	}

	return app;
};

const handleDeployment = async (deployment: Deployment): Promise<App> => {
	// Check if the deploy comes with extra JSONs and store them
	if (deployment.jsons.length > 0) {
		const jsonPaths = await createMetacallJsonFiles(
			deployment.path,
			deployment.jsons
		);
	}

	// List all files except by the ignored ones
	const filesPaths = await findFilesPath(deployment.path);

	// Get the JSONs from the list of files
	const jsonPaths = findMetaCallJsons(filesPaths);

	// Deploy the JSONs
	return loadDeployment(deployment, jsonPaths);
};

process.on('message', (payload: WorkerMessageUnknown) => {
	switch (payload.type) {
		// Handle deploy load
		case WorkerMessageType.Load: {
			const deployment = (payload as WorkerMessage<Deployment>).data;
			handleDeployment(deployment)
				.then(app => {
					if (process.send) {
						process.send({
							type: WorkerMessageType.MetaData,
							data: app
						});
					}
				})
				.catch(() => process.exit(1)); // TODO: Handle this with a message?
			break;
		}

		// Handle invoke function
		case WorkerMessageType.Invoke: {
			const fn = (
				payload as WorkerMessage<{
					name: string;
					args: unknown[];
				}>
			).data;
			if (process.send) {
				process.send({
					type: WorkerMessageType.InvokeResult,
					data: functions[fn.name](...fn.args)
				});
			}
			break;
		}

		default:
			break;
	}
});
