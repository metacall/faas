import { join } from 'path';
import { configDir } from './utils';

export const defaultPath = configDir(join('metacall', 'faas'));

export const appsDirectory = (path = defaultPath): string => join(path, 'apps');
