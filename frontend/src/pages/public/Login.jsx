import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import Button from '../../components/Button';
import { Pill, AlertCircle, User, ClipboardCheck, Truck, ShieldAlert } from 'lucide-react';

export default function Login() {
  const { login, quickLogin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const redirectPath = location.state?.from?.pathname || '/products';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(email, password);
      if (data.roles.includes('ROLE_PHARMACIST')) navigate('/pharmacist/queue');
      else if (data.roles.includes('ROLE_DELIVERY')) navigate('/delivery');
      else if (data.roles.includes('ROLE_ADMIN')) navigate('/admin');
      else navigate(redirectPath);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    }
  };

  const handleRoleQuickLogin = async (roleKey) => {
    setError('');
    try {
      const data = await quickLogin(roleKey);
      if (roleKey === 'pharmacist') navigate('/pharmacist/queue');
      else if (roleKey === 'delivery') navigate('/delivery');
      else if (roleKey === 'admin') navigate('/admin');
      else navigate('/products');
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-panel p-8 shadow-sm">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-brand text-white rounded-[6px] mx-auto flex items-center justify-center mb-3">
            <Pill className="w-5 h-5 stroke-[1.5]" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Sign in to MediTrack</h1>
          <p className="text-xs text-neutral-500 mt-1">Drug Store Management & Secure Delivery Portal</p>
        </div>

        {/* Quick Persona Selector */}
        <div className="mb-6 bg-neutral-50 border border-neutral-200 rounded-control p-3">
          <span className="block text-[11px] font-semibold text-neutral-600 mb-2 uppercase tracking-wide">
            One-Click Demo Persona Login:
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleRoleQuickLogin('customer')}
              className="p-2 bg-white border border-neutral-200 hover:border-brand rounded-control text-left flex items-center gap-1.5 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-brand" />
              <div>
                <strong className="block text-neutral-900 leading-tight">Customer</strong>
                <span className="text-[10px] text-neutral-500">Rahul S.</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleRoleQuickLogin('pharmacist')}
              className="p-2 bg-white border border-neutral-200 hover:border-brand rounded-control text-left flex items-center gap-1.5 transition-colors"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-brand" />
              <div>
                <strong className="block text-neutral-900 leading-tight">Pharmacist</strong>
                <span className="text-[10px] text-neutral-500">Dr. Priya</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleRoleQuickLogin('delivery')}
              className="p-2 bg-white border border-neutral-200 hover:border-brand rounded-control text-left flex items-center gap-1.5 transition-colors"
            >
              <Truck className="w-3.5 h-3.5 text-brand" />
              <div>
                <strong className="block text-neutral-900 leading-tight">Delivery</strong>
                <span className="text-[10px] text-neutral-500">Suresh K.</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleRoleQuickLogin('admin')}
              className="p-2 bg-white border border-neutral-200 hover:border-brand rounded-control text-left flex items-center gap-1.5 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-brand" />
              <div>
                <strong className="block text-neutral-900 leading-tight">Admin</strong>
                <span className="text-[10px] text-neutral-500">Gov. Portal</span>
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-semantic-danger-tint border border-red-200 text-semantic-danger text-xs rounded-control flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@meditrack.com"
              className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
            />
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2">
            Sign In
          </Button>
        </form>

        <p className="text-center text-xs text-neutral-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand font-semibold hover:underline">
            Register here
          </Link>
        </p>

      </div>
    </div>
  );
}
