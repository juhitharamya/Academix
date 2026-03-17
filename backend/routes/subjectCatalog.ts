export type CatalogSubject = { name: string; code: string };

type CatalogRow = {
  department: string;
  regulation: string;
  year: string;
  semester: string;
  subjects: CatalogSubject[];
};

// Built-in catalog used by the API. This avoids “No subjects available” even if the database table is empty.
//
// NOTE: This list is based on the subjects you provided in chat. Add more subjects/semesters here whenever you have them.
const subjectsData: CatalogRow[] = [
  // CSM — R22
  {
    department: "CSM",
    regulation: "R22",
    year: "II",
    semester: "I",
    subjects: [
      { name: "Mathematical and Statistical Foundations", code: "CS301PC" },
      { name: "Data Structures", code: "CS302PC" },
      { name: "Computer Organization and Architecture", code: "CS303PC" },
      { name: "Software Engineering", code: "CS304PC" },
      { name: "Operating Systems", code: "CS305PC" },
      { name: "Constitution of India", code: "*MC310" },
    ],
  },
  {
    department: "CSM",
    regulation: "R22",
    year: "II",
    semester: "II",
    subjects: [
      { name: "Discrete Mathematics", code: "CS401PC" },
      { name: "Automata Theory and Compiler Design", code: "CS402PC" },
      { name: "Database Management Systems", code: "CS403PC" },
      { name: "Introduction to Artificial Intelligence", code: "CS404PC" },
      { name: "Object Oriented Programming through Java", code: "CS405PC" },
      { name: "Gender Sensitization Lab", code: "*MC410" },
    ],
  },
  {
    department: "CSM",
    regulation: "R22",
    year: "III",
    semester: "I",
    subjects: [
      { name: "Design and Analysis of Algorithms", code: "AM501PC" },
      { name: "Machine Learning", code: "AM502PC" },
      { name: "Computer Networks", code: "AM503PC" },
      { name: "Business Economics & Financial Analysis", code: "SM504MS" },
      { name: "Web Programming", code: "AM513PE" },
    ],
  },
  {
    department: "CSM",
    regulation: "R22",
    year: "III",
    semester: "II",
    subjects: [
      { name: "Knowledge Representation and Reasoning", code: "AM601PC" },
      { name: "Data Analytics", code: "AM602PC" },
      { name: "Natural Language Processing", code: "AM603PC" },
      { name: "Internet of Things", code: "AM731PE" },
      { name: "Software Testing Methodologies", code: "AM621PE" },
    ],
  },
  {
    department: "CSM",
    regulation: "R22",
    year: "IV",
    semester: "I",
    subjects: [
      { name: "Deep Learning", code: "AM701PC" },
      { name: "Scripting Languages", code: "AM733PE" },
      { name: "Mobile Application Development Lab", code: "AM714PE" },
      { name: "Intellectual Property Rights", code: "MC510" },
    ],
  },
  {
    department: "CSM",
    regulation: "R22",
    year: "IV",
    semester: "II",
    subjects: [
      { name: "Web Security", code: "AM854PE" },
      { name: "Project Work", code: "CS800PC" },
      { name: "Seminar", code: "CS801MC" },
    ],
  },
];

function normalizeDepartment(departmentRaw: string) {
  const d = String(departmentRaw || "").trim();
  if (!d) return "";

  const upperNoSpaces = d.toUpperCase().replace(/\s+/g, "");
  if (upperNoSpaces === "CSEAIML" || upperNoSpaces === "CSE-AIML" || upperNoSpaces === "AIML") return "CSM";

  return d.toUpperCase();
}

function normalizeSemester(semesterRaw: string) {
  const sem = String(semesterRaw || "").trim();
  const upper = sem.toUpperCase();
  if (upper === "I" || upper === "SEM I" || upper === "SEMESTER I") return "I";
  if (upper === "II" || upper === "SEM II" || upper === "SEMESTER II") return "II";
  return sem;
}

function normalizeYear(yearRaw: string) {
  const y = String(yearRaw || "").trim();
  if (!y) return "";

  const upper = y.toUpperCase();
  const roman = upper.match(/\b(I|II|III|IV)\b/);
  if (roman?.[1]) return roman[1];

  const numeric = upper.match(/\b([1-4])\b/);
  if (numeric?.[1]) {
    const map: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" };
    return map[numeric[1]] || upper;
  }

  return upper;
}

export function getCatalogSubjects(params: { department: string; regulation: string; year: string; semester: string }) {
  const department = normalizeDepartment(params.department);
  const regulation = String(params.regulation || "").trim().toUpperCase();
  const year = normalizeYear(params.year);
  const semester = normalizeSemester(params.semester);

  const row = subjectsData.find(
    (r) =>
      r.department.toUpperCase() === department &&
      r.regulation.toUpperCase() === regulation &&
      r.year.toUpperCase() === year &&
      r.semester.toUpperCase() === semester.toUpperCase(),
  );

  return row?.subjects || [];
}
