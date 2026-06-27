"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // STEP 2: POST to a real registration endpoint. For the demo, registration
    // simply routes to login (the backend seeds demo accounts).
    setTimeout(() => router.replace("/login"), 600);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
      <p className="mt-1 text-sm text-slate-500">
        Join your company’s green mobility program.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field label="Full name" htmlFor="name">
          <Input id="name" required placeholder="Nguyen Minh Tam" />
        </Field>
        <Field label="Work email" htmlFor="email">
          <Input id="email" type="email" required placeholder="you@company.com" />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" required placeholder="••••••••" />
        </Field>
        <Button type="submit" fullWidth loading={loading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">
          Sign in
        </Link>
      </p>
    </div>
  );
}
