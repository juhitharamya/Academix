import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { openDb } from "./db.ts";
import { createApp } from "./app.ts";

export async function startServer() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.join(__dirname, "..");
  const distDir = path.join(repoRoot, "dist");

  const apiOnly = process.env.API_ONLY === "true";
  const serveStatic = process.env.SERVE_STATIC === "true" || process.env.NODE_ENV === "production";

  const db = openDb();
  const app = createApp({ db, apiOnly, serveStatic, distDir });

  const portFromEnv = Number.parseInt(process.env.API_PORT || process.env.PORT || "", 10);
  const PORT = Number.isFinite(portFromEnv) ? portFromEnv : 3002;
  const HOST = process.env.HOST || "0.0.0.0";

  const server = app.listen(PORT, HOST, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
    console.log(`Swagger UI: http://localhost:${PORT}/swagger`);
  });

  server.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the other process or set API_PORT to a free value (example: API_PORT=3003).`);
      process.exit(1);
    }
    console.error(err);
    process.exit(1);
  });
}

// Only auto-start when executed directly (not when imported).
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  startServer();
}
