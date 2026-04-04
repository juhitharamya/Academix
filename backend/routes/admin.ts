import express from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapRoleApiToDb, mapRoleDbToApi, requireUserByFacultyId } from "./supabaseUtils.ts";
import { hashPassword } from "./passwordUtils.ts";
import { readAuthTokenFromRequest, verifyAuthToken } from "./authToken.ts";

export function createAdminRouter(supabase: SupabaseClient) {
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
      actor = String(req.query.admin_faculty_id || "").trim();
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

  // User management (Admin only).
  router.get("/api/admin/users", async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const { data, error } = await supabase
        .from("users")
        .select("faculty_id,name,department,role,email,status")
        .in("role", ["Faculty", "HOD", "ExamBranch"])
        .order("department", { ascending: true })
        .order("role", { ascending: true })
        .order("name", { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
      res.json(
        (data || []).map((r: any) => ({
          faculty_id: r.faculty_id,
          name: r.name,
          department: r.department || "",
          role: mapRoleDbToApi(String(r.role || "")),
          email: r.email || "",
          status: r.status || "Active",
        })),
      );
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  router.put("/api/admin/users/:id", async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = String(req.params.id || "").trim();
    const { faculty_id, name, department, role, status } = req.body as any;

    const { data: existing, error: findErr } = await supabase
      .from("users")
      .select("faculty_id,name,department,role,email,password,status")
      .eq("faculty_id", id)
      .maybeSingle();

    if (findErr) return res.status(500).json({ error: findErr.message });
    if (!existing) return res.status(404).json({ error: "User not found" });

    const nextId = String(faculty_id || "").trim();
    const nextName = String(name || "").trim();
    const nextDept = String(department || "").trim();
    const nextRole = String(role || "").trim();
    const nextStatus = String(status || "Active").trim();

    if (!nextId) return res.status(400).json({ error: "Faculty ID is required" });
    if (!nextName) return res.status(400).json({ error: "Name is required" });
    if (!["FACULTY", "HOD", "EXAM_BRANCH"].includes(nextRole.toUpperCase())) return res.status(400).json({ error: "Role must be Faculty, HOD, or Exam Branch" });
    if (nextRole.toUpperCase() !== "EXAM_BRANCH" && !nextDept) return res.status(400).json({ error: "Department is required" });
    if (!["Active", "Disabled"].includes(nextStatus)) return res.status(400).json({ error: "Invalid status" });

    try {
      if (nextId !== id) {
        const { data: conflict, error: conflictErr } = await supabase.from("users").select("faculty_id").eq("faculty_id", nextId).maybeSingle();
        if (conflictErr) return res.status(500).json({ error: conflictErr.message });
        if (conflict) return res.status(400).json({ error: "Faculty ID already exists" });
      }

      const nextRoleDb = mapRoleApiToDb(nextRole);
      const deptForDb = nextRole.toUpperCase() === "EXAM_BRANCH" ? "" : nextDept;

      const { error: updErr } = await supabase
        .from("users")
        .update({ faculty_id: nextId, name: nextName, department: deptForDb, role: nextRoleDb, status: nextStatus })
        .eq("faculty_id", id);

      if (updErr) return res.status(400).json({ error: updErr.message });

      if (nextId !== id) {
        await supabase.from("question_papers").update({ faculty_id: nextId }).eq("faculty_id", id);
        await supabase.from("evaluations").update({ faculty_id: nextId }).eq("faculty_id", id);
        await supabase.from("faculty_subjects").update({ faculty_id: nextId }).eq("faculty_id", id);
      }

      const { data: updated, error: readErr } = await supabase
        .from("users")
        .select("faculty_id,name,department,role,email,status")
        .eq("faculty_id", nextId)
        .maybeSingle();

      if (readErr) return res.status(500).json({ error: readErr.message });

      res.json({
        success: true,
        user: {
          faculty_id: updated?.faculty_id || nextId,
          name: updated?.name || nextName,
          department: updated?.department || deptForDb,
          role: mapRoleDbToApi(String(updated?.role || nextRoleDb)),
          email: updated?.email || "",
          status: updated?.status || nextStatus,
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/api/admin/users/:id/status", async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = String(req.params.id || "").trim();
    const { status } = req.body as any;
    const nextStatus = String(status || "").trim();
    if (!["Active", "Disabled"].includes(nextStatus)) return res.status(400).json({ error: "Invalid status" });

    try {
      const { error } = await supabase.from("users").update({ status: nextStatus }).eq("faculty_id", id).in("role", ["Faculty", "HOD", "ExamBranch"]);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/api/admin/users/:id/reset-password", async (req, res) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = String(req.params.id || "").trim();
    const { new_password } = req.body as any;
    const pw = String(new_password || "");
    if (!pw) return res.status(400).json({ error: "New password is required" });

    try {
      const { error } = await supabase
        .from("users")
        .update({ password: hashPassword(pw) })
        .eq("faculty_id", id)
        .in("role", ["Faculty", "HOD", "ExamBranch"]);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin data viewer (read-only)
  router.get("/api/admin/data/:table", async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const key = String(req.params.table || "").trim().toLowerCase();
      const allowed: Record<string, { table: string; order?: string }> = {
        users: { table: "users", order: "created_at" },
        students: { table: "students", order: "uploaded_at" },
        question_papers: { table: "question_papers", order: "created_at" },
        evaluations: { table: "evaluations", order: "created_at" },
        student_marks: { table: "student_marks", order: "updated_at" },
      };
      const target = allowed[key];
      if (!target) return res.status(400).json({ error: "Invalid table. Use: users, students, question_papers, evaluations, student_marks" });

      let q = supabase.from(target.table).select("*").limit(500);
      if (target.order) q = q.order(target.order, { ascending: false });

      const { data, error } = await q;
      if (error) return res.status(400).json({ error: error.message });
      res.json({ success: true, table: target.table, rows: data || [] });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  return router;
}
