// Extrahiert "globale" Felder (Titel, Beschreibung, Adresse, Rollen/Ansprechpersonen) aus tenant.json
export function getGlobalFromTenant(tenant = {}) {
  const md = tenant?.metadata ?? {};
  const parties = Array.isArray(md.parties) ? md.parties : [];
  const resp = Array.isArray(md['responsible-parties']) ? md['responsible-parties'] : [];

  const title = md.title ?? '';
  const description = md.description ?? '';

  // einfache Adress-Struktur (du kannst es später verfeinern)
  const address = md.address ?? {
    organization: '',
    street: '',
    postalCode: '',
    city: '',
    country: 'DE',
    website: ''
  };

  // Hilfsfunktion: Party nach Rolle finden
  const byRole = (roleId) => {
    const r = resp.find(rp => rp['role-id'] === roleId);
    const puuid = r?.['party-uuids']?.[0];
    return parties.find(p => p.uuid === puuid) ?? null;
  };

  const owner = byRole('owner') ?? {};
  const dpo   = byRole('dpo') ?? {};
  const iso   = byRole('iso') ?? {};

  const pickContact = (p) => ({
    name: p?.name ?? '',
    email: (p?.['email-addresses'] ?? [])[0] ?? '',
    phone: (p?.telephones ?? [])[0] ?? ''
  });

  return {
    title,
    description,
    address,
    owner: pickContact(owner),
    dpo: pickContact(dpo),
    iso: pickContact(iso),
  };
}

// Schreibt Formwerte deterministisch in tenant.json zurück
export function applyGlobalToTenant(tenant = {}, form = {}) {
  const out = structuredClone(tenant);
  out.metadata = out.metadata ?? {};
  const md = out.metadata;

  md.title = form.title ?? md.title ?? '';
  md.description = form.description ?? md.description ?? '';
  md.address = {
    organization: form.address?.organization ?? md.address?.organization ?? '',
    street:       form.address?.street       ?? md.address?.street ?? '',
    postalCode:   form.address?.postalCode   ?? md.address?.postalCode ?? '',
    city:         form.address?.city         ?? md.address?.city ?? '',
    country:      form.address?.country      ?? md.address?.country ?? 'DE',
    website:      form.address?.website      ?? md.address?.website ?? '',
  };

  md.parties = Array.isArray(md.parties) ? md.parties : [];
  md['responsible-parties'] = Array.isArray(md['responsible-parties']) ? md['responsible-parties'] : [];

  // Hilfswriter: sichert Party zu einer role-id
  function upsertRole(roleId, contact) {
    if (!contact) return;
    // Partei auffinden/erzeugen
    const rpList = md['responsible-parties'];
    const pList  = md.parties;

    let rp = rpList.find(r => r['role-id'] === roleId);
    // existierende Party-UUID holen oder anlegen
    let partyUuid = rp?.['party-uuids']?.[0];
    let party = partyUuid ? pList.find(p => p.uuid === partyUuid) : null;

    if (!party) {
      partyUuid = crypto.randomUUID();
      party = { uuid: partyUuid, type: 'person', name: '' };
      pList.push(party);
    }

    party.name = contact.name ?? party.name ?? '';
    party['email-addresses'] = contact.email ? [contact.email] : [];
    party.telephones = contact.phone ? [contact.phone] : [];

    if (!rp) {
      rp = { 'role-id': roleId, 'party-uuids': [partyUuid] };
      rpList.push(rp);
    } else {
      rp['party-uuids'] = [partyUuid];
    }
  }

  upsertRole('owner', form.owner);
  upsertRole('dpo',   form.dpo);
  upsertRole('iso',   form.iso);

  return out;
}
