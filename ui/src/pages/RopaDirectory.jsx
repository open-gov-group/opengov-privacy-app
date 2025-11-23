// src/pages/RopaDirectory.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const GW = import.meta.env.VITE_GATEWAY_BASE || '';

export default function RopaDirectory() {
  const [orgId, setOrgId] = useState('EU-DE-NRW-40213-DUESSELDORF'); // später aus Tenant-Kontext
  const [href, setHref] = useState('');           // XDOMEA XML/JSON Quelle
  const [mainItems, setMainItems] = useState([]); // RoPA aus main
  const [draftItems, setDraftItems] = useState([]); // Import-/Preview-Ergebnis (Draft)
  const [lastImportRef, setLastImportRef] = useState(''); // Branch des letzten Imports
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Beim Laden der Seite: wenn orgId gesetzt → RoPA (main) laden
  useEffect(() => {
    if (!orgId) {
      setMainItems([]);
      return;
    }
    loadMainRopa(orgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // RoPA-Verzeichnis aus main laden
  async function loadMainRopa(targetOrgId) {
    setErr('');
    try {
      const r = await fetch(
        `${GW}/api/tenants/${encodeURIComponent(targetOrgId)}/ropa`
      );
      const j = await r.json();
      if (!r.ok) {
        throw new Error(j.detail || j.error || r.statusText);
      }

      const raw = Array.isArray(j.items) ? j.items : [];
      const list = raw.map(p =>
        typeof p === 'string' ? { id: p, title: p } : p
      );

      setMainItems(list);
      setMsg(`Verzeichnis geladen: ${list.length} Einträge (Main)`);
    } catch (e) {
      setMainItems([]);
      setErr(`Fehler beim Laden des Verzeichnisses (Main): ${e.message}`);
    }
  }

  // Vorschau aus XDOMEA – schreibt nur Draft-Liste (ohne SSP)
  async function loadPreview() {
    setMsg('');
    setErr('');
    setDraftItems([]);
    try {
      if (!href.trim()) throw new Error('Bitte XDOMEA-URL angeben.');
      const r = await fetch(
        `${GW}/api/ropa/preview?org=${encodeURIComponent(
          orgId
        )}&href=${encodeURIComponent(href)}`
      );
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || r.statusText);

      const list = (j.ropa?.processes || []).map(p => ({
        id: p.id,
        title: p.title || p.id,
        sspHref: null
      }));

      setDraftItems(list);
      setMsg(
        `Vorschau geladen: ${j.ropa?.processes?.length || 0} Prozesse (Draft)`
      );
    } catch (e) {
      setErr(`Fehler beim Laden: ${e.message}`);
      setDraftItems([]);
    }
  }

  // Minimal-SSP für einen Draft-Prozess anlegen und danach main aktualisieren
  async function createDraftSsp(item) {
    setMsg('');
    setErr('');
    try {
      if (!orgId) throw new Error('Keine Organisation gesetzt.');

      const r = await fetch(
        `${GW}/api/tenants/${encodeURIComponent(orgId)}/bundles`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' }, // ggf. x-api-key hinzufügen
          body: JSON.stringify({ title: item.title, processId: item.id })
        }
      );
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || r.statusText);

      // Draft-Item um sspHref/bundleId ergänzen
      setDraftItems(prev =>
        prev.map(x =>
          x.id === item.id
            ? { ...x, bundleId: j.bundleId, sspHref: j.sspHref }
            : x
        )
      );

      setMsg(
        `SSP (Draft) angelegt: ${j.bundleId}${
          j.prUrl ? ` (PR: ${j.prUrl})` : ''
        }`
      );

      // RoPA main aktualisieren (Backend schreibt Prozess ins ropa.json auf main)
      await loadMainRopa(orgId);
    } catch (e) {
      setErr(`Anlegen fehlgeschlagen: ${e.message}`);
    }
  }

  // Aktenplan importieren → Draft-Liste aus created[]
  async function importAktenplan() {
    setMsg('');
    setErr('');
    setDraftItems([]);

    try {
      if (!orgId)
        throw new Error('Bitte zuerst eine Organisation auswählen.');
      if (!href.trim()) throw new Error('Bitte XDOMEA-URL angeben.');

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

      const created = Array.isArray(j.created) ? j.created : [];
      const draftList = created.map(c => ({
        id: c.processId,
        title: c.processId, // später schöner
        sspHref: c.sspHref,
        prUrl: c.prUrl || null
      }));

      setDraftItems(draftList);
      setLastImportRef(ref);
      setMsg(`Aktenplan importiert: ${draftList.length} Prozesse (Draft)`);
    } catch (e) {
      setErr(`Fehler beim Import: ${e.message}`);
    }
  }

  // Aktenplan-Branch mergen → danach main neu laden
  async function commitAktenplan() {
    setErr('');
    try {
      if (!lastImportRef) {
        throw new Error(
          'Kein importierter Aktenplan im Entwurf (Branch) vorhanden.'
        );
      }

      setMsg('Aktenplan wird übernommen …');

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
      // optional: Branch-Marker zurücksetzen
      // setLastImportRef('');
      await loadMainRopa(orgId);
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
          <input
            value={orgId}
            onChange={e => setOrgId(e.target.value)}
            className="font-mono border rounded px-2 py-1"
            style={{ width: 320 }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="XDOMEA-Quelle (XML oder JSON)…"
          value={href}
          onChange={e => setHref(e.target.value)}
        />
        <button
          onClick={loadPreview}
          className="rounded border border-gray-400 text-gray-700 px-4 py-2"
        >
          Vorschau
        </button>
        <button
          onClick={importAktenplan}
          className="rounded bg-blue-600 text-white px-4 py-2"
        >
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

      {/* Draft-Bereich (Preview/Import) */}
      {draftItems.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            Entwurf – Aktenplan (Draft)
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {draftItems.map(item => (
              <ProcessCard
                key={`draft-${item.id}`}
                item={item}
                orgId={orgId}
                variant="draft"
                onCreateDraftSsp={createDraftSsp}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main-RoPA nur, wenn orgId gesetzt ist */}
      {orgId && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">RoPA – Verzeichnis (Main)</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mainItems.map(item => (
              <ProcessCard
                key={`main-${item.id}`}
                item={item}
                orgId={orgId}
                variant="main"
              />
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-gray-500">
        Tipp: Für einen schnellen Test kannst du die bereitgestellte JSON-Probe
        nutzen (XDOMEA→JSON). Sie bildet die Bezeichnungen aus dem Aktenplan ab
        und erzeugt RoPA-Karten daraus.
      </p>
    </div>
  );
}

// gemeinsame Karte für Draft/Main
function ProcessCard({ item, orgId, variant, onCreateDraftSsp }) {
  const hasSsp = !!item.sspHref;

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs text-gray-500">Process-ID: {item.id}</div>
      <h3 className="font-semibold">{item.title || item.id}</h3>

      <div className="mt-3 flex flex-wrap gap-2 items-center">
        {hasSsp ? (
          <>
            <Link
              to={`/ssp?org=${encodeURIComponent(
                orgId
              )}&bundle=${encodeURIComponent(
                item.bundleId || item.id.startsWith('bundle-')
                  ? item.id
                  : `bundle-${item.id}`
              )}`}
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
          <span className="text-xs text-gray-500">Noch kein SSP</span>
        )}

        {variant === 'draft' && !hasSsp && onCreateDraftSsp && (
          <button
            onClick={() => onCreateDraftSsp(item)}
            className="border rounded px-2 py-1 text-xs"
          >
            SSP anlegen (Draft)
          </button>
        )}
      </div>
    </div>
  );
}
