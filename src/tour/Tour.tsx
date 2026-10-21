import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, MousePointerClick, Sparkles, X } from 'lucide-react';
import { buildTourSteps, TourStep } from './tourSteps';
import { tourSeenKey, tourStore } from './tourStore';
import './tour.css';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourProps {
  user: { id?: string; username?: string; firstName?: string; role?: string };
  availablePaths: string[];
  setMobileMenu: (open: boolean) => void;
}

const PAD = 6;
const CARD_W = 372;
const CONFETTI_COLORS = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

const sel = (target: string) => `[data-tour="${target}"]`;

function isVisible(el: Element | null): el is HTMLElement {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function Confetti({ count = 90 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        dx: (Math.random() - 0.5) * 360,
        rot: (Math.random() - 0.5) * 1440,
        dur: 2.2 + Math.random() * 2,
        delay: Math.random() * 0.7,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    [count],
  );
  return (
    <>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="tour-confetti-piece"
          style={
            {
              left: `${p.left}vw`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              '--dx': `${p.dx}px`,
              '--rot': `${p.rot}deg`,
              '--dur': `${p.dur}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

export function Tour({ user, availablePaths, setMobileMenu }: TourProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { active, index } = useSyncExternalStore(tourStore.subscribe, tourStore.getSnapshot);

  const steps: TourStep[] = useMemo(() => {
    if (!active) return [];
    return buildTourSteps(user, (s) => {
      if (s.startsWith('nav:')) return availablePaths.includes(s.slice(4));
      return isVisible(document.querySelector(sel(s)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const step: TourStep | undefined = steps[Math.min(index, Math.max(steps.length - 1, 0))];
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const [rect, setRect] = useState<Rect | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number }>(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth - 140 : 600,
    y: typeof window !== 'undefined' ? window.innerHeight - 140 : 400,
  }));
  const [cursorVisible, setCursorVisible] = useState(false);
  const [ripples, setRipples] = useState<number[]>([]);
  const [tryDone, setTryDone] = useState(false);
  const [cardH, setCardH] = useState(320);
  const [, setTick] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const lastLandedKey = useRef<string>('');

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const close = useCallback(
    (markSeen = true) => {
      clearTimers();
      if (markSeen) {
        try {
          localStorage.setItem(tourSeenKey(user), '1');
        } catch {
          /* ignore */
        }
      }
      setMobileMenu(false);
      tourStore.stop();
    },
    [user, setMobileMenu],
  );

  const goTo = useCallback(
    (i: number) => {
      if (i < 0) return;
      if (i >= steps.length) {
        close();
        return;
      }
      tourStore.setIndex(i);
    },
    [steps.length, close],
  );

  const ripple = () => {
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, id]);
    later(() => setRipples((r) => r.filter((x) => x !== id)), 800);
  };

  // Track the target rectangle (follows scroll / layout / animation).
  useEffect(() => {
    if (!active || !step?.target) {
      setRect(null);
      return;
    }
    const selector = sel(step.target);
    let raf = 0;
    const tick = () => {
      const el = document.querySelector(selector);
      if (isVisible(el)) {
        const r = el.getBoundingClientRect();
        setRect((prev) =>
          prev &&
          Math.abs(prev.top - r.top) < 0.5 &&
          Math.abs(prev.left - r.left) < 0.5 &&
          Math.abs(prev.width - r.width) < 0.5 &&
          Math.abs(prev.height - r.height) < 0.5
            ? prev
            : { top: r.top, left: r.left, width: r.width, height: r.height },
        );
      } else {
        setRect((prev) => (prev ? null : prev));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, step?.id, step?.target]);

  // Step entry: mobile drawer, scroll target into view.
  useEffect(() => {
    if (!active || !step) return;
    setTryDone(false);
    const needsDrawer = step.target?.startsWith('nav:') || step.target === 'sidebar';
    if (isMobile) setMobileMenu(!!needsDrawer);
    if (step.target) {
      later(() => {
        const el = document.querySelector(sel(step.target as string));
        if (isVisible(el)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 120);
    }
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step?.id]);

  // Animated cursor: fly to the target, then "click".
  useEffect(() => {
    if (!active || !step) return;
    if (!step.target || !rect) {
      if (!step.target) setCursorVisible(false);
      return;
    }
    const x = rect.left + (step.target.startsWith('nav:') ? Math.min(rect.width * 0.55, 120) : rect.width / 2);
    const y = rect.top + rect.height / 2;
    setCursorVisible(true);
    setCursor({ x, y });

    const key = `${step.id}`;
    if (lastLandedKey.current === key) return;
    lastLandedKey.current = key;

    if (step.kind === 'module' && step.path) {
      const alreadyThere = location.pathname === step.path;
      if (alreadyThere) return; // resumed after navigation — nothing to replay
      later(() => {
        ripple();
        const el = document.querySelector(sel(step.target as string));
        el?.classList.add('tour-press');
        later(() => el?.classList.remove('tour-press'), 260);
        later(() => {
          navigate(step.path as string);
          if (isMobile) later(() => setMobileMenu(true), 160);
        }, 280);
      }, 1050);
    } else if (step.kind === 'info') {
      later(() => ripple(), 1050);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step?.id, rect?.top, rect?.left, rect?.width, rect?.height]);

  // Interactive "try it yourself" steps.
  useEffect(() => {
    if (!active || !step || step.kind !== 'try' || !step.target || !step.tryEvent) return;
    const el = document.querySelector(sel(step.target));
    if (!el) return;
    const evt = step.tryEvent === 'focus' ? 'focusin' : 'click';
    const handler = () => {
      setTryDone(true);
      later(() => goTo(index + 1), 1300);
    };
    el.addEventListener(evt, handler, { once: true });
    return () => el.removeEventListener(evt, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step?.id]);

  // Keyboard controls.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' || (e.key === 'Enter' && step?.kind !== 'try')) goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, index, step?.kind, goTo, close]);

  // Re-layout on resize; measure card height for positioning.
  useEffect(() => {
    if (!active) return;
    const onResize = () => setTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active]);

  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight;
    if (h && Math.abs(h - cardH) > 2) setCardH(h);
  });

  // Reset landing key when tour restarts.
  useEffect(() => {
    if (!active) lastLandedKey.current = '';
  }, [active]);

  if (!active || !step) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const centered = !step.target || !rect;

  // Card placement
  let cardStyle: React.CSSProperties;
  if (isMobile) {
    cardStyle = { left: 12, right: 12, bottom: 12, width: 'auto' };
  } else if (centered) {
    cardStyle = { left: Math.round((vw - CARD_W) / 2), top: Math.round(Math.max(24, (vh - cardH) / 2)), width: CARD_W };
  } else {
    const r = rect as Rect;
    let left: number;
    let top: number;
    if (r.left + r.width / 2 < vw * 0.32) {
      left = r.left + r.width + PAD + 22;
      top = r.top + r.height / 2 - cardH / 2;
    } else if (r.top + r.height < vh * 0.4) {
      top = r.top + r.height + PAD + 18;
      left = r.left + r.width - CARD_W;
    } else {
      top = r.top - cardH - PAD - 18;
      left = r.left + r.width / 2 - CARD_W / 2;
    }
    left = Math.min(Math.max(16, left), vw - CARD_W - 16);
    top = Math.min(Math.max(16, top), vh - cardH - 16);
    cardStyle = { left: Math.round(left), top: Math.round(top), width: CARD_W };
  }

  const total = steps.length;
  const progress = ((index + 1) / total) * 100;
  const isLast = index >= total - 1;
  const isTry = step.kind === 'try';
  const spot = rect && step.target ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 } : null;

  const content = (
    <>
      {/* Dim + spotlight */}
      {spot ? <div className="tour-spot" style={spot} /> : <div className="tour-dim" />}

      {/* Click blockers: allow interaction only inside the hole on "try" steps */}
      {spot && isTry ? (
        <>
          <div className="tour-blocker" style={{ top: 0, left: 0, right: 0, height: Math.max(spot.top, 0) }} />
          <div className="tour-blocker" style={{ top: spot.top + spot.height, left: 0, right: 0, bottom: 0 }} />
          <div className="tour-blocker" style={{ top: spot.top, left: 0, width: Math.max(spot.left, 0), height: spot.height }} />
          <div className="tour-blocker" style={{ top: spot.top, left: spot.left + spot.width, right: 0, height: spot.height }} />
        </>
      ) : (
        <div className="tour-blocker" style={{ inset: 0 }} />
      )}

      {/* Animated cursor */}
      {!isMobile || step.target ? (
        <div
          className="tour-cursor"
          style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)`, opacity: cursorVisible ? 1 : 0 }}
        >
          <div style={{ position: 'relative' }}>
            {ripples.map((id) => (
              <span key={id} className="tour-ripple" />
            ))}
            <svg width="30" height="34" viewBox="0 0 24 28" fill="none" style={{ marginLeft: -4, marginTop: -2 }}>
              <path
                d="M3 2 L3 21 L8 16.5 L11.5 24.5 L14.5 23.2 L11 15.5 L18 15 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      ) : null}

      {/* Card */}
      <div
        ref={cardRef}
        key={step.id}
        className="tour-card fixed z-[2150] rounded-3xl bg-white dark:bg-[#1f1f23] text-[#1d1d1f] dark:text-[#f5f5f7] shadow-2xl border border-white/60 dark:border-[#333] overflow-hidden"
        style={cardStyle}
        role="dialog"
        aria-label={step.title}
      >
        {/* progress */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-[#2c2c30]">
          <div className="tour-progress-fill h-full rounded-r-full" style={{ width: `${progress}%` }} />
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/50 dark:to-violet-950/40 border border-blue-100 dark:border-blue-900 shadow-sm flex-shrink-0 ${
                  step.kind === 'welcome' || step.kind === 'finish' ? '' : ''
                }`}
                style={step.kind === 'welcome' || step.kind === 'finish' ? { animation: 'tour-float 2.4s ease-in-out infinite' } : undefined}
              >
                {step.emoji}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#0b57d0] dark:text-blue-400">
                  {step.section}
                </div>
                <h3 className="text-base font-bold leading-tight">{step.title}</h3>
              </div>
            </div>
            <button
              onClick={() => close()}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2c30] text-slate-400 flex-shrink-0"
              title="Закрыть тур (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[13px] leading-relaxed text-[#3c4043] dark:text-[#c7c7cc]">{step.text}</p>

          {step.bullets && step.bullets.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {step.bullets.map((b, i) => (
                <li
                  key={`${step.id}-${i}`}
                  className="tour-bullet flex items-start gap-2 text-[12px] text-[#5f6368] dark:text-[#a1a1a6]"
                  style={{ animationDelay: `${0.25 + i * 0.14}s` }}
                >
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {isTry && (
            <div
              className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold border ${
                tryDone
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-[#0b57d0] dark:text-blue-300'
              }`}
              style={!tryDone ? { animation: 'tour-hint 1.4s ease-in-out infinite' } : undefined}
            >
              {tryDone ? <Check className="w-4 h-4" /> : <MousePointerClick className="w-4 h-4" />}
              {tryDone ? 'Отлично! Все получилось 🎉' : step.tryHint}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-slate-400">
              {index + 1} / {total}
            </span>
            <div className="flex items-center gap-2">
              {index > 0 && step.kind !== 'finish' && (
                <button
                  onClick={() => goTo(index - 1)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-[#5f6368] dark:text-[#a1a1a6] hover:bg-slate-100 dark:hover:bg-[#2c2c30] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Назад
                </button>
              )}
              {step.kind === 'welcome' && (
                <button
                  onClick={() => close()}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#2c2c30] transition-colors"
                >
                  Пропустить
                </button>
              )}
              <button
                onClick={() => (isLast ? close() : goTo(index + 1))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0b57d0] to-[#6d28d9] hover:brightness-110 text-white text-xs font-bold shadow-md shadow-blue-500/30 transition-all active:scale-95"
              >
                {step.kind === 'welcome' ? 'Поехали!' : isLast ? 'Завершить' : isTry && !tryDone ? 'Пропустить шаг' : 'Далее'}
                {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {step.kind === 'finish' && <Confetti />}
    </>
  );

  return createPortal(content, document.body);
}

/** First-visit invitation card, shown once per user. */
export function TourInvite({ user }: { user: { id?: string; username?: string } }) {
  const [show, setShow] = useState(false);
  const { active } = useSyncExternalStore(tourStore.subscribe, tourStore.getSnapshot);

  useEffect(() => {
    try {
      if (localStorage.getItem('impersonated_by_superadmin') === 'true') return;
      if (localStorage.getItem(tourSeenKey(user))) return;
    } catch {
      return;
    }
    const t = window.setTimeout(() => setShow(true), 1600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show || active) return null;

  const dismiss = (start: boolean) => {
    try {
      localStorage.setItem(tourSeenKey(user), '1');
    } catch {
      /* ignore */
    }
    setShow(false);
    if (start) tourStore.start();
  };

  return createPortal(
    <div className="tour-invite fixed bottom-6 right-6 z-[1500] w-[340px] max-w-[calc(100vw-24px)] rounded-3xl bg-white dark:bg-[#1f1f23] border border-[#e3e3e8] dark:border-[#333] shadow-2xl p-5">
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0b57d0] to-[#6d28d9] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0"
          style={{ animation: 'tour-float 2.4s ease-in-out infinite' }}
        >
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">Первый раз в SmartSale?</h4>
          <p className="text-xs text-[#5f6368] dark:text-[#a1a1a6] mt-1 leading-relaxed">
            Пройдите интерактивный тур на 2 минуты — покажу все разделы и как ими пользоваться.
          </p>
        </div>
        <button onClick={() => dismiss(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2c30] text-slate-400" title="Закрыть">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => dismiss(true)}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#0b57d0] to-[#6d28d9] text-white text-xs font-bold shadow-md shadow-blue-500/30 hover:brightness-110 active:scale-95 transition-all"
        >
          Начать тур
        </button>
        <button
          onClick={() => dismiss(false)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#2c2c30] transition-colors"
        >
          Позже
        </button>
      </div>
    </div>,
    document.body,
  );
}
