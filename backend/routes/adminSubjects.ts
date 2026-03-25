import express from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readAuthTokenFromRequest, verifyAuthToken } from "./authToken.ts";
import { requireUserByFacultyId } from "./supabaseUtils.ts";

function norm(v: any) {
  return String(v || "").trim();
}

function normUpper(v: any) {
  return norm(v).toUpperCase();
}

export function createAdminSubjectsRouter(supabase: SupabaseClient) {
  const router = express.Router();

  async function requireAdmin(req: express.Request, res: express.Response) {
    const token = readAuthTokenFromRequest(req);
    let actor = "";
    if (token) {
      const v = verifyAuthToken(token);
      if (!v.ok) {
        res.status(v.status).json({ error: v.error });
        return null;
      }
      actor = v.payload.faculty_id;
    } else {
      actor = norm(req.query.admin_faculty_id);
      if (!actor) {
        res.status(400).json({ error: "admin_faculty_id is required" });
        return null;
      }
    }

    const adminCheck = await requireUserByFacultyId(supabase, actor);
    if (!adminCheck.ok) {
      res.status(adminCheck.status).json({ error: adminCheck.error });
      return null;
    }
    if (adminCheck.user.role !== "ADMIN") {
      res.status(403).json({ error: "Only Admin can perform this action" });
      return null;
    }
    return adminCheck.user;
  }

  router.get("/api/admin/subjects", async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const regulation = normUpper(req.query.regulation);
      const department = norm(req.query.department);
      const branch = normUpper(req.query.branch);
      const year = normUpper(req.query.year);
      const semester = norm(req.query.semester);
      const q = norm(req.query.q);

      let query = supabase
        .from("subjects")
        .select("id,regulation,department,branch,year,semester,subject_name,subject_code")
        .order("regulation", { ascending: true })
        .order("department", { ascending: true })
        .order("branch", { ascending: true })
        .order("year", { ascending: true })
        .order("semester", { ascending: true })
        .order("subject_name", { ascending: true })
        .limit(500);

      if (regulation) query = query.eq("regulation", regulation);
      if (department) query = query.eq("department", department);
      if (branch) query = query.eq("branch", branch);
      if (year) query = query.eq("year", year);
      if (semester) query = query.eq("semester", semester);
      if (q) {
        const like = `%${q.replace(/%/g, "")}%`;
        query = query.or(`subject_name.ilike.${like},subject_code.ilike.${like}`);
      }

      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, subjects: data || [] });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  router.post("/api/admin/subjects", async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const body = (req.body || {}) as any;
      const regulation = normUpper(body.regulation);
      const department = norm(body.department);
      const semester = norm(body.semester);
      const subject_name = norm(body.subject_name);
      const subject_code = normUpper(body.subject_code);
      let year = normUpper(body.year);
      let branch = normUpper(body.branch);

      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!subject_name) return res.status(400).json({ error: "subject_name is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });

      if (department === "H&S") {
        year = "I";
        if (!branch) return res.status(400).json({ error: "branch is required for H&S" });
      } else {
        branch = "";
        if (!year) return res.status(400).json({ error: "year is required" });
      }

      const row = {
        regulation,
        department,
        branch,
        year,
        semester,
        subject_name,
        subject_code,
      };

      const { data, error } = await supabase
        .from("subjects")
        .upsert(row, { onConflict: "regulation,department,branch,year,semester,subject_code" })
        .select("id,regulation,department,branch,year,semester,subject_name,subject_code")
        .single();

      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, subject: data });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  return router;
}

