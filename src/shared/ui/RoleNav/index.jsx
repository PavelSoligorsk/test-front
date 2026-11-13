import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';
import { clearSession } from '../../lib/session';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white';
const EASE = 'ease-[cubic-bezier(0.32,0.72,0,1)]';
const SIDEBAR_WIDTH = '16rem'; // должно совпадать с w-64 ниже
const RAIL_WIDTH = '3.5rem'; // должно совпадать с w-14 ниже
const STORAGE_KEY = 'role-nav:sidebar-open';

function readStoredOpen() {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {
    /* localStorage может быть недоступен */
  }
  // по умолчанию: на ноутбуке открыт, на планшете свёрнут
  return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
}

/** Иконка «=» для плавающей панели на телефоне */
function EqualIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 9h14M5 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Вертикальный список разделов со скользящей плашкой активного пункта */
function NavList({ tabs, activeKey, onSelect }) {
  const listRef = useRef(null);
  const itemRefs = useRef({});
  const [pill, setPill] = useState(null);
  const [animate, setAnimate] = useState(false);

  const measure = useCallback(() => {
    const el = itemRefs.current[activeKey];
    if (!el) {
      setPill(null);
      return;
    }
    const next = { y: el.offsetTop, h: el.offsetHeight };
    setPill((prev) => (prev && prev.y === next.y && prev.h === next.h ? prev : next));
  }, [activeKey]);

  useLayoutEffect(() => {
    measure();
  }, [measure, tabs]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(list);
    }
    document.fonts?.ready?.then(measure);
    return () => ro?.disconnect();
  }, [measure]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div ref={listRef} className="relative">
      {pill && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 rounded-xl bg-zinc-100 dark:bg-zinc-900 ring-1 ring-inset ring-zinc-200/60 dark:ring-white/5 ${
            animate
              ? `transition-[transform,height] duration-300 ${EASE} motion-reduce:transition-none`
              : ''
          }`}
          style={{ height: pill.h, transform: `translateY(${pill.y}px)` }}
        />
      )}
      <ul className="flex flex-col gap-1">
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key;
          return (
            <li key={tab.key}>
              <button
                ref={(el) => {
                  if (el) itemRefs.current[tab.key] = el;
                  else delete itemRefs.current[tab.key];
                }}
                type="button"
                onClick={() => onSelect(tab.key)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative z-10 flex w-full items-center gap-3 h-12 md:h-10 px-3 rounded-xl text-left text-base md:text-[15px] font-medium tracking-[-0.01em] transition-colors motion-reduce:transition-none ${FOCUS_RING} ${
                  isActive
                    ? 'text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {tab.icon ? (
                  <span className="shrink-0 flex w-5 h-5 items-center justify-center">{tab.icon}</span>
                ) : null}
                <span className="truncate">{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Нижний блок меню: тема и выход */
function FooterActions({ onLogout }) {
  return (
    <div className="mt-3 -mx-3 px-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-1">
      <ThemeToggle className="min-h-11 min-w-11 md:min-h-10 md:min-w-10" />
      <button
        type="button"
        onClick={onLogout}
        className="flex-1 min-h-11 md:min-h-10 inline-flex items-center gap-2.5 px-3 rounded-xl text-base md:text-[15px] font-medium tracking-[-0.01em] text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <LogOut size={18} className="shrink-0" />
        Выйти
      </button>
    </div>
  );
}

const ROUND_BUTTON = `shrink-0 items-center justify-center w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors motion-reduce:transition-none ${FOCUS_RING}`;

/**
 * tabs: [{ key, label, icon? }]
 * Ноутбук и планшет: статичная панель слева; сворачивается в тонкую вертикальную полоску (кнопка или Ctrl/Cmd + B).
 * Телефон: плавающая панель внизу + боковое меню.
 */
export default function RoleNav({
  tabs,
  activeKey,
  onSelect,
  displayName,
  subtitle,
  icon,
  onBrandClick,
}) {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(readStoredOpen); // от md и шире
  const [drawerOpen, setDrawerOpen] = useState(false); // телефон

  const dockRef = useRef(null);
  const railToggleRef = useRef(null);
  const sidebarToggleRef = useRef(null);
  const panelRef = useRef(null);
  const touchX = useRef(null);

  const activeTab = tabs.find((t) => t.key === activeKey);

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const handleDrawerSelect = (key) => {
    onSelect(key);
    setDrawerOpen(false);
  };

  const handleDrawerBrand = () => {
    setDrawerOpen(false);
    onBrandClick?.();
  };

  /* ---------- Состояние боковой панели на десктопе ---------- */

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, sidebarOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarOpen]);

  // плавный сдвиг контента вправо, пока панель открыта (страницы менять не нужно)
  useEffect(() => {
    const body = document.body;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = requestAnimationFrame(() => {
      if (!reduce) body.style.transition = `padding-left 300ms cubic-bezier(0.32,0.72,0,1)`;
    });
    return () => {
      cancelAnimationFrame(id);
      body.style.transition = '';
      body.style.paddingLeft = '';
      document.documentElement.style.removeProperty('--nav-inset');
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => {
      const inset = mq.matches ? (sidebarOpen ? SIDEBAR_WIDTH : RAIL_WIDTH) : '0px';
      document.body.style.paddingLeft = inset === '0px' ? '' : inset;
      document.documentElement.style.setProperty('--nav-inset', inset);
    };
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [sidebarOpen]);

  // Ctrl/Cmd + B — свернуть или открыть панель
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'b') return;
      if (!window.matchMedia('(min-width: 768px)').matches) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) {
        return;
      }
      e.preventDefault();
      setSidebarOpen((v) => !v);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  /* ---------- Телефон: боковое меню ---------- */

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e) => {
      if (e.matches) setDrawerOpen(false);
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const panel = panelRef.current;
    if (!panel) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(panel.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')).filter(
        (el) => !el.disabled
      );

    const id = requestAnimationFrame(() => {
      (panel.querySelector('[aria-current="page"]') || focusables()[0])?.focus();
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      dockRef.current?.focus();
    };
  }, [drawerOpen]);

  /* ---------- Разметка ---------- */

  const brandInner = (
    <>
      {icon ? (
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm ring-1 ring-black/5 dark:ring-white/10 shrink-0">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 text-left">
        {displayName ? (
          <span className="block text-[15px] leading-tight font-semibold text-zinc-900 dark:text-zinc-100 tracking-[-0.01em] truncate">
            {displayName}
          </span>
        ) : null}
        {subtitle ? (
          <span className="block mt-0.5 text-xs leading-tight font-medium text-zinc-500 dark:text-zinc-400 truncate tracking-[-0.01em]">
            {subtitle}
          </span>
        ) : null}
      </div>
    </>
  );

  const brand = (onClick, extra = '') =>
    onClick ? (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-3 min-w-0 rounded-xl transition-transform active:scale-[0.98] motion-reduce:transition-none ${FOCUS_RING} ${extra}`}
      >
        {brandInner}
      </button>
    ) : (
      <div className={`flex items-center gap-3 min-w-0 ${extra}`}>{brandInner}</div>
    );

  return (
    <>
      {/* ===== Ноутбук и планшет: статичная панель слева ===== */}
      <aside
        aria-label="Навигация"
        className={`fixed inset-y-0 left-0 z-50 hidden md:flex flex-col w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 px-3 pt-4 pb-4 transition-transform duration-300 ${EASE} motion-reduce:transition-none ${
          sidebarOpen ? 'translate-x-0 visible' : '-translate-x-full invisible [transition:transform_300ms_cubic-bezier(0.32,0.72,0,1),visibility_0s_linear_300ms]'
        }`}
      >
        <div className="flex items-center justify-between gap-2 -mx-3 pl-4 pr-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          {brand(onBrandClick, 'flex-1')}
          <button
            type="button"
            ref={sidebarToggleRef}
            onClick={() => {
              setSidebarOpen(false);
              requestAnimationFrame(() => railToggleRef.current?.focus());
            }}
            aria-label="Свернуть меню"
            title="Свернуть меню (Ctrl+B)"
            className={`inline-flex ${ROUND_BUTTON}`}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <nav aria-label="Разделы" className="mt-3 flex-1 min-h-0 overflow-y-auto">
          <NavList tabs={tabs} activeKey={activeKey} onSelect={onSelect} />
        </nav>

        <FooterActions onLogout={handleLogout} />
      </aside>

      {/* ===== Ноутбук и планшет: тонкая полоска, когда панель свёрнута ===== */}
      <aside
        aria-label="Навигация (свёрнуто)"
        className={`fixed inset-y-0 left-0 z-40 hidden md:flex flex-col items-center w-14 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 pt-4 pb-4 ${
          sidebarOpen ? 'invisible [transition:visibility_0s_linear_300ms]' : 'visible'
        }`}
      >
        <div className="w-full flex justify-center pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <button
            ref={railToggleRef}
            type="button"
            onClick={() => {
              setSidebarOpen(true);
              requestAnimationFrame(() => sidebarToggleRef.current?.focus());
            }}
            aria-label="Открыть меню"
            title="Открыть меню (Ctrl+B)"
            className={`inline-flex ${ROUND_BUTTON}`}
          >
            <PanelLeftOpen size={18} />
          </button>
        </div>

        {tabs.some((t) => t.icon) && (
          <nav aria-label="Разделы" className="mt-3 flex flex-col items-center gap-1 overflow-y-auto min-h-0">
            {tabs
              .filter((t) => t.icon)
              .map((tab) => {
                const isActive = activeKey === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onSelect(tab.key)}
                    title={tab.label}
                    aria-label={tab.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition-colors motion-reduce:transition-none ${FOCUS_RING} ${
                      isActive
                        ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {tab.icon}
                  </button>
                );
              })}
          </nav>
        )}

        {/* та же высота и отступы, что у нижнего блока развёрнутой панели */}
        <div className="mt-auto w-full px-2 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
          <ThemeToggle className="min-h-10 min-w-10" />
        </div>
      </aside>

      {/* ===== Телефон: плавающая панель ===== */}
      <button
        ref={dockRef}
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        aria-label={`Открыть меню. Сейчас: ${activeTab?.label ?? 'раздел'}`}
        className={`fixed left-1/2 z-40 md:hidden -translate-x-1/2 bottom-[max(1rem,env(safe-area-inset-bottom))] inline-flex items-stretch min-w-[11rem] h-14 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl text-zinc-900 dark:text-zinc-100 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.4)] transition-transform active:scale-[0.98] motion-reduce:transition-none ${FOCUS_RING}`}
      >
        <span className="flex-1 flex items-center justify-center px-5 text-[15px] font-medium tracking-[-0.01em] truncate max-w-[12rem]">
          {activeTab?.label ?? 'Меню'}
        </span>
        <span aria-hidden="true" className="self-center h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
        <span className="flex items-center justify-center px-4 text-zinc-600 dark:text-zinc-300">
          <EqualIcon />
        </span>
      </button>

      {/* ===== Телефон: боковое меню слева ===== */}
      <div
        className={`fixed inset-0 z-[60] md:hidden ${
          drawerOpen ? 'visible' : 'invisible [transition:visibility_0s_linear_300ms]'
        }`}
      >
        <div
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Навигация"
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchX.current != null && e.changedTouches[0].clientX - touchX.current < -60) {
              setDrawerOpen(false);
            }
            touchX.current = null;
          }}
          className={`absolute inset-y-0 left-0 flex flex-col w-[min(86vw,20rem)] bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shadow-2xl px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-300 ${EASE} motion-reduce:transition-none ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between gap-2 -mx-3 pl-4 pr-3.5 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            {brand(onBrandClick ? handleDrawerBrand : null)}
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Закрыть меню"
              className={`inline-flex ${ROUND_BUTTON}`}
            >
              <X size={18} />
            </button>
          </div>

          <nav aria-label="Разделы" className="mt-3 flex-1 min-h-0 overflow-y-auto">
            <NavList tabs={tabs} activeKey={activeKey} onSelect={handleDrawerSelect} />
          </nav>

          <FooterActions onLogout={handleLogout} />
        </div>
      </div>
    </>
  );
}