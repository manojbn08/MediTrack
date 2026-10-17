import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { subscribeToTopic } from '../../api/websocket';
import Button from '../../components/Button';
import RxBadge from '../../components/RxBadge';
import StatusChip from '../../components/StatusChip';
import { 
  ClipboardCheck, 
  Package, 
  Boxes, 
  AlertTriangle, 
  Check, 
  X, 
  Plus, 
  FileText, 
  Clock, 
  ShieldCheck, 
  Calendar,
  RotateCcw,
  Sparkles,
  Phone,
  UserCheck
} from 'lucide-react';

export default function PharmacistWorkstation() {
  const [activeTab, setActiveTab] = useState('rx'); // 'rx', 'orders', 'returns', 'inventory'
  
  // Data states
  const [pendingRx, setPendingRx] = useState([]);
  const [selectedRx, setSelectedRx] = useState(null);
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [nearExpiryBatches, setNearExpiryBatches] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  
  // Substitutes state
  const [substitutesModalOpen, setSubstitutesModalOpen] = useState(false);
  const [selectedProductForSubs, setSelectedProductForSubs] = useState(null);
  const [substitutesList, setSubstitutesList] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Actions states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // New batch form state
  const [newBatch, setNewBatch] = useState({
    productId: '',
    batchNumber: '',
    expiryDate: '',
    purchasePrice: '',
    sellingPrice: '',
    quantity: '',
  });

  const loadData = async () => {
    try {
      const [rxRes, ordersRes, returnsRes, invRes, expRes, lowRes] = await Promise.all([
        api.get('/pharmacist/prescriptions?status=PENDING').catch(() => ({ data: [] })),
        api.get('/pharmacist/orders').catch(() => ({ data: [] })),
        api.get('/pharmacist/returns').catch(() => ({ data: [] })),
        api.get('/pharmacist/inventory').catch(() => ({ data: [] })),
        api.get('/pharmacist/alerts/near-expiry').catch(() => ({ data: [] })),
        api.get('/pharmacist/alerts/low-stock').catch(() => ({ data: [] })),
      ]);

      const rxList = rxRes.data || [];
      setPendingRx(rxList);
      if (rxList.length > 0 && !selectedRx) {
        setSelectedRx(rxList[0]);
      } else if (rxList.length === 0) {
        setSelectedRx(null);
      }

      setOrders(ordersRes.data || []);
      setReturns(returnsRes.data || []);
      setInventory(invRes.data || []);
      setNearExpiryBatches(expRes.data || []);
      setLowStockProducts(lowRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time incoming orders for pharmacy dispensing
    const unsubOrders = subscribeToTopic('/topic/pharmacist/orders', (incoming) => {
      setFeedbackMessage(`New order #${incoming.orderNumber || incoming.id} received in real time!`);
      loadData();
    });

    return () => {
      if (unsubOrders) unsubOrders();
    };
  }, []);

  const handleInspectReturn = async (returnId, decision) => {
    try {
      const notes = prompt(`Enter inspection verification notes for ${decision}:`, 'Outer packaging and tamper seal verified by licensed pharmacist') || 'Pharmacist verified';
      await api.post(`/pharmacist/returns/${returnId}/inspect`, {
        decision,
        notes
      });
      setFeedbackMessage(`Return #${returnId} marked as ${decision}.`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Inspection update failed');
    }
  };

  const handleFetchSubstitutes = async (product) => {
    setSelectedProductForSubs(product);
    setSubstitutesModalOpen(true);
    setLoadingSubs(true);
    try {
      const res = await api.get(`/catalog/products/${product.id}/substitutes`);
      setSubstitutesList(res.data || []);
    } catch (err) {
      setSubstitutesList([]);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleApproveRx = async () => {
    if (!selectedRx) return;
    setActionLoading(true);
    try {
      await api.post(`/pharmacist/prescriptions/${selectedRx.id}/approve`, {
        doctorRegNo: selectedRx.doctorRegNo || 'MCI-KA-1998-04218',
        notes: 'Approved by Registered Pharmacist after clinical verification',
      });
      setFeedbackMessage(`Prescription for ${selectedRx.patientName} approved successfully.`);
      loadData();
    } catch (err) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRx = async () => {
    if (!selectedRx || !rejectReason.trim()) {
      alert('Please specify a valid rejection reason.');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/pharmacist/prescriptions/${selectedRx.id}/reject`, {
        reason: rejectReason.trim(),
      });
      setFeedbackMessage(`Prescription rejected: ${rejectReason}`);
      setRejectModalOpen(false);
      setRejectReason('');
      loadData();
    } catch (err) {
      alert(err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      await api.post(`/pharmacist/orders/${orderId}/accept`);
      loadData();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const handleMarkReady = async (orderId) => {
    try {
      await api.post(`/pharmacist/orders/${orderId}/ready`);
      setFeedbackMessage('Order packed! Pickup code generated for courier.');
      loadData();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pharmacist/batches', newBatch);
      setFeedbackMessage(`Batch ${newBatch.batchNumber} added successfully.`);
      setNewBatch({ productId: '', batchNumber: '', expiryDate: '', purchasePrice: '', sellingPrice: '', quantity: '' });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to add batch');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Pharmacist Dispensing Workstation</h1>
            <span className="px-2 py-0.5 rounded-full bg-brand-tint text-brand text-xs font-semibold font-mono-numbers">
              Licensed Hub #1
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Clinical review queue, FEFO batch fulfillment, and regulatory Schedule H/H1 registers
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-control border border-neutral-300 text-xs">
          <button
            onClick={() => setActiveTab('rx')}
            className={`px-3 py-1.5 rounded-control font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'rx' ? 'bg-white text-brand shadow-sm font-semibold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Rx Review Queue ({pendingRx.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-control font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'orders' ? 'bg-white text-brand shadow-sm font-semibold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Fulfillment Orders ({orders.filter(o => o.status === 'CONFIRMED' || o.status === 'PROCESSING').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`px-3 py-1.5 rounded-control font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'returns' ? 'bg-white text-brand shadow-sm font-semibold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Returns Inspection ({returns.filter(r => r.inspectionStatus === 'PENDING').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-control font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'inventory' ? 'bg-white text-brand shadow-sm font-semibold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Stock & Alerts ({nearExpiryBatches.length + lowStockProducts.length})</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-brand-tint border border-teal-200 text-brand text-xs rounded-control flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage('')} className="text-brand hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: Prescription Split-View Verification Queue */}
      {activeTab === 'rx' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Queue List (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-panel border border-neutral-200 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <h2 className="text-xs font-semibold text-neutral-800 uppercase tracking-wide">
                Pending Verification Queue
              </h2>
              <span className="text-xs text-neutral-500 font-mono-numbers">
                {pendingRx.length} Pending
              </span>
            </div>

            {pendingRx.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                <Check className="w-6 h-6 text-semantic-success mx-auto mb-2" />
                All prescriptions reviewed! Queue is clear.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRx.map((rx) => {
                  const isSelected = selectedRx?.id === rx.id;
                  return (
                    <div
                      key={rx.id}
                      onClick={() => setSelectedRx(rx)}
                      className={`p-3 rounded-control border cursor-pointer text-xs transition-all ${
                        isSelected 
                          ? 'border-brand bg-brand-tint/30 shadow-sm' 
                          : 'border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-neutral-900 font-semibold">{rx.patientName || 'Patient'}</strong>
                        <span className="text-[10px] font-mono-numbers bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600">
                          ID: #{rx.id}
                        </span>
                      </div>
                      <div className="text-neutral-600 text-[11px]">
                        Prescriber: {rx.doctorName || 'Dr. Consultation'}
                      </div>
                      <div className="text-neutral-400 text-[10px] mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Uploaded: {new Date(rx.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Split Detail & Document Viewer (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-panel border border-neutral-200 p-6 space-y-5 shadow-sm">
            {selectedRx ? (
              <>
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900">
                      Prescription Review: {selectedRx.patientName}
                    </h2>
                    <span className="text-xs text-neutral-500">
                      Doctor Reg No: <strong>{selectedRx.doctorRegNo || 'MCI-KA-1998-04218'}</strong>
                    </span>
                  </div>

                  {/* Approve / Reject Buttons */}
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => setRejectModalOpen(true)}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Reject Rx
                    </Button>

                    <Button 
                      size="sm" 
                      variant="primary"
                      loading={actionLoading}
                      onClick={handleApproveRx}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Approve Dispensing
                    </Button>
                  </div>
                </div>

                {/* Prescription Image / Document Viewer */}
                <div className="border border-neutral-300 rounded-panel overflow-hidden bg-neutral-900 flex items-center justify-center min-h-[360px] relative">
                  {selectedRx.fileUrl ? (
                    <img 
                      src={selectedRx.fileUrl} 
                      alt="Uploaded Prescription" 
                      className="max-h-[460px] w-auto object-contain mx-auto"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80";
                      }}
                    />
                  ) : (
                    <div className="text-neutral-400 text-xs">No image file preview available</div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-[10px] text-white font-mono-numbers">
                    Preview Mode: 100% Zoom
                  </div>
                </div>

                {/* Verification Checklist */}
                <div className="bg-neutral-50 p-4 rounded-control border border-neutral-200 text-xs space-y-2">
                  <h3 className="font-semibold text-neutral-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-brand" /> Pharmacist Mandated Verification Checklist
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600">
                    <div>• Patient Name and Age Identified</div>
                    <div>• Registered Medical Practitioner No. Valid</div>
                    <div>• Prescription Date within 6 months</div>
                    <div>• Drug Schedule H/H1 limits respected</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-24 text-center text-xs text-neutral-400">
                Select a prescription from the queue on the left to inspect details.
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: Order Fulfillment & Packing Queue */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white rounded-panel border border-neutral-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-900 mb-3">Active Dispensing Queue</h2>
            
            <div className="divide-y divide-neutral-200 text-xs">
              {orders.map((o) => (
                <div key={o.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold font-mono-numbers text-neutral-900">{o.orderNumber}</span>
                      <StatusChip status={o.status} />
                      {o.hasRxItems && <RxBadge />}
                    </div>
                    
                    <div className="text-neutral-600">
                      Customer: <strong>{o.customerName}</strong> ({o.customerPhone})
                    </div>

                    <div className="text-neutral-500 text-[11px] flex flex-wrap items-center gap-1.5 pt-1">
                      <span>Items:</span>
                      {o.items?.map(it => (
                        <span key={it.id} className="inline-flex items-center gap-1 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">
                          <span>{it.quantity}x {it.product.name} ({it.batchNumber || 'Auto-FEFO'})</span>
                          <button
                            type="button"
                            onClick={() => handleFetchSubstitutes(it.product)}
                            title="Check generic bio-equivalent substitutes"
                            className="text-[10px] text-brand hover:underline font-medium"
                          >
                            [Substitutes]
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-neutral-500 block">Total Value:</span>
                      <strong className="text-sm font-mono-numbers text-neutral-900">₹{o.totalAmount.toFixed(2)}</strong>
                    </div>

                    {o.status === 'CONFIRMED' && (
                      <Button size="sm" onClick={() => handleAcceptOrder(o.id)}>
                        Start Picking
                      </Button>
                    )}

                    {o.status === 'PROCESSING' && (
                      <Button size="sm" variant="primary" onClick={() => handleMarkReady(o.id)}>
                        Pack & Ready for Pickup
                      </Button>
                    )}

                    {o.status === 'READY_FOR_PICKUP' && (
                      <div className="px-3 py-1.5 bg-brand-tint border border-teal-200 rounded-control text-xs text-brand font-mono-numbers font-semibold">
                        Pickup Code: {o.pickupCode}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Returns Inspection */}
      {activeTab === 'returns' && (
        <div className="bg-white rounded-panel border border-neutral-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm text-neutral-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-brand" /> Returned Medication Quality Inspection
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Mandatory CDSCO reverse logistics verification: assess tamper seal integrity and cold chain compliance before approving stock disposition
              </p>
            </div>
            <span className="text-xs font-mono-numbers px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
              {returns.filter(r => r.inspectionStatus === 'PENDING').length} Pending Inspection
            </span>
          </div>

          {returns.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              <Check className="w-6 h-6 text-semantic-success mx-auto mb-2" />
              No customer return requests in queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Return ID</th>
                    <th className="py-2.5 px-4">Order ID</th>
                    <th className="py-2.5 px-4">Customer Reason</th>
                    <th className="py-2.5 px-4">Reported Condition</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Pharmacist Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {returns.map(r => (
                    <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4 font-mono-numbers text-neutral-500 font-medium">#{r.id}</td>
                      <td className="py-3 px-4 font-mono-numbers font-semibold text-neutral-900">Order #{r.orderId}</td>
                      <td className="py-3 px-4 text-neutral-700 max-w-xs">{r.reason}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono-numbers bg-neutral-100 text-neutral-700">
                          {r.packageCondition || 'UNOPENED'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          r.inspectionStatus === 'APPROVED' ? 'bg-semantic-success-tint text-semantic-success' :
                          r.inspectionStatus === 'REJECTED' ? 'bg-semantic-danger-tint text-semantic-danger' :
                          'bg-semantic-warning-tint text-semantic-warning'
                        }`}>
                          {r.inspectionStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {r.inspectionStatus === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleInspectReturn(r.id, 'APPROVED')}
                              className="px-2.5 py-1 bg-semantic-success text-white rounded text-xs font-medium hover:bg-emerald-700 shadow-sm"
                            >
                              Approve & Refund
                            </button>
                            <button
                              onClick={() => handleInspectReturn(r.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-white border border-semantic-danger text-semantic-danger rounded text-xs font-medium hover:bg-rose-50"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-neutral-400 italic">Inspected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Inventory & FEFO Expiry Management */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          
          {/* Alerts Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Near Expiry Alert Card */}
            <div className="p-4 bg-semantic-warning-tint border border-amber-200 rounded-panel space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-semantic-warning" />
                <span>Batches Expiring Soon (&le; 60 Days): {nearExpiryBatches.length}</span>
              </div>
              <div className="text-xs text-amber-800 divide-y divide-amber-200">
                {nearExpiryBatches.map(b => (
                  <div key={b.id} className="py-1.5 flex justify-between font-mono-numbers">
                    <span>{b.product.name} [Batch: {b.batchNumber}]</span>
                    <span className="font-semibold text-semantic-danger">
                      Expires: {b.expiryDate} ({b.daysToExpiry} days left)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock Alert Card */}
            <div className="p-4 bg-semantic-danger-tint border border-red-200 rounded-panel space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-900">
                <AlertTriangle className="w-4 h-4 text-semantic-danger" />
                <span>Low Stock Reorder Alerts: {lowStockProducts.length}</span>
              </div>
              <div className="text-xs text-red-800 divide-y divide-red-200">
                {lowStockProducts.map(p => (
                  <div key={p.id} className="py-1.5 flex justify-between font-mono-numbers">
                    <span>{p.name} ({p.packSize})</span>
                    <span className="font-semibold">
                      Stock: {p.stockAvailable} (Min Reorder: {p.reorderLevel})
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Add New Batch Form */}
          <div className="bg-white rounded-panel border border-neutral-200 p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-brand" /> Add Stock Batch (FEFO Inward)
            </h2>

            <form onSubmit={handleAddBatch} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-medium mb-1">Product</label>
                <select
                  required
                  value={newBatch.productId}
                  onChange={(e) => setNewBatch({ ...newBatch, productId: e.target.value })}
                  className="w-full h-8 px-2 bg-white border border-neutral-300 rounded-control"
                >
                  <option value="">Select Drug...</option>
                  {inventory.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.strength})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-700 font-medium mb-1">Batch Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BT-DL-2610"
                  value={newBatch.batchNumber}
                  onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                  className="w-full h-8 px-2 bg-white border border-neutral-300 rounded-control font-mono-numbers uppercase"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-medium mb-1">Expiry Date</label>
                <input
                  type="date"
                  required
                  value={newBatch.expiryDate}
                  onChange={(e) => setNewBatch({ ...newBatch, expiryDate: e.target.value })}
                  className="w-full h-8 px-2 bg-white border border-neutral-300 rounded-control font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-medium mb-1">Purchase (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="25.00"
                  value={newBatch.purchasePrice}
                  onChange={(e) => setNewBatch({ ...newBatch, purchasePrice: e.target.value })}
                  className="w-full h-8 px-2 bg-white border border-neutral-300 rounded-control font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-medium mb-1">Selling (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="35.00"
                  value={newBatch.sellingPrice}
                  onChange={(e) => setNewBatch({ ...newBatch, sellingPrice: e.target.value })}
                  className="w-full h-8 px-2 bg-white border border-neutral-300 rounded-control font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-medium mb-1">Quantity</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    placeholder="100"
                    value={newBatch.quantity}
                    onChange={(e) => setNewBatch({ ...newBatch, quantity: e.target.value })}
                    className="w-full h-8 px-2 bg-white border border-neutral-300 rounded-control font-mono-numbers"
                  />
                  <Button type="submit" size="sm" className="h-8 whitespace-nowrap">
                    Add
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* Master Inventory Table */}
          <div className="bg-white rounded-panel border border-neutral-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-neutral-200 font-semibold text-sm text-neutral-900">
              Master Product Inventory & Stock Balance
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">SKU / Code</th>
                    <th className="py-2.5 px-4">Medicine Name</th>
                    <th className="py-2.5 px-4">Salt / Composition</th>
                    <th className="py-2.5 px-4">Schedule</th>
                    <th className="py-2.5 px-4 text-right">MRP (₹)</th>
                    <th className="py-2.5 px-4 text-right">In Stock</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono-numbers">
                  {inventory.map(p => (
                    <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-2.5 px-4 text-neutral-500">{p.sku}</td>
                      <td className="py-2.5 px-4 font-sans font-medium text-neutral-900">{p.name}</td>
                      <td className="py-2.5 px-4 font-sans text-neutral-600 italic">{p.genericName}</td>
                      <td className="py-2.5 px-4">
                        {p.requiresPrescription ? <RxBadge /> : <span className="text-neutral-500 font-sans">OTC</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">₹{p.mrp.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-brand">{p.stockAvailable}</td>
                      <td className="py-2.5 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          p.stockAvailable > p.reorderLevel ? 'bg-semantic-success-tint text-semantic-success' : 'bg-semantic-danger-tint text-semantic-danger'
                        }`}>
                          {p.stockAvailable > p.reorderLevel ? 'Adequate' : 'Reorder Needed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Reject Prescription Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-panel max-w-md w-full p-6 space-y-4 shadow-xl border border-neutral-300">
            <h3 className="text-sm font-semibold text-neutral-900">
              Reject Prescription (Mandatory Regulatory Reason)
            </h3>
            
            <p className="text-xs text-neutral-600">
              Please specify the clinical or legal reason for rejection. This explanation will be delivered immediately to the patient.
            </p>

            <textarea
              rows={3}
              placeholder="e.g., Doctor registration number is illegible, or prescription validity period expired."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={handleRejectRx}>
                Confirm Rejection & Release Stock
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Bio-Equivalent Substitutes Modal */}
      {substitutesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-panel max-w-lg w-full p-6 space-y-4 shadow-xl border border-neutral-300">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-semibold text-sm text-neutral-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand" /> Generic Bio-Equivalent Substitutes
              </h3>
              <button 
                onClick={() => setSubstitutesModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="p-3 bg-brand-tint/30 rounded border border-teal-100">
                <div className="font-semibold text-neutral-900">{selectedProductForSubs?.name}</div>
                <div className="text-[11px] text-neutral-600">
                  Formulation: <strong>{selectedProductForSubs?.genericComposition || selectedProductForSubs?.composition || 'Standard active formulation'}</strong>
                </div>
                <div className="text-[11px] text-neutral-500 font-mono-numbers">
                  Brand MRP: ₹{selectedProductForSubs?.mrp?.toFixed(2)}
                </div>
              </div>

              <div className="font-medium text-neutral-700 pt-1">Cheaper CDSCO-Approved Generic Equivalents:</div>

              {loadingSubs ? (
                <div className="py-6 text-center text-neutral-500">Searching formulary...</div>
              ) : substitutesList.length === 0 ? (
                <div className="p-4 text-center text-neutral-500 bg-neutral-50 rounded">
                  No direct bio-equivalent generic alternatives currently cataloged for this exact salt & strength.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {substitutesList.map(s => (
                    <div key={s.id} className="p-2.5 rounded border border-neutral-200 hover:bg-neutral-50 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-neutral-900">{s.name}</div>
                        <div className="text-[11px] text-neutral-500">{s.manufacturer} • {s.packSize}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-semantic-success font-mono-numbers">₹{s.mrp?.toFixed(2)}</div>
                        {selectedProductForSubs?.mrp && s.mrp < selectedProductForSubs.mrp && (
                          <div className="text-[10px] text-emerald-700 font-medium">
                            Save ₹{(selectedProductForSubs.mrp - s.mrp).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-100">
              <Button size="sm" onClick={() => setSubstitutesModalOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
