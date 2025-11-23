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
  const [lastImportRef, setLastImportRef] = useState(''); // Branch des letzten Imports

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


async function loadDirectory(targetOrgId = orgId) {
    setErr('');
    try {
      const r = await fetch(
        `${GW}/api/tenants/${encodeURIComponent(targetOrgId)}/ropa`
      );
      const j = await r.json();
      if (!r.ok || !j.ok) {
        throw new Error(j.error || r.statusText);
      }
      const list = j.items || j.ropa || [];
      setItems(list);
      setMsg(
        `Verzeichnis geladen: ${list.length} Einträge für ${targetOrgId}`
      );
    } catch (e) {
      setItems([]);
      setErr(`Fehler beim Laden des Verzeichnisses: ${e.message}`);
    }
  }

  
async function importAktenplan() {
    setMsg('');
    setErr('');
    try {
      if (!href.trim()) {
        throw new Error('Bitte XDOMEA-URL angeben.');
      }

      const ref = `feature/${orgId}`;

      setMsg('Aktenplan wird importiert …');
      const r = await fetch(
        `${GW}/api/tenants/${encodeURIComponent(
          orgId
        )}/ropa/import?ref=${encodeURIComponent(ref)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: href })
        }
      );
      const j = await r.json();
      if (!r.ok || !j.ok) {
        throw new Error(j.detail || j.error || r.statusText);
      }

      const count = j.created?.length || 0;
      setMsg(`Aktenplan importiert: ${count} Prozesse`);
      setLastImportRef(ref);          // <--- merken, dass ein Draft existiert

      await loadDirectory(orgId);
    } catch (e) {
      setErr(`Fehler beim Import: ${e.message}`);
    }
  }

  async function commitAktenplan() {
    setErr('');
    try {
      if (!lastImportRef) {
        throw new Error('Kein importierter Aktenplan im Entwurf (Branch) vorhanden.');
      }

      setMsg('Aktenplan wird übernommen …');

      // ⚠️ Pfad ggf. an eure bestehende Merge-Route anpassen!
      const r = await fetch(
        `${GW}/api/tenants/${encodeURIComponent(
          orgId
        )}/merge?ref=${encodeURIComponent(lastImportRef)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' }
        }
      );
      const j = await r.json();
      if (!r.ok || !j.ok) {
        throw new Error(j.detail || j.error || r.statusText);
      }

      setMsg('Aktenplan übernommen (Branch gemerged).');
      // optional: lastImportRef zurücksetzen, wenn alles im Main ist
      // setLastImportRef('');
      await loadDirectory(orgId);
    } catch (e) {
      setErr(`Fehler beim Übernehmen: ${e.message}`);
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
          Aktenplan laden
        </button>
        {lastImportRef && (
          <button
            onClick={commitAktenplan}
            className="rounded bg-emerald-600 text-white px-4 py-2"
          >
            Aktenplan übernehmen
          </button>
          )}
      </div>

      {msg && <div className="text-green-700 text-sm">{msg}</div>}
      {err && <div className="text-red-700 text-sm">{err}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
{items.map(item => {
  const procId = item.id || item.processId;
  const title = item.title || procId;

  function handleCreateNew() {
    // TODO: Hier kannst du später z.B. ein Editor-Route ansteuern
    setMsg(`Neuen SSP für Prozess "${title}" anlegen (TODO).`);
  }

  function handleCreateFromTemplate() {
    // TODO: Hier könnt ihr "aus Vorlage" später verdrahten
    setMsg(`SSP aus Vorlage für "${title}" anlegen (TODO).`);
  }

  return (
    <div key={procId} className="rounded-lg border bg-white p-4">
      <div className="text-xs text-gray-500">Process-ID: {procId}</div>
      <h2 className="font-semibold">{title}</h2>

      <div className="mt-3 flex flex-wrap gap-2 items-center">
        {item.sspHref ? (
          <>
            <Link
              to={`/ssp?org=${encodeURIComponent(
                orgId
              )}&proc=${encodeURIComponent(procId)}`}
              className="text-blue-700 underline text-sm"
            >
              Öffnen
            </Link>
            <a
              href={item.sspHref}
              target="_blank"
              rel="noreferrer"
              className="text-gray-700 underline text-sm"
            >
              RAW
            </a>
          </>
        ) : (
          <span className="text-xs text-gray-500 flex-1">
            Noch kein SSP verfügbar
          </span>
        )}

        <button
          onClick={handleCreateNew}
          className="border rounded px-2 py-1 text-xs"
        >
          Anlegen
        </button>
        <button
          onClick={handleCreateFromTemplate}
          className="border rounded px-2 py-1 text-xs"
        >
          Aus Vorlage
        </button>
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
