import React, { useState } from 'react';

export default function TenantSetup() {
  const [orgId, setOrgId] = useState('');
  const [orgName, setOrgName] = useState('');
  const [profileHref, setProfileHref] = useState(
    'https://raw.githubusercontent.com/open-gov-group/opengov-privacy-oscal/main/oscal/profiles/profile_intervenability.json'
  );
  const [contactEmail, setContactEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true); setError(null); setResult(null);

    try {
      // Gateway-Base aus ENV/Config holen
      const BASE = import.meta.env.VITE_GATEWAY_BASE || '';
      const url = `${BASE}/api/tenants/${encodeURIComponent(orgId)}/init`;
      const payload = {
        orgName,
        defaultProfileHref: profileHref,
        contactEmail
      };

      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // Wenn ihr App-Auth nutzt (JWT/API-Key), hier mitsenden:
          ...(import.meta.env.VITE_APP_API_KEY
             ? { 'x-api-key': import.meta.env.VITE_APP_API_KEY }
             : {})
        },
        body: JSON.stringify(payload)
      });

      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`HTTP ${r.status}: ${txt}`);
      }
      const data = await r.json();
      setResult(data);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Mandant anlegen</h1>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Organisation-ID (slug)</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="z.B. demo-org"
            value={orgId}
            onChange={e=>setOrgId(e.target.value.trim())}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Organisation-Name</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="z.B. Stadt Düsseldorf"
            value={orgName}
            onChange={e=>setOrgName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Standard-Profile (OSCAL)</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={profileHref}
            onChange={e=>setProfileHref(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">Roh-JSON-URL eines OSCAL-Profile (resolved oder plain).</p>
        </div>
        <div>
          <label className="block text-sm font-medium">Kontakt (E-Mail)</label>
          <input
            type="email"
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="datenschutz@example.org"
            value={contactEmail}
            onChange={e=>setContactEmail(e.target.value)}
          />
        </div>

        <button
          className="rounded px-4 py-2 bg-blue-600 text-white disabled:opacity-50"
          disabled={busy || !orgId}
          type="submit"
        >
          {busy ? 'Wird angelegt…' : 'Mandant anlegen'}
        </button>
      </form>

      {error && <div className="text-red-600 text-sm">Fehler: {error}</div>}

      {result && (
        <div className="rounded border p-4 bg-green-50">
          <h2 className="font-semibold mb-2">Erfolg</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          {result.next?.sspBundleHref && (
            <a
              className="inline-block mt-3 underline text-blue-700"
              href={result.next.sspBundleHref}
              target="_blank" rel="noreferrer"
            >
              SSP-Bundle ansehen
            </a>
          )}
        </div>
      )}
    </div>
  );
}
