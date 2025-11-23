  // src/pages/RopaDirectory.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const GW = import.meta.env.VITE_GATEWAY_BASE || '';


export async function loadPreview() {
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

export async function createBundle(p) {
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



