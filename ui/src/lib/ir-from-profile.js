// Minimal client-side generator: resolved Profile -> implemented-requirements skeleton
export async function generateIRFromProfile(resolvedProfileUrl) {
  const res = await fetch(resolvedProfileUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch resolved profile: ${res.status} ${res.statusText}`);
  const data = await res.json();

  // Support both resolved profile shapes (viewer/resolver variants)
  const controls =
    data?.profile?.controls ||
    data?.catalog?.controls ||
    data?.merge?.asIs?.controls ||
    [];

  const walk = (arr, out=[]) => {
    for (const c of arr) {
      const cid = c.id || c["control-id"] || c["control-id-ref"] || c["controlId"];
      if (cid) {
        // collect statements from parts named 'statement' or '*_stmt'
        const parts = Array.isArray(c.parts) ? c.parts : [];
        const stmts = parts
          .filter(p => p?.name === 'statement' || (p?.name || '').endsWith('_stmt'))
          .map(p => ({ "statement-id": p.id || `${cid}_stmt` }));

        out.push({
          uuid: crypto?.randomUUID?.() || (Math.random().toString(16).slice(2) + Date.now()),
          "control-id": cid,
          "statements": stmts.length ? stmts : [{ "statement-id": `${cid}_stmt` }]
        });
      }
      if (Array.isArray(c.controls) && c.controls.length) walk(c.controls, out);
    }
    return out;
  };

  return walk(controls);
}
