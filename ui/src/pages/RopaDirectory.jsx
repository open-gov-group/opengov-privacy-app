// src/pages/RopaDirectory.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const GW = import.meta.env.VITE_GATEWAY_BASE || '';

export default function RopaDirectory() {
  const [orgId, setOrgId] = useState('EU-DE-NRW-40213-DUESSELDORF'); // später aus Tenant-Kontext
  const [href, setHref] = useState(''); // XDOMEA XML/JSON Quelle
  const [items, setItems] = useState([]); // {id,title, bundleId?, sspHref?}
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function loadPreview() {
    setMsg(''); setErr('');
    try {
      if (!href.trim()) throw new Error('Bitte XDOMEA-URL angeben.');
      const r = await fetch(`${GW}/api/ropa/preview?org=${encodeURIComponent(orgId)}&href=${encodeURIComponent(href)}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || r.statusText);
      // Vorschlagsliste (ohne Bundles)
      setItems((j.ropa?.processes || []).map(p => ({ id:p.id, title:p.title })));
      setMsg(`Vorschau geladen: ${j.ropa?.processes?.length || 0} Prozesse`);
    } catch (e) {
      setErr(`Fehler beim Laden: ${e.message}`);
      setItems([]);
    }
  }

  async function createBundle(p) {
    setMsg(''); setErr('');
    try {
      const r = await fetch(`${GW}/api/tenants/${encodeURIComponent(orgId)}/bundles`, {
        method: 'POST',
        headers: { 'content-type':'application/json' }, // ggf. x-api-key hinzufügen
        body: JSON.stringify({ title: p.title, processId: p.id })
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || r.statusText);
      setItems(prev => prev.map(x => x.id === p.id ? { ...x, bundleId: j.bundleId, sspHref: j.sspHref } : x));
      setMsg(`Bundle angelegt: ${j.bundleId}${j.prUrl ? ` (PR: ${j.prUrl})` : ''}`);
    } catch (e) {
      setErr(`Anlegen fehlgeschlagen: ${e.message}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">RoPA – Verzeichnis</h1>
        <div className="text-sm text-gray-600">
          Org:&nbsp;
          <input value={orgId} onChange={e=>setOrgId(e.target.value)}
                 className="font-mono border rounded px-2 py-1" style={{width: 320}}/>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="XDOMEA-Quelle (XML oder JSON)…"
          value={href}
          onChange={e => setHref(e.target.value)}
        />
        <button onClick={loadPreview} className="rounded bg-blue-600 text-white px-4 py-2">
          Vorschau laden
        </button>
      </div>

      {msg && <div className="text-green-700 text-sm">{msg}</div>}
      {err && <div className="text-red-700 text-sm">{err}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="rounded-lg border bg-white p-4">
            <div className="text-xs text-gray-500">Process-ID: {item.id}</div>
            <h2 className="font-semibold">{item.title}</h2>
            <div className="mt-3 flex gap-3">
              {!item.bundleId ? (
                <button onClick={()=>createBundle(item)} className="rounded bg-emerald-600 text-white px-3 py-1.5">
                  Anlegen (Minimal)
                </button>
              ) : (
                <>
                  <Link
                    to={`/ssp?org=${encodeURIComponent(orgId)}&bundle=${encodeURIComponent(item.bundleId)}`}
                    className="text-blue-700 underline"
                  >
                    Öffnen
                  </Link>
                  <a
                    href={item.sspHref || `https://raw.githubusercontent.com/open-gov-group/opengov-privacy-data/HEAD/data/tenants/${orgId}/bundles/${item.bundleId}/ssp.json`}
                    target="_blank" rel="noreferrer" className="text-gray-700 underline"
                  >
                    RAW
                  </a>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Tipp: Für einen schnellen Test kannst du die bereitgestellte JSON-Probe nutzen (XDOMEA→JSON). Sie bildet die
        Bezeichnungen aus dem Aktenplan ab und erzeugt RoPA-Karten daraus. 
      </p>
    </div>
  );
}
