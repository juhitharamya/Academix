import dotenv from "dotenv";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const { supabase } = await import("./supabaseClient.js");

// Minimal seed for H&S (1st year) subjects so the Subject dropdown works.
// You can add/modify rows anytime in Supabase Table Editor -> subject_master.
const hsSubjects = [
  // R22 H&S across branches
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "I", subject_name: "Matrices and Calculus", subject_code: "MA101BS", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "I", subject_name: "Engineering Chemistry", subject_code: "CH102BS", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "I", subject_name: "Basic Electrical Engineering", subject_code: "EE103ES", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "I", subject_name: "Engineering Workshop", subject_code: "ME105ES", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "I", subject_name: "English", subject_code: "EN105HS", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "I", subject_name: "Engineering Chemistry Lab", subject_code: "CH106BS", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "I", subject_name: "English Language and Communication Skills Lab", subject_code: "EN107HS", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "I", subject_name: "Basic Electrical Engineering Lab", subject_code: "EE108ES", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "II", subject_name: "Mathematics - II", subject_code: "MA201BS", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "II", subject_name: "Applied Physics", subject_code: "AP202BS", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "II", subject_name: "Programming for Problem Solving", subject_code: "CS203ES", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "II", subject_name: "Engineering Graphics", subject_code: "ME204ES", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "II", subject_name: "Applied Physics Lab", subject_code: "AP205BS", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "II", subject_name: "Programming for Problem Solving Lab", subject_code: "CS206ES", is_active: true },
  { regulation: "R22", department: "H&S", branch: "CSE", year: "I", semester: "II", subject_name: "Environmental Science", subject_code: "*MC209ES", is_active: true },

  // Copy the same set for other branches (customize later if your college differs)
  ...["CSD", "CSM", "ECE"].flatMap((br) =>
    [
      { regulation: "R22", department: "H&S", branch: br, year: "I", semester: "I", subject_name: "Matrices and Calculus", subject_code: "MA101BS", is_active: true },
      { regulation: "R22", department: "H&S", branch: br, year: "I", semester: "I", subject_name: "Engineering Chemistry", subject_code: "CH102BS", is_active: true },
      { regulation: "R22", department: "H&S", branch: br, year: "I", semester: "I", subject_name: "Basic Electrical Engineering", subject_code: "EE103ES", is_active: true },
      { regulation: "R22", department: "H&S", branch: br, year: "I", semester: "I", subject_name: "Engineering Workshop", subject_code: "ME105ES", is_active: true },
      { regulation: "R22", department: "H&S", branch: br, year: "I", semester: "I", subject_name: "English", subject_code: "EN105HS", is_active: true },
      { regulation: "R22", department: "H&S", branch: br, year: "I", semester: "II", subject_name: "Mathematics - II", subject_code: "MA201BS", is_active: true },
      { regulation: "R22", department: "H&S", branch: br, year: "I", semester: "II", subject_name: "Applied Physics", subject_code: "AP202BS", is_active: true },
      { regulation: "R22", department: "H&S", branch: br, year: "I", semester: "II", subject_name: "Programming for Problem Solving", subject_code: "CS203ES", is_active: true },
      { regulation: "R22", department: "H&S", branch: br, year: "I", semester: "II", subject_name: "Engineering Graphics", subject_code: "ME204ES", is_active: true },
      { regulation: "R22", department: "H&S", branch: br, year: "I", semester: "II", subject_name: "Environmental Science", subject_code: "*MC209ES", is_active: true },
    ].map((x) => ({ ...x, subject_code: `${x.subject_code}` })),
  ),

  // R25 H&S (useful if you switch regulations)
  { regulation: "R25", department: "H&S", branch: "CSM", year: "I", semester: "I", subject_name: "Matrices and Calculus", subject_code: "MA101BS", is_active: true },
  { regulation: "R25", department: "H&S", branch: "CSM", year: "I", semester: "I", subject_name: "Advanced Engineering Physics", subject_code: "PH102BS", is_active: true },
  { regulation: "R25", department: "H&S", branch: "CSM", year: "I", semester: "I", subject_name: "Programming for Problem Solving", subject_code: "CS103ES", is_active: true },
  { regulation: "R25", department: "H&S", branch: "CSM", year: "I", semester: "I", subject_name: "Basic Electrical Engineering", subject_code: "EE104ES", is_active: true },
  { regulation: "R25", department: "H&S", branch: "CSM", year: "I", semester: "I", subject_name: "IT Workshop", subject_code: "CS109ES", is_active: true },
];

async function main() {
  const { data: existing, error: findErr } = await supabase
    .from("subject_master")
    .select("id")
    .eq("department", "H&S")
    .limit(1);

  if (findErr) throw new Error(findErr.message);
  if ((existing || []).length > 0) {
    console.log("subject_master already has H&S data; skipping seed.");
    return;
  }

  const { error } = await supabase
    .from("subject_master")
    .insert(hsSubjects);

  if (error) throw new Error(error.message);
  console.log(`Seeded ${hsSubjects.length} H&S subjects into subject_master.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
raamy