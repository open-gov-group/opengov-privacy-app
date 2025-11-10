import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Upload, FileText, Link2, ShieldCheck, ShieldAlert, CheckCircle2, TriangleAlert, Book, GitBranch, Wrench } from "lucide-react";
import * as yaml from "js-yaml";

// Helper: safe get/set
const dig = (obj, path, dflt = undefined) => {
  try {
    return path.split(".").reduce((o, k) => (o && k in o ? o[k] : undefined), obj) ?? dflt;
  } catch {
    return dflt;
  }
};
const uniq = (arr) => Array.from(new Set(arr));

// Lightweight mapping runner (seed): supports mapping of simple props
// YAML shape example:
// version: 0.1
// priorities: [xdomea, bpmn]
// rules:
//   purposes: { source: xdomea.records[*].subjects, fallback: ["<purpose-unclassified>"] }
//   data-categories:
//     source: bpmn.dataObjects[*].name
//     normalize:
//       - mask: ["SSN", "Password"]
//       - map: { "E-Mail": "contact.email", "Telefon": "contact.phone" }
function applyMapping({ xdomea, bpmn }, yamlText) {
  let config;
  try {
    config = yaml.load(yamlText);
  } catch (e) {
    return { error: `YAML parse error: ${e.message}` };
  }
  if (!config || !config.rules) return { error: "No rules in YAML" };
  const out = {};
  const src = { xdomea: xdomea || {}, bpmn: bpmn || {} };

  const readPathArray = (root, path) => {
    // super light selector supporting dotted paths and [*] arrays at one level
    if (!root || !path) return [];
    const segs = path.split(".");
    let cur = root;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const star = s.endsWith("[*]");
      const key = star ? s.slice(0, -3) : s;
      cur = cur?.[key];
      if (cur === undefined) return [];
      if (star) {
        // flatten one level
        if (!Array.isArray(cur)) return [];
        const rest = segs.slice(i + 1);
        if (rest.length === 0) return cur;
        const flat = [];
        for (const item of cur) {
          let val = item;
          for (const r of rest) {
            val = val?.[r];
          }
          if (val !== undefined) flat.push(val);
        }
        return flat;
      }
    }
    return Array.isArray(cur) ? cur : [cur];
  };

  const normalize = (vals, norm) => {
    let v = [...vals].filter((x) => x !== undefined && x !== null && String(x).trim() !== "");
    if (!norm) return v;
    for (const step of norm) {
      if (step.mask) {
        const m = new Set(step.mask.map(String));
        v = v.filter((x) => !m.has(String(x)));
      }
      if (step.map) {
        v = v.map((x) => (step.map[x] !== undefined ? step.map[x] : x));
      }
      if (step.lowercase) v = v.map((x) => String(x).toLowerCase());
      if (step.trim) v = v.map((x) => String(x).trim());
    }
    return v;
  };

  for (const [target, rule] of Object.entries(config.rules)) {
    const srcKey = Object.keys(rule).includes("source") ? rule.source : undefined;
    if (!srcKey) continue;
    const [rootKey, ...pathParts] = srcKey.split(".");
    const path = pathParts.join(".");
    const values = readPathArray(src[rootKey], path);
    const normalized = normalize(values, rule.normalize);
    const distinct = uniq(normalized);
    if (distinct.length > 0) {
      out[target] = distinct;
    } else if (rule.fallback) {
      out[target] = Array.isArray(rule.fallback) ? rule.fallback : [rule.fallback];
    }
  }
  return { result: out };
}

const sampleXdomea = `{
  "records": [ { "subjects": ["Finanzen", "Haushalt"] } ],
  "retention": { "policy": "10y" },
  "legal_basis": ["Art. 6(1)(c)", "Art. 6(1)(e)"],
  "recipients": ["<internal processing units>"]
}`;

const sampleBpmn = `{
  "dataObjects": [ {"name":"E-Mail"}, {"name":"Telefon"}, {"name":"Kundennummer"} ],
  "lanes": [ {"label":"Bürger:innen","external":false}, {"label":"Sachbearbeitung","external":false} ],
  "messageFlows": [ { "targetPool":"Externer Dienstleister", "external": true } ]
}`;

const sampleYaml = `version: 0.1
priorities: [xdomea, bpmn]
rules:
  purposes:
    source: xdomea.records[*].subjects
    fallback: ["<purpose-unclassified>"]
  data-categories:
    source: bpmn.dataObjects[*].name
    normalize:
      - mask: ["SSN", "Password"]
      - map: { "E-Mail": "contact.email", "Telefon": "contact.phone" }
  recipients:
    source: xdomea.recipients
  retention:
    source: xdomea.retention.policy
  legal-basis:
    source: xdomea.legal_basis
`;

