export type CatalogSubject = { name: string; code: string };

type CatalogRow = {
  department: string;
  regulation: string;
  year: string;
  semester: string;
  subjects: CatalogSubject[];
};

// R22 – CSM / CSE AIML (as provided)
const subjectsData: CatalogRow[] = [
  // ===== II YEAR =====
  {
    department: "CSM",
    regulation: "R22",
    year: "II",
    semester: "Sem I",
    subjects: [
      { name: "Data Structures", code: "CS201PC" },
      { name: "Computer Organization", code: "CS202PC" },
      { name: "Operating Systems", code: "CS203PC" },
      { name: "Probability and Statistics", code: "MA201BS" },
      { name: "Python Programming", code: "CS204PC" },
    ],
  },
  {
    department: "CSM",
    regulation: "R22",
    year: "II",
    semester: "Sem II",
    subjects: [
      { name: "Object Oriented Programming through Java", code: "CS405PC" },
      { name: "Database Management Systems", code: "CS406PC" },
      { name: "Formal Languages and Automata Theory", code: "CS407PC" },
      { name: "Software Engineering", code: "CS408PC" },
      { name: "Machine Learning", code: "AM409PC" },
    ],
  },

  // ===== III YEAR =====
  {
    department: "CSM",
    regulation: "R22",
    year: "III",
    semester: "Sem I",
    subjects: [
      { name: "Artificial Intelligence", code: "CS501PC" },
      { name: "Computer Networks", code: "CS502PC" },
      { name: "Web Programming", code: "AM513PE" },
      { name: "UI Design with Flutter", code: "AM507PC" },
      { name: "Data Mining", code: "AM504PC" },
    ],
  },
  {
    department: "CSM",
    regulation: "R22",
    year: "III",
    semester: "Sem II",
    subjects: [
      { name: "Natural Language Processing", code: "AM603PC" },
      { name: "Computer Graphics", code: "AM515PE" },
      { name: "Advanced English Communication Skills Lab", code: "EN508HS" },
      { name: "Data Science using R", code: "AM602PC" },
      { name: "Mini Project", code: "CS600MC" },
    ],
  },

  // ===== IV YEAR =====
  {
    department: "CSM",
    regulation: "R22",
    year: "IV",
    semester: "Sem I",
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
    semester: "Sem II",
    subjects: [
      { name: "Web Security", code: "AM854PE" },
      { name: "Project Work", code: "CS800PC" },
      { name: "Seminar", code: "CS801MC" },
    ],
  },
];

export function normalizeSemester(value: string) {
  const v = String(value || "").trim();
  const lower = v.toLowerCase();
  if (v === "I" || lower === "sem i" || lower === "semester i") return "Sem I";
  if (v === "II" || lower === "sem ii" || lower === "semester ii") return "Sem II";
  return v;
}

export function getCatalogSubjects(params: { department: string; regulation: string; year: string; semester: string }) {
  const department = String(params.department || "").trim().toUpperCase();
  const regulation = String(params.regulation || "").trim().toUpperCase();
  const year = String(params.year || "").trim().toUpperCase();
  const semester = normalizeSemester(params.semester);

  const row = subjectsData.find(
    (item) =>
      item.department.toUpperCase() === department &&
      item.regulation.toUpperCase() === regulation &&
      item.year.toUpperCase() === year &&
      item.semester.toUpperCase() === semester.toUpperCase(),
  );

  return row?.subjects || [];
}

