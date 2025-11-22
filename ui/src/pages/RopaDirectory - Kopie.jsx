import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Minimal-Directory Ansicht:
 * - Listet vorhandene Verfahren (mock/optional live aus Gateway)
 * - Neues Verfahren anlegen (legt Platzhalter im UI an; Gateway-POST kann ergänzt werden)
 */

export default function RopaDirectory() {
  const [orgId, setOrgId] = useState('demo-org');              // später aus Tenant-Kontext
  const [items, setItems] = useState([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    // TODO: Echtbetrieb → Gateway-Call:
    // const BASE = import.meta.env.VITE_GATEWAY_BASE || '';
    // fetch(`${BASE}/api/tenants/${orgId}/bundles`)
    //   .then(r => r.json())
    //   .then(d => setItems(d.bundles ?? []))
    //   .catch(() => setItems([]));

    // Mock:
    setItems([
      { id: 'emr-auskunft', title: 'EMR – Auskunftserteilung', bundleId: 'bundle-1' },
      { id: 'dms-loeschung', title: 'DMS – Löschprozess', bundleId: 'bundle-2' }
    ]);
  }, [orgId]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const bundleId = `bundle-${Date.now().toString().slice(-5)}`;

    // TODO: Echtbetrieb → Gateway-POST /api/tenants/:orgId/bundles
    // const BASE = import.meta.env.VITE_GATEWAY_BASE || '';
    // const r = await fetch(`${BASE}/api/tenants/${orgId}/bundles`, {
    //   method: 'POST',
    //   headers: { 'content-type': 'application/json', 'x-api-key': import.meta.env.VITE_APP_API_KEY ?? '' },
    //   body: JSON.stringify({ title: newTitle, profileHref: /* optional */ undefined })
    // });
    // const data = await r.json();

    // Mock sofort hinzufügen:
    setItems(prev => [{ id: slug, title: newTitle, bundleId }, ...prev]);
    setNewTitle('');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">RoPA – Verzeichnis</h1>
        <div className="text-sm text-gray-600">Org: <span className="font-mono">{orgId}</span></div>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Neues Verfahren – Titel eingeben…"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
        />
        <button className="rounded bg-blue-600 text-white px-4 py-2">Anlegen</button>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="rounded-lg border bg-white p-4">
            <div className="text-sm text-gray-500">Bundle: {item.bundleId}</div>
            <h2 className="font-semibold">{item.title}</h2>
            <div className="mt-3 flex gap-2">
              <Link
                to={`/ssp?org=${encodeURIComponent(orgId)}&bundle=${encodeURIComponent(item.bundleId)}`}
                className="text-blue-700 underline"
              >
                Öffnen
              </Link>
              <a
                href={`https://raw.githubusercontent.com/open-gov-group/opengov-privacy-data/HEAD/data/tenants/${orgId}/bundles/${item.bundleId}/ssp.json`}
                target="_blank" rel="noreferrer" className="text-gray-700 underline"
              >
                RAW
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Hinweis: Diese Liste ist eine Mock-Ansicht. Für Live-Daten an Gateway-Endpoints anbinden (siehe Kommentare im Code).
      </p>
    </div>
  );
}
