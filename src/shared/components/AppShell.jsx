import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Bell, Menu, X, LogOut, Activity } from 'lucide-react';

export default function AppShell({ brandLabel, navItems, user, onLogout, notifCount = 0, onBellClick, pageTitle, children, footerAction }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-lifeline-bg">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-lifeline-border flex flex-col transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-6 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Activity size={20} className="text-lifeline-red" />
              <span className="font-extrabold text-lg tracking-tight text-lifeline-red">LIFELINE</span>
            </div>
            <p className="text-[10px] font-bold tracking-widest text-lifeline-sub mt-0.5">{brandLabel}</p>
          </div>
          <button className="lg:hidden text-slate-400" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-red-50 text-lifeline-red' : 'text-slate-500 hover:bg-slate-50 hover:text-lifeline-ink'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
              {item.badge > 0 && (
                <span className="ml-auto bg-lifeline-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-lifeline-border">
          {footerAction}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-lifeline-red mt-1"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 bg-white border-b border-lifeline-border flex items-center justify-between px-4 sm:px-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden text-slate-500" onClick={() => setMobileOpen(true)}><Menu size={22} /></button>
            <h1 className="font-bold text-lifeline-ink text-base sm:text-lg truncate">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button onClick={onBellClick} className="relative w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">
              <Bell size={18} />
              {notifCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-lifeline-red rounded-full" />}
            </button>
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-lifeline-ink text-white flex items-center justify-center font-bold text-xs">
                {user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold text-lifeline-ink">{user?.name}</p>
                <p className="text-xs text-lifeline-sub">{user?.userType}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
