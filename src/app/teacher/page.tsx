'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/supabase';

export default function TeacherHubPage() {
  const [pendingHomework, setPendingHomework] = useState<number | null>(null);
  const [pendingMakeup, setPendingMakeup] = useState<number | null>(null);

  useEffect(() => {
    async function loadStats() {
      const [hwRes, mkRes] = await Promise.all([
        db().from('homework_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        db().from('makeup_classes').select('*', { count: 'exact', head: true }).eq('completed', false),
      ]);
      setPendingHomework(hwRes.count ?? 0);
      setPendingMakeup(mkRes.count ?? 0);
    }
    loadStats();
  }, []);

  const tools = [
    {
      href: '/teacher/homework',
      icon: '📝',
      label: 'ตรวจการบ้าน',
      desc: 'ดูงานที่ส่งและให้คะแนน Feedback',
      badge: pendingHomework,
      color: 'border-amber-100 hover:border-amber-300',
    },
    {
      href: '/teacher/assignments',
      icon: '📚',
      label: 'สร้าง Assignment',
      desc: 'สร้างและจัดการงานที่มอบหมาย',
      badge: null,
      color: 'border-blue-100 hover:border-blue-300',
    },
    {
      href: '/teacher/attendance',
      icon: '✅',
      label: 'เช็คชื่อ',
      desc: 'บันทึกการมาเรียนและสร้าง Session',
      badge: null,
      color: 'border-green-100 hover:border-green-300',
    },
    {
      href: '/teacher/makeup',
      icon: '🔁',
      label: 'Make-up Classes',
      desc: 'ติดตามและจัดการชั่วโมงเรียนชดเชย',
      badge: pendingMakeup,
      color: 'border-red-100 hover:border-red-300',
    },
    {
      href: '/teacher/students',
      icon: '👥',
      label: 'นักเรียน',
      desc: 'เพิ่มและจัดการข้อมูลผู้เรียน',
      badge: null,
      color: 'border-purple-100 hover:border-purple-300',
    },
    {
      href: '/teacher/inclass',
      icon: '⭐',
      label: 'ประเมินระหว่างคาบ',
      desc: 'ให้ดาว ติด Tag พฤติกรรม โน้ตระหว่างสอน',
      badge: null,
      color: 'border-yellow-100 hover:border-yellow-300',
    },
    {
      href: '/dashboard',
      icon: '📊',
      label: 'ผลสอบวัดระดับ',
      desc: 'ดูผลและวิเคราะห์ทักษะรายคน',
      badge: null,
      color: 'border-teal-100 hover:border-teal-300',
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b px-4 py-5">
        <div className="max-w-lg mx-auto">
          <a href="/hub" className="text-sm text-gray-400 hover:text-gray-600">← หน้าหลัก</a>
          <div className="mt-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white text-xl font-black">E</div>
            <div>
              <h1 className="text-xl font-black text-gray-900">ENG SPARK</h1>
              <p className="text-sm text-gray-500">ระบบจัดการครู</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-amber-500">
              {pendingHomework === null ? '—' : pendingHomework}
            </p>
            <p className="text-xs text-amber-500 mt-1">การบ้านรอตรวจ</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-red-500">
              {pendingMakeup === null ? '—' : pendingMakeup}
            </p>
            <p className="text-xs text-red-400 mt-1">Make-up คงค้าง</p>
          </div>
        </div>

        {/* Tool cards */}
        <div className="space-y-2">
          {tools.map(t => (
            <a
              key={t.href}
              href={t.href}
              className={`flex items-center gap-4 bg-white rounded-2xl shadow-sm border-2 p-4 transition-colors ${t.color}`}
            >
              <span className="text-3xl w-12 h-12 flex items-center justify-center shrink-0">{t.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">
                  {t.label}
                  {t.badge != null && t.badge > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px]">
                      {t.badge}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-400">{t.desc}</p>
              </div>
              <span className="text-gray-300 shrink-0">→</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
