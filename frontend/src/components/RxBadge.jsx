import React from 'react';
import { FileWarning } from 'lucide-react';

export default function RxBadge({ className = '' }) {
  return (
    <span 
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide 
                 text-semantic-danger bg-semantic-danger-tint border border-red-200 rounded-[4px] font-mono-numbers uppercase ${className}`}
      title="Prescription Required by Law (Schedule H/H1)"
    >
      <FileWarning className="w-3 h-3 stroke-[2]" />
      Rx Required
    </span>
  );
}
