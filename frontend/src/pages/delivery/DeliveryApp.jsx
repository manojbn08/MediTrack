import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { subscribeToTopic } from '../../api/websocket';
import Button from '../../components/Button';
import TrackingMap from '../../components/TrackingMap';
import ConfirmModal from '../../components/ConfirmModal';
import { 
  Truck, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Navigation, 
  Key, 
  DollarSign, 
  Power,
  Radio,
  Store,
  Compass
} from 'lucide-react';

const CENTRAL_HUB = [12.9716, 77.5946]; // MediTrack Central Pharmacy Hub (Brigade Rd)
const DEFAULT_PATROL_POST = [12.9650, 77.6000]; // Active Partner Patrol Station (Richmond Town, 1.1 km from Central Hub)

function calculateHaversineRaw(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth radius in km
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
  // Standard urban road circuity factor 1.35x for realistic driving distance
  return Math.max(0.2, Math.round(straight * 1.35 * 10) / 10);
}

export default function DeliveryApp() {
  const [online, setOnline] = useState(true);
  const [offers, setOffers] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [riderPos, setRiderPos] = useState(DEFAULT_PATROL_POST);
  const [geoState, setGeoState] = useState({ 
    active: true, 
    loading: false, 
    msg: 'Central Hub Patrol Post (1.1 km from pharmacy hub)' 
  });
  
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [deliveryOtpInput, setDeliveryOtpInput] = useState('');
  const [codCollected, setCodCollected] = useState(false);
  const [earnings, setEarnings] = useState({ deliveriesCount: 0, totalEarnings: 0, codCollectedToSettle: 0 });
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Accept',
    cancelText: 'Reject',
    variant: 'primary',
    onConfirm: null,
  });

  const requestLiveLocation = () => {
    if (!navigator.geolocation) {
      setGeoState({ active: false, loading: false, msg: 'Geolocation not supported by device.' });
      return;
    }
    setGeoState({ active: false, loading: true, msg: 'Calibrating delivery GPS position...' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const rawLat = pos.coords.latitude;
        const rawLng = pos.coords.longitude;
        const straightFromHub = calculateHaversineRaw(rawLat, rawLng, CENTRAL_HUB[0], CENTRAL_HUB[1]);

        if (straightFromHub > 15.0) {
          // Device is physically located outside the active 15 km Bengaluru delivery zone
          // Calibrate rider position to active Central Hub Patrol Post for accurate simulation
          setRiderPos(DEFAULT_PATROL_POST);
          setGeoState({
            active: true,
            loading: false,
            msg: `GPS detected ${straightFromHub.toFixed(1)} km away (outside 15 km zone). Calibrated to Central Hub Patrol Post (1.1 km from hub) for realistic dispatch.`
          });
        } else {
          const lat = Math.round(rawLat * 10000) / 10000;
          const lng = Math.round(rawLng * 10000) / 10000;
          setRiderPos([lat, lng]);
          setGeoState({
            active: true,
            loading: false,
            msg: `Live GPS Active: (${lat.toFixed(4)}, ${lng.toFixed(4)}) • In Delivery Zone`
          });
        }
      },
      (err) => {
        setRiderPos(DEFAULT_PATROL_POST);
        setGeoState({
          active: true,
          loading: false,
          msg: 'GPS permission denied. Using Central Hub Patrol Post (1.1 km from pharmacy hub).'
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const loadData = async () => {
    try {
      const [offersRes, historyRes, earningsRes] = await Promise.all([
        api.get('/delivery/offers'),
        api.get('/delivery/history'),
        api.get('/delivery/earnings'),
      ]);

      setOffers(offersRes.data || []);
      setEarnings(earningsRes.data || { deliveriesCount: 0, totalEarnings: 0, codCollectedToSettle: 0 });

      const inProgress = (historyRes.data || []).find(
        d => d.status === 'ASSIGNED' || d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT'
      );
      setActiveDelivery(inProgress || null);
      if (inProgress?.currentLat && inProgress?.currentLng) {
        setRiderPos([inProgress.currentLat, inProgress.currentLng]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    requestLiveLocation();

    // Listen to real-time available pickup broadcasts
    const unsubPickups = subscribeToTopic('/topic/delivery/available-pickups', (msg) => {
      setActionSuccess(`New pickup available: Order #${msg.orderNumber || msg.orderId || ''}`);
      loadData();
    });

    return () => {
      if (unsubPickups) unsubPickups();
    };
  }, []);

  const handlePushGpsLocation = async () => {
    if (!activeDelivery) return;
    try {
      const destLat = activeDelivery.deliveryLat || 12.9304;
      const destLng = activeDelivery.deliveryLng || 77.6784;
      // Progress rider 35% closer along the route towards the destination
      const nextLat = Math.round((riderPos[0] + (destLat - riderPos[0]) * 0.35) * 10000) / 10000;
      const nextLng = Math.round((riderPos[1] + (destLng - riderPos[1]) * 0.35) * 10000) / 10000;
      setRiderPos([nextLat, nextLng]);

      const res = await api.post(`/delivery/${activeDelivery.id}/location`, {
        latitude: nextLat,
        longitude: nextLng
      });
      const updated = res.data;
      const remKm = updated?.distanceKm ?? calculateRoadDistance(nextLat, nextLng, destLat, destLng);
      const remEta = updated?.etaMinutes ?? Math.max(2, Math.round(2 + (remKm / 22.0) * 60));

      setActionSuccess(`Live GPS streamed: ~${remKm} km remaining, ETA: ~${remEta} mins (transmitted to customer map).`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'GPS transmission failed');
    }
  };

  // 1. Accept Offer with Confirmation Dialog
  const promptAcceptOffer = (offer) => {
    const distToPickup = calculateHaversine(riderPos[0], riderPos[1], offer.pickupLat || 12.9716, offer.pickupLng || 77.5946);
    const distToDrop = calculateHaversine(riderPos[0], riderPos[1], offer.deliveryLat || 12.9304, offer.deliveryLng || 77.6784);
    
    setConfirmDialog({
      isOpen: true,
      title: `Accept Delivery Job: Order #${offer.orderId}`,
      message: `Review job details before accepting:\n• Pharmacy Pickup: ${offer.pickupAddress || 'MediTrack Central Pharmacy, MG Road'} (${distToPickup} km from your current location)\n• Customer Destination: ${offer.deliveryAddress || 'Customer Address'} (${distToDrop} km from your current location)\n• Compensation: ₹65.00${offer.codAmount > 0 ? ` + Collect ₹${offer.codAmount.toFixed(2)} COD` : ''}`,
      confirmText: 'Accept Delivery Job',
      cancelText: 'Reject / Decline',
      variant: 'primary',
      onConfirm: () => executeAcceptOffer(offer.id),
    });
  };

  const executeAcceptOffer = async (deliveryId) => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
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

  // 2. Verify Pickup with Confirmation Dialog
  const promptVerifyPickup = () => {
    if (!pickupCodeInput.trim()) {
      setError('Please enter the 6-character pickup code displayed by the pharmacist.');
      return;
    }
    setError('');
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Counter Pickup Handover',
      message: `Confirm that you have physically inspected Order #${activeDelivery.orderId} and matched Pickup Code: "${pickupCodeInput.trim().toUpperCase()}" at the pharmacy counter?`,
      confirmText: 'Confirm Handover',
      cancelText: 'Cancel',
      variant: 'success',
      onConfirm: executeVerifyPickup,
    });
  };

  const executeVerifyPickup = async () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
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

  // 3. Start Journey with Confirmation Dialog
  const promptStartJourney = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Start Delivery Route',
      message: `Are you ready to depart for Order #${activeDelivery.orderId}? Customer will be notified and sent their 4-digit verification OTP.`,
      confirmText: 'Start Route',
      cancelText: 'Cancel',
      variant: 'primary',
      onConfirm: executeStartJourney,
    });
  };

  const executeStartJourney = async () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
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

  // 4. Complete Delivery with Confirmation Dialog
  const promptCompleteDelivery = () => {
    if (!deliveryOtpInput.trim()) {
      setError('Ask customer for their 4-digit Delivery OTP before handing over medicines.');
      return;
    }
    setError('');
    setConfirmDialog({
      isOpen: true,
      title: 'Complete Delivery Verification',
      message: `Confirm that OTP "${deliveryOtpInput.trim()}" was provided by the customer and tamper-sealed medicines for Order #${activeDelivery.orderId} have been delivered?${activeDelivery.codAmount > 0 ? `\n• Cash Collected: ₹${activeDelivery.codAmount.toFixed(2)}` : ''}`,
      confirmText: 'Complete Delivery',
      cancelText: 'Cancel',
      variant: 'success',
      onConfirm: executeCompleteDelivery,
    });
  };

  const executeCompleteDelivery = async () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
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
      <div className="bg-white rounded-panel border border-neutral-200 p-4 flex items-center justify-between shadow-xs">
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

      {/* GPS Location Permission & Status Bar */}
      <div className="p-3 bg-white rounded-panel border border-neutral-200 shadow-xs flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Compass className={`w-4 h-4 ${geoState.active ? 'text-semantic-success animate-spin' : 'text-neutral-400'}`} />
          <span className="text-neutral-700 font-medium">
            {geoState.loading ? 'Requesting GPS...' : geoState.active ? geoState.msg : 'GPS Inactive'}
          </span>
        </div>
        <button
          type="button"
          onClick={requestLiveLocation}
          className="text-xs px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded-control border border-neutral-300 transition-colors"
        >
          📍 Update GPS
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
              pharmacyPos={[activeDelivery.pickupLat || 12.9716, activeDelivery.pickupLng || 77.5946]}
              customerPos={[activeDelivery.deliveryLat || 12.9304, activeDelivery.deliveryLng || 77.6784]}
              riderPos={riderPos}
              status={activeDelivery.status}
            />
          </div>

          {/* Destination Details from DB */}
          <div className="p-3 bg-neutral-50 rounded-control border border-neutral-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <Store className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong>Pharmacy Pickup:</strong>
                <div className="text-neutral-700">{activeDelivery.pickupAddress || 'MediTrack Central Pharmacy Hub, Brigade Rd, Bengaluru'}</div>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-1 border-t border-neutral-200/60">
              <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <div>
                <strong>Customer Destination:</strong>
                <div className="text-neutral-700">{activeDelivery.deliveryAddress || activeDelivery.deliveryAddressSnapshot || 'Customer Address, Bengaluru'}</div>
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
                <Button size="lg" onClick={promptVerifyPickup} className="h-11 px-5">
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
              <Button size="lg" className="w-full h-12 text-base font-semibold" onClick={promptStartJourney}>
                <Navigation className="w-5 h-5 mr-1" />
                Start Delivery Route
              </Button>
            </div>
          )}

          {/* STEP 3: Delivery OTP Verification at Doorstep & GPS Stream */}
          {activeDelivery.status === 'IN_TRANSIT' && (
            <div className="space-y-4 pt-2">
              {/* GPS Location Streamer */}
              <div className="p-3 bg-brand-tint/30 border border-teal-200 rounded-control space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-brand flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-brand" /> Live GPS Transceiver
                  </span>
                  <span className="font-mono-numbers text-[11px] font-semibold text-neutral-700">
                    ~{calculateRoadDistance(riderPos[0], riderPos[1], activeDelivery.deliveryLat || 12.9304, activeDelivery.deliveryLng || 77.6784)} km to customer
                  </span>
                </div>
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="w-full text-xs font-semibold" 
                  onClick={handlePushGpsLocation}
                >
                  📡 Advance Route & Stream Live GPS to Customer
                </Button>
              </div>

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

              <Button size="lg" className="w-full h-12 text-base font-semibold" onClick={promptCompleteDelivery}>
                <CheckCircle2 className="w-5 h-5 mr-1" />
                Confirm & Complete Delivery
              </Button>
            </div>
          )}

        </div>
      ) : (
        /* AVAILABLE OFFERS LIST - COMPLETE WITH LIVE LOCATION DISTANCE CHECKS */
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
            offers.map((offer) => {
              const pickupLat = offer.pickupLat || 12.9716;
              const pickupLng = offer.pickupLng || 77.5946;
              const dropLat = offer.deliveryLat || 12.9304;
              const dropLng = offer.deliveryLng || 77.6784;

              // Road driving distance from partner's live position to pharmacy pickup
              const distToPickup = calculateRoadDistance(riderPos[0], riderPos[1], pickupLat, pickupLng);
              const timeToPickup = Math.max(2, Math.round(2 + (distToPickup / 22.0) * 60));

              // Road driving distance from pharmacy to customer delivery drop
              const distDelivery = calculateRoadDistance(pickupLat, pickupLng, dropLat, dropLng);
              const timeDelivery = Math.max(8, Math.round(4 + (distDelivery / 22.0) * 60));

              // Total trip distance for the partner
              const totalTripKm = Math.round((distToPickup + distDelivery) * 10) / 10;

              return (
                <div 
                  key={offer.id}
                  className="bg-white rounded-panel border border-neutral-200 p-4 space-y-3 hover:border-brand transition-colors shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-neutral-900 font-mono-numbers">
                        Order #{offer.orderId}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-brand-tint text-brand text-[10px] font-semibold font-mono-numbers">
                        ~{distDelivery} km delivery • Total trip ~{totalTripKm} km
                      </span>
                    </div>

                    <strong className="text-base text-brand font-mono-numbers">
                      ₹65.00
                    </strong>
                  </div>

                  {/* Proximity breakdown from Delivery Partner's Live Location */}
                  <div className="p-2.5 bg-neutral-50 rounded-control border border-neutral-200/80 text-xs space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-800 flex items-center gap-1">
                          <Store className="w-3.5 h-3.5" /> 1. Pharmacy Pickup:
                        </span>
                        <span className="font-mono-numbers text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                          {distToPickup} km from you (~{timeToPickup} mins)
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 pl-4 mt-0.5">
                        {offer.pickupAddress || 'MediTrack Central Pharmacy Hub, Brigade Rd, Bengaluru'}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-neutral-200/60">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-brand flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> 2. Customer Delivery:
                        </span>
                        <span className="font-mono-numbers text-[11px] font-bold text-brand bg-brand-tint px-1.5 py-0.2 rounded">
                          {distDelivery} km from pharmacy (~{timeDelivery} mins)
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 pl-4 mt-0.5">
                        {offer.deliveryAddress || 'Customer Destination Address, Bengaluru'}
                      </p>
                    </div>

                    {offer.codAmount > 0 && (
                      <div className="text-amber-800 font-semibold font-mono-numbers text-[11px] pt-1 border-t border-neutral-200/60">
                        COD to Collect: ₹{offer.codAmount.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <Button 
                    className="w-full h-11 text-sm font-semibold"
                    onClick={() => promptAcceptOffer(offer)}
                  >
                    Accept Delivery Job
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Daily Earnings Card */}
      <div className="bg-white rounded-panel border border-neutral-200 p-4 shadow-xs text-xs space-y-2">
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

      {/* Universal Action Confirmation Dialog (Accept or Reject for every action) */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
