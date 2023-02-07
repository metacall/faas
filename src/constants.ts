import { MetaCallJSON } from '@metacall/protocol/deployment';

export interface currentUploadedFile {
	id: string;
	type?: string;
	jsons: MetaCallJSON[];
	runners?: string[];
	path: string;
}

export const currentFile: currentUploadedFile = {
	id: '',
	type: '',
	jsons: [],
	runners: [],
	path: ''
};

export type namearg = 'id' | 'type' | 'jsons' | 'runners' | 'path';
export type valueArg = string;

export type fetchFilesFromRepoBody = {
	branch: 'string';
	url: 'string';
};
export type fetchBranchListBody = {
	url: 'string';
};

export type deployBody = {
	suffix: string; //name of deployment
	resourceType: 'Package' | 'Repository';
	release: string; //release date
	env: string[];
	plan: string;
	version: string;
};
