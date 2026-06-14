'use client';

export interface RadarAxis { label: string; value: number; }

export function RadarChart({ axes, sessions, emptyLabel }: {
  axes: RadarAxis[];
  sessions: number;
  emptyLabel?: string;
}) {
  if (axes.length < 3) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm space-y-1">
        <div className="text-3xl">🕸️</div>
        <p>{emptyLabel ?? 'ต้องมีข้อมูลประเมินทักษะอย่างน้อย 3 ด้าน'}</p>
        <p className="text-xs">ครูต้องบันทึกการประเมินระหว่างคาบก่อนครับ</p>
      </div>
    );
  }

  const SIZE = 220;
  const cx = SIZE / 2, cy = SIZE / 2;
  const R = 80;
  const n = axes.length;
  const GRID = [0.25, 0.5, 0.75, 1.0];

  function pt(axisIdx: number, radius: number) {
    const angle = (axisIdx / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  function polygon(radius: number) {
    return Array.from({ length: n }, (_, i) => pt(i, radius))
      .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  const dataPolygon = axes
    .map((a, i) => pt(i, R * Math.max(0.01, a.value / 100)))
    .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-xs mx-auto block" style={{ height: SIZE }}>
        {GRID.map(lv => (
          <polygon key={lv} points={polygon(R * lv)} fill="none" stroke="#e5e7eb" strokeWidth="1" />
        ))}
        {GRID.map(lv => {
          const p = pt(0, R * lv);
          return <text key={lv} x={p.x + 3} y={p.y} fontSize="7" fill="#d1d5db">{lv * 100}%</text>;
        })}
        {axes.map((_, i) => {
          const outer = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#e5e7eb" strokeWidth="1" />;
        })}
        <polygon points={dataPolygon}
          fill="rgba(29,158,117,0.15)" stroke="#1D9E75" strokeWidth="2" strokeLinejoin="round" />
        {axes.map((a, i) => {
          const p = pt(i, R * Math.max(0.01, a.value / 100));
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="#1D9E75" />
              {a.value > 0 && (
                <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize="8" fill="#1D9E75" fontWeight="bold">
                  {a.value}%
                </text>
              )}
            </g>
          );
        })}
        {axes.map((a, i) => {
          const outer = pt(i, R + 18);
          return (
            <text key={i} x={outer.x} y={outer.y + 4}
              textAnchor="middle" fontSize="10" fill="#374151" fontWeight="500">
              {a.label}
            </text>
          );
        })}
      </svg>
      {sessions > 0 && (
        <p className="text-xs text-gray-400 text-center mt-1">เฉลี่ยจาก {sessions} session</p>
      )}
    </div>
  );
}

export async function buildRadarAxes(studentId: string, db: ReturnType<typeof import('@/lib/supabase').db>) {
  const { data: assessments } = await db
    .from('in_class_assessments')
    .select('skill_ratings')
    .eq('student_id', studentId);

  if (!assessments?.length) return { axes: [] as RadarAxis[], sessions: 0 };

  const totals: Record<string, { sum: number; count: number }> = {};
  for (const a of assessments) {
    const ratings = (a.skill_ratings ?? {}) as Record<string, number>;
    for (const [skill, val] of Object.entries(ratings)) {
      if (!val) continue;
      if (!totals[skill]) totals[skill] = { sum: 0, count: 0 };
      totals[skill].sum += val;
      totals[skill].count += 1;
    }
  }

  const axes: RadarAxis[] = Object.entries(totals)
    .filter(([, t]) => t.count > 0)
    .map(([label, t]) => ({ label, value: Math.round((t.sum / t.count / 5) * 100) }));

  return { axes, sessions: assessments.length };
}
