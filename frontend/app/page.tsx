"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CenteredSpinner } from "@/components/ui";
import { useAuth } from "@/lib/auth/auth-context";

export default function Home() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
    else if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  return (
    <div className="grid min-h-screen place-items-center">
      <CenteredSpinner label="Loading GreenMiles…" />
    </div>
  );
}
