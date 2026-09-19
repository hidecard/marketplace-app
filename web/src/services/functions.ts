import { getFunctions, httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import app from './firebase';

const functions = getFunctions(app, 'us-central1');

type Primitive = string | number | boolean | null | undefined;
type ParamValue = Primitive | Primitive[] | Record<string, Primitive> | ParamValue[];

export type CallResult<T> =
  | { data: T; ok: true; error?: undefined }
  | { data: null; ok: false; error: any };

export const FunctionsService = {
  async call<T = unknown>(name: string, params: Record<string, ParamValue> = {}): Promise<CallResult<T>> {
    try {
      const fn = httpsCallable<Record<string, ParamValue>, T>(functions, name);
      const result: HttpsCallableResult<T> = await fn(params);
      return { data: result.data, ok: true };
    } catch (error) {
      console.warn(`FunctionsService.call("${name}") non-fatal error:`, error);
      return { data: null, ok: false, error };
    }
  },

  async callOrThrow<T = unknown>(
    name: string,
    params: Record<string, ParamValue> = {},
  ): Promise<T> {
    const fn = httpsCallable<Record<string, ParamValue>, T>(functions, name);
    const result: HttpsCallableResult<T> = await fn(params);
    return result.data;
  },
};

export default FunctionsService;
