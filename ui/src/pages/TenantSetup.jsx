// ui/src/pages/TenantSetup.jsx
import React, { useState } from 'react';
import { buildOrgId } from '@/lib/orgId'; // gleiche Logik wie oben (UI-Kopie)
const BASE = import.meta.env.VITE_GATEWAY_BASE || '';

export default function TenantSetup() {
  const [form, setForm] = useState({
    euCode: 'EU', stateCode: 'DE', countyCode: '', townId: '', townName: '',
    address: { line1: '', zip: '', city: '', state: 'NW', country: 'DE' },
    website: '', email: '', phone: ''
  });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function onChange(path, value) {
    setForm(prev => {
      const clone = structuredClone(prev);
      const seg = path.split('.');
      let cur = clone;
      for (let i=0;i<seg.length-1;i++) cur = cur[seg[i]];
      cur[seg.at(-1)] = value;
      return clone;
    });
  }

  async function onSubmit(e){
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await fetch(`${BASE}/api/tenants`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // optional: 'x-api-key': import.meta.env.VITE_APP_API_KEY ?? ''
        },
        body: JSON.stringify(form)
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const j = await r.json();
      setResult(j);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  const orgIdPreview = buildOrgId({
    euCode: form.euCode, stateCode: form.stateCode,
    countyCode: form.countyCode, townId: form.townId, townName: form.townName
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tenant anlegen</h1>

      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <div className="rounded border bg-white p-4 space-y-3">
          <h2 className="font-semibold">Organisation</h2>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">EU Code</label>
            <input className="border rounded px-2 py-1"
              value={form.euCode} onChange={e=>onChange('euCode', e.target.value)} />
            <label className="text-sm">State (DE)</label>
            <input className="border rounded px-2 py-1"
              value={form.stateCode} onChange={e=>onChange('stateCode', e.target.value)} />
            <label className="text-sm">County Code</label>
            <input className="border rounded px-2 py-1"
              value={form.countyCode} onChange={e=>onChange('countyCode', e.target.value)} />
            <label className="text-sm">Town ID</label>
            <input className="border rounded px-2 py-1"
              value={form.townId} onChange={e=>onChange('townId', e.target.value)} />
            <label className="text-sm">Town Name</label>
            <input className="border rounded px-2 py-1"
              value={form.townName} onChange={e=>onChange('townName', e.target.value)} />
          </div>
          <div className="text-xs text-gray-600">
            Vorschau OrgID: <span className="font-mono">{orgIdPreview}</span>
          </div>
        </div>

        <div className="rounded border bg-white p-4 space-y-3">
          <h2 className="font-semibold">Kontakt / Adresse</h2>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">Anschrift</label>
            <input className="border rounded px-2 py-1"
              value={form.address.line1} onChange={e=>onChange('address.line1', e.target.value)} />
            <label className="text-sm">PLZ</label>
            <input className="border rounded px-2 py-1"
              value={form.address.zip} onChange={e=>onChange('address.zip', e.target.value)} />
            <label className="text-sm">Ort</label>
            <input className="border rounded px-2 py-1"
              value={form.address.city} onChange={e=>onChange('address.city', e.target.value)} />
            <label className="text-sm">Bundesland</label>
            <input className="border rounded px-2 py-1"
              value={form.address.state} onChange={e=>onChange('address.state', e.target.value)} />
            <label className="text-sm">Land</label>
            <input className="border rounded px-2 py-1"
              value={form.address.country} onChange={e=>onChange('address.country', e.target.value)} />
            <label className="text-sm">Website</label>
            <input className="border rounded px-2 py-1"
              value={form.website} onChange={e=>onChange('website', e.target.value)} />
            <label className="text-sm">E-Mail</label>
            <input className="border rounded px-2 py-1"
              value={form.email} onChange={e=>onChange('email', e.target.value)} />
            <label className="text-sm">Telefon</label>
            <input className="border rounded px-2 py-1"
              value={form.phone} onChange={e=>onChange('phone', e.target.value)} />
          </div>
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <button disabled={busy} className="rounded bg-blue-600 text-white px-4 py-2">
            {busy ? 'Wird angelegt…' : 'Tenant anlegen'}
          </button>
          {err && <span className="text-red-700 text-sm">{err}</span>}
        </div>
      </form>

      {result && (
        <div className="rounded border bg-white p-4">
          <div className="font-semibold mb-2">Ergebnis</div>
          <div className="text-sm">OrgID: <span className="font-mono">{result.orgId}</span></div>
          <div className="text-sm">Pfad: <span className="font-mono">{result.path}</span></div>
          <div className="text-sm">
            RAW:&nbsp;
            <a className="text-blue-700 underline" href={result.url} target="_blank" rel="noreferrer">{result.url}</a>
          </div>
        </div>
      )}
    </div>
  );
}
