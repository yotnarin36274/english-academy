'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/supabase';
import type { MakeupClass, Student } from '@/lib/db';

interface MakeupWithStudent extends MakeupClass {
  students: Student;
}

export default function MakeupPage() {
  const [makeups, setMakeups] = useState<MakeupWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'done' | 'all'>('pending');
  const [completing, setCompleting] = useState<Record<string, boolean>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: mkRaw } = await db()
      .from('makeup_classes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!mkRaw?.length) { setMakeups([]); setLoading(false); return; }

    const studentIds = [...new Set((mkRaw as MakeupClass[]).map(m => m.student_id))];
    const { data: stuData } = await db().from('students').select('*').in('id', studentIds);
    const stuMap = new Map<string, Student>();
    (stuData ?? []).forEach((s: Student) => stuMap.set(s.id, s));

    const merged = (mkRaw as MakeupClass[]).map(m => ({
      ...m,
      students: stuMap.get(m.student_id)!,
    })).filter(m => m.students);

    setMakeups(merged as MakeupWithStudent[]);
    setLoading(false);
  }

  async function completeMakeup(mk: MakeupWithStudent) {
    setCompleting(p => ({ ...p, [mk.id]: true }));

    await db().from('makeup_classes').update({
      completed: true,
      completed_at: new Date().toISOString(),
    }).eq('id', mk.id);

    setCompleting(p => ({ ...p, [mk.id]: false }));
    load();
  }

  async function undoMakeup(mk: MakeupWithStudent) {
    await db().from('makeup_classes').update({ completed: false, completed_at: null }).eq('id', mk.id);
    load();
  }

  const filtered = makeups.filter(m =>
    filter === 'all' ? true : filter === 'pending' ? !m.completed : m.completed
  );

  const pendingCount = makeups.filter(m => !m.completed).length;
  const doneCount = makeups.filter(m => m.completed).length;
  const pendingHours = makeups.filter(m => !m.completed).reduce((s, m) => s + m.duration_hours, 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <a href="/teacher" className="text-gray-400 hover:text-gray-600">←</a>
            <h1 className="text-lg font-bold text-gray-800">🔁 Make-up Classes</h1>
          </div>
          <div className="flex gap-2">
            {(['pending', 'done', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f === 'pending' ? `คงค้าง (${pendingCount})` : f === 'done' ? `เสร็จแล้ว (${doneCount})` : `ทั้งหมด (${makeups.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
        {/* Summary */}
        {pendingCount > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-red-500">{pendingCount}</p>
              <p className="text-xs text-red-400 mt-1">Make-up คงค้าง</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-amber-500">{pendingHours}</p>
              <p className="text-xs text-amber-400 mt-1">ชม. คงค้างรวม</p>
            </div>
          </div>
        )}

        {/* List */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 items-start">
          {filtered.map(mk => (
            <div key={mk.id} className={`bg-white rounded-2xl shadow-sm border p-4 ${mk.completed ? 'opacity-60 border-green-100' : 'border-amber-100'}`}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => mk.completed ? undoMakeup(mk) : completeMakeup(mk)}
                  disabled={completing[mk.id]}
                  className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    mk.completed ? 'bg-green-500 border-green-500 text-white' : 'border-amber-400 hover:border-green-400 hover:bg-green-50'
                  }`}>
                  {completing[mk.id] ? '…' : mk.completed ? '✓' : ''}
                </button>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{mk.students?.nickname}
                        <span className="text-xs text-gray-400 font-normal ml-1">({mk.students?.grade})</span>
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">📖 {mk.topic}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${mk.completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {mk.completed ? '✅ เสร็จแล้ว' : '⏳ คงค้าง'}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    <span>⏱ {mk.duration_hours} ชม.</span>
                    <span>📅 ขาด {new Date(mk.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                    {mk.completed && mk.completed_at && (
                      <span className="text-green-500">✓ สอนซ่อม {new Date(mk.completed_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                    )}
                  </div>
                  {!mk.completed && (
                    <button onClick={() => completeMakeup(mk)} disabled={completing[mk.id]}
                      className="mt-3 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-xl transition-colors">
                      {completing[mk.id] ? 'กำลังอัพเดท...' : '✅ สอน Make-up เสร็จแล้ว'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">{filter === 'pending' ? '🎉' : '📋'}</div>
              <p>{filter === 'pending' ? 'ไม่มี Make-up คงค้างแล้ว!' : 'ยังไม่มีรายการ'}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
