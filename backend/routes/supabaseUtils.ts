import type { SupabaseClient } from "@supabase/supabase-js";

export function mapRoleDbToApi(role: string) {
  const r = String(role || "").trim();
  if (r.toLowerCase() === "admin") return "ADMIN";
  if (r.toLowerCase() === "faculty") return "FACULTY";
  if (r.toLowerCase() === "hod") return "HOD";
  if (r.toLowerCase() === "exambranch" || r.toLowerCase() === "exam_branch" || r.toLowerCase() === "exam branch") return "EXAM_BRANCH";
  return r.toUpperCase();
}

export function mapRoleApiToDb(role: string) {
  const r = String(role || "").trim().toUpperCase();
  if (r === "ADMIN") return "Admin";
  if (r === "FACULTY") return "Faculty";
  if (r === "HOD") return "HOD";
  if (r === "EXAM_BRANCH") return "ExamBranch";
  return role;
}

export async function requireUserByFacultyId(supabase: SupabaseClient, facultyId: string) {
  const fid = String(facultyId || "").trim();
  if (!fid) return { ok: false as const, status: 400, error: "faculty_id is required" };

  const { data, error } = await supabase
    .from("users")
    .select("faculty_id,name,department,role,email,status")
    .eq("faculty_id", fid)
    .maybeSingle();

  if (error) return { ok: false as const, status: 500, error: error.message };
  if (!data) return { ok: false as const, status: 404, error: "User not found" };
  if (String(data.status || "Active") === "Disabled") return { ok: false as const, status: 403, error: "Account is disabled" };

  return {
    ok: true as const,
    user: {
      faculty_id: data.faculty_id,
      name: data.name,
      department: data.department || "",
      role: mapRoleDbToApi(String(data.role || "")),
      email: data.email || "",
      status: data.status || "Active",
    },
  };
}
