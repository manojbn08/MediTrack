import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import Button from '../../components/Button';
import { Pill, AlertCircle, User, ClipboardCheck, Truck, ShieldAlert } from 'lucide-react';

export default function Login() {
  const { login, quickLogin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialRole = queryParams.get('role') || 'customer';
  const [activeRole, setActiveRole] = useState(initialRole);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const role = queryParams.get('role');
    if (role) setActiveRole(role);
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(email, password);
      if (data.roles.includes('ROLE_PHARMACIST')) navigate('/pharmacist/queue');
      else if (data.roles.includes('ROLE_DELIVERY')) navigate('/delivery');
      else if (data.roles.includes('ROLE_ADMIN')) navigate('/admin');
      else navigate('/products');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    }
  };

  const handleRoleQuickLogin = async (roleKey) => {
    setActiveRole(roleKey);
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

  const getRoleDisplayName = (r) => {
    switch (r) {
      case 'pharmacist': return 'Licensed Pharmacist';
      case 'delivery': return 'Delivery Partner';
      case 'admin': return 'System Administrator';
      default: return 'Customer';
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
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
            Sign In as {getRoleDisplayName(activeRole)}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">Drug Store Management & Secure Delivery Portal</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex border-b border-neutral-200 mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveRole('customer')}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${activeRole === 'customer' ? 'border-brand text-brand' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('pharmacist')}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${activeRole === 'pharmacist' ? 'border-brand text-brand' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
          >
            Pharmacist
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('delivery')}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${activeRole === 'delivery' ? 'border-brand text-brand' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
          >
            Delivery
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('admin')}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${activeRole === 'admin' ? 'border-brand text-brand' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
          >
            Admin
          </button>
        </div>

        {/* Quick Persona Selector */}
        <div className="mb-6 bg-neutral-50 border border-neutral-200 rounded-control p-3">
          <span className="block text-[11px] font-semibold text-neutral-600 mb-2 uppercase tracking-wide">
            1-Click Test Credentials ({getRoleDisplayName(activeRole)}):
          </span>
          <button
            type="button"
            onClick={() => handleRoleQuickLogin(activeRole)}
            className="w-full p-2.5 bg-white border border-neutral-300 hover:border-brand rounded-control text-left flex items-center justify-between transition-colors shadow-xs"
          >
            <div className="flex items-center gap-2">
              {activeRole === 'pharmacist' && <ClipboardCheck className="w-4 h-4 text-blue-600" />}
              {activeRole === 'delivery' && <Truck className="w-4 h-4 text-amber-600" />}
              {activeRole === 'admin' && <ShieldAlert className="w-4 h-4 text-purple-600" />}
              {activeRole === 'customer' && <User className="w-4 h-4 text-teal-600" />}
              <div>
                <strong className="block text-xs text-neutral-900 leading-tight">
                  Auto-Fill & Sign In as {getRoleDisplayName(activeRole)}
                </strong>
                <span className="text-[10px] text-neutral-500">
                  {activeRole}@meditrack.com (Password@123)
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-brand bg-brand-tint px-2 py-0.5 rounded">
              Instant
            </span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-control flex items-start gap-2">
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
              placeholder={`${activeRole}@meditrack.com`}
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
            Sign In as {getRoleDisplayName(activeRole)}
          </Button>
        </form>

        {/* Registration Link (Hidden for Admin) */}
        {activeRole !== 'admin' ? (
          <p className="text-center text-xs text-neutral-500 mt-6">
            Don't have an account?{' '}
            <Link to={`/register?role=${activeRole}`} className="text-brand font-semibold hover:underline">
              Register as {getRoleDisplayName(activeRole)}
            </Link>
          </p>
        ) : (
          <p className="text-center text-[11px] text-neutral-400 mt-6 bg-neutral-50 py-2 rounded border border-neutral-200">
            🛡️ Administrative accounts are issued exclusively via internal government invitation.
          </p>
        )}

      </div>
    </div>
  );
}
