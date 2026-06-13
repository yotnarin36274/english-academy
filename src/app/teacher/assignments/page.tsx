'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/supabase';
import { sendLineNotify, buildNewAssignmentMessage } from '@/lib/notifications';
import type { Assignment, Student } from '@/lib/db';

const GROUP_LABELS: Record<string, string> = { p46: 'ป.4–ป.6', m13: 'ม.1–ม.3', m46: 'ม.4–ม.6' };

type TargetMode = 'groups' | 'students';

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [targetMode, setTargetMode] = useState<TargetMode>('groups');
  const [targetGroups, setTargetGroups] = useState<string[]>([]);
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', dueDate: '', maxScore: '100' });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    load();
    loadStudents();
  }, []);

  async function load() {
    const { data } = await db().from('assignments').select('*').order('created_at', { ascending: false });
    setAssignments(data ?? []);
  }

  async function loadStudents() {
    const { data } = await db().from('students').select('*').eq('is_active', true).order('nickname');
    setAllStudents(data ?? []);
  }

  function toggleGroup(g: string) {
    setTargetGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }

  function toggleStudent(id: string) {
    setTargetStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function selectAllVisible() {
    const visibleIds = filteredStudents.map(s => s.id);
    const allSelected = visibleIds.every(id => targetStudentIds.includes(id));
    if (allSelected) {
      setTargetStudentIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setTargetStudentIds(prev => [...new Set([...prev, ...visibleIds])]);
    }
  }

  const filteredStudents = allStudents.filter(s => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return s.nickname.toLowerCase().includes(q)
      || (s.full_name ?? '').toLowerCase().includes(q)
      || s.student_code.toLowerCase().includes(q)
      || s.grade.toLowerCase().includes(q);
  });

  async function createAssignment() {
    if (!title.trim()) return;
    setSaving(true);
    setNotifyStatus('');

    const { data: asg, error } = await db().from('assignments').insert({
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      target_groups: targetMode === 'groups' ? targetGroups : [],
      target_student_ids: targetMode === 'students' ? targetStudentIds : [],
      max_score: parseInt(maxScore) || 100,
      is_active: true,
    }).select().single();

    if (error || !asg) {
      setNotifyStatus(`❌ เกิดข้อผิดพลาด: ${error?.message ?? 'ไม่สามารถสร้างงานได้'}`);
      setSaving(false);
      return;
    }

    // Notify parents via LINE
    let studentsToNotify: Student[] = [];

    if (targetMode === 'groups') {
      const groups = targetGroups.length > 0 ? targetGroups : ['p46', 'm13', 'm46'];
      const { data } = await db()
        .from('students')
        .select('*')
        .in('group_key', groups)
        .eq('is_active', true)
        .not('parent_line_notify_token', 'is', null);
      studentsToNotify = (data as Student[]) ?? [];
    } else {
      studentsToNotify = allStudents.filter(
        s => targetStudentIds.includes(s.id) && s.parent_line_notify_token
      );
    }

    let sent = 0;
    for (const stu of studentsToNotify) {
      if (stu.parent_line_notify_token) {
        const msg = buildNewAssignmentMessage(stu, asg, window.location.origin);
        const ok = await sendLineNotify(stu.parent_line_notify_token, msg);
        if (ok) sent++;
      }
    }

    setNotifyStatus(`✅ สร้างงานแล้ว${sent > 0 ? ` · ส่ง LINE แจ้ง ${sent} ครอบครัว` : ''}`);
    setTitle(''); setDescription(''); setDueDate(''); setMaxScore('100');
    setTargetMode('groups'); setTargetGroups([]); setTargetStudentIds([]);
    setStudentSearch('');
    setShowForm(false);
    setSaving(false);
    load();
  }

  function startEdit(a: Assignment) {
    setEditForm({
      title: a.title,
      description: a.description ?? '',
      dueDate: a.due_date ?? '',
      maxScore: a.max_score.toString(),
    });
    setEditingId(a.id);
  }

  async function saveEdit() {
    if (!editingId || !editForm.title.trim()) return;
    setEditSaving(true);
    await db().from('assignments').update({
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      due_date: editForm.dueDate || null,
      max_score: parseInt(editForm.maxScore) || 100,
    }).eq('id', editingId);
    setEditSaving(false);
    setEditingId(null);
    load();
  }

  async function toggleActive(a: Assignment) {
    await db().from('assignments').update({ is_active: !a.is_active }).eq('id', a.id);
    load();
  }

  async function deleteAssignment(id: string) {
    if (!window.confirm('ลบงานนี้?\nการส่งงานและ feedback ทั้งหมดที่เกี่ยวข้องจะถูกลบด้วย')) return;
    const { error } = await db().from('assignments').delete().eq('id', id);
    if (error) { alert('ลบไม่สำเร็จ: ' + error.message); return; }
    load();
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/teacher" className="text-gray-400 hover:text-gray-600">←</a>
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

            {/* Target mode toggle */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">มอบหมายให้</label>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setTargetMode('groups')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${targetMode === 'groups' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                  📚 ตามกลุ่ม
                </button>
                <button onClick={() => setTargetMode('students')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${targetMode === 'students' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                  👤 รายบุคคล
                </button>
              </div>

              {/* Group selector */}
              {targetMode === 'groups' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">เว้นว่าง = ส่งให้ทุกกลุ่ม</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(GROUP_LABELS).map(([key, label]) => (
                      <button key={key} onClick={() => toggleGroup(key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${targetGroups.includes(key) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual student selector */}
              {targetMode === 'students' && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Search bar */}
                  <div className="p-2 border-b border-gray-100 flex gap-2 items-center bg-gray-50">
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="🔍 ค้นหานักเรียน..."
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button onClick={selectAllVisible}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 whitespace-nowrap">
                      {filteredStudents.every(s => targetStudentIds.includes(s.id)) ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                    </button>
                  </div>

                  {/* Student list */}
                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                    {filteredStudents.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-6">ไม่พบนักเรียน</p>
                    ) : filteredStudents.map(s => {
                      const selected = targetStudentIds.includes(s.id);
                      return (
                        <button key={s.id} onClick={() => toggleStudent(s.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                            {selected && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                            {s.nickname[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{s.nickname}
                              {s.full_name && <span className="text-gray-400 font-normal text-xs ml-1">({s.full_name})</span>}
                            </p>
                            <p className="text-xs text-gray-400">{s.grade} · {s.student_code}</p>
                          </div>
                          {s.parent_line_notify_token && (
                            <span className="text-xs text-green-500 shrink-0">LINE ✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected count */}
                  {targetStudentIds.length > 0 && (
                    <div className="bg-blue-50 border-t border-blue-100 px-4 py-2 flex items-center justify-between">
                      <p className="text-sm text-blue-700 font-medium">เลือกแล้ว {targetStudentIds.length} คน</p>
                      <button onClick={() => setTargetStudentIds([])}
                        className="text-xs text-red-400 hover:text-red-500">ล้างทั้งหมด</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                ยกเลิก
              </button>
              <button onClick={createAssignment}
                disabled={!title.trim() || saving || (targetMode === 'students' && targetStudentIds.length === 0)}
                className="flex-1 bg-blue-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                {saving ? 'กำลังสร้าง...' : '✅ สร้างงาน + แจ้ง LINE'}
              </button>
            </div>
          </div>
        )}

        {/* Assignment list */}
        {assignments.map(a => {
          const hasIndividuals = (a.target_student_ids ?? []).length > 0;
          const namedStudents = hasIndividuals
            ? allStudents.filter(s => a.target_student_ids.includes(s.id))
            : [];

          // Inline edit form
          if (editingId === a.id) {
            return (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm p-5 border-2 border-blue-200 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-800">✏️ แก้ไขงาน</span>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">ชื่องาน *</label>
                  <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">รายละเอียด</label>
                  <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600">วันครบกำหนด</label>
                    <input type="date" value={editForm.dueDate} onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))}
                      className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div className="w-28">
                    <label className="text-xs font-medium text-gray-600">คะแนนเต็ม</label>
                    <input type="number" min="1" value={editForm.maxScore} onChange={e => setEditForm(f => ({ ...f, maxScore: e.target.value }))}
                      className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingId(null)}
                    className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                    ยกเลิก
                  </button>
                  <button onClick={saveEdit} disabled={editSaving || !editForm.title.trim()}
                    className="flex-1 bg-blue-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                    {editSaving ? 'กำลังบันทึก...' : '💾 บันทึก'}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={a.id} className={`bg-white rounded-2xl shadow-sm p-4 border ${!a.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{a.title}</p>
                  {a.description && <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {hasIndividuals ? (
                      namedStudents.length > 0
                        ? namedStudents.slice(0, 4).map(s => (
                          <span key={s.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            👤 {s.nickname}
                          </span>
                        )).concat(namedStudents.length > 4 ? [
                          <span key="more" className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            +{namedStudents.length - 4} คน
                          </span>
                        ] : [])
                        : <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">👤 รายบุคคล</span>
                    ) : a.target_groups.length === 0
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
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => startEdit(a)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                    ✏️ แก้ไข
                  </button>
                  <button onClick={() => toggleActive(a)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${a.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {a.is_active ? '✅ เปิดอยู่' : '🔒 ปิดแล้ว'}
                  </button>
                  <button onClick={() => deleteAssignment(a.id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                    🗑️ ลบ
                  </button>
                </div>
              </div>
            </div>
          );
        })}

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
