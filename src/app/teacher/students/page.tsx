'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student } from '@/lib/db';

const GROUP_LABELS: Record<string, string> = { p46: 'ป.4–ป.6', m13: 'ม.1–ม.3', m46: 'ม.4–ม.6' };
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

export default function TeacherStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    student_code: '', nickname: '', full_name: '', grade: 'ป.4', level: '',
    notes: '', total_course_hours: '', session_type: 'fixed' as 'fixed' | 'hourly',
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await db().from('students').select('*').order('student_code');
    setStudents(data ?? []);
  }

  function setField(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  async function save() {
    if (!form.student_code.trim() || !form.nickname.trim()) return;
    setSaving(true);
    const group_key = GRADE_GROUP[form.grade] ?? 'p46';
    await db().from('students').insert({
      student_code: form.student_code.trim().toUpperCase(),
      nickname: form.nickname.trim(),
      full_name: form.full_name.trim() || null,
      grade: form.grade,
      group_key,
      level: form.level || null,
      notes: form.notes.trim() || null,
      is_active: true,
      total_course_hours: form.total_course_hours ? parseFloat(form.total_course_hours) : null,
      session_type: form.session_type,
    });
    setSaving(false);
    setForm({ student_code: '', nickname: '', full_name: '', grade: 'ป.4', level: '', notes: '', total_course_hours: '', session_type: 'fixed' });
    setShowForm(false);
    load();
  }

  const filtered = students.filter(s =>
    !search || s.nickname.toLowerCase().includes(search.toLowerCase()) ||
    s.student_code.toLowerCase().includes(search.toLowerCase()) ||
    (s.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/teacher" className="text-gray-400 hover:text-gray-600">←</a>
            <h1 className="text-lg font-bold text-gray-800">👥 นักเรียน ({students.filter(s => s.is_active).length})</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            + เพิ่มนักเรียน
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-4 space-y-4">
        {/* Add form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">เพิ่มนักเรียนใหม่</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">รหัสนักเรียน (ใช้ล็อกอิน) *</label>
                <input value={form.student_code} onChange={e => setField('student_code', e.target.value)}
                  placeholder="MICKEY001"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">ชั้น *</label>
                <select value={form.grade} onChange={e => setField('grade', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {GRADES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">ชื่อเล่น *</label>
                <input value={form.nickname} onChange={e => setField('nickname', e.target.value)}
                  placeholder="มิน"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">ชื่อ-นามสกุล</label>
                <input value={form.full_name} onChange={e => setField('full_name', e.target.value)}
                  placeholder="ไม่บังคับ"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">ระดับภาษาอังกฤษ</label>
                <select value={form.level} onChange={e => setField('level', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {LEVELS.map(l => <option key={l} value={l}>{l || '— ไม่ระบุ —'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">ชม.ต่อ Course</label>
                <input value={form.total_course_hours} onChange={e => setField('total_course_hours', e.target.value)}
                  type="number" min="0" step="0.5" placeholder="เช่น 20"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">ประเภท Session</label>
              <select value={form.session_type} onChange={e => setField('session_type', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="fixed">แบบ Package (กำหนดชม.)</option>
                <option value="hourly">รายชั่วโมง</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">โน้ต</label>
              <input value={form.notes} onChange={e => setField('notes', e.target.value)}
                placeholder="โน้ตส่วนตัว (ไม่แสดงให้นักเรียนเห็น)"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                ยกเลิก
              </button>
              <button onClick={save} disabled={saving || !form.student_code.trim() || !form.nickname.trim()}
                className="flex-1 bg-blue-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                {saving ? '...' : 'บันทึก'}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 ค้นหาชื่อเล่น หรือ รหัส"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />

        {/* Student list */}
        <div className="space-y-2">
          {filtered.map(stu => (
            <button key={stu.id} onClick={() => router.push(`/teacher/students/${stu.id}`)}
              className="w-full bg-white rounded-2xl shadow-sm p-4 text-left border border-gray-100 hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                  {stu.nickname[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{stu.nickname}</p>
                    <span className="text-xs text-gray-500 font-mono">{stu.student_code}</span>
                    {!stu.is_active && <span className="text-xs text-red-400">(ไม่ active)</span>}
                    {stu.level && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLOR[stu.level] ?? 'bg-gray-100 text-gray-600'}`}>
                        {stu.level}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{stu.full_name ? `${stu.full_name} · ` : ''}{stu.grade} · {GROUP_LABELS[stu.group_key]}</p>
                </div>
                <span className="text-gray-400 text-sm shrink-0">→</span>
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">👥</div>
            <p>{search ? 'ไม่พบนักเรียนที่ค้นหา' : 'ยังไม่มีนักเรียนครับ กด + เพื่อเพิ่ม'}</p>
          </div>
        )}
      </div>
    </main>
  );
}
