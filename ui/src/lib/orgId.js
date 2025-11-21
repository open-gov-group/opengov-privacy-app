// ui/src/lib/orgId.js

/** Normalize tokens: strip accents, non-alnum -> "-", trim dashes, uppercase */
export function norm(token = '') {
  return String(token)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

/** Build an orgId from parts (any part may be undefined; empty parts are skipped) */
export function buildOrgId({ euCode = 'EU', stateCode, countyCode, townId, townName }) {
  const parts = [
    norm(euCode || 'EU'),
    norm(stateCode || ''),
    norm(countyCode || 'X'),
    norm(townId || 'X'),
    norm(townName || '')
  ];
  return parts.filter(Boolean).join('-');
}

// ---------- module-scoped state + localStorage bridge ----------
let _orgId = (() => {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('orgId') : null;
    return v || null;
  } catch {
    return null;
  }
})();

function saveToStorage(val) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (val) localStorage.setItem('orgId', val);
      else localStorage.removeItem('orgId');
    }
  } catch {
    /* ignore storage issues */
  }
}

// ---------- Validator / Parser ----------

/**
 * Validate orgId according to the convention:
 * EU-<STATE>-<COUNTY>-<TOWNID>-<TOWNNAME>
 * - EU literal 'EU'
 * - STATE: 2–3 letters (e.g., DE, NRW, BY)
 * - COUNTY: 1–12 alnum
 * - TOWNID: 3–10 digits
 * - TOWNNAME: 2–64 of A–Z, 0–9 and dashes
 */
export function validateOrgId(input) {
  const normalized = norm(input || '');
  const parts = normalized.split('-');
  const errors = [];

  if (parts.length < 5) errors.push('expected 5 parts: EU-STATE-COUNTY-TOWNID-TOWNNAME');

  const [eu, state, county, townId, ...townRest] = parts;
  const townName = (townRest || []).join('-'); // allow dashes inside name

  if (eu !== 'EU') errors.push('prefix must be "EU"');
  if (!/^[A-Z]{2,3}$/.test(state || '')) errors.push('STATE must be 2–3 letters');
  if (!/^[A-Z0-9]{1,12}$/.test(county || '')) errors.push('COUNTY must be 1–12 alnum');
  if (!/^[0-9]{3,10}$/.test(townId || '')) errors.push('TOWNID must be 3–10 digits');
  if (!/^[A-Z0-9-]{2,64}$/.test(townName || '')) errors.push('TOWNNAME must be 2–64 of A–Z,0–9,-');

  return {
    ok: errors.length === 0,
    errors,
    normalized,
    parts: { eu, state, county, townId, townName }
  };
}

export function isValidOrgId(input) {
  return validateOrgId(input).ok;
}

export function parseOrgId(input) {
  const { parts } = validateOrgId(input);
  return parts;
}

// ---------- Getter / Setter / Clear ----------

/** Set and persist orgId (normalizes and validates). Returns {ok, orgId, errors}. */
export function setOrgId(value) {
  const check = validateOrgId(value);
  if (!check.ok) {
    return { ok: false, orgId: null, errors: check.errors };
  }
  _orgId = check.normalized;
  saveToStorage(_orgId);
  return { ok: true, orgId: _orgId, errors: [] };
}

/** Get current orgId (or null). */
export function getOrgId() {
  return _orgId ?? null;
}

/** Clear current orgId. */
export function clearOrgId() {
  _orgId = null;
  saveToStorage(null);
}
