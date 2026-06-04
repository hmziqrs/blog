import { useCallback, useEffect, useRef, useState } from "react";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

type ExecuteOptions = {
  refresh?: boolean;
};

export function useApi<T>(fetcher: () => Promise<T>, deps: readonly unknown[] = []) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    refreshing: false,
    error: null,
  });

  const mountedRef = useRef(true);

  const execute = useCallback(
    async (options?: ExecuteOptions) => {
      setState((prev) => {
        const isRefresh = options?.refresh === true && prev.data !== null;
        return {
          ...prev,
          loading: !isRefresh,
          refreshing: isRefresh,
          error: null,
        };
      });

      try {
        const data = await fetcher();
        if (mountedRef.current) {
          setState({ data, loading: false, refreshing: false, error: null });
        }
      } catch (err) {
        if (mountedRef.current) {
          setState((prev) => ({
            data: prev.data,
            loading: false,
            refreshing: false,
            error: err instanceof Error ? err.message : "Unknown error",
          }));
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  const refetch = useCallback(() => execute({ refresh: true }), [execute]);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => {
      mountedRef.current = false;
    };
  }, [execute]);

  return { ...state, refetch };
}
