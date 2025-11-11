export async function fetchCatalogManifest() {
  const url = "https://raw.githubusercontent.com/open-gov-group/opengov-privacy-oscal/main/oscal/catalogs.json";
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load catalogs.json: ${r.status}`);
  return r.json();
}
