/* eslint-disable */

import { Deployment, LanguageId, MetaCallJSON } from '@metacall/protocol';
import { findFilesPath, findMetaCallJsons } from '@metacall/protocol/package';
import { promises as fs } from 'fs';
import {
	metacall_inspect,
	metacall_load_from_configuration_export
} from 'metacall';
import { hostname } from 'os';
import { join } from 'path';
import { Resource } from '../app';
import {
	WorkerMessage,
	WorkerMessageType,
	WorkerMessageUnknown
} from './protocol';

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

const loadDeployment = (
	resource: Resource,
	jsonPaths: string[]
): Deployment => {
	const deployment: Deployment = {
		status: 'create',
		prefix: hostname(),
		suffix: resource.id,
		version: 'v1',
		packages: {} as Deployment['packages'],
		ports: []
	};

	for (const path of jsonPaths) {
		// Load the json into metacall
		const fullPath = join(resource.path, path);
		const exports = metacall_load_from_configuration_export(fullPath);

		// Get the inspect information
		const inspect = metacall_inspect();
		const json = require(fullPath);

		if (!json.language_id) {
			throw new Error(`language_id not found in ${path}`);
		}

		deployment.packages[json.language_id as LanguageId] =
			inspect[json.language_id];

		// Store the functions
		Object.keys(exports).forEach(func => {
			functions[func] = exports[func];
		});
	}

	return deployment;
};

const handleDeployment = async (resource: Resource): Promise<Deployment> => {
	// Check if the deploy comes with extra JSONs and store them
	if (resource.jsons.length > 0) {
		const jsonPaths = await createMetacallJsonFiles(
			resource.path,
			resource.jsons
		);
	}

	// List all files except by the ignored ones
	const filesPaths = await findFilesPath(resource.path);

	// Get the JSONs from the list of files
	const jsonPaths = findMetaCallJsons(filesPaths);

	// Deploy the JSONs
	return loadDeployment(resource, jsonPaths);
};

process.on('message', (payload: WorkerMessageUnknown) => {
	switch (payload.type) {
		// Handle deploy load
		case WorkerMessageType.Load: {
			const resource = (payload as WorkerMessage<Resource>).data;
			handleDeployment(resource)
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
					id: string;
					name: string;
					args: unknown[];
				}>
			).data;
			if (process.send) {
				process.send({
					type: WorkerMessageType.InvokeResult,
					data: {
						id: fn.id,
						result: functions[fn.name](...fn.args)
					}
				});
			}
			break;
		}

		default:
			break;
	}
});
