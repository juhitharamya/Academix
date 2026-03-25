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

export function createFacultySubjectsRouter(supabase: SupabaseClient) {
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

  // Faculty: list assigned subjects.
  router.get("/api/faculty/subjects", async (req, res) => {
    try {
      const token = readAuthTokenFromRequest(req);
      let faculty_id = "";
      if (token) {
        const v = verifyAuthToken(token);
        if (!v.ok) return res.status(v.status).json({ error: v.error });
        faculty_id = v.payload.faculty_id;
      } else {
        faculty_id = norm(req.query.faculty_id);
      }
      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });

      const check = await requireUserByFacultyId(supabase, faculty_id);
      if (!check.ok) return res.status(check.status).json({ error: check.error });

      const { data, error } = await supabase
        .from("faculty_subjects")
        .select("id,faculty_id,faculty_name,department,branch,regulation,year,semester,subject_name,subject_code,created_at")
        .eq("faculty_id", faculty_id)
        .order("created_at", { ascending: false });

      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, assignments: data || [] });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  // Admin: create assignment.
  router.post("/api/admin/faculty-subjects", async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const body = (req.body || {}) as any;
      const faculty_id = norm(body.faculty_id);
      const regulation = normUpper(body.regulation);
      const year = normUpper(body.year);
      const semester = norm(body.semester);
      const subject_name = norm(body.subject_name);
      const subject_code = normUpper(body.subject_code);
      const branchFromBody = normUpper(body.branch);

      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!subject_name) return res.status(400).json({ error: "subject_name is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });

      const { data: faculty, error: fErr } = await supabase
        .from("users")
        .select("faculty_id,name,department,role,status")
        .eq("faculty_id", faculty_id)
        .maybeSingle();

      if (fErr) return res.status(500).json({ error: fErr.message });
      if (!faculty) return res.status(404).json({ error: "Faculty not found" });
      if (String(faculty.status || "Active") === "Disabled") return res.status(403).json({ error: "Account is disabled" });
      if (String(faculty.role || "").toLowerCase() !== "faculty") return res.status(400).json({ error: "Assignments can be created only for Faculty accounts" });

      const effectiveDepartment = regulation === "R25" && year === "I" ? "H&S" : String(faculty.department || "").trim();
      if (!effectiveDepartment) return res.status(400).json({ error: "Faculty department is missing" });

      let effectiveBranch = "";
      if (effectiveDepartment === "H&S") {
        // For H&S subjects, branch determines which department stream (CSE/CSM/CSD/ECE...) the subject belongs to.
        // If the Faculty itself belongs to a non-H&S department and we are forcing H&S (R25, Year I), lock branch to that department.
        if (regulation === "R25" && year === "I" && String(faculty.department || "").trim() && String(faculty.department || "").trim() !== "H&S") {
          effectiveBranch = String(faculty.department || "").trim().toUpperCase();
        } else {
          effectiveBranch = branchFromBody;
        }
        if (!effectiveBranch) return res.status(400).json({ error: "branch is required for H&S assignments" });
      }

      const { data: existing, error: exErr } = await supabase
        .from("faculty_subjects")
        .select("id")
        .eq("faculty_id", faculty_id)
        .eq("branch", effectiveBranch)
        .eq("regulation", regulation)
        .eq("year", year)
        .eq("semester", semester)
        .eq("subject_code", subject_code)
        .maybeSingle();

      if (exErr) return res.status(400).json({ error: exErr.message });
      if (existing) return res.status(400).json({ error: "This subject is already assigned to the selected faculty for the selected term" });

      const { data: created, error: insErr } = await supabase
        .from("faculty_subjects")
        .insert({
          faculty_id,
          faculty_name: String(faculty.name || "").trim(),
          department: effectiveDepartment,
          branch: effectiveBranch,
          regulation,
          year,
          semester,
          subject_name,
          subject_code,
        })
        .select("id,faculty_id,faculty_name,department,branch,regulation,year,semester,subject_name,subject_code,created_at")
        .single();

      if (insErr) return res.status(400).json({ error: insErr.message });
      res.json({ success: true, assignment: created });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  // Admin: list assignments.
  router.get("/api/admin/faculty-subjects", async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const faculty_id = norm(req.query.faculty_id);
      const department = norm(req.query.department);
      const branch = normUpper(req.query.branch);
      const regulation = normUpper(req.query.regulation);
      const year = normUpper(req.query.year);
      const semester = norm(req.query.semester);
      const role = normUpper(req.query.role); // reserved for future; ignored for now
      void role;
      const q = norm(req.query.q);

      let query = supabase
        .from("faculty_subjects")
        .select("id,faculty_id,faculty_name,department,branch,regulation,year,semester,subject_name,subject_code,created_at")
        .order("created_at", { ascending: false });

      if (faculty_id) query = query.eq("faculty_id", faculty_id);
      if (department) query = query.eq("department", department);
      if (branch) query = query.eq("branch", branch);
      if (regulation) query = query.eq("regulation", regulation);
      if (year) query = query.eq("year", year);
      if (semester) query = query.eq("semester", semester);
      if (q) {
        const like = `%${q.replace(/%/g, "")}%`;
        query = query.or(`faculty_name.ilike.${like},faculty_id.ilike.${like},subject_name.ilike.${like},subject_code.ilike.${like},branch.ilike.${like}`);
      }

      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, assignments: data || [] });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  return router;
}
