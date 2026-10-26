"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PageHeading from "@/components/ui/page-heading";
import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { apiFetch } from "@/components/auth/api-fetch";
import { useAuth } from "@/components/auth/auth-provider";

const STATUS_OPTIONS = ["Active", "Expiring soon", "Expired"];
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/+$/, "");
const EMPTY_FORM = {
  name: "",
  email: "",
  profession: "",
  state: "",
  licenseExpiry: "",
};

const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"],
  ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ["DC", "District of Columbia"],
];

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function statusStyles(status) {
  if (status === "Active") return "bg-emerald-50 text-emerald-700";
  if (status === "Expired") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function FieldError({ id, message }) {
  return message ? <p id={id} className="mt-1.5 text-xs text-rose-600" aria-live="polite">{message}</p> : null;
}

function SummaryCard({ label, value, detail, tone }) {
  return (
    <article aria-label={`${label}: ${value}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel">
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-ink">{value}</p>
      <p className={`mt-2 text-xs font-medium ${tone}`}>{detail}</p>
    </article>
  );
}

function ProfessionalDetails({ professional }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-4 text-xs">
      <div><dt className="text-slate-400">Profession</dt><dd className="mt-1 font-medium text-slate-700">{professional.profession}</dd></div>
      <div><dt className="text-slate-400">State</dt><dd className="mt-1 font-medium text-slate-700">{professional.state}</dd></div>
      <div className="col-span-2"><dt className="text-slate-400">License expiry</dt><dd className="mt-1 font-medium text-slate-700">{formatDate(professional.licenseExpiry)}</dd></div>
    </dl>
  );
}

export default function ProfessionalsPage() {
  const { csrfToken } = useAuth();
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [professionFilter, setProfessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const dialogRef = useRef(null);
  const addButtonRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;

    async function loadProfessionals() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await apiFetch(`${API_BASE_URL}/professionals`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Professionals could not be loaded.");

        if (isCurrentRequest) {
          setProfessionals(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch (error) {
        if (isCurrentRequest && error.name !== "AbortError") {
          setProfessionals([]);
          setLoadError(error instanceof TypeError
            ? "Could not reach the CPE Tracker API. Check that the backend is running."
            : error.message || "Professionals could not be loaded. Please try again.");
        }
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    }

    loadProfessionals();
    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [refreshIndex]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (dialogOpen && !dialog.open) dialog.showModal();
    if (!dialogOpen && dialog.open) dialog.close();
  }, [dialogOpen]);

  const filteredProfessionals = useMemo(() => {
    const query = search.trim().toLowerCase();
    return professionals.filter((professional) => {
      const matchesSearch = !query
        || professional.name.toLowerCase().includes(query)
        || professional.email.toLowerCase().includes(query);
      const matchesProfession = professionFilter === "all" || professional.profession === professionFilter;
      const matchesStatus = statusFilter === "all" || professional.status === statusFilter;
      return matchesSearch && matchesProfession && matchesStatus;
    });
  }, [professionals, professionFilter, search, statusFilter]);

  const summary = useMemo(() => ({
    total: professionals.length,
    cpas: professionals.filter((professional) => professional.profession === "CPA").length,
    attorneys: professionals.filter((professional) => professional.profession === "Attorney").length,
    attention: professionals.filter((professional) => professional.status !== "Active").length,
  }), [professionals]);

  function openDialog() {
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setErrors({});
    setFormError("");
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  async function submitProfessional(event) {
    event.preventDefault();
    setSuccessMessage("");

    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Enter the professional’s name.";
    if (!form.email.trim()) nextErrors.email = "Enter an email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email address, such as name@example.com.";
    else if (professionals.some((professional) => professional.email.toLowerCase() === form.email.trim().toLowerCase())) nextErrors.email = "This email is already in the professional list.";
    if (!form.profession) nextErrors.profession = "Choose CPA or Attorney.";
    if (!form.state) nextErrors.state = "Choose a state.";
    if (!form.licenseExpiry) nextErrors.licenseExpiry = "Choose a license expiry date.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidField = Object.keys(nextErrors)[0];
      const fieldId = firstInvalidField === "licenseExpiry"
        ? "professional-expiry"
        : `professional-${firstInvalidField}`;
      document.getElementById(fieldId)?.focus();
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const response = await apiFetch(`${API_BASE_URL}/professionals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          profession: form.profession,
          state: form.state,
          licenseExpiry: form.licenseExpiry,
        }),
      }, csrfToken);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors(payload.errors || {});
        setFormError(payload.message || "Professional could not be saved. Please try again.");
        const firstInvalidField = Object.keys(payload.errors || {})[0];
        if (firstInvalidField) {
          const fieldId = firstInvalidField === "licenseExpiry" ? "professional-expiry" : `professional-${firstInvalidField}`;
          document.getElementById(fieldId)?.focus();
        }
        return;
      }

      setProfessionals((current) => [payload.data, ...current]);
      setForm(EMPTY_FORM);
      closeDialog();
      setSuccessMessage(payload.message || "Professional added successfully.");
    } catch (error) {
      setFormError(error instanceof TypeError
        ? "Could not reach the CPE Tracker API. Check that the backend is running."
        : error.message || "Professional could not be saved. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setProfessionFilter("all");
    setStatusFilter("all");
  }

  return (
    <>
      <PageHeading
        eyebrow="Team directory"
        title="Professionals"
        description="Manage your team’s professional details and keep license dates in view."
        action={<Button ref={addButtonRef} icon="plus" onClick={openDialog}>Add Professional</Button>}
      />

      <div role="note" className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
        License status is calculated from the saved expiry date. Records are not verified with licensing authorities.
      </div>

      <section aria-label="Professional summary" className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <SummaryCard label="Total professionals" value={loading || loadError ? "—" : summary.total} detail="In this workspace" tone="text-slate-500" />
        <SummaryCard label="CPAs" value={loading || loadError ? "—" : summary.cpas} detail="CPA records" tone="text-brand-700" />
        <SummaryCard label="Attorneys" value={loading || loadError ? "—" : summary.attorneys} detail="Attorney records" tone="text-violet-700" />
        <SummaryCard label="Needs attention" value={loading || loadError ? "—" : summary.attention} detail="Expiring soon or expired" tone="text-amber-700" />
      </section>

      {successMessage && <p role="status" className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p>}

      <section aria-labelledby="professional-list-title" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 px-4 py-5 sm:px-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="professional-list-title" className="text-sm font-semibold text-ink">Professional directory</h2>
              <p className="mt-1 text-xs text-slate-500">Search and filter your workspace records.</p>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600" aria-live="polite">
              {loading ? "Loading…" : loadError ? "Unavailable" : `${filteredProfessionals.length} ${filteredProfessionals.length === 1 ? "result" : "results"}`}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_190px_190px]">
            <div>
              <label htmlFor="professional-search" className="mb-1.5 block text-xs font-medium text-slate-600">Search professionals</label>
              <input
                id="professional-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email"
                className="block w-full rounded-lg border-slate-200 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
            <div>
              <label htmlFor="profession-filter" className="mb-1.5 block text-xs font-medium text-slate-600">Profession</label>
              <select id="profession-filter" value={professionFilter} onChange={(event) => setProfessionFilter(event.target.value)} className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500">
                <option value="all">All professions</option>
                <option value="CPA">CPA</option>
                <option value="Attorney">Attorney</option>
              </select>
            </div>
            <div>
              <label htmlFor="status-filter" className="mb-1.5 block text-xs font-medium text-slate-600">Status</label>
              <select id="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500">
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div role="status" className="flex items-center justify-center gap-3 px-5 py-14 text-sm text-slate-500">
            <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
            Loading professionals…
          </div>
        ) : loadError ? (
          <div role="alert" className="px-5 py-12 text-center">
            <h3 className="text-sm font-semibold text-ink">Professionals are unavailable</h3>
            <p className="mt-2 text-sm text-slate-500">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => setRefreshIndex((current) => current + 1)}>Try again</Button>
          </div>
        ) : filteredProfessionals.length === 0 ? (
          professionals.length === 0 ? (
            <div className="p-4 text-center sm:p-6">
              <EmptyState icon="people" title="No professionals yet" description="Add a professional to begin building your directory." />
              <Button icon="plus" className="mt-4" onClick={openDialog}>Add professional</Button>
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <h3 className="text-sm font-semibold text-ink">No matching professionals</h3>
              <p className="mt-2 text-sm text-slate-500">Try a different name, email, profession, or status.</p>
              <Button variant="secondary" className="mt-4" onClick={clearFilters}>Clear filters</Button>
            </div>
          )
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {filteredProfessionals.map((professional) => (
                <article key={professional.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{initials(professional.name)}</div>
                      <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-ink">{professional.name}</h3><p className="mt-1 break-all text-xs text-slate-500">{professional.email}</p></div>
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium ${statusStyles(professional.status)}`}>{professional.status}</span>
                  </div>
                  <ProfessionalDetails professional={professional} />
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block" role="region" aria-label="Professional directory table; scroll horizontally to see all columns" tabIndex={0}>
              <table className="w-full min-w-[850px] text-left">
                <caption className="sr-only">Professionals, their contact information, profession, licensing state, expiry date, and status.</caption>
                <thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400">
                  <th scope="col" className="px-5 py-3 font-semibold">Name</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Email</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Profession</th>
                  <th scope="col" className="px-5 py-3 font-semibold">State</th>
                  <th scope="col" className="px-5 py-3 font-semibold">License expiry</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredProfessionals.map((professional) => (
                    <tr key={professional.id} className="hover:bg-slate-50/70">
                      <th scope="row" className="px-5 py-4 text-left font-medium text-slate-700">
                        <div className="flex items-center gap-3"><div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-700">{initials(professional.name)}</div><span>{professional.name}</span></div>
                      </th>
                      <td className="px-5 py-4 text-slate-500">{professional.email}</td>
                      <td className="px-5 py-4 text-slate-600">{professional.profession}</td>
                      <td className="px-5 py-4 text-slate-600">{professional.state}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(professional.licenseExpiry)}</td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-medium ${statusStyles(professional.status)}`}>{professional.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <dialog
        ref={dialogRef}
        aria-labelledby="add-professional-title"
        aria-describedby="add-professional-description"
        className="professional-dialog m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-ink shadow-2xl"
        onCancel={(event) => { event.preventDefault(); closeDialog(); }}
        onClose={() => { setDialogOpen(false); addButtonRef.current?.focus(); }}
        onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}
      >
        <form noValidate onSubmit={submitProfessional}>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 id="add-professional-title" className="text-lg font-semibold tracking-tight">Add professional</h2>
              <p id="add-professional-description" className="mt-1 text-sm text-slate-500">Add a professional record to your workspace.</p>
            </div>
            <button type="button" aria-label="Close add professional dialog" disabled={isSubmitting} onClick={closeDialog} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">×</button>
          </div>

          {formError && <p role="alert" className="mx-5 mt-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 sm:mx-6">{formError}</p>}

          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
            <div className="sm:col-span-2">
              <label htmlFor="professional-name" className="mb-1.5 block text-xs font-medium text-slate-700">Name <span className="text-rose-600">*</span></label>
              <input autoFocus required id="professional-name" name="name" value={form.name} onChange={updateField} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "professional-name-error" : undefined} className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500" />
              <FieldError id="professional-name-error" message={errors.name} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="professional-email" className="mb-1.5 block text-xs font-medium text-slate-700">Email <span className="text-rose-600">*</span></label>
              <input required id="professional-email" name="email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={updateField} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "professional-email-error" : undefined} className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500" />
              <FieldError id="professional-email-error" message={errors.email} />
            </div>
            <div>
              <label htmlFor="professional-profession" className="mb-1.5 block text-xs font-medium text-slate-700">Profession <span className="text-rose-600">*</span></label>
              <select required id="professional-profession" name="profession" value={form.profession} onChange={updateField} aria-invalid={Boolean(errors.profession)} aria-describedby={errors.profession ? "professional-profession-error" : undefined} className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500">
                <option value="">Choose profession</option><option value="CPA">CPA</option><option value="Attorney">Attorney</option>
              </select>
              <FieldError id="professional-profession-error" message={errors.profession} />
            </div>
            <div>
              <label htmlFor="professional-state" className="mb-1.5 block text-xs font-medium text-slate-700">State <span className="text-rose-600">*</span></label>
              <select required id="professional-state" name="state" value={form.state} onChange={updateField} aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? "professional-state-error" : undefined} className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500">
                <option value="">Choose state</option>{US_STATES.map(([code, state]) => <option key={code} value={code}>{state} ({code})</option>)}
              </select>
              <FieldError id="professional-state-error" message={errors.state} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="professional-expiry" className="mb-1.5 block text-xs font-medium text-slate-700">License expiry date <span className="text-rose-600">*</span></label>
              <input required id="professional-expiry" name="licenseExpiry" type="date" value={form.licenseExpiry} onChange={updateField} aria-invalid={Boolean(errors.licenseExpiry)} aria-describedby={errors.licenseExpiry ? "professional-expiry-error" : undefined} className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500" />
              <FieldError id="professional-expiry-error" message={errors.licenseExpiry} />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button variant="secondary" disabled={isSubmitting} onClick={closeDialog}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Add professional"}</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
