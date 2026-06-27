'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student, Course } from '@/lib/db';

const SUBJECT_OPTIONS = ['English', 'MATH', 'Science', 'Thai', 'Social', 'Art'];
const GROUP_LABELS: Record<string, string> = { p46: 'ป.4–ป.6', m13: 'ม.1–ม.3', m46: 'ม.4–ม.6' };

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCover, setFormCover] = useState('');
  const [formHours, setFormHours] = useState('');
  const [formStudentIds, setFormStudentIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('teacher_auth') !== '1') {
      router.replace('/teacher');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const [{ data: cData }, { data: sData }] = await Promise.all([
      db().from('courses').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      db().from('students').select('*').eq('is_active', true).order('nickname'),
    ]);
    setCourses((cData ?? []) as Course[]);
    setAllStudents((sData ?? []) as Student[]);
    setLoading(false);
  }

  function resetForm() {
    setFormName(''); setFormSubject(''); setFormDesc('');
    setFormCover(''); setFormHours(''); setFormStudentIds([]);
    setEditingId(null);
  }

  function startCreate() {
    resetForm();
    setShowForm(true);
  }

  function startEdit(c: Course) {
    setFormName(c.name);
    setFormSubject(c.subject);
    setFormDesc(c.description ?? '');
    setFormCover(c.cover_image_url ?? '');
    setFormHours(c.total_hours > 0 ? c.total_hours.toString() : '');
    setFormStudentIds(c.student_ids);
    setEditingId(c.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveCourse() {
    if (!formName.trim()) return;
    setSaving(true);
    const payload = {
      name: formName.trim(),
      subject: formSubject.trim(),
      description: formDesc.trim() || null,
      cover_image_url: formCover.trim() || null,
      total_hours: parseFloat(formHours) || 0,
      student_ids: formStudentIds,
    };
    if (editingId) {
      await db().from('courses').update(payload).eq('id', editingId);
    } else {
      await db().from('courses').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    resetForm();
    loadData();
  }

  async function deleteCourse(id: string) {
    if (!window.confirm('ลบคอร์สนี้?\n(Sessions ที่สร้างไว้จะยังอยู่ แต่จะไม่เชื่อมกับคอร์ส)')) return;
    setDeletingId(id);
    await db().from('courses').update({ is_active: false }).eq('id', id);
    setDeletingId(null);
    setCourses(prev => prev.filter(c => c.id !== id));
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/teacher" className="text-gray-400 hover:text-gray-600">←</a>
            <h1 className="text-lg font-bold text-gray-800">📚 คอร์สทั้งหมด</h1>
          </div>
          <button onClick={startCreate}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            + สร้างคอร์ส
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-4">

        {/* Create / Edit form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 border-2 border-blue-200 max-w-2xl mx-auto w-full">
            <h2 className="font-semibold text-gray-800">{editingId ? '✏️ แก้ไขคอร์ส' : '📚 สร้างคอร์สใหม่'}</h2>

            <div>
              <label className="text-xs font-medium text-gray-600">ชื่อคอร์ส *</label>
              <input value={formName} onChange={e => setFormName(e.target.value)}
                placeholder="เช่น English Grammar ม.1–ม.3, MATH ป.4–ป.6"
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">วิชา</label>
              <input value={formSubject} onChange={e => setFormSubject(e.target.value)}
                list="course-subjects" placeholder="เช่น English, MATH"
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <datalist id="course-subjects">
                {SUBJECT_OPTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">รายละเอียดคอร์ส</label>
              <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)}
                placeholder="เนื้อหาที่จะเรียน, เป้าหมาย, ระดับผู้เรียน..."
                rows={3}
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">จำนวนชม.รวมของคอร์ส</label>
                <input type="number" step="0.5" min="0" value={formHours}
                  onChange={e => setFormHours(e.target.value)} placeholder="เช่น 10, 20"
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">รูปปกคอร์ส (URL)</label>
                <input value={formCover} onChange={e => setFormCover(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            {formCover.trim() && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={formCover} alt="preview" className="w-full h-32 object-cover rounded-xl border border-gray-200" />
            )}

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                นักเรียนในคอร์ส <span className="text-blue-600 font-bold">({formStudentIds.length} คน)</span>
              </label>
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                {allStudents.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400 text-center">ยังไม่มีนักเรียนในระบบ</p>
                ) : allStudents.map(s => (
                  <button key={s.id}
                    onClick={() => setFormStudentIds(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-gray-50 last:border-0 transition-colors ${formStudentIds.includes(s.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${formStudentIds.includes(s.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {formStudentIds.includes(s.id) && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {s.nickname[0]}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{s.nickname}</span>
                    <span className="text-xs text-gray-400">{s.grade}</span>
                    <span className="text-xs text-gray-300 ml-auto shrink-0">{GROUP_LABELS[s.group_key] ?? s.group_key}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }}
                className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">
                ยกเลิก
              </button>
              <button onClick={saveCourse} disabled={!formName.trim() || saving}
                className="flex-1 bg-blue-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold hover:bg-blue-700">
                {saving ? 'กำลังบันทึก...' : editingId ? '💾 บันทึก' : '✅ สร้างคอร์ส'}
              </button>
            </div>
          </div>
        )}

        {/* Course list */}
        {courses.length === 0 && !showForm ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">📚</div>
            <p className="font-medium text-gray-500">ยังไม่มีคอร์ส</p>
            <p className="text-sm mt-1">กด "+ สร้างคอร์ส" เพื่อเริ่มต้นครับ</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 items-start">
            {courses.map(c => (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {c.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.cover_image_url} alt="" className="w-full h-36 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {c.subject && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">{c.subject}</span>
                        )}
                        {c.total_hours > 0 && (
                          <span className="text-xs text-gray-400">⏱ {c.total_hours} ชม.</span>
                        )}
                        <span className="text-xs text-gray-400">👥 {c.student_ids.length} คน</span>
                      </div>
                      <h3 className="font-bold text-gray-800 mt-1 text-base">{c.name}</h3>
                      {c.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Student preview chips */}
                  {c.student_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {c.student_ids.slice(0, 6).map(sid => {
                        const stu = allStudents.find(s => s.id === sid);
                        return stu ? (
                          <span key={sid} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{stu.nickname}</span>
                        ) : null;
                      })}
                      {c.student_ids.length > 6 && (
                        <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">+{c.student_ids.length - 6}</span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <a href="/teacher/attendance"
                      className="flex-1 text-center bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
                      📅 ดู Sessions →
                    </a>
                    <button onClick={() => startEdit(c)}
                      className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm transition-colors">
                      ✏️
                    </button>
                    <button onClick={() => deleteCourse(c.id)} disabled={deletingId === c.id}
                      className="px-3 py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 text-sm transition-colors disabled:opacity-50">
                      {deletingId === c.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
