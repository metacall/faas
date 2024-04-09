/* eslint-disable */

import { findFilesPath, findMetaCallJsons } from '@metacall/protocol/package';
import {
	metacall_inspect,
	metacall_load_from_configuration_export
} from 'metacall';
import { hostname } from 'os';
import {
	App,
	CurrentUploadedFile,
	IAppWithFunctions,
	ProtocolMessageType,
	WorkerMessage,
	WorkerMessageUnknown
} from '../constants';

import { createMetacallJsonFile, diff } from '../utils/utils';

// TODO: This is a very bad design error, we must refactor this
let currentFile: CurrentUploadedFile = {
	id: '',
	type: '',
	jsons: [],
	runners: [],
	path: ''
};

let allApplications: Record<string, IAppWithFunctions> = {};
let exactFnx: Record<string, (...args: any[]) => any>;

const handleNoJSONFile = (
	jsonPaths: string[],
	suffix: string,
	version: string
): void => {
	let currentApp: App | undefined = new App(
		'create',
		hostname(),
		suffix,
		version,
		{},
		[]
	);

	let funcs: string[] = [];

	jsonPaths.forEach(path => {
		const previousInspect = metacall_inspect();
		exactFnx = metacall_load_from_configuration_export(path);
		funcs = Object.keys(exactFnx);

		const newInspect = metacall_inspect();
		const inspect = diff(newInspect, previousInspect);
		const langId = require(path).language_id;

		if (!langId) {
			throw new Error(`language_id not found in ${path}`);
		}

		if (currentApp) {
			currentApp.packages[langId] = inspect[langId];
		}
	});

	currentApp.status = 'ready';
	allApplications[currentApp.suffix] = { ...currentApp, funcs };

	if (process.send) {
		process.send({
			type: ProtocolMessageType.MetaData,
			data: allApplications
		});
	}

	currentApp = undefined;
};

const handleJSONFiles = async (
	path: string,
	suffix: string,
	version: string
): Promise<void> => {
	if (currentFile.jsons.length > 0) {
		const jsonPaths = await createMetacallJsonFile(currentFile.jsons, path);
		handleNoJSONFile(jsonPaths, suffix, version);
	} else {
		const filesPaths = await findFilesPath(path);
		const jsonPaths = findMetaCallJsons(filesPaths).map(
			el => `${path}/${el}`
		);
		handleNoJSONFile(jsonPaths, suffix, version);
	}
};

process.on('message', (payload: WorkerMessageUnknown) => {
	if (payload.type === ProtocolMessageType.Load) {
		currentFile = (payload as WorkerMessage<CurrentUploadedFile>).data;
		handleJSONFiles(currentFile.path, currentFile.id, 'v1');
	} else if (payload.type === ProtocolMessageType.Invoke) {
		const fn = (
			payload as WorkerMessage<{
				name: string;
				args: unknown[];
			}>
		).data;
		if (process.send) {
			process.send({
				type: ProtocolMessageType.InvokeResult,
				data: exactFnx[fn.name](...fn.args)
			});
		}
	}
});
