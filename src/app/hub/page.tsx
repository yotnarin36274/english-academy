'use client';

import { useState } from 'react';

const TEACHER_PASSWORD = 'FlukeENGSPARK29';

export default function HubPage() {
  const [studentCode, setStudentCode] = useState('');
  const [parentCode, setParentCode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [pass, setPass] = useState('');
  const [passError, setPassError] = useState(false);

  function goToHomework() {
    const code = studentCode.trim().toUpperCase();
    if (code) window.location.href = `/homework/${code}`;
  }

  function goToParent() {
    const code = parentCode.trim().toUpperCase();
    if (code) window.location.href = `/parent/${code}`;
  }

  function handleTeacherClick() {
    if (sessionStorage.getItem('teacher_auth') === '1') {
      window.location.href = '/teacher';
    } else {
      setShowPass(true);
      setPass('');
      setPassError(false);
    }
  }

  function submitPassword() {
    if (pass === TEACHER_PASSWORD) {
      sessionStorage.setItem('teacher_auth', '1');
      window.location.href = '/teacher';
    } else {
      setPassError(true);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex flex-col items-center justify-center px-4 py-12">
      {/* Password modal */}
      {showPass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">🔐</div>
              <p className="font-bold text-gray-800">รหัสผ่านครู</p>
            </div>
            <input
              type="password"
              value={pass}
              onChange={e => { setPass(e.target.value); setPassError(false); }}
              onKeyDown={e => e.key === 'Enter' && submitPassword()}
              autoFocus
              placeholder="รหัสผ่าน"
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${passError ? 'border-red-400' : 'border-gray-300'}`}
            />
            {passError && <p className="text-red-500 text-xs text-center">รหัสผ่านไม่ถูกต้องครับ</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowPass(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                ยกเลิก
              </button>
              <button onClick={submitPassword}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                เข้าสู่ระบบ
              </button>
            </div>
          </div>
        </div>
      )}

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
        <button
          onClick={handleTeacherClick}
          className="w-full flex items-center gap-4 bg-white rounded-2xl shadow-sm border-2 border-blue-100 hover:border-blue-300 p-5 transition-colors group text-left"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl shrink-0 group-hover:bg-blue-100 transition-colors">
            👨‍🏫
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-lg">ครู</p>
            <p className="text-sm text-gray-400">ตรวจงาน · เช็คชื่อ · จัดการนักเรียน</p>
          </div>
          <span className="text-gray-300 group-hover:text-blue-400 transition-colors">→</span>
        </button>

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
              เข้าสู่ระบบ
            </button>
          </div>
        </div>

        {/* Parent */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-purple-100 p-5 space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-3xl shrink-0">
              👨‍👩‍👧
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">ผู้ปกครอง</p>
              <p className="text-sm text-gray-400">ติดตามพัฒนาการบุตรหลาน</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={parentCode}
              onChange={e => setParentCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goToParent()}
              placeholder="รหัสนักเรียน เช่น ENG001"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono uppercase placeholder:normal-case placeholder:font-sans"
            />
            <button
              onClick={goToParent}
              disabled={!parentCode.trim()}
              className="px-4 py-2.5 bg-purple-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors"
            >
              เข้าสู่ระบบ
            </button>
          </div>
        </div>
      </div>

      <p className="mt-10 text-xs text-gray-300">ENG SPARK Academy</p>
    </main>
  );
}
