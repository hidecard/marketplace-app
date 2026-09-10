import { getFunctions, httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import app from './firebase';

const functions = getFunctions(app, 'us-central1');

type Primitive = string | number | boolean | null | undefined;
type ParamValue = Primitive | Primitive[] | Record<string, Primitive> | ParamValue[];

export interface CallResult<T> {
  data: T;
  ok: true;
}

export const FunctionsService = {
  async call<T = unknown>(name: string, params: Record<string, ParamValue> = {}): Promise<CallResult<T>> {
    const fn = httpsCallable<Record<string, ParamValue>, T>(functions, name);
    const result: HttpsCallableResult<T> = await fn(params);
    return { data: result.data, ok: true };
  },

  async callOrThrow<T = unknown>(
    name: string,
    params: Record<string, ParamValue> = {},
  ): Promise<T> {
    const { data } = await this.call<T>(name, params);
    return data;
  },
};

export default FunctionsService;
