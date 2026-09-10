import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AuthService } from '../../services/auth';
import { trackEvent } from '../../services/analytics';
import toast from 'react-hot-toast';
import { Mail, Lock, User as UserIcon, Phone, Store, ShoppingBag, KeyRound, ArrowLeft } from 'lucide-react';

type AuthMode = 'email' | 'phone';
type EmailStep = 'credentials' | 'forgot';

const phoneRegex = /^\+?[0-9]{7,15}$/;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('email');
  const [emailStep, setEmailStep] = useState<EmailStep>('credentials');
  const [isLogin, setIsLogin] = useState(true);
  const [isSeller, setIsSeller] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    phone: '',
    shopName: '',
    countryCode: '+95',
    smsCode: '',
  });

  useEffect(() => {
    return () => {
      AuthService.resetRecaptcha();
    };
  }, []);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setEmailStep('credentials');
    if (next === 'phone') {
      AuthService.resetRecaptcha();
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailStep === 'forgot') {
      return handleForgotPassword();
    }
    setLoading(true);

    try {
      if (isLogin) {
        await AuthService.signInWithEmail(formData.email, formData.password);
        trackEvent('login', { method: 'email' });
        toast.success('Welcome back!');
        navigate('/');
      } else {
        const user = await AuthService.signUpWithEmail(
          formData.email,
          formData.password,
          formData.displayName,
          formData.phone,
        );

        trackEvent('sign_up', { method: 'email' });

        if (isSeller && formData.shopName) {
          const slug = formData.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          await setDoc(doc(db, 'shops', user.uid + '_' + Date.now()), {
            ownerId: user.uid,
            name: formData.shopName,
            slug,
            description: '',
            logo: null,
            coverImage: null,
            phone: formData.phone,
            email: formData.email,
            address: '',
            city: '',
            region: '',
            socialLinks: {},
            verified: false,
            verificationStatus: 'not_requested',
            rating: 0,
            totalReviews: 0,
            totalProducts: 0,
            totalSales: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          await setDoc(
            doc(db, 'users', user.uid),
            { hasShop: true, updatedAt: serverTimestamp() },
            { merge: true },
          );

          toast.success('Account and shop created!');
          navigate('/business');
        } else {
          toast.success('Account created successfully!');
          navigate('/');
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(translateAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error('Enter your email to receive a reset link');
      return;
    }
    setLoading(true);
    try {
      await AuthService.sendPasswordReset(formData.email);
      toast.success('Password reset email sent');
      setEmailStep('credentials');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast.error(translateAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = `${formData.countryCode}${formData.phone.replace(/^\+/, '')}`;
    if (!phoneRegex.test(fullPhone)) {
      toast.error('Enter a valid phone number with country code');
      return;
    }
    setLoading(true);
    try {
      await AuthService.startPhoneSignIn(fullPhone);
      trackEvent('login', { method: 'phone' });
      toast.success('SMS code sent');
    } catch (error: any) {
      console.error('Phone OTP error:', error);
      AuthService.resetRecaptcha();
      toast.error(translateAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.smsCode.length < 4) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const user = await AuthService.confirmPhoneCode(formData.smsCode);
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          phoneVerified: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success('Signed in');
      navigate('/');
    } catch (error: any) {
      console.error('OTP verify error:', error);
      toast.error(translateAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'email'
                ? emailStep === 'forgot'
                  ? 'Reset Password'
                  : isLogin
                  ? 'Welcome Back'
                  : 'Create Account'
                : 'Sign in with Phone'}
            </h1>
            <p className="text-gray-600 mt-2">
              {mode === 'email'
                ? emailStep === 'forgot'
                  ? 'We will email you a reset link'
                  : isLogin
                  ? 'Sign in to continue'
                  : 'Join our marketplace'
                : 'We will text you a verification code'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl mb-6" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'email'}
              onClick={() => switchMode('email')}
              className={`py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                mode === 'email' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600'
              }`}
            >
              <Mail size={16} /> Email
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'phone'}
              onClick={() => switchMode('phone')}
              className={`py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                mode === 'phone' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600'
              }`}
            >
              <Phone size={16} /> Phone
            </button>
          </div>

          {mode === 'email' ? (
            <>
              {!isLogin && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setIsSeller(false)}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${
                      !isSeller ? 'border-primary-600 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <ShoppingBag className={!isSeller ? 'text-primary-600' : 'text-gray-400'} size={24} />
                    <span className={`text-sm font-medium ${!isSeller ? 'text-primary-600' : 'text-gray-600'}`}>
                      Buyer
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSeller(true)}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${
                      isSeller ? 'border-primary-600 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <Store className={isSeller ? 'text-primary-600' : 'text-gray-400'} size={24} />
                    <span className={`text-sm font-medium ${isSeller ? 'text-primary-600' : 'text-gray-600'}`}>
                      Seller
                    </span>
                  </button>
                </div>
              )}

              {emailStep === 'forgot' ? (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailStep('credentials')}
                    className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft size={16} /> Back to sign in
                  </button>
                </form>
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {!isLogin && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                          <input
                            type="text"
                            required
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Enter your name"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                          <input
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="09xxxxxxxxx"
                          />
                        </div>
                      </div>
                      {isSeller && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                          <div className="relative">
                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                              type="text"
                              required={isSeller}
                              value={formData.shopName}
                              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="Enter your shop name"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Min. 6 characters"
                      />
                    </div>
                  </div>

                  {isLogin && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setEmailStep('forgot')}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <KeyRound size={14} /> Forgot password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                  </button>
                </form>
              )}

              {emailStep === 'credentials' && (
                <div className="mt-6 text-center space-y-3">
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                  </button>
                  {isLogin && (
                    <div>
                      <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
                        Continue as Guest
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.countryCode}
                      onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                      className="w-24 py-3 px-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500"
                      aria-label="Country code"
                    >
                      <option value="+95">+95</option>
                      <option value="+66">+66</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+91">+91</option>
                    </select>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value, smsCode: '' })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="9xxxxxxxx"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </form>

              <form onSubmit={handleVerifyOtp} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    minLength={4}
                    maxLength={8}
                    value={formData.smsCode}
                    onChange={(e) => setFormData({ ...formData, smsCode: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent tracking-widest text-center text-lg"
                    placeholder="123456"
                    disabled={!window.confirmationResult}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the 6-digit code we sent to your phone.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading || !window.confirmationResult}
                  className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify and Sign In'}
                </button>
              </form>

              <div id={AuthService.recaptchaContainerId} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function translateAuthError(error: any): string {
  if (!error?.code) return error?.message || 'Authentication failed';
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Email already in use';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/invalid-phone-number':
      return 'Invalid phone number';
    case 'auth/missing-phone-number':
      return 'Enter a phone number';
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded. Try again later.';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA check failed. Refresh and try again.';
    case 'auth/invalid-verification-code':
      return 'Wrong code. Try again.';
    case 'auth/code-expired':
      return 'Code expired. Request a new one.';
    default:
      return error.message || 'Authentication failed';
  }
}

// End of component.
