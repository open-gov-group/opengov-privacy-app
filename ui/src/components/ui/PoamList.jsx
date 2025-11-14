

export default function PoamList({ poam }) {
  const model = poam?.["plan-of-action-and-milestones"] ? poam["plan-of-action-and-milestones"] : poam;
  const items = model?.["poam-items"] || [];
  if (!items.length) { 
    return <div className="text-sm text-muted-foreground">No POA&M items found.</div>;
  }
  return (
    <div className="space-y-3">
      {poam["poam-items"].map((it) => (
        <div key={it.uuid} className="rounded-xl border p-4">
          <div className="font-medium">{it.description || it.title || it.uuid}</div>
          <div className="text-sm text-muted-foreground">
            Status: {it.status?.state || 'open'} · Risk: {num(it, 'risk-score') ?? 'n/a'}
          </div>
          {it["related-resources"]?.length ? (
            <div className="mt-2 text-sm">
              Evidence:
              <ul className="list-disc ml-5">
                {it["related-resources"].map((rr) => (
                  <li key={rr["resource-uuid"]}><code>{rr["resource-uuid"]}</code></li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
function num(it, name) {
  const p = (it.props || []).find((x)=>x.name===name);
  return p?.value;
}
