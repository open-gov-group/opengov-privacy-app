import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);

import { api } from '@/lib/api';
const pong = await api('/api/healthz'); // GET

await exec('node', ['tools/run-mapper.mjs',
  'oscal/ssp/ssp_template_ropa_full.json',
  'mappings/xdomea_to_ropa.yaml',
  'fixtures/xdomea_example.json',
  'build/ssp_mapped.json'
]);

const out = JSON.parse(await fs.readFile('build/ssp_mapped.json','utf-8'));
if (!out['system-security-plan']?.['system-characteristics']?.props?.some(p => p.name==='ropa:purpose')) {
  console.error('FAIL: ropa:purpose missing');
  process.exit(1);
}
console.log('OK');
