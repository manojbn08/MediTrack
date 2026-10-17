import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import Button from '../../components/Button';
import { Pill, AlertCircle } from 'lucide-react';

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'CUSTOMER',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(formData);
      navigate('/products');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-panel p-8 shadow-sm">
        
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-brand text-white rounded-[6px] mx-auto flex items-center justify-center mb-3">
            <Pill className="w-5 h-5 stroke-[1.5]" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Create MediTrack Account</h1>
          <p className="text-xs text-neutral-500 mt-1">Register for verified healthcare delivery</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-semantic-danger-tint border border-red-200 text-semantic-danger text-xs rounded-control flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ramesh@example.com"
              className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Mobile Phone (for Delivery OTP)</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Account Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
            >
              <option value="CUSTOMER">Customer (Buy medicines & upload prescriptions)</option>
              <option value="DELIVERY">Delivery Partner (Fulfill and deliver orders)</option>
              <option value="PHARMACIST">Pharmacist (Review prescriptions & dispense)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="At least 6 characters"
              className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
            />
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2">
            Complete Registration
          </Button>
        </form>

        <p className="text-center text-xs text-neutral-500 mt-6">
          Already registered?{' '}
          <Link to="/login" className="text-brand font-semibold hover:underline">
            Sign In
          </Link>
        </p>

      </div>
    </div>
  );
}
