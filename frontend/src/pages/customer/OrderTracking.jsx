import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import StatusChip from '../../components/StatusChip';
import TrackingMap from '../../components/TrackingMap';
import Button from '../../components/Button';
import { 
  ArrowLeft, 
  Key, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Circle, 
  ShieldCheck, 
  Pill, 
  FileText 
} from 'lucide-react';

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderAndDelivery = async () => {
      try {
        const orderRes = await api.get(`/customer/orders/${id}`);
        setOrder(orderRes.data);

        try {
          const delRes = await api.get(`/delivery/order/${id}`);
          setDelivery(delRes.data);
        } catch {
          // Delivery record might not exist until packed
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderAndDelivery();
    const interval = setInterval(fetchOrderAndDelivery, 10000); // Poll status every 10s
    return () => clearInterval(interval);
  }, [id]);

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
      
      <Link to="/customer/orders" className="text-xs text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 font-medium">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to My Orders
      </Link>

      {/* Header bar */}
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
        
        {/* Left Column: Timeline & Live Map */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Leaflet Map */}
          <div className="bg-white rounded-panel border border-neutral-200 p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand" />
                <span>Live Fulfillment & Delivery Map</span>
              </h2>
              <span className="text-xs text-neutral-500 font-mono-numbers">
                ETA: ~{delivery?.etaMinutes || '20'} mins
              </span>
            </div>

            <TrackingMap 
              pharmacyPos={[12.9716, 77.5946]}
              customerPos={[order.deliveryLat || 12.9304, order.deliveryLng || 77.6784]}
              riderPos={[12.9510, 77.6365]}
              status={order.status}
            />

            <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-1">
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

        {/* Right Column: Items & Batch Breakdown */}
        <div className="bg-white rounded-panel border border-neutral-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3 flex items-center gap-2">
            <Pill className="w-4 h-4 text-brand" />
            <span>Medication Batch Allocations</span>
          </h2>

          <div className="divide-y divide-neutral-100 text-xs">
            {order.items?.map((item) => (
              <div key={item.id} className="py-2.5 space-y-1">
                <div className="flex justify-between font-medium text-neutral-900">
                  <span>{item.quantity}x {item.product.name}</span>
                  <span className="font-mono-numbers">₹{item.lineTotal.toFixed(2)}</span>
                </div>

                <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                  <span>{item.product.packSize}</span>
                  {item.batchNumber ? (
                    <span className="font-mono-numbers bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700">
                      Batch: {item.batchNumber}
                    </span>
                  ) : (
                    <span className="italic text-amber-700">Pending pick</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-200 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span className="font-mono-numbers">₹{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Delivery Fee:</span>
              <span className="font-mono-numbers">₹{order.deliveryFee.toFixed(2)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-semantic-success">
                <span>Discount ({order.couponCode}):</span>
                <span className="font-mono-numbers">-₹{order.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-sm text-neutral-900 pt-2 border-t border-neutral-100">
              <span>Total Paid ({order.paymentMethod}):</span>
              <span className="font-mono-numbers text-brand">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-control border border-neutral-200 text-[11px] text-neutral-600 space-y-1 mt-4">
            <div className="font-semibold text-neutral-800">Delivery Instructions:</div>
            <div>Please keep exact cash ready if paying by COD. Handover 4-digit OTP to rider once package seal is verified.</div>
          </div>
        </div>

      </div>
    </div>
  );
}
