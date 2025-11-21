// src/pages/TenantSetup.jsx
import React, { useMemo, useState } from 'react';
import { buildOrgId, getTenant, initTenant, updateTenant, ensureTenant } from '@/lib/tenantApi';

export default function TenantSetup() {
  // LEFT: Org form (ID parts)
  const [form, setForm] = useState({
    euCode: 'EU',
    stateCode: 'DE',
    countyCode: 'NRW',
    townId: '40213',
    townName: 'DUESSELDORF'
  });

  const orgIdPreview = useMemo(() => buildOrgId(form), [form]);

  // Loaded/created tenant (editable)
  const [tenant, setTenant] = useState(null);

  // UI state
  const [orgId, setOrgId] = useState('');
  const [branch, setBranch] = useState(''); // optional: vorgeschlagen/zuletzt benutzt

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function handleDraftSave() {
    setBusy(true); setMsg(''); setErr('');
    try {
      const ref = branch || `feature/${orgId}-tenant`;
      const res = await fetch(`${import.meta.env.VITE_GATEWAY_BASE}/api/tenants/${encodeURIComponent(orgId)}/save?ref=${encodeURIComponent(ref)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-api-key': import.meta.env.VITE_GATEWAY_API_KEY || '' },
        body: JSON.stringify(tenant)
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || res.statusText);
      setBranch(j.branch || ref);
      setMsg(`Entwurf gespeichert @ ${j.branch}${j.prUrl ? ` (PR: ${j.prUrl})` : ''}`);
    } catch (e) {
      setErr(`Draft speichern fehlgeschlagen: ${e.message}`);
    } finally { setBusy(false); }
  }

  async function handleSaveAndMerge() {
    setBusy(true); setMsg(''); setErr('');
    try {
      const head = branch || `feature/${orgId}-tenant`;
      const res = await fetch(`${import.meta.env.VITE_GATEWAY_BASE}/api/tenants/${encodeURIComponent(orgId)}/merge`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': import.meta.env.VITE_GATEWAY_API_KEY || '' },
        body: JSON.stringify({ head, base: 'main' })
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || res.statusText);
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
    const orgId = orgIdPreview;
    try {
      const t = await getTenant(orgId);
      setTenant(t);
      setMsg(`Tenant geladen: ${orgId}`);
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
            disabled={busy || !orgId}>
            Entwurf speichern
          </button>
          <button 
            className="w-full rounded-lg bg-blue-600 text-white px-3 py-2 hover:bg-blue-700 disabled:opacity-50" 
            onClick={handleSaveAndMerge} 
            disabled={busy || !orgId}>
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

// very simple JSON editor for tenant.json (you can replace later with form fields)
function TenantEditor({ tenant, onChange }) {
  const [text, setText] = useState(JSON.stringify(tenant, null, 2));
  const [err, setErr] = useState('');

  function onText(v) {
    setText(v);
    try {
      const parsed = JSON.parse(v);
      setErr('');
      onChange(parsed);
    } catch (e) {
      setErr('Ungültiges JSON – bitte korrigieren.');
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={e => onText(e.target.value)}
        className="w-full h-64 border rounded-lg font-mono text-xs p-2"
      />
      {err && <div className="text-xs text-red-700">{err}</div>}
    </div>
  );
}
