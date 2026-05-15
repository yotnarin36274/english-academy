'use client';

import type { Skill } from '@/lib/testData';

interface SkillBarProps {
  skill: Skill;
  correct: number;
  total: number;
}

export default function SkillBar({ skill, correct, total }: SkillBarProps) {
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isStrong = percentage >= 70;
  const barColor = isStrong ? '#1D9E75' : '#EF9F27';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">
          {skill.thaiLabel}
          <span className="text-gray-400 font-normal ml-1">/ {skill.englishLabel}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 tabular-nums">
            {correct}/{total} ({percentage}%)
          </span>
          <span className="text-sm">{isStrong ? '✅' : '📈'}</span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={isStrong ? { backgroundColor: '#E1F5EE', color: '#085041' } : { backgroundColor: '#FEF3C7', color: '#92400E' }}
          >
            {isStrong ? 'Strong' : 'Develop'}
          </span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
