import express from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapRoleDbToApi } from "./supabaseUtils.ts";

export function createUsersRouter(supabase: SupabaseClient) {
  const router = express.Router();

  router.patch("/api/users/:id", async (req, res) => {
    const id = String(req.params.id || "").trim();
    const { name, email } = req.body as any;

    const { data: existing, error: findErr } = await supabase
      .from("users")
      .select("faculty_id,name,department,role,email,status")
      .eq("faculty_id", id)
      .maybeSingle();

    if (findErr) return res.status(500).json({ error: findErr.message });
    if (!existing) return res.status(404).json({ error: "User not found" });

    const nextName = String(name ?? existing.name ?? "").trim();
    if (!nextName) return res.status(400).json({ error: "Name is required" });

    const { error: updErr } = await supabase
      .from("users")
      .update({ name: nextName, email: String(email ?? "").trim() || null })
      .eq("faculty_id", id);

    if (updErr) return res.status(400).json({ error: updErr.message });

    const { data: updated, error: readErr } = await supabase
      .from("users")
      .select("faculty_id,name,department,role,email,status")
      .eq("faculty_id", id)
      .maybeSingle();

    if (readErr) return res.status(500).json({ error: readErr.message });

    res.json({
      success: true,
      user: {
        faculty_id: updated?.faculty_id || id,
        name: updated?.name || nextName,
        department: updated?.department || "",
        role: mapRoleDbToApi(String(updated?.role || existing.role || "")),
        email: updated?.email || "",
        status: updated?.status || existing.status || "Active",
      },
    });
  });

  return router;
}
