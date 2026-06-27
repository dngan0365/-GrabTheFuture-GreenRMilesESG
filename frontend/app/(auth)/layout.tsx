import { Leaf, ShieldCheck, TrendingDown, Trophy } from "lucide-react";

const HIGHLIGHTS = [
  { icon: TrendingDown, text: "Measure commuting CO₂ at the source" },
  { icon: ShieldCheck, text: "Verify every EV trip for Scope 3 reporting" },
  { icon: Trophy, text: "Reward employees who commute green" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 text-white brand-gradient lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-white/15">
            <Leaf className="size-6" />
          </span>
          <span className="text-xl font-bold">GreenMiles</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-bold leading-tight">
            Turn every electric trip into measurable carbon reduction.
          </h1>
          <p className="mt-4 text-white/80">
            The green mobility incentive platform that helps companies reduce
            Scope 3 emissions — before offsetting them.
          </p>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-white/15">
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-medium text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-white/60">
          “You can’t reduce what you can’t measure.”
        </p>
      </div>

      {/* Form area */}
      <div className="flex items-center justify-center bg-surface-soft p-6 sm:p-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
