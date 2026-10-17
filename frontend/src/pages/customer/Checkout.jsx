import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Button from '../../components/Button';
import RxBadge from '../../components/RxBadge';
import { 
  MapPin, 
  CreditCard, 
  Banknote, 
  FileText, 
  Tag, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowLeft 
} from 'lucide-react';

export default function Checkout({ cart, onOrderPlaced }) {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ONLINE');
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [address, setAddress] = useState({
    line1: 'Flat 402, Green Glen Layout',
    line2: 'Outer Ring Road, Bellandur',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560103',
    lat: 12.9304,
    lng: 77.6784,
  });

  const items = cart?.items || [];
  const hasRx = items.some(item => item.product.requiresPrescription);

  const subtotal = items.reduce((acc, item) => acc + (item.product.mrp * item.quantity), 0);
  const deliveryFee = subtotal >= 500.0 || items.length === 0 ? 0.0 : 40.0;
  
  let discount = 0.0;
  if (couponApplied && couponCode.toUpperCase() === 'WELCOME10') {
    discount = Math.min(subtotal * 0.10, 100.0);
  } else if (couponApplied && couponCode.toUpperCase() === 'FLAT50') {
    discount = 50.0;
  }
  const total = Math.max(0.0, subtotal + deliveryFee - discount);

  useEffect(() => {
    if (hasRx) {
      api.get('/customer/prescriptions')
        .then(res => {
          const list = res.data || [];
          setPrescriptions(list);
          const valid = list.find(p => p.status === 'APPROVED' || p.status === 'PENDING');
          if (valid) setSelectedPrescriptionId(String(valid.id));
        })
        .catch(err => console.error(err));
    }
  }, [hasRx]);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'WELCOME10' || couponCode.toUpperCase() === 'FLAT50') {
      setCouponApplied(true);
      setError('');
    } else {
      setError('Invalid coupon code. Try WELCOME10 or FLAT50.');
      setCouponApplied(false);
    }
  };

  const handlePlaceOrder = async () => {
    setError('');
    if (hasRx && !selectedPrescriptionId) {
      setError('Please attach a valid doctor prescription for your Rx medicines.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        addressId: 1,
        prescriptionId: selectedPrescriptionId ? Long(selectedPrescriptionId) : null,
        paymentMethod: paymentMethod,
        couponCode: couponApplied ? couponCode.toUpperCase() : null,
        deliveryLat: address.lat,
        deliveryLng: address.lng,
        deliveryAddressSnapshot: `${address.line1}, ${address.line2}, ${address.city}, ${address.pincode}`,
      };

      const res = await api.post('/customer/orders', payload);
      if (onOrderPlaced) onOrderPlaced();
      navigate(`/customer/orders/${res.data.id}/track`);
    } catch (err) {
      setError(err.message || 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  function Long(val) {
    return parseInt(val, 10);
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-sm text-neutral-600 mb-4">You have no items in your cart to checkout.</p>
        <Button onClick={() => navigate('/products')}>Return to Catalog</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      <button 
        onClick={() => navigate('/cart')}
        className="text-xs text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 font-medium mb-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Cart
      </button>

      <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Checkout & Order Placement</h1>

      {error && (
        <div className="p-3.5 bg-semantic-danger-tint border border-red-200 text-semantic-danger text-xs rounded-control flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Form Sections */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Delivery Address */}
          <div className="bg-white rounded-panel border border-neutral-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <MapPin className="w-4 h-4 text-brand" />
              <span>1. Delivery Destination Address</span>
            </div>

            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-control text-xs space-y-1">
              <div className="font-semibold text-neutral-900">Delivery Address (Bengaluru Metro Zone)</div>
              <div className="text-neutral-700">{address.line1}, {address.line2}</div>
              <div className="text-neutral-600">{address.city}, {address.state} — {address.pincode}</div>
              <div className="text-[11px] text-neutral-500 font-mono-numbers pt-1">
                GPS Coordinates: {address.lat.toFixed(4)}° N, {address.lng.toFixed(4)}° E (Inside 15 km Radius)
              </div>
            </div>
          </div>

          {/* Section 2: Prescription Review (Required if Rx items present) */}
          {hasRx && (
            <div className="bg-white rounded-panel border border-neutral-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <FileText className="w-4 h-4 text-semantic-danger" />
                  <span>2. Prescription Verification (Required by Law)</span>
                </div>
                <RxBadge />
              </div>

              <p className="text-xs text-neutral-600">
                Your cart contains Schedule H/H1 regulated drugs. Select an uploaded prescription for pharmacist dispensing approval:
              </p>

              {prescriptions.length === 0 ? (
                <div className="p-4 bg-semantic-warning-tint border border-amber-200 rounded-control text-xs text-amber-900 flex items-start justify-between gap-3">
                  <div>
                    <strong>No approved prescription found.</strong> Please upload your doctor's Rx before placing this order.
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => navigate('/customer/prescriptions')}>
                    Upload Rx
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {prescriptions.map((p) => (
                    <label 
                      key={p.id}
                      className={`block p-3 border rounded-control cursor-pointer text-xs transition-colors ${
                        selectedPrescriptionId === String(p.id) 
                          ? 'border-brand bg-brand-tint/30' 
                          : 'border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="rx_select" 
                            value={p.id} 
                            checked={selectedPrescriptionId === String(p.id)}
                            onChange={(e) => setSelectedPrescriptionId(e.target.value)}
                            className="text-brand focus:ring-brand"
                          />
                          <span className="font-semibold text-neutral-900">{p.doctorName || 'Doctor Prescription'}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium font-mono-numbers ${
                          p.status === 'APPROVED' ? 'bg-semantic-success-tint text-semantic-success' : 'bg-semantic-warning-tint text-semantic-warning'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="text-neutral-500 text-[11px] mt-1 pl-5">
                        Patient: {p.patientName} • Issued: {p.issuedOn || 'Recent'} • Doctor Reg: {p.doctorRegNo}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Payment Method */}
          <div className="bg-white rounded-panel border border-neutral-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <CreditCard className="w-4 h-4 text-brand" />
              <span>{hasRx ? '3.' : '2.'} Payment Method</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label 
                className={`p-3.5 border rounded-control cursor-pointer flex items-start gap-3 transition-colors ${
                  paymentMethod === 'ONLINE' ? 'border-brand bg-brand-tint/30' : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <input 
                  type="radio" 
                  name="pay_method" 
                  value="ONLINE"
                  checked={paymentMethod === 'ONLINE'}
                  onChange={() => setPaymentMethod('ONLINE')}
                  className="mt-0.5 text-brand focus:ring-brand"
                />
                <div>
                  <strong className="block text-neutral-900 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-brand" /> Online Payment (UPI / Cards / NetBanking)
                  </strong>
                  <span className="text-[11px] text-neutral-500 mt-0.5 block">
                    Instant verification via Razorpay Gateway (Test sandbox mode enabled)
                  </span>
                </div>
              </label>

              <label 
                className={`p-3.5 border rounded-control cursor-pointer flex items-start gap-3 transition-colors ${
                  paymentMethod === 'COD' ? 'border-brand bg-brand-tint/30' : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <input 
                  type="radio" 
                  name="pay_method" 
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="mt-0.5 text-brand focus:ring-brand"
                />
                <div>
                  <strong className="block text-neutral-900 flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-brand" /> Cash on Delivery (COD)
                  </strong>
                  <span className="text-[11px] text-neutral-500 mt-0.5 block">
                    Pay delivery rider in cash or UPI QR scan upon receiving order
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 4: Coupons */}
          <div className="bg-white rounded-panel border border-neutral-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <Tag className="w-4 h-4 text-brand" />
              <span>Apply Promotion Coupon</span>
            </div>

            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                placeholder="Try coupon code WELCOME10 or FLAT50"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 px-3 h-9 text-xs bg-white border border-neutral-300 rounded-control uppercase font-mono-numbers focus:border-brand"
              />
              <Button type="submit" variant="secondary" size="md">
                Apply
              </Button>
            </form>

            {couponApplied && (
              <div className="text-xs text-semantic-success flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Coupon {couponCode.toUpperCase()} applied! You saved ₹{discount.toFixed(2)}</span>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Order Confirmation Card */}
        <div className="bg-white rounded-panel border border-neutral-200 p-6 space-y-4 shadow-sm sticky top-24">
          <h2 className="text-base font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
            Payment Breakdown
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Items Total ({items.length}):</span>
              <span className="font-mono-numbers text-neutral-900">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-neutral-600">
              <span>Delivery Charges:</span>
              <span className="font-mono-numbers text-neutral-900">
                {deliveryFee === 0 ? <span className="text-semantic-success">FREE</span> : `₹${deliveryFee.toFixed(2)}`}
              </span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-semantic-success">
                <span>Coupon Discount:</span>
                <span className="font-mono-numbers">-₹{discount.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t border-neutral-200 pt-3 flex justify-between text-sm font-semibold text-neutral-900">
              <span>Grand Total:</span>
              <span className="font-mono-numbers text-lg text-brand">₹{total.toFixed(2)}</span>
            </div>
          </div>

          <Button 
            className="w-full h-11 text-sm font-semibold"
            loading={loading}
            onClick={handlePlaceOrder}
          >
            Confirm & Place Order (₹{total.toFixed(2)})
          </Button>

          <div className="text-[11px] text-neutral-500 space-y-1.5 pt-2 border-t border-neutral-100">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
              <span>4-digit verification OTP issued upon dispatch</span>
            </div>
            <div className="text-neutral-400">
              Medicines dispensed under regulatory guidelines by registered pharmacist.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
