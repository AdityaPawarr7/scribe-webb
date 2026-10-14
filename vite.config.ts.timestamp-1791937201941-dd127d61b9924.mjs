// vite.config.ts
import { defineConfig } from "file:///sessions/rcw-01gfv4xhnnwnckzvvq98vp9m/mnt/app-web/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/rcw-01gfv4xhnnwnckzvvq98vp9m/mnt/app-web/node_modules/@vitejs/plugin-react/dist/index.js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
function loadEnv() {
  const p = resolve(process.cwd(), ".env");
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return out;
}
var SYSTEM_PROMPT = `You are Scribe, an assistant that turns raw meeting transcripts and rough notes into clean, structured meeting notes.
Return markdown with:
# Title
A one-line title in Title Case.

## Summary
2-5 sentences capturing the point of the conversation.

## Decisions
- bullet list; omit section if none

## Action items
- bullet list; owner in **bold** when identifiable; omit section if none

## Open questions
- bullet list; omit section if none

Keep the user's own notes verbatim where they clearly state facts; prefer the transcript as the source of truth for who said what. Never invent facts.`;
function devApiPlugin() {
  return {
    name: "scribe-dev-api",
    configureServer(server) {
      const env = loadEnv();
      server.middlewares.use("/api/summarize", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks = [];
        for await (const c of req) chunks.push(c);
        let body = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          res.statusCode = 400;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "bad_json" }));
          return;
        }
        const transcript = (body.transcript ?? "").slice(0, 6e4);
        const notes = (body.notes ?? "").slice(0, 1e4);
        if (!transcript && !notes) {
          res.statusCode = 400;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "empty" }));
          return;
        }
        const key = env.CONCENTRATE_API_KEY;
        const base = env.CONCENTRATE_BASE_URL || "https://api.concentrate.ai/v1";
        const model = body.model || env.CONCENTRATE_MODEL || "gpt-oss-120b";
        if (!key) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "no_key", hint: "Set CONCENTRATE_API_KEY in .env" }));
          return;
        }
        const input = `TEMPLATE: ${body.template || "generic meeting"}

MY ROUGH NOTES
${notes || "(none)"}

TRANSCRIPT
${transcript}`;
        try {
          const upstream = await fetch(`${base}/responses`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${key}`
            },
            body: JSON.stringify({
              model,
              instructions: SYSTEM_PROMPT,
              input,
              max_output_tokens: 4e3
            })
          });
          if (!upstream.ok) {
            const text = await upstream.text();
            res.statusCode = 502;
            res.setHeader("content-type", "application/json");
            res.end(
              JSON.stringify({
                error: "upstream",
                status: upstream.status,
                detail: text.slice(0, 500)
              })
            );
            return;
          }
          const data = await upstream.json();
          let markdown = "";
          for (const msg of data.output ?? []) {
            for (const c of msg.content ?? []) {
              if (c.type === "output_text" && c.text) {
                markdown = c.text;
                break;
              }
            }
            if (markdown) break;
          }
          if (!markdown) {
            res.statusCode = 502;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: "no_text", status: data.status ?? "unknown" }));
            return;
          }
          res.statusCode = 200;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ markdown }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "exception", detail: String(err) }));
        }
      });
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [react(), devApiPlugin()],
  optimizeDeps: { include: ["@xenova/transformers"] },
  server: { port: 5173 },
  worker: { format: "es" }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvcmN3LTAxZ2Z2NHhobm53bmNrenZ2cTk4dnA5bS9tbnQvYXBwLXdlYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3Nlc3Npb25zL3Jjdy0wMWdmdjR4aG5ud25ja3p2dnE5OHZwOW0vbW50L2FwcC13ZWIvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL3Nlc3Npb25zL3Jjdy0wMWdmdjR4aG5ud25ja3p2dnE5OHZwOW0vbW50L2FwcC13ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIHR5cGUgUGx1Z2luIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB7IHJlYWRGaWxlU3luYywgZXhpc3RzU3luYyB9IGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAnbm9kZTpwYXRoJ1xuXG4vLyBMb2FkIC5lbnYgZm9yIHRoZSBkZXYgbWlkZGxld2FyZSB3aXRob3V0IHB1bGxpbmcgaW4gZG90ZW52LlxuZnVuY3Rpb24gbG9hZEVudigpIHtcbiAgY29uc3QgcCA9IHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJy5lbnYnKVxuICBpZiAoIWV4aXN0c1N5bmMocCkpIHJldHVybiB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4gIGNvbnN0IG91dDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9XG4gIGZvciAoY29uc3QgbGluZSBvZiByZWFkRmlsZVN5bmMocCwgJ3V0ZjgnKS5zcGxpdCgnXFxuJykpIHtcbiAgICBjb25zdCBtID0gbGluZS5tYXRjaCgvXlxccyooW0EtWjAtOV9dKylcXHMqPVxccyooLio/KVxccyokL2kpXG4gICAgaWYgKG0pIG91dFttWzFdXSA9IG1bMl0ucmVwbGFjZSgvXlwiKC4qKVwiJC8sICckMScpXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5jb25zdCBTWVNURU1fUFJPTVBUID0gYFlvdSBhcmUgU2NyaWJlLCBhbiBhc3Npc3RhbnQgdGhhdCB0dXJucyByYXcgbWVldGluZyB0cmFuc2NyaXB0cyBhbmQgcm91Z2ggbm90ZXMgaW50byBjbGVhbiwgc3RydWN0dXJlZCBtZWV0aW5nIG5vdGVzLlxuUmV0dXJuIG1hcmtkb3duIHdpdGg6XG4jIFRpdGxlXG5BIG9uZS1saW5lIHRpdGxlIGluIFRpdGxlIENhc2UuXG5cbiMjIFN1bW1hcnlcbjItNSBzZW50ZW5jZXMgY2FwdHVyaW5nIHRoZSBwb2ludCBvZiB0aGUgY29udmVyc2F0aW9uLlxuXG4jIyBEZWNpc2lvbnNcbi0gYnVsbGV0IGxpc3Q7IG9taXQgc2VjdGlvbiBpZiBub25lXG5cbiMjIEFjdGlvbiBpdGVtc1xuLSBidWxsZXQgbGlzdDsgb3duZXIgaW4gKipib2xkKiogd2hlbiBpZGVudGlmaWFibGU7IG9taXQgc2VjdGlvbiBpZiBub25lXG5cbiMjIE9wZW4gcXVlc3Rpb25zXG4tIGJ1bGxldCBsaXN0OyBvbWl0IHNlY3Rpb24gaWYgbm9uZVxuXG5LZWVwIHRoZSB1c2VyJ3Mgb3duIG5vdGVzIHZlcmJhdGltIHdoZXJlIHRoZXkgY2xlYXJseSBzdGF0ZSBmYWN0czsgcHJlZmVyIHRoZSB0cmFuc2NyaXB0IGFzIHRoZSBzb3VyY2Ugb2YgdHJ1dGggZm9yIHdobyBzYWlkIHdoYXQuIE5ldmVyIGludmVudCBmYWN0cy5gXG5cbi8vIERldi1vbmx5IG1pZGRsZXdhcmUgdGhhdCBtaXJyb3JzIGFwaS9zdW1tYXJpemUudHMgc28gYG5wbSBydW4gZGV2YCB3b3JrcyBlbmQtdG8tZW5kLlxuLy8gSW4gcHJvZHVjdGlvbiwgVmVyY2VsIHNlcnZlcyBhcGkvc3VtbWFyaXplLnRzIGRpcmVjdGx5IGFzIGEgc2VydmVybGVzcyBmdW5jdGlvbi5cbmZ1bmN0aW9uIGRldkFwaVBsdWdpbigpOiBQbHVnaW4ge1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICdzY3JpYmUtZGV2LWFwaScsXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuICAgICAgY29uc3QgZW52ID0gbG9hZEVudigpXG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL3N1bW1hcml6ZScsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgICAgICBpZiAocmVxLm1ldGhvZCAhPT0gJ1BPU1QnKSB7XG4gICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDVcbiAgICAgICAgICByZXMuZW5kKClcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW11cbiAgICAgICAgZm9yIGF3YWl0IChjb25zdCBjIG9mIHJlcSkgY2h1bmtzLnB1c2goYyBhcyBCdWZmZXIpXG4gICAgICAgIGxldCBib2R5OiB7IHRyYW5zY3JpcHQ/OiBzdHJpbmc7IG5vdGVzPzogc3RyaW5nOyB0ZW1wbGF0ZT86IHN0cmluZzsgbW9kZWw/OiBzdHJpbmcgfSA9IHt9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCd1dGY4JykpXG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwXG4gICAgICAgICAgcmVzLnNldEhlYWRlcignY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxuICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ2JhZF9qc29uJyB9KSlcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0cmFuc2NyaXB0ID0gKGJvZHkudHJhbnNjcmlwdCA/PyAnJykuc2xpY2UoMCwgNjBfMDAwKVxuICAgICAgICBjb25zdCBub3RlcyA9IChib2R5Lm5vdGVzID8/ICcnKS5zbGljZSgwLCAxMF8wMDApXG4gICAgICAgIGlmICghdHJhbnNjcmlwdCAmJiAhbm90ZXMpIHtcbiAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMFxuICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ2NvbnRlbnQtdHlwZScsICdhcHBsaWNhdGlvbi9qc29uJylcbiAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdlbXB0eScgfSkpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qga2V5ID0gZW52LkNPTkNFTlRSQVRFX0FQSV9LRVlcbiAgICAgICAgY29uc3QgYmFzZSA9IGVudi5DT05DRU5UUkFURV9CQVNFX1VSTCB8fCAnaHR0cHM6Ly9hcGkuY29uY2VudHJhdGUuYWkvdjEnXG4gICAgICAgIGNvbnN0IG1vZGVsID0gYm9keS5tb2RlbCB8fCBlbnYuQ09OQ0VOVFJBVEVfTU9ERUwgfHwgJ2dwdC1vc3MtMTIwYidcbiAgICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMFxuICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ2NvbnRlbnQtdHlwZScsICdhcHBsaWNhdGlvbi9qc29uJylcbiAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdub19rZXknLCBoaW50OiAnU2V0IENPTkNFTlRSQVRFX0FQSV9LRVkgaW4gLmVudicgfSkpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaW5wdXQgPSBgVEVNUExBVEU6ICR7Ym9keS50ZW1wbGF0ZSB8fCAnZ2VuZXJpYyBtZWV0aW5nJ31cblxuTVkgUk9VR0ggTk9URVNcbiR7bm90ZXMgfHwgJyhub25lKSd9XG5cblRSQU5TQ1JJUFRcbiR7dHJhbnNjcmlwdH1gXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgdXBzdHJlYW0gPSBhd2FpdCBmZXRjaChgJHtiYXNlfS9yZXNwb25zZXNgLCB7XG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgICAgYXV0aG9yaXphdGlvbjogYEJlYXJlciAke2tleX1gXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICBtb2RlbCxcbiAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zOiBTWVNURU1fUFJPTVBULFxuICAgICAgICAgICAgICBpbnB1dCxcbiAgICAgICAgICAgICAgbWF4X291dHB1dF90b2tlbnM6IDQwMDBcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgICBpZiAoIXVwc3RyZWFtLm9rKSB7XG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gYXdhaXQgdXBzdHJlYW0udGV4dCgpXG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMlxuICAgICAgICAgICAgcmVzLnNldEhlYWRlcignY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxuICAgICAgICAgICAgcmVzLmVuZChcbiAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIGVycm9yOiAndXBzdHJlYW0nLFxuICAgICAgICAgICAgICAgIHN0YXR1czogdXBzdHJlYW0uc3RhdHVzLFxuICAgICAgICAgICAgICAgIGRldGFpbDogdGV4dC5zbGljZSgwLCA1MDApXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZGF0YSA9IChhd2FpdCB1cHN0cmVhbS5qc29uKCkpIGFzIHtcbiAgICAgICAgICAgIG91dHB1dD86IEFycmF5PHsgY29udGVudD86IEFycmF5PHsgdHlwZT86IHN0cmluZzsgdGV4dD86IHN0cmluZyB9PiB9PlxuICAgICAgICAgICAgc3RhdHVzPzogc3RyaW5nXG4gICAgICAgICAgfVxuICAgICAgICAgIGxldCBtYXJrZG93biA9ICcnXG4gICAgICAgICAgZm9yIChjb25zdCBtc2cgb2YgZGF0YS5vdXRwdXQgPz8gW10pIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYyBvZiBtc2cuY29udGVudCA/PyBbXSkge1xuICAgICAgICAgICAgICBpZiAoYy50eXBlID09PSAnb3V0cHV0X3RleHQnICYmIGMudGV4dCkge1xuICAgICAgICAgICAgICAgIG1hcmtkb3duID0gYy50ZXh0XG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1hcmtkb3duKSBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIW1hcmtkb3duKSB7XG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMlxuICAgICAgICAgICAgcmVzLnNldEhlYWRlcignY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnbm9fdGV4dCcsIHN0YXR1czogZGF0YS5zdGF0dXMgPz8gJ3Vua25vd24nIH0pKVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjAwXG4gICAgICAgICAgcmVzLnNldEhlYWRlcignY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxuICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBtYXJrZG93biB9KSlcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDBcbiAgICAgICAgICByZXMuc2V0SGVhZGVyKCdjb250ZW50LXR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXG4gICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnZXhjZXB0aW9uJywgZGV0YWlsOiBTdHJpbmcoZXJyKSB9KSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCksIGRldkFwaVBsdWdpbigpXSxcbiAgb3B0aW1pemVEZXBzOiB7IGluY2x1ZGU6IFsnQHhlbm92YS90cmFuc2Zvcm1lcnMnXSB9LFxuICBzZXJ2ZXI6IHsgcG9ydDogNTE3MyB9LFxuICB3b3JrZXI6IHsgZm9ybWF0OiAnZXMnIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXdVLFNBQVMsb0JBQWlDO0FBQ2xYLE9BQU8sV0FBVztBQUNsQixTQUFTLGNBQWMsa0JBQWtCO0FBQ3pDLFNBQVMsZUFBZTtBQUd4QixTQUFTLFVBQVU7QUFDakIsUUFBTSxJQUFJLFFBQVEsUUFBUSxJQUFJLEdBQUcsTUFBTTtBQUN2QyxNQUFJLENBQUMsV0FBVyxDQUFDLEVBQUcsUUFBTyxDQUFDO0FBQzVCLFFBQU0sTUFBOEIsQ0FBQztBQUNyQyxhQUFXLFFBQVEsYUFBYSxHQUFHLE1BQU0sRUFBRSxNQUFNLElBQUksR0FBRztBQUN0RCxVQUFNLElBQUksS0FBSyxNQUFNLG1DQUFtQztBQUN4RCxRQUFJLEVBQUcsS0FBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFFBQVEsWUFBWSxJQUFJO0FBQUEsRUFDbEQ7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxJQUFNLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFxQnRCLFNBQVMsZUFBdUI7QUFDOUIsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sZ0JB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
