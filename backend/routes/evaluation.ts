import express from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUserByFacultyId } from "./supabaseUtils.ts";

type StudentRow = { roll_number: string; student_name: string };
type StudentListSummary = {
  id: string;
  department: string;
  branch: string;
  regulation: string;
  year: string;
  semester: string;
  section: string;
  uploaded_by: string;
  uploaded_at: string;
  file_name: string;
  count: number;
};

function normalizeYear(input: any) {
  return String(input || "").trim().toUpperCase();
}

function normalizeSection(input: any) {
  return String(input || "").trim().toUpperCase();
}

function normalizeReg(input: any) {
  return String(input || "").trim().toUpperCase();
}

function normalizeSemester(input: any) {
  return String(input || "").trim().toUpperCase();
}

function normalizeMidType(input: any) {
  const value = String(input || "").trim();
  if (value === "Mid1") return "Mid I";
  if (value === "Mid2") return "Mid II";
  return value;
}

function toNumOrNull(v: any) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sumNums(values: any[]) {
  return values.reduce((sum, v) => sum + (Number.isFinite(Number(v)) ? Number(v) : 0), 0);
}

function normalizeDescriptiveMark(value: any) {
  if (!Number.isFinite(Number(value))) return null;
  const parsed = Number(value);
  return parsed >= 0 && parsed <= 5 ? parsed : null;
}

function normalizeObjectiveMark(value: any) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 0 ? 0.5 : 0;
}

function bestFourDescriptiveTotal(values: any[]) {
  return (values || [])
    .map((v) => normalizeDescriptiveMark(v))
    .filter((v): v is number => v !== null)
    .sort((a, b) => b - a)
    .slice(0, 4)
    .reduce((sum, v) => sum + v, 0);
}

function objectiveSectionTotal(values: any[]) {
  return (values || []).reduce((sum, value) => sum + (normalizeObjectiveMark(value) ?? 0), 0);
}

function assignmentSectionTotal(values: any[]) {
  return (values || []).reduce((sum, value) => sum + (normalizeAssignmentMark(value) ?? 0), 0);
}

function normalizeAssignmentMark(value: any) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0 || parsed > 1) return null;
  return parsed >= 1 ? 1 : 0;
}

function normalizeAssignmentMarksObject(value: any) {
  const out: Record<string, number> = {};
  for (let i = 0; i < 5; i++) {
    const key = `A${i + 1}`;
    const mark = normalizeAssignmentMark(value?.[key]);
    out[key] = mark ?? 0;
  }
  return out;
}

function normalizeAssignmentCoMap(value: any) {
  const out: Record<string, string> = {};
  for (let i = 0; i < 5; i++) {
    const key = `A${i + 1}`;
    const next = String(value?.[key] || `CO${i + 1}`).trim().toUpperCase();
    out[key] = ["CO1", "CO2", "CO3", "CO4", "CO5"].includes(next) ? next : `CO${i + 1}`;
  }
  return out;
}

function normalizePptMark(value: any, maxMarks = 5) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0 || parsed > maxMarks) return null;
  return parsed;
}

function isMissingFinalMarksTableError(error: any) {
  const message = String(error?.message || "");
  return message.includes("evaluation_final_marks") && (
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("Could not find the table")
  );
}

function isMissingStudentMarksColumnError(error: any) {
  const message = String(error?.message || "");
  return message.includes("student_marks") && (
    message.includes("assignment_marks") ||
    message.includes("assignment_total") ||
    message.includes("assignment_co_map") ||
    message.includes("grand_total")
  ) && (
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("Could not find")
  );
}

function evaluationTotal(descriptive: any[], mcq: any[], fb: any[], assignment: any[]) {
  return bestFourDescriptiveTotal(descriptive) + objectiveSectionTotal(mcq || []) + objectiveSectionTotal(fb || []) + assignmentSectionTotal(assignment || []);
}

