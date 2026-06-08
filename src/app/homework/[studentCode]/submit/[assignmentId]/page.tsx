'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import type { Student, Assignment } from '@/lib/db';

const ACCEPTED = [
  'image/*',
  'video/mp4,video/quicktime,video/webm,video/x-msvideo',
  'audio/mpeg,audio/mp4,audio/wav,audio/aac,audio/ogg,audio/x-m4a',
  'application/pdf',
  'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',');

const MAX_FILES = 5;
const MAX_MB = 45; // under Supabase 50 MB free limit

type FileEntry = { file: File; preview: string | null; type: 'image' | 'video' | 'audio' | 'pdf' | 'word' | 'other' };

function fileType(f: File): FileEntry['type'] {
  if (f.type.startsWith('image/')) return 'image';
  if (f.type.startsWith('video/')) return 'video';
  if (f.type.startsWith('audio/')) return 'audio';
  if (f.type === 'application/pdf') return 'pdf';
  if (f.type.includes('word') || f.name.endsWith('.doc') || f.name.endsWith('.docx')) return 'word';
  return 'other';
}

const TYPE_ICON: Record<FileEntry['type'], string> = {
  image: '🖼️', video: '🎥', audio: '🎵', pdf: '📄', word: '📝', other: '📁',
};
const TYPE_LABEL: Record<FileEntry['type'], string> = {
  image: 'รูปภาพ', video: 'วิดีโอ', audio: 'ไฟล์เสียง', pdf: 'PDF', word: 'Word', other: 'ไฟล์',
};

function FileThumbnail({ entry, onRemove }: { entry: FileEntry; onRemove: () => void }) {
  return (
    <div className="relative group">
      <div className="w-24 h-24 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-50 flex flex-col items-center justify-center">
        {entry.type === 'image' && entry.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.preview} alt="" className="w-full h-full object-cover" />
        ) : entry.type === 'video' && entry.preview ? (
          <video src={entry.preview} className="w-full h-full object-cover" muted playsInline />
        ) : (
          <>
            <span className="text-3xl">{TYPE_ICON[entry.type]}</span>
            <span className="text-xs text-gray-500 mt-1 px-1 text-center leading-tight">{entry.file.name.length > 12 ? entry.file.name.slice(0, 10) + '…' : entry.file.name}</span>
          </>
        )}
      </div>
      <div className="absolute -bottom-1 left-0 right-0 text-center">
        <span className="text-xs bg-gray-700 text-white px-1.5 py-0.5 rounded-full">
          {TYPE_LABEL[entry.type]}
        </span>
      </div>
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow"
      >×</button>
    </div>
  );
}

export default function SubmitHomeworkPage() {
  const { studentCode, assignmentId } = useParams<{ studentCode: string; assignmentId: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: stu } = await db().from('students').select('*')
        .eq('student_code', studentCode.toUpperCase()).single();
      if (!stu) { router.replace('/homework'); return; }
      setStudent(stu);

      const { data: asg } = await db().from('assignments').select('*').eq('id', assignmentId).single();
      if (!asg) { router.replace(`/homework/${studentCode}`); return; }
      setAssignment(asg);

      const { data: existing } = await db().from('homework_submissions')
        .select('id').eq('student_id', stu.id).eq('assignment_id', assignmentId).single();
      if (existing) { router.replace(`/homework/${studentCode}`); }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;

    const remaining = MAX_FILES - entries.length;
    const toAdd = selected.slice(0, remaining);
    const oversized = toAdd.filter(f => f.size > MAX_MB * 1024 * 1024);

    if (oversized.length) {
      setError(`ไฟล์บางไฟล์ใหญ่เกิน ${MAX_MB} MB กรุณาลดขนาดก่อนครับ`);
      return;
    }
    setError('');

    toAdd.forEach(file => {
      const type = fileType(file);
      if (type === 'image' || type === 'video') {
        const url = URL.createObjectURL(file);
        setEntries(prev => [...prev, { file, preview: url, type }]);
      } else {
        setEntries(prev => [...prev, { file, preview: null, type }]);
      }
    });

    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function removeEntry(i: number) {
    setEntries(prev => {
      const copy = [...prev];
      if (copy[i].preview) URL.revokeObjectURL(copy[i].preview!);
      copy.splice(i, 1);
      return copy;
    });
  }

  async function handleSubmit() {
    if (!entries.length || !student || !assignment) return;
    setSubmitting(true);
    setError('');
    setProgress(0);

    const fileUrls: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      const { file } = entries[i];
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${student.id}/${assignmentId}/${Date.now()}-${i}.${ext}`;
      const { data, error: upErr } = await db().storage
        .from('homework-images')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr || !data) {
        setError('อัพโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่ครับ');
        setSubmitting(false);
        return;
      }
      const { data: urlData } = db().storage.from('homework-images').getPublicUrl(data.path);
      fileUrls.push(urlData.publicUrl);
      setProgress(Math.round(((i + 1) / entries.length) * 100));
    }

    const { error: insertErr } = await db().from('homework_submissions').insert({
      student_id: student.id,
      assignment_id: assignment.id,
      image_urls: fileUrls,
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

  const totalMB = entries.reduce((s, e) => s + e.file.size, 0) / (1024 * 1024);

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

        {/* File area */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">
              ไฟล์งาน <span className="text-gray-400">(สูงสุด {MAX_FILES} ไฟล์ / ไฟล์ละไม่เกิน {MAX_MB} MB)</span>
            </p>
            {entries.length > 0 && (
              <span className="text-xs text-gray-400">{entries.length}/{MAX_FILES} · {totalMB.toFixed(1)} MB</span>
            )}
          </div>

          {/* Type badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(['image','video','audio','pdf','word'] as const).map(t => (
              <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {TYPE_ICON[t]} {TYPE_LABEL[t]}
              </span>
            ))}
          </div>

          {/* Thumbnails */}
          {entries.length > 0 && (
            <div className="flex flex-wrap gap-4 mb-4">
              {entries.map((entry, i) => (
                <FileThumbnail key={i} entry={entry} onRemove={() => removeEntry(i)} />
              ))}
            </div>
          )}

          {/* Add button */}
          {entries.length < MAX_FILES && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-blue-300 rounded-xl py-7 flex flex-col items-center gap-2 text-blue-500 hover:bg-blue-50 transition-colors"
              >
                <span className="text-3xl">📎</span>
                <span className="font-medium">แนบไฟล์ / ถ่ายรูป</span>
                <span className="text-xs text-gray-400">รูป · วิดีโอ · เสียง · PDF · Word</span>
                <span className="text-xs text-gray-400">ยังเพิ่มได้อีก {MAX_FILES - entries.length} ไฟล์</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED}
                multiple
                className="hidden"
                onChange={handleFiles}
              />
            </>
          )}
        </div>

        {/* Note */}
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

        {/* Progress bar */}
        {submitting && progress > 0 && progress < 100 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!entries.length || submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
        >
          {submitting ? `กำลังอัพโหลด... ${progress}%` : '📤 ส่งการบ้าน'}
        </button>
      </div>
    </main>
  );
}
