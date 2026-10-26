"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./auth-provider";

export default function AuthPage({ mode }) {
  const isSignup = mode === "register";
  const router = useRouter();
  const { authenticate } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setSubmitting(true);
    try {
      await authenticate(isSignup ? "register" : "login", form);
      router.replace("/");
    } catch (cause) {
      setError(cause.message || "We could not sign you in. Please try again.");
      if (cause.errors) setFieldErrors(cause.errors);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-panel sm:p-9" aria-labelledby="auth-title">
        <div className="mb-8 flex items-center gap-3">
          <div aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">C</div>
          <div><p className="text-base font-semibold tracking-tight text-ink">CPE Tracker</p><p className="text-xs text-slate-400">Professional workspace</p></div>
        </div>
        <h1 id="auth-title" className="text-2xl font-semibold tracking-tight text-ink">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-slate-500">{isSignup ? "Set up your account to access your CPE workspace." : "Sign in to continue to your CPE workspace."}</p>
        {error && <p role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {isSignup && <Field label="Full name" id="auth-name" error={fieldErrors.name}><input autoComplete="name" id="auth-name" name="name" required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></Field>}
          <Field label="Email address" id="auth-email" error={fieldErrors.email}><input autoComplete="email" id="auth-email" name="email" type="email" required maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={inputClass} /></Field>
          <Field label="Password" id="auth-password" error={fieldErrors.password}>
            <input autoComplete={isSignup ? "new-password" : "current-password"} id="auth-password" name="password" type="password" required minLength={isSignup ? 12 : 1} maxLength={72} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className={inputClass} />
            {isSignup && <p className="mt-1.5 text-xs text-slate-400">Use at least 12 characters.</p>}
          </Field>
          <button type="submit" disabled={submitting} className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">{isSignup ? "Already have an account? " : "New to CPE Tracker? "}<Link className="font-semibold text-brand-700 hover:text-brand-800" href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link></p>
      </section>
    </main>
  );
}

const inputClass = "block w-full rounded-lg border-slate-200 text-sm focus:border-brand-500 focus:ring-brand-500";

function Field({ label, id, error, children }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>{children}{error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}</div>;
}
