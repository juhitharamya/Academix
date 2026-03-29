import express from "express";
import path from "path";
import dns from "node:dns/promises";
import { URL } from "node:url";
import { mountSwagger } from "./swagger.ts";
import { createAuthRouter } from "./routes/auth.ts";
import { createUsersRouter } from "./routes/users.ts";
import { createAdminRouter } from "./routes/admin.ts";
import { createSubjectsRouter } from "./routes/subjects.ts";
import { createPapersRouter } from "./routes/papers.ts";
import { createEvaluationRouter } from "./routes/evaluation.ts";
import { createFacultySubjectsRouter } from "./routes/facultySubjects.ts";
import { createAdminSubjectsRouter } from "./routes/adminSubjects.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createApp(opts: { supabase: SupabaseClient; apiOnly: boolean; serveStatic: boolean; distDir: string }) {
  const { supabase, apiOnly, serveStatic, distDir } = opts;
  const app = express();

  app.use(express.json());

  app.get("/api", (_req, res) => {
    res.json({
      ok: true,
      message: "Academix API",
      endpoints: {
        health: "/api/health",
        subjects: "/api/subjects?regulation=R22&department=CSM&year=II&semester=I",
        login: "POST /api/auth/login",
        signup: "POST /api/auth/signup",
        swagger: "/swagger",
      },
    });
  });

  app.get("/api/health", async (_req, res) => {
    const rawUrl = process.env.SUPABASE_URL || "";
    let host = "";
    try {
      host = rawUrl ? new URL(rawUrl).hostname : "";
    } catch {
      host = "";
    }

    let dnsOk = false;
    let dnsError: string | null = null;
    if (host) {
      try {
        await dns.lookup(host);
        dnsOk = true;
      } catch (e: any) {
        dnsError = e?.message || String(e);
      }
    }

    let fetchOk = false;
    let fetchStatus: number | null = null;
    let fetchError: any = null;
    if (rawUrl) {
      try {
        const target = new URL("/rest/v1/", rawUrl).toString();
        const r = await fetch(target, {
          method: "GET",
          headers: {
            apikey: process.env.SUPABASE_ANON_KEY || "",
            Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || ""}`,
          },
        });
        fetchOk = true;
        fetchStatus = r.status;
      } catch (e: any) {
        fetchError = {
          message: e?.message || String(e),
          code: e?.code,
          cause: e?.cause?.message || e?.cause,
        };
      }
    }

    try {
      // Lightweight connectivity check (no secrets returned).
      const { error: usersErr } = await supabase.from("users").select("id", { head: true, count: "exact" }).limit(1);
      if (usersErr) {
        return res.status(500).json({
          ok: false,
          supabase: false,
          supabaseUrlHost: host,
          dnsOk,
          dnsError,
          fetchOk,
          fetchStatus,
          fetchError,
          error: usersErr.message,
        });
      }

      const { error: facultySubjectsErr } = await supabase
        .from("faculty_subjects")
        .select("id,branch", { head: true, count: "exact" })
        .limit(1);

      return res.json({
        ok: true,
        supabase: true,
        supabaseUrlHost: host,
        dnsOk,
        dnsError,
        fetchOk,
        fetchStatus,
        fetchError,
        tables: {
          users: true,
          faculty_subjects: !facultySubjectsErr,
        },
        warnings: facultySubjectsErr
          ? [
              {
                table: "faculty_subjects",
                error: facultySubjectsErr.message,
                hint: "Run database/supabase-schema.sql, or the targeted migration database/migrations/2026-03-25-add-branch-to-faculty-subjects.sql, in the Supabase SQL editor and wait a moment for the API schema cache to refresh.",
              },
            ]
          : [],
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        supabase: false,
        supabaseUrlHost: host,
        dnsOk,
        dnsError,
        fetchOk,
        fetchStatus,
        fetchError,
        error: e?.message || String(e),
      });
    }
  });

  mountSwagger(app);

  app.use(createAuthRouter(supabase));
  app.use(createUsersRouter(supabase));
  app.use(createAdminRouter(supabase));
  app.use(createAdminSubjectsRouter(supabase));
  app.use(createFacultySubjectsRouter(supabase));
  app.use(createSubjectsRouter(supabase));
  app.use(createPapersRouter(supabase));
  app.use(createEvaluationRouter(supabase));

  // Always return JSON for unhandled errors (helps frontend show real messages).
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled API error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  if (!apiOnly && serveStatic) {
    app.use(express.static(distDir));
    app.get(["/", "/admin", "/admin/*"], (_req, res) => res.sendFile(path.join(distDir, "index.html")));
  } else {
    app.get("/", (_req, res) => res.redirect("/swagger"));
  }

  app.use((_req, res) => res.status(404).json({ error: "Not Found" }));

  return app;
}
