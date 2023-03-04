/* eslint-disable */

import { findFilesPath, findMetaCallJsons } from '@metacall/protocol/package';
import {
	metacall_inspect,
	metacall_load_from_configuration_export
} from 'metacall';
import { hostname } from 'os';
import { allApplications, App, currentFile } from '../constants';
import { createMetacallJsonFile, diff, getLangId } from '../utils/utils';

export const handleNoJSONFile = (
	jsonPaths: string[],
	suffix: string,
	version: string
): void => {
	let currentApp: App | undefined = new App(
		'create',
		hostname(),
		suffix,
		version,
		{}
	);

	// TODO:
	// type Modules = { module_ptr, funcs }[];
	// const modules =  jsonPaths.map(path => metacall_load_from_configuration_export(path));

	const funcs = {};

	jsonPaths.forEach(path => {
		const previousInspect = metacall_inspect();
		Object.assign(funcs, metacall_load_from_configuration_export(path));
		const newInspect = metacall_inspect();
		const inspect = diff(newInspect, previousInspect);
		const langId = getLangId(path);
		if (currentApp) currentApp.packages[langId] = inspect[langId];
	});

	currentApp.status = 'ready';
	allApplications[currentApp.suffix] = { ...currentApp, funcs };
	currentApp = undefined;
};

export const handleJSONFiles = async (
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
