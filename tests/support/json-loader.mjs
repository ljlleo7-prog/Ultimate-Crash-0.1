import { readFile } from 'node:fs/promises';

export async function load(url, context, nextLoad) {
  if (!url.endsWith('.json')) {
    return nextLoad(url, context);
  }

  const json = await readFile(new URL(url), 'utf8');
  JSON.parse(json);

  return {
    format: 'module',
    shortCircuit: true,
    source: `export default ${json}`
  };
}