export default function App() {
  const [sspUrl, setSspUrl] = useState("https://raw.githubusercontent.com/open-gov-group/opengov-privacy-oscal/main/oscal/ssp/ssp_template_ropa_full.json");
  const [poamUrl, setPoamUrl] = useState("https://raw.githubusercontent.com/open-gov-group/opengov-privacy-oscal/main/oscal/poam/poam_template.json");
  const [ssp, setSsp] = useState(null);
  const [poam, setPoam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [evTitle, setEvTitle] = useState("");
  const [evHref, setEvHref] = useState("");
  const [evMedia, setEvMedia] = useState("application/pdf");
  const [evHashAlg, setEvHashAlg] = useState("sha256");
  const [evHash, setEvHash] = useState("");
  const [targetStmt, setTargetStmt] = useState("");
  const [attachStmt, setAttachStmt] = useState(false);

  // YAML mapping editor state
  const [xdomeaText, setXdomeaText] = useState(sampleXdomea);
  const [bpmnText, setBpmnText] = useState(sampleBpmn);
  const [yamlText, setYamlText] = useState(sampleYaml);
  const mappingPreview = useMemo(() => {
    let x, b;
    try { x = JSON.parse(xdomeaText); } catch { x = {}; }
    try { b = JSON.parse(bpmnText); } catch { b = {}; }
    return applyMapping({ xdomea: x, bpmn: b }, yamlText);
  }, [xdomeaText, bpmnText, yamlText]);

  const fetchJson = async (url) => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  };

  const loadAll = async () => {
    setError("");
    setLoading(true);
    try {
      const [s, p] = await Promise.all([fetchJson(sspUrl), fetchJson(poamUrl).catch(() => null)]);
      setSsp(s);
      setPoam(p);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sspMeta = dig(ssp, "system-security-plan.metadata", {});
  const implReqs = dig(ssp, "system-security-plan.control-implementation.implemented-requirements", []) || [];
  const statements = implReqs.flatMap((ir) => (ir.statements || []).map((s) => ({ controlId: ir["control-id"], ...s })));

  const implementedCount = implReqs.length;
  // If a resolved profile catalog is available, we could compute total expected controls; for now display implemented only

  const addEvidence = () => {
    if (!ssp) return;
    const copy = JSON.parse(JSON.stringify(ssp));
    const bm = (copy["system-security-plan"]."back-matter" ||= {});
    const resources = (bm.resources ||= []);
    const resUuid = `res-${crypto.randomUUID?.() || Math.random().toString(16).slice(2)}`;
    const res = {
      uuid: resUuid,
      title: evTitle || "Evidence",
      rlinks: [ { href: evHref, "media-type": evMedia } ]
    };
    if (evHash) {
      res.hashes = [ { algorithm: evHashAlg, value: evHash } ];
    }
    resources.push(res);

    if (attachStmt && targetStmt) {
      // find the statement and attach related-resources
      for (const ir of copy["system-security-plan"]."control-implementation"."implemented-requirements") {
        for (const st of (ir.statements || [])) {
          if (st["statement-id"] === targetStmt) {
            st["related-resources"] = [ ...(st["related-resources"] || []), { "resource-uuid": resUuid } ];
          }
        }
      }
    }
    copy["system-security-plan"].metadata["last-modified"] = new Date().toISOString();
    setSsp(copy);
    setEvTitle(""); setEvHref(""); setEvHash("");
  };

  const downloadJson = (obj, name) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> OpenGov Privacy – Reader & Uploader
          </h1>
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Book className="w-4 h-4" /> OSCAL 1.1.2 viewer • <GitBranch className="w-4 h-4" /> demo
          </div>
        </header>

        <Card className="shadow-sm">
          <CardContent className="p-4 grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">SSP JSON URL</label>
              <Input value={sspUrl} onChange={(e) => setSspUrl(e.target.value)} placeholder="https://.../ssp.json" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">POA&M JSON URL (optional)</label>
              <Input value={poamUrl} onChange={(e) => setPoamUrl(e.target.value)} placeholder="https://.../poam.json" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={loadAll} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <FileText className="w-4 h-4 mr-2"/>}
                Load
              </Button>
              {ssp && (
                <Button variant="secondary" onClick={() => downloadJson(ssp, "ssp_updated.json")}>
                  <DownloadIcon /> Download updated SSP
                </Button>
              )}
            </div>
            {error && <div className="md:col-span-2 text-sm text-rose-600">{error}</div>}
          </CardContent>
        </Card>

        <Tabs defaultValue="ssp">
          <TabsList>
            <TabsTrigger value="ssp">SSP</TabsTrigger>
            <TabsTrigger value="poam">POA&M</TabsTrigger>
            <TabsTrigger value="evidence">Evidence Uploader</TabsTrigger>
            <TabsTrigger value="mapper">YAML Mapper</TabsTrigger>
          </TabsList>

          <TabsContent value="ssp">
            <Card className="shadow-sm">
              <CardContent className="p-5 space-y-4">
                {!ssp ? (
                  <div className="text-slate-500 text-sm">Load an SSP JSON to view details.</div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold">{sspMeta.title || "SSP"}</h2>
                      <Badge variant="secondary">v{sspMeta.version || "-"}</Badge>
                      <Badge>{dig(ssp, "system-security-plan.metadata.oscal-version", "1.1.2")}</Badge>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <InfoTile title="Implemented controls" value={`${implementedCount}`} subtitle="implemented-requirements" />
                      <InfoTile title="Components" value={`${(dig(ssp, "system-security-plan.system-implementation.components", []) || []).length}`} />
                      <InfoTile title="Last modified" value={new Date(sspMeta["last-modified"] || Date.now()).toLocaleString()} />
                    </div>

                    <Section title="Components">
                      <div className="grid md:grid-cols-2 gap-3">
                        {(dig(ssp, "system-security-plan.system-implementation.components", []) || []).map((c) => (
                          <Card key={c.uuid} className="border rounded-2xl">
                            <CardContent className="p-4">
                              <div className="font-medium">{c.title} <span className="text-xs text-slate-500">({c.type})</span></div>
                              <div className="text-sm text-slate-600">{c.description}</div>
                              <div className="text-xs text-slate-500 mt-1">uuid: {c.uuid}</div>
                              <Badge className="mt-2" variant="outline">{dig(c, "status.state", "unknown")}</Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </Section>

                    <Section title="Implemented requirements">
                      <Accordion type="multiple" className="w-full">
                        {implReqs.map((ir) => (
                          <AccordionItem key={ir.uuid || ir["control-id"]} value={ir.uuid || ir["control-id"]}>
                            <AccordionTrigger>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{ir["control-id"]}</Badge>
                                <span className="font-medium">Statements: {(ir.statements || []).length}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4">
                                {(ir.statements || []).map((s) => (
                                  <Card key={s.uuid || s["statement-id"]}>
                                    <CardContent className="p-4 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Badge>{s["statement-id"]}</Badge>
                                        <span className="text-sm text-slate-600">{s.description || ""}</span>
                                      </div>
                                      {(s["by-components"] || []).length > 0 && (
                                        <div className="text-sm">
                                          <div className="font-medium mb-1">by-components</div>
                                          <ul className="list-disc ml-5 space-y-1">
                                            {s["by-components"].map((bc, i) => (
                                              <li key={bc.uuid || i}>
                                                <span className="font-mono text-xs">{bc["component-uuid"]}</span>: {bc.description}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {(s["related-resources"] || []).length > 0 && (
                                        <div className="text-sm">
                                          <div className="font-medium mb-1">related-resources</div>
                                          <ul className="list-disc ml-5 space-y-1">
                                            {s["related-resources"].map((rr, i) => (
                                              <li key={i}><span className="font-mono text-xs">{rr["resource-uuid"]}</span></li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </Section>

                    <Section title="Back-matter resources">
                      <div className="grid md:grid-cols-2 gap-3">
                        {(dig(ssp, "system-security-plan.back-matter.resources", []) || []).map((r) => (
                          <Card key={r.uuid}>
                            <CardContent className="p-4 space-y-1">
                              <div className="font-medium">{r.title} <span className="text-xs text-slate-500">{r.uuid}</span></div>
                              {(r.rlinks || []).map((l, i) => (
                                <div key={i} className="text-sm text-slate-600 flex items-center gap-2">
                                  <Link2 className="w-4 h-4"/> <a href={l.href} target="_blank" className="underline break-all">{l.href}</a>
                                  <Badge variant="outline">{l["media-type"]}</Badge>
                                </div>
                              ))}
                              {(r.hashes || []).length > 0 && (
                                <div className="text-xs text-slate-500">hash: {r.hashes[0].algorithm}:{r.hashes[0].value}</div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </Section>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="poam">
            <Card className="shadow-sm">
              <CardContent className="p-5 space-y-4">
                {!poam ? (
                  <div className="text-slate-500 text-sm">Load a POA&M JSON to view items.</div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-lg font-medium">{dig(poam, "plan-of-action-and-milestones.metadata.title", "POA&M")}</div>
                    <div className="grid md:grid-cols-2 gap-3">
                      {(dig(poam, "plan-of-action-and-milestones.poam-items", []) || []).map((it) => (
                        <Card key={it.uuid}>
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{it.title}</div>
                              <Badge>{it.status || "planned"}</Badge>
                            </div>
                            <div className="text-sm text-slate-600">{it.description}</div>
                            <div className="text-xs text-slate-500">risk-score: {(dig(it, "risk.props", [])||[]).find(p=>p.name==="risk-score")?.value || "-"}</div>
                            {(it.milestones || []).length>0 && (
                              <ul className="text-sm list-disc ml-5 space-y-1">
                                {it.milestones.map((m,i)=>(<li key={i}>{m.title} – <span className="text-xs text-slate-500">{m["scheduled-completion-date"]}</span></li>))}
                              </ul>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evidence">
            <Card className="shadow-sm">
              <CardContent className="p-5 space-y-4">
                {!ssp ? (
                  <div className="text-slate-500 text-sm">Load an SSP to attach evidence.</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="font-medium">New Evidence (back-matter resource)</div>
                      <label className="text-xs">Title</label>
                      <Input value={evTitle} onChange={(e)=>setEvTitle(e.target.value)} placeholder="e.g., Backup Policy" />
                      <label className="text-xs">URL (href)</label>
                      <Input value={evHref} onChange={(e)=>setEvHref(e.target.value)} placeholder="https://..." />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs">Media-Type</label>
                          <Input value={evMedia} onChange={(e)=>setEvMedia(e.target.value)} placeholder="application/pdf" />
                        </div>
                        <div>
                          <label className="text-xs">Hash Algorithm</label>
                          <Input value={evHashAlg} onChange={(e)=>setEvHashAlg(e.target.value)} placeholder="sha256" />
                        </div>
                      </div>
                      <label className="text-xs">Hash Value (optional)</label>
                      <Input value={evHash} onChange={(e)=>setEvHash(e.target.value)} placeholder="abcdef..." />

                      <div className="flex items-center gap-2 mt-2">
                        <input id="attach" type="checkbox" checked={attachStmt} onChange={e=>setAttachStmt(e.target.checked)} />
                        <label htmlFor="attach" className="text-sm">Also attach to statement</label>
                      </div>
                      {attachStmt && (
                        <select className="border rounded-md px-2 py-1 w-full" value={targetStmt} onChange={(e)=>setTargetStmt(e.target.value)}>
                          <option value="">Select statement-id…</option>
                          {statements.map((s)=> (
                            <option key={s["statement-id"]} value={s["statement-id"]}>{s["statement-id"]} ({s.controlId})</option>
                          ))}
                        </select>
                      )}

                      <Button className="mt-2" onClick={addEvidence} disabled={!evHref}>
                        <Upload className="w-4 h-4 mr-2"/> Add Evidence
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="font-medium">Back-matter Preview</div>
                      <pre className="bg-slate-900 text-slate-100 text-xs rounded-xl p-3 overflow-auto max-h-96">{JSON.stringify(dig(ssp, "system-security-plan.back-matter.resources", []), null, 2)}</pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mapper">
            <Card className="shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="font-medium">xdomea (JSON)</div>
                    <Textarea className="font-mono text-xs h-64" value={xdomeaText} onChange={(e)=>setXdomeaText(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium">bpmn (JSON)</div>
                    <Textarea className="font-mono text-xs h-64" value={bpmnText} onChange={(e)=>setBpmnText(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium">Mapper rules (YAML)</div>
                    <Textarea className="font-mono text-xs h-64" value={yamlText} onChange={(e)=>setYamlText(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">Preview</div>
                  {mappingPreview.error ? (
                    <div className="text-sm text-rose-600">{mappingPreview.error}</div>
                  ) : (
                    <pre className="bg-slate-900 text-slate-100 text-xs rounded-xl p-3 overflow-auto max-h-96">{JSON.stringify(mappingPreview.result, null, 2)}</pre>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  Tipp: Nutze die resultierenden Werte direkt als Vorschläge für <span className="font-mono">system-security-plan.system-characteristics.props</span> (z.B. <span className="font-mono">ropa:purpose</span>, <span className="font-mono">ropa:data-categories</span> usw.).
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <div className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Wrench className="w-4 h-4"/>{title}</div>
      {children}
    </section>
  );
}

function InfoTile({ title, value, subtitle }) {
  return (
    <Card className="border rounded-2xl">
      <CardContent className="p-4">
        <div className="text-xs text-slate-500">{title}</div>
        <div className="text-2xl font-semibold">{value}</div>
        {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

function DownloadIcon(props){ return (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);}
