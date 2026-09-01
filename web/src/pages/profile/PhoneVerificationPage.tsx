import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Phone, Shield, CheckCircle } from 'lucide-react';
import { signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { useAuthStore } from '../../stores/authStore';
import { updateUserData } from '../../types';
import { trackEvent } from '../../services/analytics';
import toast from 'react-hot-toast';

export const PhoneVerificationPage: React.FC = () => {
  const { user } = useAuthStore();
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
      }
    };
  }, [recaptchaVerifier]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 9) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
      await verifier.render();
      setRecaptchaVerifier(verifier);

      const formattedPhone = `+95${phone.replace(/^0+/, '')}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      toast.success('OTP sent to your phone');
      setStep('otp');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      if (!confirmationResult) {
        toast.error('Please request OTP first');
        return;
      }
      await confirmationResult.confirm(otp);
      if (user) {
        await updateUserData(user.uid, { phoneVerified: true });
      }
      trackEvent('phone_verified');
      toast.success('Phone verified successfully!');
      setStep('success');
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Phone Verified!</h2>
          <p className="text-gray-500 mb-6">
            Your phone number has been verified successfully. You now have access to all features.
          </p>
          <Link
            to="/"
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold inline-block"
          >
            Continue to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center px-4 h-14">
          <Link to="/profile" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="ml-2 text-lg font-semibold">Phone Verification</h1>
        </div>
      </header>

      <div className="p-4">
        <div className="bg-white rounded-xl p-6 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="text-primary-600" size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            {step === 'phone' ? 'Verify Your Phone' : 'Enter OTP'}
          </h2>
          <p className="text-gray-500 text-center">
            {step === 'phone'
              ? 'Enter your phone number to receive a verification code'
              : `Enter the 6-digit code sent to ${phone}`}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP} className="bg-white rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="flex gap-3">
                <div className="px-4 py-3 bg-gray-100 rounded-xl text-gray-600">+95</div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  placeholder="9xxxxxxxxx"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="bg-white rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-gray-500">Resend code in {countdown}s</p>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="text-sm text-primary-600 font-medium"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        )}

        <div id="recaptcha-container" />

        <div className="bg-primary-50 rounded-xl p-4 mt-6">
          <div className="flex items-start gap-3">
            <Shield className="text-primary-600 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm text-primary-800 font-medium">Why verify your phone?</p>
              <ul className="text-sm text-primary-700 mt-2 space-y-1">
                <li>Place orders and make purchases</li>
                <li>Chat with sellers</li>
                <li>Leave reviews</li>
                <li>Enhanced account security</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};