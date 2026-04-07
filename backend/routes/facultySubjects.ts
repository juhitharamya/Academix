import express from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readAuthTokenFromRequest, verifyAuthToken } from "./authToken.ts";
import { requireUserByFacultyId } from "./supabaseUtils.ts";
import {
  HS_DEPARTMENT,
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

export function createFacultySubjectsRouter(supabase: SupabaseClient) {
  const router = express.Router();
  let facultySubjectsHasBranch: boolean | null = null;

  async function hasFacultySubjectsBranch() {
    if (facultySubjectsHasBranch !== null) return facultySubjectsHasBranch;
    const { error } = await supabase.from("faculty_subjects").select("branch", { head: true, count: "exact" }).limit(1);
    facultySubjectsHasBranch = !error;
    return facultySubjectsHasBranch;
  }

  function assignmentSelect(includeBranch: boolean) {
    return includeBranch
      ? "id,faculty_id,faculty_name,department,branch,regulation,year,semester,subject_name,subject_code,created_at"
      : "id,faculty_id,faculty_name,department,regulation,year,semester,subject_name,subject_code,created_at";
  }

  function withBranchFallback<T extends Record<string, any>>(rows: T[] | null | undefined, includeBranch: boolean) {
    if (includeBranch) return rows || [];
    return (rows || []).map((row) => ({ ...row, branch: "" }));
  }

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
      const includeBranch = await hasFacultySubjectsBranch();

      const { data, error } = await supabase
        .from("faculty_subjects")
        .select(assignmentSelect(includeBranch))
        .eq("faculty_id", faculty_id)
        .order("created_at", { ascending: false });

      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, assignments: withBranchFallback(data, includeBranch) });
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
      const year = normalizeYear(body.year);
      const semester = normalizeSemester(body.semester);
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

      const effectiveDepartment = normalizeDepartment(faculty.department);
      if (!effectiveDepartment) return res.status(400).json({ error: "Faculty department is missing" });
      const includeBranch = await hasFacultySubjectsBranch();

      const effectiveBranch = effectiveDepartment === HS_DEPARTMENT ? branchFromBody : effectiveDepartment;
      const normalizedSubject = normalizeSubjectMasterInput({
        regulation,
        department: effectiveDepartment,
        branch: effectiveBranch,
        year,
        semester,
        subject_name,
        subject_code,
      });
      if ("error" in normalizedSubject) return res.status(400).json({ error: normalizedSubject.error });

      const subjectRow = normalizedSubject.value;
      const { data: masterSubject, error: masterSubjectError } = await supabase
        .from("subject_master")
        .select("id,subject_name,subject_code")
        .eq("regulation", subjectRow.regulation)
        .eq("department", subjectRow.department)
        .eq("branch", subjectRow.branch)
        .eq("year", subjectRow.year)
        .eq("semester", subjectRow.semester)
        .eq("subject_code", subjectRow.subject_code)
        .eq("is_active", true)
        .maybeSingle();

      if (masterSubjectError && isMissingSubjectMasterTableError(masterSubjectError)) {
        return res.status(400).json({ error: "subject_master table is missing. Run the latest Supabase migration first." });
      }
      if (masterSubjectError) return res.status(400).json({ error: masterSubjectError.message });
      if (!masterSubject) {
        return res.status(400).json({ error: "Selected subject was not found in subject_master for the chosen regulation, department, branch, year, and semester" });
      }

      let existingQuery = supabase
        .from("faculty_subjects")
        .select("id")
        .eq("faculty_id", faculty_id)
        .eq("regulation", subjectRow.regulation)
        .eq("year", subjectRow.year)
        .eq("semester", subjectRow.semester)
        .eq("subject_code", subjectRow.subject_code);

      if (includeBranch) existingQuery = existingQuery.eq("branch", subjectRow.branch);

      const { data: existing, error: exErr } = await existingQuery.maybeSingle();

      if (exErr) return res.status(400).json({ error: exErr.message });
      if (existing) return res.status(400).json({ error: "This subject is already assigned to the selected faculty for the selected term" });

      const payload: Record<string, any> = {
        faculty_id,
        faculty_name: String(faculty.name || "").trim(),
        department: subjectRow.department,
        regulation: subjectRow.regulation,
        year: subjectRow.year,
        semester: subjectRow.semester,
        subject_name: masterSubject.subject_name,
        subject_code: masterSubject.subject_code,
        subject_master_id: masterSubject.id,
      };
      if (includeBranch) payload.branch = subjectRow.branch;

      const { data: created, error: insErr } = await supabase
        .from("faculty_subjects")
        .insert(payload)
        .select(assignmentSelect(includeBranch))
        .single();

      if (insErr) return res.status(400).json({ error: insErr.message });
      const assignment = includeBranch
        ? created
        : {
            ...((created && typeof created === "object") ? created : {}),
            branch: "",
          };
      res.json({ success: true, assignment });
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
      const includeBranch = await hasFacultySubjectsBranch();

      let query = supabase
        .from("faculty_subjects")
        .select(assignmentSelect(includeBranch))
        .order("created_at", { ascending: false });

      if (faculty_id) query = query.eq("faculty_id", faculty_id);
      if (department) query = query.eq("department", department);
      if (branch && includeBranch) query = query.eq("branch", branch);
      if (regulation) query = query.eq("regulation", regulation);
      if (year) query = query.eq("year", year);
      if (semester) query = query.eq("semester", semester);
      if (q) {
        const like = `%${q.replace(/%/g, "")}%`;
        query = includeBranch
          ? query.or(`faculty_name.ilike.${like},faculty_id.ilike.${like},subject_name.ilike.${like},subject_code.ilike.${like},branch.ilike.${like}`)
          : query.or(`faculty_name.ilike.${like},faculty_id.ilike.${like},subject_name.ilike.${like},subject_code.ilike.${like}`);
      }

      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, assignments: withBranchFallback(data, includeBranch) });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  return router;
}