export function createEvaluationRouter(supabase: SupabaseClient) {
  const router = express.Router();

  function canHodAccessDepartment(hodDept: string, targetDept: string) {
    return hodDept === targetDept;
  }

  async function facultyHasAssignedSubject(input: {
    faculty_id: string;
    department: string;
    branch?: string;
    regulation: string;
    year: string;
    semester?: string;
    subject_code: string;
  }) {
    let query = supabase
      .from("faculty_subjects")
      .select("id", { head: true, count: "exact" })
      .eq("faculty_id", String(input.faculty_id || "").trim())
      .eq("department", String(input.department || "").trim())
      .eq("regulation", normalizeReg(input.regulation))
      .eq("year", normalizeYear(input.year))
      .eq("subject_code", String(input.subject_code || "").trim().toUpperCase());

    const semester = normalizeSemester(input.semester);
    if (semester) query = query.eq("semester", semester);

    const { count, error } = await query;
    if (error) throw new Error(error.message);
    if (Number(count || 0) > 0) return true;

    // Older assignments used a blank branch for core departments. Keep accepting
    // those rows so Faculty save/submit does not fail after the branch model change.
    const department = String(input.department || "").trim();
    const legacyBranch = department === "H&S" ? String(input.branch || "").trim().toUpperCase() : "";
    let legacyQuery = supabase
      .from("faculty_subjects")
      .select("id", { head: true, count: "exact" })
      .eq("faculty_id", String(input.faculty_id || "").trim())
      .eq("department", department)
      .eq("branch", legacyBranch)
      .eq("regulation", normalizeReg(input.regulation))
      .eq("year", normalizeYear(input.year))
      .eq("subject_code", String(input.subject_code || "").trim().toUpperCase());
    if (semester) legacyQuery = legacyQuery.eq("semester", semester);

    const { count: legacyCount, error: legacyError } = await legacyQuery;
    if (legacyError) throw new Error(legacyError.message);
    return Number(legacyCount || 0) > 0;
  }

  async function fetchSubmittedMidEvaluations(input: {
    department: string;
    branch: string;
    regulation: string;
    year: string;
    section: string;
    subject_code: string;
  }) {
    const { data, error } = await supabase
      .from("evaluations")
      .select("id,mid_type,status,submitted_at")
      .eq("department", input.department)
      .eq("branch", input.branch)
      .eq("regulation", input.regulation)
      .eq("year", input.year)
      .eq("section", input.section)
      .eq("subject_code", input.subject_code)
      .in("mid_type", ["Mid I", "Mid II", "Mid1", "Mid2"]);

    if (error) throw new Error(error.message);

    const byMid = new Map<string, any>();
    for (const row of data || []) {
      const key = normalizeMidType(row.mid_type);
      const existing = byMid.get(key);
      if (!existing || String(row.submitted_at || "") > String(existing.submitted_at || "")) {
        byMid.set(key, row);
      }
    }

    return {
      mid1: byMid.get("Mid I") || null,
      mid2: byMid.get("Mid II") || null,
    };
  }

  async function fetchStudentTotalsByEvaluationId(evaluationId: string) {
    const { data, error } = await supabase
      .from("student_marks")
      .select("roll_number,student_name,total_marks")
      .eq("evaluation_id", evaluationId);

    if (error) throw new Error(error.message);

    const totals = new Map<string, { student_name: string; total: number }>();
    for (const row of data || []) {
      totals.set(String(row.roll_number || "").trim(), {
        student_name: String(row.student_name || "").trim(),
        total: Number(row.total_marks ?? 0),
      });
    }
    return totals;
  }

  async function buildFinalMarksState(input: {
    department: string;
    branch: string;
    regulation: string;
    year: string;
    semester: string;
    section: string;
    subject_code: string;
  }) {
    const mids = await fetchSubmittedMidEvaluations(input);
    const mid1Submitted = mids.mid1?.status === "submitted";
    const mid2Submitted = mids.mid2?.status === "submitted";
    const canEnterPpt = mid1Submitted && mid2Submitted;

    const mid1Totals = mids.mid1?.id ? await fetchStudentTotalsByEvaluationId(mids.mid1.id) : new Map<string, { student_name: string; total: number }>();
    const mid2Totals = mids.mid2?.id ? await fetchStudentTotalsByEvaluationId(mids.mid2.id) : new Map<string, { student_name: string; total: number }>();

    const { data: finalRowsData, error: finalError } = await supabase
      .from("evaluation_final_marks")
      .select("*")
      .eq("department", input.department)
      .eq("branch", input.branch)
      .eq("regulation", input.regulation)
      .eq("year", input.year)
      .eq("semester", input.semester)
      .eq("section", input.section)
      .eq("subject_code", input.subject_code)
      .order("roll_number", { ascending: true });

    if (finalError && !isMissingFinalMarksTableError(finalError)) throw new Error(finalError.message);
    const finalRows = isMissingFinalMarksTableError(finalError) ? [] : (finalRowsData || []);

    const finalByRoll = new Map<string, any>();
    for (const row of finalRows) finalByRoll.set(String(row.roll_number || "").trim(), row);

    const rolls = Array.from(new Set([
      ...Array.from(mid1Totals.keys()),
      ...Array.from(mid2Totals.keys()),
      ...Array.from(finalByRoll.keys()),
    ])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    const rows = rolls.map((roll_number) => {
      const mid1 = mid1Totals.get(roll_number);
      const mid2 = mid2Totals.get(roll_number);
      const finalRow = finalByRoll.get(roll_number);
      const pptMarks = Number(finalRow?.ppt_marks ?? 0);
      const mid1Total = Number(finalRow?.mid1_total ?? mid1?.total ?? 0);
      const mid2Total = Number(finalRow?.mid2_total ?? mid2?.total ?? 0);
      return {
        roll_number,
        student_name: String(finalRow?.student_name || mid1?.student_name || mid2?.student_name || "").trim(),
        mid1_total: mid1Total,
        mid2_total: mid2Total,
        ppt_marks: pptMarks,
        ppt_max_marks: Number(finalRow?.ppt_max_marks ?? 5),
        final_total: Number(finalRow?.final_total ?? (mid1Total + mid2Total + pptMarks)),
        status: String(finalRow?.status || "draft"),
      };
    });

    return {
      mid1Submitted,
      mid2Submitted,
      canEnterPpt,
      finalSubmitted: rows.length > 0 && rows.every((row) => row.status === "submitted"),
      rows,
    };
  }

  function buildStudentListId(department: string, branch: string, regulation: string, year: string, semester: string, section: string) {
    return `${department}:${branch}:${regulation}:${year}:${semester}:${section}`;
  }

  function buildStudentListFileName(list: { regulation: string; year: string; semester: string; section: string; branch: string }) {
    const parts = ["students", list.regulation, list.year];
    if (list.semester) parts.push(list.semester);
    if (list.branch) parts.push(list.branch);
    parts.push(list.section);
    return `${parts.join("_")}.csv`;
  }

  async function fetchStudentListRows(input: {
    department: string;
    branch: string;
    regulation: string;
    year: string;
    semester: string;
    section: string;
  }) {
    const baseQuery = () =>
      supabase
        .from("students")
        .select("roll_number,student_name,department,branch,regulation,year,semester,section,uploaded_by,uploaded_at")
        .eq("department", input.department)
        .eq("branch", input.branch)
        .eq("regulation", input.regulation)
        .eq("year", input.year)
        .eq("section", input.section)
        .order("roll_number", { ascending: true });

    const { data: exactRows, error: exactErr } = await baseQuery().eq("semester", input.semester);
    if (exactErr) throw new Error(exactErr.message);
    if ((exactRows || []).length) {
      return { rows: exactRows || [], matchedSemester: input.semester, usedLegacyFallback: false };
    }

    // Backward compatibility for older uploaded lists saved before semester was enforced.
    const { data: legacyRows, error: legacyErr } = await baseQuery().eq("semester", "");
    if (legacyErr) throw new Error(legacyErr.message);
    if ((legacyRows || []).length) {
      return {
        rows: legacyRows || [],
        matchedSemester: input.semester,
        usedLegacyFallback: true,
      };
    }

    // HOD review can open old evaluation rows that did not store semester.
    // If the requested semester is wrong, fall back to the uploaded list for the same class.
    const { data: anySemesterRows, error: anySemesterErr } = await baseQuery();
    if (anySemesterErr) throw new Error(anySemesterErr.message);
    const matchedSemester = String(anySemesterRows?.[0]?.semester || input.semester).trim();
    return {
      rows: anySemesterRows || [],
      matchedSemester,
      usedLegacyFallback: true,
    };
  }

  async function checkStudentListAvailability(input: {
    department: string;
    branch: string;
    regulation: string;
    year: string;
    semester: string;
    section: string;
  }) {
    const exact = await supabase
      .from("students")
      .select("id", { head: true, count: "exact" })
      .eq("department", input.department)
      .eq("branch", input.branch)
      .eq("regulation", input.regulation)
      .eq("year", input.year)
      .eq("semester", input.semester)
      .eq("section", input.section);

    if (exact.error) throw new Error(exact.error.message);
    const exactCount = Number(exact.count || 0);
    if (exactCount > 0) return { exists: true, count: exactCount, usedLegacyFallback: false };

    const legacy = await supabase
      .from("students")
      .select("id", { head: true, count: "exact" })
      .eq("department", input.department)
      .eq("branch", input.branch)
      .eq("regulation", input.regulation)
      .eq("year", input.year)
      .eq("semester", "")
      .eq("section", input.section);

    if (legacy.error) throw new Error(legacy.error.message);
    return { exists: Number(legacy.count || 0) > 0, count: Number(legacy.count || 0), usedLegacyFallback: true };
  }

  function summarizeStudentLists(rows: any[]): StudentListSummary[] {
    const grouped = new Map<string, StudentListSummary>();

    for (const row of rows || []) {
      const department = String(row.department || "").trim();
      const branch = String(row.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(row.regulation);
      const year = normalizeYear(row.year);
      const semester = normalizeSemester(row.semester);
      const section = normalizeSection(row.section);
      const id = buildStudentListId(department, branch, regulation, year, semester, section);

      const existing = grouped.get(id);
      if (!existing) {
        grouped.set(id, {
          id,
          department,
          branch,
          regulation,
          year,
          semester,
          section,
          uploaded_by: String(row.uploaded_by || "").trim(),
          uploaded_at: String(row.uploaded_at || "").trim(),
          file_name: buildStudentListFileName({ regulation, year, semester, section, branch }),
          count: 1,
        });
        continue;
      }

      existing.count += 1;
      if (String(row.uploaded_at || "") >= existing.uploaded_at) {
        existing.uploaded_at = String(row.uploaded_at || "").trim();
        existing.uploaded_by = String(row.uploaded_by || "").trim();
      }
    }

    return Array.from(grouped.values()).sort((a, b) => String(b.uploaded_at || "").localeCompare(String(a.uploaded_at || "")));
  }

  // HOD uploads a student list for their department (reg/year/section).
  router.post("/api/eval/student-lists", async (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const hod_faculty_id = String(body.hod_faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear(body.year);
      const semester = normalizeSemester(body.semester);
      const section = normalizeSection(body.section);
      const students = Array.isArray(body.students) ? (body.students as any[]) : [];

      if (!hod_faculty_id) return res.status(400).json({ error: "hod_faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!students.length) return res.status(400).json({ error: "students are required" });

      const hodCheck = await requireUserByFacultyId(supabase, hod_faculty_id);
      if (!hodCheck.ok) return res.status(hodCheck.status).json({ error: hodCheck.error });
      const hod = hodCheck.user;
      if (hod.role !== "HOD") return res.status(403).json({ error: "Only HOD can upload student lists" });
      if (!canHodAccessDepartment(String(hod.department || "").trim(), department)) return res.status(403).json({ error: "HOD department mismatch" });

      if (department === "H&S") {
        if (!branch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S uploads are allowed only for year I" });
      }

      const cleanStudents: StudentRow[] = [];
      for (const s of students) {
        const roll = String(s?.roll_number || s?.roll || "").trim();
        const name = String(s?.student_name || s?.name || "").trim();
        if (!roll || !name) continue;
        cleanStudents.push({ roll_number: roll, student_name: name });
      }
      if (!cleanStudents.length) return res.status(400).json({ error: "No valid students found" });

      const effectiveBranch = department === "H&S" ? branch : "";
      const uploadedAt = new Date().toISOString();

      const { error: delErr } = await supabase
        .from("students")
        .delete()
        .eq("department", department)
        .eq("branch", effectiveBranch)
        .eq("regulation", regulation)
        .eq("year", year)
        .eq("semester", semester)
        .eq("section", section);

      if (delErr) return res.status(400).json({ error: delErr.message });

      const toInsert = cleanStudents.map((s) => ({
        roll_number: s.roll_number,
        student_name: s.student_name,
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester: semester || "",
        section,
        uploaded_by: hod_faculty_id,
        uploaded_at: uploadedAt,
      }));

      const { error: insErr, count } = await supabase.from("students").insert(toInsert, { count: "exact" });
      if (insErr) return res.status(400).json({ error: insErr.message });

      res.json({
        success: true,
        list_id: buildStudentListId(department, effectiveBranch, regulation, year, semester || "", section),
        count: typeof count === "number" ? count : cleanStudents.length,
      });
    } catch (error: any) {
      console.error("Student list upload error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Faculty/HOD fetches student list.
  router.get("/api/eval/student-lists", async (req, res) => {
    try {
      const department = String(req.query.department || "").trim();
      const branch = String(req.query.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(req.query.regulation);
      const year = normalizeYear(req.query.year);
      const semester = normalizeSemester(req.query.semester);
      const section = normalizeSection(req.query.section);

      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });

      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S" && !effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });

      const { rows, matchedSemester } = await fetchStudentListRows({
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        section,
      });
      if (!rows || rows.length === 0) return res.status(404).json({ error: "Student list not found" });

      let uploaded_by = rows[0].uploaded_by || "";
      let uploaded_at = rows[0].uploaded_at || "";
      for (const r of rows) {
        if (r.uploaded_at && (!uploaded_at || String(r.uploaded_at) > String(uploaded_at))) {
          uploaded_at = r.uploaded_at;
          uploaded_by = r.uploaded_by || uploaded_by;
        }
      }

      const students: StudentRow[] = rows.map((r: any) => ({ roll_number: r.roll_number, student_name: r.student_name }));
      res.json({
        success: true,
        matchedSemester,
        list: {
          id: buildStudentListId(department, effectiveBranch, regulation, year, matchedSemester, section),
          department,
          branch: effectiveBranch,
          regulation,
          year,
          semester: matchedSemester,
          section,
          uploaded_by,
          uploaded_at,
          students,
        },
      });
    } catch (error: any) {
      console.error("Student list fetch error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.get("/api/eval/student-lists/manage", async (req, res) => {
    try {
      const hod_faculty_id = String(req.query.hod_faculty_id || "").trim();
      if (!hod_faculty_id) return res.status(400).json({ error: "hod_faculty_id is required" });

      const hodCheck = await requireUserByFacultyId(supabase, hod_faculty_id);
      if (!hodCheck.ok) return res.status(hodCheck.status).json({ error: hodCheck.error });
      const hod = hodCheck.user;
      if (hod.role !== "HOD") return res.status(403).json({ error: "Only HOD can manage student lists" });

      const { data: rows, error } = await supabase
        .from("students")
        .select("department,branch,regulation,year,semester,section,uploaded_by,uploaded_at")
        .eq("department", String(hod.department || "").trim())
        .order("uploaded_at", { ascending: false });

      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, lists: summarizeStudentLists(rows || []) });
    } catch (error: any) {
      console.error("Student list management fetch error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.get("/api/eval/student-lists/availability", async (req, res) => {
    try {
      const department = String(req.query.department || "").trim();
      const branch = String(req.query.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(req.query.regulation);
      const year = normalizeYear(req.query.year);
      const semester = normalizeSemester(req.query.semester);
      const section = normalizeSection(req.query.section);

      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });

      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S" && !effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });

      const availability = await checkStudentListAvailability({
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        section,
      });
      res.json({ success: true, exists: availability.exists, count: availability.count });
    } catch (error: any) {
      console.error("Student list availability error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.delete("/api/eval/student-lists", async (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const hod_faculty_id = String(body.hod_faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear(body.year);
      const semester = normalizeSemester(body.semester);
      const section = normalizeSection(body.section);

      if (!hod_faculty_id) return res.status(400).json({ error: "hod_faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!section) return res.status(400).json({ error: "section is required" });

      const hodCheck = await requireUserByFacultyId(supabase, hod_faculty_id);
      if (!hodCheck.ok) return res.status(hodCheck.status).json({ error: hodCheck.error });
      const hod = hodCheck.user;
      if (hod.role !== "HOD") return res.status(403).json({ error: "Only HOD can delete student lists" });
      if (!canHodAccessDepartment(String(hod.department || "").trim(), department)) return res.status(403).json({ error: "HOD department mismatch" });

      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S" && !effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });

      const runDelete = async (semesterValue: string) =>
        supabase
          .from("students")
          .delete({ count: "exact" })
          .eq("department", department)
          .eq("branch", effectiveBranch)
          .eq("regulation", regulation)
          .eq("year", year)
          .eq("semester", semesterValue)
          .eq("section", section);

      let deletedCount = 0;

      if (semester) {
        const { error, count } = await runDelete(semester);
        if (error) return res.status(400).json({ error: error.message });
        deletedCount += Number(count || 0);
      } else {
        const { error, count } = await runDelete("");
        if (error) return res.status(400).json({ error: error.message });
        deletedCount += Number(count || 0);
      }

      res.json({ success: true, deleted: deletedCount });
    } catch (error: any) {
      console.error("Student list delete error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Faculty/HOD saves marks (batch upsert per student).
  router.post("/api/eval/marks/batch", async (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const faculty_id = String(body.faculty_id || "").trim();
      const actor_id = String(body.actor_id || faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear(body.year);
      const semester = normalizeSemester(body.semester);
      const section = normalizeSection(body.section);
      const mid_type = String(body.mid_type || "").trim();
      const subject_name = String(body.subject_name || "").trim();
      const subject_code = String(body.subject_code || "").trim().toUpperCase();
      const assignment_co_map = normalizeAssignmentCoMap(body.assignment_co_map || {});
      const entries = Array.isArray(body.entries) ? (body.entries as any[]) : [];

      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!mid_type) return res.status(400).json({ error: "mid_type is required" });
      if (!subject_name) return res.status(400).json({ error: "subject_name is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });
      if (!entries.length) return res.status(400).json({ error: "entries are required" });

      const actorCheck = await requireUserByFacultyId(supabase, actor_id);
      if (!actorCheck.ok) return res.status(actorCheck.status).json({ error: actorCheck.error });
      const actor = actorCheck.user;

      const targetCheck = await requireUserByFacultyId(supabase, faculty_id);
      if (!targetCheck.ok) return res.status(targetCheck.status).json({ error: targetCheck.error });

      if (actor.role !== "FACULTY" && actor.role !== "HOD") return res.status(403).json({ error: "Only Faculty/HOD can save marks" });
      if (actor.role === "FACULTY" && actor.faculty_id !== faculty_id) return res.status(403).json({ error: "Faculty can only edit their own marks" });
      if (actor.role === "HOD" && !canHodAccessDepartment(String(actor.department || "").trim(), department)) return res.status(403).json({ error: "HOD department mismatch" });

      if (department === "H&S") {
        if (!branch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S marks are allowed only for year I" });
      }

      const effectiveBranch = department === "H&S" ? branch : "";
      const hasAssignedSubject = await facultyHasAssignedSubject({
        faculty_id,
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        subject_code,
      });
      if (!hasAssignedSubject) return res.status(403).json({ error: "Faculty subject allocation mismatch" });
      const now = new Date().toISOString();

      const { data: existingEval, error: findErr } = await supabase
        .from("evaluations")
        .select("id,status,submitted_at")
        .eq("department", department)
        .eq("branch", effectiveBranch)
        .eq("regulation", regulation)
        .eq("year", year)
        .eq("section", section)
        .eq("mid_type", mid_type)
        .eq("subject_code", subject_code)
        .maybeSingle();

      if (findErr) return res.status(400).json({ error: findErr.message });

      let evaluationId = existingEval?.id as string | undefined;
      if (!evaluationId) {
        const { data: created, error: createErr } = await supabase
          .from("evaluations")
          .insert({
            faculty_id,
            department,
            branch: effectiveBranch,
            regulation,
            year,
            section,
            mid_type,
            subject_name,
            subject_code,
            status: "draft",
            created_at: now,
            updated_at: now,
          })
          .select("id")
          .single();
        if (createErr) return res.status(400).json({ error: createErr.message });
        evaluationId = created.id;
      } else {
        await supabase
          .from("evaluations")
          .update({ faculty_id, subject_name, updated_at: now })
          .eq("id", evaluationId);
      }

      const rows: any[] = [];
      for (const e of entries) {
        const roll_number = String(e?.roll_number || "").trim();
        const student_name = String(e?.student_name || "").trim();
        if (!roll_number || !student_name) continue;

        const d = Array.isArray(e.descriptive_marks) ? e.descriptive_marks : [];
        const m = Array.isArray(e.mcq_marks) ? e.mcq_marks : [];
        const f = Array.isArray(e.fb_marks) ? e.fb_marks : [];
        const assignmentMarksObject = normalizeAssignmentMarksObject(e.assignment_marks || {});
        const assignmentValues = Array.from({ length: 5 }, (_, i) => assignmentMarksObject[`A${i + 1}`] ?? 0);
        const assignmentTotal = assignmentSectionTotal(assignmentValues);
        const total = evaluationTotal(d, m, f, assignmentValues);

        rows.push({
          evaluation_id: evaluationId,
          roll_number,
          student_name,
          q1: normalizeDescriptiveMark(d[0]),
          q2: normalizeDescriptiveMark(d[1]),
          q3: normalizeDescriptiveMark(d[2]),
          q4: normalizeDescriptiveMark(d[3]),
          q5: normalizeDescriptiveMark(d[4]),
          q6: normalizeDescriptiveMark(d[5]),
          mcq1: normalizeObjectiveMark(m[0]),
          mcq2: normalizeObjectiveMark(m[1]),
          mcq3: normalizeObjectiveMark(m[2]),
          mcq4: normalizeObjectiveMark(m[3]),
          mcq5: normalizeObjectiveMark(m[4]),
          mcq6: normalizeObjectiveMark(m[5]),
          mcq7: normalizeObjectiveMark(m[6]),
          mcq8: normalizeObjectiveMark(m[7]),
          mcq9: normalizeObjectiveMark(m[8]),
          mcq10: normalizeObjectiveMark(m[9]),
          fb1: normalizeObjectiveMark(f[0]),
          fb2: normalizeObjectiveMark(f[1]),
          fb3: normalizeObjectiveMark(f[2]),
          fb4: normalizeObjectiveMark(f[3]),
          fb5: normalizeObjectiveMark(f[4]),
          fb6: normalizeObjectiveMark(f[5]),
          fb7: normalizeObjectiveMark(f[6]),
          fb8: normalizeObjectiveMark(f[7]),
          fb9: normalizeObjectiveMark(f[8]),
          fb10: normalizeObjectiveMark(f[9]),
          assignment_marks: assignmentMarksObject,
          assignment_total: assignmentTotal,
          assignment_co_map: assignment_co_map,
          total_marks: total,
          updated_at: now,
        });
      }

      if (!rows.length) return res.status(400).json({ error: "No valid entries found" });

      const { error: upErr } = await supabase.from("student_marks").upsert(rows, { onConflict: "evaluation_id,roll_number" });
      if (upErr && isMissingStudentMarksColumnError(upErr)) {
        const legacyRows = rows.map((row) => {
          const { assignment_marks, assignment_total, assignment_co_map, grand_total, ...legacyRow } = row;
          void assignment_marks;
          void assignment_total;
          void assignment_co_map;
          void grand_total;
          return legacyRow;
        });
        const { error: legacyUpErr } = await supabase.from("student_marks").upsert(legacyRows, { onConflict: "evaluation_id,roll_number" });
        if (legacyUpErr) return res.status(400).json({ error: legacyUpErr.message });
      } else if (upErr) {
        return res.status(400).json({ error: upErr.message });
      }

      await supabase.from("evaluations").update({ updated_at: now }).eq("id", evaluationId);

      res.json({ success: true, saved: rows.length });
    } catch (error: any) {
      console.error("Marks save error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Fetch marks for an already-started entry.
  router.get("/api/eval/marks", async (req, res) => {
    try {
      const department = String(req.query.department || "").trim();
      const branch = String(req.query.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(req.query.regulation);
      const year = normalizeYear(req.query.year);
      const section = normalizeSection(req.query.section);
      const mid_type = String(req.query.mid_type || "").trim();
      const subject_code = String(req.query.subject_code || "").trim().toUpperCase();

      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!mid_type) return res.status(400).json({ error: "mid_type is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });

      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S") {
        if (!effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S marks are only for year I" });
      }

      const { data: evaluation, error: eErr } = await supabase
        .from("evaluations")
        .select("id")
        .eq("department", department)
        .eq("branch", effectiveBranch)
        .eq("regulation", regulation)
        .eq("year", year)
        .eq("section", section)
        .eq("mid_type", mid_type)
        .eq("subject_code", subject_code)
        .maybeSingle();

      if (eErr) return res.status(400).json({ error: eErr.message });
      if (!evaluation) return res.json({ success: true, marks: [] });

      const { data: rows, error } = await supabase
        .from("student_marks")
        .select("*")
        .eq("evaluation_id", evaluation.id)
        .order("roll_number", { ascending: true });

      if (error) return res.status(400).json({ error: error.message });

      const assignmentCoMap =
        rows?.find((r: any) => r.assignment_co_map && typeof r.assignment_co_map === "object")?.assignment_co_map || normalizeAssignmentCoMap({});

      res.json({
        success: true,
        assignment_co_map: assignmentCoMap,
        marks: (rows || []).map((r: any) => ({
          roll_number: r.roll_number,
          student_name: r.student_name || "",
          descriptive_marks: [r.q1, r.q2, r.q3, r.q4, r.q5, r.q6].map((v: any) => (v === null || v === undefined ? null : Number(v))),
          mcq_marks: [r.mcq1, r.mcq2, r.mcq3, r.mcq4, r.mcq5, r.mcq6, r.mcq7, r.mcq8, r.mcq9, r.mcq10].map((v: any) => (v === null || v === undefined ? null : Number(v))),
          fb_marks: [r.fb1, r.fb2, r.fb3, r.fb4, r.fb5, r.fb6, r.fb7, r.fb8, r.fb9, r.fb10].map((v: any) => (v === null || v === undefined ? null : Number(v))),
          assignment_marks: normalizeAssignmentMarksObject(r.assignment_marks || {}),
          assignment_total: Number(r.assignment_total || 0),
          grand_total: Number(r.grand_total ?? r.total_marks ?? 0),
        })),
      });
    } catch (error: any) {
      console.error("Marks fetch error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.get("/api/eval/final-marks", async (req, res) => {
    try {
      const department = String(req.query.department || "").trim();
      const branch = String(req.query.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(req.query.regulation);
      const year = normalizeYear(req.query.year);
      const semester = normalizeSemester(req.query.semester);
      const section = normalizeSection(req.query.section);
      const subject_code = String(req.query.subject_code || "").trim().toUpperCase();

      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });

      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S" && !effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });

      const state = await buildFinalMarksState({
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        section,
        subject_code,
      });

      res.json({ success: true, ...state, pptMaxMarks: state.rows[0]?.ppt_max_marks ?? 5 });
    } catch (error: any) {
      console.error("Final marks fetch error:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  router.post("/api/eval/final-marks/save", async (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const faculty_id = String(body.faculty_id || "").trim();
      const actor_id = String(body.actor_id || faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear(body.year);
      const semester = normalizeSemester(body.semester);
      const section = normalizeSection(body.section);
      const subject_name = String(body.subject_name || "").trim();
      const subject_code = String(body.subject_code || "").trim().toUpperCase();
      const pptMaxMarks = Number(body.ppt_max_marks ?? 5);
      const entries = Array.isArray(body.entries) ? body.entries : [];

      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!subject_name) return res.status(400).json({ error: "subject_name is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });
      if (!entries.length) return res.status(400).json({ error: "entries are required" });
      if (!Number.isFinite(pptMaxMarks) || pptMaxMarks <= 0) return res.status(400).json({ error: "ppt_max_marks must be greater than 0" });

      const actorCheck = await requireUserByFacultyId(supabase, actor_id);
      if (!actorCheck.ok) return res.status(actorCheck.status).json({ error: actorCheck.error });
      const actor = actorCheck.user;
      if (actor.role !== "FACULTY" && actor.role !== "HOD") return res.status(403).json({ error: "Only Faculty/HOD can save final marks" });
      if (actor.role === "FACULTY" && actor.faculty_id !== faculty_id) return res.status(403).json({ error: "Faculty can only edit their own final marks" });
      if (actor.role === "HOD" && !canHodAccessDepartment(String(actor.department || "").trim(), department)) return res.status(403).json({ error: "HOD department mismatch" });

      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S") {
        if (!effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S marks are allowed only for year I" });
      }

      const hasAssignedSubject = await facultyHasAssignedSubject({
        faculty_id,
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        subject_code,
      });
      if (!hasAssignedSubject) return res.status(403).json({ error: "Faculty subject allocation mismatch" });

      const state = await buildFinalMarksState({
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        section,
        subject_code,
      });
      if (!state.canEnterPpt) {
        return res.status(400).json({ error: "PPT marks can be entered only after Mid 1 and Mid 2 submission." });
      }

      const stateByRoll = new Map(state.rows.map((row) => [row.roll_number, row]));
      const now = new Date().toISOString();
      const rows = [];
      for (const entry of entries) {
        const roll_number = String(entry?.roll_number || "").trim();
        const student_name = String(entry?.student_name || "").trim();
        if (!roll_number || !student_name) continue;
        const prior = stateByRoll.get(roll_number);
        const pptMarks = normalizePptMark(entry?.ppt_marks, pptMaxMarks);
        if (pptMarks === null) return res.status(400).json({ error: `Invalid PPT marks for ${roll_number}` });
        const mid1Total = Number(prior?.mid1_total ?? 0);
        const mid2Total = Number(prior?.mid2_total ?? 0);
        rows.push({
          faculty_id,
          department,
          branch: effectiveBranch,
          regulation,
          year,
          semester,
          section,
          subject_name,
          subject_code,
          roll_number,
          student_name,
          mid1_total: mid1Total,
          mid2_total: mid2Total,
          ppt_marks: pptMarks ?? 0,
          ppt_max_marks: pptMaxMarks,
          final_total: mid1Total + mid2Total + (pptMarks ?? 0),
          status: "draft",
          submitted_at: null,
          updated_at: now,
        });
      }

      if (!rows.length) return res.status(400).json({ error: "No valid PPT rows found" });

      const { error } = await supabase
        .from("evaluation_final_marks")
        .upsert(rows, { onConflict: "department,branch,regulation,year,semester,section,subject_code,roll_number" });

      if (error && isMissingFinalMarksTableError(error)) {
        return res.status(400).json({ error: "PPT final marks table is missing. Run database/migrations/2026-04-06-add-evaluation-final-marks.sql before saving PPT marks." });
      }
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, saved: rows.length });
    } catch (error: any) {
      console.error("Final marks save error:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  router.post("/api/eval/final-marks/submit", async (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const faculty_id = String(body.faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear(body.year);
      const semester = normalizeSemester(body.semester);
      const section = normalizeSection(body.section);
      const subject_code = String(body.subject_code || "").trim().toUpperCase();

      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });

      const userCheck = await requireUserByFacultyId(supabase, faculty_id);
      if (!userCheck.ok) return res.status(userCheck.status).json({ error: userCheck.error });
      const user = userCheck.user;
      if (user.role !== "FACULTY") return res.status(403).json({ error: "Only Faculty can submit final marks" });

      const effectiveBranch = department === "H&S" ? branch : "";
      const state = await buildFinalMarksState({
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        section,
        subject_code,
      });
      if (!state.canEnterPpt) return res.status(400).json({ error: "PPT marks can be entered only after Mid 1 and Mid 2 submission." });
      if (!state.rows.length) return res.status(400).json({ error: "Save PPT marks before submitting final marks." });

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("evaluation_final_marks")
        .update({ status: "submitted", submitted_at: now, updated_at: now })
        .eq("department", department)
        .eq("branch", effectiveBranch)
        .eq("regulation", regulation)
        .eq("year", year)
        .eq("semester", semester)
        .eq("section", section)
        .eq("subject_code", subject_code);

      if (error && isMissingFinalMarksTableError(error)) {
        return res.status(400).json({ error: "PPT final marks table is missing. Run database/migrations/2026-04-06-add-evaluation-final-marks.sql before submitting final marks." });
      }
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Final marks submit error:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  // Faculty submits marks for HOD review.
  router.post("/api/eval/submit", async (req, res) => {
    try {
      const body = (req.body || {}) as any;
      const faculty_id = String(body.faculty_id || "").trim();
      const department = String(body.department || "").trim();
      const branch = String(body.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(body.regulation);
      const year = normalizeYear(body.year);
      const semester = normalizeSemester(body.semester);
      const section = normalizeSection(body.section);
      const mid_type = String(body.mid_type || "").trim();
      const subject_name = String(body.subject_name || "").trim();
      const subject_code = String(body.subject_code || "").trim().toUpperCase();

      if (!faculty_id) return res.status(400).json({ error: "faculty_id is required" });
      if (!department) return res.status(400).json({ error: "department is required" });
      if (!regulation) return res.status(400).json({ error: "regulation is required" });
      if (!year) return res.status(400).json({ error: "year is required" });
      if (!semester) return res.status(400).json({ error: "semester is required" });
      if (!section) return res.status(400).json({ error: "section is required" });
      if (!mid_type) return res.status(400).json({ error: "mid_type is required" });
      if (!subject_name) return res.status(400).json({ error: "subject_name is required" });
      if (!subject_code) return res.status(400).json({ error: "subject_code is required" });

      const userCheck = await requireUserByFacultyId(supabase, faculty_id);
      if (!userCheck.ok) return res.status(userCheck.status).json({ error: userCheck.error });
      const user = userCheck.user;

      if (user.role !== "FACULTY") return res.status(403).json({ error: "Only Faculty can submit evaluations" });

      const effectiveBranch = department === "H&S" ? branch : "";
      if (department === "H&S") {
        if (!effectiveBranch) return res.status(400).json({ error: "branch is required for H&S" });
        if (year !== "I") return res.status(400).json({ error: "H&S submissions are only for year I" });
      }

      const hasAssignedSubject = await facultyHasAssignedSubject({
        faculty_id,
        department,
        branch: effectiveBranch,
        regulation,
        year,
        semester,
        subject_code,
      });
      if (!hasAssignedSubject) return res.status(403).json({ error: "Faculty subject allocation mismatch" });

      const { data: evaluation, error: eErr } = await supabase
        .from("evaluations")
        .select("id")
        .eq("department", department)
        .eq("branch", effectiveBranch)
        .eq("regulation", regulation)
        .eq("year", year)
        .eq("section", section)
        .eq("mid_type", mid_type)
        .eq("subject_code", subject_code)
        .maybeSingle();

      if (eErr) return res.status(400).json({ error: eErr.message });
      if (!evaluation) return res.status(400).json({ error: "No marks saved yet. Please save marks before submitting." });

      const { count, error: countErr } = await supabase.from("student_marks").select("id", { count: "exact", head: true }).eq("evaluation_id", evaluation.id);
      if (countErr) return res.status(400).json({ error: countErr.message });
      if (!count) return res.status(400).json({ error: "No marks saved yet. Please save marks before submitting." });

      const now = new Date().toISOString();
      const { error: updErr } = await supabase
        .from("evaluations")
        .update({ status: "submitted", submitted_at: now, updated_at: now, faculty_id, subject_name })
        .eq("id", evaluation.id);

      if (updErr) return res.status(400).json({ error: updErr.message });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Submit error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // HOD lists submitted evaluations for their department.
  router.get("/api/eval/submissions", async (req, res) => {
    try {
      const hod_faculty_id = String(req.query.hod_faculty_id || "").trim();
      const department = String(req.query.department || "").trim();
      const branch = String(req.query.branch || "").trim().toUpperCase();
      const regulation = normalizeReg(req.query.regulation);
      const year = normalizeYear(req.query.year);
      const section = normalizeSection(req.query.section);
      const mid_type = String(req.query.mid_type || "").trim();
      const subject_code = String(req.query.subject_code || "").trim().toUpperCase();

      if (!hod_faculty_id) return res.status(400).json({ error: "hod_faculty_id is required" });

      const hodCheck = await requireUserByFacultyId(supabase, hod_faculty_id);
      if (!hodCheck.ok) return res.status(hodCheck.status).json({ error: hodCheck.error });
      const hod = hodCheck.user;
      if (hod.role !== "HOD") return res.status(403).json({ error: "Only HOD can view submissions" });

      const hodDept = String(hod.department || "").trim();
      const targetDept = department || hodDept;
      if (!canHodAccessDepartment(hodDept, targetDept)) return res.status(403).json({ error: "HOD department mismatch" });

      let q = supabase.from("evaluations").select("*").eq("department", targetDept).eq("status", "submitted");

      if (targetDept === "H&S") {
        q = q.eq("year", "I");
        if (branch) q = q.eq("branch", branch);
      } else {
        q = q.eq("branch", "");
      }

      if (regulation) q = q.eq("regulation", regulation);
      if (year) q = q.eq("year", year);
      if (section) q = q.eq("section", section);
      if (mid_type) q = q.eq("mid_type", mid_type);
      if (subject_code) q = q.eq("subject_code", subject_code);

      q = q.order("submitted_at", { ascending: false }).order("updated_at", { ascending: false });

      const { data: rows, error } = await q;
      if (error) return res.status(400).json({ error: error.message });

      const facultyIds = Array.from(new Set((rows || []).map((r: any) => r.faculty_id).filter(Boolean)));
      const facultyMap = new Map<string, string>();
      if (facultyIds.length) {
        const { data: users } = await supabase.from("users").select("faculty_id,name").in("faculty_id", facultyIds);
        for (const u of users || []) facultyMap.set(u.faculty_id, u.name);
      }

      res.json({
        success: true,
        submissions: (rows || []).map((r: any) => ({
          id: r.id,
          faculty_id: r.faculty_id,
          faculty_name: facultyMap.get(r.faculty_id) || "",
          department: r.department,
          branch: r.branch || "",
          regulation: r.regulation,
          year: r.year,
          section: r.section,
          mid_type: r.mid_type,
          subject_name: r.subject_name,
          subject_code: r.subject_code,
          status: r.status,
          submitted_at: r.submitted_at,
          updated_at: r.updated_at,
        })),
      });
    } catch (error: any) {
      console.error("Submissions list error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
