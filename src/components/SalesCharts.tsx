/** Two small charts without a chart library: day-by-day sales against last month, and branches with their returns */

const short = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} млн` : v >= 1000 ? `${Math.round(v / 1000)} тыс.` : `${Math.round(v)}`);

export function DailySalesChart({ data }: { data: Array<{ day: number; sales: number; previous: number }> }) {
  if (!data.length) return null;
  const W = 560;
  const H = 150;
  const pad = { l: 8, r: 8, t: 10, b: 18 };
  const max = Math.max(1, ...data.map((d) => Math.max(d.sales, d.previous)));
  const x = (i: number) => pad.l + (data.length === 1 ? 0 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const line = (key: 'sales' | 'previous') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');
  const total = (key: 'sales' | 'previous') => data.reduce((s, d) => s + d[key], 0);
  return (
    <div>
      <div className="flex flex-wrap gap-4 text-[11px] text-[#6a6a65] mb-1">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#0b57d0] inline-block" />Этот месяц · {short(total('sales'))}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 border-t-2 border-dashed border-[#9aa0a6] inline-block" />Прошлый месяц · {short(total('previous'))}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36" role="img" aria-label="Продажи по дням: этот месяц и прошлый">
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#e3e3e8" />
        <path d={line('previous')} fill="none" stroke="#9aa0a6" strokeWidth="1.5" strokeDasharray="4 3" />
        <path d={line('sales')} fill="none" stroke="#0b57d0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={d.day}>
            <circle cx={x(i)} cy={y(d.sales)} r="6" fill="transparent">
              <title>{`${d.day} число: ${Math.round(d.sales).toLocaleString('ru-RU')} TJS (прошлый месяц ${Math.round(d.previous).toLocaleString('ru-RU')})`}</title>
            </circle>
            {(d.day === 1 || d.day % 5 === 0 || i === data.length - 1) && (
              <text x={x(i)} y={H - 4} fontSize="9" textAnchor="middle" fill="#86868b">{d.day}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function BranchReturnsChart({ data }: { data: Array<{ branch: string; sales: number; returns: number }> }) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data.map((d) => d.sales));
  return (
    <div className="space-y-1.5">
      {data.map((d) => {
        const share = d.sales ? (d.returns / d.sales) * 100 : 0;
        const tone = share >= 12 ? 'text-rose-600 font-bold' : share >= 8 ? 'text-amber-600 font-bold' : 'text-[#6a6a65]';
        return (
          <div key={d.branch} className="text-[11px]">
            <div className="flex justify-between gap-2">
              <span className="truncate text-[#1d1d1f]">{d.branch}</span>
              <span className="font-mono whitespace-nowrap">
                {short(d.sales)} · <span className={tone}>возвр. {share.toFixed(1)}%</span>
              </span>
            </div>
            <div className="h-2 mt-0.5 bg-[#f1f3f4] rounded-full overflow-hidden">
              <div className="h-full bg-[#0b57d0] rounded-r-full" style={{ width: `${Math.max(2, (d.sales / max) * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
