import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { 
  Pill, 
  ShoppingCart, 
  User, 
  LogOut, 
  ClipboardCheck, 
  Truck, 
  ShieldAlert, 
  ChevronDown, 
  Package, 
  FileText 
} from 'lucide-react';

export default function Navbar({ cartCount = 0 }) {
  const { user, logout, quickLogin, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const handleRoleSwitch = async (role) => {
    setRoleMenuOpen(false);
    await quickLogin(role);
    if (role === 'customer') navigate('/products');
    else if (role === 'pharmacist') navigate('/pharmacist/queue');
    else if (role === 'delivery') navigate('/delivery');
    else if (role === 'admin') navigate('/admin');
  };

  const isCurrent = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-[6px] bg-brand flex items-center justify-center text-white shadow-sm">
                <Pill className="w-5 h-5 stroke-[1.5]" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-lg text-neutral-900 tracking-tight leading-tight">
                  Medi<span className="text-brand">Track</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-mono-numbers uppercase tracking-wider">Pharmacy Care</span>
              </div>
            </Link>

            {/* Navigation links based on role */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link 
                to="/products" 
                className={`px-3 py-1.5 rounded-control transition-colors ${
                  isCurrent('/products') ? 'bg-brand-tint text-brand' : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                Medicines Catalog
              </Link>

              {user && hasRole('CUSTOMER') && (
                <>
                  <Link 
                    to="/customer/orders" 
                    className={`px-3 py-1.5 rounded-control transition-colors ${
                      isCurrent('/customer/orders') ? 'bg-brand-tint text-brand' : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    My Orders
                  </Link>
                  <Link 
                    to="/customer/prescriptions" 
                    className={`px-3 py-1.5 rounded-control transition-colors ${
                      isCurrent('/customer/prescriptions') ? 'bg-brand-tint text-brand' : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    Prescriptions
                  </Link>
                </>
              )}

              {user && (hasRole('PHARMACIST') || hasRole('ADMIN')) && (
                <Link 
                  to="/pharmacist/queue" 
                  className={`px-3 py-1.5 rounded-control flex items-center gap-1.5 transition-colors ${
                    location.pathname.startsWith('/pharmacist') ? 'bg-brand-tint text-brand font-semibold' : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4 stroke-[1.5]" />
                  Pharmacist Station
                </Link>
              )}

              {user && (hasRole('DELIVERY') || hasRole('ADMIN')) && (
                <Link 
                  to="/delivery" 
                  className={`px-3 py-1.5 rounded-control flex items-center gap-1.5 transition-colors ${
                    location.pathname.startsWith('/delivery') ? 'bg-brand-tint text-brand font-semibold' : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <Truck className="w-4 h-4 stroke-[1.5]" />
                  Delivery App
                </Link>
              )}

              {user && hasRole('ADMIN') && (
                <Link 
                  to="/admin" 
                  className={`px-3 py-1.5 rounded-control flex items-center gap-1.5 transition-colors ${
                    location.pathname.startsWith('/admin') ? 'bg-brand-tint text-brand font-semibold' : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 stroke-[1.5]" />
                  Admin Portal
                </Link>
              )}
            </nav>
          </div>

          {/* Right Actions & Quick Switcher */}
          <div className="flex items-center gap-3">
            
            {/* Quick Role Switcher Dropdown (Essential for pairing / testing) */}
            <div className="relative">
              <button 
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-control bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-700"
                title="Quickly switch role to test UI views"
              >
                <span>Role: <strong className="text-neutral-900">{user?.roles?.[0]?.replace('ROLE_', '') || 'Guest'}</strong></span>
                <ChevronDown className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-panel shadow-lg border border-neutral-200 py-1.5 z-50 text-xs">
                  <div className="px-3 py-1 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-100">
                    Switch Test Persona
                  </div>
                  <button 
                    onClick={() => handleRoleSwitch('customer')}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-neutral-800"
                  >
                    <User className="w-3.5 h-3.5 text-brand" />
                    <span>Customer (Rahul)</span>
                  </button>
                  <button 
                    onClick={() => handleRoleSwitch('pharmacist')}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-neutral-800"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-brand" />
                    <span>Pharmacist (Dr. Priya)</span>
                  </button>
                  <button 
                    onClick={() => handleRoleSwitch('delivery')}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-neutral-800"
                  >
                    <Truck className="w-3.5 h-3.5 text-brand" />
                    <span>Delivery Partner (Suresh)</span>
                  </button>
                  <button 
                    onClick={() => handleRoleSwitch('admin')}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-neutral-800"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-brand" />
                    <span>Administrator</span>
                  </button>
                </div>
              )}
            </div>

            {/* Cart Link */}
            <Link 
              to="/cart" 
              className="relative p-2 text-neutral-700 hover:text-brand hover:bg-neutral-100 rounded-control transition-colors"
              title="View Cart"
            >
              <ShoppingCart className="w-5 h-5 stroke-[1.5]" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-brand text-white font-mono-numbers text-[10px] font-semibold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Session */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
                <span className="text-xs text-neutral-700 hidden lg:inline font-medium">
                  {user.fullName?.split(' ')[0]}
                </span>
                <button
                  onClick={logout}
                  className="p-1.5 text-neutral-500 hover:text-semantic-danger hover:bg-neutral-100 rounded-control"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4 stroke-[1.5]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs font-medium px-3 py-1.5 text-brand border border-brand rounded-control hover:bg-brand-tint transition-colors"
                >
                  Sign In
                </Link>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
