import YAML from "js-yaml";

const get = (obj, path) => {
  if (!path) return undefined;
  return path.split('.').reduce((a,k)=> (a && a[k] !== undefined ? a[k] : undefined), obj);
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

const applyNormalize = (val, steps=[]) => {
  let out = val;
  for (const s of steps) {
    if (s === 'trim') out = (out ?? '').toString().trim();
    else if (s?.map) out = s.map[out] ?? out;
    else if (s?.lowercase) out = (out ?? '').toString().toLowerCase();
  }
  return out;
};

export function runMapper(ssp, rulesYaml, sources) {
  const spec = YAML.load(rulesYaml);
  const rules = spec?.rules || [];
  const next = structuredClone(ssp);
  for (const r of rules) {
    // r.value.value may be "$xdomea.Process.Purpose" or literal
    const raw = r?.value?.value;
    let val = raw;
    if (typeof raw === "string" && raw.startsWith("$")) {
      const [root, ...path] = raw.slice(1).split(".");
      const src = sources[root];
      val = get(src, path.join("."));
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
      // assume target is *.props and incoming is an object with name/value
      const idx = arr.findIndex(p => p.name === r.value?.name);
      const obj = { ...(r.value || {}), value: val };
      if (idx >= 0) arr[idx] = obj; else arr.push(obj);
    }
  }
  return next;
}
