// Load contract JSON either via SSP back-matter (res-contract) or fallback URL
export function getBackMatterRlink(ssp, uuid) {
  const bm = ssp?.["system-security-plan"]?.["back-matter"];
  return bm?.resources?.find(r => r.uuid === uuid)?.rlinks?.[0]?.href;
}

export async function loadContractFromSSP(ssp) {
  const url = getBackMatterRlink(ssp, "res-contract");
  if (!url) return null;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`contract fetch failed: ${r.status}`);
  return r.json();
}

// Fallback (optional): static well-known path in OSCAL repo
export async function loadDefaultContract() {
  const url = "https://raw.githubusercontent.com/open-gov-group/opengov-privacy-oscal/main/oscal/contract.json";
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`default contract fetch failed: ${r.status}`);
  return r.json();
}

export function pickProfileUrl(contract, ssp) {
  // Prefer explicit contract
  const c = contract?.sources?.profile;
  if (c?.resolvedUrl) return c.resolvedUrl;
  if (c?.sourceUrl) return c.sourceUrl;

  // Fallback: SSP's import-profile
  const href = ssp?.["system-security-plan"]?.["import-profile"]?.href;
  return href || null;
}