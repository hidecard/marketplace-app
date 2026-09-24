import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  updateProfile,
  type ConfirmationResult,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { laravelApi } from './laravelApi';

let recaptchaVerifier: RecaptchaVerifier | null = null;
const recaptchaContainerId = 'phone-otp-recaptcha';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

function getRecaptchaVerifier(): RecaptchaVerifier {
  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }
  if (typeof window === 'undefined') {
    throw new Error('RecaptchaVerifier is only available in the browser');
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved; signInWithPhoneNumber will proceed.
    },
    'expired-callback': () => {
      recaptchaVerifier = null;
    },
  });
  window.recaptchaVerifier = recaptchaVerifier;
  return recaptchaVerifier;
}

export const AuthService = {
  recaptchaContainerId,

  async signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
    if (laravelApi.isEnabled) {
      const response = await laravelApi.login(email, password);
      if (response.error) {
        throw new Error(response.error);
      }
      // Convert Laravel user to Firebase-like structure
      const firebaseUser = {
        uid: String(response.user?.id),
        email: response.user?.email,
        displayName: response.user?.name,
        phoneNumber: response.user?.phone_number,
        role: response.user?.role,
        phoneVerified: response.user?.phone_verified,
        status: response.user?.status,
      } as any;
      return firebaseUser;
    }

    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  },

  async signUpWithEmail(
    email: string,
    password: string,
    displayName: string,
    phone: string,
  ): Promise<FirebaseUser> {
    if (laravelApi.isEnabled) {
      const response = await laravelApi.register({
        name: displayName,
        email,
        password,
        password_confirmation: password,
        phone_number: phone,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      // Convert Laravel user to Firebase-like structure
      const firebaseUser = {
        uid: String(response.user?.id),
        email: response.user?.email,
        displayName: response.user?.name,
        phoneNumber: response.user?.phone_number,
        role: response.user?.role,
        phoneVerified: response.user?.phone_verified,
        status: response.user?.status,
      } as any;
      return firebaseUser;
    }

    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }
    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      email,
      displayName,
      phoneNumber: phone,
      role: 'user',
      phoneVerified: false,
      shopVerified: false,
      hasShop: false,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return credential.user;
  },

  async sendPasswordReset(email: string): Promise<void> {
    if (laravelApi.isEnabled) {
      // TODO: Implement Laravel password reset when backend route is available
      // Backend currently lacks /auth/forgot-password and /auth/reset-password endpoints
      throw new Error('Password reset not yet implemented for Laravel API');
    }
    await sendPasswordResetEmail(auth, email);
  },

  async startPhoneSignIn(phoneNumber: string): Promise<ConfirmationResult> {
    const verifier = getRecaptchaVerifier();
    const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    window.confirmationResult = confirmation;
    return confirmation;
  },

  async confirmPhoneCode(code: string): Promise<FirebaseUser> {
    const confirmation = window.confirmationResult;
    if (!confirmation) {
      throw new Error('No pending phone verification. Please request a new code.');
    }
    const credential = await confirmation.confirm(code);
    window.confirmationResult = undefined;
    return credential.user;
  },

  async logout(): Promise<void> {
    if (laravelApi.isEnabled) {
      await laravelApi.logout();
      return;
    }
    await auth.signOut();
  },

  async getCurrentUser(): Promise<any> {
    if (laravelApi.isEnabled) {
      const response = await laravelApi.getCurrentUser();
      if (response.error) {
        throw new Error(response.error);
      }
      // Convert Laravel user to Firebase-like structure
      return {
        uid: String(response.user?.id),
        email: response.user?.email,
        displayName: response.user?.name,
        phoneNumber: response.user?.phone_number,
        role: response.user?.role,
        phoneVerified: response.user?.phone_verified,
        status: response.user?.status,
      };
    }
    return auth.currentUser;
  },

  async updateProfile(data: { name?: string; phone_number?: string }): Promise<any> {
    if (laravelApi.isEnabled) {
      const response = await laravelApi.updateProfile(data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.user;
    }
    // Firebase profile update would need to be implemented
    throw new Error('Profile update not yet implemented for Firebase');
  },

  async changePassword(data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<any> {
    if (laravelApi.isEnabled) {
      const response = await laravelApi.changePassword(data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.user;
    }
    // Firebase password change would need to be implemented
    throw new Error('Password change not yet implemented for Firebase');
  },

  resetRecaptcha(): void {
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
      } catch {
        // ignore — verifier may already be disposed
      }
      recaptchaVerifier = null;
      window.recaptchaVerifier = undefined;
    }
  },

  get isEnabled(): boolean {
    return laravelApi.isEnabled;
  },

  get isAuthenticated(): boolean {
    if (laravelApi.isEnabled) {
      return laravelApi.isAuthenticated;
    }
    return !!auth.currentUser;
  },

  get userAbility(): string | null {
    if (laravelApi.isEnabled) {
      return laravelApi.userAbility;
    }
    return null;
  },
};

export default AuthService;
