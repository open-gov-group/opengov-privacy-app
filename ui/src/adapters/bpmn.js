// very light extractor: BPMN XML -> minimal JSON (purpose/description from <documentation>)
export async function loadBpmnXml(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`bpmn fetch failed: ${r.status}`);
  const xml = await r.text();
  const purpose = (xml.match(/<bpmn:documentation[^>]*>([\s\S]*?)<\/bpmn:documentation>/i) || [])[1] || "";
  return { bpmn: { documentation: purpose.trim() } };
}
