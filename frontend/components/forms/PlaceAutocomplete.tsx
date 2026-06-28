"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/services";
import type { PlacePrediction } from "@/types";

const FIELD =
  "h-11 w-full rounded-xl border border-[--color-border-subtle] bg-surface pl-9 pr-3.5 text-sm text-slate-800 " +
  "placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15";

/**
 * Address combobox backed by Goong Place AutoComplete (proxied via the backend).
 * Lets the user pick a suggestion like Google Maps / Grab, while still allowing
 * free text (so it degrades gracefully when the provider isn't configured).
 */
export function PlaceAutocomplete({
  label,
  value,
  onChange,
  placeholder,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [query, setQuery] = useState(value);
  const [items, setItems] = useState<PlacePrediction[]>([]);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const skipRef = useRef(false);

  useEffect(() => {
    if (!focused || skipRef.current) {
      skipRef.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems([]);
      return;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.searchPlaces(q);
        if (active) {
          setItems(res);
          setHighlight(-1);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, focused]);

  function pick(description: string) {
    skipRef.current = true;
    setQuery(description);
    onChange(description);
    setItems([]);
    setFocused(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault();
      pick(items[highlight].description);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  }

  const open = focused && items.length > 0;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          className={cn(FIELD)}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
          required
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-300" />
        )}

        {open && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[--color-border-subtle] bg-surface shadow-lg">
            {items.map((item, i) => (
              <li key={item.placeId || item.description}>
                <button
                  type="button"
                  // onMouseDown (not onClick) so it fires before input blur.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(item.description);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm",
                    i === highlight ? "bg-green-50 text-brand-dark" : "hover:bg-slate-50",
                  )}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  <span className="text-slate-700">{item.description}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
