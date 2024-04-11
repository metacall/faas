import { callFunction } from './controller/call';
import { deployDelete } from './controller/delete';
import { deploy } from './controller/deploy';
import { globalError } from './controller/error';
import { logs } from './controller/logs';
import {
	fetchBranchList,
	fetchFileList,
	fetchFilesFromRepo
} from './controller/repository';
import { serveStatic } from './controller/static';
import { uploadPackage } from './controller/upload';
import { validate } from './controller/validate';

export default {
	callFunction,
	deployDelete,
	deploy,
	globalError,
	logs,
	fetchFilesFromRepo,
	fetchBranchList,
	fetchFileList,
	serveStatic,
	uploadPackage,
	validate
};
