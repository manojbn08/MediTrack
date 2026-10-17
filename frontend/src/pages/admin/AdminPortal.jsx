import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Button from '../../components/Button';
import StatusChip from '../../components/StatusChip';
import { 
  ShieldAlert, 
  Users, 
  CheckCircle, 
  Package, 
  Settings, 
  TrendingUp, 
  UserX, 
  UserCheck, 
  Truck,
  FileText,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'approvals', 'orders', 'audit', 'settings'
  const [kpis, setKpis] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeUsers: 0,
    onTimeDeliveryRate: '97.4%',
  });
  const [users, setUsers] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  const loadData = async () => {
    try {
      const [kpiRes, usersRes, appRes, ordersRes, auditRes] = await Promise.all([
        api.get('/admin/dashboard').catch(() => ({ data: {} })),
        api.get('/admin/users').catch(() => ({ data: [] })),
        api.get('/admin/pending-approvals').catch(() => ({ data: [] })),
        api.get('/admin/orders').catch(() => ({ data: [] })),
        api.get('/admin/audit-logs').catch(() => ({ data: [] }))
      ]);

      setKpis(kpiRes.data || kpiRes || {});
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : (Array.isArray(usersRes) ? usersRes : []));
      setApprovals(Array.isArray(appRes.data) ? appRes.data : (Array.isArray(appRes) ? appRes : []));
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : (Array.isArray(ordersRes) ? ordersRes : []));
      setAuditLogs(Array.isArray(auditRes.data) ? auditRes.data : (Array.isArray(auditRes) ? auditRes : []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleUserStatus = async (user) => {
    const nextStatus = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await api.put(`/admin/users/${user.id}/status`, { status: nextStatus });
      setNotification(`User ${user.fullName} is now ${nextStatus}.`);
      loadData();
    } catch (err) {
      alert(err.message || 'Status update failed');
    }
  };

  const handleApprovalAction = async (userId, action) => {
    try {
      if (action === 'approve') {
        await api.post(`/admin/approvals/${userId}/approve`);
        setNotification(`User #${userId} has been approved and notified.`);
      } else {
        const reason = prompt('Enter rejection reason:', 'Credentials did not satisfy compliance standards') || 'Credentials incomplete';
        await api.post(`/admin/approvals/${userId}/reject`, { reason });
        setNotification(`User #${userId} application rejected.`);
      }
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Action failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-brand" />
            <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">System Governance & Analytics</h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Enterprise administration, user compliance, partner verification, and financial oversight
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-control border border-neutral-300 text-xs">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-control font-medium ${activeTab === 'users' ? 'bg-white text-brand shadow-sm font-semibold' : 'text-neutral-600'}`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3 py-1.5 rounded-control font-medium ${activeTab === 'approvals' ? 'bg-white text-brand shadow-sm font-semibold' : 'text-neutral-600'}`}
          >
            Pending Approvals ({approvals.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-control font-medium ${activeTab === 'orders' ? 'bg-white text-brand shadow-sm font-semibold' : 'text-neutral-600'}`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-control font-medium ${activeTab === 'audit' ? 'bg-white text-brand shadow-sm font-semibold' : 'text-neutral-600'}`}
          >
            Audit Logs ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-control font-medium ${activeTab === 'settings' ? 'bg-white text-brand shadow-sm font-semibold' : 'text-neutral-600'}`}
          >
            Settings
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-brand-tint border border-teal-200 text-brand text-xs rounded-control flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification('')} className="font-semibold text-xs">Dismiss</button>
        </div>
      )}

      {/* TOP KPI ROW (4 numbers max, clean, no decorative clutter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-panel border border-neutral-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Gross Platform Revenue</span>
          <div className="text-2xl font-bold font-mono-numbers text-neutral-900">
            ₹{kpis.totalRevenue?.toFixed(2) || '0.00'}
          </div>
          <span className="text-[11px] text-neutral-500">Across online & COD orders</span>
        </div>

        <div className="bg-white p-5 rounded-panel border border-neutral-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Lifetime Orders</span>
          <div className="text-2xl font-bold font-mono-numbers text-neutral-900">
            {kpis.totalOrders || 0}
          </div>
          <span className="text-[11px] text-neutral-500">Fulfilled & active prescriptions</span>
        </div>

        <div className="bg-white p-5 rounded-panel border border-neutral-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Registered Accounts</span>
          <div className="text-2xl font-bold font-mono-numbers text-neutral-900">
            {kpis.activeUsers || 0}
          </div>
          <span className="text-[11px] text-neutral-500">Customers, pharmacists & drivers</span>
        </div>

        <div className="bg-white p-5 rounded-panel border border-neutral-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">On-Time Delivery SLA</span>
          <div className="text-2xl font-bold font-mono-numbers text-semantic-success">
            {kpis.onTimeDeliveryRate || '97.4%'}
          </div>
          <span className="text-[11px] text-neutral-500">Avg fulfillment: ~24 minutes</span>
        </div>

      </div>

      {/* TAB 1: User Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-panel border border-neutral-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-200 font-semibold text-sm text-neutral-900">
            Registered System Users & Access Permissions
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">User ID</th>
                  <th className="py-2.5 px-4">Full Name</th>
                  <th className="py-2.5 px-4">Email Address</th>
                  <th className="py-2.5 px-4">Phone</th>
                  <th className="py-2.5 px-4">Roles</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono-numbers text-neutral-500">#{u.id}</td>
                    <td className="py-2.5 px-4 font-medium text-neutral-900">{u.fullName}</td>
                    <td className="py-2.5 px-4 text-neutral-600">{u.email}</td>
                    <td className="py-2.5 px-4 font-mono-numbers text-neutral-600">{u.phone}</td>
                    <td className="py-2.5 px-4">
                      {u.roles?.map(r => (
                        <span key={r.id || r.name} className="px-2 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-700 font-mono-numbers mr-1">
                          {r.name?.replace('ROLE_', '')}
                        </span>
                      ))}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        u.status === 'ACTIVE' ? 'bg-semantic-success-tint text-semantic-success' : 'bg-semantic-danger-tint text-semantic-danger'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Partner Approvals */}
      {activeTab === 'approvals' && (
        <div className="bg-white rounded-panel border border-neutral-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm text-neutral-900">
                Pending Regulatory & Partner Approvals
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Review credential verification for Pharmacists and Delivery Fleet prior to portal authorization
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 font-medium rounded-full border border-amber-200">
              {approvals.length} Pending Review
            </span>
          </div>

          {approvals.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              <CheckCircle className="w-8 h-8 text-semantic-success mx-auto mb-2 opacity-80" />
              All partner and pharmacist registrations are up to date. No pending approvals.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Applicant</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Contact</th>
                    <th className="py-2.5 px-4">License / Registration Details</th>
                    <th className="py-2.5 px-4">Applied At</th>
                    <th className="py-2.5 px-4 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {approvals.map(p => (
                    <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">{p.fullName}</div>
                        <div className="text-[11px] text-neutral-400 font-mono-numbers">ID #{p.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          p.role === 'PHARMACIST' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {p.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-neutral-800">{p.email}</div>
                        <div className="text-neutral-500 font-mono-numbers text-[11px]">{p.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        {p.role === 'PHARMACIST' ? (
                          <div className="space-y-0.5">
                            <div className="font-mono-numbers font-medium text-neutral-800">
                              Lic: {p.licenseNumber || 'Pending verification'}
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              Exp: {p.licenseValidTill || 'N/A'} {p.pharmacyId ? `| Pharmacy #${p.pharmacyId}` : ''}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-mono-numbers font-medium text-neutral-800">
                              {p.vehicleType || 'BIKE'} • {p.vehicleNumber || 'Pending'}
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono-numbers">
                              DL: {p.drivingLicenseNo || 'N/A'}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono-numbers text-neutral-500 text-[11px]">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleApprovalAction(p.id, 'approve')}
                          className="px-2.5 py-1 bg-semantic-success text-white rounded text-xs font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprovalAction(p.id, 'reject')}
                          className="px-2.5 py-1 bg-white border border-semantic-danger text-semantic-danger rounded text-xs font-medium hover:bg-rose-50 transition-colors"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Master Orders Oversight */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-panel border border-neutral-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-200 font-semibold text-sm text-neutral-900">
            System Orders Oversight & State Transitions
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Order No</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Payment</th>
                  <th className="py-2.5 px-4">Pickup Code</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono-numbers">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-neutral-900">{o.orderNumber}</td>
                    <td className="py-2.5 px-4 font-sans text-neutral-700">{o.customerName}</td>
                    <td className="py-2.5 px-4 font-sans">
                      <StatusChip status={o.status} />
                    </td>
                    <td className="py-2.5 px-4 font-sans text-neutral-600">{o.paymentMethod}</td>
                    <td className="py-2.5 px-4 font-bold text-brand">{o.pickupCode || '—'}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-neutral-900">₹{o.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Immutable Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-panel border border-neutral-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm text-neutral-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand" /> Regulatory & Security Audit Log
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Append-only immutable record of credential modifications, approvals, overrides, and security events
              </p>
            </div>
            <span className="text-xs font-mono-numbers px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded border border-neutral-200">
              {auditLogs.length} Records
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              No audit records registered yet. System actions are recorded automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Entity</th>
                    <th className="py-2.5 px-4">Performed By</th>
                    <th className="py-2.5 px-4">IP / Client</th>
                    <th className="py-2.5 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono-numbers text-[11px]">
                  {auditLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-2.5 px-4 text-neutral-500 whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded font-mono-numbers font-semibold text-[10px] bg-brand-tint text-brand border border-teal-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-neutral-800">
                        {log.entityName} {log.entityId ? `#${log.entityId}` : ''}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-neutral-900 font-medium">
                        {log.performedBy || 'SYSTEM'}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-500">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-neutral-600 max-w-md truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: System Parameters */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-panel border border-neutral-200 p-6 shadow-sm space-y-4 max-w-2xl">
          <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand" /> Pharmacy Geofence & Delivery Fee Parameters
          </h2>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-neutral-600 font-medium mb-1">Central Pharmacy Latitude</label>
              <input type="text" readOnly value="12.9716° N (Brigade Rd)" className="w-full h-8 px-2 bg-neutral-50 border border-neutral-300 rounded font-mono-numbers" />
            </div>

            <div>
              <label className="block text-neutral-600 font-medium mb-1">Central Pharmacy Longitude</label>
              <input type="text" readOnly value="77.5946° E (Brigade Rd)" className="w-full h-8 px-2 bg-neutral-50 border border-neutral-300 rounded font-mono-numbers" />
            </div>

            <div>
              <label className="block text-neutral-600 font-medium mb-1">Service Radius Geofence</label>
              <input type="text" readOnly value="15.0 Kilometers" className="w-full h-8 px-2 bg-neutral-50 border border-neutral-300 rounded font-mono-numbers" />
            </div>

            <div>
              <label className="block text-neutral-600 font-medium mb-1">Base Delivery Fee</label>
              <input type="text" readOnly value="₹40.00 (Free above ₹500)" className="w-full h-8 px-2 bg-neutral-50 border border-neutral-300 rounded font-mono-numbers" />
            </div>
          </div>

          <p className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-100">
            Address lat/long is verified against the 15 km Haversine service boundary during checkout.
          </p>
        </div>
      )}

    </div>
  );
}
