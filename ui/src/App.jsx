import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Loader2, Upload, FileText, Link2, ShieldCheck, Book, GitBranch, Wrench } from "lucide-react"
import * as yaml from "js-yaml"

export default function App() {
  const urlParam = (key, fallback) => new URLSearchParams(window.location.search).get(key) || fallback;
  const [sspUrl, setSspUrl]   = useState(urlParam("ssp", "https://raw.githubusercontent.com/open-gov-group/opengov-privacy-oscal/main/oscal/ssp/ssp_template_ropa_full.json"));
  const [poamUrl, setPoamUrl] = useState(urlParam("poam","https://raw.githubusercontent.com/open-gov-group/opengov-privacy-oscal/main/oscal/poam/poam_template.json"));
  const [ssp, setSsp]   = useState(null);
  const [poam, setPoam] = useState(null);
  const [err, setErr]   = useState("");

  async function load() {
    setErr("");
    try {
      const s = await fetch(sspUrl, {cache:"no-store"}).then(r=>r.json());
      setSsp(s);
      try {
        const p = await fetch(poamUrl, {cache:"no-store"}).then(r=>r.json());
        setPoam(p);
      } catch { setPoam(null); }
    } catch(e){ setErr(String(e)); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  const implReqs = ssp?.["system-security-plan"]?.["control-implementation"]?.["implemented-requirements"] ?? [];
  const comps = ssp?.["system-security-plan"]?.["system-implementation"]?.["components"] ?? [];
  const bm = ssp?.["system-security-plan"]?.["back-matter"]?.["resources"] ?? [];

  return (
    <div style={{fontFamily:"ui-sans-serif,system-ui", padding:"16px", maxWidth: "1100px", margin:"0 auto"}}>
      <h1 style={{fontSize:"20px", fontWeight:"700"}}>OpenGov Privacy – Reader (Minimal)</h1>

      <div style={{display:"grid", gap:"8px", gridTemplateColumns:"1fr 1fr", marginTop:"12px"}}>
        <input value={sspUrl} onChange={e=>setSspUrl(e.target.value)} placeholder="SSP URL" />
        <input value={poamUrl} onChange={e=>setPoamUrl(e.target.value)} placeholder="POA&M URL (optional)" />
      </div>
      <button onClick={load} style={{marginTop:"8px", padding:"8px 12px"}}>Load</button>
      {err && <div style={{color:"#b91c1c", marginTop:"8px"}}>{err}</div>}

      {ssp && (
        <>
          <h2 style={{marginTop:"16px"}}>SSP</h2>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px"}}>
            <Tile title="Implemented controls" value={implReqs.length} />
            <Tile title="Components" value={comps.length} />
            <Tile title="Back-matter resources" value={bm.length} />
          </div>

          <h3 style={{marginTop:"12px"}}>Components</h3>
          <ul>
            {comps.map(c => <li key={c.uuid}><code>{c.uuid}</code> — {c.title} ({c.type})</li>)}
          </ul>

          <h3>Implemented requirements</h3>
          <ul>
            {implReqs.map(ir => (
              <li key={ir.uuid || ir["control-id"]}>
                <strong>{ir["control-id"]}</strong> — {ir.statements?.length ?? 0} statements
              </li>
            ))}
          </ul>

          <h3>Back-matter</h3>
          <ul>
            {bm.map(r => (
              <li key={r.uuid}>
                <strong>{r.title}</strong> <code>{r.uuid}</code>
                {r.rlinks?.map((l,i)=>(<div key={i}><a href={l.href} target="_blank" rel="noreferrer">{l.href}</a> ({l["media-type"]})</div>))}
              </li>
            ))}
          </ul>
        </>
      )}

      {poam && (
        <>
          <h2 style={{marginTop:"16px"}}>POA&M</h2>
          <ul>
            {(poam["plan-of-action-and-milestones"]?.["poam-items"] ?? []).map(it=>(
              <li key={it.uuid}><strong>{it.title}</strong> — {it.status || "planned"}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Tile({title, value}) {
  return (
    <div style={{border:"1px solid #e5e7eb", borderRadius:"12px", padding:"12px"}}>
      <div style={{fontSize:"12px", color:"#6b7280"}}>{title}</div>
      <div style={{fontSize:"20px", fontWeight:"700"}}>{value}</div>
    </div>
  );
}
