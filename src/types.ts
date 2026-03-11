export type Role = 'FACULTY' | 'HOD' | 'EXAM_BRANCH';

export interface User {
  faculty_id: string;
  name: string;
  department: string;
  role: Role;
}

export interface QuestionPaper {
  id: number;
  faculty_id: string;
  faculty_name?: string;
  department: string;
  year: string;
  semester: string;
  mid_exam_type: string;
  subject_name: string;
  subject_code: string;
  set_type: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  hod_comments?: string;
  created_at: string;
  subjective?: SubjectiveQuestion[];
  mcqs?: ObjectiveMCQ[];
  blanks?: FillBlank[];
}

export interface SubjectiveQuestion {
  id?: number;
  set_type?: string;
  question_text: string;
  marks: number;
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
}

export interface FillBlank {
  id?: number;
  set_type?: string;
  question_text: string;
  correct_answer: string;
}
