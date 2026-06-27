import Link from "next/link";
import { Leaf } from "lucide-react";

export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl text-white brand-gradient">
        <Leaf className="size-5" />
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">
        Green<span className="text-brand">Miles</span>
      </span>
    </Link>
  );
}
