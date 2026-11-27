import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AlertTriangle, BellRing, ChevronRight } from 'lucide-react';

interface Signal { key: string; level: 'critical' | 'warning'; title: string; detail: string; link: string }

/** What a manager should look at today; nothing when all is calm */
export default function SignalsPanel() {
  const [signals, setSignals] = useState<Signal[] | null>(null);
  useEffect(() => {
    api.get('/signals').then((res) => setSignals(res.data)).catch(() => setSignals(null));
  }, []);
  if (!signals?.length) return null;
  return (
    <div className="bg-white border border-[#e3e3e8] p-5 rounded-2xl shadow-sm space-y-3">
      <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
        <BellRing className="w-4 h-4 text-rose-600" /> Требует внимания
      </h3>
      <ul className="space-y-2">
        {signals.map((s) => (
          <li key={s.key}>
            <Link
              to={s.link}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs transition-colors ${
                s.level === 'critical' ? 'bg-rose-50 border-rose-100 hover:bg-rose-100/70' : 'bg-amber-50 border-amber-100 hover:bg-amber-100/70'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${s.level === 'critical' ? 'text-rose-600' : 'text-amber-600'}`} />
              <span className="flex-1">
                <span className={`block font-bold ${s.level === 'critical' ? 'text-rose-800' : 'text-amber-900'}`}>{s.title}</span>
                <span className="block text-[#6a6a65] mt-0.5">{s.detail}</span>
              </span>
              <ChevronRight className="w-4 h-4 shrink-0 text-[#86868b]" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
