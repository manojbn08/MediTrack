import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import Button from '../../components/Button';
import { Pill, AlertCircle, CheckCircle2, ShieldCheck, Mail, ArrowRight, RefreshCw, Clock } from 'lucide-react';

export default function Register() {
  const { register, verifyOtp, resendOtp, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialRole = queryParams.get('role') || 'customer';
  const [role, setRole] = useState(initialRole.toLowerCase());

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    // Customer
    addressLine1: '',
    city: 'Bengaluru',
    pincode: '560001',
    // Pharmacist
    licenseNumber: '',
    councilRegistrationNumber: '',
    qualification: 'B.Pharm / Pharm.D',
    pharmacyId: 1,
    // Delivery
    vehicleType: 'BIKE',
    vehicleNumber: '',
    drivingLicenseNo: '',
  });

  const [error, setError] = useState('');
  const [step, setStep] = useState('FORM'); // 'FORM' | 'OTP' | 'PENDING_APPROVAL'
  const [otpCode, setOtpCode] = useState('');
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    const qRole = queryParams.get('role');
    if (qRole) {
      if (qRole.toLowerCase() === 'admin') {
        navigate('/login?role=admin');
      } else {
        setRole(qRole.toLowerCase());
      }
    }
  }, [location.search, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: role.toUpperCase(),
      addressLine1: formData.addressLine1,
      city: formData.city,
      pincode: formData.pincode,
      licenseNumber: formData.licenseNumber,
      councilRegistrationNumber: formData.councilRegistrationNumber,
      qualification: formData.qualification,
      pharmacyId: formData.pharmacyId,
      vehicleType: formData.vehicleType,
      vehicleNumber: formData.vehicleNumber,
      drivingLicenseNo: formData.drivingLicenseNo,
    };

    try {
      const res = await register(payload);
      if (res.requiresOtp) {
        setStep('OTP');
      } else if (res.status === 'PENDING_APPROVAL') {
        setStep('PENDING_APPROVAL');
      } else {
        navigate('/products');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await verifyOtp(formData.email, otpCode);
      navigate('/products');
    } catch (err) {
      setError(err.message || 'Invalid OTP code.');
    }
  };

  const handleResend = async () => {
    setResendStatus('');
    try {
      await resendOtp(formData.email);
      setResendStatus('A new 6-digit code has been dispatched.');
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    }
  };

  // STEP: OTP Verification (Customer)
  if (step === 'OTP') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-neutral-200 rounded-panel p-8 shadow-sm text-center">
          <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-full mx-auto flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 stroke-[1.5]" />
          </div>

          <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">Verify Your Email Address</h2>
          <p className="text-xs text-neutral-500 mt-1 mb-6">
            We sent a 6-digit verification code to <strong className="text-neutral-800">{formData.email}</strong>.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-control flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resendStatus && (
            <div className="mb-4 p-2.5 bg-green-50 border border-green-200 text-green-800 text-xs rounded-control">
              {resendStatus}
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-2">
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-48 mx-auto px-4 py-2 text-center text-2xl font-mono tracking-widest bg-neutral-50 border border-neutral-300 rounded-control focus:bg-white focus:border-brand"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Verify & Complete Sign In
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <span>Didn't receive the email?</span>
            <button
              type="button"
              onClick={handleResend}
              className="text-brand font-semibold hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Resend Code
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP: Pending Admin Approval (Pharmacist / Delivery)
  if (step === 'PENDING_APPROVAL') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-panel p-8 shadow-sm text-center">
          <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full mx-auto flex items-center justify-center mb-4">
            <Clock className="w-7 h-7 stroke-[1.5]" />
          </div>

          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Application Submitted for Admin Verification</h2>
          <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
            Thank you, <strong>{formData.fullName}</strong>. As required by pharmacy regulatory compliance, all {role === 'pharmacist' ? 'licensed pharmacist' : 'delivery partner'} accounts must be verified by a MediTrack Administrator before portal access is granted.
          </p>

          <div className="bg-neutral-50 rounded-control p-4 border border-neutral-200 text-left my-6 text-xs space-y-2">
            <div className="flex justify-between border-b border-neutral-200 pb-1.5">
              <span className="text-neutral-500">Registered Email:</span>
              <strong className="text-neutral-900">{formData.email}</strong>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-1.5">
              <span className="text-neutral-500">Applied Role:</span>
              <strong className="text-neutral-900 uppercase">{role}</strong>
            </div>
            {role === 'pharmacist' ? (
              <div className="flex justify-between border-b border-neutral-200 pb-1.5">
                <span className="text-neutral-500">License Number:</span>
                <strong className="text-neutral-900">{formData.licenseNumber}</strong>
              </div>
            ) : (
              <div className="flex justify-between border-b border-neutral-200 pb-1.5">
                <span className="text-neutral-500">Vehicle & Driving License:</span>
                <strong className="text-neutral-900">{formData.vehicleNumber} ({formData.drivingLicenseNo})</strong>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-neutral-500">Review Status:</span>
              <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                PENDING_APPROVAL
              </span>
            </div>
          </div>

          <p className="text-xs text-neutral-500 mb-6">
            You will receive an automated confirmation email once your credentials have been reviewed.
          </p>

          <Link to="/">
            <Button variant="secondary" className="w-full">
              Return to Home Page
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // STEP: Standard Role-based Registration Form
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-panel p-8 shadow-sm">
        
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-brand text-white rounded-[6px] mx-auto flex items-center justify-center mb-3">
            <Pill className="w-5 h-5 stroke-[1.5]" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
            Register as {role === 'pharmacist' ? 'Licensed Pharmacist' : role === 'delivery' ? 'Delivery Partner' : 'Customer'}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {role === 'customer' && 'Order medicines with doorstep OTP delivery'}
            {role === 'pharmacist' && 'Dispense Rx medicines under licensed regulatory standards'}
            {role === 'delivery' && 'Earn on every verified doorstep medicine delivery'}
          </p>
        </div>

        {/* Role Switcher */}
        <div className="flex border-b border-neutral-200 mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRole('customer')}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${role === 'customer' ? 'border-brand text-brand' : 'border-transparent text-neutral-500'}`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setRole('pharmacist')}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${role === 'pharmacist' ? 'border-brand text-brand' : 'border-transparent text-neutral-500'}`}
          >
            Pharmacist
          </button>
          <button
            type="button"
            onClick={() => setRole('delivery')}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${role === 'delivery' ? 'border-brand text-brand' : 'border-transparent text-neutral-500'}`}
          >
            Delivery Partner
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-control flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Fields (All Roles) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder={role === 'pharmacist' ? 'Dr. Name / Reg. Pharmacist' : 'Your full name'}
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
                placeholder="you@domain.com"
                className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Mobile Phone</label>
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
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Account Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
              />
            </div>
          </div>

          {/* CUSTOMER Specific: Address */}
          {role === 'customer' && (
            <div className="p-3 bg-neutral-50 rounded-control border border-neutral-200 space-y-3">
              <span className="block text-[11px] font-bold text-neutral-600 uppercase">Delivery Address Snapshot</span>
              <div>
                <input
                  type="text"
                  required
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Street / Flat / Apartment No."
                  className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
                />
                <input
                  type="text"
                  required
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="Pincode (e.g. 560001)"
                  className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
                />
              </div>
            </div>
          )}

          {/* PHARMACIST Specific: Regulatory Credentials */}
          {role === 'pharmacist' && (
            <div className="p-3 bg-blue-50/60 rounded-control border border-blue-200 space-y-3">
              <span className="block text-[11px] font-bold text-blue-900 uppercase">Pharmacy Council Credentials (Required for Admin Approval)</span>
              <div>
                <label className="block text-[11px] font-medium text-neutral-700 mb-1">Drug License / Registration No.</label>
                <input
                  type="text"
                  required
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  placeholder="e.g. KA-PCI-2024-88412"
                  className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-700 mb-1">State Council Reg No.</label>
                  <input
                    type="text"
                    required
                    value={formData.councilRegistrationNumber}
                    onChange={(e) => setFormData({ ...formData, councilRegistrationNumber: e.target.value })}
                    placeholder="e.g. KSPC-49120"
                    className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-700 mb-1">Degree / Degree ID</label>
                  <input
                    type="text"
                    required
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="B.Pharm / M.Pharm / Pharm.D"
                    className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DELIVERY Specific: Vehicle & License */}
          {role === 'delivery' && (
            <div className="p-3 bg-amber-50/60 rounded-control border border-amber-200 space-y-3">
              <span className="block text-[11px] font-bold text-amber-900 uppercase">Vehicle & Driving License Details (Required for Admin Approval)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-700 mb-1">Vehicle Type</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
                  >
                    <option value="BIKE">Motorcycle / Bike</option>
                    <option value="SCOOTER">Scooter</option>
                    <option value="ELECTRIC_VEHICLE">EV Two-Wheeler</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-700 mb-1">Vehicle Reg Number</label>
                  <input
                    type="text"
                    required
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    placeholder="e.g. KA-01-EQ-4421"
                    className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-700 mb-1">Driving License Number</label>
                <input
                  type="text"
                  required
                  value={formData.drivingLicenseNo}
                  onChange={(e) => setFormData({ ...formData, drivingLicenseNo: e.target.value })}
                  placeholder="e.g. DL-042022001923"
                  className="w-full px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
                />
              </div>
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full mt-2">
            {role === 'customer' ? 'Send 6-Digit OTP & Register' : 'Submit Application for Admin Approval'}
          </Button>
        </form>

        <p className="text-center text-xs text-neutral-500 mt-6">
          Already registered?{' '}
          <Link to={`/login?role=${role}`} className="text-brand font-semibold hover:underline">
            Sign In
          </Link>
        </p>

      </div>
    </div>
  );
}
