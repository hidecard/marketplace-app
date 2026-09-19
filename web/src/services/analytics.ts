import { getAnalytics, logEvent } from 'firebase/analytics';
import app from './firebase';

let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;

// Global guard: catch and silence any Firebase Installations unhandled rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const errorMsg = event.reason?.message || String(event.reason || '');
    const errorCode = event.reason?.code || '';
    if (
      errorMsg.includes('installations/request-failed') ||
      errorMsg.includes('Installations: Create Installation request failed') ||
      errorMsg.includes('API key not valid') ||
      errorCode === 'installations/request-failed'
    ) {
      // Prevent the error from surfacing as an unhandled exception
      event.preventDefault();
      console.warn('Firebase Installations request skipped (non-critical):', errorMsg);
    }
  });
}

export const initAnalytics = async () => {
  try {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const isPlaceholder =
      !apiKey ||
      apiKey.startsWith('your-') ||
      apiKey.includes('placeholder') ||
      apiKey === 'AIzaSyC1-s5R4gzElq4D5NatWkcklF198fTEvRo';

    // Skip remote Google Analytics in dev or when placeholder API keys are in use
    if (import.meta.env.DEV || isPlaceholder) {
      return;
    }

    const { isSupported } = await import('firebase/analytics');
    const supported = await isSupported().catch(() => false);
    if (supported) {
      try {
        analyticsInstance = getAnalytics(app);
      } catch (err) {
        console.warn('Firebase Analytics initialization skipped:', err);
      }
    }
  } catch (error) {
    console.warn('Analytics init error (non-fatal):', error);
  }
};

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  try {
    if (analyticsInstance) {
      logEvent(analyticsInstance, eventName, params);
    }
  } catch (error) {
    console.warn('Analytics track error:', error);
  }
};
