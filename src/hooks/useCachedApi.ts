import { useState, useEffect } from 'react';

export function useCachedApi<T>(
  key: string,
  fetcher: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  
  // If we have cached data, we don't block the UI with a full-screen loader
  const [loading, setLoading] = useState<boolean>(!data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    if (!data) {
      setLoading(true);
    }

    fetcher()
      .then((newData) => {
        if (!isMounted) return;

        setData(newData);
        setError(null);
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
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, error, setData, setLoading };
}
