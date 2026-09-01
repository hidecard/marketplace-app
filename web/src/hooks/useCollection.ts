import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../services/firebase';

interface UseCollectionOptions {
  constraints?: QueryConstraint[];
  limit?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  whereField?: string;
  whereOperator?: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any';
  whereValue?: any;
}

export const useCollection = <T extends DocumentData>(
  collectionName: string,
  options: UseCollectionOptions = {}
) => {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const constraints: QueryConstraint[] = [];

      if (options.whereField && options.whereOperator && options.whereValue !== undefined) {
        constraints.push(where(options.whereField, options.whereOperator, options.whereValue));
      }

      if (options.orderByField) {
        constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
      }

      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      if (options.constraints) {
        constraints.push(...options.constraints);
      }

      const q = query(collection(db, collectionName), ...constraints);
      const snapshot = await getDocs(q);

      const results = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data(),
      })) as (T & { id: string })[];

      setData(results);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [collectionName, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
