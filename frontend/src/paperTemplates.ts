import type { FillBlank, ObjectiveMCQ, QuestionPaper, SubjectiveQuestion } from './types';
import { COLLEGE_LOGO_DATA_URI } from './collegeLogo';

export type PaperSetType = 'Set 1' | 'Set 2';
export type PaperTemplateType = 'official' | 'descriptive' | 'bit';

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDateDDMMYYYY(dateLike: string | number | Date) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

function setNumber(setType: PaperSetType) {
  return setType === 'Set 1' ? '1' : '2';
}

function defaultCollegeName() {
  return 'MALLA REDDY COLLEGE OF ENGINEERING';
}

function examTitle(paper: QuestionPaper) {
  const yearText = paper.year ? `${paper.year} YEAR` : '';
  const semText = paper.semester ? `${paper.semester} SEM` : '';
  const midText = paper.mid_exam_type ? paper.mid_exam_type.toUpperCase().replace(' ', '-') : '';
  const dateText = formatDateDDMMYYYY(paper.created_at || Date.now());
  const monthYear = (() => {
    const d = new Date(paper.created_at || Date.now());
    if (Number.isNaN(d.getTime())) return '';
    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    return `${month}-${d.getFullYear()}`;
  })();

  const parts = ['B.TECH', yearText, semText, midText ? `${midText} EXAMINATIONS` : 'EXAMINATIONS', monthYear].filter(Boolean);
  return { title: parts.join(' '), dateText };
}

function filterBySet<T extends { set_type?: string }>(items: T[] | undefined, setType: PaperSetType) {
  return (items || []).filter((q) => (q.set_type || '') === setType);
}

function descriptiveQuestionRows(subjective: SubjectiveQuestion[]) {
  const filled = subjective.filter((q) => q.question_text?.trim());
  const rowsTarget = 6;
  const rows: Array<SubjectiveQuestion | null> = [];
  for (let i = 0; i < rowsTarget; i++) rows.push(filled[i] ?? null);
  return rows;
}

export function buildPaperHtml(paper: QuestionPaper, setType: PaperSetType, template: PaperTemplateType) {
  if (template === 'official') return buildOfficialPaperHtml(paper, setType);
  if (template === 'bit') return buildBitPaperHtml(paper, setType);
  return buildDescriptivePaperHtml(paper, setType);
}

