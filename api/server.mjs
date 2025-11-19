import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const app = express();
const PORT = process.env.PORT || 8787;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const ROOT = path.join(process.cwd(), "/");

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, If-None-Match");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Health
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Helper: send JSON with ETag/Cache
async function sendJsonFile(res, filePath) {
  const buf = await fs.readFile(filePath);
  const etag = `"${crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16)}"`;
  res.setHeader("ETag", etag);
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=600");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(buf);
}

// GET /api/ssp/:id  → liefert SSP aus api/ssp-store/<id>.json
app.get("/api/ssp/:id", async (req, res) => {
       const id = String(req.params.id).replace(/[^a-zA-Z0-9._-]/g, "");
    const file = path.join(ROOT, "ssp-store", `${id}.json`);
  try {
 
    await fs.access(file);
    return sendJsonFile(res, file);
  } catch {
    return res.status(404).json({ error: "not_found there", detail: "SSP not found", path: "try to find in: ",  ssp: `${file}` });
  }
});

// GET /api/ssp → Redirect auf einen Default
app.get("/api/ssp", (_req, res) => res.redirect(302, "/api/ssp/emr-auskunft"));

// (Optional) include=profile → Bundle { ssp, profile }
app.get("/api/ssp-bundle/:id", async (req, res) => {
  try {
    const id = String(req.params.id).replace(/[^a-zA-Z0-9._-]/g, "");
    const file = path.join(ROOT, "ssp-store", `${id}.json`);
    const ssp = JSON.parse(await fs.readFile(file, "utf-8"));

    const profileHref = ssp?.["system-security-plan"]?.["import-profile"]?.href;
    let profile = null;
    if (profileHref) {
      const resp = await fetch(profileHref);
      if (resp.ok) profile = await resp.json();
    }

    const body = JSON.stringify({ ssp, profile });
    const etag = `"${crypto.createHash("sha256").update(body).digest("hex").slice(0, 16)}"`;
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=600");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(body);
  } catch {
    return res.status(404).json({ error: "not_found", detail: "Bundle not found" });
  }
});

app.listen(PORT, () => console.log(`SSP API listening on :${PORT}`));
