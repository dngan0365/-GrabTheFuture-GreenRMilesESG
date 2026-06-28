"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // STEP 2: POST to a password-reset endpoint.
    setTimeout(() => {
      setSent(true);
      setLoading(false);
    }, 600);
  }

  if (sent) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-green-100 text-brand-dark">
          <MailCheck className="size-7" />
        </span>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Check your inbox</h2>
        <p className="mt-1 text-sm text-slate-500">
          If an account exists, we’ve sent a reset link.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">Reset password</h2>
      <p className="mt-1 text-sm text-slate-500">
        Enter your email and we’ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" required placeholder="you@company.com" />
        </Field>
        <Button type="submit" fullWidth loading={loading}>
          Send reset link
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark"
      >
        <ArrowLeft className="size-4" />
        Back to sign in
      </Link>
    </div>
  );
}
