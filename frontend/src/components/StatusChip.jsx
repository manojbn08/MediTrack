import React from 'react';

const STATUS_MAP = {
  PLACED: { label: 'Order Placed', dot: 'bg-neutral-500', text: 'text-neutral-700', bg: 'bg-neutral-100' },
  PRESCRIPTION_PENDING: { label: 'Rx Review Pending', dot: 'bg-semantic-warning', text: 'text-semantic-warning', bg: 'bg-semantic-warning-tint' },
  CONFIRMED: { label: 'Confirmed', dot: 'bg-semantic-info', text: 'text-semantic-info', bg: 'bg-semantic-info-tint' },
  PROCESSING: { label: 'Packing Items', dot: 'bg-semantic-info', text: 'text-semantic-info', bg: 'bg-semantic-info-tint' },
  READY_FOR_PICKUP: { label: 'Ready for Pickup', dot: 'bg-brand', text: 'text-brand', bg: 'bg-brand-tint' },
  ASSIGNED: { label: 'Rider Assigned', dot: 'bg-brand', text: 'text-brand', bg: 'bg-brand-tint' },
  PICKED_UP: { label: 'Picked Up', dot: 'bg-brand', text: 'text-brand', bg: 'bg-brand-tint' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', dot: 'bg-brand animate-pulse', text: 'text-brand', bg: 'bg-brand-tint' },
  DELIVERED: { label: 'Delivered', dot: 'bg-semantic-success', text: 'text-semantic-success', bg: 'bg-semantic-success-tint' },
  DELIVERY_FAILED: { label: 'Delivery Failed', dot: 'bg-semantic-danger', text: 'text-semantic-danger', bg: 'bg-semantic-danger-tint' },
  REJECTED: { label: 'Rx Rejected', dot: 'bg-semantic-danger', text: 'text-semantic-danger', bg: 'bg-semantic-danger-tint' },
  CANCELLED: { label: 'Cancelled', dot: 'bg-neutral-500', text: 'text-neutral-600', bg: 'bg-neutral-200' },
};

export default function StatusChip({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, dot: 'bg-neutral-400', text: 'text-neutral-700', bg: 'bg-neutral-100' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-neutral-200 ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
    </span>
  );
}
