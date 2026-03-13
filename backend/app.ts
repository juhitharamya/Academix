import express from "express";
import path from "path";
import type { Db } from "./db.ts";
import { mountSwagger } from "./swagger.ts";
import { createAuthRouter } from "./routes/auth.ts";
import { createUsersRouter } from "./routes/users.ts";
import { createAdminRouter } from "./routes/admin.ts";
import { createSubjectsRouter } from "./routes/subjects.ts";
import { createPapersRouter } from "./routes/papers.ts";
import { createEvaluationRouter } from "./routes/evaluation.ts";

export function createApp(opts: { db: Db; apiOnly: boolean; serveStatic: boolean; distDir: string }) {
  const { db, apiOnly, serveStatic, distDir } = opts;
  const app = express();

  app.use(express.json());

  mountSwagger(app);

  app.use(createAuthRouter(db));
  app.use(createUsersRouter(db));
  app.use(createAdminRouter(db));
  app.use(createSubjectsRouter(db));
  app.use(createPapersRouter(db));
  app.use(createEvaluationRouter(db));

  // Always return JSON for unhandled errors (helps frontend show real messages).
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled API error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  if (!apiOnly && serveStatic) {
    app.use(express.static(distDir));
    app.get("/", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
  } else {
    app.get("/", (_req, res) => res.redirect("/swagger"));
  }

  app.use((_req, res) => res.status(404).json({ error: "Not Found" }));

  return app;
}
