import express from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readAuthTokenFromRequest, verifyAuthToken } from "./authToken.ts";
import { requireUserByFacultyId } from "./supabaseUtils.ts";
import {
  isMissingSubjectMasterTableError,
  normalizeDepartment,
  normalizeSemester,
  normalizeSubjectMasterInput,
  normalizeYear,
} from "./subjectMaster.ts";

function norm(v: any) {
  return String(v || "").trim();
}

function normUpper(v: any) {
  return norm(v).toUpperCase();
}

function legacySelect() {
  return "id,regulation,department,branch,year,semester,subject_name,subject_code";
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
      const department = normalizeDepartment(req.query.department);
      const branch = normUpper(req.query.branch);
      const year = normalizeYear(req.query.year);
      const semester = normalizeSemester(req.query.semester);
      const q = norm(req.query.q);
      const is_active = norm(req.query.is_active);

      let query = supabase
        .from("subject_master")
        .select("id,regulation,department,branch,year,semester,subject_name,subject_code,is_active,created_at,updated_at")
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
      if (is_active === "true") query = query.eq("is_active", true);
      if (is_active === "false") query = query.eq("is_active", false);
      if (q) {
        const like = `%${q.replace(/%/g, "")}%`;
        query = query.or(`subject_name.ilike.${like},subject_code.ilike.${like}`);
      }

      const { data, error } = await query;
      if (error && isMissingSubjectMasterTableError(error)) {
        let legacyQuery = supabase
          .from("subjects")
          .select(legacySelect())
          .order("regulation", { ascending: true })
          .order("department", { ascending: true })
          .order("branch", { ascending: true })
          .order("year", { ascending: true })
          .order("semester", { ascending: true })
          .order("subject_name", { ascending: true })
          .limit(500);

        if (regulation) legacyQuery = legacyQuery.eq("regulation", regulation);
        if (department) legacyQuery = legacyQuery.eq("department", department);
        if (branch) legacyQuery = legacyQuery.eq("branch", branch);
        if (semester) legacyQuery = legacyQuery.eq("semester", semester);
        if (year && department !== "H&S") legacyQuery = legacyQuery.eq("year", year);
        if (q) {
          const like = `%${q.replace(/%/g, "")}%`;
          legacyQuery = legacyQuery.or(`subject_name.ilike.${like},subject_code.ilike.${like}`);
        }

        const { data: legacyData, error: legacyError } = await legacyQuery;
        if (legacyError) return res.status(400).json({ error: legacyError.message });
        return res.json({
          success: true,
          subjects: (legacyData || []).map((row: any) => ({
            ...row,
            year: row?.year || (String(row?.department || "").trim() === "H&S" ? "I" : row?.year || ""),
            branch: row?.branch || (String(row?.department || "").trim() === "H&S" ? "" : String(row?.department || "").trim()),
            is_active: true,
            created_at: null,
            updated_at: null,
          })),
          warning: "Using legacy subjects table. Run the subject_master migration when convenient.",
        });
      }
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
      const normalized = normalizeSubjectMasterInput(body);
      if ("error" in normalized) return res.status(400).json({ error: normalized.error });

      const row = normalized.value;
      const { data: duplicate, error: duplicateError } = await supabase
        .from("subject_master")
        .select("id")
        .eq("regulation", row.regulation)
        .eq("branch", row.branch)
        .eq("year", row.year)
        .eq("semester", row.semester)
        .eq("subject_code", row.subject_code)
        .limit(1)
        .maybeSingle();

      if (duplicateError && isMissingSubjectMasterTableError(duplicateError)) {
        const legacyRow = {
          regulation: row.regulation,
          department: row.department,
          branch: row.branch,
          year: row.department === "H&S" ? null : row.year,
          semester: row.semester,
          subject_name: row.subject_name,
          subject_code: row.subject_code,
        };

        const { data: created, error: legacySaveError } = await supabase
          .from("subjects")
          .upsert(legacyRow, { onConflict: "regulation,department,branch,year,semester,subject_code" })
          .select(legacySelect())
          .single();

        if (legacySaveError) return res.status(400).json({ error: legacySaveError.message });
        if (!created || typeof created !== "object") {
          return res.status(500).json({ error: "Legacy subject save did not return a row" });
        }
        const createdRow = created as Record<string, any>;
        return res.json({
          success: true,
          subject: {
            ...createdRow,
            year: createdRow.year || (createdRow.department === "H&S" ? "I" : createdRow.year || ""),
            is_active: true,
            created_at: null,
            updated_at: null,
          },
          warning: "Saved to legacy subjects table because subject_master is not available yet.",
        });
      }
      if (duplicateError) return res.status(400).json({ error: duplicateError.message });
      if (duplicate) {
        const { data: existing, error: existingError } = await supabase
          .from("subject_master")
          .select("id,subject_name")
          .eq("id", duplicate.id)
          .maybeSingle();

        if (existingError) return res.status(400).json({ error: existingError.message });
        if (existing && String(existing.subject_name || "") !== row.subject_name) {
          return res.status(400).json({ error: "Duplicate subject code already exists for the selected regulation, branch, year, and semester" });
        }
      }

      const payload = {
        ...row,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("subject_master")
        .upsert(payload, { onConflict: "regulation,department,branch,year,semester,subject_code" })
        .select("id,regulation,department,branch,year,semester,subject_name,subject_code,is_active,created_at,updated_at")
        .single();

      if (error && isMissingSubjectMasterTableError(error)) {
        return res.status(400).json({
          error: "subject_master table is missing. Run the latest Supabase migration before using Admin Subject Management.",
        });
      }
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, subject: data });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  return router;
}
