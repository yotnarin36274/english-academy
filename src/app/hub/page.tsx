'use client';

import { useState } from 'react';

export default function HubPage() {
  const [studentCode, setStudentCode] = useState('');

  function goToHomework() {
    const code = studentCode.trim().toUpperCase();
    if (code) window.location.href = `/homework/${code}`;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-3xl bg-teal-600 flex items-center justify-center text-white text-4xl font-black mx-auto mb-4 shadow-lg shadow-teal-200">
          E
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">ENG SPARK</h1>
        <p className="text-gray-500 mt-1 text-sm">ระบบการเรียนการสอนภาษาอังกฤษ</p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {/* Teacher */}
        <a
          href="/teacher"
          className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border-2 border-blue-100 hover:border-blue-300 p-5 transition-colors group"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl shrink-0 group-hover:bg-blue-100 transition-colors">
            👨‍🏫
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-lg">ครู</p>
            <p className="text-sm text-gray-400">ตรวจงาน · เช็คชื่อ · จัดการนักเรียน</p>
          </div>
          <span className="text-gray-300 group-hover:text-blue-400 transition-colors">→</span>
        </a>

        {/* Student */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-green-100 p-5 space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-3xl shrink-0">
              🎓
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">นักเรียน</p>
              <p className="text-sm text-gray-400">ทดสอบวัดระดับ หรือส่งการบ้าน</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href="/"
              className="flex-1 text-center text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 py-2.5 rounded-xl transition-colors border border-green-200"
            >
              แบบทดสอบวัดระดับ
            </a>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={studentCode}
              onChange={e => setStudentCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goToHomework()}
              placeholder="รหัสนักเรียน เช่น ENG001"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 font-mono uppercase placeholder:normal-case placeholder:font-sans"
            />
            <button
              onClick={goToHomework}
              disabled={!studentCode.trim()}
              className="px-4 py-2.5 bg-green-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors"
            >
              ดูการบ้าน
            </button>
          </div>
        </div>

        {/* Parent */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-purple-100 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-3xl shrink-0">
              👨‍👩‍👧
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">ผู้ปกครอง</p>
              <p className="text-sm text-gray-400">ติดตามพัฒนาการบุตรหลาน</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 bg-purple-50 rounded-xl px-4 py-2.5 border border-purple-100">
            ใช้ลิ้งค์ที่ครูแชร์ให้ผ่าน LINE ครับ
            <br />
            <span className="text-purple-400 font-mono">/parent/[token]</span>
          </p>
        </div>
      </div>

      <p className="mt-10 text-xs text-gray-300">ENG SPARK Academy</p>
    </main>
  );
}
