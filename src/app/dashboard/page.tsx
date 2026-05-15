'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { supabase, Submission } from '@/lib/supabase';
import { GROUPS, GroupKey, getLevelBadgeStyle } from '@/lib/testData';
import { computeSkillResults } from '@/lib/reportGenerator';
import SubmissionCard from '@/components/SubmissionCard';

type GroupFilter = 'all' | GroupKey;

function todayBangkok(): string {
  const now = new Date();
  const bangkokMs = now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000;
  return new Date(bangkokMs).toISOString().split('T')[0];
}

function exportCSV(submissions: Submission[]) {
  const allSkillKeys: string[] = [];
  for (const groupKey of Object.keys(GROUPS) as GroupKey[]) {
    for (const skill of GROUPS[groupKey].skills) {
      const col = `${GROUPS[groupKey].label} — ${skill.englishLabel} (%)`;
      if (!allSkillKeys.includes(col)) allSkillKeys.push(col);
    }
  }

  const headers = ['Date', 'Nickname', 'Full Name', 'Grade', 'Group', 'Score', 'Total', 'Level'];

  const rows = submissions.map((s) => {
    const groupData = GROUPS[s.group_key as GroupKey];
    const skillResults = groupData ? computeSkillResults(s, groupData) : [];
    const skillMap: Record<string, string> = {};
    for (const r of skillResults) {
      const col = `${groupData.label} — ${r.skill.englishLabel} (%)`;
      skillMap[col] = String(r.percentage);
    }
    const base = [
      s.session_date,
      s.nickname,
      s.full_name ?? '',
      s.grade,
      groupData?.label ?? s.group_key,
      String(s.score),
      String(s.total),
      s.level,
    ];
    const skillCols = allSkillKeys.map((k) => skillMap[k] ?? '');
    return [...base, ...skillCols];
  });

  const csvContent = [
    [...headers, ...allSkillKeys].join(','),
    ...rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `results_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayBangkok());
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const loadSubmissions = useCallback(async (date: string) => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from('submissions')
      .select('*')
      .eq('session_date', date)
      .order('created_at', { ascending: false });

    if (err) {
      setError(true);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Submission[];
    setSubmissions(rows);
    // Expand newest
    if (rows.length > 0) {
      setExpandedIds(new Set([rows[0].id]));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSubmissions(selectedDate);
  }, [selectedDate, loadSubmissions]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('submissions-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions' },
        (payload) => {
          const newRow = payload.new as Submission;
          if (newRow.session_date !== selectedDate) return;
          setSubmissions((prev) => [newRow, ...prev]);
          setExpandedIds((prev) => new Set([newRow.id, ...prev]));
          setNewIds((prev) => {
            const next = new Set([...prev, newRow.id]);
            setTimeout(() => {
              setNewIds((s) => {
                const copy = new Set(s);
                copy.delete(newRow.id);
                return copy;
              });
            }, 3000);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    await supabase.from('submissions').delete().eq('id', id);
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    setExpandedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const filtered = submissions.filter(
    (s) => groupFilter === 'all' || s.group_key === groupFilter
  );

  // Level summary
  const levelCounts: Record<string, number> = {};
  for (const s of filtered) {
    levelCounts[s.level] = (levelCounts[s.level] ?? 0) + 1;
  }

  const GROUP_KEYS = Object.keys(GROUPS) as GroupKey[];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900 mr-auto">Dashboard</h1>

          {/* Date picker */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          />

          {/* Export */}
          <button
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
            className="px-4 py-1.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Export CSV
          </button>
        </div>

        {/* Group filter tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-2 flex gap-2 flex-wrap">
          {(['all', ...GROUP_KEYS] as const).map((key) => {
            const isActive = groupFilter === key;
            const label = key === 'all' ? 'All' : GROUPS[key].label;
            const count =
              key === 'all'
                ? submissions.length
                : submissions.filter((s) => s.group_key === key).length;
            return (
              <button
                key={key}
                onClick={() => setGroupFilter(key)}
                className="px-3 py-1 rounded-full text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? '#1D9E75' : '#f3f4f6',
                  color: isActive ? 'white' : '#374151',
                }}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Summary pills */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="text-sm font-semibold text-gray-600 self-center">
              {filtered.length} submission{filtered.length !== 1 ? 's' : ''}
            </span>
            {Object.entries(levelCounts).map(([level, count]) => (
              <span
                key={level}
                className="text-xs px-3 py-1 rounded-full font-semibold"
                style={getLevelBadgeStyle(level)}
              >
                {level}: {count}
              </span>
            ))}
          </div>
        )}

        {/* States */}
        {error && (
          <div className="text-center py-16 text-red-600 font-medium">
            เกิดข้อผิดพลาด กรุณาแจ้งครูด้วยครับ
          </div>
        )}

        {loading && !error && (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-[#1D9E75]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-base">No submissions yet for this date / group.</p>
          </div>
        )}

        {/* Cards */}
        {!loading && !error && (
          <div className="space-y-3">
            {filtered.map((submission) => {
              const groupData = GROUPS[submission.group_key as GroupKey];
              if (!groupData) return null;
              return (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  groupData={groupData}
                  isExpanded={expandedIds.has(submission.id)}
                  onToggle={() => toggleExpand(submission.id)}
                  isNew={newIds.has(submission.id)}
                  onDelete={() => handleDelete(submission.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
