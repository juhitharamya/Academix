export type Role = 'FACULTY' | 'HOD' | 'EXAM_BRANCH' | 'ADMIN';

export interface User {
  faculty_id: string;
  name: string;
  department: string;
  role: Role;
  email?: string;
  status?: 'Active' | 'Disabled';
}

export interface QuestionPaper {
  id: number;
  faculty_id: string;
  faculty_name?: string;
  department: string;
  branch?: string;
  regulation: string;
  year: string;
  semester: string;
  mid_exam_type: string;
  subject_name: string;
  subject_code: string;
  set_type: string;
  status: 'Draft' | 'Pending HOD Approval' | 'Approved' | 'Rejected' | 'Pending Approval';
  hod_comments?: string;
  created_at: string;
  subjective?: SubjectiveQuestion[];
  mcqs?: ObjectiveMCQ[];
  blanks?: FillBlank[];
}

export interface Subject {
  id: string | number;
  regulation: string;
  department: string;
  branch?: string;
  year?: string;
  semester: string;
  subject_name: string;
  subject_code: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FacultySubjectAssignment {
  id: string;
  faculty_id: string;
  faculty_name: string;
  department: string;
  branch?: string;
  regulation: string;
  year: string;
  semester: string;
  subject_name: string;
  subject_code: string;
  created_at: string;
}

export interface SubjectiveQuestion {
  id?: number;
  set_type?: string;
  question_text: string;
  marks: number;
  co_level?: string;
  btl_level?: string;
}

export interface ObjectiveMCQ {
  id?: number;
  set_type?: string;
  question_text: string;
  option_A: string;
  option_B: string;
  option_C: string;
  option_D: string;
  correct_answer: string;
  co_level?: string;
  btl_level?: string;
}

export interface FillBlank {
  id?: number;
  set_type?: string;
  question_text: string;
  correct_answer: string;
  co_level?: string;
  btl_level?: string;
}
