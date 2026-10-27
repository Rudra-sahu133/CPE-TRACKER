"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import Icon from "@/components/ui/icon";
import { navigation } from "./navigation";

export default function Sidebar({ onNavigate }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const visibleNavigation = navigation.filter((item) => !item.roles || item.roles.includes(user?.role || "user"));

  return (
    <aside aria-label="Workspace sidebar" className="flex h-full w-full flex-col border-r border-slate-200 bg-white">
      <div className="flex h-[76px] items-center gap-3 px-6">
        <div aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">C</div>
        <div><p className="text-[15px] font-semibold tracking-tight text-ink">CPE Tracker</p><p className="mt-0.5 text-[11px] text-slate-400">PROFESSIONAL WORKSPACE</p></div>
      </div>
      <div className="px-4 pt-5">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {visibleNavigation.map((item) => {
            const active = pathname === item.href;
            const label = item.href === "/admin" && user?.role === "operations" ? "Operations" : item.label;
            return <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition ${active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-ink"}`}><Icon name={item.icon} size={18} />{label}</Link>;
          })}
        </nav>
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-700">Workspace setup</span><span className="text-xs font-medium text-brand-700">2 of 4</span></div>
          <div role="progressbar" aria-label="Workspace setup" aria-valuemin={0} aria-valuemax={4} aria-valuenow={2} className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div aria-hidden="true" className="h-full w-1/2 rounded-full bg-brand-500" /></div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Add your team and requirements to get started.</p>
          <button type="button" className="mt-2 text-xs font-semibold text-brand-700">Continue setup</button>
        </div>
        <p className="px-2 pt-4 text-[11px] text-slate-400">© 2026 CPE Tracker</p>
      </div>
    </aside>
  );
}
