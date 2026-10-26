"use client";

import Icon from "@/components/ui/icon";

export default function Topbar({ title, menuOpen, menuButtonRef, onMenuClick, user, onLogout }) {
  const initials = (user?.name || user?.email || "U").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7 lg:px-9">
      <div className="flex min-w-0 items-center gap-3">
        <button ref={menuButtonRef} type="button" aria-label="Open navigation" aria-controls="mobile-navigation" aria-expanded={menuOpen} onClick={onMenuClick} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Icon name="menu" /></button>
        <p className="truncate text-sm font-semibold text-slate-700">{title}</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <div aria-hidden="true" className="hidden h-9 w-52 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 md:flex"><Icon name="search" size={16} className="text-slate-400" /><span className="text-xs text-slate-400">Search anything...</span><kbd className="ml-auto rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">⌘ K</kbd></div>
        <button type="button" aria-label="Notifications" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Icon name="bell" size={19} /><span aria-hidden="true" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" /></button>
        <div aria-hidden="true" className="h-8 border-l border-slate-200" />
        <div className="flex items-center gap-2">
          <div aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9e3d8] text-xs font-semibold text-[#68583f]">{initials}</div>
          <span className="hidden max-w-40 text-left sm:block"><span className="block truncate text-xs font-semibold text-slate-700">{user?.name}</span><span className="mt-0.5 block truncate text-[10px] text-slate-400">{user?.email}</span></span>
          <button type="button" onClick={onLogout} className="rounded-lg px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100">Sign out</button>
        </div>
      </div>
    </header>
  );
}
