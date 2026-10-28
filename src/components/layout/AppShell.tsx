import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  BookOpenCheck,
  Github,
  Grid3X3,
  Home,
  Orbit,
  Sparkles,
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/practicar', label: 'Practicar', icon: Grid3X3 },
  { to: '/estadisticas', label: 'Estadísticas', icon: BarChart3 },
];

export function AppShell() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/80 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-semibold tracking-tight text-white">RelicPractice</span>
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `grid h-9 w-9 place-items-center rounded-lg transition ${
                    isActive ? 'bg-aqua/15 text-aqua' : 'text-slate-400 hover:text-white'
                  }`
                }
                title={item.label}
              >
                <item.icon className="h-4.5 w-4.5" size={18} />
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line/60 px-5 py-6 lg:flex">
          <Link to="/" className="flex items-center gap-3 px-2">
            <Logo />
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-white">RelicPractice</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Optimization trainer
              </p>
            </div>
          </Link>

          <nav className="mt-10 space-y-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-aqua/10 font-medium text-aqua'
                      : 'text-slate-400 hover:bg-panel2/70 hover:text-white'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-xl border border-line/70 bg-panel/60 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Sparkles className="h-3.5 w-3.5 text-aqua" />
              Cinco procedimientos
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              Transporte y asignación con solución de referencia verificada y evaluación paso a paso.
            </p>
          </div>

          <div className="mt-auto space-y-3 px-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <BookOpenCheck className="h-3.5 w-3.5" />
              100% local · sin API
            </div>
            <div className="flex items-center gap-2">
              <Github className="h-3.5 w-3.5" />
              v1.0 · React + Vite
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="relative grid h-9 w-9 place-items-center rounded-xl border border-aqua/25 bg-gradient-to-br from-aqua/20 to-azure/5">
      <Orbit className="h-5 w-5 text-aqua" />
    </div>
  );
}
