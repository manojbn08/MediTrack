import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

import Home from '../pages/public/Home';
import Catalog from '../pages/public/Catalog';
import Login from '../pages/public/Login';
import Register from '../pages/public/Register';

import Cart from '../pages/customer/Cart';
import Checkout from '../pages/customer/Checkout';
import Orders from '../pages/customer/Orders';
import OrderTracking from '../pages/customer/OrderTracking';
import Prescriptions from '../pages/customer/Prescriptions';

import PharmacistWorkstation from '../pages/pharmacist/PharmacistWorkstation';
import DeliveryApp from '../pages/delivery/DeliveryApp';
import AdminPortal from '../pages/admin/AdminPortal';

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.some(r => user.roles?.includes(`ROLE_${r.toUpperCase()}`))) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function AppRoutes({ cart, onAddToCart, onUpdateQuantity, onRemoveItem, onOrderPlaced }) {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Home onAddToCart={onAddToCart} />} />
      <Route path="/products" element={<Catalog onAddToCart={onAddToCart} />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Customer Pages */}
      <Route 
        path="/cart" 
        element={
          <Cart 
            cart={cart} 
            onUpdateQuantity={onUpdateQuantity} 
            onRemoveItem={onRemoveItem} 
          />
        } 
      />
      <Route 
        path="/checkout" 
        element={
          <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
            <Checkout cart={cart} onOrderPlaced={onOrderPlaced} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/customer/orders" 
        element={
          <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
            <Orders />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/customer/orders/:id/track" 
        element={
          <ProtectedRoute allowedRoles={['CUSTOMER', 'DELIVERY', 'PHARMACIST', 'ADMIN']}>
            <OrderTracking />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/customer/prescriptions" 
        element={
          <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
            <Prescriptions />
          </ProtectedRoute>
        } 
      />

      {/* Pharmacist Station */}
      <Route 
        path="/pharmacist/*" 
        element={
          <ProtectedRoute allowedRoles={['PHARMACIST', 'ADMIN']}>
            <PharmacistWorkstation />
          </ProtectedRoute>
        } 
      />

      {/* Delivery Partner App */}
      <Route 
        path="/delivery/*" 
        element={
          <ProtectedRoute allowedRoles={['DELIVERY', 'ADMIN']}>
            <DeliveryApp />
          </ProtectedRoute>
        } 
      />

      {/* Admin Governance */}
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminPortal />
          </ProtectedRoute>
        } 
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
