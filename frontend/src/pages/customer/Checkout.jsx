import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Button from '../../components/Button';
import RxBadge from '../../components/RxBadge';
import MapPicker from '../../components/MapPicker';
import ConfirmModal from '../../components/ConfirmModal';
import { 
  MapPin, 
  CreditCard, 
  Banknote, 
  FileText, 
  Tag, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowLeft,
  Navigation
} from 'lucide-react';

const PHARMACY_COORDS = [12.9716, 77.5946];

function calculateHaversineRaw(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateRoadDistance(lat1, lon1, lat2, lon2) {
  const straight = calculateHaversineRaw(lat1, lon1, lat2, lon2);
  return Math.max(0.5, Math.round(straight * 1.35 * 10) / 10);
}

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

  const straightDistanceKm = calculateHaversineRaw(PHARMACY_COORDS[0], PHARMACY_COORDS[1], address.lat, address.lng);
  const roadDistanceKm = calculateRoadDistance(PHARMACY_COORDS[0], PHARMACY_COORDS[1], address.lat, address.lng);
  const estimatedEtaMins = Math.max(10, Math.round(4.0 + (roadDistanceKm / 22.0) * 60.0));
  const isOutOfDeliveryRange = straightDistanceKm > 15.0;

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

  const [showConfirmOrderModal, setShowConfirmOrderModal] = useState(false);

  const handleLocationPicked = (newLat, newLng) => {
    setAddress(prev => ({
      ...prev,
      lat: Math.round(newLat * 10000) / 10000,
      lng: Math.round(newLng * 10000) / 10000
    }));
  };

  const handlePlaceOrderClick = () => {
    setError('');
    if (isOutOfDeliveryRange) {
      setError(`Delivery location is ${roadDistanceKm} km away, exceeding our 15.0 km licensed delivery radius.`);
      return;
    }
    if (!address.line1 || !address.pincode) {
      setError('Please provide address details and pincode.');
      return;
    }
    if (hasRx && !selectedPrescriptionId) {
      setError('Please attach a valid doctor prescription for your Rx medicines.');
      return;
    }
    setShowConfirmOrderModal(true);
  };

  const executePlaceOrder = async () => {
    setShowConfirmOrderModal(false);
    setLoading(true);
    try {
      const payload = {
        addressId: 1,
        prescriptionId: selectedPrescriptionId ? Long(selectedPrescriptionId) : null,
        paymentMethod: paymentMethod,
        couponCode: couponApplied ? couponCode.toUpperCase() : null,
        deliveryLat: address.lat,
        deliveryLng: address.lng,
        deliveryAddressSnapshot: `${address.line1}, ${address.line2 || ''}, ${address.city}, ${address.pincode}`,
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
          
          {/* Section 1: Delivery Address & Map Pin */}
          <div className="bg-white rounded-panel border border-neutral-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <MapPin className="w-4 h-4 text-brand" />
                <span>1. Delivery Destination & Pin Location</span>
              </div>
              <span className={`text-xs font-mono-numbers px-2.5 py-1 rounded font-medium border ${
                isOutOfDeliveryRange 
                  ? 'bg-red-50 text-red-700 border-red-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {distanceKm} km from Hub {isOutOfDeliveryRange ? '(Exceeds 15 km)' : '(In Range)'}
              </span>
            </div>

            {/* Editable address fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-neutral-600 font-medium mb-1">House / Flat / Street (Line 1) *</label>
                <input 
                  type="text" 
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className="w-full h-8 px-3 rounded border border-neutral-300 text-xs focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="e.g. Flat 402, Green Glen Layout"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-medium mb-1">Area / Landmark (Line 2)</label>
                <input 
                  type="text" 
                  value={address.line2}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                  className="w-full h-8 px-3 rounded border border-neutral-300 text-xs focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="e.g. Outer Ring Road, Bellandur"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-600 font-medium mb-1">City</label>
                  <input 
                    type="text" 
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full h-8 px-3 rounded border border-neutral-300 text-xs focus:ring-1 focus:ring-brand focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-medium mb-1">Pincode *</label>
                  <input 
                    type="text" 
                    value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                    className="w-full h-8 px-3 rounded border border-neutral-300 font-mono-numbers text-xs focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="560103"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Interactive Map Pin Selector */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <span className="font-medium flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-brand" /> Drop Pin on Map for Precise Courier Navigation:
                </span>
                <span className="font-mono-numbers text-[11px] text-neutral-500">
                  Lat: {address.lat.toFixed(4)}, Lng: {address.lng.toFixed(4)}
                </span>
              </div>
              <MapPicker 
                lat={address.lat} 
                lng={address.lng} 
                onLocationChange={handleLocationPicked} 
              />

              {/* Delivery Proximity & Road Distance Summary */}
              <div className={`p-2.5 rounded-control border text-xs flex items-center justify-between ${
                isOutOfDeliveryRange 
                  ? 'bg-red-50 border-red-200 text-semantic-danger' 
                  : 'bg-teal-50/70 border-teal-200 text-neutral-800'
              }`}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand shrink-0" />
                  <span>
                    {isOutOfDeliveryRange ? (
                      <strong>Out of Range ({roadDistanceKm} km road distance) - 15 km max radius</strong>
                    ) : (
                      <span>Road Distance: <strong>{roadDistanceKm} km</strong> from Central Pharmacy</span>
                    )}
                  </span>
                </div>
                {!isOutOfDeliveryRange && (
                  <span className="font-mono-numbers text-[11px] font-semibold text-brand bg-white px-2 py-0.5 rounded border border-teal-200">
                    Est. delivery in ~{estimatedEtaMins} mins
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Prescription Review (Required for Rx, Bypassed for OTC) */}
          {hasRx ? (
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
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-panel p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-emerald-900">
                  Pure Over-The-Counter (OTC) Order
                </div>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Your selected items do not require a prescription under Drugs and Cosmetics Rules. You can place this order immediately without doctor prescription or pharmacist review delays.
                </p>
              </div>
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
            onClick={handlePlaceOrderClick}
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

      {/* Confirmation Dialog to Accept or Reject Order Placement */}
      <ConfirmModal
        isOpen={showConfirmOrderModal}
        title="Confirm Order Placement"
        message={`Are you sure you want to place this order of ₹${total.toFixed(2)} with ${paymentMethod} payment to ${address.line1}, ${address.city} (${distanceKm} km from Central Pharmacy)?`}
        confirmText="Accept & Place Order"
        cancelText="Reject / Review Details"
        variant="primary"
        onConfirm={executePlaceOrder}
        onCancel={() => setShowConfirmOrderModal(false)}
      />
    </div>
  );
}
