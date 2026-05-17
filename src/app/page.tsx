'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GROUPS, GroupKey } from '@/lib/testData';

const GROUP_STYLES: Record<GroupKey, { card: string; button: string; icon: string }> = {
  p46: {
    card: 'border-green-200 bg-green-50 hover:bg-green-100',
    button: 'bg-[#1D9E75] hover:bg-[#178a64] text-white',
    icon: '🌱',
  },
  m13: {
    card: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    icon: '📘',
  },
  m46: {
    card: 'border-purple-200 bg-purple-50 hover:bg-purple-100',
    button: 'bg-purple-600 hover:bg-purple-700 text-white',
    icon: '🎓',
  },
};

export default function HomePage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<GroupKey | null>(null);
  const [nickname, setNickname] = useState('');
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState('');
  const [error, setError] = useState('');

  const openModal = (key: GroupKey) => {
    setSelectedGroup(key);
    setNickname('');
    setFullName('');
    setGrade('');
    setError('');
  };

  const closeModal = () => setSelectedGroup(null);

  const handleStart = () => {
    if (!nickname.trim()) {
      setError('กรุณาใส่ชื่อเล่นครับ');
      return;
    }
    if (!grade) {
      setError('กรุณาเลือกชั้นเรียนครับ');
      return;
    }
    const params = new URLSearchParams({
      nickname: nickname.trim(),
      fullName: fullName.trim(),
      grade,
    });
    router.push(`/test/${selectedGroup}?${params.toString()}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">English Academy</h1>
        <p className="mt-2 text-gray-700 text-base">
          ทดสอบวัดระดับภาษาอังกฤษ&nbsp;/ English Level Assessment
        </p>
      </div>

      {/* Group cards */}
      <div className="w-full max-w-md space-y-4">
        {(Object.keys(GROUPS) as GroupKey[]).map((key) => {
          const group = GROUPS[key];
          const style = GROUP_STYLES[key];
          return (
            <div
              key={key}
              className={`border-2 rounded-2xl p-5 transition-colors cursor-pointer ${style.card}`}
              onClick={() => openModal(key)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{style.icon}</span>
                    <span className="text-xl font-bold text-gray-800">{group.label}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {group.totalQuestions} ข้อ &nbsp;·&nbsp; {group.timeMinutes} นาที
                  </p>
                </div>
                <button
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${style.button}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal(key);
                  }}
                >
                  เริ่มเลย
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedGroup && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 py-6"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {GROUP_STYLES[selectedGroup].icon}&nbsp; {GROUPS[selectedGroup].label}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  ชื่อเล่น <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="เช่น มิน, เจมส์"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  ชื่อ-นามสกุล{' '}
                  <span className="text-gray-500 font-normal">(ไม่บังคับ)</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล (ไม่บังคับ)"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  ชั้นเรียน <span className="text-red-500">*</span>
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                >
                  <option value="">เลือกชั้นเรียน</option>
                  {GROUPS[selectedGroup].grades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-3.5 rounded-xl text-base font-bold text-white transition-colors"
              style={{ backgroundColor: '#1D9E75' }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#178a64')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1D9E75')}
            >
              เริ่มทำแบบทดสอบ / Start Test
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
