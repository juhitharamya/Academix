import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Download,
  Upload,
  Printer,
  Search,
  BookOpen,
  Users,
  ShieldCheck,
  FileCheck,
  AlertCircle,
  Save,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, QuestionPaper, Role, SubjectiveQuestion, ObjectiveMCQ, FillBlank, Subject } from './types';
import { buildPaperHtml, downloadHtmlFile, type PaperSetType, type PaperTemplateType } from './paperTemplates';

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }: any) => {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: any = {
    primary: "bg-primary text-white hover:bg-primary-hover shadow-sm",
    secondary: "bg-white text-primary border border-primary hover:bg-primary-light/30",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    ghost: "bg-transparent text-primary hover:bg-primary-light/50"
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1 w-full">
    {label && <label className="text-sm font-medium text-black">{label}</label>}
    <input
      {...props}
      className="w-full px-3 py-2 border border-primary/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
    />
  </div>
);

const Select = ({ label, options, ...props }: any) => (
  <div className="space-y-1 w-full">
    {label && <label className="text-sm font-medium text-black">{label}</label>}
    <select
      {...props}
      className="w-full px-3 py-2 border border-primary/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Badge = ({ status }: { status: string }) => {
  const styles: any = {
    'Draft': 'bg-slate-100 text-black/60 border-primary/10',
    'Pending Approval': 'bg-primary-light text-primary border-primary/20',
    'Pending HOD Approval': 'bg-primary-light text-primary border-primary/20',
    'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Rejected': 'bg-red-50 text-red-700 border-red-200',
    'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Disabled': 'bg-red-50 text-red-700 border-red-200'
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles['Draft']}`}>
      {status}
    </span>
  );
};

const getInitials = (name?: string) => {
  const n = (name || '').trim();
  if (!n) return 'U';
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1]) || '';
  return (first + last).toUpperCase() || 'U';
};

// --- Sub-components ---

const QuestionSection = ({
  setData,
  setSetData,
  label
}: {
  setData: any,
  setSetData: React.Dispatch<React.SetStateAction<any>>,
  label: string
}) => {
  const updateSubjective = (index: number, field: string, value: any) => {
    setSetData(prev => {
      const newList = [...prev.subjective];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, subjective: newList };
    });
  };

  const updateMCQ = (index: number, field: string, value: any) => {
    setSetData(prev => {
      const newList = [...prev.mcqs];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, mcqs: newList };
    });
  };

  const updateBlank = (index: number, field: string, value: any) => {
    setSetData(prev => {
      const newList = [...prev.blanks];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, blanks: newList };
    });
  };

  return (
    <div className="space-y-10">
      <div className="bg-white p-8 rounded-2xl border border-primary/10 shadow-sm">
        <h3 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-primary-light text-primary rounded-lg flex items-center justify-center text-sm">1</span>
          {label} - Subjective Section (Max 8 Questions)
        </h3>
        <div className="space-y-6">
          {setData.subjective.map((q: any, i: number) => (
            <div key={i} className="flex gap-4 items-start bg-primary-light/5 p-6 rounded-xl border border-primary/10">
              <span className="mt-2 font-bold text-primary/40 w-6">{i + 1}.</span>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6 space-y-1">
                  <label className="text-sm font-medium text-black">Question Text</label>
                  <textarea
                    placeholder={`Enter question ${i + 1}...`}
                    className="w-full p-3 border border-primary/10 rounded-lg text-sm h-20 focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
                    value={q.question_text}
                    onChange={(e) => updateSubjective(i, 'question_text', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Select
                    label="BTL"
                    value={q.btl_level ?? ''}
                    onChange={(e: any) => updateSubjective(i, 'btl_level', e.target.value)}
                    options={[
                      { label: 'Select BTL', value: '' },
                      { label: 'BTL1', value: 'BTL1' },
                      { label: 'BTL2', value: 'BTL2' },
                      { label: 'BTL3', value: 'BTL3' },
                      { label: 'BTL4', value: 'BTL4' },
                      { label: 'BTL5', value: 'BTL5' },
                      { label: 'BTL6', value: 'BTL6' },
                    ]}
                  />
                </div>
                <div className="md:col-span-2">
                  <Select
                    label="CO"
                    value={q.co_level ?? ''}
                    onChange={(e: any) => updateSubjective(i, 'co_level', e.target.value)}
                    options={[
                      { label: 'Select CO', value: '' },
                      { label: 'CO1', value: 'CO1' },
                      { label: 'CO2', value: 'CO2' },
                      { label: 'CO3', value: 'CO3' },
                      { label: 'CO4', value: 'CO4' },
                    ]}
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Marks"
                    type="number"
                    min="1"
                    max="10"
                    value={q.marks}
                    onChange={(e: any) => updateSubjective(i, 'marks', e.target.value === '' ? '' : parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-primary/10 shadow-sm">
        <h3 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-primary-light text-primary rounded-lg flex items-center justify-center text-sm">2</span>
          Objective Section: Part A (MCQs)
        </h3>
        <div className="space-y-8">
          {setData.mcqs.map((q: any, i: number) => (
            <div key={i} className="p-6 bg-primary-light/5 rounded-xl border border-primary/10 space-y-4">
              <div className="flex gap-4 items-start">
                <span className="mt-2 font-bold text-primary/40 w-6">{i + 1}.</span>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8">
                    <Input
                      placeholder="Enter MCQ question text..."
                      value={q.question_text}
                      onChange={(e: any) => updateMCQ(i, 'question_text', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Select
                      label="BTL"
                      value={q.btl_level ?? ''}
                      onChange={(e: any) => updateMCQ(i, 'btl_level', e.target.value)}
                      options={[
                        { label: 'Select BTL', value: '' },
                        { label: 'BTL1', value: 'BTL1' },
                        { label: 'BTL2', value: 'BTL2' },
                        { label: 'BTL3', value: 'BTL3' },
                        { label: 'BTL4', value: 'BTL4' },
                        { label: 'BTL5', value: 'BTL5' },
                        { label: 'BTL6', value: 'BTL6' },
                      ]}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Select
                      label="CO"
                      value={q.co_level ?? ''}
                      onChange={(e: any) => updateMCQ(i, 'co_level', e.target.value)}
                      options={[
                        { label: 'Select CO', value: '' },
                        { label: 'CO1', value: 'CO1' },
                        { label: 'CO2', value: 'CO2' },
                        { label: 'CO3', value: 'CO3' },
                        { label: 'CO4', value: 'CO4' },
                      ]}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10">
                {['A', 'B', 'C', 'D'].map(opt => (
                  <Input
                    key={opt}
                    label={`Option ${opt}`}
                    value={(q as any)[`option_${opt}`]}
                    onChange={(e: any) => updateMCQ(i, `option_${opt}`, e.target.value)}
                  />
                ))}
                <Select
                  label="Correct Answer"
                  value={q.correct_answer}
                  onChange={(e: any) => updateMCQ(i, 'correct_answer', e.target.value)}
                  options={['A', 'B', 'C', 'D'].map(o => ({ label: o, value: o }))}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-primary/10 shadow-sm">
        <h3 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-primary-light text-primary rounded-lg flex items-center justify-center text-sm">3</span>
          Objective Section: Part B (Fill in the Blanks)
        </h3>
        <div className="space-y-4">
          {setData.blanks.map((q: any, i: number) => (
            <div key={i} className="flex gap-4 items-start">
              <span className="mt-2 font-bold text-primary/40 w-6">{i + 1}.</span>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                  <Input
                    placeholder="Question text (use ____ for blank)..."
                    value={q.question_text}
                    onChange={(e: any) => updateBlank(i, 'question_text', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Select
                    label="BTL"
                    value={q.btl_level ?? ''}
                    onChange={(e: any) => updateBlank(i, 'btl_level', e.target.value)}
                    options={[
                      { label: 'Select BTL', value: '' },
                      { label: 'BTL1', value: 'BTL1' },
                      { label: 'BTL2', value: 'BTL2' },
                      { label: 'BTL3', value: 'BTL3' },
                      { label: 'BTL4', value: 'BTL4' },
                      { label: 'BTL5', value: 'BTL5' },
                      { label: 'BTL6', value: 'BTL6' },
                    ]}
                  />
                </div>
                <div className="md:col-span-2">
                  <Select
                    label="CO"
                    value={q.co_level ?? ''}
                    onChange={(e: any) => updateBlank(i, 'co_level', e.target.value)}
                    options={[
                      { label: 'Select CO', value: '' },
                      { label: 'CO1', value: 'CO1' },
                      { label: 'CO2', value: 'CO2' },
                      { label: 'CO3', value: 'CO3' },
                      { label: 'CO4', value: 'CO4' },
                    ]}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function QuestionPaperForm({ user, paper, onCancel, onSuccess }: { user: User, paper?: QuestionPaper, onCancel: () => void, onSuccess: () => void }) {
  const [step, setStep] = useState(1); // 1: Filters, 2: Set 1, 3: Set 2
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exportSet, setExportSet] = useState<PaperSetType>('Set 1');

  const [formData, setFormData] = useState({
    department: paper?.department || user.department,
    branch: paper?.branch || '',
    regulation: paper?.regulation || 'R22',
    year: paper?.year || ((paper?.department || user.department) === 'H&S' ? 'I' : 'II'),
    semester: paper?.semester || '',
    mid_exam_type: paper?.mid_exam_type || 'Mid I',
    subject_name: paper?.subject_name || '',
    subject_code: paper?.subject_code || '',
    hod_comments: paper?.hod_comments || '',
  });

  // H&S handles 1st year only (across branches). Prevent accidental II/III/IV routing issues.
  useEffect(() => {
    if (formData.department !== 'H&S') return;
    if (formData.year === 'I') return;
    setFormData((prev) => ({ ...prev, year: 'I' }));
  }, [formData.department, formData.year]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const params = new URLSearchParams({
          regulation: formData.regulation,
          department: formData.department,
          semester: formData.semester,
        });
        if (formData.department === 'H&S' && formData.branch) {
          params.append('branch', formData.branch);
        } else if (formData.department !== 'H&S') {
          params.append('year', formData.year);
        }

        const res = await fetch(`/api/subjects?${params.toString()}`);
        const data = await res.json();
        setSubjects(data);
      } catch (err) {
        console.error("Failed to fetch subjects", err);
      }
    };

    if (formData.regulation && formData.department && formData.semester) {
      if (formData.department === 'H&S' && !formData.branch) {
        setSubjects([]);
      } else {
        fetchSubjects();
      }
    } else {
      setSubjects([]);
    }
  }, [formData.regulation, formData.department, formData.branch, formData.year, formData.semester]);

  const handleSubjectChange = (subjectName: string) => {
    const selectedSubject = subjects.find(s => s.subject_name === subjectName);
    setFormData({
      ...formData,
      subject_name: subjectName,
      subject_code: selectedSubject ? selectedSubject.subject_code : ''
    });
  };

  const [set1, setSet1] = useState({
    subjective: paper?.subjective?.filter(q => q.set_type === 'Set 1')?.map((q: any) => ({ ...q, co_level: q.co_level ?? '', btl_level: q.btl_level ?? '' })) || Array(8).fill(null).map(() => ({ question_text: '', marks: 5, co_level: '', btl_level: '' })),
    mcqs: paper?.mcqs?.filter(q => q.set_type === 'Set 1')?.map((q: any) => ({ ...q, co_level: q.co_level ?? '', btl_level: q.btl_level ?? '' })) || Array(10).fill(null).map(() => ({ question_text: '', option_A: '', option_B: '', option_C: '', option_D: '', correct_answer: 'A', co_level: '', btl_level: '' })),
    blanks: paper?.blanks?.filter(q => q.set_type === 'Set 1')?.map((q: any) => ({ ...q, co_level: q.co_level ?? '', btl_level: q.btl_level ?? '' })) || Array(10).fill(null).map(() => ({ question_text: '', correct_answer: '', co_level: '', btl_level: '' })),
  });

  const [set2, setSet2] = useState({
    subjective: paper?.subjective?.filter(q => q.set_type === 'Set 2')?.map((q: any) => ({ ...q, co_level: q.co_level ?? '', btl_level: q.btl_level ?? '' })) || Array(8).fill(null).map(() => ({ question_text: '', marks: 5, co_level: '', btl_level: '' })),
    mcqs: paper?.mcqs?.filter(q => q.set_type === 'Set 2')?.map((q: any) => ({ ...q, co_level: q.co_level ?? '', btl_level: q.btl_level ?? '' })) || Array(10).fill(null).map(() => ({ question_text: '', option_A: '', option_B: '', option_C: '', option_D: '', correct_answer: 'A', co_level: '', btl_level: '' })),
    blanks: paper?.blanks?.filter(q => q.set_type === 'Set 2')?.map((q: any) => ({ ...q, co_level: q.co_level ?? '', btl_level: q.btl_level ?? '' })) || Array(10).fill(null).map(() => ({ question_text: '', correct_answer: '', co_level: '', btl_level: '' })),
  });

  // Ensure arrays have minimum length for the form
  useEffect(() => {
    if (set1.subjective.length < 8) setSet1(prev => ({ ...prev, subjective: [...prev.subjective, ...Array(8 - prev.subjective.length).fill(null).map(() => ({ question_text: '', marks: 5, co_level: '', btl_level: '' }))] }));
    if (set1.mcqs.length < 10) setSet1(prev => ({ ...prev, mcqs: [...prev.mcqs, ...Array(10 - prev.mcqs.length).fill(null).map(() => ({ question_text: '', option_A: '', option_B: '', option_C: '', option_D: '', correct_answer: 'A', co_level: '', btl_level: '' }))] }));
    if (set1.blanks.length < 10) setSet1(prev => ({ ...prev, blanks: [...prev.blanks, ...Array(10 - prev.blanks.length).fill(null).map(() => ({ question_text: '', correct_answer: '', co_level: '', btl_level: '' }))] }));

    if (set2.subjective.length < 8) setSet2(prev => ({ ...prev, subjective: [...prev.subjective, ...Array(8 - prev.subjective.length).fill(null).map(() => ({ question_text: '', marks: 5, co_level: '', btl_level: '' }))] }));
    if (set2.mcqs.length < 10) setSet2(prev => ({ ...prev, mcqs: [...prev.mcqs, ...Array(10 - prev.mcqs.length).fill(null).map(() => ({ question_text: '', option_A: '', option_B: '', option_C: '', option_D: '', correct_answer: 'A', co_level: '', btl_level: '' }))] }));
    if (set2.blanks.length < 10) setSet2(prev => ({ ...prev, blanks: [...prev.blanks, ...Array(10 - prev.blanks.length).fill(null).map(() => ({ question_text: '', correct_answer: '', co_level: '', btl_level: '' }))] }));
  }, []);

  const validatePaperDetails = () => {
    if (!formData.regulation) return "Regulation is required.";
    if (formData.department === 'H&S' && !formData.branch) return "Branch is required for H&S.";
    if (formData.department !== 'H&S' && !formData.year) return "Year is required.";
    if (!formData.subject_name.trim()) return "Subject Name is required.";
    if (!formData.subject_code.trim()) return "Subject Code is required.";
    if (!formData.semester) return "Semester is required.";
    return null;
  };

  const validateSet = (set: any, name: string) => {
    const subjectiveQuestions = set.subjective.filter((q: any) => q.question_text.trim());
    const mcqCount = set.mcqs.filter((q: any) => q.question_text.trim()).length;
    const blankCount = set.blanks.filter((q: any) => q.question_text.trim()).length;

    if (subjectiveQuestions.length === 0) return `${name}: At least one subjective question is required.`;

    for (const q of subjectiveQuestions) {
      if (q.marks === undefined || q.marks === null || q.marks === '' || isNaN(q.marks)) return `${name}: Marks must be entered for all questions.`;
      if (q.marks < 1 || q.marks > 10) return `${name}: Marks must be between 1 and 10.`;
    }

    if (mcqCount === 0) return `${name}: At least one MCQ is required.`;
    if (blankCount === 0) return `${name}: At least one fill-in-the-blank is required.`;
    return null;
  };

  const validateAll = () => {
    const detailsError = validatePaperDetails();
    if (detailsError) return detailsError;

    const set1Error = validateSet(set1, "Set 1");
    if (set1Error) return set1Error;

    const set2Error = validateSet(set2, "Set 2");
    if (set2Error) return set2Error;

    return null;
  };

  const handleSubmit = async (status: 'Draft' | 'Pending HOD Approval' | 'Approved') => {
    const error = validateAll();
    if (error) {
      setValidationError(error);
      return;
    }

    setLoading(true);
    setValidationError(null);
    try {
      const url = paper ? `/api/papers/${paper.id}` : '/api/papers';
      const method = paper ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          faculty_id: paper?.faculty_id || user.faculty_id,
          status,
          set1: {
            subjective: set1.subjective.filter(q => q.question_text.trim()),
            mcqs: set1.mcqs.filter(q => q.question_text.trim()),
            blanks: set1.blanks.filter(q => q.question_text.trim()),
          },
          set2: {
            subjective: set2.subjective.filter(q => q.question_text.trim()),
            mcqs: set2.mcqs.filter(q => q.question_text.trim()),
            blanks: set2.blanks.filter(q => q.question_text.trim()),
          }
        })
      });

      if (!response.ok) throw new Error("Failed to save question paper");

      onSuccess();
    } catch (err: any) {
      setValidationError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const buildPreviewPaper = (): QuestionPaper => ({
    id: paper?.id || 0,
    faculty_id: paper?.faculty_id || user.faculty_id,
    faculty_name: paper?.faculty_name,
    department: formData.department,
    branch: formData.branch || undefined,
    regulation: formData.regulation,
    year: formData.year,
    semester: formData.semester,
    mid_exam_type: formData.mid_exam_type,
    subject_name: formData.subject_name,
    subject_code: formData.subject_code,
    set_type: 'Set 1 & Set 2',
    status: 'Draft',
    hod_comments: formData.hod_comments || undefined,
    created_at: paper?.created_at || new Date().toISOString(),
    subjective: [
      ...set1.subjective.map((q: any) => ({ ...q, set_type: 'Set 1' })),
      ...set2.subjective.map((q: any) => ({ ...q, set_type: 'Set 2' })),
    ],
    mcqs: [
      ...set1.mcqs.map((q: any) => ({ ...q, set_type: 'Set 1' })),
      ...set2.mcqs.map((q: any) => ({ ...q, set_type: 'Set 2' })),
    ],
    blanks: [
      ...set1.blanks.map((q: any) => ({ ...q, set_type: 'Set 1' })),
      ...set2.blanks.map((q: any) => ({ ...q, set_type: 'Set 2' })),
    ],
  });

  const openOfficialPreview = (autoPrint: boolean) => {
    const previewPaper = buildPreviewPaper();
    let html = buildPaperHtml(previewPaper, exportSet, 'official');
    if (autoPrint) {
      html = html.replace('</body>', '<script>window.addEventListener(\"load\",()=>window.print());</script></body>');
    }
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto pb-20"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-black">Question Paper Setting</h2>
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-10 h-1.5 rounded-full ${step >= s ? 'bg-primary' : 'bg-primary/10'}`}></div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white p-8 rounded-2xl border border-primary/10 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-black border-b border-primary/5 pb-4">Paper Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Department"
              value={formData.department}
              onChange={(e: any) => {
                const nextDept = e.target.value;
                setFormData({
                  ...formData,
                  department: nextDept,
                  branch: '',
                  subject_name: '',
                  subject_code: '',
                  year: nextDept === 'H&S' ? 'I' : formData.year,
                });
              }}
              options={[
                { label: 'CSE', value: 'CSE' },
                { label: 'CSD', value: 'CSD' },
                { label: 'CSM', value: 'CSM' },
                { label: 'ECE', value: 'ECE' },
                { label: 'H&S', value: 'H&S' },
              ]}
            />
            {formData.department === 'H&S' && (
              <Select
                label="Branch"
                value={formData.branch}
                onChange={(e: any) => setFormData({ ...formData, branch: e.target.value, subject_name: '', subject_code: '' })}
                options={[
                  { label: 'Select Branch', value: '' },
                  { label: 'CSE', value: 'CSE' },
                  { label: 'CSD', value: 'CSD' },
                  { label: 'CSM', value: 'CSM' },
                  { label: 'ECE', value: 'ECE' },
                ]}
              />
            )}
            <Select
              label="Regulation"
              value={formData.regulation}
              onChange={(e: any) => setFormData({ ...formData, regulation: e.target.value, subject_name: '', subject_code: '' })}
              options={[
                { label: 'Select Regulation', value: '' },
                { label: 'R18', value: 'R18' },
                { label: 'R20', value: 'R20' },
                { label: 'R22', value: 'R22' },
                { label: 'R25', value: 'R25' },
              ]}
            />
            {formData.department !== 'H&S' && (
              <Select
                label="Year"
                value={formData.year}
                onChange={(e: any) => setFormData({ ...formData, year: e.target.value, subject_name: '', subject_code: '' })}
                options={[
                  { label: 'II Year', value: 'II' },
                  { label: 'III Year', value: 'III' },
                  { label: 'IV Year', value: 'IV' },
                ]}
              />
            )}
            <Select
              label="Semester"
              value={formData.semester}
              onChange={(e: any) => setFormData({ ...formData, semester: e.target.value, subject_name: '', subject_code: '' })}
              options={[
                { label: 'Select Semester', value: '' },
                { label: 'Semester I', value: 'I' },
                { label: 'Semester II', value: 'II' },
              ]}
            />
            <Select
              label="Exam Type"
              value={formData.mid_exam_type}
              onChange={(e: any) => setFormData({ ...formData, mid_exam_type: e.target.value })}
              options={[
                { label: 'Mid I', value: 'Mid I' },
                { label: 'Mid II', value: 'Mid II' },
              ]}
            />
            <Select
              label="Subject"
              value={formData.subject_name}
              onChange={(e: any) => handleSubjectChange(e.target.value)}
              options={[
                { label: 'Select Subject', value: '' },
                ...subjects.map(s => ({ label: s.subject_name, value: s.subject_name }))
              ]}
            />
            <Input
              label="Subject Code"
              placeholder="Auto-filled"
              value={formData.subject_code}
              readOnly
              className="bg-gray-50 cursor-not-allowed"
            />
            {user.role === 'HOD' && paper && paper.faculty_id !== user.faculty_id && (
              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-medium text-black/80">HOD Comments / Feedback</label>
                <textarea
                  placeholder="Add feedback for the faculty member..."
                  className="w-full px-3 py-2 border border-primary/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-24"
                  value={formData.hod_comments}
                  onChange={(e) => setFormData({ ...formData, hod_comments: e.target.value })}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => {
              const error = validatePaperDetails();
              if (error) {
                setValidationError(error);
                return;
              }
              setValidationError(null);
              setStep(2);
            }}>
              Next: Set 1 Entry
              <ChevronRight size={18} />
            </Button>
          </div>
          {validationError && step === 1 && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2 mt-4">
              <AlertCircle size={18} />
              {validationError}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8">
          <div className="bg-primary p-6 rounded-2xl text-white flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">Set 1 Entry</h3>
              <p className="text-white/70 text-sm">{formData.subject_name} ({formData.subject_code})</p>
            </div>
            <span className="px-4 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-widest">Step 2 of 3</span>
          </div>
          <QuestionSection setData={set1} setSetData={setSet1} label="Set 1" />
          <div className="flex justify-between pt-6">
            <Button variant="secondary" onClick={() => { setValidationError(null); setStep(1); }}>
              <ChevronLeft size={18} />
              Back to Details
            </Button>
            <Button onClick={() => {
              const detailsError = validatePaperDetails();
              if (detailsError) {
                setValidationError(detailsError);
                return;
              }

              const set1Error = validateSet(set1, "Set 1");
              if (set1Error) {
                setValidationError(set1Error);
                return;
              }

              setValidationError(null);
              setStep(3);
            }}>
              Next: Set 2 Entry
              <ChevronRight size={18} />
            </Button>
          </div>
          {validationError && step === 2 && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {validationError}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8">
          <div className="bg-primary p-6 rounded-2xl text-white flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">Set 2 Entry</h3>
              <p className="text-white/70 text-sm">{formData.subject_name} ({formData.subject_code})</p>
            </div>
            <span className="px-4 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-widest">Step 3 of 3</span>
          </div>
          <QuestionSection setData={set2} setSetData={setSet2} label="Set 2" />

          <div className="bg-white p-4 rounded-2xl border border-primary/10 shadow-sm print:hidden">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-black/70">Export Set:</span>
                <select
                  value={exportSet}
                  onChange={(e) => setExportSet(e.target.value as any)}
                  className="px-3 py-2 rounded-lg border border-primary/10 bg-white text-sm"
                >
                  <option value="Set 1">Set 1</option>
                  <option value="Set 2">Set 2</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => openOfficialPreview(false)}>
                  <Search size={18} />
                  Preview Question Paper
                </Button>
                <Button variant="secondary" onClick={() => openOfficialPreview(true)}>
                  <Download size={18} />
                  Download Draft PDF
                </Button>
              </div>
            </div>
          </div>

          {validationError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {validationError}
            </div>
          )}

          <div className="flex justify-between pt-6">
            <Button variant="secondary" onClick={() => setStep(2)}>
              <ChevronLeft size={18} />
              Back to Set 1
            </Button>
            <div className="flex gap-3">
              {user.role === 'HOD' && paper && paper.faculty_id !== user.faculty_id ? (
                <>
                  <Button variant="secondary" onClick={() => handleSubmit('Pending HOD Approval')} disabled={loading}>
                    <Save size={18} />
                    Save Changes
                  </Button>
                  <Button variant="success" onClick={() => handleSubmit('Approved')} disabled={loading}>
                    <CheckCircle size={18} />
                    Approve Paper
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => handleSubmit('Draft')} disabled={loading}>
                    <Save size={18} />
                    Save as Draft
                  </Button>
                  <Button onClick={() => handleSubmit('Pending HOD Approval')} disabled={loading}>
                    <Send size={18} />
                    {paper ? "Update & Send to HOD" : "Send to HOD for Approval"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'login' | 'signup' | 'dashboard' | 'create-paper' | 'edit-paper' | 'view-paper' | 'evaluation' | 'profile-view' | 'profile-edit' | 'admin-users' | 'admin-user-edit' | 'admin-reset-password'>('login');
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
  const [templateSet, setTemplateSet] = useState<PaperSetType>('Set 1');
  const [templateType, setTemplateType] = useState<PaperTemplateType>('descriptive');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardFilters, setDashboardFilters] = useState({
    department: '',
    branch: '',
    regulation: '',
    year: '',
    semester: '',
    mid_exam_type: '',
    search: ''
  });

  // Auth States
  const [authForm, setAuthForm] = useState({
    faculty_id: '',
    name: '',
    email: '',
    password: '',
    department: 'CSE',
    role: 'FACULTY' as Role
  });

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
  });
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState<string | null>(null);
  const [adminSelectedUser, setAdminSelectedUser] = useState<User | null>(null);
  const [adminEditForm, setAdminEditForm] = useState({
    faculty_id: '',
    name: '',
    department: '',
    role: 'FACULTY' as Role,
    status: 'Active' as 'Active' | 'Disabled',
  });
  const [adminResetForm, setAdminResetForm] = useState({
    new_password: '',
    confirm_password: '',
  });
  const [adminActionError, setAdminActionError] = useState<string | null>(null);

  // Evaluation Scripts
  type EvalStudent = { roll_number: string; student_name: string };
  type EvalStudentList = {
    id: number;
    department: string;
    branch: string;
    regulation: string;
    year: string;
    section: string;
    uploaded_by: string;
    uploaded_at: string;
    students: EvalStudent[];
  };

  const [evalUploadFilters, setEvalUploadFilters] = useState({ regulation: 'R22', year: 'II', section: 'A', branch: 'CSE' });
  const [evalUploadFile, setEvalUploadFile] = useState<File | null>(null);
  const [evalUploadError, setEvalUploadError] = useState<string | null>(null);
  const [evalUploadSuccess, setEvalUploadSuccess] = useState<string | null>(null);

  const [evalFilters, setEvalFilters] = useState({
    regulation: 'R22',
    year: 'II',
    section: 'A',
    branch: 'CSE',
    mid_type: 'Mid I',
    subject_name: '',
    subject_code: '',
  });
  const [evalList, setEvalList] = useState<EvalStudentList | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalStep, setEvalStep] = useState<'descriptive' | 'objective'>('descriptive');
  const [evalCoLabels, setEvalCoLabels] = useState<string[]>(['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6']);
  const [evalMarks, setEvalMarks] = useState<Record<string, { descriptive: (number | null)[]; mcq: (number | null)[]; fb: (number | null)[] }>>({});

  // Fetch Papers
  const fetchPapers = async () => {
    if (!user) return;
    if (user.role === 'ADMIN') {
      setPapers([]);
      return;
    }
    setLoading(true);
    try {
      let url = '/api/papers';
      const params = new URLSearchParams();

      if (user.role === 'FACULTY') {
        params.set('faculty_id', user.faculty_id);
      } else if (user.role === 'HOD') {
        params.set('hod_department', user.department);
      } else if (user.role === 'EXAM_BRANCH') {
        params.set('status', 'Approved');
      }

      if (dashboardFilters.department) {
        if (user.role !== 'HOD' || dashboardFilters.department === user.department) {
          if (user.role === 'HOD') {
            params.set('hod_department', dashboardFilters.department);
          } else {
            params.set('department', dashboardFilters.department);
          }
        }
      }
      if (dashboardFilters.branch) params.set('branch', dashboardFilters.branch);
      if (dashboardFilters.regulation) params.set('regulation', dashboardFilters.regulation);
      if (dashboardFilters.year) params.set('year', dashboardFilters.year);
      if (dashboardFilters.semester) params.set('semester', dashboardFilters.semester);
      if (dashboardFilters.mid_exam_type) params.set('mid_exam_type', dashboardFilters.mid_exam_type);

      const res = await fetch(`${url}?${params.toString()}`);
      const data = await res.json();
      setPapers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUsers = async () => {
    if (!user || user.role !== 'ADMIN') return;
    setAdminUsersLoading(true);
    setAdminUsersError(null);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load users');
      setAdminUsers(data);
    } catch (err: any) {
      setAdminUsersError(err.message);
    } finally {
      setAdminUsersLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchPapers();
  }, [user, dashboardFilters.department, dashboardFilters.branch, dashboardFilters.regulation, dashboardFilters.year, dashboardFilters.semester, dashboardFilters.mid_exam_type]);

  useEffect(() => {
    if (view === 'admin-users') fetchAdminUsers();
  }, [view, user]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const el = profileMenuRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [view]);

  useEffect(() => {
    if (!user) return;
    if (view !== 'evaluation') return;

    if (user.department === 'H&S') {
      setEvalUploadFilters((p) => ({ ...p, year: 'I' }));
      setEvalFilters((p) => ({ ...p, year: 'I' }));
    } else {
      setEvalUploadFilters((p) => ({ ...p, year: p.year === 'I' ? 'II' : p.year }));
      setEvalFilters((p) => ({ ...p, year: p.year === 'I' ? 'II' : p.year }));
    }
  }, [view, user?.department]);

  useEffect(() => {
    if (!user) return;
    if (view !== 'profile-edit') return;
    setProfileForm({
      name: user.name || '',
      email: user.email || '',
    });
    setProfileSaveError(null);
  }, [view, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faculty_id: authForm.faculty_id, password: authForm.password })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setView('dashboard');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!authForm.name || !authForm.faculty_id || !authForm.password) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }

    if ((authForm.role === 'FACULTY' || authForm.role === 'HOD') && !authForm.department) {
      setError("Department is required for Faculty/HOD.");
      setLoading(false);
      return;
    }

    try {
      const signupData = {
        ...authForm,
        department: (authForm.role === 'EXAM_BRANCH' || authForm.role === 'ADMIN') ? '' : authForm.department,
        email: authForm.email?.trim() || ''
      };

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
      });
      const data = await res.json();
      if (data.success) {
        setView('login');
        alert("Account created! Please login.");
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
    setAuthForm({ faculty_id: '', name: '', email: '', password: '', department: 'CSE', role: 'FACULTY' });
  };

  function parseCsvStudents(csvText: string): Array<{ roll_number: string; student_name: string }> {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];

    const split = (line: string) => {
      // Basic CSV split (handles simple quoted commas).
      const out: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
          continue;
        }
        if (ch === ',' && !inQuotes) {
          out.push(cur.trim());
          cur = '';
          continue;
        }
        cur += ch;
      }
      out.push(cur.trim());
      return out.map((v) => v.replaceAll(/^"|"$/g, '').trim());
    };

    const rows = lines.map(split);
    const header = rows[0].map((h) => h.toLowerCase());
    const rollIdx = header.findIndex((h) => h.includes('roll'));
    const nameIdx = header.findIndex((h) => h.includes('name'));
    const start = rollIdx >= 0 && nameIdx >= 0 ? 1 : 0;

    const students: Array<{ roll_number: string; student_name: string }> = [];
    for (let i = start; i < rows.length; i++) {
      const r = rows[i];
      const roll = String(r[rollIdx >= 0 ? rollIdx : 0] || '').trim();
      const name = String(r[nameIdx >= 0 ? nameIdx : 1] || '').trim();
      if (!roll || !name) continue;
      students.push({ roll_number: roll, student_name: name });
    }
    return students;
  }

  async function parseStudentListFile(file: File): Promise<Array<{ roll_number: string; student_name: string }>> {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.csv')) {
      const text = await file.text();
      return parseCsvStudents(text);
    }
    if (lower.endsWith('.xlsx')) {
      const xlsx = await import('xlsx');
      const buf = new Uint8Array(await file.arrayBuffer());
      const wb = xlsx.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      if (!rows.length) return [];
      const header = rows[0].map((h) => String(h || '').toLowerCase());
      const rollIdx = header.findIndex((h) => h.includes('roll'));
      const nameIdx = header.findIndex((h) => h.includes('name'));
      const start = rollIdx >= 0 && nameIdx >= 0 ? 1 : 0;
      const students: Array<{ roll_number: string; student_name: string }> = [];
      for (let i = start; i < rows.length; i++) {
        const r = rows[i] || [];
        const roll = String(r[rollIdx >= 0 ? rollIdx : 0] || '').trim();
        const name = String(r[nameIdx >= 0 ? nameIdx : 1] || '').trim();
        if (!roll || !name) continue;
        students.push({ roll_number: roll, student_name: name });
      }
      return students;
    }
    throw new Error('Unsupported file type. Please upload CSV or XLSX.');
  }

  const handleHodUploadStudentList = async () => {
    if (!user) return;
    setEvalUploadError(null);
    setEvalUploadSuccess(null);
    if (user.role !== 'HOD') {
      setEvalUploadError('Only HOD can upload student lists.');
      return;
    }
    if (!evalUploadFile) {
      setEvalUploadError('Please select a CSV/XLSX file.');
      return;
    }

    setEvalLoading(true);
    try {
      const students = await parseStudentListFile(evalUploadFile);
      if (!students.length) throw new Error('No valid students found in the file.');

      const res = await fetch('/api/eval/student-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hod_faculty_id: user.faculty_id,
          department: user.department,
          branch: user.department === 'H&S' ? evalUploadFilters.branch : '',
          regulation: evalUploadFilters.regulation,
          year: evalUploadFilters.year,
          section: evalUploadFilters.section,
          students,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to upload student list');
      setEvalUploadSuccess(`Uploaded ${data?.count || students.length} students successfully.`);
      setEvalUploadFile(null);
    } catch (e: any) {
      setEvalUploadError(e?.message || 'Upload failed');
    } finally {
      setEvalLoading(false);
    }
  };

  const loadEvaluationStudentList = async () => {
    if (!user) return;
    setEvalError(null);
    setEvalList(null);
    setEvalMarks({});
    setEvalStep('descriptive');

    setEvalLoading(true);
    try {
      const qs = new URLSearchParams({
        department: user.department,
        ...(user.department === 'H&S' ? { branch: evalFilters.branch } : {}),
        regulation: evalFilters.regulation,
        year: evalFilters.year,
        section: evalFilters.section,
      });
      const res = await fetch(`/api/eval/student-lists?${qs.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load student list');
      setEvalList(data.list);

      // Prefill CO labels from latest approved paper (if exists).
      if (evalFilters.subject_code) {
        try {
          const paperQs = new URLSearchParams({
            department: user.department,
            ...(user.department === 'H&S' ? { branch: evalFilters.branch } : {}),
            regulation: evalFilters.regulation,
            year: evalFilters.year,
            mid_exam_type: evalFilters.mid_type,
            subject_code: evalFilters.subject_code,
            status: 'Approved',
          });
          const pRes = await fetch(`/api/papers?${paperQs.toString()}`);
          const pData = await pRes.json().catch(() => []);
          const latest = Array.isArray(pData) ? pData[0] : null;
          if (latest?.id) {
            const full = await fetch(`/api/papers/${latest.id}`).then((r) => r.json());
            const set1 = (full.subjective || []).filter((q: any) => q.set_type === 'Set 1').slice(0, 6);
            const labels = set1.map((q: any, i: number) => (q.co_level ? String(q.co_level) : `CO${i + 1}`));
            if (labels.length) setEvalCoLabels([...labels, ...Array.from({ length: 6 - labels.length }, (_, i) => `CO${labels.length + i + 1}`)].slice(0, 6));
          }
        } catch {
          // ignore
        }
      }

      // Load previously saved marks (if any).
      if (evalFilters.mid_type && evalFilters.subject_code) {
        const mQs = new URLSearchParams({
          department: user.department,
          ...(user.department === 'H&S' ? { branch: evalFilters.branch } : {}),
          regulation: evalFilters.regulation,
          year: evalFilters.year,
          section: evalFilters.section,
          mid_type: evalFilters.mid_type,
          subject_code: evalFilters.subject_code,
        });
        const mRes = await fetch(`/api/eval/marks?${mQs.toString()}`);
        const mData = await mRes.json().catch(() => ({}));
        if (mRes.ok && Array.isArray(mData?.marks)) {
          const next: Record<string, { descriptive: (number | null)[]; mcq: (number | null)[]; fb: (number | null)[] }> = {};
          for (const row of mData.marks) {
            next[row.roll_number] = {
              descriptive: (row.descriptive_marks || []).map((v: any) => (v === null || v === undefined || v === '' ? null : Number(v))),
              mcq: (row.mcq_marks || []).map((v: any) => (v === null || v === undefined || v === '' ? null : Number(v))),
              fb: (row.fb_marks || []).map((v: any) => (v === null || v === undefined || v === '' ? null : Number(v))),
            };
          }
          setEvalMarks(next);
        }
      }
    } catch (e: any) {
      setEvalError(e?.message || 'Failed to load');
    } finally {
      setEvalLoading(false);
    }
  };

  const updateEvalMark = (roll: string, kind: 'descriptive' | 'mcq' | 'fb', index: number, value: string) => {
    const num = value === '' ? null : Number(value);
    setEvalMarks((prev) => {
      const existing = prev[roll] || { descriptive: Array(6).fill(null), mcq: Array(10).fill(null), fb: Array(10).fill(null) };
      const nextArr = [...(existing as any)[kind]];
      nextArr[index] = Number.isFinite(num as any) ? (num as any) : null;
      return { ...prev, [roll]: { ...existing, [kind]: nextArr } };
    });
  };

  const saveEvaluationMarks = async () => {
    if (!user) return;
    if (!evalList) return;
    if (!evalFilters.subject_name || !evalFilters.subject_code) {
      setEvalError('Subject Name and Subject Code are required.');
      return;
    }

    setEvalLoading(true);
    setEvalError(null);
    try {
      const entries = evalList.students.map((s) => {
        const m = evalMarks[s.roll_number] || { descriptive: Array(6).fill(null), mcq: Array(10).fill(null), fb: Array(10).fill(null) };
        return {
          roll_number: s.roll_number,
          student_name: s.student_name,
          descriptive_marks: m.descriptive,
          mcq_marks: m.mcq,
          fb_marks: m.fb,
        };
      });

      const res = await fetch('/api/eval/marks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faculty_id: user.faculty_id,
          department: user.department,
          branch: user.department === 'H&S' ? evalFilters.branch : '',
          regulation: evalFilters.regulation,
          year: evalFilters.year,
          section: evalFilters.section,
          mid_type: evalFilters.mid_type,
          subject_name: evalFilters.subject_name,
          subject_code: evalFilters.subject_code,
          entries,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save marks');
      alert(`Saved marks for ${data?.saved || entries.length} students.`);
    } catch (e: any) {
      setEvalError(e?.message || 'Save failed');
    } finally {
      setEvalLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const name = profileForm.name.trim();
    const email = profileForm.email.trim();

    if (!name) {
      setProfileSaveError("Name is required.");
      return;
    }

    setProfileSaving(true);
    setProfileSaveError(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.faculty_id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update profile");
      if (data?.user) {
        setUser(data.user);
      } else {
        setUser(prev => prev ? { ...prev, name, email } : prev);
      }
      setView('profile-view');
    } catch (err: any) {
      setProfileSaveError(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const openAdminEdit = (u: User) => {
    setAdminSelectedUser(u);
    setAdminEditForm({
      faculty_id: u.faculty_id,
      name: u.name,
      department: u.department || '',
      role: (u.role === 'HOD' ? 'HOD' : 'FACULTY') as Role,
      status: (u.status || 'Active') as any,
    });
    setAdminActionError(null);
    setView('admin-user-edit');
  };

  const openAdminResetPassword = (u: User) => {
    setAdminSelectedUser(u);
    setAdminResetForm({ new_password: '', confirm_password: '' });
    setAdminActionError(null);
    setView('admin-reset-password');
  };

  const handleAdminSaveUser = async () => {
    if (!user || user.role !== 'ADMIN' || !adminSelectedUser) return;
    setAdminActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(adminSelectedUser.faculty_id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminEditForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update user');
      await fetchAdminUsers();
      setView('admin-users');
    } catch (err: any) {
      setAdminActionError(err.message);
    }
  };

  const handleAdminDisableAccount = async (u: User) => {
    if (!user || user.role !== 'ADMIN') return;
    setAdminActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.faculty_id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Disabled' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to disable account');
      await fetchAdminUsers();
    } catch (err: any) {
      setAdminActionError(err.message);
    }
  };

  const handleAdminResetPassword = async () => {
    if (!user || user.role !== 'ADMIN' || !adminSelectedUser) return;
    if (!adminResetForm.new_password) {
      setAdminActionError('New password is required.');
      return;
    }
    if (adminResetForm.new_password !== adminResetForm.confirm_password) {
      setAdminActionError('Password confirmation does not match.');
      return;
    }
    setAdminActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(adminSelectedUser.faculty_id)}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: adminResetForm.new_password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to reset password');
      setView('admin-users');
    } catch (err: any) {
      setAdminActionError(err.message);
    }
  };

  const handleViewPaper = async (paperId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/papers/${paperId}`);
      const data = await res.json();
      setSelectedPaper(data);
      setView('view-paper');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPaper = async (paperId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/papers/${paperId}`);
      const data = await res.json();
      setSelectedPaper(data);
      setView('edit-paper');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = (paper: QuestionPaper, setType: PaperSetType) => {
    const html = buildPaperHtml(paper, setType, templateType);
    const safeCode = (paper.subject_code || 'paper').replaceAll(/[^a-zA-Z0-9-_]+/g, '_');
    const setSuffix = setType.replace(' ', '');
    const nameSuffix = templateType;
    downloadHtmlFile(`QP_${safeCode}_${setSuffix}_${nameSuffix}.html`, html);
  };

  const openOfficialPaper = (paper: QuestionPaper, setType: PaperSetType, autoPrint: boolean) => {
    let html = buildPaperHtml(paper, setType, templateType);
    if (autoPrint) {
      html = html.replace('</body>', '<script>window.addEventListener(\"load\",()=>window.print());</script></body>');
    }
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const officialPreviewHtml = useMemo(() => {
    if (!selectedPaper) return '';
    return buildPaperHtml(selectedPaper, templateSet, templateType);
  }, [selectedPaper, templateSet, templateType]);

  const handleUpdateStatus = async (paperId: number, status: string, comments: string) => {
    try {
      const res = await fetch(`/api/papers/${paperId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, hod_comments: comments })
      });
      if (res.ok) {
        fetchPapers();
        setView('dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Views ---

  if (view === 'login' || view === 'signup') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-primary/10"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
              <BookOpen className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-black tracking-tight">Academix</h1>
            <p className="text-primary/60 text-sm mt-1">College Academic Management System</p>
          </div>

          <form onSubmit={view === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {view === 'signup' && (
              <>
                <Input
                  label="Full Name"
                  placeholder="Enter your name"
                  value={authForm.name}
                  onChange={(e: any) => setAuthForm({ ...authForm, name: e.target.value })}
                  required
                />
                <Input
                  label="Email (Optional)"
                  placeholder="Enter your email"
                  type="email"
                  value={authForm.email}
                  onChange={(e: any) => setAuthForm({ ...authForm, email: e.target.value })}
                />
                <Select
                  label="Role"
                  value={authForm.role}
                  onChange={(e: any) => setAuthForm({ ...authForm, role: e.target.value as Role })}
                  options={[
                    { label: 'Faculty', value: 'FACULTY' },
                    { label: 'HOD', value: 'HOD' },
                    { label: 'Exam Branch', value: 'EXAM_BRANCH' },
                    { label: 'Admin', value: 'ADMIN' },
                  ]}
                />
                {(authForm.role === 'FACULTY' || authForm.role === 'HOD') && (
                  <Select
                    label="Department"
                    value={authForm.department}
                    onChange={(e: any) => setAuthForm({ ...authForm, department: e.target.value })}
                    options={[
                      { label: 'CSE', value: 'CSE' },
                      { label: 'CSD', value: 'CSD' },
                      { label: 'CSM', value: 'CSM' },
                      { label: 'ECE', value: 'ECE' },
                      { label: 'H&S', value: 'H&S' },
                    ]}
                  />
                )}
              </>
            )}
            <Input
              label="Faculty/Staff ID"
              placeholder="Enter your ID"
              value={authForm.faculty_id}
              onChange={(e: any) => setAuthForm({ ...authForm, faculty_id: e.target.value })}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={authForm.password}
              onChange={(e: any) => setAuthForm({ ...authForm, password: e.target.value })}
              required
            />

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Processing..." : view === 'login' ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setView(view === 'login' ? 'signup' : 'login')}
              className="text-sm text-primary hover:text-primary-hover font-medium"
            >
              {view === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-primary border-b border-primary-hover sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Academix</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold text-white">{user?.name}</span>
              <span className="text-xs text-white/70">{user?.role}{user?.department ? ` • ${user.department}` : ''}</span>
            </div>
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(v => !v)}
                className="w-10 h-10 rounded-full bg-white text-primary font-extrabold flex items-center justify-center border border-white/40 shadow-sm hover:bg-white/90 transition-all"
                aria-label="User menu"
              >
                {getInitials(user?.name)}
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-primary/10 shadow-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setView('profile-view'); setProfileMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-sm text-black hover:bg-primary-light/30 text-left"
                  >
                    View Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => { setView('profile-edit'); setProfileMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-sm text-black hover:bg-primary-light/30 text-left"
                  >
                    Edit Profile
                  </button>
                  <div className="h-px bg-primary/10"></div>
                  <button
                    type="button"
                    onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                    className="w-full px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 text-left flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-black">Dashboard</h2>
                  <p className="text-primary/60">Welcome back, {user?.name.split(' ')[0]}</p>
                </div>
              </div>

              {/* Stats/Modules Grid */}
              {(user?.role === 'FACULTY' || user?.role === 'HOD') && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { title: 'Question Paper Setting', icon: FileText, count: papers.filter(p => p.faculty_id === user.faculty_id).length, onClick: () => setView('create-paper') },
                    { title: 'Evaluation Scripts', icon: FileCheck, count: 0, onClick: () => setView('evaluation') },
                    { title: 'Articulation Matrix', icon: LayoutDashboard, count: 0 },
                    { title: 'Attainment', icon: ShieldCheck, count: 0 },
                  ].map((module, i) => (
                    <div
                      key={i}
                      onClick={module.onClick}
                      className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                    >
                      <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <module.icon className="text-primary w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-black">{module.title}</h3>
                      <p className="text-sm text-primary/60">{module.count} Submissions</p>
                    </div>
                  ))}
                </div>
              )}

              {user?.role === 'ADMIN' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div
                    onClick={() => setView('admin-users')}
                    className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Users className="text-primary w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-black">User Management</h3>
                    <p className="text-sm text-primary/60">Manage faculty accounts</p>
                  </div>
                </div>
              )}

              {/* HOD Approval Section */}
              {user?.role === 'HOD' && (
                <div className="bg-white rounded-2xl border border-primary/20 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-primary/10 flex items-center justify-between bg-primary-light/30">
                    <h3 className="font-bold text-primary flex items-center gap-2">
                      <ShieldCheck className="text-primary" size={20} />
                      Pending Question Papers
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-primary-light/10 text-primary/60 text-xs uppercase tracking-wider font-semibold">
                          <th className="px-6 py-4">Faculty Name</th>
                          <th className="px-6 py-4">Subject</th>
                          <th className="px-6 py-4">Dept/Branch</th>
                          <th className="px-6 py-4">Reg/Year/Sem</th>
                          <th className="px-6 py-4">Mid Exam Type</th>
                          <th className="px-6 py-4">Submitted</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary/5">
                        {papers.filter(p => p.status === 'Pending HOD Approval' || p.status === 'Pending Approval').length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-primary/40 text-sm italic">
                              No pending submissions for approval
                            </td>
                          </tr>
                        ) : (
                          papers.filter(p => p.status === 'Pending HOD Approval' || p.status === 'Pending Approval').map((paper) => (
                            <tr key={paper.id} className="hover:bg-primary-light/20 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-black">{paper.faculty_name}</td>
                              <td className="px-6 py-4 text-sm text-black/80">{paper.subject_name}</td>
                              <td className="px-6 py-4 text-sm text-black/80">{paper.department}{paper.branch ? ` (${paper.branch})` : ''}</td>
                              <td className="px-6 py-4 text-sm text-black/80">{paper.regulation} • {paper.year} • {paper.semester}</td>
                              <td className="px-6 py-4 text-sm text-black/80">{paper.mid_exam_type}</td>
                              <td className="px-6 py-4 text-sm text-black/80">{paper.created_at ? new Date(paper.created_at).toLocaleDateString() : ''}</td>
                              <td className="px-6 py-4">
                                <Badge status={paper.status} />
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleViewPaper(paper.id)}>
                                    View
                                  </Button>
                                  <Button variant="secondary" size="sm" onClick={() => handleEditPaper(paper.id)}>
                                    Edit
                                  </Button>
                                  <Button variant="success" size="sm" onClick={() => handleUpdateStatus(paper.id, 'Approved', '')}>
                                    <CheckCircle size={14} />
                                    Approve
                                  </Button>
                                  <Button variant="danger" size="sm" onClick={() => {
                                    const comments = prompt("Enter rejection reason:");
                                    if (comments !== null) handleUpdateStatus(paper.id, 'Rejected', comments);
                                  }}>
                                    <XCircle size={14} />
                                    Reject
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Main Content Table */}
              <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-primary/10 flex items-center justify-between bg-primary-light/20">
                  <h3 className="font-bold text-black">
                    {user?.role === 'FACULTY' ? 'My Submissions' :
                      user?.role === 'HOD' ? 'My Submissions' :
                        'Approved Question Papers'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-40">
                      <Select
                        value={dashboardFilters.department}
                        onChange={(e: any) => setDashboardFilters({ ...dashboardFilters, department: e.target.value, branch: '' })}
                        options={[
                          { label: 'All Depts', value: '' },
                          { label: 'CSE', value: 'CSE' },
                          { label: 'CSD', value: 'CSD' },
                          { label: 'CSM', value: 'CSM' },
                          { label: 'ECE', value: 'ECE' },
                          { label: 'H&S', value: 'H&S' },
                        ]}
                      />
                    </div>
                    {dashboardFilters.department === 'H&S' && (
                      <div className="w-32">
                        <Select
                          value={dashboardFilters.branch}
                          onChange={(e: any) => setDashboardFilters({ ...dashboardFilters, branch: e.target.value })}
                          options={[
                            { label: 'All Branches', value: '' },
                            { label: 'CSE', value: 'CSE' },
                            { label: 'CSD', value: 'CSD' },
                            { label: 'CSM', value: 'CSM' },
                            { label: 'ECE', value: 'ECE' },
                          ]}
                        />
                      </div>
                    )}
                    <div className="w-32">
                      <Select
                        value={dashboardFilters.regulation}
                        onChange={(e: any) => setDashboardFilters({ ...dashboardFilters, regulation: e.target.value })}
                        options={[
                          { label: 'All Regs', value: '' },
                          { label: 'R18', value: 'R18' },
                          { label: 'R20', value: 'R20' },
                          { label: 'R22', value: 'R22' },
                        ]}
                      />
                    </div>
                    {dashboardFilters.department !== 'H&S' && (
                      <div className="w-32">
                        <Select
                          value={dashboardFilters.year}
                          onChange={(e: any) => setDashboardFilters({ ...dashboardFilters, year: e.target.value })}
                          options={[
                            { label: 'All Years', value: '' },
                            { label: 'II Year', value: 'II' },
                            { label: 'III Year', value: 'III' },
                            { label: 'IV Year', value: 'IV' },
                          ]}
                        />
                      </div>
                    )}
                    <div className="w-32">
                      <Select
                        value={dashboardFilters.semester}
                        onChange={(e: any) => setDashboardFilters({ ...dashboardFilters, semester: e.target.value })}
                        options={[
                          { label: 'All Sems', value: '' },
                          { label: 'Sem I', value: 'Sem I' },
                          { label: 'Sem II', value: 'Sem II' },
                        ]}
                      />
                    </div>
                    <div className="w-32">
                      <Select
                        value={dashboardFilters.mid_exam_type}
                        onChange={(e: any) => setDashboardFilters({ ...dashboardFilters, mid_exam_type: e.target.value })}
                        options={[
                          { label: 'All Mids', value: '' },
                          { label: 'Mid I', value: 'Mid I' },
                          { label: 'Mid II', value: 'Mid II' },
                        ]}
                      />
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" size={16} />
                      <input
                        placeholder="Search papers..."
                        value={dashboardFilters.search}
                        onChange={(e) => setDashboardFilters({ ...dashboardFilters, search: e.target.value })}
                        className="pl-10 pr-4 py-2 bg-white border border-primary/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-primary-light/10 text-primary/60 text-xs uppercase tracking-wider font-semibold">
                        <th className="px-6 py-4">Subject</th>
                        <th className="px-6 py-4">Faculty</th>
                        <th className="px-6 py-4">Dept/Branch/Reg/Year/Sem</th>
                        <th className="px-6 py-4">Exam Type</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {(() => {
                        const filteredPapers = (user?.role === 'FACULTY' || user?.role === 'HOD'
                          ? papers.filter(p => p.faculty_id === user.faculty_id)
                          : papers
                        ).filter(p =>
                          p.subject_name.toLowerCase().includes(dashboardFilters.search.toLowerCase()) ||
                          p.subject_code.toLowerCase().includes(dashboardFilters.search.toLowerCase()) ||
                          p.faculty_name?.toLowerCase().includes(dashboardFilters.search.toLowerCase())
                        );

                        if (filteredPapers.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-primary/40">
                                <div className="flex flex-col items-center gap-2">
                                  <FileText size={40} className="text-primary/10" />
                                  <p>No question papers found</p>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return filteredPapers.map((paper) => (
                          <tr key={paper.id} className="hover:bg-primary-light/10 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-black">{paper.subject_name}</span>
                                <span className="text-xs text-primary/40">{paper.subject_code}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-black/80">{paper.faculty_name}</td>
                            <td className="px-6 py-4 text-sm text-black/80">{paper.department}{paper.branch ? ` (${paper.branch})` : ''} • {paper.regulation} • {paper.year} Year • {paper.semester}</td>
                            <td className="px-6 py-4 text-sm text-black/80">{paper.mid_exam_type}</td>
                            <td className="px-6 py-4">
                              <Badge status={paper.status} />
                            </td>
                            <td className="px-6 py-4 text-sm text-primary/40">
                              {new Date(paper.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleViewPaper(paper.id)}>
                                View Details
                                <ChevronRight size={16} />
                              </Button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'profile-view' && user && (
            <motion.div
              key="profile-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setView('dashboard')}>
                  <ChevronLeft size={18} />
                  Back to Dashboard
                </Button>
                <Button variant="secondary" onClick={() => setView('profile-edit')}>
                  <Users size={18} />
                  Edit Profile
                </Button>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-primary/10 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary text-white font-extrabold flex items-center justify-center text-xl">
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-black">{user.name}</h2>
                    <p className="text-primary/60 text-sm font-semibold">
                      {user.role}{user.department ? ` â€¢ ${user.department}` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wider text-primary/40 font-semibold">Name</div>
                    <div className="text-black font-semibold">{user.name}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wider text-primary/40 font-semibold">{user.role === 'EXAM_BRANCH' ? 'Staff ID' : 'Faculty ID'}</div>
                    <div className="text-black font-semibold">{user.faculty_id}</div>
                  </div>
                  {user.role !== 'EXAM_BRANCH' && (
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-wider text-primary/40 font-semibold">Department</div>
                      <div className="text-black font-semibold">{user.department}</div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wider text-primary/40 font-semibold">Role</div>
                    <div className="text-black font-semibold">{user.role}</div>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <div className="text-xs uppercase tracking-wider text-primary/40 font-semibold">Email (Optional)</div>
                    <div className="text-black font-semibold">{user.email?.trim() ? user.email : '-'}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'profile-edit' && user && (
            <motion.div
              key="profile-edit"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setView('profile-view')}>
                  <ChevronLeft size={18} />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => { setProfileSaveError(null); setView('profile-view'); }}
                    disabled={profileSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={profileSaving}>
                    <Save size={18} />
                    {profileSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-primary/10 shadow-sm space-y-6">
                <h2 className="text-2xl font-bold text-black">Edit Profile</h2>

                {profileSaveError && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                    <AlertCircle size={16} />
                    {profileSaveError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Name"
                    placeholder="Enter name"
                    value={profileForm.name}
                    onChange={(e: any) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                  <Input
                    label="Email (Optional)"
                    type="email"
                    placeholder="Enter email"
                    value={profileForm.email}
                    onChange={(e: any) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    label={user.role === 'EXAM_BRANCH' ? 'Staff ID' : 'Faculty ID'}
                    value={user.faculty_id}
                    readOnly
                    disabled
                  />
                  <Input
                    label="Role"
                    value={user.role}
                    readOnly
                    disabled
                  />
                  {user.role !== 'EXAM_BRANCH' && (
                    <Input
                      label="Department"
                      value={user.department}
                      readOnly
                      disabled
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'admin-users' && user?.role === 'ADMIN' && (
            <motion.div
              key="admin-users"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setView('dashboard')}>
                  <ChevronLeft size={18} />
                  Back to Dashboard
                </Button>
                <h2 className="text-2xl font-bold text-black">User Management</h2>
              </div>

              {(adminUsersError || adminActionError) && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                  <AlertCircle size={16} />
                  {adminUsersError || adminActionError}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-primary/10 bg-primary-light/30 flex items-center justify-between">
                  <div className="font-bold text-primary flex items-center gap-2">
                    <Users size={18} />
                    Faculty Accounts
                  </div>
                  <Button variant="secondary" onClick={fetchAdminUsers} disabled={adminUsersLoading}>
                    {adminUsersLoading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-primary-light/10 text-primary/60 text-xs uppercase tracking-wider font-semibold">
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Faculty ID</th>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {adminUsersLoading && adminUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-primary/50 text-sm">Loading users...</td>
                        </tr>
                      ) : adminUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-primary/50 text-sm">No faculty accounts found.</td>
                        </tr>
                      ) : (
                        adminUsers.map((u) => (
                          <tr key={u.faculty_id} className="hover:bg-primary-light/10">
                            <td className="px-6 py-4 text-sm font-semibold text-black">{u.name}</td>
                            <td className="px-6 py-4 text-sm text-primary/60">{u.faculty_id}</td>
                            <td className="px-6 py-4 text-sm text-primary/60">{u.department}</td>
                            <td className="px-6 py-4 text-sm text-primary/60">{u.role}</td>
                            <td className="px-6 py-4 text-sm">
                              <Badge status={u.status || 'Active'} />
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <Button variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => openAdminEdit(u)}>
                                  Edit
                                </Button>
                                <Button variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => openAdminResetPassword(u)}>
                                  Reset Password
                                </Button>
                                <Button
                                  variant="danger"
                                  className="px-3 py-1.5 text-sm"
                                  disabled={(u.status || 'Active') === 'Disabled'}
                                  onClick={() => handleAdminDisableAccount(u)}
                                >
                                  Disable Account
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'admin-user-edit' && user?.role === 'ADMIN' && adminSelectedUser && (
            <motion.div
              key="admin-user-edit"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setView('admin-users')}>
                  <ChevronLeft size={18} />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setView('admin-users')}>Cancel</Button>
                  <Button onClick={handleAdminSaveUser}>
                    <Save size={18} />
                    Save
                  </Button>
                </div>
              </div>

              {adminActionError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                  <AlertCircle size={16} />
                  {adminActionError}
                </div>
              )}

              <div className="bg-white p-8 rounded-2xl border border-primary/10 shadow-sm space-y-6">
                <h2 className="text-2xl font-bold text-black">Edit Faculty Account</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Name"
                    value={adminEditForm.name}
                    onChange={(e: any) => setAdminEditForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    label="Faculty ID"
                    value={adminEditForm.faculty_id}
                    onChange={(e: any) => setAdminEditForm(prev => ({ ...prev, faculty_id: e.target.value }))}
                  />
                  <Select
                    label="Role"
                    value={adminEditForm.role}
                    onChange={(e: any) => setAdminEditForm(prev => ({ ...prev, role: e.target.value as Role }))}
                    options={[
                      { label: 'Faculty', value: 'FACULTY' },
                      { label: 'HOD', value: 'HOD' },
                    ]}
                  />
                  <Select
                    label="Department"
                    value={adminEditForm.department}
                    onChange={(e: any) => setAdminEditForm(prev => ({ ...prev, department: e.target.value }))}
                    options={[
                      { label: 'CSE', value: 'CSE' },
                      { label: 'CSD', value: 'CSD' },
                      { label: 'CSM', value: 'CSM' },
                      { label: 'ECE', value: 'ECE' },
                      { label: 'H&S', value: 'H&S' },
                    ]}
                  />
                  <Select
                    label="Account Status"
                    value={adminEditForm.status}
                    onChange={(e: any) => setAdminEditForm(prev => ({ ...prev, status: e.target.value }))}
                    options={[
                      { label: 'Active', value: 'Active' },
                      { label: 'Disabled', value: 'Disabled' },
                    ]}
                  />
                </div>
                <div className="text-xs text-primary/50">
                  Note: Password cannot be changed here. Use the separate "Reset Password" action.
                </div>
              </div>
            </motion.div>
          )}

          {view === 'admin-reset-password' && user?.role === 'ADMIN' && adminSelectedUser && (
            <motion.div
              key="admin-reset-password"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setView('admin-users')}>
                  <ChevronLeft size={18} />
                  Back
                </Button>
                <Button onClick={handleAdminResetPassword}>
                  <Save size={18} />
                  Set Password
                </Button>
              </div>

              {adminActionError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                  <AlertCircle size={16} />
                  {adminActionError}
                </div>
              )}

              <div className="bg-white p-8 rounded-2xl border border-primary/10 shadow-sm space-y-6">
                <h2 className="text-2xl font-bold text-black">Reset Password</h2>
                <div className="text-sm text-primary/60">
                  Reset password for <span className="font-semibold text-black">{adminSelectedUser.name}</span> ({adminSelectedUser.faculty_id})
                </div>
                <div className="space-y-4">
                  <Input
                    label="New Password"
                    type="password"
                    value={adminResetForm.new_password}
                    onChange={(e: any) => setAdminResetForm(prev => ({ ...prev, new_password: e.target.value }))}
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    value={adminResetForm.confirm_password}
                    onChange={(e: any) => setAdminResetForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {view === 'evaluation' && user && (
            <motion.div
              key="evaluation"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between gap-4">
                <Button variant="ghost" onClick={() => setView('dashboard')}>
                  <ChevronLeft size={18} />
                  Back to Dashboard
                </Button>
                <h2 className="text-2xl font-bold text-black">Evaluation Scripts</h2>
              </div>

              {evalUploadError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                  <AlertCircle size={16} />
                  {evalUploadError}
                </div>
              )}
              {evalUploadSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg flex items-center gap-2 border border-emerald-100">
                  <CheckCircle size={16} />
                  {evalUploadSuccess}
                </div>
              )}
              {evalError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                  <AlertCircle size={16} />
                  {evalError}
                </div>
              )}

              {/* HOD Upload */}
              {user.role === 'HOD' && (
                <div className="bg-white p-8 rounded-2xl border border-primary/10 shadow-sm space-y-6">
                  <h3 className="text-lg font-bold text-black">HOD: Upload Student List</h3>
                  <div className={`grid grid-cols-1 gap-4 ${user.department === 'H&S' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                    <Select
                      label="Regulation"
                      value={evalUploadFilters.regulation}
                      onChange={(e: any) => setEvalUploadFilters((p) => ({ ...p, regulation: e.target.value }))}
                      options={[
                        { value: 'R22', label: 'R22' },
                        { value: 'R25', label: 'R25' },
                      ]}
                    />

                    {user.department === 'H&S' ? (
                      <Input label="Year" value="I" readOnly disabled />
                    ) : (
                      <Select
                        label="Year"
                        value={evalUploadFilters.year}
                        onChange={(e: any) => setEvalUploadFilters((p) => ({ ...p, year: e.target.value }))}
                        options={[
                          { value: 'II', label: 'II' },
                          { value: 'III', label: 'III' },
                          { value: 'IV', label: 'IV' },
                        ]}
                      />
                    )}

                    {user.department === 'H&S' && (
                      <Select
                        label="Branch"
                        value={evalUploadFilters.branch}
                        onChange={(e: any) => setEvalUploadFilters((p) => ({ ...p, branch: e.target.value }))}
                        options={[
                          { value: 'CSE', label: 'CSE' },
                          { value: 'CSM', label: 'CSM' },
                          { value: 'CSD', label: 'CSD' },
                          { value: 'ECE', label: 'ECE' },
                          { value: 'EEE', label: 'EEE' },
                          { value: 'IT', label: 'IT' },
                          { value: 'MECH', label: 'MECH' },
                          { value: 'CIVIL', label: 'CIVIL' },
                        ]}
                      />
                    )}
                    <Input
                      label="Section"
                      placeholder="A / B / C"
                      value={evalUploadFilters.section}
                      onChange={(e: any) => setEvalUploadFilters((p) => ({ ...p, section: e.target.value.toUpperCase() }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-black">Student List File (CSV/XLSX)</label>
                      <input
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={(e) => setEvalUploadFile(e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-primary/10 rounded-lg bg-white"
                      />
                      <div className="text-xs text-primary/50">Columns: Roll Number, Student Name</div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleHodUploadStudentList} disabled={evalLoading}>
                        <Upload size={18} />
                        {evalLoading ? 'Uploading...' : 'Upload List'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Faculty Marks Entry */}
              {user.role === 'FACULTY' && (
                <div className="bg-white p-8 rounded-2xl border border-primary/10 shadow-sm space-y-6">
                  <h3 className="text-lg font-bold text-black">Faculty: Select Filters</h3>
                  <div className={`grid grid-cols-1 gap-4 ${user.department === 'H&S' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                    <Select
                      label="Regulation"
                      value={evalFilters.regulation}
                      onChange={(e: any) => setEvalFilters((p) => ({ ...p, regulation: e.target.value }))}
                      options={[
                        { value: 'R22', label: 'R22' },
                        { value: 'R25', label: 'R25' },
                      ]}
                    />

                    {user.department === 'H&S' ? (
                      <Input label="Year" value="I" readOnly disabled />
                    ) : (
                      <Select
                        label="Year"
                        value={evalFilters.year}
                        onChange={(e: any) => setEvalFilters((p) => ({ ...p, year: e.target.value }))}
                        options={[
                          { value: 'II', label: 'II' },
                          { value: 'III', label: 'III' },
                          { value: 'IV', label: 'IV' },
                        ]}
                      />
                    )}

                    {user.department === 'H&S' && (
                      <Select
                        label="Branch"
                        value={evalFilters.branch}
                        onChange={(e: any) => setEvalFilters((p) => ({ ...p, branch: e.target.value }))}
                        options={[
                          { value: 'CSE', label: 'CSE' },
                          { value: 'CSM', label: 'CSM' },
                          { value: 'CSD', label: 'CSD' },
                          { value: 'ECE', label: 'ECE' },
                          { value: 'EEE', label: 'EEE' },
                          { value: 'IT', label: 'IT' },
                          { value: 'MECH', label: 'MECH' },
                          { value: 'CIVIL', label: 'CIVIL' },
                        ]}
                      />
                    )}
                    <Input
                      label="Section"
                      placeholder="A / B / C"
                      value={evalFilters.section}
                      onChange={(e: any) => setEvalFilters((p) => ({ ...p, section: e.target.value.toUpperCase() }))}
                    />
                    <Select
                      label="Mid Type"
                      value={evalFilters.mid_type}
                      onChange={(e: any) => setEvalFilters((p) => ({ ...p, mid_type: e.target.value }))}
                      options={[
                        { value: 'Mid I', label: 'Mid 1' },
                        { value: 'Mid II', label: 'Mid 2' },
                      ]}
                    />
                    <Input
                      label="Subject Name"
                      placeholder="Subject Name"
                      value={evalFilters.subject_name}
                      onChange={(e: any) => setEvalFilters((p) => ({ ...p, subject_name: e.target.value }))}
                    />
                    <Input
                      label="Subject Code"
                      placeholder="Subject Code"
                      value={evalFilters.subject_code}
                      onChange={(e: any) => setEvalFilters((p) => ({ ...p, subject_code: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={loadEvaluationStudentList} disabled={evalLoading}>
                      {evalLoading ? 'Loading...' : 'Load Student List'}
                    </Button>
                  </div>
                </div>
              )}

              {user.role === 'FACULTY' && evalList && (
                <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-primary/10 bg-primary-light/30 flex items-center justify-between">
                    <div className="font-bold text-primary flex items-center gap-2">
                      <FileCheck size={18} />
                      Student List: {evalList.regulation} • {evalList.year} • {evalList.branch ? `Branch ${evalList.branch} • ` : ''}Sec {evalList.section}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" disabled={evalStep === 'descriptive'} onClick={() => setEvalStep('descriptive')}>Descriptive</Button>
                      <Button variant="secondary" disabled={evalStep === 'objective'} onClick={() => setEvalStep('objective')}>Objective</Button>
                      <Button onClick={saveEvaluationMarks} disabled={evalLoading}>
                        <Save size={18} />
                        Save Marks
                      </Button>
                    </div>
                  </div>

                  {evalStep === 'descriptive' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-primary-light/10 text-primary/60 text-xs uppercase tracking-wider font-semibold">
                            <th className="px-4 py-3">Roll No</th>
                            <th className="px-4 py-3">Student Name</th>
                            {Array.from({ length: 6 }, (_, i) => (
                              <th key={i} className="px-4 py-3 text-center">{`Q${i + 1}`} <span className="normal-case text-[10px] text-primary/40">({evalCoLabels[i] || `CO${i + 1}`})</span></th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/5">
                          {evalList.students.map((s) => (
                            <tr key={s.roll_number} className="hover:bg-primary-light/10">
                              <td className="px-4 py-3 text-sm font-medium text-black">{s.roll_number}</td>
                              <td className="px-4 py-3 text-sm text-black/80">{s.student_name}</td>
                              {Array.from({ length: 6 }, (_, i) => (
                                <td key={i} className="px-2 py-2">
                                  <input
                                    type="number"
                                    min={0}
                                    className="w-20 px-2 py-1 border border-primary/10 rounded-lg text-sm text-center"
                                    value={(evalMarks[s.roll_number]?.descriptive?.[i] ?? '') as any}
                                    onChange={(e) => updateEvalMark(s.roll_number, 'descriptive', i, e.target.value)}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {evalStep === 'objective' && (
                    <div className="p-6 space-y-8">
                      <div className="overflow-x-auto">
                        <div className="font-bold text-black mb-2">Part I – MCQs</div>
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-primary-light/10 text-primary/60 text-xs uppercase tracking-wider font-semibold">
                              <th className="px-4 py-3">Roll No</th>
                              <th className="px-4 py-3">Student Name</th>
                              {Array.from({ length: 10 }, (_, i) => (
                                <th key={i} className="px-4 py-3 text-center">{`MCQ${i + 1}`}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-primary/5">
                            {evalList.students.map((s) => (
                              <tr key={s.roll_number} className="hover:bg-primary-light/10">
                                <td className="px-4 py-3 text-sm font-medium text-black">{s.roll_number}</td>
                                <td className="px-4 py-3 text-sm text-black/80">{s.student_name}</td>
                                {Array.from({ length: 10 }, (_, i) => (
                                  <td key={i} className="px-2 py-2">
                                    <input
                                      type="number"
                                      min={0}
                                      className="w-20 px-2 py-1 border border-primary/10 rounded-lg text-sm text-center"
                                      value={(evalMarks[s.roll_number]?.mcq?.[i] ?? '') as any}
                                      onChange={(e) => updateEvalMark(s.roll_number, 'mcq', i, e.target.value)}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="overflow-x-auto">
                        <div className="font-bold text-black mb-2">Part II – Fill in the Blanks</div>
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-primary-light/10 text-primary/60 text-xs uppercase tracking-wider font-semibold">
                              <th className="px-4 py-3">Roll No</th>
                              <th className="px-4 py-3">Student Name</th>
                              {Array.from({ length: 10 }, (_, i) => (
                                <th key={i} className="px-4 py-3 text-center">{`FB${i + 1}`}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-primary/5">
                            {evalList.students.map((s) => (
                              <tr key={s.roll_number} className="hover:bg-primary-light/10">
                                <td className="px-4 py-3 text-sm font-medium text-black">{s.roll_number}</td>
                                <td className="px-4 py-3 text-sm text-black/80">{s.student_name}</td>
                                {Array.from({ length: 10 }, (_, i) => (
                                  <td key={i} className="px-2 py-2">
                                    <input
                                      type="number"
                                      min={0}
                                      className="w-20 px-2 py-1 border border-primary/10 rounded-lg text-sm text-center"
                                      value={(evalMarks[s.roll_number]?.fb?.[i] ?? '') as any}
                                      onChange={(e) => updateEvalMark(s.roll_number, 'fb', i, e.target.value)}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {view === 'create-paper' && (
            <QuestionPaperForm
              user={user!}
              onCancel={() => setView('dashboard')}
              onSuccess={() => {
                fetchPapers();
                setView('dashboard');
              }}
            />
          )}

          {view === 'edit-paper' && selectedPaper && (
            <QuestionPaperForm
              user={user!}
              paper={selectedPaper}
              onCancel={() => setView('dashboard')}
              onSuccess={() => {
                fetchPapers();
                setView('dashboard');
              }}
            />
          )}

          {view === 'view-paper' && selectedPaper && (
            <motion.div
              key="view-paper"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setView('dashboard')}>
                  <ChevronLeft size={18} />
                  Back to Dashboard
                </Button>
                <div className="flex gap-2 items-center print:hidden">
                  <select
                    value={templateSet}
                    onChange={(e) => setTemplateSet(e.target.value as any)}
                    className="px-3 py-2 rounded-lg border border-primary/10 bg-white text-sm"
                    aria-label="Select set"
                  >
                    <option value="Set 1">Set 1</option>
                    <option value="Set 2">Set 2</option>
                  </select>
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value as PaperTemplateType)}
                    className="px-3 py-2 rounded-lg border border-primary/10 bg-white text-sm"
                    aria-label="Select template"
                  >
                    <option value="descriptive">Descriptive (20)</option>
                    <option value="bit">Objective (10)</option>
                    <option value="official">Combined (30)</option>
                  </select>
                  <Button variant="secondary" onClick={() => handleDownloadTemplate(selectedPaper, templateSet)}>
                    <Download size={18} />
                    Download HTML
                  </Button>
                  <Button variant="secondary" onClick={() => openOfficialPaper(selectedPaper, templateSet, true)}>
                    <Printer size={18} />
                    Download PDF
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-primary/10 shadow-lg overflow-hidden print:shadow-none print:border-none">
                <div className="p-4 bg-primary-light/10 border-b border-primary/10 print:hidden">
                  <div className="text-sm text-primary/60">
                    Official formatted preview (template-only view).
                  </div>
                </div>
                <iframe
                  title="Official Question Paper Preview"
                  className="w-full h-[70vh] md:h-[75vh] bg-white"
                  srcDoc={officialPreviewHtml}
                />
                {/* Paper Header */}
                <div className="hidden p-8 border-b border-primary/10 bg-primary-light/10">
                  <h2 className="text-2xl font-bold text-black uppercase text-center">Academix College of Engineering</h2>
                  <p className="text-primary/60 font-medium mt-1">
                    {selectedPaper.mid_exam_type} Examination • {selectedPaper.regulation} • {selectedPaper.year} Year • {selectedPaper.semester} • {selectedPaper.department}{selectedPaper.branch ? ` (${selectedPaper.branch})` : ''}
                  </p>
                  <div className="grid grid-cols-2 gap-x-12 gap-y-2 mt-6 text-sm text-left w-full max-w-2xl">
                    <div className="flex justify-between border-b border-primary/10 pb-1">
                      <span className="text-primary/40">Subject:</span>
                      <span className="font-bold text-black">{selectedPaper.subject_name}</span>
                    </div>
                    <div className="flex justify-between border-b border-primary/10 pb-1">
                      <span className="text-primary/40">Code:</span>
                      <span className="font-bold text-black">{selectedPaper.subject_code}</span>
                    </div>
                    <div className="flex justify-between border-b border-primary/10 pb-1">
                      <span className="text-primary/40">Regulation:</span>
                      <span className="font-bold text-black">{selectedPaper.regulation}</span>
                    </div>
                    <div className="flex justify-between border-b border-primary/10 pb-1">
                      <span className="text-primary/40">Semester:</span>
                      <span className="font-bold text-black">{selectedPaper.semester}</span>
                    </div>
                    <div className="flex justify-between border-b border-primary/10 pb-1">
                      <span className="text-primary/40">Sets:</span>
                      <span className="font-bold text-black">Set 1 & Set 2</span>
                    </div>
                    <div className="flex justify-between border-b border-primary/10 pb-1">
                      <span className="text-primary/40">Max Marks:</span>
                      <span className="font-bold text-black">30</span>
                    </div>
                  </div>
                </div>

                {/* Paper Content */}
                <div className="hidden p-10 space-y-16">
                  {['Set 1', 'Set 2'].map((setType) => (
                    <div key={setType} className="space-y-12 border-b border-primary/5 pb-12 last:border-0 last:pb-0">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="h-px flex-1 bg-primary/10"></div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-primary">{setType}</h3>
                        <div className="h-px flex-1 bg-primary/10"></div>
                      </div>

                      {/* Subjective Section */}
                      <section>
                        <div className="flex justify-between items-end mb-6 border-b-2 border-black pb-2">
                          <h3 className="text-lg font-bold uppercase tracking-wider">Section I: Subjective Questions</h3>
                          <span className="text-sm font-bold">Marks: 20</span>
                        </div>
                        <p className="text-sm italic text-primary/60 mb-6">Note: Answer any FOUR questions out of SIX. Each question carries 5 marks.</p>
                        <div className="space-y-6">
                          {selectedPaper.subjective?.filter(q => q.set_type === setType).map((q, i) => (
                            <div key={i} className="flex gap-4">
                              <span className="font-bold min-w-[24px]">{i + 1}.</span>
                              <div className="flex-1 flex justify-between items-start">
                                <div className="space-y-1">
                                  <p className="text-black/80 leading-relaxed">{q.question_text}</p>
                                  {(q.co_level || q.btl_level) && (
                                    <div className="flex gap-4 text-[10px] font-bold text-primary/40 uppercase tracking-tighter">
                                      {q.co_level && <span>CO: {q.co_level}</span>}
                                      {q.btl_level && <span>BTL: {q.btl_level}</span>}
                                    </div>
                                  )}
                                </div>
                                <span className="font-medium text-primary/40 ml-4">[{q.marks}]</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Objective Section */}
                      <section>
                        <div className="flex justify-between items-end mb-6 border-b-2 border-black pb-2">
                          <h3 className="text-lg font-bold uppercase tracking-wider">Section II: Objective Questions</h3>
                          <span className="text-sm font-bold">Marks: 10</span>
                        </div>

                        <div className="space-y-8">
                          {/* MCQs */}
                          <div>
                            <h4 className="font-bold mb-4 text-black">Part A: Multiple Choice Questions (10 x 0.5 = 5 Marks)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {selectedPaper.mcqs?.filter(q => q.set_type === setType).map((q, i) => (
                                <div key={i} className="space-y-2">
                                  <div className="flex gap-2">
                                    <span className="font-bold">{i + 1}.</span>
                                    <p className="text-sm text-black/80">{q.question_text}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pl-6">
                                    {['A', 'B', 'C', 'D'].map(opt => (
                                      <div key={opt} className="text-xs text-primary/60">
                                        <span className="font-bold mr-1">{opt})</span> {(q as any)[`option_${opt}`]}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Blanks */}
                          <div>
                            <h4 className="font-bold mb-4 text-black">Part B: Fill in the Blanks (10 x 0.5 = 5 Marks)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedPaper.blanks?.filter(q => q.set_type === setType).map((q, i) => (
                                <div key={i} className="flex gap-2 text-sm">
                                  <span className="font-bold">{i + 1}.</span>
                                  <p className="text-black/80">{q.question_text} ________________</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  ))}
                </div>

                {/* HOD Actions */}
                {user?.role === 'HOD' && (selectedPaper.status === 'Pending HOD Approval' || selectedPaper.status === 'Pending Approval') && (
                  <div className="p-8 bg-primary-light/10 border-t border-primary/10 flex flex-col gap-4 print:hidden">
                    <h4 className="font-bold text-black">HOD Review</h4>
                    <textarea
                      id="hod-comments"
                      placeholder="Add comments or feedback..."
                      className="w-full p-3 border border-primary/10 rounded-xl text-sm h-24 focus:ring-2 focus:ring-primary/20 outline-none"
                    ></textarea>
                    <div className="flex gap-3 justify-end">
                      <Button variant="danger" onClick={() => {
                        const comments = (document.getElementById('hod-comments') as HTMLTextAreaElement).value;
                        handleUpdateStatus(selectedPaper.id, 'Rejected', comments);
                      }}>
                        <XCircle size={18} />
                        Reject Paper
                      </Button>
                      <Button variant="success" onClick={() => {
                        const comments = (document.getElementById('hod-comments') as HTMLTextAreaElement).value;
                        handleUpdateStatus(selectedPaper.id, 'Approved', comments);
                      }}>
                        <CheckCircle size={18} />
                        Approve Paper
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status Footer */}
                <div className="p-6 bg-primary text-white flex justify-between items-center print:hidden">
                  <div className="flex items-center gap-3">
                    <span className="text-sm opacity-70">Current Status:</span>
                    <Badge status={selectedPaper.status} />
                  </div>
                  {selectedPaper.hod_comments && (
                    <div className="text-sm">
                      <span className="opacity-70">HOD Comments:</span>
                      <span className="ml-2 font-medium italic">"{selectedPaper.hod_comments}"</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
