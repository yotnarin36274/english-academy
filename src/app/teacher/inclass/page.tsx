'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/supabase';
import type { Student, ClassSession, Course } from '@/lib/db';

const SUBJECT_SKILL_DEFAULTS: Record<string, string[]> = {
  'English': ['Grammar', 'Vocabulary', 'Speaking'],
  'MATH':    ['ความเข้าใจโจทย์', 'ความแม่นยำ', 'ความเร็ว'],
  'Science': ['การสังเกต', 'การวิเคราะห์', 'การทดลอง'],
  'Thai':    ['การอ่าน', 'การเขียน', 'ไวยากรณ์'],
};
const FALLBACK_SKILLS = ['ทักษะที่ 1', 'ทักษะที่ 2', 'ทักษะที่ 3'];

const BEHAVIOR_TAGS = [
  { id: 'autonomy_bold',  label: 'กล้าตอบ / เสนอไอเดีย',    emoji: '🌟', cat: 'Autonomy'    },
  { id: 'autonomy_lead',  label: 'ริเริ่ม / นำกิจกรรม',       emoji: '🌟', cat: 'Autonomy'    },
  { id: 'relate_help',    label: 'ช่วยเพื่อน / อธิบายให้น้อง', emoji: '🤝', cat: 'Relatedness' },
  { id: 'relate_team',    label: 'ทำงานกลุ่มได้ดี',           emoji: '🤝', cat: 'Relatedness' },
  { id: 'compete_game',   label: 'ทำเกมได้คะแนนดี',           emoji: '🎯', cat: 'Competence'  },
  { id: 'compete_solve',  label: 'แก้โจทย์ยากสำเร็จ',         emoji: '🎯', cat: 'Competence'  },
];

const SUBJECT_PALETTE: Record<string, string> = {
  English: 'bg-blue-100 text-blue-700',
  MATH:    'bg-green-100 text-green-700',
  Science: 'bg-purple-100 text-purple-700',
  Thai:    'bg-orange-100 text-orange-700',
};

interface Assessment {
  id?: string;
  skill_ratings: Record<string, number>;
  behavior_tags: string[];
  quick_note: string;
}
interface StudentWithAssessment extends Student {
  assessment: Assessment;
  saved: boolean;
}
interface CourseGroup {
  course: Course;
  sessions: ClassSession[];
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <button key={i}
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i === value ? 0 : i)}
          className={`text-xl transition-colors ${i <= (hover || value) ? 'text-amber-400' : 'text-gray-200'}`}>
          ★
        </button>
      ))}
    </div>
  );
}

