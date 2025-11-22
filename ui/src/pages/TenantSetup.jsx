// src/pages/TenantSetup.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { buildOrgId, getTenant, initTenant, updateTenant, ensureTenant, mergeBranch, saveDraft } from '@/lib/tenantApi';
import { setOrgId as setGlobalOrgId, getOrgId } from '@/lib/orgId';
import { getGlobalFromTenant, applyGlobalToTenant } from '@/lib/tenantShape';

export default function TenantSetup() {
  // LEFT: Org form (ID parts)
  const [form, setForm] = useState({
    euCode: 'EU',
    stateCode: 'DE',
    countyCode: 'NRW',
    townId: '40213',
    townName: 'DUESSELDORF'
  });

  const activeOrg = getOrgId();
  const orgIdPreview = useMemo(() => buildOrgId(form), [form]);

  // Loaded/created tenant (editable)
  const [tenant, setTenant] = useState(null);

  // UI state
  const [orgIdLocal, setOrgIdLocal] = useState('');
  
  const [branch, setBranch] = useState(''); // optional: vorgeschlagen/zuletzt benutzt

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function handleDraftSave() {
    setBusy(true); setMsg(''); setErr('');
    try {
      const oid = getOrgId();               // globale, gültige OrgID
      if (!oid) throw new Error('Keine gültige OrgID gesetzt. Bitte zuerst laden/anjegen.');+     let currentRef = branch || `feature/${oid}-tenant`;
      let j;
      try {
        j = await saveDraft(oid, tenant, { ref: currentRef });
      } catch (e) {
        // Falls 404/not_found → automatisch initialisieren und nochmal speichern
        if (String(e.message||'').includes('404') || String(e.message||'').includes('not_found')) {
          const out = await ensureTenant({ orgId: oid, title: tenant?.['system-security-plan']?.metadata?.title || oid });
          if (!out.ok) throw new Error('Init fehlgeschlagen');
          currentRef = out.branch || currentRef;
          j = await saveDraft(oid, tenant, { ref: currentRef });
        } else {
          throw e;
        }
      }
      setBranch(j.branch || currentRef);
      setMsg(`Entwurf gespeichert @ ${j.branch || currentRef}${j.prUrl ? ` (PR: ${j.prUrl})` : ''}`);
    } catch (e) {
      setErr(`Draft speichern fehlgeschlagen: ${e.message}`);
    } finally { setBusy(false); }
  }

  async function handleSaveAndMerge() {
    setBusy(true); setMsg(''); setErr('');
    try {
      const oid = getOrgId();
      const head = branch || `feature/${oid}-tenant`;
      const j = await mergeBranch(oid, { head, base: 'main' });
      setMsg(`Gemerged: ${head} → ${j.base} (${j.mergeSha?.slice(0,7) || ''})`);
    } catch (e) {
      setErr(`Merge fehlgeschlagen: ${e.message}`);
    } finally { setBusy(false); }
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function onLoad() {
    setBusy(true); setMsg(''); setErr('');
    const tenantId = orgIdPreview;
    try {
      const t = await getTenant(tenantId);
      setTenant(t);
      setMsg(`Tenant geladen: ${tenantId}`);
      setOrgIdLocal(tenantId);     // nur UI
      setGlobalOrgId(tenantId);    // ✅ globale OrgID für Buttons/Actions
    } catch (e) {
      setTenant(null);
      setErr(`Laden fehlgeschlagen: ${String(e.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function onCreate() {
    setBusy(true); setMsg(''); setErr('');
    try {
      const out = await ensureTenant(form);
      if (out.exists) {
        setTenant(out.tenant);
        setMsg(`Organisation existiert bereits – geladen: ${out.orgId}`);
      } else {
        setTenant(out.tenant); // kann null sein, wenn direkt nach Init noch nicht lesbar
        setMsg(`Organisation angelegt: ${out.orgId}` + (out.prUrl ? ` – PR: ${out.prUrl}` : ''));
      }
      setOrgIdLocal(out.orgId);
      setGlobalOrgId(out.orgId);   // ✅ globale OrgID setzen
    } catch (e) {
      setErr(`Anlegen fehlgeschlagen: ${String(e.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!tenant) return;
    setBusy(true); setMsg(''); setErr('');
    const orgId = orgIdPreview;
    try {
      const saved = await updateTenant(orgId, tenant);
      setTenant(saved);
      setMsg('Gespeichert.');
    } catch (e) {
      setErr(`Speichern fehlgeschlagen: ${String(e.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Tenant Setup</h1>

      {/* GRID: left form, right actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* LEFT: OrgId form */}
        <div className="md:col-span-2 rounded-xl border bg-white p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabeledInput label="EU Code" name="euCode" value={form.euCode} onChange={onChange} />
            <LabeledInput label="Staatscode" name="stateCode" value={form.stateCode} onChange={onChange} />
            <LabeledInput label="Region/County" name="countyCode" value={form.countyCode} onChange={onChange} />
            <LabeledInput label="Town ID" name="townId" value={form.townId} onChange={onChange} />
            <LabeledInput label="Town/Org Name" name="townName" value={form.townName} onChange={onChange} />
          </div>

          <div className="text-sm">
            OrgID Vorschau:&nbsp;
            <span className="font-mono px-1 py-0.5 rounded bg-slate-100">
              {orgIdPreview}
            </span>
          </div>
        </div>

        {/* RIGHT: actions */}
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <button
            onClick={onLoad}
            disabled={busy}
            className="w-full rounded-lg border px-3 py-2 hover:bg-slate-50 disabled:opacity-50"
          >
            Laden
          </button>
          <button 
            className="w-full rounded-lg bg-blue-600 text-white px-3 py-2 hover:bg-blue-700 disabled:opacity-50" 
            onClick={handleDraftSave} 
            disabled={busy || !getOrgId()}>
            Entwurf speichern
          </button>
          <button 
            className="w-full rounded-lg bg-blue-600 text-white px-3 py-2 hover:bg-blue-700 disabled:opacity-50" 
            onClick={handleSaveAndMerge} 
            disabled={busy || !getOrgId()}>
            Speichern
          </button>
          <button
            onClick={onCreate}
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 text-white px-3 py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            Anlegen
          </button>

          {busy && <div className="text-xs text-slate-500">Bitte warten…</div>}
          {!!msg && <div className="text-xs text-green-700">{msg}</div>}
          {!!err && <div className="text-xs text-red-700">{err}</div>}
        </div>
      </div>

      {/* EDIT FORM (appears after load/create) */}
      {tenant && (
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold mb-3">Tenant-Daten</h2>
          <TenantEditor tenant={tenant} onChange={setTenant} />
        </div>
      )}
    </div>
  );
}

function LabeledInput({ label, ...rest }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-slate-600">{label}</span>
      <input
        className="border rounded-lg px-2 py-1 outline-none focus:ring-2 ring-blue-500"
        {...rest}
      />
    </label>
  );
}



function TenantEditor({ tenant, onChange }) {
  const [tab, setTab] = useState('form'); // 'form' | 'json'

  // Form-State aus tenant ableiten
  const [form, setForm] = useState(() => getGlobalFromTenant(tenant));
  const [jsonText, setJsonText] = useState(JSON.stringify(tenant, null, 2));
  const [err, setErr] = useState('');

  // Wenn sich "tenant" von außen ändert → Form + JSON neu setzen
  useEffect(() => {
    setForm(getGlobalFromTenant(tenant));
    setJsonText(JSON.stringify(tenant, null, 2));
    setErr('');
  }, [tenant]);

  // Form → tenant.json zurückschreiben & nach oben geben
  function commitForm(nextForm) {
    setForm(nextForm);
    const nextTenant = applyGlobalToTenant(tenant, nextForm);
    onChange(nextTenant);
    setJsonText(JSON.stringify(nextTenant, null, 2));
  }

  function onJsonChange(v) {
    setJsonText(v);
    try {
      const parsed = JSON.parse(v);
      setErr('');
      onChange(parsed);
      setForm(getGlobalFromTenant(parsed));
    } catch (e) {
      setErr('Ungültiges JSON – bitte korrigieren.');
    }
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`px-3 py-1 rounded ${tab==='form' ? 'bg-blue-600 text-white' : 'border'}`}
          onClick={() => setTab('form')}
        >
          Formular
        </button>
        <button
          className={`px-3 py-1 rounded ${tab==='json' ? 'bg-blue-600 text-white' : 'border'}`}
          onClick={() => setTab('json')}
        >
          JSON
        </button>
      </div>

      {tab === 'form' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* linke Spalte */}
          <fieldset className="space-y-2 border rounded-lg p-3">
            <legend className="text-sm font-semibold px-1">Allgemein</legend>
            <LabelInput
              label="Titel"
              value={form.title}
              onChange={v => commitForm({ ...form, title: v })}
            />
            <LabelTextarea
              label="Beschreibung"
              value={form.description}
              onChange={v => commitForm({ ...form, description: v })}
              rows={4}
            />
          </fieldset>

          {/* rechte Spalte */}
          <fieldset className="space-y-2 border rounded-lg p-3">
            <legend className="text-sm font-semibold px-1">Adresse/Organisation</legend>
            <LabelInput
              label="Organisation"
              value={form.address.organization}
              onChange={v => commitForm({ ...form, address: { ...form.address, organization: v } })}
            />
            <LabelInput
              label="Straße"
              value={form.address.street}
              onChange={v => commitForm({ ...form, address: { ...form.address, street: v } })}
            />
            <div className="grid grid-cols-3 gap-2">
              <LabelInput
                label="PLZ"
                value={form.address.postalCode}
                onChange={v => commitForm({ ...form, address: { ...form.address, postalCode: v } })}
              />
              <LabelInput
                label="Ort"
                value={form.address.city}
                onChange={v => commitForm({ ...form, address: { ...form.address, city: v } })}
              />
              <LabelInput
                label="Land"
                value={form.address.country}
                onChange={v => commitForm({ ...form, address: { ...form.address, country: v } })}
              />
            </div>
            <LabelInput
              label="Webseite"
              value={form.address.website}
              onChange={v => commitForm({ ...form, address: { ...form.address, website: v } })}
            />
          </fieldset>

          <fieldset className="space-y-2 border rounded-lg p-3">
            <legend className="text-sm font-semibold px-1">System Owner</legend>
            <LabelInput label="Name"  value={form.owner.name}  onChange={v => commitForm({ ...form, owner: { ...form.owner, name: v } })}/>
            <LabelInput label="E-Mail" value={form.owner.email} onChange={v => commitForm({ ...form, owner: { ...form.owner, email: v } })}/>
            <LabelInput label="Telefon" value={form.owner.phone} onChange={v => commitForm({ ...form, owner: { ...form.owner, phone: v } })}/>
          </fieldset>

          <fieldset className="space-y-2 border rounded-lg p-3">
            <legend className="text-sm font-semibold px-1">Datenschutzbeauftragte:r (DPO)</legend>
            <LabelInput label="Name"  value={form.dpo.name}  onChange={v => commitForm({ ...form, dpo: { ...form.dpo, name: v } })}/>
            <LabelInput label="E-Mail" value={form.dpo.email} onChange={v => commitForm({ ...form, dpo: { ...form.dpo, email: v } })}/>
            <LabelInput label="Telefon" value={form.dpo.phone} onChange={v => commitForm({ ...form, dpo: { ...form.dpo, phone: v } })}/>
          </fieldset>

          <fieldset className="space-y-2 border rounded-lg p-3">
            <legend className="text-sm font-semibold px-1">Informationssicherheitsbeauftragte:r (ISO)</legend>
            <LabelInput label="Name"  value={form.iso.name}  onChange={v => commitForm({ ...form, iso: { ...form.iso, name: v } })}/>
            <LabelInput label="E-Mail" value={form.iso.email} onChange={v => commitForm({ ...form, iso: { ...form.iso, email: v } })}/>
            <LabelInput label="Telefon" value={form.iso.phone} onChange={v => commitForm({ ...form, iso: { ...form.iso, phone: v } })}/>
          </fieldset>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={jsonText}
            onChange={e => onJsonChange(e.target.value)}
            className="w-full h-72 border rounded-lg font-mono text-xs p-2"
          />
          {err && <div className="text-xs text-red-700">{err}</div>}
        </div>
      )}
    </div>
  );
}

function LabelInput({ label, value, onChange, ...rest }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-slate-600">{label}</span>
      <input
        className="border rounded-lg px-2 py-1 outline-none focus:ring-2 ring-blue-500"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        {...rest}
      />
    </label>
  );
}
function LabelTextarea({ label, value, onChange, rows=3 }) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-slate-600">{label}</span>
      <textarea
        className="border rounded-lg px-2 py-1 outline-none focus:ring-2 ring-blue-500"
        rows={rows}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  );
}


