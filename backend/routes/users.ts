import express from "express";
import type { Db } from "../db.ts";

export function createUsersRouter(db: Db) {
  const router = express.Router();

  router.patch("/api/users/:id", (req, res) => {
    const id = req.params.id;
    const { name, email } = req.body as any;

    const existing = db.prepare("SELECT * FROM faculty WHERE faculty_id = ?").get(id) as any;
    if (!existing) return res.status(404).json({ error: "User not found" });

    try {
      const nextName = (name ?? existing.name) as string;
      if (!String(nextName).trim()) return res.status(400).json({ error: "Name is required" });

      const stmt = db.prepare("UPDATE faculty SET name = ?, email = ? WHERE faculty_id = ?");
      stmt.run(nextName.trim(), (email ?? "").trim() || null, id);

      const updated = db.prepare("SELECT faculty_id, name, department, role, email, status FROM faculty WHERE faculty_id = ?").get(id) as any;
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

  return router;
}

