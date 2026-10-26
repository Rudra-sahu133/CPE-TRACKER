"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import { navigation } from "./navigation";
import { useAuth } from "@/components/auth/auth-provider";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status, sessionError, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const title = navigation.find((item) => item.href === pathname)?.label ?? "Dashboard";
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    if (status === "ready" && isAuthPage && user) router.replace("/");
    if (status === "ready" && !isAuthPage && !user) router.replace("/login");
  }, [isAuthPage, router, status, user]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [menuOpen]);

  if (isAuthPage) return children;
  if (status === "loading" || (status === "ready" && !user)) {
    return <main className="flex min-h-screen items-center justify-center px-4"><p role="status" className="text-sm text-slate-500">Checking your session…</p></main>;
  }
  if (status === "error") {
    return <main className="flex min-h-screen items-center justify-center px-4"><div role="alert" className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><h1 className="font-semibold">Authentication service unavailable</h1><p className="mt-2">{sessionError}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 font-semibold underline">Try again</button></div></main>;
  }

  return (
    <div className="min-h-screen lg:flex">
      <div className="fixed inset-y-0 left-0 z-30 hidden w-[252px] lg:block">
        <Sidebar />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-slate-950/30"
            onClick={() => setMenuOpen(false)}
          />
          <div
            ref={dialogRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            className="relative h-full w-[min(84vw,280px)] shadow-xl"
          >
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close navigation"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-5 z-10 rounded-lg bg-white px-3 py-2 text-slate-600"
            >
              <span aria-hidden="true">×</span>
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1 lg:pl-[252px]">
        <Topbar
          title={title}
          user={user}
          onLogout={async () => { await logout().catch(() => {}); router.replace("/login"); }}
          menuOpen={menuOpen}
          menuButtonRef={menuButtonRef}
          onMenuClick={() => setMenuOpen(true)}
        />
        <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-9">
          {children}
        </main>
      </div>
    </div>
  );
}
