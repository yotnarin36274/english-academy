'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student, Assignment, HomeworkSubmission, FeedbackRow } from '@/lib/db';

const GRADES = ['ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
const GRADE_GROUP: Record<string, string> = {
  'ป.4': 'p46', 'ป.5': 'p46', 'ป.6': 'p46',
  'ม.1': 'm13', 'ม.2': 'm13', 'ม.3': 'm13',
  'ม.4': 'm46', 'ม.5': 'm46', 'ม.6': 'm46',
};
const LEVELS = ['', 'Starter', 'Intermediate', 'Upper-Intermediate', 'Advanced'];
const LEVEL_COLOR: Record<string, string> = {
  Starter: 'bg-sky-100 text-sky-700',
  Intermediate: 'bg-green-100 text-green-700',
  'Upper-Intermediate': 'bg-amber-100 text-amber-700',
  Advanced: 'bg-purple-100 text-purple-700',
};

interface ProgressItem {
  assignment: Assignment;
  submission: HomeworkSubmission | null;
  feedback: FeedbackRow | null;
}

function ProgressChart({ items }: { items: ProgressItem[] }) {
  const scored = items.filter(i => i.feedback?.score != null).reverse().slice(-10);
  if (scored.length < 2) return (
    <div className="text-center py-8 text-gray-400 text-sm">ต้องมีงานที่ให้คะแนนอย่างน้อย 2 ชิ้น</div>
  );
  const W = 300, H = 100, pad = 12;
  const pts = scored.map((item, idx) => {
    const x = pad + (idx / (scored.length - 1)) * (W - pad * 2);
    const pct = item.feedback!.score! / item.feedback!.max_score;
    const y = H - pad - pct * (H - pad * 2);
    return { x, y, pct: Math.round(pct * 100) };
  });
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
        <line x1={pad} y1={H - pad - 0.8 * (H - pad * 2)} x2={W - pad} y2={H - pad - 0.8 * (H - pad * 2)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
        <line x1={pad} y1={H - pad - 0.6 * (H - pad * 2)} x2={W - pad} y2={H - pad - 0.6 * (H - pad * 2)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
        <polyline points={polyline} fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#1D9E75" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#6b7280">{p.pct}%</text>
          </g>
        ))}
      </svg>
      <div className="text-xs text-gray-400 text-center mt-1">ผลงาน {scored.length} ชิ้นล่าสุด</div>
    </div>
  );
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editForm, setEditForm] = useState({
    nickname: '', full_name: '', grade: 'ป.4', student_code: '',
    level: '', total_course_hours: '', notes: '',
  });

  useEffect(() => {
    async function load() {
      const { data: stu } = await db().from('students').select('*').eq('id', id).single();
      if (!stu) { router.replace('/teacher/students'); return; }
      setStudent(stu);

      const { data: asgList } = await db().from('assignments').select('*').eq('is_active', true).order('created_at', { ascending: false });
      const relevant = (asgList ?? []).filter(
        (a: Assignment) => a.target_groups.length === 0 || a.target_groups.includes(stu.group_key)
      );
      const { data: subs } = await db().from('homework_submissions').select('*, feedback(*)').eq('student_id', id);
      const subMap = new Map<string, HomeworkSubmission & { feedback: FeedbackRow[] }>();
      (subs ?? []).forEach((s: HomeworkSubmission & { feedback: FeedbackRow[] }) => subMap.set(s.assignment_id, s));
      const merged: ProgressItem[] = relevant.map((a: Assignment) => {
        const sub = subMap.get(a.id) ?? null;
        return { assignment: a, submission: sub, feedback: sub?.feedback?.[0] ?? null };
      });
      setItems(merged);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function startEdit() {
    if (!student) return;
    setEditForm({
      nickname: student.nickname,
      full_name: student.full_name ?? '',
      grade: student.grade,
      student_code: student.student_code,
      level: student.level ?? '',
      total_course_hours: student.total_course_hours?.toString() ?? '',
      notes: student.notes ?? '',
    });
    setEditing(true);
  }

  async function saveEdits() {
    if (!student || !editForm.nickname.trim() || !editForm.student_code.trim()) return;
    setSaving(true);
    const updates = {
      nickname: editForm.nickname.trim(),
      full_name: editForm.full_name.trim() || null,
      grade: editForm.grade,
      group_key: GRADE_GROUP[editForm.grade] ?? student.group_key,
      student_code: editForm.student_code.trim().toUpperCase(),
      level: editForm.level || null,
      total_course_hours: editForm.total_course_hours ? parseFloat(editForm.total_course_hours) : null,
      notes: editForm.notes.trim() || null,
    };
    await db().from('students').update(updates).eq('id', student.id);
    setStudent(prev => prev ? { ...prev, ...updates } : null);
    setSaving(false);
    setEditing(false);
  }

  function copyParentLink() {
    if (!student) return;
    const code = (student as Student & { level?: string }).student_code;
    navigator.clipboard.writeText(`${window.location.origin}/parent/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const reviewed = items.filter(i => i.feedback?.score != null);
  const avgPct = reviewed.length
    ? Math.round(reviewed.reduce((s, i) => s + (i.feedback!.score! / i.feedback!.max_score) * 100, 0) / reviewed.length)
    : null;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
          <h1 className="text-lg font-bold text-gray-800">โปรไฟล์นักเรียน</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          {!editing ? (
            <>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 font-bold text-xl flex items-center justify-center">
                  {student?.nickname[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-800">{student?.nickname}</h2>
                    {student?.level && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLOR[student.level] ?? 'bg-gray-100 text-gray-600'}`}>
                        {student.level}
                      </span>
                    )}
                  </div>
                  {student?.full_name && <p className="text-sm text-gray-500">{student.full_name}</p>}
                  <p className="text-sm text-gray-500">
                    {student?.grade} · <span className="font-mono text-gray-700">{student?.student_code}</span>
                  </p>
                </div>
                <button onClick={startEdit} className="text-sm text-blue-600 hover:underline shrink-0">แก้ไข</button>
              </div>

              {/* Parent link */}
              <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">ลิงก์ผู้ปกครอง</p>
                  <p className="text-xs text-gray-400">ผู้ปกครองเข้าด้วยรหัส <span className="font-mono font-semibold">{student?.student_code}</span></p>
                </div>
                <button onClick={copyParentLink}
                  className={`shrink-0 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                  {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอกลิงก์'}
                </button>
              </div>
            </>
          ) : (
            /* Edit form */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">แก้ไขข้อมูลนักเรียน</h3>
                <button onClick={() => setEditing(false)} className="text-sm text-gray-400 hover:text-gray-600">ยกเลิก</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">ชื่อเล่น *</label>
                  <input value={editForm.nickname} onChange={e => setEditForm(p => ({ ...p, nickname: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">ชื่อ-นามสกุล</label>
                  <input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="ไม่บังคับ"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">รหัสนักเรียน (ใช้ล็อกอิน) *</label>
                  <input value={editForm.student_code} onChange={e => setEditForm(p => ({ ...p, student_code: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <p className="text-xs text-amber-600 mt-0.5">⚠️ นักเรียนและผู้ปกครองต้องใช้รหัสใหม่</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">ชั้น</label>
                  <select value={editForm.grade} onChange={e => setEditForm(p => ({ ...p, grade: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {GRADES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">ระดับภาษาอังกฤษ</label>
                  <select value={editForm.level} onChange={e => setEditForm(p => ({ ...p, level: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {LEVELS.map(l => <option key={l} value={l}>{l || '— ไม่ระบุ —'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">ชม.ต่อ Course</label>
                  <input value={editForm.total_course_hours} onChange={e => setEditForm(p => ({ ...p, total_course_hours: e.target.value }))}
                    type="number" min="0" step="0.5" placeholder="เช่น 20"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">โน้ตครู (ไม่แสดงให้นักเรียนเห็น)</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-14 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <button onClick={saveEdits} disabled={saving || !editForm.nickname.trim() || !editForm.student_code.trim()}
                className="w-full bg-blue-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                {saving ? 'กำลังบันทึก...' : '💾 บันทึกการแก้ไข'}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-800">{items.length}</p>
            <p className="text-xs text-gray-500">งานทั้งหมด</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-800">{items.filter(i => i.submission).length}</p>
            <p className="text-xs text-gray-500">ส่งแล้ว</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className={`text-2xl font-bold ${avgPct == null ? 'text-gray-400' : avgPct >= 80 ? 'text-green-600' : avgPct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
              {avgPct != null ? `${avgPct}%` : '—'}
            </p>
            <p className="text-xs text-gray-500">เฉลี่ย</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">📈 กราฟพัฒนาการ</h3>
          <ProgressChart items={items} />
        </div>

        {/* Submission history */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">ประวัติการบ้าน</h3>
          <div className="space-y-2">
            {items.map(({ assignment: a, submission: sub, feedback: fb }) => (
              <div key={a.id} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-800 flex-1">{a.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${!sub ? 'bg-red-50 text-red-500' : !fb ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-700'}`}>
                    {!sub ? 'ไม่ส่ง' : !fb ? 'รอตรวจ' : fb.score != null ? `${fb.score}/${fb.max_score}` : 'ตรวจแล้ว'}
                  </span>
                </div>
                {fb?.comment && <p className="text-xs text-gray-500 mt-1 truncate">💬 {fb.comment}</p>}
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">ยังไม่มีงานที่มอบหมายให้นักเรียนคนนี้</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
