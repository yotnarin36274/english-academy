'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student, Assignment } from '@/lib/db';

export default function SubmitHomeworkPage() {
  const { studentCode, assignmentId } = useParams<{ studentCode: string; assignmentId: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: stu } = await db().from('students').select('*')
        .eq('student_code', studentCode.toUpperCase()).single();
      if (!stu) { router.replace('/homework'); return; }
      setStudent(stu);

      const { data: asg } = await db().from('assignments').select('*')
        .eq('id', assignmentId).single();
      if (!asg) { router.replace(`/homework/${studentCode}`); return; }
      setAssignment(asg);

      // Check already submitted
      const { data: existing } = await db().from('homework_submissions')
        .select('id').eq('student_id', stu.id).eq('assignment_id', assignmentId).single();
      if (existing) { router.replace(`/homework/${studentCode}`); }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).slice(0, 5 - files.length);
    if (!selected.length) return;
    setFiles(prev => [...prev, ...selected]);
    selected.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target!.result as string]);
      reader.readAsDataURL(f);
    });
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!files.length || !student || !assignment) return;
    setSubmitting(true);
    setError('');

    const imageUrls: string[] = [];
    for (const file of files) {
      const path = `${student.id}/${assignmentId}/${Date.now()}-${file.name}`;
      const { data, error: upErr } = await db().storage
        .from('homework-images')
        .upload(path, file, { upsert: true });
      if (upErr || !data) { setError('อัพโหลดรูปไม่สำเร็จ กรุณาลองใหม่ครับ'); setSubmitting(false); return; }
      const { data: urlData } = db().storage.from('homework-images').getPublicUrl(data.path);
      imageUrls.push(urlData.publicUrl);
    }

    const { error: insertErr } = await db().from('homework_submissions').insert({
      student_id: student.id,
      assignment_id: assignment.id,
      image_urls: imageUrls,
      note: note.trim() || null,
      status: 'pending',
    });

    if (insertErr) { setError('เกิดข้อผิดพลาด กรุณาลองใหม่ครับ'); setSubmitting(false); return; }
    setDone(true);
  }

  if (done) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-800">ส่งการบ้านเรียบร้อยแล้วครับ!</h1>
          <p className="text-gray-500 mt-2">ครูจะตรวจและแจ้งผลให้ทราบนะครับ</p>
          <button
            onClick={() => router.replace(`/homework/${studentCode}`)}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            ← กลับหน้าหลัก
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-blue-600 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-blue-200 hover:text-white">←</button>
          <div>
            <p className="text-blue-100 text-xs">ส่งการบ้าน</p>
            <h1 className="font-bold">{assignment?.title ?? '...'}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-5">
        {assignment?.description && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            📋 {assignment.description}
          </div>
        )}

        {/* Image upload area */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            รูปการบ้าน <span className="text-gray-400">(สูงสุด 5 รูป)</span>
          </p>

          {previews.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-24 h-24 object-cover rounded-xl border-2 border-gray-200" />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {files.length < 5 && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-blue-300 rounded-xl py-8 flex flex-col items-center gap-2 text-blue-500 hover:bg-blue-50 transition-colors"
              >
                <span className="text-3xl">📷</span>
                <span className="font-medium">ถ่ายรูป / เลือกรูปจากคลัง</span>
                <span className="text-sm text-gray-400">ยังเพิ่มได้อีก {5 - files.length} รูป</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handleFiles}
              />
            </>
          )}
        </div>

        {/* Optional note */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            หมายเหตุ <span className="text-gray-400">(ไม่บังคับ)</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="ถ้ามีปัญหาหรืออยากบอกครู พิมพ์ได้เลยครับ"
            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!files.length || submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
        >
          {submitting ? 'กำลังส่ง...' : '📤 ส่งการบ้าน'}
        </button>
      </div>
    </main>
  );
}
