export interface currentUploadedFile {
	id: string;
	type?: string;
	jsons?: string[];
	runners?: string[];
	path?: string;
}

export const currentFile: currentUploadedFile = {
	id: '',
	type: '',
	jsons: [],
	runners: [],
	path: ''
};

export type namearg = 'id' | 'type' | 'jsons' | 'runners' | 'path';
export type valueArg = string & string[];

export type fetchFilesFromRepoBody = {
	branch: 'string';
	url: 'string';
};
export type fetchBranchListBody = {
	url: 'string';
};
