import { useState, useEffect } from 'react';

export function useCachedApi<T>(
  key: string,
  fetcher: () => Promise<T>,
  dependencies: any[] = []
) {
  // Initialize state from localStorage if available
  const [data, setData] = useState<T | null>(() => {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  
  // If we have cached data, loading is technically false for the initial render, 
  // but we still want to indicate background fetching, so we'll add an `isFetching` state
  const [loading, setLoading] = useState<boolean>(!data);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    if (!data) {
      setLoading(true);
    }
    setIsFetching(true);

    fetcher()
      .then((newData) => {
        if (!isMounted) return;

        setData(newData);
        setError(null);
        // Save to localStorage for next time
        try {
          localStorage.setItem(`cache_${key}`, JSON.stringify(newData));
        } catch (e) {
          // Ignore quota errors
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        // If we already have cached data, we ignore the error so we don't break the UI
        if (!data) {
          setError(err.message || 'Failed to load data');
        } else {
          console.warn(`Error fetching ${key}, using cache.`, err);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
          setIsFetching(false);
        }
      });

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading: loading || isFetching, error, setData, setLoading };
}
