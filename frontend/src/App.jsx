import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Navbar from './components/Navbar';
import AppRoutes from './routes/AppRoutes';
import api from './api/client';

function AppContent() {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [] });

  const loadCart = async () => {
    if (!user) {
      // Local fallback for guest
      try {
        const stored = localStorage.getItem('meditrack_guest_cart');
        setCart(stored ? JSON.parse(stored) : { items: [] });
      } catch {
        setCart({ items: [] });
      }
      return;
    }

    try {
      const res = await api.get('/customer/cart');
      setCart(res.data || { items: [] });
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadCart();
  }, [user]);

  const handleAddToCart = async (productId, quantity = 1) => {
    if (user) {
      try {
        const res = await api.post('/customer/cart/items', { productId, quantity });
        setCart(res.data);
      } catch (err) {
        console.error(err);
      }
    } else {
      // Fetch product detail for guest cart
      try {
        const pRes = await api.get(`/catalog/products/${productId}`);
        const product = pRes.data;
        setCart((prev) => {
          const existing = prev.items.find((it) => it.product.id === productId);
          let newItems;
          if (existing) {
            newItems = prev.items.map((it) =>
              it.product.id === productId ? { ...it, quantity: it.quantity + quantity } : it
            );
          } else {
            newItems = [...prev.items, { id: Date.now(), product, quantity }];
          }
          const updated = { items: newItems };
          localStorage.setItem('meditrack_guest_cart', JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateQuantity = async (productId, quantity) => {
    if (user) {
      try {
        const res = await api.put(`/customer/cart/items/${productId}`, { quantity });
        setCart(res.data);
      } catch (err) {
        console.error(err);
      }
    } else {
      setCart((prev) => {
        let newItems;
        if (quantity <= 0) {
          newItems = prev.items.filter((it) => it.product.id !== productId);
        } else {
          newItems = prev.items.map((it) =>
            it.product.id === productId ? { ...it, quantity } : it
          );
        }
        const updated = { items: newItems };
        localStorage.setItem('meditrack_guest_cart', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleRemoveItem = async (productId) => {
    if (user) {
      try {
        const res = await api.delete(`/customer/cart/items/${productId}`);
        setCart(res.data);
      } catch (err) {
        console.error(err);
      }
    } else {
      handleUpdateQuantity(productId, 0);
    }
  };

  const cartCount = cart.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
      <Navbar cartCount={cartCount} />

      <main className="flex-1">
        <AppRoutes 
          cart={cart}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onOrderPlaced={loadCart}
        />
      </main>

      <footer className="bg-white border-t border-neutral-200 py-8 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800">MediTrack Platform</span>
            <span>•</span>
            <span>Drug Store Management & Regulated Delivery System</span>
          </div>
          <div className="flex items-center gap-4">
            <span>FEFO Certified</span>
            <span>•</span>
            <span>Schedule H/H1 Compliance</span>
            <span>•</span>
            <span className="font-mono-numbers">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
