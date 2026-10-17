import React from 'react';
import { AlertCircle, CheckCircle, HelpCircle, X } from 'lucide-react';
import Button from './Button';

export default function ConfirmModal({
  isOpen,
  title = 'Confirmation Required',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Accept',
  cancelText = 'Reject',
  variant = 'primary', // 'primary' | 'danger' | 'success'
  onConfirm,
  onCancel,
  children
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-panel border border-neutral-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              variant === 'danger' 
                ? 'bg-red-50 text-semantic-danger border border-red-200' 
                : variant === 'success'
                ? 'bg-emerald-50 text-semantic-success border border-emerald-200'
                : 'bg-teal-50 text-brand border border-teal-200'
            }`}>
              {variant === 'danger' ? (
                <AlertCircle className="w-5 h-5" />
              ) : variant === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <HelpCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900 leading-tight">
                {title}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">Please confirm your decision below</p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-control transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-neutral-700 leading-relaxed bg-neutral-50/70 p-3.5 rounded-control border border-neutral-100">
          {message}
          {children}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            className="px-4 text-xs font-medium text-neutral-700 border-neutral-300 hover:bg-neutral-100"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            className={`px-5 text-xs font-semibold ${
              variant === 'success' ? 'bg-semantic-success hover:bg-emerald-700 text-white' : ''
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
