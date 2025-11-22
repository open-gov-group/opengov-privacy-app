// /src/lib/tenantShape.mjs

// Hilfsleser – holt erstes Feld per Pfadkette
function pick(obj, path, dflt = undefined) {
  try {
    return path.split('.').reduce((o, k) => (o && k in o ? o[k] : undefined), obj) ?? dflt;
  } catch { return dflt; }
}

// Party-Helfer (OSCAL)
function findPartyByRole(ssp, roleId) {
  const rp = pick(ssp, 'system-security-plan.metadata.responsible-parties', []);
  const parties = pick(ssp, 'system-security-plan.metadata.parties', []);
  const role = rp.find(r => r['role-id'] === roleId);
  const pUuid = role?.['party-uuids']?.[0];
  return parties.find(p => p.uuid === pUuid);
}

export function getGlobalFromTenant(input) {
  // 1) Direktes Tenant-Objekt?
  if (input && !input['system-security-plan']) {
    const t = input || {};
    return {
      title: t.title ?? '',
      description: t.description ?? '',
      address: {
        organization: t.address?.organization ?? '',
        street:       t.address?.street ?? '',
        postalCode:   t.address?.postalCode ?? '',
        city:         t.address?.city ?? '',
        country:      t.address?.country ?? '',
        website:      t.address?.website ?? ''
      },
      owner: {
        name:  t.owner?.name ?? '',
        email: t.owner?.email ?? '',
        phone: t.owner?.phone ?? ''
      },
      dpo: {
        name:  t.dpo?.name ?? '',
        email: t.dpo?.email ?? '',
        phone: t.dpo?.phone ?? ''
      },
      iso: {
        name:  t.iso?.name ?? '',
        email: t.iso?.email ?? '',
        phone: t.iso?.phone ?? ''
      }
    };
  }

  // 2) OSCAL-SSP
  const ssp = input?.['system-security-plan'] ?? {};
  const md  = ssp.metadata ?? {};
  // Rollen-IDs passend zu deinem Formular
  const owner = findPartyByRole(input, 'owner') || {};
  const dpo   = findPartyByRole(input, 'dpo')   || {};
  const iso   = findPartyByRole(input, 'iso')   || {};

  // Adresse: wir erlauben Props auf der Owner-Party oder einfache Felder in md.props (fallback)
  const addr = {
    organization: owner.name ?? md.title ?? '',
    street:       (owner['addresses']?.[0]?.['addr-lines']?.[0]) ?? '',
    postalCode:   (owner['addresses']?.[0]?.['postal-code']) ?? '',
    city:         (owner['addresses']?.[0]?.city) ?? '',
    country:      (owner['addresses']?.[0]?.country) ?? '',
    website:      (owner['links']?.find(l => (l.rel||'').includes('website'))?.href) ?? ''
  };

  function contactFromParty(p) {
    const email = (p['email-addresses']?.[0]) ?? '';
    const phone = (p['telephone-numbers']?.[0]?.['number']) ?? '';
    return { name: p.name ?? '', email, phone };
  }

  return {
    title: md.title ?? '',
    description: pick(ssp, 'system-characteristics.description', ''),
    address: addr,
    owner: contactFromParty(owner),
    dpo:   contactFromParty(dpo),
    iso:   contactFromParty(iso)
  };
}

export function applyGlobalToTenant(original, form) {
  // 1) Direktes Tenant-Objekt
  if (original && !original['system-security-plan']) {
    const prev = original || {};
    return {
      ...prev,
      title: form.title ?? '',
      description: form.description ?? '',
      address: {
        ...(prev.address || {}),
        organization: form.address?.organization ?? '',
        street:       form.address?.street ?? '',
        postalCode:   form.address?.postalCode ?? '',
        city:         form.address?.city ?? '',
        country:      form.address?.country ?? '',
        website:      form.address?.website ?? ''
      },
      owner: { ...(prev.owner||{}), ...(form.owner||{}) },
      dpo:   { ...(prev.dpo||{}),   ...(form.dpo||{})   },
      iso:   { ...(prev.iso||{}),   ...(form.iso||{})   }
    };
  }

  // 2) OSCAL-SSP – nur „globale“ Felder zurückschreiben
  const ssp = { ...(original?.['system-security-plan'] || {}) };
  const md  = { ...(ssp.metadata || {}) };
  const sc  = { ...(ssp['system-characteristics'] || {}) };

  md.title = form.title ?? md.title ?? '';
  sc.description = form.description ?? sc.description ?? '';

  // owner/dpo/iso in parties/responsible-parties aktualisieren/erzeugen
  const parties = Array.isArray(md.parties) ? [...md.parties] : [];
  const rp      = Array.isArray(md['responsible-parties']) ? [...md['responsible-parties']] : [];

  function upsertParty(roleId, person) {
    if (!person) return;
    // exists?
    const role = rp.find(r => r['role-id'] === roleId);
    let p;
    if (role?.['party-uuids']?.[0]) {
      p = parties.find(pp => pp.uuid === role['party-uuids'][0]);
    }
    if (!p) {
      p = { uuid: crypto.randomUUID(), type: 'person', name: person.name || roleId };
      parties.push(p);
      const rEntry = role || { 'role-id': roleId, 'party-uuids': [] };
      if (!role) rp.push(rEntry);
      rEntry['party-uuids'] = [p.uuid];
    }
    p.name = person.name || p.name || roleId;
    p['email-addresses'] = person.email ? [person.email] : (p['email-addresses']||[]);
    p['telephone-numbers'] = person.phone ? [{ number: person.phone }] : (p['telephone-numbers']||[]);
  }

  upsertParty('owner', form.owner);
  upsertParty('dpo',   form.dpo);
  upsertParty('iso',   form.iso);

  // Adresse an owner hängen (wenn vorhanden)
  const ownerRole = rp.find(r => r['role-id'] === 'owner');
  const ownerUuid = ownerRole?.['party-uuids']?.[0];
  const ownerParty = parties.find(pp => pp.uuid === ownerUuid);
  if (ownerParty) {
    ownerParty.addresses = [{
      'addr-lines': [form.address?.street || ''].filter(Boolean),
      'postal-code': form.address?.postalCode || '',
      city:   form.address?.city || '',
      country: form.address?.country || ''
    }];
    if (form.address?.website) {
      ownerParty.links = [{ rel: 'website', href: form.address.website }];
    }
  }

  return {
    ...original,
    'system-security-plan': {
      ...ssp,
      metadata: { ...md, parties, 'responsible-parties': rp },
      'system-characteristics': sc
    }
  };
}
