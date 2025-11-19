// ui/src/lib/orgId.js
export function norm(token = '') {
  return String(token)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

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
