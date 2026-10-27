"use client";

import { useEffect, useState } from "react";
import PageHeading from "@/components/ui/page-heading";
import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { apiFetch } from "@/components/auth/api-fetch";
import { useAuth } from "@/components/auth/auth-provider";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/+$/, "");

async function readPayload(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Administrative activity could not be loaded.");
  return payload;
}

function activityDescription(entry) {
  if (entry.action === "admin.bootstrap") return "Initial administrator access bootstrapped";
  if (entry.action === "user.role_changed") return `Changed role from ${entry.details?.previousRole || "user"} to ${entry.details?.newRole || "user"}`;
  return "Administrative action";
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const controller = new AbortController();
    async function loadAuditLogs() {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (action) params.set("action", action);
      try {
        const payload = await readPayload(await apiFetch(`${API_BASE_URL}/admin/audit-logs?${params}`, { signal: controller.signal, cache: "no-store" }));
        setEntries(payload.data);
        setPages(payload.pagination.pages);
        setTotal(payload.pagination.total);
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message || "Administrative activity could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadAuditLogs();
    return () => controller.abort();
  }, [action, isAdmin, page, refresh]);

  if (!isAdmin) return <><PageHeading eyebrow="Restricted area" title="Audit logs" description="Administrative activity is available only to administrators." /><section role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Your account does not have permission to view administrative activity.</section></>;

  return <>
    <PageHeading eyebrow="Administrative history" title="Audit logs" description="Review recorded administrator role assignments and initial administrator setup." />
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-panel">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div><label htmlFor="audit-action-filter" className="mb-1.5 block text-xs font-medium text-slate-600">Filter activity</label><select id="audit-action-filter" value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} className="rounded-lg border-slate-200 text-sm"><option value="">All admin activity</option><option value="admin.bootstrap">Administrator bootstrap</option><option value="user.role_changed">User role changes</option></select></div>
        <Button variant="secondary" onClick={() => setRefresh((value) => value + 1)}>Refresh</Button>
      </div>
      {error && <div role="alert" className="m-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}<Button variant="secondary" className="ml-3" onClick={() => setRefresh((value) => value + 1)}>Retry</Button></div>}
      {loading ? <p role="status" className="px-6 py-8 text-sm text-slate-500">Loading administrative activity…</p>
        : !error && entries.length === 0 ? <div className="px-5 py-10"><EmptyState icon="audit" title="No administrative activity yet" description="Administrator bootstrap and user role changes will be recorded here." /></div>
          : !error && <>
            <div className="divide-y divide-slate-100 md:hidden">{entries.map((entry) => <article key={entry.id} className="px-5 py-4"><h2 className="text-sm font-semibold text-ink">{activityDescription(entry)}</h2><p className="mt-1 text-xs text-slate-500">{entry.actor?.name || "Unknown administrator"} <span className="break-all">({entry.actor?.email || "account unavailable"})</span></p><p className="mt-1 text-xs text-slate-500">For {entry.targetUser?.name || "Unknown account"} · {new Date(entry.createdAt).toLocaleString()}</p></article>)}</div>
            <div className="hidden overflow-x-auto md:block" role="region" aria-label="Administrative activity table" tabIndex={0}><table className="w-full min-w-[720px] text-left"><caption className="sr-only">Administrative role changes and administrator bootstrap events.</caption><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400"><th scope="col" className="px-6 py-3 font-semibold">Action</th><th scope="col" className="px-6 py-3 font-semibold">Administrator</th><th scope="col" className="px-6 py-3 font-semibold">Account</th><th scope="col" className="px-6 py-3 font-semibold">Date</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm">{entries.map((entry) => <tr key={entry.id}><th scope="row" className="px-6 py-4 text-left font-medium text-slate-700">{activityDescription(entry)}</th><td className="px-6 py-4"><span className="block text-slate-700">{entry.actor?.name || "Unknown administrator"}</span><span className="text-xs text-slate-500">{entry.actor?.email || "account unavailable"}</span></td><td className="px-6 py-4"><span className="block text-slate-700">{entry.targetUser?.name || "Unknown account"}</span><span className="text-xs text-slate-500">{entry.targetUser?.email || "account unavailable"}</span></td><td className="px-6 py-4 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="text-xs text-slate-500">{total} events · Page {page} of {Math.max(pages, 1)}</p><div className="flex gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button><Button variant="secondary" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
          </>}
    </section>
  </>;
}
