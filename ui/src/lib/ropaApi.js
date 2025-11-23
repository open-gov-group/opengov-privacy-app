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

export async function loadDirectory(targetOrgId = orgId) {
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

  
 export async function importAktenplan() {
    setMsg('');
    setErr('');
    try {
      if (!href.trim()) {
        throw new Error('Bitte XDOMEA-URL angeben.');
      }

      // gleichen Branch nutzen wie für tenant.json
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

      // direkt danach das Verzeichnis aktualisieren
      await loadDirectory(orgId);
    } catch (e) {
      setErr(`Fehler beim Import: ${e.message}`);
      // items lassen wir stehen – könnte ja ein alter Stand sein
    }
  }


