export async function loadXdomea(sourceUrlOrJson) {
  if (typeof sourceUrlOrJson === "string") {
    const r = await fetch(sourceUrlOrJson, { cache: "no-store" });
    if (!r.ok) throw new Error(`xdomea fetch failed: ${r.status}`);
    return r.json();
  }
  return sourceUrlOrJson;
}
