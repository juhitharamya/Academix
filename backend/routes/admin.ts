import express from "express";
import type { Db } from "../db.ts";

export function createAdminRouter(db: Db) {
  const router = express.Router();

  // Faculty/HOD only user management.
  router.get("/api/admin/users", (_req, res) => {
    try {
      const rows = db
        .prepare("SELECT faculty_id, name, department, role, email, status FROM faculty WHERE role IN ('FACULTY','HOD') ORDER BY department, role, name")
        .all() as any[];
      res.json(
        rows.map((r) => ({
          faculty_id: r.faculty_id,
          name: r.name,
          department: r.department || "",
          role: r.role,
          email: r.email || "",
          status: r.status || "Active",
        })),
      );
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.put("/api/admin/users/:id", (req, res) => {
    const id = req.params.id;
    const { faculty_id, name, department, role, status } = req.body as any;

    const existing = db.prepare("SELECT * FROM faculty WHERE faculty_id = ? AND role IN ('FACULTY','HOD')").get(id) as any;
    if (!existing) return res.status(404).json({ error: "User not found" });

    const nextId = String(faculty_id || "").trim();
    const nextName = String(name || "").trim();
    const nextDept = String(department || "").trim();
    const nextRole = String(role || "").trim();
    const nextStatus = String(status || "Active").trim();

    if (!nextId) return res.status(400).json({ error: "Faculty ID is required" });
    if (!nextName) return res.status(400).json({ error: "Name is required" });
    if (!["FACULTY", "HOD"].includes(nextRole)) return res.status(400).json({ error: "Role must be Faculty or HOD" });
    if (!nextDept) return res.status(400).json({ error: "Department is required" });
    if (!["Active", "Disabled"].includes(nextStatus)) return res.status(400).json({ error: "Invalid status" });

    try {
      const tx = db.transaction(() => {
        if (nextId !== id) {
          const conflict = db.prepare("SELECT 1 FROM faculty WHERE faculty_id = ?").get(nextId);
          if (conflict) throw new Error("Faculty ID already exists");

          db.prepare("INSERT INTO faculty (faculty_id, name, email, password, department, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .run(nextId, nextName, existing.email || null, existing.password, nextDept, nextRole, nextStatus);

          db.prepare("UPDATE question_papers SET faculty_id = ? WHERE faculty_id = ?").run(nextId, id);
          db.prepare("DELETE FROM faculty WHERE faculty_id = ?").run(id);
        } else {
          db.prepare("UPDATE faculty SET name = ?, department = ?, role = ?, status = ? WHERE faculty_id = ?").run(nextName, nextDept, nextRole, nextStatus, id);
        }
      });

      tx();

      const updated = db.prepare("SELECT faculty_id, name, department, role, email, status FROM faculty WHERE faculty_id = ?").get(nextId) as any;
      res.json({
        success: true,
        user: {
          faculty_id: updated.faculty_id,
          name: updated.name,
          department: updated.department || "",
          role: updated.role,
          email: updated.email || "",
          status: updated.status || "Active",
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/api/admin/users/:id/status", (req, res) => {
    const id = req.params.id;
    const { status } = req.body as any;
    const nextStatus = String(status || "").trim();
    if (!["Active", "Disabled"].includes(nextStatus)) return res.status(400).json({ error: "Invalid status" });

    try {
      const stmt = db.prepare("UPDATE faculty SET status = ? WHERE faculty_id = ? AND role IN ('FACULTY','HOD')");
      const result = stmt.run(nextStatus, id) as any;
      if (result.changes === 0) return res.status(404).json({ error: "User not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/api/admin/users/:id/reset-password", (req, res) => {
    const id = req.params.id;
    const { new_password } = req.body as any;
    const pw = String(new_password || "");
    if (!pw) return res.status(400).json({ error: "New password is required" });

    try {
      const stmt = db.prepare("UPDATE faculty SET password = ? WHERE faculty_id = ? AND role IN ('FACULTY','HOD')");
      const result = stmt.run(pw, id) as any;
      if (result.changes === 0) return res.status(404).json({ error: "User not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

