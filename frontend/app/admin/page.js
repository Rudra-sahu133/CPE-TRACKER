"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeading from "@/components/ui/page-heading";
import Button from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { apiFetch } from "@/components/auth/api-fetch";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/+$/, "");
const PAGE_SIZE = 10;
const METRICS = [
  ["Registered accounts", "users", "Accounts in the system"],
  ["Professional records", "professionals", "Owned records only"],
  ["Course records", "courses", "Owned records only"],
];

async function readPayload(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "The request could not be completed.");
  return payload;
}

function MetricCard({ label, value, description }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel"><h2 className="text-xs font-medium text-slate-500">{label}</h2><p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p><p className="mt-2 text-xs text-slate-500">{description}</p></article>;
}

function RoleBadge({ role }) {
  const style = role === "admin" ? "bg-violet-50 text-violet-700" : role === "operations" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{role || "user"}</span>;
}

export default function AdminPage() {
  const { user, csrfToken } = useAuth();
  const isAdmin = user?.role === "admin";
  const canViewOverview = isAdmin || user?.role === "operations";
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [usersRefresh, setUsersRefresh] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [roleMessage, setRoleMessage] = useState("");
  const [roleError, setRoleError] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!canViewOverview) return undefined;
    const controller = new AbortController();
    async function loadOverview() {
      setOverviewLoading(true);
      setOverviewError("");
      try {
        const payload = await readPayload(await apiFetch(`${API_BASE_URL}/admin/overview`, { signal: controller.signal, cache: "no-store" }));
        setOverview(payload.data);
      } catch (error) {
        if (error.name !== "AbortError") setOverviewError(error.message || "Metrics could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setOverviewLoading(false);
      }
    }
    loadOverview();
    return () => controller.abort();
  }, [canViewOverview]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const controller = new AbortController();
    async function loadUsers() {
      setUsersLoading(true);
      setUsersError("");
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      try {
        const payload = await readPayload(await apiFetch(`${API_BASE_URL}/admin/users?${params}`, { signal: controller.signal, cache: "no-store" }));
        setUsers(payload.data);
        setPagination(payload.pagination);
        setRoleDrafts(Object.fromEntries(payload.data.map((account) => [account.id, account.role || "user"])));
      } catch (error) {
        if (error.name !== "AbortError") setUsersError(error.message || "User accounts could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setUsersLoading(false);
      }
    }
    loadUsers();
    return () => controller.abort();
  }, [isAdmin, page, roleFilter, search, usersRefresh]);

  const heading = useMemo(() => isAdmin ? {
    eyebrow: "Administration",
    title: "Admin panel",
    description: "Review operational totals, manage account access, and review administrative activity.",
  } : {
    eyebrow: "Operations",
    title: "Operations overview",
    description: "View database-backed aggregate counts. Individual user and professional records are not available to operations accounts.",
  }, [isAdmin]);

  async function updateRole(account) {
    const role = roleDrafts[account.id] || account.role || "user";
    if (role === (account.role || "user")) return;
    if (!window.confirm(`Change ${account.name}'s role to ${role}?`)) return;
    setUpdatingUserId(account.id);
    setRoleError("");
    setRoleMessage("");
    try {
      const payload = await readPayload(await apiFetch(`${API_BASE_URL}/admin/users/${account.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }, csrfToken));
      setUsers((current) => current.map((currentUser) => currentUser.id === account.id ? payload.data : currentUser));
      setRoleDrafts((current) => ({ ...current, [account.id]: payload.data.role }));
      setRoleMessage(`Updated ${payload.data.name}'s role to ${payload.data.role}.`);
    } catch (error) {
      setRoleError(error.message || "The role could not be updated.");
    } finally {
      setUpdatingUserId("");
    }
  }

  if (!canViewOverview) {
    return <><PageHeading eyebrow="Restricted area" title="Admin panel" description="This area is available to administrators and operations users." /><section role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Your account does not have permission to view administrative tools.</section></>;
  }

  return (
    <>
      <PageHeading {...heading} />

      <section aria-label="Database-backed operational metrics">
        {overviewError && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{overviewError}</p>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {METRICS.map(([label, key, description]) => <MetricCard key={key} label={label} value={overviewLoading ? "…" : overview?.[key] ?? "—"} description={description} />)}
        </div>
        {!overviewLoading && !overviewError && <p className="mt-3 text-xs text-slate-500">Counts are loaded from MongoDB. Unowned legacy Professional and Course records are excluded.</p>}
      </section>

      {isAdmin && <section aria-labelledby="user-management-title" className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h2 id="user-management-title" className="text-base font-semibold text-ink">User management</h2>
          <p className="mt-1 text-sm text-slate-500">Manage standard and operations access. Administrator roles are only granted through the secure bootstrap command.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div><label htmlFor="admin-user-search" className="mb-1.5 block text-xs font-medium text-slate-600">Search users</label><input id="admin-user-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name or email" className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500" /></div>
            <div><label htmlFor="admin-role-filter" className="mb-1.5 block text-xs font-medium text-slate-600">Filter by role</label><select id="admin-role-filter" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500"><option value="">All roles</option><option value="user">User</option><option value="operations">Operations</option><option value="admin">Administrator</option></select></div>
          </div>
        </div>

        <div className="px-5 pt-4 sm:px-6">
          {roleMessage && <p role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{roleMessage}</p>}
          {roleError && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{roleError}</p>}
          {usersError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{usersError}<Button variant="secondary" className="ml-3" onClick={() => setUsersRefresh((value) => value + 1)}>Retry</Button></div>}
        </div>

        {usersLoading ? <p role="status" className="px-6 py-8 text-sm text-slate-500">Loading user accounts…</p>
          : !usersError && users.length === 0 ? <div className="px-6 py-10 text-center"><h3 className="text-sm font-semibold text-ink">No matching accounts</h3><p className="mt-1 text-sm text-slate-500">Try a different search or role filter.</p></div>
            : !usersError && <>
              <div className="space-y-3 px-5 pb-4 md:hidden">
                {users.map((account) => <article key={account.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-ink">{account.name}</h3><p className="mt-1 break-all text-xs text-slate-500">{account.email}</p></div><RoleBadge role={account.role} /></div><div className="mt-4 flex items-end gap-2"><div className="min-w-0 flex-1"><label htmlFor={`role-${account.id}`} className="mb-1 block text-xs font-medium text-slate-600">Change access</label><select id={`role-${account.id}`} value={roleDrafts[account.id] || account.role || "user"} onChange={(event) => setRoleDrafts((current) => ({ ...current, [account.id]: event.target.value }))} disabled={account.role === "admin"} className="block w-full rounded-lg border-slate-200 text-xs"><option value="user">User</option><option value="operations">Operations</option>{account.role === "admin" && <option value="admin">Administrator</option>}</select></div><Button variant="secondary" disabled={account.role === "admin" || updatingUserId === account.id || roleDrafts[account.id] === (account.role || "user")} onClick={() => updateRole(account)}>{updatingUserId === account.id ? "Saving…" : "Save"}</Button></div></article>)}
              </div>
              <div className="hidden overflow-x-auto md:block" role="region" aria-label="User accounts table" tabIndex={0}>
                <table className="w-full min-w-[760px] text-left"><caption className="sr-only">User accounts and their current access roles.</caption><thead><tr className="border-y border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400"><th scope="col" className="px-6 py-3 font-semibold">Name</th><th scope="col" className="px-6 py-3 font-semibold">Email</th><th scope="col" className="px-6 py-3 font-semibold">Current role</th><th scope="col" className="px-6 py-3 font-semibold">Created</th><th scope="col" className="px-6 py-3 font-semibold">Change role</th><th scope="col" className="px-6 py-3 font-semibold">Action</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm">{users.map((account) => <tr key={account.id}><th scope="row" className="px-6 py-4 text-left font-medium text-slate-700">{account.name}</th><td className="px-6 py-4 text-slate-500">{account.email}</td><td className="px-6 py-4"><RoleBadge role={account.role} /></td><td className="px-6 py-4 text-xs text-slate-500">{new Date(account.createdAt).toLocaleDateString()}</td><td className="px-6 py-4"><label className="sr-only" htmlFor={`desktop-role-${account.id}`}>Change role for {account.name}</label><select id={`desktop-role-${account.id}`} value={roleDrafts[account.id] || account.role || "user"} onChange={(event) => setRoleDrafts((current) => ({ ...current, [account.id]: event.target.value }))} disabled={account.role === "admin"} className="rounded-lg border-slate-200 text-xs"><option value="user">User</option><option value="operations">Operations</option>{account.role === "admin" && <option value="admin">Administrator</option>}</select></td><td className="px-6 py-4"><Button variant="secondary" disabled={account.role === "admin" || updatingUserId === account.id || roleDrafts[account.id] === (account.role || "user")} onClick={() => updateRole(account)}>{updatingUserId === account.id ? "Saving…" : "Save"}</Button></td></tr>)}</tbody></table>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="text-xs text-slate-500">{pagination.total} accounts · Page {pagination.page} of {Math.max(pagination.pages, 1)}</p><div className="flex gap-2"><Button variant="secondary" disabled={page <= 1 || usersLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button><Button variant="secondary" disabled={page >= pagination.pages || usersLoading} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>
            </>}
      </section>}
    </>
  );
}
