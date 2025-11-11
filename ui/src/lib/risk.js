const base = import.meta.env.BASE_URL || "/";
export async function loadRiskQualitative() {
  const r = await fetch(base + "risk/qualitative.csv", { cache: "no-store" });
  if (!r.ok) throw new Error(`risk qualitative fetch ${r.status}`);
  const text = await r.text();
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows.map(line => {
    const vals = line.split(",");
    const obj = {}; cols.forEach((c, i) => obj[c] = vals[i]);
    return obj;
  });
}
export async function loadRiskQuant() {
  const r = await fetch(base + "risk/quantitative.json", { cache: "no-store" });
  if (!r.ok) throw new Error(`risk quantitative fetch ${r.status}`);
  return r.json();
}
