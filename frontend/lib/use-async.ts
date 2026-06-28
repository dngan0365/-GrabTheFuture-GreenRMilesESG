"use client";

import { useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Runs an async function on mount (and whenever `deps` change) and tracks
 * loading/error/data. Guards against setting state after unmount.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList = [],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    // Resetting to a loading state when deps change is intended here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch(
        (err) =>
          active &&
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Something went wrong.",
          }),
      );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
