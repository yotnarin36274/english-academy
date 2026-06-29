'use client';

import { useEffect, useRef, useState } from 'react';
import { db } from '@/lib/supabase';
import type { Assignment, Student, Course, ClassSession } from '@/lib/db';
import { loadGoogleScript, requestAccessToken, uploadAssignmentFile } from '@/lib/googleDrive';

const GROUP_LABELS: Record<string, string> = { p46: 'ป.4–ป.6', m13: 'ม.1–ม.3', m46: 'ม.4–ม.6' };
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

function fileEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|heic|bmp)$/.test(n)) return '🖼️';
  if (/\.pdf$/.test(n)) return '📄';
  if (/\.(mp4|mov|webm|avi|m4v|mkv)$/.test(n)) return '🎥';
  if (/\.(mp3|m4a|wav|aac|ogg)$/.test(n)) return '🎵';
  if (/\.(doc|docx)$/.test(n)) return '📝';
  if (/\.(xls|xlsx|csv)$/.test(n)) return '📊';
  if (/\.(ppt|pptx)$/.test(n)) return '📽️';
  return '📁';
}

type TargetMode = 'groups' | 'students' | 'session';

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [courseSessions, setCourseSessions] = useState<ClassSession[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [targetMode, setTargetMode] = useState<TargetMode>('groups');
  const [targetGroups, setTargetGroups] = useState<string[]>([]);
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  // Session mode
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [sessionStudentIds, setSessionStudentIds] = useState<string[]>([]);

  // Google Drive attachments
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [currentAttUpload, setCurrentAttUpload] = useState<{ name: string; progress: number } | null>(null);
  const attachFileRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<{ value: string; expiry: number } | null>(null);

  const [saving, setSaving] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', dueDate: '', maxScore: '100' });
  const [editSaving, setEditSaving] = useState(false);

  // For display: session/course name lookup
  const [sessionMap, setSessionMap] = useState<Map<string, { topic: string; subject: string }>>(new Map());
  const [courseNameMap, setCourseNameMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    load();
    loadStudents();
    loadCourses();
    loadGoogleScript();
  }, []);

  async function getToken(): Promise<string> {
    if (tokenRef.current && tokenRef.current.expiry > Date.now()) return tokenRef.current.value;
    if (!GOOGLE_CLIENT_ID) throw new Error('ยังไม่ได้ตั้งค่า NEXT_PUBLIC_GOOGLE_CLIENT_ID');
    await loadGoogleScript();
    const token = await requestAccessToken(GOOGLE_CLIENT_ID);
    tokenRef.current = { value: token, expiry: Date.now() + 55 * 60 * 1000 };
    return token;
  }

  // Called from a direct button click so the browser allows the OAuth popup
  async function handleAttachClick() {
    setCurrentAttUpload({ name: 'กำลังเชื่อมต่อ Google Drive...', progress: 0 });
    try {
      await getToken();
      setCurrentAttUpload(null);
      attachFileRef.current?.click();
    } catch (err) {
      setCurrentAttUpload(null);
      alert('เชื่อมต่อ Google Drive ไม่สำเร็จ: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function uploadAttachFiles(files: File[]) {
    try {
      const token = await getToken();
      const newAtts: { url: string; name: string }[] = [];
      for (const file of files) {
        setCurrentAttUpload({ name: file.name, progress: 0 });
        const url = await uploadAssignmentFile(file, title.trim(), token, (pct) => {
          setCurrentAttUpload({ name: file.name, progress: pct });
        });
        newAtts.push({ url, name: file.name });
      }
      setAttachments(prev => [...prev, ...newAtts]);
      setCurrentAttUpload(null);
    } catch (err) {
      setCurrentAttUpload(null);
      alert('อัปโหลดไม่สำเร็จ: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  function removeAttachment(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }

  async function load() {
    const { data } = await db().from('assignments').select('*').order('created_at', { ascending: false });
    const list = (data ?? []) as Assignment[];
    setAssignments(list);

    // Build session/course lookup maps for display
    const sIds = [...new Set(list.map(a => a.session_id).filter(Boolean))] as string[];
    const cIds = [...new Set(list.map(a => a.course_id).filter(Boolean))] as string[];
    const [sRes, cRes] = await Promise.all([
      sIds.length ? db().from('class_sessions').select('id, topic, subject').in('id', sIds) : { data: [] },
      cIds.length ? db().from('courses').select('id, name').in('id', cIds) : { data: [] },
    ]);
    const sm = new Map<string, { topic: string; subject: string }>();
    (sRes.data ?? []).forEach((s: { id: string; topic: string; subject: string }) => sm.set(s.id, s));
    setSessionMap(sm);
    const cm = new Map<string, string>();
    (cRes.data ?? []).forEach((c: { id: string; name: string }) => cm.set(c.id, c.name));
    setCourseNameMap(cm);
  }

  async function loadStudents() {
    const { data } = await db().from('students').select('*').eq('is_active', true).order('nickname');
    setAllStudents(data ?? []);
  }

  async function loadCourses() {
    const { data } = await db().from('courses').select('*').eq('is_active', true).order('created_at', { ascending: false });
    setAllCourses((data ?? []) as Course[]);
  }

  async function onCourseChange(courseId: string) {
    setSelectedCourseId(courseId);
    setSelectedSessionId('');
    setSessionStudentIds([]);
    if (!courseId) { setCourseSessions([]); return; }
    const { data } = await db()
      .from('class_sessions').select('*').eq('course_id', courseId)
      .order('session_date', { ascending: false });
    setCourseSessions((data ?? []) as ClassSession[]);
  }

  function onSessionChange(sessionId: string) {
    setSelectedSessionId(sessionId);
    if (!sessionId) { setSessionStudentIds([]); return; }
    const sess = courseSessions.find(s => s.id === sessionId);
    // Pre-select all students in this session
    setSessionStudentIds(sess?.student_ids ?? []);
  }

  function toggleGroup(g: string) {
    setTargetGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }
  function toggleStudent(id: string) {
    setTargetStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleSessionStudent(id: string) {
    setSessionStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const filteredStudents = allStudents.filter(s => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return s.nickname.toLowerCase().includes(q)
      || (s.full_name ?? '').toLowerCase().includes(q)
      || s.student_code.toLowerCase().includes(q);
  });

  // Students in the selected session (from allStudents for name lookup)
  const selectedSession = courseSessions.find(s => s.id === selectedSessionId);
  const sessionStudentObjects = allStudents.filter(s => selectedSession?.student_ids.includes(s.id));

  function resetForm() {
    setTitle(''); setDescription(''); setDueDate(''); setMaxScore('100');
    setTargetMode('groups'); setTargetGroups([]); setTargetStudentIds([]); setStudentSearch('');
    setSelectedCourseId(''); setSelectedSessionId(''); setSessionStudentIds([]);
    setCourseSessions([]);
    setAttachments([]); setCurrentAttUpload(null);
  }

  async function createAssignment() {
    if (!title.trim()) return;
    if (targetMode === 'students' && targetStudentIds.length === 0) return;
    if (targetMode === 'session' && (!selectedSessionId || sessionStudentIds.length === 0)) return;
    setSaving(true);
    setNotifyStatus('');

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      max_score: parseInt(maxScore) || 100,
      is_active: true,
      session_id: null,
      course_id: null,
      target_groups: [],
      target_student_ids: [],
    };
    // Only send the attachments column when files exist, so creation keeps
    // working even before the DB column is added.
    if (attachments.length > 0) payload.attachments = attachments;

    if (targetMode === 'groups') {
      payload.target_groups = targetGroups;
    } else if (targetMode === 'students') {
      payload.target_student_ids = targetStudentIds;
    } else {
      // session mode
      payload.session_id = selectedSessionId;
      payload.course_id = selectedCourseId || null;
      payload.target_student_ids = sessionStudentIds;
    }

    const { error } = await db().from('assignments').insert(payload);
    if (error) {
      setNotifyStatus(`❌ เกิดข้อผิดพลาด: ${error.message}`);
      setSaving(false);
      return;
    }

    setNotifyStatus('✅ สร้างงานเรียบร้อย');
    resetForm();
    setShowForm(false);
    setSaving(false);
    load();
  }

  function startEdit(a: Assignment) {
    setEditForm({ title: a.title, description: a.description ?? '', dueDate: a.due_date ?? '', maxScore: a.max_score.toString() });
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

  const canCreate = title.trim() && !saving
    && (targetMode === 'groups' || (targetMode === 'students' && targetStudentIds.length > 0)
      || (targetMode === 'session' && selectedSessionId && sessionStudentIds.length > 0));

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/teacher" className="text-gray-400 hover:text-gray-600">←</a>
            <h1 className="text-lg font-bold text-gray-800">📝 จัดการการบ้าน</h1>
          </div>
          <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
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
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 max-w-2xl mx-auto w-full">
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

            {/* Google Drive attachments */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">📎 ไฟล์แนบ (Google Drive)</label>
              <p className="text-xs text-gray-400 mb-2">นักเรียนและผู้ปกครองจะเห็นปุ่มเปิด/ดาวน์โหลดไฟล์นี้ในหน้าการบ้าน</p>

              {attachments.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                      <span className="text-lg shrink-0">{fileEmoji(att.name)}</span>
                      <span className="flex-1 text-sm text-gray-700 truncate">{att.name}</span>
                      <button type="button" onClick={() => removeAttachment(i)}
                        className="shrink-0 text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {currentAttUpload ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-blue-600 truncate">⏳ {currentAttUpload.name}</p>
                  <div className="w-full bg-blue-100 rounded-full h-1.5 mt-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${currentAttUpload.progress}%` }} />
                  </div>
                </div>
              ) : (
                <button type="button" onClick={handleAttachClick}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  + แนบไฟล์จาก Google Drive
                </button>
              )}

              <input ref={attachFileRef} type="file" multiple className="hidden"
                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,video/*,audio/*"
                onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) uploadAttachFiles(f); e.target.value = ''; }} />
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
                {([
                  ['groups', '📚 ตามกลุ่ม'],
                  ['students', '👤 รายบุคคล'],
                  ['session', '📅 ใน Session'],
                ] as [TargetMode, string][]).map(([mode, label]) => (
                  <button key={mode} onClick={() => setTargetMode(mode)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${targetMode === mode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                    {label}
                  </button>
                ))}
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
                  <div className="p-2 border-b border-gray-100 flex gap-2 items-center bg-gray-50">
                    <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                      placeholder="🔍 ค้นหานักเรียน..."
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <button onClick={() => {
                      const vis = filteredStudents.map(s => s.id);
                      const all = vis.every(id => targetStudentIds.includes(id));
                      setTargetStudentIds(prev => all ? prev.filter(id => !vis.includes(id)) : [...new Set([...prev, ...vis])]);
                    }} className="text-xs text-blue-600 font-medium px-2 whitespace-nowrap">
                      {filteredStudents.every(s => targetStudentIds.includes(s.id)) ? 'ยกเลิก' : 'เลือกทั้งหมด'}
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                    {filteredStudents.map(s => {
                      const sel = targetStudentIds.includes(s.id);
                      return (
                        <button key={s.id} onClick={() => toggleStudent(s.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${sel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${sel ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                            {sel && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">{s.nickname[0]}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{s.nickname}</p>
                            <p className="text-xs text-gray-400">{s.grade} · {s.student_code}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {targetStudentIds.length > 0 && (
                    <div className="bg-blue-50 border-t border-blue-100 px-4 py-2 flex items-center justify-between">
                      <p className="text-sm text-blue-700 font-medium">เลือกแล้ว {targetStudentIds.length} คน</p>
                      <button onClick={() => setTargetStudentIds([])} className="text-xs text-red-400 hover:text-red-500">ล้าง</button>
                    </div>
                  )}
                </div>
              )}

              {/* Session selector */}
              {targetMode === 'session' && (
                <div className="space-y-3">
                  {/* Course picker */}
                  <div>
                    <label className="text-xs font-medium text-gray-600">เลือกคอร์ส</label>
                    <select value={selectedCourseId} onChange={e => onCourseChange(e.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">— เลือกคอร์ส —</option>
                      {allCourses.map(c => (
                        <option key={c.id} value={c.id}>{c.subject ? `[${c.subject}] ` : ''}{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Session picker */}
                  {selectedCourseId && (
                    <div>
                      <label className="text-xs font-medium text-gray-600">เลือก Session</label>
                      {courseSessions.length === 0 ? (
                        <p className="mt-1 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">คอร์สนี้ยังไม่มี Session</p>
                      ) : (
                        <select value={selectedSessionId} onChange={e => onSessionChange(e.target.value)}
                          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                          <option value="">— เลือก Session —</option>
                          {courseSessions.map(s => (
                            <option key={s.id} value={s.id}>
                              {new Date(s.session_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} · สัปดาห์ {s.week_number ?? '?'} · {s.topic}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Students in session (toggle individual) */}
                  {selectedSessionId && sessionStudentObjects.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-600">นักเรียนใน Session ({sessionStudentObjects.length} คน)</p>
                        <button onClick={() => {
                          const all = sessionStudentObjects.every(s => sessionStudentIds.includes(s.id));
                          setSessionStudentIds(all ? [] : sessionStudentObjects.map(s => s.id));
                        }} className="text-xs text-blue-600 font-medium">
                          {sessionStudentObjects.every(s => sessionStudentIds.includes(s.id)) ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                        </button>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {sessionStudentObjects.map(s => {
                          const sel = sessionStudentIds.includes(s.id);
                          return (
                            <button key={s.id} onClick={() => toggleSessionStudent(s.id)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${sel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${sel ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                {sel && <span className="text-white text-xs font-bold">✓</span>}
                              </div>
                              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">{s.nickname[0]}</div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">{s.nickname}</p>
                                <p className="text-xs text-gray-400">{s.grade}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {sessionStudentIds.length > 0 && (
                        <div className="bg-blue-50 border-t border-blue-100 px-4 py-2">
                          <p className="text-sm text-blue-700 font-medium">มอบหมายให้ {sessionStudentIds.length} คน</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }}
                className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                ยกเลิก
              </button>
              <button onClick={createAssignment} disabled={!canCreate}
                className="flex-1 bg-blue-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                {saving ? 'กำลังสร้าง...' : '✅ สร้างงาน'}
              </button>
            </div>
          </div>
        )}

        {/* Assignment list */}
        <div className="grid gap-4 sm:grid-cols-2 items-start">
        {assignments.map(a => {
          const hasIndividuals = (a.target_student_ids ?? []).length > 0;
          const namedStudents = hasIndividuals ? allStudents.filter(s => a.target_student_ids.includes(s.id)) : [];
          const sessInfo = a.session_id ? sessionMap.get(a.session_id) : null;
          const courseName = a.course_id ? courseNameMap.get(a.course_id) : null;

          if (editingId === a.id) {
            return (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm p-5 border-2 border-blue-200 space-y-3">
                <span className="font-semibold text-gray-800">✏️ แก้ไขงาน</span>
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
                    className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">ยกเลิก</button>
                  <button onClick={saveEdit} disabled={editSaving || !editForm.title.trim()}
                    className="flex-1 bg-blue-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">
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
                  {a.description && <p className="text-sm text-gray-500 mt-0.5 whitespace-pre-wrap">{a.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {/* Session tag */}
                    {sessInfo && (
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        📅 {courseName ? `${courseName} · ` : ''}{sessInfo.topic}
                      </span>
                    )}
                    {/* Target tags */}
                    {!sessInfo && (hasIndividuals
                      ? namedStudents.slice(0, 4).map(s => (
                        <span key={s.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">👤 {s.nickname}</span>
                      )).concat(namedStudents.length > 4 ? [
                        <span key="more" className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">+{namedStudents.length - 4}</span>
                      ] : [])
                      : a.target_groups.length === 0
                        ? [<span key="all" className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">ทุกกลุ่ม</span>]
                        : a.target_groups.map(g => (
                          <span key={g} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{GROUP_LABELS[g]}</span>
                        ))
                    )}
                    {sessInfo && hasIndividuals && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        👤 {a.target_student_ids.length} คน
                      </span>
                    )}
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">เต็ม {a.max_score}</span>
                    {(a.attachments?.length ?? 0) > 0 && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">📎 {a.attachments.length} ไฟล์</span>
                    )}
                    {a.due_date && (
                      <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">
                        📅 {new Date(a.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => startEdit(a)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-600 hover:bg-blue-100">✏️ แก้ไข</button>
                  <button onClick={() => toggleActive(a)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium ${a.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {a.is_active ? '✅ เปิดอยู่' : '🔒 ปิดแล้ว'}
                  </button>
                  <button onClick={() => deleteAssignment(a.id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-500 hover:bg-red-100">🗑️ ลบ</button>
                </div>
              </div>
            </div>
          );
        })}
        </div>

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
