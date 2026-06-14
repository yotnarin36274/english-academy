'use client';

import { useEffect, useRef, useState } from 'react';
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

interface RadarAxis { label: string; value: number; }

function RadarChart({ axes, sessions }: { axes: RadarAxis[]; sessions: number }) {
  if (axes.length < 3) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm space-y-1">
        <div className="text-3xl">🕸️</div>
        <p>ต้องมีข้อมูลประเมินทักษะอย่างน้อย 3 ด้าน</p>
        <p className="text-xs">กรุณาบันทึกการประเมินระหว่างคาบก่อนครับ</p>
      </div>
    );
  }

  const SIZE = 220;
  const cx = SIZE / 2, cy = SIZE / 2;
  const R = 80;
  const n = axes.length;
  const LEVELS = [0.25, 0.5, 0.75, 1.0];

  function pt(axisIdx: number, radius: number) {
    const angle = (axisIdx / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  function polygon(radius: number) {
    return Array.from({ length: n }, (_, i) => pt(i, radius))
      .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  const dataPolygon = axes.map((a, i) => pt(i, R * (a.value / 100)))
    .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-xs mx-auto block" style={{ height: SIZE }}>
        {/* Grid polygons */}
        {LEVELS.map(lv => (
          <polygon key={lv} points={polygon(R * lv)}
            fill="none" stroke="#e5e7eb" strokeWidth="1" />
        ))}
        {/* Percentage labels on 100% ring */}
        {LEVELS.map(lv => {
          const p = pt(0, R * lv);
          return (
            <text key={lv} x={p.x + 3} y={p.y} fontSize="7" fill="#d1d5db">
              {lv * 100}%
            </text>
          );
        })}
        {/* Axis lines */}
        {axes.map((_, i) => {
          const outer = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#e5e7eb" strokeWidth="1" />;
        })}
        {/* Data fill */}
        <polygon points={dataPolygon}
          fill="rgba(29,158,117,0.15)" stroke="#1D9E75" strokeWidth="2" strokeLinejoin="round" />
        {/* Data dots + value labels */}
        {axes.map((a, i) => {
          const p = pt(i, R * (a.value / 100));
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="#1D9E75" />
              {a.value > 0 && (
                <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize="8" fill="#1D9E75" fontWeight="bold">
                  {a.value}%
                </text>
              )}
            </g>
          );
        })}
        {/* Axis labels */}
        {axes.map((a, i) => {
          const outer = pt(i, R + 18);
          return (
            <text key={i} x={outer.x} y={outer.y + 4}
              textAnchor="middle" fontSize="10" fill="#374151" fontWeight="500">
              {a.label}
            </text>
          );
        })}
      </svg>
      {sessions > 0 && (
        <p className="text-xs text-gray-400 text-center mt-1">เฉลี่ยจาก {sessions} session</p>
      )}
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
  const [radarAxes, setRadarAxes] = useState<RadarAxis[]>([]);
  const [radarSessions, setRadarSessions] = useState(0);
  const [editForm, setEditForm] = useState({
    nickname: '', full_name: '', grade: 'ป.4', student_code: '',
    level: '', total_course_hours: '', notes: '',
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  useEffect(() => {
    loadAll();
    return () => { channelRef.current?.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadAll() {
    const { data: stu } = await db().from('students').select('*').eq('id', id).single();
    if (!stu) { router.replace('/teacher/students'); return; }
    setStudent(stu);
    await Promise.all([fetchHomework(stu), fetchRadar(stu.id)]);
    setLoading(false);

    if (!channelRef.current) {
      channelRef.current = db()
        .channel(`teacher-stu-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback', filter: `student_id=eq.${id}` },
          () => fetchHomework(stu))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_submissions', filter: `student_id=eq.${id}` },
          () => fetchHomework(stu))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'in_class_assessments', filter: `student_id=eq.${id}` },
          () => fetchRadar(id))
        .subscribe();
    }
  }

  async function fetchHomework(stu: Student) {
    const { data: asgList } = await db().from('assignments').select('*').eq('is_active', true).order('created_at', { ascending: false });
    const relevant = (asgList ?? []).filter((a: Assignment) => {
      const noTarget = a.target_groups.length === 0 && (a.target_student_ids ?? []).length === 0;
      return noTarget || a.target_groups.includes(stu.group_key) || (a.target_student_ids ?? []).includes(stu.id);
    });

    const { data: subsData } = await db().from('homework_submissions').select('*').eq('student_id', stu.id);
    const { data: fbData } = await db().from('feedback').select('*').eq('student_id', stu.id);

    const subMap = new Map<string, HomeworkSubmission>();
    (subsData ?? []).forEach((s: HomeworkSubmission) => subMap.set(s.assignment_id, s));

    const fbBySubId = new Map<string, FeedbackRow>();
    (fbData ?? []).forEach((f: FeedbackRow) => fbBySubId.set(f.submission_id, f));

    const merged: ProgressItem[] = relevant.map((a: Assignment) => {
      const sub = subMap.get(a.id) ?? null;
      const fb = sub ? fbBySubId.get(sub.id) ?? null : null;
      return { assignment: a, submission: sub, feedback: fb };
    });
    setItems(merged);
  }

  async function fetchRadar(studentId: string) {
    const { data: assessments } = await db()
      .from('in_class_assessments')
      .select('skill_ratings')
      .eq('student_id', studentId);

    if (!assessments?.length) { setRadarAxes([]); setRadarSessions(0); return; }

    const totals: Record<string, { sum: number; count: number }> = {};
    for (const a of assessments) {
      const ratings = (a.skill_ratings ?? {}) as Record<string, number>;
      for (const [skill, val] of Object.entries(ratings)) {
        if (!val) continue;
        if (!totals[skill]) totals[skill] = { sum: 0, count: 0 };
        totals[skill].sum += val;
        totals[skill].count += 1;
      }
    }

    const axes: RadarAxis[] = Object.entries(totals)
      .filter(([, t]) => t.count > 0)
      .map(([label, t]) => ({
        label,
        value: Math.round((t.sum / t.count / 5) * 100),
      }));

    setRadarAxes(axes);
    setRadarSessions(assessments.length);
  }

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

        {/* Radar chart */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">🕸️ ทักษะภาษาอังกฤษ</h3>
          <RadarChart axes={radarAxes} sessions={radarSessions} />
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
