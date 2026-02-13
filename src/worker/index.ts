/* eslint-disable */

import { Deployment, LanguageId, MetaCallJSON } from '@metacall/protocol';
import { findFilesPath, findMetaCallJsons } from '@metacall/protocol/package';
import { promises as fs } from 'fs';
import {
	metacall_execution_path,
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

	const configurations = jsonPaths.map(path => {
		const jsonPath = join(resource.path, path);
		return {
			path: jsonPath,
			json: require(jsonPath) as MetaCallJSON
		};
	});

	const languages = new Set(
		configurations.map(({ json }) => json.language_id)
	);

	// Load resource path for each language
	for (const tag of languages) {
		metacall_execution_path(tag, resource.path);
	}

	for (const { path, json } of configurations) {
		if (!json.language_id) {
			throw new Error(`Field language_id not found in ${path}`);
		}

		// Load execution path for each json
		const executionPath = join(resource.path, json.path);

		metacall_execution_path(json.language_id, executionPath);

		// Load the json into metacall
		const exports = metacall_load_from_configuration_export(path);

		// Get the inspect information
		const inspect = metacall_inspect();

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
	const deployment = loadDeployment(resource, jsonPaths);

	// Mark as ready so CLI and tests see deployment as fully up
	deployment.status = 'ready';

	return deployment;
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
				.catch(err => {
					console.log(err);
					process.exit(1);
				});
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
