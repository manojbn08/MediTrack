import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import Button from '../../components/Button';
import { Pill, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(email, password);
      const roles = data.roles || [];
      if (roles.includes('ROLE_ADMIN')) {
        navigate('/admin');
      } else if (roles.includes('ROLE_PHARMACIST')) {
        navigate('/pharmacist/queue');
      } else if (roles.includes('ROLE_DELIVERY')) {
        navigate('/delivery');
      } else {
        navigate('/products');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your email and password.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-panel p-8 shadow-sm">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-brand text-white rounded-[6px] mx-auto flex items-center justify-center mb-3 shadow-xs">
            <Pill className="w-5 h-5 stroke-[1.5]" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
            Sign In to MediTrack
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Enter your registered email and password to access your workspace
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-control flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Unified Login Form */}
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
              className="w-full px-3 h-10 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-neutral-700">
                Password
              </label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 h-10 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
            />
          </div>

          <Button type="submit" loading={loading} className="w-full h-10 mt-2 text-xs font-semibold">
            Sign In
          </Button>
        </form>

        {/* Clean Footer Link */}
        <div className="mt-6 pt-5 border-t border-neutral-100 text-center space-y-2">
          <p className="text-xs text-neutral-600">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-brand font-semibold hover:underline inline-flex items-center gap-1">
              Register here <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
