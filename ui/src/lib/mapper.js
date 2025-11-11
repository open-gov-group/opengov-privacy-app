import YAML from "js-yaml";

const get = (obj, path) => path?.split('.').reduce((a,k)=> (a && a[k] !== undefined ? a[k] : undefined), obj);
const ensureArray = (obj, path) => {
  const parts = path.split('.');
  let cur = obj;
  for (let i=0;i<parts.length;i++) {
    const k = parts[i], last = i === parts.length - 1;
    if (last) { cur[k] ||= []; return cur[k]; }
    cur[k] ||= {}; cur = cur[k];
  }
};
const applyNormalize = (val, steps=[]) => steps.reduce((out, s) => {
  if (s === 'trim') return (out ?? '').toString().trim();
  if (s?.map) return s.map[out] ?? out;
  if (s?.lowercase) return (out ?? '').toString().toLowerCase();
  return out;
}, val);

export function runMapper(ssp, rulesYaml, sources) {
  const spec = YAML.load(rulesYaml);
  const rules = spec?.rules || [];
  const next = structuredClone(ssp);
  for (const r of rules) {
    const raw = r?.value?.value;
    let val = raw;
    if (typeof raw === "string" && raw.startsWith("$")) {
      const [root, ...path] = raw.slice(1).split(".");
      val = get(sources[root], path.join("."));
    }
    if (val === undefined || val === null || val === "") {
      if (r.fallback?.value === undefined) continue;
      val = r.fallback.value;
    }
    val = applyNormalize(val, r.normalize);
    if (r.op === "push") {
      const arr = ensureArray(next, r.target);
      arr.push({ ...(r.value || {}), value: val });
    } else if (r.op === "set") {
      const arr = ensureArray(next, r.target);
      const idx = arr.findIndex(p => p.name === r.value?.name);
      const obj = { ...(r.value || {}), value: val };
      if (idx >= 0) arr[idx] = obj; else arr.push(obj);
    }
  }
  return next;
}
