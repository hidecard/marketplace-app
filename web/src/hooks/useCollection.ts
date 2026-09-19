import { useState, useEffect, useCallback, useRef } from 'react';
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

  const optionsRef = useRef(options);
  // Safely derive options key without calling JSON.stringify on complex/circular objects (such as Firestore FieldValue or DocumentReference)
  const optionsKey = `${options.limit ?? ''}-${options.orderByField ?? ''}-${options.orderDirection ?? ''}-${options.whereField ?? ''}-${options.whereOperator ?? ''}-${typeof options.whereValue === 'object' ? (options.whereValue?.id ?? typeof options.whereValue) : options.whereValue}-${options.constraints?.length ?? 0}`;

  useEffect(() => {
    optionsRef.current = options;
  }, [optionsKey]);

  const fetchData = useCallback(async () => {
    const currentOptions = optionsRef.current;
    try {
      setLoading(true);
      const constraints: QueryConstraint[] = [];

      if (currentOptions.whereField && currentOptions.whereOperator && currentOptions.whereValue !== undefined) {
        constraints.push(where(currentOptions.whereField, currentOptions.whereOperator, currentOptions.whereValue));
      }

      if (currentOptions.orderByField) {
        constraints.push(orderBy(currentOptions.orderByField, currentOptions.orderDirection || 'desc'));
      }

      if (currentOptions.limit) {
        constraints.push(limit(currentOptions.limit));
      }

      if (currentOptions.constraints) {
        constraints.push(...currentOptions.constraints);
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
  }, [collectionName, optionsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
