const LS_KEY = "opgov:evidence-registry";

export function loadRegistry() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}

export function saveRegistry(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

export function addEvidence({ title, href, mediaType, hashAlg, hashVal }) {
  const reg = loadRegistry();
  const uuid = crypto?.randomUUID?.() || (Math.random().toString(16).slice(2) + Date.now());
  const item = { uuid, title, href, mediaType, hashAlg, hashVal };
  reg.push(item);
  saveRegistry(reg);
  return item;
}

export function attachEvidenceToSSP(ssp, evidenceItem, statementPath = []) {
  const next = structuredClone(ssp);
  const sspRoot = next["system-security-plan"] || next.systemSecurityPlan || next.system_security_plan;

  // ensure back-matter.resources
  next["back-matter"] ||= {};
  next["back-matter"]["resources"] ||= [];
  const exists = next["back-matter"]["resources"].some(r => r.uuid === evidenceItem.uuid);
  if (!exists) {
    next["back-matter"]["resources"].push({
      uuid: evidenceItem.uuid,
      title: evidenceItem.title,
      rlinks: [{
        href: evidenceItem.href,
        "media-type": evidenceItem.mediaType,
        hashes: evidenceItem.hashAlg && evidenceItem.hashVal ? [
          { "algorithm": evidenceItem.hashAlg, "value": evidenceItem.hashVal }
        ] : undefined
      }]
    });
  }

  // optionally attach to a statement via related-resources
  if (statementPath.length) {
    let node = sspRoot?.["control-implementation"]?.["implemented-requirements"] || [];
    for (const key of statementPath) node = node?.[key];
    if (node) {
      node["related-resources"] ||= [];
      node["related-resources"].push({ "resource-uuid": evidenceItem.uuid });
    }
  }
  return next;
}
