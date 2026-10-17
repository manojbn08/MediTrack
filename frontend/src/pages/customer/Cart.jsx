import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import RxBadge from '../../components/RxBadge';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, FileWarning } from 'lucide-react';

export default function Cart({ cart, onUpdateQuantity, onRemoveItem }) {
  const navigate = useNavigate();

  const items = cart?.items || [];
  const hasRx = items.some(item => item.product.requiresPrescription);

  const subtotal = items.reduce((acc, item) => acc + (item.product.mrp * item.quantity), 0);
  const deliveryFee = subtotal >= 500.0 || items.length === 0 ? 0.0 : 40.0;
  const estimatedTotal = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
          <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h2 className="text-lg font-semibold text-neutral-900">Your Cart is Empty</h2>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          Add over-the-counter or prescription medicines from our verified catalog to place an order.
        </p>
        <Link to="/products" className="inline-block mt-6">
          <Button size="md">
            Browse Medicines Catalog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-6">
        Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-3">
          
          {hasRx && (
            <div className="p-3.5 bg-semantic-warning-tint border border-amber-200 rounded-control flex items-start gap-3 text-xs text-amber-900">
              <FileWarning className="w-4 h-4 text-semantic-warning shrink-0 mt-0.5" />
              <div>
                <strong>Prescription item(s) in cart:</strong> A valid doctor's prescription will be required at checkout for pharmacist approval before dispensing.
              </div>
            </div>
          )}

          <div className="bg-white rounded-panel border border-neutral-200 divide-y divide-neutral-100">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono-numbers text-neutral-500 uppercase">
                      {item.product.category?.name}
                    </span>
                    {item.product.requiresPrescription && <RxBadge />}
                  </div>

                  <h3 className="text-sm font-semibold text-neutral-900">
                    {item.product.name}
                  </h3>

                  <p className="text-xs text-neutral-500 italic">
                    Salt: {item.product.genericName} • {item.product.packSize}
                  </p>

                  <div className="text-sm font-semibold text-neutral-900 font-mono-numbers pt-1">
                    ₹{item.product.mrp.toFixed(2)}
                  </div>
                </div>

                {/* Quantity Controls & Remove */}
                <div className="flex items-center justify-between sm:justify-end gap-6">
                  <div className="flex items-center border border-neutral-300 rounded-control bg-neutral-50">
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                      disabled={item.quantity <= 1}
                      className="p-1.5 text-neutral-600 hover:text-neutral-900 disabled:opacity-40"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-semibold font-mono-numbers text-neutral-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1.5 text-neutral-600 hover:text-neutral-900"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-neutral-900 font-mono-numbers">
                      ₹{(item.product.mrp * item.quantity).toFixed(2)}
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="text-xs text-semantic-danger hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>

        {/* Order Summary Sidebar */}
        <div className="bg-white rounded-panel border border-neutral-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
            Order Summary
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Items Subtotal:</span>
              <span className="font-mono-numbers text-neutral-900 font-medium">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-neutral-600">
              <span>Delivery Fee:</span>
              <span className="font-mono-numbers text-neutral-900 font-medium">
                {deliveryFee === 0 ? <span className="text-semantic-success font-semibold">FREE (Over ₹500)</span> : `₹${deliveryFee.toFixed(2)}`}
              </span>
            </div>

            <div className="flex justify-between text-neutral-500 pt-1 text-[11px]">
              <span>Applicable GST (included):</span>
              <span className="font-mono-numbers">₹{(subtotal * 0.107).toFixed(2)}</span>
            </div>

            <div className="border-t border-neutral-200 pt-3 flex justify-between text-sm font-semibold text-neutral-900">
              <span>Estimated Total:</span>
              <span className="font-mono-numbers text-base text-brand">₹{estimatedTotal.toFixed(2)}</span>
            </div>
          </div>

          <Button 
            className="w-full h-10 mt-2" 
            onClick={() => navigate('/checkout')}
          >
            Proceed to Checkout
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>

          <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 justify-center pt-2">
            <ShieldCheck className="w-4 h-4 text-brand" />
            <span>Secure 256-bit Encrypted Checkout</span>
          </div>
        </div>

      </div>
    </div>
  );
}
