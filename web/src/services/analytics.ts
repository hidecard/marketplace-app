import { getAnalytics, logEvent } from 'firebase/analytics';
import { app } from './firebase';

let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;

export const initAnalytics = async () => {
  try {
    const { isSupported } = await import('firebase/analytics');
    const supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  } catch (error) {
    console.error('Analytics init error:', error);
  }
};

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  try {
    if (analyticsInstance) {
      logEvent(analyticsInstance, eventName, params);
    }
  } catch (error) {
    console.error('Analytics track error:', error);
  }
};
