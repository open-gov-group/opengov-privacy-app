export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/healthz") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      });
    }

    // /api/ssp/<id>
    let m = url.pathname.match(/^\/api\/ssp\/([^/]+)$/);
    if (m) {
      const id = m[1].replace(/[^a-zA-Z0-9._-]/g, "");
      const raw = `https://raw.githubusercontent.com/open-gov-group/opengov-privacy-mappings/main/build/${id}.json`;
      const resp = await fetch(raw, { cf: { cacheTtl: 600, cacheEverything: true } });
      if (!resp.ok) {
        return new Response(JSON.stringify({ error: "not_found" }), {
          status: 404,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
        });
      }
      const headers = new Headers(resp.headers);
      headers.set("content-type", "application/json; charset=utf-8");
      headers.set("access-control-allow-origin", "*");
      headers.set("cache-control", "public, max-age=60, s-maxage=600");
      return new Response(resp.body, { status: 200, headers });
    }

    // /api/ssp-bundle/<id> → { ssp, profile }
    m = url.pathname.match(/^\/api\/ssp-bundle\/([^/]+)$/);
    if (m) {
      const id = m[1].replace(/[^a-zA-Z0-9._-]/g, "");
      const raw = `https://raw.githubusercontent.com/open-gov-group/opengov-privacy-mappings/main/build/${id}.json`;
      const sspResp = await fetch(raw, { cf: { cacheTtl: 600, cacheEverything: true } });
      if (!sspResp.ok) {
        return new Response(JSON.stringify({ error: "not_found" }), {
          status: 404,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
        });
      }
      const ssp = await sspResp.json();

      let profile = null;
      const href = ssp?.["system-security-plan"]?.["import-profile"]?.href;
      if (href) {
        const p = await fetch(href, { cf: { cacheTtl: 600, cacheEverything: true } });
        if (p.ok) profile = await p.json();
      }

      const body = JSON.stringify({ ssp, profile });
      return new Response(body, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "access-control-allow-origin": "*",
          "cache-control": "public, max-age=60, s-maxage=600"
        }
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

