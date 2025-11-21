// src/lib/tenantApi.mjs
const BASE = import.meta.env.VITE_GATEWAY_BASE ?? '';

export function buildOrgId({ euCode='EU', stateCode='DE', countyCode='', townId='', townName='' }) {
  const parts = [euCode, stateCode];
  if (countyCode) parts.push(countyCode);
  if (townId) parts.push(townId);
  if (townName) parts.push(townName.toUpperCase().replace(/\s+/g,'-'));
  return parts.join('-');
}

async function fetchJson(url, init) {
  const r = await fetch(url, { ...init, headers: { 'content-type':'application/json', ...(init?.headers||{}) } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

// Tenant lesen (falls bereits angelegt)
export async function getTenant(orgId) {
  return fetchJson(`${BASE}/api/tenants/${encodeURIComponent(orgId)}`, { method: 'GET' });
}

// Tenant anlegen (init) – form -> orgId -> POST /init
export async function initTenant(form) {
  const orgId = buildOrgId(form);
  const res = await fetchJson(`${BASE}/api/tenants/${encodeURIComponent(orgId)}/init`, {
    method: 'POST',
    body: JSON.stringify(form)
  });
  // UI-freundliche Form zurückgeben
  return {
    ok: !!res.ok,
    orgId,
    branch: res.created?.branch ?? null,
    prUrl: res.created?.prUrl ?? null,
    sspUrl: res.next?.sspBundleHref ?? null,
    raw: res
  };
}

// „Laden oder anlegen“ – wenn vorhanden, laden, sonst init
export async function ensureTenant(form) {
  const orgId = buildOrgId(form);
  try {
    const existing = await getTenant(orgId);
    return { ok:true, orgId, exists:true, data: existing };
  } catch {
    const created = await initTenant(form);
    return { ...created, exists:false };
  }
}
