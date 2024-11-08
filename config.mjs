import { readFile, writeFile } from 'node:fs/promises';

export function read(path) {
  return readFile(path, 'utf-8')
    .catch((e) => '{}\n')
    .then((data) => JSON.parse(data));
}

export function write(path, config) {
  if (!config) {
    throw new Error('No config provided');
  }
  return writeFile(path, JSON.stringify(config, null, 2), 'utf-8');
}
