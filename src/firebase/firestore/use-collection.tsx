
'use client';

import { useState, useEffect } from 'react';
import { Query, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        setData(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as any)));
        setLoading(false);
      },
      async (err) => {
        // Safe check for query path
        const path = (query as any)._query?.path?.toString() || 'unknown';
        const permissionError = new FirestorePermissionError({
          path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query ? JSON.stringify((query as any)._query) : null]); // More stable dependency

  return { data, loading, error };
}
