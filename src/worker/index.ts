/* eslint-disable */

import { findFilesPath, findMetaCallJsons } from '@metacall/protocol/package';
import {
	metacall_inspect,
	metacall_load_from_configuration_export
} from 'metacall';
import { hostname } from 'os';
import {
	App,
	IAppWithFunctions,
	currentUploadedFile,
	protocol
} from '../constants';

import { createMetacallJsonFile, diff } from '../utils/utils';

let currentFile: currentUploadedFile = {
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
			type: protocol.g,
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
	let jsonPath: string[] =
		currentFile.jsons.length > 0
			? createMetacallJsonFile(currentFile.jsons, path)
			: findMetaCallJsons(await findFilesPath(path)).map(
					el => `${path}/${el}`
			  );
	// FIXME Currently it do not support metacall.json syntax, else metacall-{runner}.json is fine and will work
	handleNoJSONFile(jsonPath, suffix, version);
};

process.on('message', payload => {
	if (payload.type === protocol.l) {
		currentFile = payload.currentFile;
		handleJSONFiles(currentFile.path, currentFile.id, 'v1');
	} else if (payload.type === protocol.c) {
		if (process.send) {
			process.send({
				type: protocol.r,
				data: exactFnx[payload.fn.name](...payload.fn.args)
			});
		}
	}
});
