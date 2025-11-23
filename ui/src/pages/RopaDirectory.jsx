// src/pages/RopaDirectory.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {loadPreview, createBundle, loadDirectory, importAktenplan } from '@/lib/ropaApi';

const GW = import.meta.env.VITE_GATEWAY_BASE || '';

export default function RopaDirectory() {
  const [orgId, setOrgId] = useState('EU-DE-NRW-40213-DUESSELDORF'); // später aus Tenant-Kontext
  const [href, setHref] = useState(''); // XDOMEA XML/JSON Quelle
  const [items, setItems] = useState([]); // {id,title, bundleId?, sspHref?}
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');



  useEffect(() => {
    // beim ersten Render Directory holen
    loadDirectory();
  }, []); // nur einmal beim Mount

    useEffect(() => {
    loadDirectory(orgId);
  }, [orgId]);

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
          Aktenplan laden
        </button>
      </div>

      {msg && <div className="text-green-700 text-sm">{msg}</div>}
      {err && <div className="text-red-700 text-sm">{err}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => {
          const procId = item.id || item.processId;
          return (
            <div key={procId} className="rounded-lg border bg-white p-4">
              <div className="text-xs text-gray-500">
                Process-ID: {procId}
              </div>
              <h2 className="font-semibold">{item.title || procId}</h2>
              <div className="mt-3 flex gap-3">
                {item.sspHref ? (
                  <>
                    <Link
                      to={`/ssp?org=${encodeURIComponent(
                        orgId
                      )}&proc=${encodeURIComponent(procId)}`}
                      className="text-blue-700 underline"
                    >
                      Öffnen
                    </Link>
                    <a
                      href={item.sspHref}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-700 underline"
                    >
                      RAW
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">
                    Noch kein SSP verfügbar
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>


      <p className="text-xs text-gray-500">
        Tipp: Für einen schnellen Test kannst du die bereitgestellte JSON-Probe nutzen (XDOMEA→JSON). Sie bildet die
        Bezeichnungen aus dem Aktenplan ab und erzeugt RoPA-Karten daraus. 
      </p>
    </div>
  );
}
