import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, Loader2, FileText, Upload, Link2, Wrench, Book } from "lucide-react";
import { generateIRFromProfile } from "./lib/ir-from-profile";
import { fetchCatalogManifest } from "./lib/catalog-manifest";
import { runMapper } from "./lib/mapper";
import { loadXdomea } from "./adapters/xdomea";
import { loadBpmnXml } from "./adapters/bpmn";
import { addEvidence, loadRegistry, attachEvidenceToSSP } from "./lib/evidence";
import * as yaml from "js-yaml";

const dig = (o, p, d=undefined) => p.split(".").reduce((a,k)=> (a&&k in a?a[k]:undefined), o) ?? d;

export default function App() {
  const qp = new URLSearchParams(window.location.search);
  const [sspUrl, setSspUrl]   = useState(qp.get("ssp")  || "https://raw.githubusercontent.com/open-gov-group/opengov-privacy-oscal/main/oscal/ssp/ssp_template_ropa_full.json");
  const [poamUrl, setPoamUrl] = useState(qp.get("poam") || "https://raw.githubusercontent.com/open-gov-group/opengov-privacy-oscal/main/oscal/poam/poam_template.json");

  const [ssp, setSsp] = useState(null);
  const [poam, setPoam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Evidence form
  const [evTitle, setEvTitle] = useState("");
  const [evHref, setEvHref] = useState("");
  const [evMedia, setEvMedia] = useState("application/pdf");
  const [evHash, setEvHash] = useState("");
  const [evAlg, setEvAlg] = useState("sha256");
  const [targetStmt, setTargetStmt] = useState("");
  const [attachStmt, setAttachStmt] = useState(false);
  const LS_SSP = 'opgov:sspUrl';
  const LS_POAM = 'opgov:poamUrl';

  const [catalogList, setCatalogList] = useState([]);
  const [catalogSel, setCatalogSel] = useState(null);

  const [xdomeaUrl, setXdomeaUrl] = useState("");
  const [bpmnUrl, setBpmnUrl] = useState("");

  const [eviTitle, setEviTitle] = useState("");
  const [eviHref, setEviHref] = useState("");
  const [eviMedia, setEviMedia] = useState("application/pdf");
  const [eviHashAlg, setEviHashAlg] = useState("");
  const [eviHashVal, setEviHashVal] = useState("");
  const [eviReg, setEviReg] = useState([]);

  useEffect(()=>{ setEviReg(loadRegistry()); }, []);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/open-gov-group/opengov-privacy-oscal/main/oscal/catalogs.json")
      .then(r=>r.json()).then(list => {
        setCatalogList(list);
        if (!catalogSel) setCatalogSel(list[0]);
      }).catch(()=>{});
  }, []);

  useEffect(() => {
    // Nur wenn keine Query-Params explizit gesetzt wurden:
    const p = new URLSearchParams(window.location.search);
    const sFromQP = p.get('ssp');
    const mFromQP = p.get('poam');
    if (!sFromQP) {
      const s = localStorage.getItem(LS_SSP);
      if (s) setSspUrl(s);
    }
    if (!mFromQP) {
      const m = localStorage.getItem(LS_POAM);
      if (m) setPoamUrl(m);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySkeleton = async () => {
    const ir = await fetch('./build/ir_skeleton.json').then(r=>r.json()).catch(()=>null);
    if (!ssp || !ir) return;
    const next = structuredClone(ssp);
    next['system-security-plan']['control-implementation'] ||= {};
    next['system-security-plan']['control-implementation']['implemented-requirements'] =
      ir['implemented-requirements'];
    setSsp(next);
  };


  const fetchJson = async (u) => {
    const r = await fetch(u, { cache: "no-store" });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new Error(`HTTP ${r.status} ${r.statusText} – ${u}\n${txt?.slice(0,200)}`);
    }
    return r.json();
  };

  const load = async () => {
    setErr(""); setLoading(true);
    try {
      const [s, p] = await Promise.all([
        fetchJson(sspUrl),
        fetchJson(poamUrl).catch(()=>null)
      ]);
      setSsp(s); setPoam(p);
    } catch (e) { setErr(String(e.message||e)); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[]);

  const sspMeta = dig(ssp, "system-security-plan.metadata", {});
  const implReqs = dig(ssp, "system-security-plan.control-implementation.implemented-requirements", []) || [];
  const components = dig(ssp, "system-security-plan.system-implementation.components", []) || [];
  const bm = dig(ssp, "system-security-plan.back-matter.resources", []) || [];

  const statements = useMemo(()=>implReqs.flatMap(ir => (ir.statements||[]).map(s => ({...s, controlId: ir["control-id"]}))), [implReqs]);

  const addEvidence = () => {
    if (!ssp || !evHref) return;
    const next = structuredClone(ssp);
    const bm = (next["system-security-plan"]["back-matter"] ||= {});
    const resources = (bm["resources"] ||= []);
    const uuid = "res-" + (crypto.randomUUID?.() || Math.random().toString(16).slice(2));
    const res = { uuid, title: evTitle || "Evidence", rlinks: [{ href: evHref, "media-type": evMedia }] };
    if (evHash) res.hashes = [{ algorithm: evAlg, value: evHash }];
    resources.push(res);

    if (attachStmt && targetStmt) {
      for (const ir of next["system-security-plan"]["control-implementation"]["implemented-requirements"]) {
        for (const st of (ir.statements || [])) {
          if (st["statement-id"] === targetStmt) {
            st["related-resources"] = [ ...(st["related-resources"] || []), { "resource-uuid": uuid } ];
          }
        }
      }
    }

    next["system-security-plan"].metadata["last-modified"] = new Date().toISOString();
    setSsp(next);
    setEvTitle(""); setEvHref(""); setEvHash("");
    localStorage.setItem(LS_SSP, sspUrl);
    if (poamUrl) localStorage.setItem(LS_POAM, poamUrl);
  };

  const downloadJson = (obj, name) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], {type:"application/json"}));
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> OpenGov Privacy — Reader & Uploader
          </h1>
          <div className="text-xs text-slate-500 flex items-center gap-2"><Book className="w-4 h-4"/> OSCAL 1.1.2</div>
          {catalogList.length>0 && (
            <div className="text-xs">
              <label className="mr-2">Catalog:</label>
              <select
                className="border rounded-md px-2 py-1"
                value={catalogSel?.id || ""}
                onChange={(e)=> setCatalogSel(catalogList.find(x=>x.id===e.target.value))}
              >
                {catalogList.map(c=> <option key={c.id} value={c.id}>{c.title} {c.version}</option>)}
              </select>
            </div>
          )}       
        </header>

        <Card className="shadow-sm">
          <CardContent className="p-4 grid md:grid-cols-2 gap-3">

            <div className="flex gap-2 items-center">
              <Input value={sspUrl} onChange={e=>setSspUrl(e.target.value)} placeholder="https://.../ssp.json" />
              <a className="text-xs text-slate-600 underline" href={sspUrl} target="_blank" rel="noreferrer">open</a>
            </div>

            <div className="flex gap-2 items-center">
              <Input value={poamUrl} onChange={e=>setPoamUrl(e.target.value)} placeholder="https://.../poam.json" />
              <a className="text-xs text-slate-600 underline" href={poamUrl} target="_blank" rel="noreferrer">open</a>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={load} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <FileText className="w-4 h-4 mr-2"/>}
                Load
              </Button>
              <Button variant="secondary" onClick={applySkeleton}>Populate from profile</Button>
              {ssp && (
                <Button variant="secondary" onClick={()=>downloadJson(ssp, "ssp_updated.json")}>
                  Download updated SSP
                </Button>
              )}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <Input value={xdomeaUrl} onChange={e=>setXdomeaUrl(e.target.value)} placeholder="xdomea JSON URL (optional)" />
              <Input value={bpmnUrl} onChange={e=>setBpmnUrl(e.target.value)} placeholder="BPMN XML URL (optional)" />
            </div>
            <Button
              variant="default"
              onClick={async () => {
                try {
                  if (!ssp) throw new Error("Load an SSP first.");
                  // Load sources
                  const sources = {};
                  if (xdomeaUrl) sources.xdomea = await loadXdomea(xdomeaUrl);
                  if (bpmnUrl) sources.bpmn = await loadBpmnXml(bpmnUrl);

                  // Fetch YAML rules from repo (adjust if you keep them elsewhere)
                  const rulesUrl = "https://raw.githubusercontent.com/open-gov-group/opengov-privacy-app/main/mappings/xdomea_to_ropa.yaml";
                  const rules = await fetch(rulesUrl, { cache: "no-store" }).then(r=>r.text());

                  const mapped = runMapper(ssp, rules, sources);
                  setSsp(mapped);
                  setErr("");
                } catch (e) {
                  setErr(e.message || String(e));
                }
              }}
            >
              Map from XDOMEA/BPMN
            </Button>

            {err && (
              <div className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <div className="font-medium mb-1">Fehler beim Laden</div>
                <pre className="whitespace-pre-wrap">{err}</pre>
                <ul className="list-disc ml-5 mt-2 text-rose-800">
                  <li>Stimmt die URL (roh-JSON)? 404 = Pfad prüfen.</li>
                  <li>403/401 = Zugriff/Berechtigung (Repo privat?).</li>
                  <li>CORS-Probleme? Bei internen Hosts <code>Access-Control-Allow-Origin: *</code> setzen.</li>
                  <li>Ist die Datei wirklich JSON und valide (nicht XML/YAML)?</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="ssp">
          <TabsList className="mb-3">
            <TabsTrigger value="ssp">SSP</TabsTrigger>
            <TabsTrigger value="poam">POA&M</TabsTrigger>
            <TabsTrigger value="evidence">Evidence Uploader</TabsTrigger>
          </TabsList>

          <TabsContent value="ssp">
            <Card className="shadow-sm">
              <CardContent className="p-5 space-y-4">
                {!ssp ? <div className="text-slate-500 text-sm">Load an SSP JSON to view details.</div> : (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-xl font-semibold">{sspMeta.title || "SSP"}</div>
                      <Badge variant="secondary">v{sspMeta.version || "-"}</Badge>
                      <Badge>{dig(ssp, "system-security-plan.metadata.oscal-version", "1.1.2")}</Badge>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <InfoTile title="Implemented controls" value={`${implReqs.length}`} subtitle="implemented-requirements" />
                      <InfoTile title="Components" value={`${components.length}`} />
                      <InfoTile title="Last modified" value={new Date(sspMeta["last-modified"] || Date.now()).toLocaleString()} />
                    </div>

                    <Section title="Components">
                      <div className="grid md:grid-cols-2 gap-3">
                        {components.map(c=>(
                          <Card key={c.uuid} className="border rounded-2xl">
                            <CardContent className="p-4">
                              <div className="font-medium">{c.title} <span className="text-xs text-slate-500">({c.type})</span></div>
                              <div className="text-sm text-slate-600">{c.description}</div>
                              <div className="text-xs text-slate-500 mt-1">uuid: {c.uuid}</div>
                              <Badge className="mt-2" variant="outline">{dig(c,"status.state","unknown")}</Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </Section>

                    <Section title="Implemented requirements">
                      <Accordion type="multiple" className="w-full">
                        {implReqs.map(ir=>(
                          <AccordionItem key={ir.uuid || ir["control-id"]} value={ir.uuid || ir["control-id"]}>
                            <AccordionTrigger>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{ir["control-id"]}</Badge>
                                <span className="font-medium">Statements: {(ir.statements||[]).length}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-3">
                                {(ir.statements||[]).map(s=>(
                                  <Card key={s.uuid || s["statement-id"]}>
                                    <CardContent className="p-4 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Badge>{s["statement-id"]}</Badge>
                                        {s.description && <span className="text-sm text-slate-600">{s.description}</span>}
                                      </div>
                                      {(s["by-components"]||[]).length>0 && (
                                        <div className="text-sm">
                                          <div className="font-medium mb-1">by-components</div>
                                          <ul className="list-disc ml-5 space-y-1">
                                            {s["by-components"].map((bc,i)=>(
                                              <li key={bc.uuid || i}><code className="text-xs">{bc["component-uuid"]}</code>: {bc.description}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {(s["related-resources"]||[]).length>0 && (
                                        <div className="text-sm">
                                          <div className="font-medium mb-1">related-resources</div>
                                          <ul className="list-disc ml-5 space-y-1">
                                            {s["related-resources"].map((rr,i)=>(
                                              <li key={i}><code className="text-xs">{rr["resource-uuid"]}</code></li>
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
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="poam">
            {poam && (
              <div className="mb-3">
                <Button variant="secondary" onClick={() => downloadJson(poam, "poam_updated.json")}>
                  Download updated POA&M
                </Button>
              </div>
            )}
            <Card className="shadow-sm">
              <CardContent className="p-5 space-y-4">
                {!poam ? <div className="text-slate-500 text-sm">Load a POA&M JSON to view items.</div> : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {(dig(poam,"plan-of-action-and-milestones.poam-items",[])||[]).map(it=>(
                      <Card key={it.uuid}>
                        <CardContent className="p-4 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{it.title}</div>
                            <Badge>{it.status || "planned"}</Badge>
                          </div>
                          <div className="text-sm text-slate-600">{it.description}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evidence">
            <Card className="shadow-sm">
              <CardContent className="p-5 space-y-4">
                {!ssp ? <div className="text-slate-500 text-sm">Load an SSP to attach evidence.</div> : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="font-medium">New Evidence (back-matter resource)</div>
                      <div className="text-xs">Title</div>
                      <Input value={evTitle} onChange={e=>setEvTitle(e.target.value)} placeholder="e.g., Backup Policy" />
                      <div className="text-xs">URL (href)</div>
                      <Input value={evHref} onChange={e=>setEvHref(e.target.value)} placeholder="https://..." />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs">Media-Type</div>
                          <Input value={evMedia} onChange={e=>setEvMedia(e.target.value)} placeholder="application/pdf" />
                        </div>
                        <div>
                          <div className="text-xs">Hash Algorithm</div>
                          <Input value={evAlg} onChange={e=>setEvAlg(e.target.value)} placeholder="sha256" />
                        </div>
                      </div>
                      <div className="text-xs">Hash Value (optional)</div>
                      <Input value={evHash} onChange={e=>setEvHash(e.target.value)} placeholder="abcdef..." />

                      <div className="flex items-center gap-2 mt-2">
                        <input id="attach" type="checkbox" checked={attachStmt} onChange={e=>setAttachStmt(e.target.checked)} />
                        <label htmlFor="attach" className="text-sm">Also attach to statement</label>
                      </div>
                      {attachStmt && (
                        <select className="border rounded-md px-2 py-1 w-full" value={targetStmt} onChange={e=>setTargetStmt(e.target.value)}>
                          <option value="">Select statement-id…</option>
                          {statements.map(s=>(
                            <option key={s["statement-id"]} value={s["statement-id"]}>{s["statement-id"]} ({s.controlId})</option>
                          ))}
                        </select>
                      )}

                      <Button className="mt-2" onClick={addEvidence} disabled={!evHref}>
                        <Upload className="w-4 h-4 mr-2" /> Add Evidence
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="font-medium">Back-matter Preview</div>
                      <pre className="bg-slate-900 text-slate-100 text-xs rounded-xl p-3 overflow-auto max-h-96">
                        {JSON.stringify(bm, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="mt-4">
              <CardContent>
                <div className="font-medium mb-2">Evidence</div>
                <div className="grid gap-2 md:grid-cols-5">
                  <Input placeholder="Title" value={eviTitle} onChange={e=>setEviTitle(e.target.value)} />
                  <Input placeholder="Href (URL)" value={eviHref} onChange={e=>setEviHref(e.target.value)} />
                  <Input placeholder="Media-Type" value={eviMedia} onChange={e=>setEviMedia(e.target.value)} />
                  <Input placeholder="Hash Alg (optional)" value={eviHashAlg} onChange={e=>setEviHashAlg(e.target.value)} />
                  <Input placeholder="Hash Value (optional)" value={eviHashVal} onChange={e=>setEviHashVal(e.target.value)} />
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const it = addEvidence({ title: eviTitle, href: eviHref, mediaType: eviMedia, hashAlg: eviHashAlg, hashVal: eviHashVal });
                      setEviReg(loadRegistry());
                      if (ssp) {
                        const next = attachEvidenceToSSP(ssp, it, []); // attach to back-matter only
                        setSsp(next);
                      }
                    }}
                  >
                    Add to registry & back-matter
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(eviReg, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = "evidence_registry.json"; a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download registry
                  </Button>
                </div>
                {eviReg.length > 0 && (
                  <div className="mt-3 text-xs text-slate-600">Registry items: {eviReg.length}</div>
                )}
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
