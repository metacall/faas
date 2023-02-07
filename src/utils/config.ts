import { join } from 'path';
import { configDir } from './utils';

export const defaultPath = configDir(join('metacall', 'faas'));

console.log(defaultPath);

export const appsDirectory = (path = defaultPath) => join(path, 'apps');
