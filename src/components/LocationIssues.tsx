import { useState } from 'react';
import api from '../services/api';
import { MapPinOff, X } from 'lucide-react';

interface Issues {
  withoutCoordinates: number;
  withCheckIns: number;
  readyToPin: number;
  scattered: Array<{ clientId: string; name: string; branch: string | null; agents: string[]; visits: number; spreadMeters: number }>;
}

const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} км` : `${m} м`);

/** Clients without coordinates and the ones whose check-ins do not agree: for the supervisor to visit */
export default function LocationIssues() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Issues | null>(null);
  const [error, setError] = useState('');

  const show = () => {
    setOpen(true);
    if (data) return;
    api.get('/clients/location-issues')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Не удалось загрузить список'));
  };

  return (
    <>
      <button
        onClick={show}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-[#37352f] border border-[#e3e3e8] inline-flex items-center gap-1.5"
        title="Точки без координат и точки, где агент отмечается в разных местах"
      >
        <MapPinOff className="w-3.5 h-3.5" /> Точки без координат
      </button>

      {open && (
        <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 p-5 border-b border-[#e3e3e8]">
              <div>
                <h3 className="text-sm font-bold text-[#1d1d1f]">Точки без координат</h3>
                <p className="text-[11px] text-[#86868b] mt-0.5">
                  Координаты ставятся по отметкам агентов, если это включено в настройках компании. Здесь — где отметки не сходятся.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#86868b]" aria-label="Закрыть">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              {error ? (
                <p className="text-xs text-rose-600 text-center py-10">{error}</p>
              ) : !data ? (
                <p className="text-xs text-[#86868b] text-center py-10">Загрузка…</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e3e3e8]">
                      <div className="text-[#86868b]">Без координат</div>
                      <div className="text-lg font-bold text-[#1d1d1f]">{data.withoutCoordinates}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="text-emerald-800">Отметки совпали, встанут при следующем визите</div>
                      <div className="text-lg font-bold text-emerald-800">{data.readyToPin}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                      <div className="text-rose-800">Агент отмечается в разных местах</div>
                      <div className="text-lg font-bold text-rose-800">{data.scattered.length}</div>
                    </div>
                  </div>

                  {data.scattered.length === 0 ? (
                    <p className="text-xs text-[#86868b] text-center py-6">Разбросанных отметок нет.</p>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f8f9fa] text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                        <tr>
                          <th className="p-2.5">Точка</th><th className="p-2.5">Филиал</th><th className="p-2.5">Агенты</th>
                          <th className="p-2.5 text-right">Визитов</th><th className="p-2.5 text-right">Разброс</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e3e3e8]/60">
                        {data.scattered.map((s) => (
                          <tr key={s.clientId}>
                            <td className="p-2.5 font-semibold text-[#1d1d1f]">{s.name}</td>
                            <td className="p-2.5">{s.branch || '—'}</td>
                            <td className="p-2.5 text-[#86868b]">{s.agents.join(', ')}</td>
                            <td className="p-2.5 text-right font-mono">{s.visits}</td>
                            <td className={`p-2.5 text-right font-mono ${s.spreadMeters > 1000 ? 'text-rose-600 font-bold' : ''}`}>{km(s.spreadMeters)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
