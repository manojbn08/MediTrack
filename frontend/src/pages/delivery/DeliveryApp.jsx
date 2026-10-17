import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Button from '../../components/Button';
import TrackingMap from '../../components/TrackingMap';
import { 
  Truck, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Navigation, 
  Key, 
  DollarSign, 
  Power 
} from 'lucide-react';

export default function DeliveryApp() {
  const [online, setOnline] = useState(true);
  const [offers, setOffers] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [deliveryOtpInput, setDeliveryOtpInput] = useState('');
  const [codCollected, setCodCollected] = useState(false);
  const [earnings, setEarnings] = useState({ deliveriesCount: 0, totalEarnings: 0, codCollectedToSettle: 0 });
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadData = async () => {
    try {
      const [offersRes, historyRes, earningsRes] = await Promise.all([
        api.get('/delivery/offers'),
        api.get('/delivery/history'),
        api.get('/delivery/earnings'),
      ]);

      setOffers(offersRes.data || []);
      setEarnings(earningsRes.data || { deliveriesCount: 0, totalEarnings: 0, codCollectedToSettle: 0 });

      // Find if there is an ongoing active delivery for this partner
      const inProgress = (historyRes.data || []).find(
        d => d.status === 'ASSIGNED' || d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT'
      );
      setActiveDelivery(inProgress || null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptOffer = async (deliveryId) => {
    setError('');
    setActionSuccess('');
    try {
      const res = await api.post(`/delivery/offers/${deliveryId}/accept`);
      setActiveDelivery(res.data);
      setActionSuccess('Order accepted! Proceed to Central Pharmacy counter for pickup.');
      loadData();
    } catch (err) {
      setError(err.message || 'Could not accept order.');
    }
  };

  const handleVerifyPickup = async () => {
    if (!pickupCodeInput.trim()) {
      setError('Please enter the 6-character pickup code displayed on the parcel.');
      return;
    }
    setError('');
    setActionSuccess('');
    try {
      const res = await api.post(`/delivery/${activeDelivery.id}/pickup`, {
        pickupCode: pickupCodeInput.trim(),
      });
      setActiveDelivery(res.data);
      setActionSuccess('Pickup verified! Package handover confirmed.');
      setPickupCodeInput('');
      loadData();
    } catch (err) {
      setError(err.message || 'Invalid pickup code.');
    }
  };

  const handleStartJourney = async () => {
    setError('');
    setActionSuccess('');
    try {
      const res = await api.post(`/delivery/${activeDelivery.id}/start`);
      setActiveDelivery(res.data);
      setActionSuccess('Out for delivery! Customer has received their 4-digit verification OTP.');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to start journey.');
    }
  };

  const handleCompleteDelivery = async () => {
    if (!deliveryOtpInput.trim()) {
      setError('Ask customer for their 4-digit Delivery OTP before handing over medicines.');
      return;
    }
    setError('');
    setActionSuccess('');
    try {
      await api.post(`/delivery/${activeDelivery.id}/complete`, {
        deliveryOtp: deliveryOtpInput.trim(),
        codCollected: codCollected,
      });
      setActionSuccess('Delivery successfully completed and verified!');
      setActiveDelivery(null);
      setDeliveryOtpInput('');
      setCodCollected(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Incorrect OTP code.');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5 pb-24">
      
      {/* Top Mobile Status Header */}
      <div className="bg-white rounded-panel border border-neutral-200 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-tint text-brand flex items-center justify-center">
            <Truck className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-neutral-900 leading-tight">Delivery Partner App</h1>
            <span className="text-[11px] text-neutral-500 font-mono-numbers">
              Completed: {earnings.deliveriesCount} trips • ₹{earnings.totalEarnings} earned
            </span>
          </div>
        </div>

        {/* Online Toggle */}
        <button
          onClick={() => setOnline(!online)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            online ? 'bg-semantic-success-tint text-semantic-success border border-emerald-300' : 'bg-neutral-200 text-neutral-600'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          <span>{online ? 'Online' : 'Offline'}</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-semantic-success-tint border border-emerald-300 text-semantic-success text-xs rounded-control flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-semantic-danger-tint border border-red-300 text-semantic-danger text-xs rounded-control flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ACTIVE TASK WORKFLOW VIEW */}
      {activeDelivery ? (
        <div className="bg-white rounded-panel border border-brand p-5 space-y-4 shadow-sm">
          
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <span className="text-[10px] font-semibold text-brand uppercase tracking-wider block font-mono-numbers">
                Current Active Delivery
              </span>
              <h2 className="text-base font-semibold text-neutral-900">
                Order #{activeDelivery.orderId}
              </h2>
            </div>
            
            <span className="px-2.5 py-1 bg-brand text-white text-xs font-semibold rounded-full font-mono-numbers">
              {activeDelivery.status}
            </span>
          </div>

          {/* Interactive Route Map */}
          <div className="h-56 rounded-control overflow-hidden border border-neutral-300">
            <TrackingMap 
              pharmacyPos={[12.9716, 77.5946]}
              customerPos={[activeDelivery.deliveryLat || 12.9304, activeDelivery.deliveryLng || 77.6784]}
              riderPos={[12.9510, 77.6365]}
              status={activeDelivery.status}
            />
          </div>

          {/* Destination Details */}
          <div className="p-3 bg-neutral-50 rounded-control border border-neutral-200 text-xs space-y-1.5">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <div>
                <strong>Destination Address:</strong>
                <div className="text-neutral-700">Bellandur, Outer Ring Road, Bengaluru</div>
              </div>
            </div>

            {activeDelivery.codAmount > 0 && (
              <div className="mt-2 p-2 bg-semantic-warning-tint border border-amber-200 rounded text-amber-900 font-semibold flex items-center justify-between">
                <span>Collect Cash on Delivery:</span>
                <span className="font-mono-numbers text-sm">₹{activeDelivery.codAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* STEP 1: Counter Pickup Verification */}
          {activeDelivery.status === 'ASSIGNED' && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-neutral-800">
                Step 1: Enter Pharmacist Pickup Code at Counter
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. PK-8812"
                  value={pickupCodeInput}
                  onChange={(e) => setPickupCodeInput(e.target.value)}
                  className="flex-1 px-3 h-11 text-sm uppercase font-mono-numbers bg-white border border-neutral-300 rounded-control focus:border-brand"
                />
                <Button size="lg" onClick={handleVerifyPickup} className="h-11 px-5">
                  Verify Pickup
                </Button>
              </div>
              <span className="text-[11px] text-neutral-500 block">
                Ask the on-duty pharmacist for the package pickup code.
              </span>
            </div>
          )}

          {/* STEP 2: Start Trip */}
          {activeDelivery.status === 'PICKED_UP' && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-neutral-600">
                Package in hand. Start ride to trigger live tracking and dispatch OTP to customer.
              </p>
              <Button size="lg" className="w-full h-12 text-base font-semibold" onClick={handleStartJourney}>
                <Navigation className="w-5 h-5 mr-1" />
                Start Delivery Route
              </Button>
            </div>
          )}

          {/* STEP 3: Delivery OTP Verification at Doorstep */}
          {activeDelivery.status === 'IN_TRANSIT' && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-neutral-800">
                Step 3: Enter Customer's 4-Digit Delivery OTP
              </label>

              <input
                type="text"
                maxLength={4}
                placeholder="4-digit OTP"
                value={deliveryOtpInput}
                onChange={(e) => setDeliveryOtpInput(e.target.value)}
                className="w-full px-4 h-12 text-center text-xl font-bold font-mono-numbers bg-white border border-neutral-300 rounded-control focus:border-brand tracking-widest"
              />

              {activeDelivery.codAmount > 0 && (
                <label className="flex items-center gap-2 text-xs text-neutral-800 p-2 bg-neutral-100 rounded-control cursor-pointer">
                  <input
                    type="checkbox"
                    checked={codCollected}
                    onChange={(e) => setCodCollected(e.target.checked)}
                    className="w-4 h-4 text-brand rounded"
                  />
                  <span>I have collected <strong>₹{activeDelivery.codAmount.toFixed(2)}</strong> in cash</span>
                </label>
              )}

              <Button size="lg" className="w-full h-12 text-base font-semibold" onClick={handleCompleteDelivery}>
                <CheckCircle2 className="w-5 h-5 mr-1" />
                Confirm & Complete Delivery
              </Button>
            </div>
          )}

        </div>
      ) : (
        /* AVAILABLE OFFERS LIST */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-600 px-1">
            <span className="font-semibold uppercase tracking-wide">Available Nearby Jobs</span>
            <span className="font-mono-numbers">{offers.length} nearby</span>
          </div>

          {!online ? (
            <div className="bg-white rounded-panel border border-neutral-200 p-8 text-center text-xs text-neutral-500">
              You are currently offline. Switch toggle to Online to receive delivery offers.
            </div>
          ) : offers.length === 0 ? (
            <div className="bg-white rounded-panel border border-neutral-200 p-8 text-center text-xs text-neutral-500">
              No orders waiting for pickup right now. New ready orders appear here automatically.
            </div>
          ) : (
            offers.map((offer) => (
              <div 
                key={offer.id}
                className="bg-white rounded-panel border border-neutral-200 p-4 space-y-3 hover:border-brand transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-neutral-900 font-mono-numbers">
                      Order #{offer.orderId}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-brand-tint text-brand text-[10px] font-semibold font-mono-numbers">
                      ~{offer.distanceKm} km
                    </span>
                  </div>

                  <strong className="text-base text-brand font-mono-numbers">
                    ₹65.00
                  </strong>
                </div>

                <div className="text-xs text-neutral-600 space-y-1">
                  <div><strong>Pickup:</strong> Central Pharmacy (Brigade Rd)</div>
                  <div><strong>Drop:</strong> Indiranagar / Bellandur Destination</div>
                  {offer.codAmount > 0 && (
                    <div className="text-amber-800 font-semibold font-mono-numbers text-[11px]">
                      COD to Collect: ₹{offer.codAmount.toFixed(2)}
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full h-11 text-sm font-semibold"
                  onClick={() => handleAcceptOffer(offer.id)}
                >
                  Accept Delivery Job
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Daily Earnings Card */}
      <div className="bg-white rounded-panel border border-neutral-200 p-4 shadow-sm text-xs space-y-2">
        <h3 className="font-semibold text-neutral-900 flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-brand" /> Today's Delivery Summary
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono-numbers">
          <div className="p-2 bg-neutral-50 rounded-control">
            <span className="text-[10px] text-neutral-500 block">Trips</span>
            <strong className="text-sm text-neutral-900">{earnings.deliveriesCount}</strong>
          </div>
          <div className="p-2 bg-neutral-50 rounded-control">
            <span className="text-[10px] text-neutral-500 block">Payout</span>
            <strong className="text-sm text-brand">₹{earnings.totalEarnings}</strong>
          </div>
          <div className="p-2 bg-neutral-50 rounded-control">
            <span className="text-[10px] text-neutral-500 block">COD Held</span>
            <strong className="text-sm text-neutral-900">₹{earnings.codCollectedToSettle}</strong>
          </div>
        </div>
      </div>

    </div>
  );
}
