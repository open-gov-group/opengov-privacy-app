#!/usr/bin/env node
import fs from 'node:fs/promises';
import yaml from 'js-yaml';

if (process.argv.length < 6) {
  console.error('usage: node tools/run-mapper.mjs <ssp-in.json> <rules.yaml> <xdomea.json> <out.json>');
  process.exit(1);
}
const [ , , sspPath, rulesPath, srcPath, outPath ] = process.argv;

const ssp = JSON.parse(await fs.readFile(sspPath, 'utf-8'));
const rules = yaml.load(await fs.readFile(rulesPath, 'utf-8'));
const src = JSON.parse(await fs.readFile(srcPath, 'utf-8'));

const get = (obj, path) => path.split('.').reduce((a,k)=> (a && a[k] !== undefined ? a[k] : undefined), obj);
const norm = (v, n) => {
  if (!n) return v;
  let out = v;
  for (const step of n) {
    if (step === 'trim') out = (out ?? '').toString().trim();
    else if (step?.map) out = step.map[out] ?? out;
    else if (typeof step === 'object' && step.mask) out = out?.replaceAll(step.mask.from, step.mask.to);
  }
  return out;
};

const ensureArray = (obj, path) => {
  const parts = path.split('.');
  let cur = obj;
  for (let i=0;i<parts.length;i++) {
    const k = parts[i];
    const last = i === parts.length - 1;
    if (last) {
      cur[k] ||= [];
      return cur[k];
    }
    cur[k] ||= {};
    cur = cur[k];
  }
};

for (const r of (rules.rules || [])) {
  const rawVal = r.value?.value?.startsWith('$') ? get(src, r.value.value.slice(1)) : r.value?.value;
  const v = rawVal ?? r.fallback?.value;
  if (v === undefined) continue;
  if (r.op === 'push') {
    const arr = ensureArray(ssp, r.target);
    arr.push({ ...(r.value || {}), value: norm(v, r.normalize) });
  }
}

await fs.writeFile(outPath, JSON.stringify(ssp, null, 2));
console.log(`Mapped → ${outPath}`);
