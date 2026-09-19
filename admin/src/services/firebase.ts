import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const cleanEnv = (val: string | undefined, fallback: string): string => {
  if (!val) return fallback;
  const trimmed = val.trim();
  if (
    trimmed === '' ||
    trimmed.startsWith('your-') ||
    trimmed.includes('placeholder') ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  ) {
    return fallback;
  }
  return trimmed;
};

const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY, 'AIzaSyC1-s5R4gzElq4D5NatWkcklF198fTEvRo'),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'padaytharpin-app.firebaseapp.com'),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'padaytharpin-app'),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 'padaytharpin-app.firebasestorage.app'),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, '304535507982'),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID, '1:304535507982:web:b960bdb0f2bc1652fb985f'),
};

const app = initializeApp(firebaseConfig);

const appCheckKey = import.meta.env.VITE_FIREBASE_APP_CHECK_KEY;
if (appCheckKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('Firebase AppCheck initialization error:', err);
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export default app;
