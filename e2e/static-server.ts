// Serves the static export (out/) for Playwright — same clean-URL resolution
// Cloudflare Pages applies. Run `bun run build` first (the test:e2e script does).
import { join } from "node:path";

const OUT_DIR = join(import.meta.dir, "..", "out");
const port = Number(process.env.PORT ?? 4173);

Bun.serve({
  port,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    for (const candidate of [path, `${path}.html`, join(path, "index.html")]) {
      const file = Bun.file(join(OUT_DIR, candidate));
      if (await file.exists()) return new Response(file);
    }
    return new Response("not found", { status: 404 });
  },
});

console.log(`serving ${OUT_DIR} on http://localhost:${port}`);
