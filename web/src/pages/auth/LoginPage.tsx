import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { trackEvent } from '../../services/analytics';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Phone, Store, ShoppingBag } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isSeller, setIsSeller] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    phone: '',
    shopName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        trackEvent('login', { method: 'email' });
        toast.success('Welcome back!');
        navigate('/');
      } else {
        // Create user account
        const credential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

        // Create user document in Firestore
        const userData = {
          uid: credential.user.uid,
          email: formData.email,
          displayName: formData.displayName,
          phoneNumber: formData.phone,
          role: 'user',
          phoneVerified: false,
          shopVerified: false,
          hasShop: false,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'users', credential.user.uid), userData);
        trackEvent('sign_up', { method: 'email' });

        // If user wants to create a shop
        if (isSeller && formData.shopName) {
          const slug = formData.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          await setDoc(doc(db, 'shops', credential.user.uid + '_' + Date.now()), {
            ownerId: credential.user.uid,
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

          // Update user to mark they have a shop
          await setDoc(doc(db, 'users', credential.user.uid), { ...userData, hasShop: true }, { merge: true });

          toast.success('Account and shop created!');
          navigate('/business');
        } else {
          toast.success('Account created successfully!');
          navigate('/');
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email already in use');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address');
      } else {
        toast.error(error.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isLogin ? 'Sign in to continue' : 'Join our marketplace'}
            </p>
          </div>

          {/* Role Selector for Registration */}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shop Name
                    </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

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
        </div>
      </div>
    </div>
  );
};
