export const HS_DEPARTMENT = "H&S";
export const CORE_DEPARTMENTS = ["CSM", "CSD", "CSE", "ECE"] as const;
export const ALL_DEPARTMENTS = [HS_DEPARTMENT, ...CORE_DEPARTMENTS] as const;
export const ALL_BRANCHES = [...CORE_DEPARTMENTS] as const;
export const HS_YEARS = ["I"] as const;
export const CORE_YEARS = ["II", "III", "IV"] as const;
export const ALL_YEARS = [...HS_YEARS, ...CORE_YEARS] as const;
export const ALL_SEMESTERS = ["I", "II"] as const;

export type SubjectMasterInput = {
  regulation?: any;
  department?: any;
  branch?: any;
  year?: any;
  semester?: any;
  subject_name?: any;
  subject_code?: any;
  is_active?: any;
};

function norm(value: any) {
  return String(value || "").trim();
}

function normUpper(value: any) {
  return norm(value).toUpperCase();
}

export function normalizeDepartment(value: any) {
  const upper = normUpper(value);
  return upper === "H&S" ? HS_DEPARTMENT : upper;
}

export function normalizeBranch(value: any) {
  return normUpper(value);
}

export function normalizeYear(value: any) {
  const upper = normUpper(value);
  if (!upper) return "";
  if (upper.startsWith("IV")) return "IV";
  if (upper.startsWith("III")) return "III";
  if (upper.startsWith("II")) return "II";
  if (upper.startsWith("I")) return "I";
  return upper;
}

export function normalizeSemester(value: any) {
  const upper = normUpper(value);
  if (!upper) return "";
  if (upper === "I" || upper === "SEM I" || upper === "SEMESTER I") return "I";
  if (upper === "II" || upper === "SEM II" || upper === "SEMESTER II") return "II";
  return upper;
}

export function branchesForDepartment(department: string) {
  if (department === HS_DEPARTMENT) return [...ALL_BRANCHES];
  if (CORE_DEPARTMENTS.includes(department as any)) return [department];
  return [];
}

export function yearsForDepartment(department: string) {
  if (department === HS_DEPARTMENT) return [...HS_YEARS];
  if (CORE_DEPARTMENTS.includes(department as any)) return [...CORE_YEARS];
  return [...ALL_YEARS];
}

export function normalizeSubjectMasterInput(input: SubjectMasterInput) {
  const department = normalizeDepartment(input.department);
  const branchRaw = normalizeBranch(input.branch);
  const yearRaw = normalizeYear(input.year);
  const semester = normalizeSemester(input.semester);
  const subject_name = norm(input.subject_name);
  const subject_code = normUpper(input.subject_code);
  const regulation = normUpper(input.regulation);

  if (!regulation) return { error: "regulation is required" as const };
  if (!department) return { error: "department is required" as const };
  if (!ALL_DEPARTMENTS.includes(department as any)) {
    return { error: `department must be one of ${ALL_DEPARTMENTS.join(", ")}` as const };
  }

  const allowedBranches = branchesForDepartment(department);
  const branch = branchRaw || (department !== HS_DEPARTMENT ? department : "");
  if (!branch) return { error: "branch is required" as const };
  if (!allowedBranches.includes(branch as any)) {
    return { error: department === HS_DEPARTMENT ? "invalid H&S branch" : "branch must match department" as const };
  }

  const year = department === HS_DEPARTMENT ? "I" : yearRaw;
  if (!year) return { error: "year is required" as const };
  if (!yearsForDepartment(department).includes(year as any)) {
    return { error: department === HS_DEPARTMENT ? "H&S subjects must belong to Year I only" : "core departments support only Years II, III, and IV" as const };
  }

  if (!semester) return { error: "semester is required" as const };
  if (!ALL_SEMESTERS.includes(semester as any)) {
    return { error: "semester must be I or II" as const };
  }

  if (!subject_name) return { error: "subject_name is required" as const };
  if (!subject_code) return { error: "subject_code is required" as const };

  return {
    value: {
      regulation,
      department,
      branch,
      year,
      semester,
      subject_name,
      subject_code,
      is_active: input.is_active === undefined ? true : Boolean(input.is_active),
    },
  };
}

export function isMissingSubjectMasterTableError(error: any) {
  const message = String(error?.message || "");
  return message.includes("subject_master") && (
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("Could not find the table")
  );
}
