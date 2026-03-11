import React, { useState, useEffect } from 'react';
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
import { User, QuestionPaper, Role, SubjectiveQuestion, ObjectiveMCQ, FillBlank } from './types';

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
    'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Rejected': 'bg-red-50 text-red-700 border-red-200'
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles['Draft']}`}>
      {status}
    </span>
  );
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
        <div className="space-y-4">
          {setData.subjective.map((q: any, i: number) => (
            <div key={i} className="flex gap-4 items-start">
              <span className="mt-2 font-bold text-primary/40 w-6">{i + 1}.</span>
              <textarea 
                placeholder={`Enter question ${i + 1}...`}
                className="flex-1 p-3 border border-primary/10 rounded-xl text-sm h-20 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={q.question_text}
                onChange={(e) => updateSubjective(i, 'question_text', e.target.value)}
              />
              <div className="w-24">
                <Input 
                  label="Marks" 
                  type="number" 
                  value={q.marks} 
                  onChange={(e: any) => updateSubjective(i, 'marks', parseInt(e.target.value) || 0)}
                />
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
              <div className="flex gap-4">
                <span className="font-bold text-primary/40 w-6">{i + 1}.</span>
                <Input 
                  placeholder="Enter MCQ question text..."
                  value={q.question_text}
                  onChange={(e: any) => updateMCQ(i, 'question_text', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pl-10">
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
            <div key={i} className="flex gap-4 items-end">
              <span className="mb-2 font-bold text-primary/40 w-6">{i + 1}.</span>
              <Input 
                placeholder="Question text (use ____ for blank)..."
                value={q.question_text}
                onChange={(e: any) => updateBlank(i, 'question_text', e.target.value)}
              />
              <div className="w-64">
                <Input 
                  placeholder="Answer"
                  value={q.correct_answer}
                  onChange={(e: any) => updateBlank(i, 'correct_answer', e.target.value)}
                />
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
  
  const [formData, setFormData] = useState({
    department: paper?.department || user.department,
    year: paper?.year || 'II',
    semester: paper?.semester || '',
    mid_exam_type: paper?.mid_exam_type || 'Mid I',
    subject_name: paper?.subject_name || '',
    subject_code: paper?.subject_code || '',
    hod_comments: paper?.hod_comments || '',
  });

  const [set1, setSet1] = useState({
    subjective: paper?.subjective?.filter(q => q.set_type === 'Set 1') || Array(8).fill(null).map(() => ({ question_text: '', marks: 5 })),
    mcqs: paper?.mcqs?.filter(q => q.set_type === 'Set 1') || Array(10).fill(null).map(() => ({ question_text: '', option_A: '', option_B: '', option_C: '', option_D: '', correct_answer: 'A' })),
    blanks: paper?.blanks?.filter(q => q.set_type === 'Set 1') || Array(10).fill(null).map(() => ({ question_text: '', correct_answer: '' })),
  });

  const [set2, setSet2] = useState({
    subjective: paper?.subjective?.filter(q => q.set_type === 'Set 2') || Array(8).fill(null).map(() => ({ question_text: '', marks: 5 })),
    mcqs: paper?.mcqs?.filter(q => q.set_type === 'Set 2') || Array(10).fill(null).map(() => ({ question_text: '', option_A: '', option_B: '', option_C: '', option_D: '', correct_answer: 'A' })),
    blanks: paper?.blanks?.filter(q => q.set_type === 'Set 2') || Array(10).fill(null).map(() => ({ question_text: '', correct_answer: '' })),
  });

  // Ensure arrays have minimum length for the form
  useEffect(() => {
    if (set1.subjective.length < 8) setSet1(prev => ({ ...prev, subjective: [...prev.subjective, ...Array(8 - prev.subjective.length).fill(null).map(() => ({ question_text: '', marks: 5 }))] }));
    if (set1.mcqs.length < 10) setSet1(prev => ({ ...prev, mcqs: [...prev.mcqs, ...Array(10 - prev.mcqs.length).fill(null).map(() => ({ question_text: '', option_A: '', option_B: '', option_C: '', option_D: '', correct_answer: 'A' }))] }));
    if (set1.blanks.length < 10) setSet1(prev => ({ ...prev, blanks: [...prev.blanks, ...Array(10 - prev.blanks.length).fill(null).map(() => ({ question_text: '', correct_answer: '' }))] }));
    
    if (set2.subjective.length < 8) setSet2(prev => ({ ...prev, subjective: [...prev.subjective, ...Array(8 - prev.subjective.length).fill(null).map(() => ({ question_text: '', marks: 5 }))] }));
    if (set2.mcqs.length < 10) setSet2(prev => ({ ...prev, mcqs: [...prev.mcqs, ...Array(10 - prev.mcqs.length).fill(null).map(() => ({ question_text: '', option_A: '', option_B: '', option_C: '', option_D: '', correct_answer: 'A' }))] }));
    if (set2.blanks.length < 10) setSet2(prev => ({ ...prev, blanks: [...prev.blanks, ...Array(10 - prev.blanks.length).fill(null).map(() => ({ question_text: '', correct_answer: '' }))] }));
  }, []);

  const validateForm = () => {
    if (!formData.subject_name.trim()) return "Subject Name is required.";
    if (!formData.subject_code.trim()) return "Subject Code is required.";
    if (!formData.semester) return "Semester is required.";

    const checkSet = (set: any, name: string) => {
      const subCount = set.subjective.filter((q: any) => q.question_text.trim()).length;
      const mcqCount = set.mcqs.filter((q: any) => q.question_text.trim()).length;
      const blankCount = set.blanks.filter((q: any) => q.question_text.trim()).length;

      if (subCount === 0) return `${name}: At least one subjective question is required.`;
      if (mcqCount === 0) return `${name}: At least one MCQ is required.`;
      if (blankCount === 0) return `${name}: At least one fill-in-the-blank is required.`;
      return null;
    };

    const set1Error = checkSet(set1, "Set 1");
    if (set1Error) return set1Error;

    const set2Error = checkSet(set2, "Set 2");
    if (set2Error) return set2Error;

    return null;
  };

  const handleSubmit = async (status: 'Draft' | 'Pending Approval' | 'Approved') => {
    const error = validateForm();
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
              onChange={(e: any) => setFormData({ ...formData, department: e.target.value })}
              options={[
                { label: 'CSE', value: 'CSE' },
                { label: 'CSD', value: 'CSD' },
                { label: 'CSM', value: 'CSM' },
                { label: 'ECE', value: 'ECE' },
                { label: 'H&S', value: 'H&S' },
              ]}
            />
            <Select 
              label="Year"
              value={formData.year}
              onChange={(e: any) => setFormData({ ...formData, year: e.target.value })}
              options={[
                { label: 'II Year', value: 'II' },
                { label: 'III Year', value: 'III' },
                { label: 'IV Year', value: 'IV' },
              ]}
            />
            <Select 
              label="Semester"
              value={formData.semester}
              onChange={(e: any) => setFormData({ ...formData, semester: e.target.value })}
              options={[
                { label: 'Select Semester', value: '' },
                { label: 'Semester I', value: 'Sem I' },
                { label: 'Semester II', value: 'Sem II' },
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
            <Input 
              label="Subject Name"
              placeholder="e.g. Operating Systems"
              value={formData.subject_name}
              onChange={(e: any) => setFormData({ ...formData, subject_name: e.target.value })}
            />
            <Input 
              label="Subject Code"
              placeholder="e.g. CS301"
              value={formData.subject_code}
              onChange={(e: any) => setFormData({ ...formData, subject_code: e.target.value })}
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
              if (!formData.semester) {
                setValidationError("Semester is required.");
                return;
              }
              if (!formData.subject_name.trim()) {
                setValidationError("Subject Name is required.");
                return;
              }
              if (!formData.subject_code.trim()) {
                setValidationError("Subject Code is required.");
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
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ChevronLeft size={18} />
              Back to Details
            </Button>
            <Button onClick={() => setStep(3)}>
              Next: Set 2 Entry
              <ChevronRight size={18} />
            </Button>
          </div>
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
                  <Button variant="secondary" onClick={() => handleSubmit('Pending Approval')} disabled={loading}>
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
                  <Button onClick={() => handleSubmit('Pending Approval')} disabled={loading}>
                    <Send size={18} />
                    {paper ? "Update & Submit" : "Submit for Approval"}
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
  const [view, setView] = useState<'login' | 'signup' | 'dashboard' | 'create-paper' | 'edit-paper' | 'view-paper'>('login');
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardFilters, setDashboardFilters] = useState({
    department: '',
    year: '',
    semester: '',
    mid_exam_type: '',
    search: ''
  });

  // Auth States
  const [authForm, setAuthForm] = useState({
    faculty_id: '',
    name: '',
    password: '',
    department: 'CSE',
    role: 'FACULTY' as Role
  });

  // Fetch Papers
  const fetchPapers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let url = '/api/papers';
      const params = new URLSearchParams();
      
      if (user.role === 'FACULTY') {
        params.append('faculty_id', user.faculty_id);
      } else if (user.role === 'HOD') {
        params.append('department', user.department);
      } else if (user.role === 'EXAM_BRANCH') {
        params.append('status', 'Approved');
      }

      if (dashboardFilters.department) params.append('department', dashboardFilters.department);
      if (dashboardFilters.year) params.append('year', dashboardFilters.year);
      if (dashboardFilters.semester) params.append('semester', dashboardFilters.semester);
      if (dashboardFilters.mid_exam_type) params.append('mid_exam_type', dashboardFilters.mid_exam_type);
      
      const res = await fetch(`${url}?${params.toString()}`);
      const data = await res.json();
      setPapers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchPapers();
  }, [user, dashboardFilters.department, dashboardFilters.year, dashboardFilters.semester, dashboardFilters.mid_exam_type]);

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
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
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
    setAuthForm({ faculty_id: '', name: '', password: '', department: 'CSE', role: 'FACULTY' });
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
                <Select 
                  label="Role"
                  value={authForm.role}
                  onChange={(e: any) => setAuthForm({ ...authForm, role: e.target.value as Role })}
                  options={[
                    { label: 'Faculty', value: 'FACULTY' },
                    { label: 'HOD', value: 'HOD' },
                    { label: 'Exam Branch', value: 'EXAM_BRANCH' },
                  ]}
                />
              </>
            )}
            <Input 
              label="Faculty ID" 
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
                <span className="text-xs text-white/70">{user?.role} • {user?.department}</span>
              </div>
              <div className="h-8 w-px bg-white/20 mx-2"></div>
              <Button variant="ghost" onClick={handleLogout} className="text-white/80 hover:text-white hover:bg-white/10">
                <LogOut size={18} />
                <span className="hidden md:inline">Logout</span>
              </Button>
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
                    { title: 'Evaluation Scripts', icon: FileCheck, count: 0 },
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

              {/* HOD Approval Section */}
              {user?.role === 'HOD' && (
                <div className="bg-white rounded-2xl border border-primary/20 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-primary/10 flex items-center justify-between bg-primary-light/30">
                    <h3 className="font-bold text-primary flex items-center gap-2">
                      <ShieldCheck className="text-primary" size={20} />
                      Faculty Submissions for Approval
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-primary-light/10 text-primary/60 text-xs uppercase tracking-wider font-semibold">
                          <th className="px-6 py-4">Faculty Name</th>
                          <th className="px-6 py-4">Subject</th>
                          <th className="px-6 py-4">Department</th>
                          <th className="px-6 py-4">Year/Sem</th>
                          <th className="px-6 py-4">Mid Exam Type</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary/5">
                        {papers.filter(p => p.faculty_id !== user.faculty_id && p.status === 'Pending Approval').length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-primary/40 text-sm italic">
                              No pending submissions for approval
                            </td>
                          </tr>
                        ) : (
                          papers.filter(p => p.faculty_id !== user.faculty_id && p.status === 'Pending Approval').map((paper) => (
                            <tr key={paper.id} className="hover:bg-primary-light/20 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-black">{paper.faculty_name}</td>
                              <td className="px-6 py-4 text-sm text-black/80">{paper.subject_name}</td>
                              <td className="px-6 py-4 text-sm text-black/80">{paper.department}</td>
                              <td className="px-6 py-4 text-sm text-black/80">{paper.year} • {paper.semester}</td>
                              <td className="px-6 py-4 text-sm text-black/80">{paper.mid_exam_type}</td>
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
                        onChange={(e: any) => setDashboardFilters({ ...dashboardFilters, department: e.target.value })}
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
                        <th className="px-6 py-4">Dept/Year/Sem</th>
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
                            <td className="px-6 py-4 text-sm text-black/80">{paper.department} • {paper.year} Year • {paper.semester}</td>
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
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => window.print()}>
                    <Printer size={18} />
                    Print Paper
                  </Button>
                  {user?.role === 'EXAM_BRANCH' && (
                    <Button variant="primary">
                      <Download size={18} />
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-primary/10 shadow-lg overflow-hidden print:shadow-none print:border-none">
                {/* Paper Header */}
                <div className="p-8 border-b border-primary/10 bg-primary-light/10 flex flex-col items-center text-center">
                  <h2 className="text-2xl font-bold text-black uppercase text-center">Academix College of Engineering</h2>
                  <p className="text-primary/60 font-medium mt-1">
                    {selectedPaper.mid_exam_type} Examination • {selectedPaper.year} Year • {selectedPaper.semester} • {selectedPaper.department}
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
                <div className="p-10 space-y-16">
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
                                <p className="text-black/80 leading-relaxed">{q.question_text}</p>
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
                {user?.role === 'HOD' && selectedPaper.status === 'Pending Approval' && selectedPaper.faculty_id !== user.faculty_id && (
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
