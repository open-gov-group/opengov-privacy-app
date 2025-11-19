// typeScript Variante
export function norm(token: string = ''): string {
  return String(token)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

export function buildOrgId(input: {
  euCode?: string;
  stateCode: string;
  countyCode?: string;
  townId?: string;
  townName: string;
}): string {
  const parts = [
    norm(input.euCode ?? 'EU'),
    norm(input.stateCode ?? ''),
    norm(input.countyCode ?? 'X'),
    norm(input.townId ?? 'X'),
    norm(input.townName ?? '')
  ];
  return parts.filter(Boolean).join('-');
}
