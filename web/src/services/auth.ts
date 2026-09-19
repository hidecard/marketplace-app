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
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  },

  async signUpWithEmail(
    email: string,
    password: string,
    displayName: string,
    phone: string,
  ): Promise<FirebaseUser> {
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
};

export default AuthService;