export default function InClassPage() {
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [legacySessions, setLegacySessions] = useState<ClassSession[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<StudentWithAssessment[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Per-session skill customization
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: stuData }, { data: cData }, { data: sData }] = await Promise.all([
      db().from('students').select('*').eq('is_active', true).order('nickname'),
      db().from('courses').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      db().from('class_sessions').select('*').order('session_date', { ascending: false }),
    ]);

    const students = (stuData ?? []) as Student[];
    const courses = (cData ?? []) as Course[];
    const sessions = (sData ?? []) as ClassSession[];

    setAllStudents(students);

    const groups: CourseGroup[] = courses
      .map(c => ({ course: c, sessions: sessions.filter(s => s.course_id === c.id) }))
      .filter(g => g.sessions.length > 0);
    setCourseGroups(groups);
    setLegacySessions(sessions.filter(s => !s.course_id));
  }

  async function selectSession(session: ClassSession, course: Course | null) {
    setSelectedSession(session);
    setSelectedCourse(course);
    setExpandedId(null);

    // Set default skills based on subject
    const subject = course?.subject ?? session.subject ?? '';
    const defaultSkills = SUBJECT_SKILL_DEFAULTS[subject] ?? FALLBACK_SKILLS;
    setSkills([...defaultSkills]);

    // Get students for session
    let sessionStudents: Student[];
    if (session.student_ids.length > 0) {
      sessionStudents = students.filter(s => session.student_ids.includes(s.id));
      // fallback to allStudents if component state not hydrated yet
      if (sessionStudents.length === 0) {
        sessionStudents = allStudents.filter(s => session.student_ids.includes(s.id));
      }
    } else if (session.group_key) {
      sessionStudents = allStudents.filter(s => s.group_key === session.group_key);
    } else {
      sessionStudents = allStudents;
    }

    const { data: existing } = await db()
      .from('in_class_assessments').select('*').eq('session_id', session.id);

    const asmMap = new Map((existing ?? []).map((a: {student_id: string; id: string; skill_ratings: Record<string,number>; behavior_tags: string[]; quick_note: string}) => [a.student_id, a]));

    setStudents(sessionStudents.map(s => {
      const a = asmMap.get(s.id);
      return {
        ...s,
        assessment: {
          id: a?.id,
          skill_ratings: (a?.skill_ratings as Record<string,number>) ?? {},
          behavior_tags: a?.behavior_tags ?? [],
          quick_note: a?.quick_note ?? '',
        },
        saved: !!a,
      };
    }));
  }

  function updateAssessment(studentId: string, patch: Partial<Assessment>) {
    setStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, assessment: { ...s.assessment, ...patch }, saved: false } : s
    ));
  }

  async function saveAssessment(stu: StudentWithAssessment) {
    if (!selectedSession) return;
    setSaving(p => ({ ...p, [stu.id]: true }));
    const { data } = await db().from('in_class_assessments').upsert({
      ...(stu.assessment.id ? { id: stu.assessment.id } : {}),
      session_id: selectedSession.id,
      student_id: stu.id,
      skill_ratings: stu.assessment.skill_ratings,
      behavior_tags: stu.assessment.behavior_tags,
      quick_note: stu.assessment.quick_note || null,
    }, { onConflict: 'session_id,student_id' }).select().single();
    setStudents(prev => prev.map(s =>
      s.id === stu.id ? { ...s, assessment: { ...s.assessment, id: (data as {id: string})?.id }, saved: true } : s
    ));
    setSaving(p => ({ ...p, [stu.id]: false }));
  }

  function addSkill() {
    const s = newSkill.trim();
    if (s && !skills.includes(s)) setSkills(p => [...p, s]);
    setNewSkill('');
  }

  const ratedCount = students.filter(s => s.saved || Object.keys(s.assessment.skill_ratings).length > 0).length;

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/teacher" className="text-gray-400 hover:text-gray-600">←</a>
            <h1 className="text-lg font-bold text-gray-800">⭐ ประเมินระหว่างคาบ</h1>
          </div>
          {selectedSession && (
            <button onClick={() => { setSelectedSession(null); setSelectedCourse(null); setStudents([]); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
              ← เปลี่ยน Session
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-4">

        {/* ─── SESSION PICKER ─── */}
        {!selectedSession ? (
          <>
            {courseGroups.length === 0 && legacySessions.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-2">📋</div>
                <p>ยังไม่มี Session กรุณาสร้างในหน้า Sessions ก่อนครับ</p>
              </div>
            ) : (
              <div className="space-y-6">

                {/* Course groups */}
                {courseGroups.map(({ course, sessions }) => {
                  const badgeClass = SUBJECT_PALETTE[course.subject] ?? 'bg-gray-100 text-gray-600';
                  return (
                    <div key={course.id}>
                      {/* Course header */}
                      <div className="flex items-center gap-2 mb-2 px-1">
                        {course.subject && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>{course.subject}</span>
                        )}
                        <p className="text-sm font-semibold text-gray-700">{course.name}</p>
                        <span className="text-xs text-gray-400 ml-auto">{sessions.length} sessions</span>
                      </div>
                      {/* Sessions in course */}
                      <div className="space-y-2">
                        {sessions.map(s => (
                          <button key={s.id} onClick={() => selectSession(s, course)}
                            className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-gray-800">{s.topic}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {new Date(s.session_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                  {s.week_number != null && ` · สัปดาห์ ${s.week_number}`}
                                  {' · '}{s.duration_hours} ชม.
                                </p>
                              </div>
                              <span className="text-xs text-gray-400 shrink-0 mt-0.5">👥 {s.student_ids.length} คน</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Legacy sessions */}
                {legacySessions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <p className="text-sm font-semibold text-gray-400">📋 Sessions เก่า (ไม่มีคอร์ส)</p>
                    </div>
                    <div className="space-y-2">
                      {legacySessions.map(s => (
                        <button key={s.id} onClick={() => selectSession(s, null)}
                          className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors opacity-75">
                          <p className="font-semibold text-gray-700">{s.topic}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(s.session_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                            {s.week_number != null && ` · สัปดาห์ ${s.week_number}`}
                            {s.subject && ` · ${s.subject}`}
                            {' · '}{s.duration_hours} ชม.
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (

          /* ─── ASSESSMENT VIEW ─── */
          <>
            {/* Session header */}
            <div className={`rounded-2xl p-4 text-white ${selectedCourse ? 'bg-blue-600' : 'bg-gray-600'}`}>
              {selectedCourse && (
                <div className="flex items-center gap-2 mb-1.5">
                  {selectedCourse.subject && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{selectedCourse.subject}</span>
                  )}
                  <span className="text-xs text-blue-200">{selectedCourse.name}</span>
                </div>
              )}
              <p className="text-blue-100 text-xs">
                {new Date(selectedSession.session_date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
                {selectedSession.week_number != null && ` · สัปดาห์ ${selectedSession.week_number}`}
              </p>
              <h2 className="font-bold text-lg mt-0.5">{selectedSession.topic}</h2>
              <div className="flex gap-3 mt-2 text-xs flex-wrap">
                <span className="bg-white/20 px-2 py-1 rounded-lg">👥 {students.length} คน</span>
                <span className="bg-white/20 px-2 py-1 rounded-lg">⭐ ประเมินแล้ว {ratedCount}/{students.length}</span>
                <span className="bg-white/20 px-2 py-1 rounded-lg">⏱ {selectedSession.duration_hours} ชม.</span>
              </div>
            </div>

            {/* Skill customizer (per session) */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">🎯 ทักษะที่ประเมินวันนี้</p>
              <div className="flex flex-wrap gap-2">
                {skills.map(sk => (
                  <div key={sk} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                    <span className="text-sm text-blue-700">{sk}</span>
                    <button onClick={() => setSkills(p => p.filter(x => x !== sk))}
                      className="text-blue-400 hover:text-blue-700 ml-1 text-xs font-bold leading-none">×</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newSkill} onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSkill()}
                  placeholder="เพิ่มทักษะ เช่น Reading"
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button onClick={addSkill} disabled={!newSkill.trim()}
                  className="px-4 py-2 bg-blue-600 disabled:opacity-40 text-white text-sm rounded-xl font-medium hover:bg-blue-700">
                  + เพิ่ม
                </button>
              </div>
            </div>

            {/* Student cards */}
            <div className="space-y-3">
              {students.map(stu => {
                const isExpanded = expandedId === stu.id;
                const hasRatings = Object.keys(stu.assessment.skill_ratings).length > 0;
                const hasTags = stu.assessment.behavior_tags.length > 0;

                return (
                  <div key={stu.id} className={`bg-white rounded-2xl shadow-sm border transition-colors ${stu.saved ? 'border-green-200' : hasRatings || hasTags ? 'border-amber-200' : 'border-gray-100'}`}>
                    {/* Card header */}
                    <button onClick={() => setExpandedId(isExpanded ? null : stu.id)}
                      className="w-full flex items-center gap-3 p-4 text-left">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                        {stu.nickname[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800">{stu.nickname}
                          {stu.full_name && <span className="text-xs text-gray-400 ml-1">({stu.full_name})</span>}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {skills.map(sk => {
                            const r = stu.assessment.skill_ratings[sk] ?? 0;
                            return r > 0 ? (
                              <span key={sk} className="text-xs text-amber-500">{'★'.repeat(r)}{'☆'.repeat(5-r)} <span className="text-gray-500">{sk}</span></span>
                            ) : null;
                          })}
                          {stu.assessment.behavior_tags.map(t => {
                            const tag = BEHAVIOR_TAGS.find(b => b.id === t);
                            return tag ? <span key={t} className="text-xs">{tag.emoji}</span> : null;
                          })}
                          {stu.assessment.quick_note && <span className="text-xs text-gray-400">📝</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {stu.saved && <span className="text-xs text-green-500 font-medium">✅</span>}
                        {saving[stu.id] && <span className="text-xs text-gray-400">บันทึก...</span>}
                        <span className="text-gray-300 text-sm">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {/* Expanded assessment form */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 space-y-4 border-t border-gray-50">

                        {/* Skill ratings */}
                        <div className="space-y-2 pt-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">⭐ ทักษะวันนี้</p>
                          {skills.length === 0 ? (
                            <p className="text-xs text-gray-400">เพิ่มทักษะด้านบนก่อนครับ</p>
                          ) : skills.map(sk => (
                            <div key={sk} className="flex items-center gap-3">
                              <span className="text-sm text-gray-700 w-32 shrink-0 truncate">{sk}</span>
                              <StarRating
                                value={stu.assessment.skill_ratings[sk] ?? 0}
                                onChange={v => updateAssessment(stu.id, {
                                  skill_ratings: { ...stu.assessment.skill_ratings, [sk]: v }
                                })}
                              />
                              <span className="text-sm w-6">
                                {['','⚡','👍','💪','🔥','🌟'][stu.assessment.skill_ratings[sk] ?? 0]}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Behavior tags */}
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">🏷️ พฤติกรรมเด่น</p>
                          <div className="flex flex-wrap gap-2">
                            {BEHAVIOR_TAGS.map(tag => {
                              const active = stu.assessment.behavior_tags.includes(tag.id);
                              return (
                                <button key={tag.id}
                                  onClick={() => {
                                    const tags = active
                                      ? stu.assessment.behavior_tags.filter(t => t !== tag.id)
                                      : [...stu.assessment.behavior_tags, tag.id];
                                    updateAssessment(stu.id, { behavior_tags: tags });
                                  }}
                                  className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                                  {tag.emoji} {tag.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Quick note */}
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">📝 โน้ตระหว่างคาบ</p>
                          <textarea
                            value={stu.assessment.quick_note}
                            onChange={e => updateAssessment(stu.id, { quick_note: e.target.value })}
                            placeholder="จุดที่พลาดบ่อย, สิ่งที่ต้องทบทวน..."
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>

                        <button onClick={() => saveAssessment(stu)} disabled={saving[stu.id]}
                          className="w-full bg-[#1D9E75] disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                          {saving[stu.id] ? 'กำลังบันทึก...' : '💾 บันทึกการประเมิน'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {students.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-3xl mb-2">👥</div>
                  <p>Session นี้ยังไม่มีนักเรียนครับ</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
