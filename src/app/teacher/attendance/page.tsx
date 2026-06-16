'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/supabase';
import type { Student, ClassSession, Attendance } from '@/lib/db';

const GROUP_LABELS: Record<string, string> = { p46: 'ป.4–ป.6', m13: 'ม.1–ม.3', m46: 'ม.4–ม.6' };
const STATUS_CONFIG = {
  present: { label: '✅ มา', bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700' },
  absent:  { label: '❌ ขาด', bg: 'bg-red-50',   border: 'border-red-400',   text: 'text-red-700'   },
  leave:   { label: '🤒 ลา',  bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700' },
} as const;

interface StudentWithAttendance extends Student {
  attendanceId?: string;
  status?: 'present' | 'absent' | 'leave';
  attendedHours?: number;
}

export default function AttendancePage() {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [sessionStudents, setSessionStudents] = useState<StudentWithAttendance[]>([]);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Edit / delete session
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionForm, setEditSessionForm] = useState({ date: '', topic: '', hours: '', week: '', subject: '' });
  const [editSessionSaving, setEditSessionSaving] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // Create session form
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTopic, setFormTopic] = useState('');
  const [formHours, setFormHours] = useState('1.5');
  const [formWeek, setFormWeek] = useState('');
  const [formMode, setFormMode] = useState<'group' | 'individual'>('group');
  const [formSubject, setFormSubject] = useState('');
  const [formGroups, setFormGroups] = useState<string[]>([]);
  const [formStudentIds, setFormStudentIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadSessions();
    loadStudents();
  }, []);

  async function loadSessions() {
    const { data } = await db().from('class_sessions').select('*').order('session_date', { ascending: false });
    setSessions((data ?? []) as ClassSession[]);
  }

  async function loadStudents() {
    const { data } = await db().from('students').select('*').eq('is_active', true).order('nickname');
    setAllStudents((data ?? []) as Student[]);
  }

  async function selectSession(session: ClassSession) {
    setSelectedSession(session);
    // Determine which students belong to this session
    let students: Student[];
    if (session.student_ids.length > 0) {
      students = allStudents.filter(s => session.student_ids.includes(s.id));
    } else if (session.group_key) {
      students = allStudents.filter(s => s.group_key === session.group_key);
    } else {
      students = allStudents;
    }

    // Load attendance for this session
    const { data: attData } = await db()
      .from('attendance').select('*').eq('session_id', session.id);
    const attMap = new Map<string, Attendance>();
    (attData ?? []).forEach((a: Attendance) => attMap.set(a.student_id, a));

    // Compute attended hours per student for THIS SUBJECT only
    const sessionSubject = session.subject ?? '';
    const studentIds = students.map(s => s.id);
    const { data: allPresent } = await db()
      .from('attendance').select('student_id, session_id')
      .in('student_id', studentIds).eq('status', 'present');
    const presentSessionIds = [...new Set((allPresent ?? []).map((a: {session_id: string}) => a.session_id))];
    const sessionHoursMap = new Map<string, number>();
    if (presentSessionIds.length > 0) {
      const { data: sData } = await db()
        .from('class_sessions').select('id, duration_hours, subject').in('id', presentSessionIds);
      (sData ?? []).forEach((s: {id: string; duration_hours: number; subject: string | null}) => {
        if ((s.subject ?? '') === sessionSubject) {
          sessionHoursMap.set(s.id, s.duration_hours);
        }
      });
    }
    const attendedMap = new Map<string, number>();
    (allPresent ?? []).forEach((a: {student_id: string; session_id: string}) => {
      attendedMap.set(a.student_id, (attendedMap.get(a.student_id) ?? 0) + (sessionHoursMap.get(a.session_id) ?? 0));
    });

    setSessionStudents(students.map(s => ({
      ...s,
      attendanceId: attMap.get(s.id)?.id,
      status: attMap.get(s.id)?.status,
      attendedHours: attendedMap.get(s.id) ?? 0,
    })));

  }

  async function markAttendance(stu: StudentWithAttendance, status: 'present' | 'absent' | 'leave') {
    if (!selectedSession) return;
    setSaving(p => ({ ...p, [stu.id]: true }));

    const prevStatus = stu.status;
    const { data: attRow } = await db().from('attendance').upsert({
      session_id: selectedSession.id,
      student_id: stu.id,
      status,
    }, { onConflict: 'session_id,student_id' }).select().single();

    // Update local state immediately (including attended hours)
    const thisDuration = selectedSession.duration_hours;
    setSessionStudents(prev => prev.map(s => {
      if (s.id !== stu.id) return s;
      let newHours = s.attendedHours ?? 0;
      if (status === 'present' && prevStatus !== 'present') newHours += thisDuration;
      else if (status !== 'present' && prevStatus === 'present') newHours = Math.max(0, newHours - thisDuration);
      return { ...s, status, attendanceId: (attRow as Attendance)?.id ?? s.attendanceId, attendedHours: newHours };
    }));

    // Handle makeup class creation/deletion
    if ((status === 'absent' || status === 'leave') && prevStatus === 'present') {
      // Create makeup record
      const attId = (attRow as Attendance)?.id;
      if (attId) {
        await db().from('makeup_classes').upsert({
          attendance_id: attId,
          student_id: stu.id,
          session_id: selectedSession.id,
          topic: selectedSession.topic,
          duration_hours: selectedSession.duration_hours,
          completed: false,
        }, { onConflict: 'attendance_id' });
      }
    } else if (status === 'present' && (prevStatus === 'absent' || prevStatus === 'leave')) {
      // Delete makeup record if existed
      if (stu.attendanceId) {
        await db().from('makeup_classes').delete().eq('attendance_id', stu.attendanceId);
      }
    }

    setSaving(p => ({ ...p, [stu.id]: false }));
  }

  function startEditSession(s: ClassSession) {
    setEditSessionForm({
      date: s.session_date,
      topic: s.topic,
      hours: s.duration_hours.toString(),
      week: s.week_number?.toString() ?? '',
      subject: s.subject ?? '',
    });
    setEditingSessionId(s.id);
  }

  async function saveEditSession() {
    if (!editingSessionId || !editSessionForm.topic.trim()) return;
    setEditSessionSaving(true);
    await db().from('class_sessions').update({
      session_date: editSessionForm.date,
      topic: editSessionForm.topic.trim(),
      duration_hours: parseFloat(editSessionForm.hours) || 1.5,
      week_number: editSessionForm.week ? parseInt(editSessionForm.week) : null,
      subject: editSessionForm.subject.trim(),
    }).eq('id', editingSessionId);
    setEditSessionSaving(false);
    setEditingSessionId(null);
    loadSessions();
  }

  async function deleteSession(id: string) {
    if (!window.confirm('ลบ Session นี้?\n(ข้อมูลเช็คชื่อและ Make-up ใน Session จะถูกลบด้วย)')) return;
    setDeletingSessionId(id);
    const { data: attRows } = await db().from('attendance').select('id').eq('session_id', id);
    if (attRows?.length) {
      await db().from('makeup_classes').delete().in('attendance_id', (attRows as {id: string}[]).map(a => a.id));
    }
    await db().from('makeup_classes').delete().eq('session_id', id);
    await db().from('attendance').delete().eq('session_id', id);
    await db().from('class_sessions').delete().eq('id', id);
    setDeletingSessionId(null);
    setSessions(prev => prev.filter(s => s.id !== id));
  }

  async function createSession() {
    if (!formTopic.trim()) return;
    setCreating(true);
    const { data } = await db().from('class_sessions').insert({
      session_date: formDate,
      topic: formTopic.trim(),
      subject: formSubject.trim(),
      duration_hours: parseFloat(formHours) || 1.5,
      week_number: formWeek ? parseInt(formWeek) : null,
      group_key: formMode === 'group' && formGroups.length === 1 ? formGroups[0] : null,
      student_ids: formMode === 'individual' ? formStudentIds : [],
    }).select().single();
    setCreating(false);
    if (data) {
      setShowForm(false);
      setFormTopic(''); setFormSubject(''); setFormGroups([]); setFormStudentIds([]); setFormWeek('');
      await loadSessions();
      selectSession(data as ClassSession);
    }
  }

  // Compute hours studied for a student in selected session
  function hoursLabel(stu: Student) {
    const total = stu.total_course_hours;
    if (stu.session_type === 'hourly') return 'รายชม.';
    if (total) return `${total} ชม./คอร์ส`;
    return '';
  }

  const pending = sessionStudents.filter(s => !s.status).length;
  const presentCount = sessionStudents.filter(s => s.status === 'present').length;
  const absentLeaveCount = sessionStudents.filter(s => s.status === 'absent' || s.status === 'leave').length;

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/teacher" className="text-gray-400 hover:text-gray-600">←</a>
            <h1 className="text-lg font-bold text-gray-800">📋 เช็คชื่อ</h1>
          </div>
          <div className="flex gap-2">
            {selectedSession && (
              <button onClick={() => setSelectedSession(null)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                ← เปลี่ยน Session
              </button>
            )}
            <button onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
              + สร้าง Session
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
        {/* Create form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">สร้าง Session ใหม่</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">วันที่สอน</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">สัปดาห์ที่</label>
                <input type="number" min="1" max="20" value={formWeek} onChange={e => setFormWeek(e.target.value)}
                  placeholder="เช่น 3"
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">วิชา</label>
              <input type="text" value={formSubject} onChange={e => setFormSubject(e.target.value)}
                list="subjects-datalist" placeholder="เช่น English, MATH, Science"
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <datalist id="subjects-datalist">
                <option value="English" />
                <option value="MATH" />
                <option value="Science" />
                <option value="Thai" />
              </datalist>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">หัวข้อที่สอน *</label>
              <input type="text" value={formTopic} onChange={e => setFormTopic(e.target.value)}
                placeholder="เช่น Present Simple + Subject-Verb Agreement"
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="w-32">
              <label className="text-xs font-medium text-gray-600">ระยะเวลา (ชม.)</label>
              <input type="number" step="0.5" min="0.5" max="8" value={formHours} onChange={e => setFormHours(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            {/* Mode toggle */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">นักเรียนที่เรียน</label>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setFormMode('group')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${formMode === 'group' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                  📚 ตามกลุ่ม
                </button>
                <button onClick={() => setFormMode('individual')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${formMode === 'individual' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                  👤 รายบุคคล
                </button>
              </div>
              {formMode === 'group' && (
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(GROUP_LABELS).map(([key, label]) => (
                    <button key={key} onClick={() => setFormGroups(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key])}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${formGroups.includes(key) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                      {label}
                    </button>
                  ))}
                  <span className="text-xs text-gray-400 self-center">เว้นว่าง = ทุกกลุ่ม</span>
                </div>
              )}
              {formMode === 'individual' && (
                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {allStudents.map(s => (
                    <button key={s.id} onClick={() => setFormStudentIds(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-gray-50 last:border-0 transition-colors ${formStudentIds.includes(s.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${formStudentIds.includes(s.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {formStudentIds.includes(s.id) && <span className="text-white text-xs">✓</span>}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{s.nickname}</span>
                      <span className="text-xs text-gray-400">{s.grade}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">
                ยกเลิก
              </button>
              <button onClick={createSession} disabled={!formTopic.trim() || creating}
                className="flex-1 bg-blue-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold hover:bg-blue-700">
                {creating ? 'กำลังสร้าง...' : '✅ สร้าง Session'}
              </button>
            </div>
          </div>
        )}

        {/* Session selected — show attendance cards */}
        {selectedSession ? (
          <>
            <div className="bg-blue-600 rounded-2xl p-4 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-blue-100 text-xs">
                    {new Date(selectedSession.session_date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {selectedSession.week_number && ` · สัปดาห์ ${selectedSession.week_number}`}
                  </p>
                  {selectedSession.subject && (
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
                      {selectedSession.subject}
                    </span>
                  )}
                  <h2 className="font-bold text-lg mt-0.5">{selectedSession.topic}</h2>
                  <p className="text-blue-100 text-sm">⏱ {selectedSession.duration_hours} ชม.</p>
                </div>
                <div className="text-right text-sm">
                  <div className="text-green-300 font-bold text-xl">{presentCount}</div>
                  <div className="text-blue-100 text-xs">มา</div>
                </div>
              </div>
              {/* Progress */}
              <div className="flex gap-3 mt-3 text-xs">
                <span className="bg-white/20 px-2 py-1 rounded-lg">✅ มา {presentCount}</span>
                <span className="bg-white/20 px-2 py-1 rounded-lg">❌ ขาด/ลา {absentLeaveCount}</span>
                {pending > 0 && <span className="bg-white/20 px-2 py-1 rounded-lg">⏳ ยังไม่เช็ค {pending}</span>}
              </div>
            </div>

            <div className="space-y-3">
              {sessionStudents.map(stu => (
                <div key={stu.id} className={`bg-white rounded-2xl shadow-sm border p-4 transition-colors ${
                  stu.status === 'present' ? 'border-green-200' :
                  stu.status === 'absent' ? 'border-red-200' :
                  stu.status === 'leave' ? 'border-amber-200' : 'border-gray-100'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                      {stu.nickname[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{stu.nickname}
                        {stu.full_name && <span className="text-xs text-gray-400 ml-1">({stu.full_name})</span>}
                      </p>
                      <p className="text-xs text-gray-400">{stu.grade}
                        {(() => {
                          const subjectQuota = selectedSession?.subject ? stu.subject_quotas?.[selectedSession.subject] : null;
                          const quota = subjectQuota ?? (stu.session_type === 'fixed' && !selectedSession?.subject ? stu.total_course_hours : null);
                          const hours = stu.attendedHours ?? 0;
                          return quota ? (
                            <span className="ml-1 font-medium text-blue-500">· เรียน {hours} / {quota} ชม.</span>
                          ) : hours > 0 ? (
                            <span className="ml-1 font-medium text-blue-500">· เรียน {hours} ชม.</span>
                          ) : null;
                        })()}
                      </p>
                    </div>

                    {saving[stu.id] && <span className="text-xs text-gray-400">กำลังบันทึก...</span>}
                  </div>
                  <div className="flex gap-2">
                    {(['present', 'absent', 'leave'] as const).map(s => {
                      const cfg = STATUS_CONFIG[s];
                      const isActive = stu.status === s;
                      return (
                        <button key={s} onClick={() => markAttendance(stu, s)} disabled={saving[stu.id]}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                            isActive ? `${cfg.bg} ${cfg.border} ${cfg.text}` : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                          }`}>
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                  {(stu.status === 'absent' || stu.status === 'leave') && (
                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-700 flex items-center gap-1">
                      🔁 Make-up pending: {selectedSession.topic} ({selectedSession.duration_hours} ชม.)
                    </div>
                  )}
                </div>
              ))}
              {sessionStudents.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">👥</div>
                  <p>ไม่พบนักเรียนใน session นี้</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Session list */
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">เลือก Session ที่จะเช็คชื่อ</h2>
            <div className="space-y-2">
              {sessions.map(s => {
                if (editingSessionId === s.id) {
                  return (
                    <div key={s.id} className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-4 space-y-3">
                      <p className="text-sm font-semibold text-gray-700">✏️ แก้ไข Session</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600">วันที่</label>
                          <input type="date" value={editSessionForm.date}
                            onChange={e => setEditSessionForm(f => ({ ...f, date: e.target.value }))}
                            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">สัปดาห์ที่</label>
                          <input type="number" min="1" value={editSessionForm.week} placeholder="เช่น 3"
                            onChange={e => setEditSessionForm(f => ({ ...f, week: e.target.value }))}
                            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">วิชา</label>
                        <input value={editSessionForm.subject}
                          onChange={e => setEditSessionForm(f => ({ ...f, subject: e.target.value }))}
                          list="subjects-datalist" placeholder="เช่น English, MATH"
                          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">หัวข้อ *</label>
                        <input value={editSessionForm.topic}
                          onChange={e => setEditSessionForm(f => ({ ...f, topic: e.target.value }))}
                          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div className="w-36">
                        <label className="text-xs font-medium text-gray-600">ระยะเวลา (ชม.)</label>
                        <input type="number" step="0.5" min="0.5" value={editSessionForm.hours}
                          onChange={e => setEditSessionForm(f => ({ ...f, hours: e.target.value }))}
                          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingSessionId(null)}
                          className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                          ยกเลิก
                        </button>
                        <button onClick={saveEditSession} disabled={editSessionSaving || !editSessionForm.topic.trim()}
                          className="flex-1 bg-blue-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">
                          {editSessionSaving ? 'กำลังบันทึก...' : '💾 บันทึก'}
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => selectSession(s)} className="flex-1 text-left">
                        <p className="font-semibold text-gray-800">
                          {s.subject && (
                            <span className="inline-block text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium mr-1.5 align-middle">
                              {s.subject}
                            </span>
                          )}
                          {s.topic}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(s.session_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                          {s.week_number && ` · สัปดาห์ ${s.week_number}`}
                          {' · '}{s.duration_hours} ชม.
                        </p>
                      </button>
                      <a href={`/teacher/session/${s.id}`}
                        className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 font-medium transition-colors">
                        📝
                      </a>
                      <button onClick={() => startEditSession(s)}
                        className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors">
                        ✏️
                      </button>
                      <button onClick={() => deleteSession(s.id)} disabled={deletingSessionId === s.id}
                        className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-medium transition-colors disabled:opacity-50">
                        {deletingSessionId === s.id ? '...' : '🗑️'}
                      </button>
                      <span className="text-blue-300 shrink-0">→</span>
                    </div>
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">📋</div>
                  <p>ยังไม่มี Session กด + เพื่อสร้างครับ</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
