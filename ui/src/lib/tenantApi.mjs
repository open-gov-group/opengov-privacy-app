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
  const r = await fetch(url, {
    ...init,
    headers: { 'content-type':'application/json', ...(init?.headers||{}) }
  });
  if (!r.ok) {
    let detail = '';
    try { detail = JSON.stringify(await r.json()); } catch {}
    throw new Error(`${r.status} ${r.statusText}${detail ? ` - ${detail}` : ''}`);
  }
  return r.json();
}

// GET /api/tenants/:orgId  → returns tenant.json (or 404)
export async function getTenant(orgId) {
  return fetchJson(`${BASE}/api/tenants/${encodeURIComponent(orgId)}`, { method: 'GET' });
}

// POST /api/tenants/:orgId/init  → creates minimal tenant + PR, returns links
export async function initTenant(form) {
  const orgId = buildOrgId(form);
  const res = await fetchJson(`${BASE}/api/tenants/${encodeURIComponent(orgId)}/init`, {
    method: 'POST',
    body: JSON.stringify(form)
  });
  return {
    ok: !!res.ok,
    orgId,
    branch: res.created?.branch ?? null,
    prUrl: res.created?.prUrl ?? null,
    sspUrl: res.next?.sspBundleHref ?? null,
    raw: res
  };
}

// PUT /api/tenants/:orgId  → update tenant.json (body = full tenant object)
export async function updateTenant(orgId, tenantObj) {
  return fetchJson(`${BASE}/api/tenants/${encodeURIComponent(orgId)}`, {
    method: 'PUT',
    body: JSON.stringify(tenantObj)
  });
}

// “Load or create”
export async function ensureTenant(form) {
  const orgId = buildOrgId(form);
  try {
    const existing = await getTenant(orgId);
    return { ok:true, orgId, exists:true, tenant: existing };
  } catch {
    const created = await initTenant(form);
    if (!created.ok) throw new Error('Init failed');
    // nach init direkt den frisch erzeugten tenant lesen (falls Gateway das unterstützt/ready ist)
    try {
      const t = await getTenant(created.orgId);
      return { ok:true, orgId: created.orgId, exists:false, tenant: t, prUrl: created.prUrl, sspUrl: created.sspUrl };
    } catch {
      return { ok:true, orgId: created.orgId, exists:false, tenant: null, prUrl: created.prUrl, sspUrl: created.sspUrl };
    }
  }
}

export async function saveDraft(orgId, tenantObj, { ref } = {}) {
  const qs = ref ? `?${new URLSearchParams({ ref }).toString()}` : '';
  return fetchJson(`${BASE}/api/tenants/${encodeURIComponent(orgId)}/save${qs}`, {
    method: 'PUT',
    body: JSON.stringify(tenantObj)
  });
}

// Merge (head → base)
export async function mergeBranch(orgId, { head, base='main' }) {
  return fetchJson(`${BASE}/api/tenants/${encodeURIComponent(orgId)}/merge`, {
    method: 'POST',
    body: JSON.stringify({ head, base })
  });
}
