"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PageHeading from "@/components/ui/page-heading";
import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { apiFetch } from "@/components/auth/api-fetch";
import { useAuth } from "@/components/auth/auth-provider";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api").replace(/\/+$/, "");
const EMPTY_FORM = { title: "", provider: "", profession: "", credits: "" };
const PROFESSION_OPTIONS = ["CPA", "Attorney", "Both"];

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

function formatCredits(credits) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(credits);
}

function ProfessionBadge({ profession }) {
  const style = profession === "CPA"
    ? "bg-blue-50 text-blue-700"
    : profession === "Attorney"
      ? "bg-violet-50 text-violet-700"
      : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-medium ${style}`}>{profession}</span>;
}

export default function CoursesPage() {
  const { csrfToken } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [professionFilter, setProfessionFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const addButtonRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;

    async function loadCourses() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await apiFetch(`${API_BASE_URL}/courses`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Courses could not be loaded.");
        if (isCurrentRequest) setCourses(Array.isArray(payload.data) ? payload.data : []);
      } catch (error) {
        if (isCurrentRequest && error.name !== "AbortError") {
          setCourses([]);
          setLoadError(error instanceof TypeError
            ? "Could not reach the CPE Tracker API. Check that the backend is running."
            : error.message || "Courses could not be loaded. Please try again.");
        }
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    }

    loadCourses();
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

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSearch = !query
        || course.title.toLowerCase().includes(query)
        || course.provider.toLowerCase().includes(query);
      const matchesProfession = professionFilter === "all"
        || course.profession === professionFilter
        || course.profession === "Both";
      return matchesSearch && matchesProfession;
    });
  }, [courses, professionFilter, search]);

  const summary = useMemo(() => ({
    total: courses.length,
    cpaCourses: courses.filter((course) => course.profession === "CPA" || course.profession === "Both").length,
    attorneyCourses: courses.filter((course) => course.profession === "Attorney" || course.profession === "Both").length,
    totalCredits: courses.reduce((sum, course) => sum + course.credits, 0),
  }), [courses]);

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

  async function submitCourse(event) {
    event.preventDefault();
    setSuccessMessage("");

    const credits = Number(form.credits);
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = "Enter a course name.";
    else if (form.title.trim().length > 180) nextErrors.title = "Course name must be 180 characters or fewer.";
    if (!form.provider.trim()) nextErrors.provider = "Enter a provider.";
    else if (form.provider.trim().length > 120) nextErrors.provider = "Provider must be 120 characters or fewer.";
    if (!PROFESSION_OPTIONS.includes(form.profession)) nextErrors.profession = "Choose CPA, Attorney, or Both.";
    if (!form.credits || !Number.isFinite(credits) || credits <= 0 || credits > 200) {
      nextErrors.credits = "Enter a credit amount greater than 0 and no more than 200.";
    } else if (Math.round(credits * 100) !== credits * 100) {
      nextErrors.credits = "Credits may have no more than two decimal places.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidField = Object.keys(nextErrors)[0];
      document.getElementById(`course-${firstInvalidField}`)?.focus();
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const response = await apiFetch(`${API_BASE_URL}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          provider: form.provider.trim(),
          profession: form.profession,
          credits,
        }),
      }, csrfToken);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors(payload.errors || {});
        setFormError(payload.message || "Course could not be saved. Please try again.");
        const firstInvalidField = Object.keys(payload.errors || {})[0];
        if (firstInvalidField) document.getElementById(`course-${firstInvalidField}`)?.focus();
        return;
      }

      setCourses((current) => [payload.data, ...current]);
      setForm(EMPTY_FORM);
      closeDialog();
      setSuccessMessage(payload.message || "Course added successfully.");
    } catch (error) {
      setFormError(error instanceof TypeError
        ? "Could not reach the CPE Tracker API. Check that the backend is running."
        : error.message || "Course could not be saved. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setProfessionFilter("all");
  }

  const summaryValue = (value) => (loading || loadError ? "—" : value);

  return (
    <>
      <PageHeading
        eyebrow="Learning library"
        title="Courses"
        description="Keep track of continuing education courses and the credits they offer."
        action={<Button ref={addButtonRef} icon="plus" onClick={openDialog}>Add course</Button>}
      />

      <section aria-label="Course summary" className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <SummaryCard label="Courses" value={summaryValue(summary.total)} detail="In this workspace" tone="text-slate-500" />
        <SummaryCard label="CPA courses" value={summaryValue(summary.cpaCourses)} detail="Including courses for both" tone="text-brand-700" />
        <SummaryCard label="Attorney courses" value={summaryValue(summary.attorneyCourses)} detail="Including courses for both" tone="text-violet-700" />
        <SummaryCard label="Total credits" value={summaryValue(formatCredits(summary.totalCredits))} detail="Across listed courses" tone="text-emerald-700" />
      </section>

      {successMessage && <p role="status" className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p>}

      <section aria-labelledby="course-list-title" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 px-4 py-5 sm:px-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="course-list-title" className="text-sm font-semibold text-ink">Course library</h2>
              <p className="mt-1 text-xs text-slate-500">Search and filter courses in your workspace.</p>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600" aria-live="polite">
              {loading ? "Loading…" : loadError ? "Unavailable" : `${filteredCourses.length} ${filteredCourses.length === 1 ? "course" : "courses"}`}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_220px]">
            <div>
              <label htmlFor="course-search" className="mb-1.5 block text-xs font-medium text-slate-600">Search courses</label>
              <input
                id="course-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search course or provider"
                className="block w-full rounded-lg border-slate-200 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
            <div>
              <label htmlFor="course-profession-filter" className="mb-1.5 block text-xs font-medium text-slate-600">Profession</label>
              <select id="course-profession-filter" value={professionFilter} onChange={(event) => setProfessionFilter(event.target.value)} className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500">
                <option value="all">All professions</option>
                <option value="CPA">CPA</option>
                <option value="Attorney">Attorney</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div role="status" className="flex items-center justify-center gap-3 px-5 py-14 text-sm text-slate-500">
            <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
            Loading courses…
          </div>
        ) : loadError ? (
          <div role="alert" className="px-5 py-12 text-center">
            <h3 className="text-sm font-semibold text-ink">Courses are unavailable</h3>
            <p className="mt-2 text-sm text-slate-500">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => setRefreshIndex((current) => current + 1)}>Try again</Button>
          </div>
        ) : filteredCourses.length === 0 ? (
          courses.length === 0 ? (
            <div className="p-4 text-center sm:p-6">
              <EmptyState icon="courses" title="No courses added yet" description="Courses added to this workspace will appear here with their provider and credit details." />
              <Button icon="plus" className="mt-4" onClick={openDialog}>Add course</Button>
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <h3 className="text-sm font-semibold text-ink">No matching courses</h3>
              <p className="mt-2 text-sm text-slate-500">Try a different course name, provider, or profession.</p>
              <Button variant="secondary" className="mt-4" onClick={clearFilters}>Clear filters</Button>
            </div>
          )
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {filteredCourses.map((course) => (
                <article key={course.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="text-sm font-semibold text-ink">{course.title}</h3><p className="mt-1 text-xs text-slate-500">{course.provider}</p></div>
                    <ProfessionBadge profession={course.profession} />
                  </div>
                  <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Credits <span className="ml-1 font-semibold text-slate-700">{formatCredits(course.credits)}</span></p>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block" role="region" aria-label="Course library table; scroll horizontally to see all columns" tabIndex={0}>
              <table className="w-full min-w-[680px] text-left">
                <caption className="sr-only">Courses, their providers, intended profession, and continuing education credits.</caption>
                <thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400">
                  <th scope="col" className="px-5 py-3 font-semibold">Course</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Provider</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Profession</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Credits</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-slate-50/70">
                      <th scope="row" className="px-5 py-4 text-left font-medium text-slate-700">{course.title}</th>
                      <td className="px-5 py-4 text-slate-500">{course.provider}</td>
                      <td className="px-5 py-4"><ProfessionBadge profession={course.profession} /></td>
                      <td className="px-5 py-4 font-medium text-slate-700">{formatCredits(course.credits)}</td>
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
        aria-labelledby="add-course-title"
        aria-describedby="add-course-description"
        className="professional-dialog m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-ink shadow-2xl"
        onCancel={(event) => { event.preventDefault(); closeDialog(); }}
        onClose={() => { setDialogOpen(false); addButtonRef.current?.focus(); }}
        onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}
      >
        <form noValidate onSubmit={submitCourse}>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 id="add-course-title" className="text-lg font-semibold tracking-tight">Add course</h2>
              <p id="add-course-description" className="mt-1 text-sm text-slate-500">Add a continuing education course to your library.</p>
            </div>
            <button type="button" aria-label="Close add course dialog" disabled={isSubmitting} onClick={closeDialog} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">×</button>
          </div>

          {formError && <p role="alert" className="mx-5 mt-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 sm:mx-6">{formError}</p>}

          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
            <div className="sm:col-span-2">
              <label htmlFor="course-title" className="mb-1.5 block text-xs font-medium text-slate-700">Course name <span className="text-rose-600">*</span></label>
              <input autoFocus required id="course-title" name="title" value={form.title} onChange={updateField} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "course-title-error" : undefined} className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500" />
              <FieldError id="course-title-error" message={errors.title} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="course-provider" className="mb-1.5 block text-xs font-medium text-slate-700">Provider <span className="text-rose-600">*</span></label>
              <input required id="course-provider" name="provider" value={form.provider} onChange={updateField} aria-invalid={Boolean(errors.provider)} aria-describedby={errors.provider ? "course-provider-error" : undefined} className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500" />
              <FieldError id="course-provider-error" message={errors.provider} />
            </div>
            <div>
              <label htmlFor="course-profession" className="mb-1.5 block text-xs font-medium text-slate-700">Profession <span className="text-rose-600">*</span></label>
              <select required id="course-profession" name="profession" value={form.profession} onChange={updateField} aria-invalid={Boolean(errors.profession)} aria-describedby={errors.profession ? "course-profession-error" : undefined} className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500">
                <option value="">Choose profession</option><option value="CPA">CPA</option><option value="Attorney">Attorney</option><option value="Both">Both</option>
              </select>
              <FieldError id="course-profession-error" message={errors.profession} />
            </div>
            <div>
              <label htmlFor="course-credits" className="mb-1.5 block text-xs font-medium text-slate-700">CPE credits <span className="text-rose-600">*</span></label>
              <input required id="course-credits" name="credits" type="number" min="0.01" max="200" step="0.25" inputMode="decimal" value={form.credits} onChange={updateField} aria-invalid={Boolean(errors.credits)} aria-describedby={errors.credits ? "course-credits-error" : undefined} className="block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500" />
              <FieldError id="course-credits-error" message={errors.credits} />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button variant="secondary" disabled={isSubmitting} onClick={closeDialog}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Add course"}</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
