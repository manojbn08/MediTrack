import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { subscribeToTopic } from '../../api/websocket';
import StatusChip from '../../components/StatusChip';
import TrackingMap from '../../components/TrackingMap';
import Button from '../../components/Button';
import ConfirmModal from '../../components/ConfirmModal';
import { 
  ArrowLeft, 
  Key, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Circle, 
  ShieldCheck, 
  Pill, 
  FileText,
  Download,
  RotateCcw,
  Loader2
} from 'lucide-react';

function calculateRoadDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.max(0.2, Math.round(R * c * 1.35 * 10) / 10);
}

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riderPos, setRiderPos] = useState([12.9650, 77.6000]);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [remainingKm, setRemainingKm] = useState(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnSuccessMsg, setReturnSuccessMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Accept',
    cancelText: 'Reject',
    variant: 'primary',
    onConfirm: null,
  });

  useEffect(() => {
    const fetchOrderAndDelivery = async () => {
      try {
        const orderRes = await api.get(`/customer/orders/${id}`);
        setOrder(orderRes.data);

        try {
          const delRes = await api.get(`/delivery/order/${id}`);
          setDelivery(delRes.data);
          if (delRes.data?.currentLat && delRes.data?.currentLng) {
            setRiderPos([delRes.data.currentLat, delRes.data.currentLng]);
          }
          if (delRes.data?.etaMinutes != null) {
            setEtaMinutes(delRes.data.etaMinutes);
          }
          if (delRes.data?.distanceKm != null) {
            setRemainingKm(delRes.data.distanceKm);
          }
        } catch {
          // Delivery record might not exist until assigned
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderAndDelivery();

    // Subscribe to real-time status and live GPS location via STOMP WebSocket
    const unsubStatus = subscribeToTopic(`/topic/orders/${id}/status`, (msg) => {
      setOrder(prev => prev ? { ...prev, ...msg, status: msg.status || prev.status } : msg);
      if (msg?.etaMinutes != null) {
        setEtaMinutes(Math.round(msg.etaMinutes));
      }
    });

    const unsubLoc = subscribeToTopic(`/topic/orders/${id}/location`, (loc) => {
      if (loc?.latitude && loc?.longitude) {
        setRiderPos([loc.latitude, loc.longitude]);
      } else if (loc?.currentLat && loc?.currentLng) {
        setRiderPos([loc.currentLat, loc.currentLng]);
      } else if (loc?.lat && loc?.lng) {
        setRiderPos([loc.lat, loc.lng]);
      }
      if (loc?.etaMinutes != null) {
        setEtaMinutes(Math.round(loc.etaMinutes));
      }
      if (loc?.remainingDistanceKm != null) {
        setRemainingKm(Math.round(loc.remainingDistanceKm * 10) / 10);
      }
    });

    return () => {
      if (unsubStatus) unsubStatus();
      if (unsubLoc) unsubLoc();
    };
  }, [id]);

  // Clean PDF Invoice Download
  const handleDownloadInvoice = async () => {
    setDownloadingInvoice(true);
    try {
      const token = localStorage.getItem('meditrack_token');
      const baseUrl = import.meta.env.VITE_API_URL || (window.location.port === '5173' ? 'http://localhost:8080/api' : '/api');
      
      // Request PDF invoice from /api/orders/{id}/invoice
      let response = await fetch(`${baseUrl}/orders/${id}/invoice`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        // Fallback to customer namespace
        response = await fetch(`${baseUrl}/customer/orders/${id}/invoice`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (!response.ok) {
        throw new Error('Invoice PDF is not available yet');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MediTrack-Invoice-${order?.orderNumber || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);

      setToastMsg(`GST Tax Invoice INV-${order?.orderNumber || id} downloaded successfully.`);
      setTimeout(() => setToastMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Invoice download failed');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const promptCancelOrder = () => {
    setConfirmDialog({
      isOpen: true,
      title: `Cancel Order: ${order.orderNumber}`,
      message: `Are you sure you want to cancel this order? Any reserved medicine batch inventory will be released back to pharmacy stock.`,
      confirmText: 'Yes, Cancel Order',
      cancelText: 'Keep Order',
      variant: 'danger',
      onConfirm: executeCancelOrder,
    });
  };

  const executeCancelOrder = async () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    try {
      await api.post(`/customer/orders/${id}/cancel`, { reason: 'Customer requested cancellation' });
      const orderRes = await api.get(`/customer/orders/${id}`);
      setOrder(orderRes.data);
      setReturnSuccessMsg('Order has been successfully cancelled.');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to cancel order');
    }
  };

  const promptSubmitReturn = (e) => {
    e.preventDefault();
    if (!returnReason.trim()) return;
    setConfirmDialog({
      isOpen: true,
      title: `Submit Return Request: Order ${order.orderNumber}`,
      message: `Confirm submitting return request for reason: "${returnReason}"? In compliance with CDSCO guidelines, unbroken tamper seal must be verified by a pharmacist before refund is processed.`,
      confirmText: 'Confirm & Submit',
      cancelText: 'Cancel',
      variant: 'primary',
      onConfirm: executeRequestReturn,
    });
  };

  const executeRequestReturn = async () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    setReturnSubmitting(true);
    try {
      await api.post(`/customer/orders/${id}/returns`, {
        reason: returnReason,
        condition: 'UNOPENED'
      });
      setReturnSuccessMsg('Return request submitted for pharmacist quality review.');
      setShowReturnModal(false);
      setReturnReason('');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to submit return');
    } finally {
      setReturnSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-neutral-500">
        Loading order tracking details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <h2 className="text-sm font-semibold text-neutral-900">Order Not Found</h2>
        <Link to="/customer/orders" className="text-xs text-brand hover:underline mt-2 inline-block">
          Return to My Orders
        </Link>
      </div>
    );
  }

  const destLat = order.deliveryLat || 12.9304;
  const destLng = order.deliveryLng || 77.6784;
  const routeDistanceKm = calculateRoadDistance(12.9716, 77.5946, destLat, destLng);
  const liveRemainingKm = remainingKm != null ? remainingKm : routeDistanceKm;
  const effectiveEta = etaMinutes != null 
    ? etaMinutes 
    : Math.max(10, Math.round(4.0 + (routeDistanceKm / 22.0) * 60.0));

  // Lifecycle steps for vertical timeline
  const steps = [
    { key: 'PLACED', label: 'Order Placed', desc: 'Order received & stock reserved' },
    ...(order.hasRxItems ? [{ key: 'PRESCRIPTION_PENDING', label: 'Pharmacist Rx Review', desc: 'Doctor registration & dosage verification' }] : []),
    { key: 'CONFIRMED', label: 'Order Confirmed', desc: 'Accepted for pharmacy dispensing' },
    { key: 'PROCESSING', label: 'FEFO Item Picking & Packing', desc: 'Earliest expiring batches allocated' },
    { key: 'READY_FOR_PICKUP', label: 'Packed & Ready', desc: 'Pickup code generated for delivery partner' },
    { key: 'PICKED_UP', label: 'Picked Up by Courier', desc: 'Partner verified pickup code at counter' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'En route with live GPS route' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Verified with recipient OTP' },
  ];

  const getStepStatus = (stepKey) => {
    const orderStatuses = [
      'PLACED',
      'PRESCRIPTION_PENDING',
      'CONFIRMED',
      'PROCESSING',
      'READY_FOR_PICKUP',
      'ASSIGNED',
      'PICKED_UP',
      'OUT_FOR_DELIVERY',
      'DELIVERED'
    ];
    const currentIndex = orderStatuses.indexOf(order.status);
    const stepIndex = orderStatuses.indexOf(stepKey);

    if (order.status === 'REJECTED' && stepKey === 'PRESCRIPTION_PENDING') return 'failed';
    if (order.status === 'CANCELLED') return 'cancelled';
    if (currentIndex >= stepIndex) return 'done';
    if (currentIndex === stepIndex - 1) return 'current';
    return 'pending';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top action navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link to="/customer/orders" className="text-xs text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Orders
        </Link>

        <div className="flex items-center gap-2">
          {(order.status === 'PLACED' || order.status === 'PRESCRIPTION_PENDING' || order.status === 'CONFIRMED') && (
            <button
              onClick={promptCancelOrder}
              className="text-xs font-medium px-3 py-1.5 rounded-control border border-red-200 text-semantic-danger hover:bg-red-50 inline-flex items-center gap-1.5 shadow-sm"
            >
              Cancel Order
            </button>
          )}

          {order.status === 'DELIVERED' && (
            <button
              onClick={() => setShowReturnModal(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-control border border-neutral-300 text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1.5 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-500" /> Request Return
            </button>
          )}

          {/* Clean Invoice Download Button */}
          <button
            onClick={handleDownloadInvoice}
            disabled={downloadingInvoice}
            className="text-xs font-medium px-3.5 py-1.5 rounded-control bg-brand text-white hover:bg-brand-pressed inline-flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            title="Download clean GST PDF invoice"
          >
            {downloadingInvoice ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Invoice...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>GST Invoice PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification Banners */}
      {toastMsg && (
        <div className="p-3.5 bg-teal-50 border border-teal-200 text-brand-pressed text-xs rounded-control flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand" />
            <span className="font-medium">{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg('')} className="font-semibold text-xs text-brand hover:underline">Dismiss</button>
        </div>
      )}

      {returnSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-control flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{returnSuccessMsg}</span>
          </div>
          <button onClick={() => setReturnSuccessMsg('')} className="font-semibold text-xs">Dismiss</button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-panel border border-neutral-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-neutral-900 font-mono-numbers">
              Order {order.orderNumber}
            </h1>
            <StatusChip status={order.status} />
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Placed on {new Date(order.placedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Prominent Delivery OTP Box */}
        {order.status !== 'CANCELLED' && order.status !== 'REJECTED' && (
          <div className="bg-brand-tint border border-teal-200 rounded-panel px-4 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
              <Key className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand block">
                Your Delivery OTP:
              </span>
              <span className="text-xl font-bold font-mono-numbers text-brand-pressed tracking-widest">
                {order.deliveryOtp || '4829'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Map & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Delivery Tracking Map */}
          <div className="bg-white rounded-panel border border-neutral-200 p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand" />
                <span>Live Fulfillment & Delivery Map</span>
              </h2>

              <div>
                {order.status === 'DELIVERED' ? (
                  <span className="text-xs font-semibold text-semantic-success bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    ✓ Delivered
                  </span>
                ) : order.status === 'OUT_FOR_DELIVERY' ? (
                  <span className="text-xs font-semibold text-brand bg-brand-tint px-2.5 py-1 rounded border border-teal-200 font-mono-numbers">
                    ETA: ~{effectiveEta} mins ({liveRemainingKm} km away)
                  </span>
                ) : order.status === 'PICKED_UP' ? (
                  <span className="text-xs font-medium text-brand bg-brand-tint px-2.5 py-1 rounded border border-teal-200 font-mono-numbers">
                    Picked up • Transit ~{effectiveEta} mins ({routeDistanceKm} km)
                  </span>
                ) : (
                  <span className="text-xs text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded border border-neutral-200 font-mono-numbers">
                    Est. delivery: ~{effectiveEta} mins ({routeDistanceKm} km route)
                  </span>
                )}
              </div>
            </div>

            {/* Standard Clean Map */}
            <TrackingMap 
              pharmacyPos={[12.9716, 77.5946]}
              customerPos={[destLat, destLng]}
              riderPos={riderPos}
              status={order.status}
            />

            <div className="text-[11px] text-neutral-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1">
              <span><strong>Pharmacy Origin:</strong> Central Dispensing Hub (Brigade Rd)</span>
              <span><strong>Destination:</strong> {order.deliveryAddressSnapshot}</span>
            </div>
          </div>

          {/* Vertical Timeline */}
          <div className="bg-white rounded-panel border border-neutral-200 p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Clock className="w-4 h-4 text-brand" />
              <span>Dispensing Lifecycle Timeline</span>
            </h2>

            <div className="space-y-6 pl-2">
              {steps.map((st, idx) => {
                const stepState = getStepStatus(st.key);
                const isLast = idx === steps.length - 1;

                return (
                  <div key={st.key} className="relative flex items-start gap-4">
                    {/* Line connector */}
                    {!isLast && (
                      <div 
                        className={`absolute left-3 top-6 w-0.5 h-10 ${
                          stepState === 'done' ? 'bg-brand' : 'bg-neutral-200'
                        }`} 
                      />
                    )}

                    {/* Step Icon */}
                    <div className="relative z-10">
                      {stepState === 'done' ? (
                        <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 stroke-[2]" />
                        </div>
                      ) : stepState === 'current' ? (
                        <div className="w-6 h-6 rounded-full bg-brand-tint border-2 border-brand flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-brand animate-ping" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center text-neutral-400">
                          <Circle className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="pt-0.5">
                      <div className={`text-xs font-semibold ${
                        stepState === 'done' ? 'text-neutral-900' :
                        stepState === 'current' ? 'text-brand' : 'text-neutral-400'
                      }`}>
                        {st.label}
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {st.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Items, Batch Breakdown & Invoice Download */}
        <div className="bg-white rounded-panel border border-neutral-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Pill className="w-4 h-4 text-brand" />
              <span>Medication Batch Allocations</span>
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 text-xs">
            {order.items?.map((item) => (
              <div key={item.id} className="py-2.5 space-y-1">
                <div className="flex justify-between font-medium text-neutral-900">
                  <span>{item.quantity}x {item.product.name}</span>
                  <span className="font-mono-numbers">₹{item.lineTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-500 font-mono-numbers">
                  <span>Batch: {item.batchNumber || 'Assigned on pick'}</span>
                  <span>Exp: {item.batchExpiry ? new Date(item.batchExpiry).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'FEFO'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-200 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Items Total:</span>
              <span className="font-mono-numbers">₹{order.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Delivery Charges:</span>
              <span className="font-mono-numbers text-semantic-success">FREE</span>
            </div>
            {order.hasRxItems && (
              <div className="flex items-center gap-1.5 text-[11px] text-teal-700 bg-teal-50 p-2 rounded">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Verified by Registered Pharmacist</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-sm text-neutral-900 pt-2 border-t border-neutral-100">
              <span>Total Paid ({order.paymentMethod}):</span>
              <span className="font-mono-numbers text-brand">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Quick Invoice Download Box */}
          <div className="p-3.5 bg-neutral-50 rounded-control border border-neutral-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand" /> Tax Invoice
              </span>
              <span className="text-[10px] text-neutral-500 font-mono-numbers">INV-{order.orderNumber}</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              CDSCO compliant tax invoice with full GST breakdown, manufacturer batches & QR code.
            </p>
            <button
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
              className="w-full text-xs font-semibold py-2 px-3 rounded-control bg-brand hover:bg-brand-pressed text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {downloadingInvoice ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Preparing PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Clean PDF Invoice</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3 bg-neutral-50 rounded-control border border-neutral-200 text-[11px] text-neutral-600 space-y-1">
            <div className="font-semibold text-neutral-800">Delivery Instructions:</div>
            <div>Please keep exact cash ready if paying by COD. Handover 4-digit OTP to rider once package seal is verified.</div>
          </div>
        </div>

      </div>

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-panel border border-neutral-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-semibold text-sm text-neutral-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-brand" /> Request Medication Return
              </h3>
              <button 
                onClick={() => setShowReturnModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-neutral-600 space-y-2">
              <p>
                In compliance with CDSCO regulatory requirements, returned medicines must have unbroken safety seals and must not require strict cold-chain refrigeration.
              </p>
              
              <label className="block font-medium text-neutral-700 mt-3">Reason for Return *</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full h-8 px-2 border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-brand focus:border-brand"
                required
              >
                <option value="">Select a reason...</option>
                <option value="Physician modified prescription dosage">Physician modified prescription dosage</option>
                <option value="Damaged outer tamper seal upon delivery">Damaged outer tamper seal upon delivery</option>
                <option value="Ordered incorrect strength or formulation">Ordered incorrect strength or formulation</option>
                <option value="Patient experienced adverse reaction">Patient experienced adverse reaction</option>
                <option value="Delivered item did not match order">Delivered item did not match order</option>
              </select>

              <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded text-[11px] text-neutral-500 mt-2">
                <strong>Inspection Guarantee:</strong> A pharmacist will inspect the batch number ({order.items?.[0]?.batchNumber || 'Batch'}) and seal integrity before refund or store credit release.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setShowReturnModal(false)}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                disabled={!returnReason || returnSubmitting}
                onClick={promptSubmitReturn}
              >
                {returnSubmitting ? 'Submitting...' : 'Confirm Return Request'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Dialog */}
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