export function buildOfficialPaperHtml(paper: QuestionPaper, setType: PaperSetType) {
  const collegeName = defaultCollegeName();
  const {title, dateText} = examTitle(paper);
  const setNo = setNumber(setType);
  const branchText = paper.branch || paper.department || '';

  const timeMinutes = 120;
  const maxMarks = 30;

  const mcqs = filterBySet(paper.mcqs, setType).filter((q) => q.question_text?.trim());
  const blanks = filterBySet(paper.blanks, setType).filter((q) => q.question_text?.trim());
  const subjective = filterBySet(paper.subjective, setType).filter((q) => q.question_text?.trim());

  const mcqItems = Array.from({length: 10}, (_, i) => mcqs[i] ?? null).map((q, idx) => {
    if (!q) return `<li class="row"><span class="qno">${idx + 1}.</span><span class="qtext"></span></li>`;
    const opts = ['A', 'B', 'C', 'D']
      .map((opt) => {
        const key = `option_${opt}` as const;
        const val = escapeHtml((q as any)[key] || '');
        return `<div class="opt"><span class="optKey">${opt})</span> ${val}</div>`;
      })
      .join('');
    return `<li class="row">
      <span class="qno">${idx + 1}.</span>
      <div class="qwrap">
        <div class="qtext">${escapeHtml(q.question_text)}</div>
        <div class="opts">${opts}</div>
      </div>
    </li>`;
  });

  const blankItems = Array.from({length: 10}, (_, i) => blanks[i] ?? null).map((q, idx) => {
    const text = q ? escapeHtml(q.question_text) : '';
    return `<li class="row"><span class="qno">${idx + 1}.</span><span class="qtext">${text} <span class="blankline"></span></span></li>`;
  });

  const subjRowsTarget = 6;
  const subjRows = Array.from({length: subjRowsTarget}, (_, i) => subjective[i] ?? null).map((q, idx) => {
    const qNo = String(idx + 1);
    const text = q ? escapeHtml(q.question_text || '') : '';
    const marks = q ? escapeHtml(String(q.marks ?? '')) : '';
    const co = q ? escapeHtml(q.co_level || '') : '';
    const btl = q ? escapeHtml(q.btl_level || '') : '';
    return `
      <tr class="qrow">
        <td class="center">${qNo}</td>
        <td class="question">${text}</td>
        <td class="center">${marks}</td>
        <td class="center">${co}</td>
        <td class="center">${btl}</td>
      </tr>
    `;
  }).join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(paper.subject_code || 'Question Paper')}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      body { font-family: "Times New Roman", Times, serif; color: #000; }
      * { box-sizing: border-box; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
      th { font-weight: 700; text-align: center; }
      .center { text-align: center; }

      .top { display: grid; grid-template-columns: 90px 1fr 90px; column-gap: 12px; align-items: start; }
      .logoImg { width: 90px; height: 90px; object-fit: contain; }
      .hgroup { text-align: center; }
      .college { font-size: 28px; font-weight: 800; letter-spacing: 0.6px; }
      .exam { font-size: 18px; font-weight: 700; margin-top: 2px; }
      .objectiveLine { font-size: 18px; font-weight: 800; margin-top: 4px; }
      .meta1 { margin-top: 14px; display: grid; grid-template-columns: 1.4fr 1fr 0.8fr; column-gap: 18px; font-size: 18px; font-weight: 700; align-items: center; }
      .meta2 { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; column-gap: 18px; font-size: 18px; font-weight: 700; align-items: center; }
      .label { width: 110px; display: inline-block; }
      .hallRow { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
      .hallLabel { white-space: nowrap; font-weight: 800; }
      .line { display: inline-block; border-bottom: 2px solid #000; min-width: 220px; height: 18px; transform: translateY(-2px); }
      .hall { display: inline-grid; grid-auto-flow: column; grid-auto-columns: 26px; gap: 0; border: 1px solid #000; }
      .hall span { width: 26px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-right: 1px solid #000; font-weight: 700; }
      .hall span:last-child { border-right: none; }
      .setLine { margin-top: 18px; text-align: center; font-size: 20px; font-weight: 800; }
      .inst { margin-top: 6px; display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; }
      .sectionHdr { margin-top: 18px; display: flex; justify-content: space-between; font-size: 20px; font-weight: 800; }
      .subHdr { margin-top: 12px; font-size: 18px; font-weight: 800; }

      .sno { width: 48px; text-align: center; font-weight: 700; }
      .qcell { width: auto; min-height: 64px; }
      .q { font-size: 16px; margin-bottom: 6px; }
      .opts { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; font-size: 14px; }
      .optKey { font-weight: 800; }
      .tag { width: 110px; text-align: center; font-weight: 700; }
      .box { width: 70px; text-align: center; font-weight: 700; }
      .blankQ { font-size: 16px; }
      .blankline { display: inline-block; border-bottom: 1px solid #000; width: 200px; transform: translateY(-2px); }
    </style>
  </head>
  <body>
    <div class="top">
      <img class="logoImg" src="${COLLEGE_LOGO_DATA_URI}" alt="College Logo" />
      <div class="hgroup">
        <div class="college">${escapeHtml(collegeName)}</div>
        <div class="exam">${escapeHtml(title)}</div>
        <div class="objectiveLine">${escapeHtml(paper.regulation)} Reg-OBJECTIVE</div>
      </div>
      <div></div>
    </div>

    <div class="meta1">
      <div><span class="label">Subject:</span> ${escapeHtml(paper.subject_name || '')}</div>
      <div><span class="label">Branch:</span> ${escapeHtml(branchText)}</div>
      <div><span class="label">Date:</span> ${escapeHtml(dateText)}</div>
    </div>

    <div class="meta2">
      <div><span class="label">NAME:</span> <span class="line"></span></div>
      <div class="hallRow">
        <span class="hallLabel">HALLTICKETNO:</span>
        <span class="hall">
          <span></span><span></span><span>Q</span><span>9</span><span></span><span>A</span><span></span><span></span><span></span><span></span>
        </span>
      </div>
    </div>

    <div class="setLine">SET-${escapeHtml(setNo)}</div>
    <div class="inst">
      <div>Answer All Questions. All Questions Carry Equal Marks.</div>
      <div>Time: 20Min.</div>
    </div>

    <div class="sectionHdr">
      <div>I. Choose the correct alternative:</div>
      <div>Marks: 5</div>
    </div>

    <table style="margin-top:10px;">
      <thead>
        <tr>
          <th style="width:60px;"></th>
          <th></th>
          <th style="width:110px;">Bloom&#8217;s Level</th>
          <th style="width:70px;">CO</th>
          <th style="width:70px;"></th>
        </tr>
      </thead>
      <tbody>
        ${Array.from({length: 5}, (_, i) => mcqs[i] ?? null).map((q, idx) => {
          const qNo = `${idx + 1}.`;
          if (!q) {
            return `<tr>
              <td class="sno center">${escapeHtml(qNo)}</td>
              <td class="qcell"></td>
              <td class="tag"></td>
              <td class="box"></td>
              <td class="box center">[&nbsp;&nbsp;]</td>
            </tr>
            <tr>
              <td></td>
              <td class="qcell"></td>
              <td></td><td></td><td></td>
            </tr>`;
          }

          const opts = ['A', 'B', 'C', 'D'].map((opt) => {
            const key = `option_${opt}` as const;
            const val = escapeHtml((q as any)[key] || '');
            return `<div class="opt"><span class="optKey">${opt})</span> ${val}</div>`;
          }).join('');

          return `<tr>
              <td class="sno center">${escapeHtml(qNo)}</td>
              <td class="qcell">
                <div class="q">${escapeHtml(q.question_text || '')}</div>
                <div class="opts">${opts}</div>
              </td>
              <td class="tag center">${escapeHtml(q.btl_level || '')}</td>
              <td class="box center">${escapeHtml(q.co_level || '')}</td>
              <td class="box center">[&nbsp;&nbsp;]</td>
            </tr>
            <tr>
              <td></td>
              <td class="qcell"></td>
              <td></td><td></td><td></td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>

    <div class="sectionHdr">
      <div>II. Fill in the Blanks:</div>
      <div>Marks: 5</div>
    </div>

    <table style="margin-top:10px;">
      <thead>
        <tr>
          <th style="width:70px;">S.NO</th>
          <th></th>
          <th style="width:110px;">Bloom&#8217;s Level</th>
          <th style="width:70px;">CO</th>
        </tr>
      </thead>
      <tbody>
        ${Array.from({length: 10}, (_, i) => blanks[i] ?? null).map((q, idx) => {
          const sno = String(idx + 1);
          const text = q ? escapeHtml(q.question_text || '') : '';
          const btl = q ? escapeHtml(q.btl_level || '') : '';
          const co = q ? escapeHtml(q.co_level || '') : '';
          return `<tr>
            <td class="center">${escapeHtml(sno)}</td>
            <td class="blankQ">${text}</td>
            <td class="center">${btl}</td>
            <td class="center">${co}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </body>
</html>`;
}

export function buildDescriptivePaperHtml(paper: QuestionPaper, setType: PaperSetType) {
  const collegeName = defaultCollegeName();
  const {title, dateText} = examTitle(paper);
  const setNo = setNumber(setType);

  const timeMinutes = 120;
  const maxMarks = 30;

  const branchText = paper.branch || paper.department || '';

  const subjective = filterBySet(paper.subjective, setType).filter((q) => q.question_text?.trim());
  const rows = descriptiveQuestionRows(subjective);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(paper.subject_code || 'Question Paper')}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      body { font-family: "Times New Roman", Times, serif; color: #000; }
      * { box-sizing: border-box; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
      th { font-weight: 700; text-align: center; }
      .center { text-align: center; }

      .top { display: grid; grid-template-columns: 90px 1fr 90px; column-gap: 12px; align-items: start; }
      .logoImg { width: 90px; height: 90px; object-fit: contain; }
      .hgroup { text-align: center; }
      .college { font-size: 28px; font-weight: 800; letter-spacing: 0.6px; }
      .exam { font-size: 18px; font-weight: 700; margin-top: 2px; }
      .meta { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr 1fr; column-gap: 18px; font-size: 16px; font-weight: 700; align-items: center; }
      .meta2 { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; column-gap: 18px; font-size: 16px; font-weight: 700; align-items: center; }
      .label { width: 130px; display: inline-block; }

      .rule { margin-top: 10px; border-top: 2px solid #000; }
      .setLine { margin-top: 14px; text-align: center; font-size: 20px; font-weight: 800; }
      .inst { margin-top: 12px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; }
      .partTitle { margin-top: 16px; font-size: 18px; font-weight: 800; }
    </style>
  </head>
  <body>
    <div class="top">
      <img class="logoImg" src="${COLLEGE_LOGO_DATA_URI}" alt="College Logo" />
      <div class="hgroup">
        <div class="college">${escapeHtml(collegeName)}</div>
        <div class="exam">${escapeHtml(title)} • SET-${escapeHtml(setNo)}</div>
      </div>
      <div></div>
    </div>

    <div class="meta">
      <div><span class="label">Department/Branch:</span> ${escapeHtml(branchText)}</div>
      <div><span class="label">Regulation:</span> ${escapeHtml(paper.regulation || '')}</div>
      <div><span class="label">Date:</span> ${escapeHtml(dateText)}</div>
    </div>
    <div class="meta2">
      <div><span class="label">Subject:</span> ${escapeHtml(paper.subject_name || '')}</div>
      <div><span class="label">Subject Code:</span> ${escapeHtml(paper.subject_code || '')}</div>
    </div>
    <div class="meta2">
      <div><span class="label">Time:</span> ${escapeHtml(String(timeMinutes))} min</div>
      <div style="text-align:right;"><span class="label" style="width:auto;">Max Marks:</span> ${escapeHtml(String(maxMarks))}</div>
    </div>
    <div class="rule"></div>

    <div class="partTitle">PART A – Subjective Questions</div>
    <div class="inst">
      <div>Answer any Four of the following questions:</div>
      <div>4*5=20 Marks</div>
    </div>

    <table style="margin-top:10px;">
      <thead>
        <tr>
          <th style="width:60px;">Q.No</th>
          <th>Question</th>
          <th style="width:80px;">Marks</th>
          <th style="width:70px;">CO</th>
          <th style="width:70px;">BTL</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((q, idx) => {
          const qno = String(idx + 1);
          const text = q ? escapeHtml(q.question_text || '') : '';
          const marks = q ? escapeHtml(String(q.marks ?? '')) : '';
          const co = q ? escapeHtml(q.co_level || '') : '';
          const btl = q ? escapeHtml(q.btl_level || '') : '';
          return `<tr>
            <td class="center">${escapeHtml(qno)}</td>
            <td>${text}</td>
            <td class="center">${marks}</td>
            <td class="center">${co}</td>
            <td class="center">${btl}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </body>
</html>`;
}

export function buildBitPaperHtml(paper: QuestionPaper, setType: PaperSetType) {
  // For now, reuse descriptive template; this can be upgraded to the full BIT layout later.
  return buildDescriptivePaperHtml(paper, setType);
}

export function downloadHtmlFile(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

