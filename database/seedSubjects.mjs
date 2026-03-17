import dotenv from "dotenv";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const { supabase } = await import("./supabaseClient.js");

// Minimal seed for H&S (1st year) subjects so the Subject dropdown works.
// You can add/modify rows anytime in Supabase Table Editor -> subjects.
const hsSubjects = [
  // R22 H&S across branches
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "I", subject_name: "Matrices and Calculus", subject_code: "MA101BS" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "I", subject_name: "Engineering Chemistry", subject_code: "CH102BS" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "I", subject_name: "Basic Electrical Engineering", subject_code: "EE103ES" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "I", subject_name: "Engineering Workshop", subject_code: "ME105ES" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "I", subject_name: "English", subject_code: "EN105HS" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "I", subject_name: "Engineering Chemistry Lab", subject_code: "CH106BS" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "I", subject_name: "English Language and Communication Skills Lab", subject_code: "EN107HS" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "I", subject_name: "Basic Electrical Engineering Lab", subject_code: "EE108ES" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "II", subject_name: "Mathematics - II", subject_code: "MA201BS" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "II", subject_name: "Applied Physics", subject_code: "AP202BS" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "II", subject_name: "Programming for Problem Solving", subject_code: "CS203ES" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "II", subject_name: "Engineering Graphics", subject_code: "ME204ES" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "II", subject_name: "Applied Physics Lab", subject_code: "AP205BS" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "II", subject_name: "Programming for Problem Solving Lab", subject_code: "CS206ES" },
  { regulation: "R22", department: "H&S", branch: "CSE", year: null, semester: "II", subject_name: "Environmental Science", subject_code: "*MC209ES" },

  // Copy the same set for other branches (customize later if your college differs)
  ...["CSD", "CSM", "ECE"].flatMap((br) =>
    [
      { regulation: "R22", department: "H&S", branch: br, year: null, semester: "I", subject_name: "Matrices and Calculus", subject_code: "MA101BS" },
      { regulation: "R22", department: "H&S", branch: br, year: null, semester: "I", subject_name: "Engineering Chemistry", subject_code: "CH102BS" },
      { regulation: "R22", department: "H&S", branch: br, year: null, semester: "I", subject_name: "Basic Electrical Engineering", subject_code: "EE103ES" },
      { regulation: "R22", department: "H&S", branch: br, year: null, semester: "I", subject_name: "Engineering Workshop", subject_code: "ME105ES" },
      { regulation: "R22", department: "H&S", branch: br, year: null, semester: "I", subject_name: "English", subject_code: "EN105HS" },
      { regulation: "R22", department: "H&S", branch: br, year: null, semester: "II", subject_name: "Mathematics - II", subject_code: "MA201BS" },
      { regulation: "R22", department: "H&S", branch: br, year: null, semester: "II", subject_name: "Applied Physics", subject_code: "AP202BS" },
      { regulation: "R22", department: "H&S", branch: br, year: null, semester: "II", subject_name: "Programming for Problem Solving", subject_code: "CS203ES" },
      { regulation: "R22", department: "H&S", branch: br, year: null, semester: "II", subject_name: "Engineering Graphics", subject_code: "ME204ES" },
      { regulation: "R22", department: "H&S", branch: br, year: null, semester: "II", subject_name: "Environmental Science", subject_code: "*MC209ES" },
    ].map((x) => ({ ...x, subject_code: `${x.subject_code}` })),
  ),

  // R25 H&S (useful if you switch regulations)
  { regulation: "R25", department: "H&S", branch: "CSM", year: null, semester: "I", subject_name: "Matrices and Calculus", subject_code: "MA101BS" },
  { regulation: "R25", department: "H&S", branch: "CSM", year: null, semester: "I", subject_name: "Advanced Engineering Physics", subject_code: "PH102BS" },
  { regulation: "R25", department: "H&S", branch: "CSM", year: null, semester: "I", subject_name: "Programming for Problem Solving", subject_code: "CS103ES" },
  { regulation: "R25", department: "H&S", branch: "CSM", year: null, semester: "I", subject_name: "Basic Electrical Engineering", subject_code: "EE104ES" },
  { regulation: "R25", department: "H&S", branch: "CSM", year: null, semester: "I", subject_name: "IT Workshop", subject_code: "CS109ES" },
];

async function main() {
  const { data: existing, error: findErr } = await supabase
    .from("subjects")
    .select("id")
    .eq("department", "H&S")
    .limit(1);

  if (findErr) throw new Error(findErr.message);
  if ((existing || []).length > 0) {
    console.log("subjects already has H&S data; skipping seed.");
    return;
  }

  const { error } = await supabase
    .from("subjects")
    .insert(hsSubjects);

  if (error) throw new Error(error.message);
  console.log(`Seeded ${hsSubjects.length} H&S subjects into Supabase.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
