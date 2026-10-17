import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import StatusChip from '../../components/StatusChip';
import Button from '../../components/Button';
import { Package, ArrowRight, Clock, MapPin } from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/customer/orders')
      .then(res => setOrders(res.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-xs text-neutral-500">
        Loading orders...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">My Medication Orders</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Track lifecycle progress, pharmacist batch allocations, and live delivery status
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-panel p-12 text-center max-w-md mx-auto">
          <Package className="w-8 h-8 text-neutral-400 mx-auto mb-3 stroke-[1.5]" />
          <h2 className="text-sm font-semibold text-neutral-900">No Orders Placed Yet</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Browse our pharmacy catalog and place an order to track delivery.
          </p>
          <Link to="/products" className="inline-block mt-4">
            <Button size="sm">Browse Medicines</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div 
              key={order.id}
              className="bg-white rounded-panel border border-neutral-200 p-5 hover:border-neutral-300 transition-colors shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-neutral-900 font-mono-numbers">
                    {order.orderNumber}
                  </span>
                  <StatusChip status={order.status} />
                </div>

                <div className="text-xs text-neutral-500 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Placed on {new Date(order.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Order items preview */}
              <div className="py-3 text-xs text-neutral-700 space-y-1">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>
                      {item.quantity}x {item.product.name} ({item.product.strength})
                      {item.batchNumber && (
                        <span className="text-[11px] font-mono-numbers text-neutral-500 ml-2">
                          [Batch: {item.batchNumber}]
                        </span>
                      )}
                    </span>
                    <span className="font-mono-numbers text-neutral-900 font-medium">
                      ₹{item.lineTotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-100">
                <div className="text-xs text-neutral-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="line-clamp-1">{order.deliveryAddressSnapshot}</span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <span className="text-[11px] text-neutral-500 mr-2">Total Amount:</span>
                    <strong className="text-sm font-mono-numbers text-brand">₹{order.totalAmount.toFixed(2)}</strong>
                  </div>

                  <Link to={`/customer/orders/${order.id}/track`}>
                    <Button size="sm" variant="secondary" className="whitespace-nowrap">
                      Track Order <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
