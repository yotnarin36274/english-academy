'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/supabase';
import { sendLineNotify, buildNewAssignmentMessage } from '@/lib/notifications';
import type { Assignment, Student } from '@/lib/db';

const GROUP_LABELS: Record<string, string> = { p46: 'ป.4–ป.6', m13: 'ม.1–ม.3', m46: 'ม.4–ม.6' };

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [targetGroups, setTargetGroups] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await db().from('assignments').select('*').order('created_at', { ascending: false });
    setAssignments(data ?? []);
  }

  function toggleGroup(g: string) {
    setTargetGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }

  async function createAssignment() {
    if (!title.trim()) return;
    setSaving(true);
    setNotifyStatus('');

    const { data: asg, error } = await db().from('assignments').insert({
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      target_groups: targetGroups,
      max_score: parseInt(maxScore) || 100,
      is_active: true,
    }).select().single();

    if (error || !asg) { setSaving(false); return; }

    // Notify parents via LINE
    const groups = targetGroups.length > 0 ? targetGroups : ['p46', 'm13', 'm46'];
    const { data: students } = await db()
      .from('students')
      .select('*')
      .in('group_key', groups)
      .eq('is_active', true)
      .not('parent_line_notify_token', 'is', null);

    let sent = 0;
    for (const stu of (students as Student[] ?? [])) {
      if (stu.parent_line_notify_token) {
        const msg = buildNewAssignmentMessage(stu, asg, window.location.origin);
        const ok = await sendLineNotify(stu.parent_line_notify_token, msg);
        if (ok) sent++;
      }
    }

    setNotifyStatus(`✅ สร้างงานแล้ว${sent > 0 ? ` · ส่ง LINE แจ้ง ${sent} ครอบครัว` : ''}`);
    setTitle(''); setDescription(''); setDueDate(''); setMaxScore('100'); setTargetGroups([]);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function toggleActive(a: Assignment) {
    await db().from('assignments').update({ is_active: !a.is_active }).eq('id', a.id);
    load();
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/teacher/homework" className="text-gray-400 hover:text-gray-600">←</a>
            <h1 className="text-lg font-bold text-gray-800">📝 จัดการการบ้าน</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            + สร้างงานใหม่
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
        {notifyStatus && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
            {notifyStatus}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">สร้างการบ้านใหม่</h2>

            <div>
              <label className="text-sm font-medium text-gray-700">ชื่องาน *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="เช่น ใบงาน Present Perfect"
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">รายละเอียด</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="คำแนะนำเพิ่มเติม..."
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">วันครบกำหนด</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="w-28">
                <label className="text-sm font-medium text-gray-700">คะแนนเต็ม</label>
                <input type="number" min="1" max="1000" value={maxScore} onChange={e => setMaxScore(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">กลุ่มเป้าหมาย (เว้นว่าง = ทุกกลุ่ม)</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(GROUP_LABELS).map(([key, label]) => (
                  <button key={key} onClick={() => toggleGroup(key)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${targetGroups.includes(key) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                ยกเลิก
              </button>
              <button onClick={createAssignment} disabled={!title.trim() || saving}
                className="flex-1 bg-blue-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                {saving ? 'กำลังสร้าง...' : '✅ สร้างงาน + แจ้ง LINE'}
              </button>
            </div>
          </div>
        )}

        {/* Assignment list */}
        {assignments.map(a => (
          <div key={a.id} className={`bg-white rounded-2xl shadow-sm p-4 border ${!a.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{a.title}</p>
                {a.description && <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {a.target_groups.length === 0
                    ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">ทุกกลุ่ม</span>
                    : a.target_groups.map(g => (
                      <span key={g} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{GROUP_LABELS[g]}</span>
                    ))
                  }
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">เต็ม {a.max_score}</span>
                  {a.due_date && (
                    <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">
                      📅 {new Date(a.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => toggleActive(a)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${a.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {a.is_active ? '✅ เปิดอยู่' : '🔒 ปิดแล้ว'}
              </button>
            </div>
          </div>
        ))}

        {assignments.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📝</div>
            <p>ยังไม่มีการบ้านครับ กด + เพื่อสร้างเลย</p>
          </div>
        )}
      </div>
    </main>
  );
}
