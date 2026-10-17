import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ConfirmModal from './ConfirmModal';
import { 
  Pill, 
  ShoppingCart, 
  LogOut, 
  ClipboardCheck, 
  Truck, 
  ShieldAlert, 
  User 
} from 'lucide-react';

export default function Navbar({ cartCount = 0 }) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isCurrent = (path) => location.pathname === path;
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-[6px] bg-brand flex items-center justify-center text-white shadow-xs">
                  <Pill className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-lg text-neutral-900 tracking-tight leading-tight">
                    Medi<span className="text-brand">Track</span>
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono-numbers uppercase tracking-wider">
                    Verified Pharmacy
                  </span>
                </div>
              </Link>

              {/* Navigation links - STRICTLY ROLE RESPECTED */}
              {!isAuthPage && (
                <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
                  
                  {/* Guest Links (When not logged in and not on auth pages) */}
                  {!user && (
                    <Link 
                      to="/products" 
                      className={`px-3 py-1.5 rounded-control transition-colors ${
                        isCurrent('/products') ? 'bg-brand-tint text-brand' : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                    >
                      Medicines Catalog
                    </Link>
                  )}

                  {/* Customer Tabs */}
                  {user && hasRole('CUSTOMER') && (
                    <>
                      <Link 
                        to="/products" 
                        className={`px-3 py-1.5 rounded-control transition-colors ${
                          isCurrent('/products') ? 'bg-brand-tint text-brand' : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                        }`}
                      >
                        Medicines Catalog
                      </Link>
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

                  {/* Pharmacist Tabs */}
                  {user && hasRole('PHARMACIST') && (
                    <Link 
                      to="/pharmacist/queue" 
                      className={`px-3 py-1.5 rounded-control flex items-center gap-1.5 transition-colors ${
                        location.pathname.startsWith('/pharmacist') ? 'bg-brand-tint text-brand font-bold' : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                    >
                      <ClipboardCheck className="w-4 h-4 stroke-[1.8]" />
                      Pharmacist Station
                    </Link>
                  )}

                  {/* Delivery Partner Tabs */}
                  {user && hasRole('DELIVERY') && (
                    <Link 
                      to="/delivery" 
                      className={`px-3 py-1.5 rounded-control flex items-center gap-1.5 transition-colors ${
                        location.pathname.startsWith('/delivery') ? 'bg-brand-tint text-brand font-bold' : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                    >
                      <Truck className="w-4 h-4 stroke-[1.8]" />
                      Delivery App
                    </Link>
                  )}

                  {/* Admin Tabs */}
                  {user && hasRole('ADMIN') && (
                    <Link 
                      to="/admin" 
                      className={`px-3 py-1.5 rounded-control flex items-center gap-1.5 transition-colors ${
                        location.pathname.startsWith('/admin') ? 'bg-brand-tint text-brand font-bold' : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4 stroke-[1.8]" />
                      Admin Portal
                    </Link>
                  )}

                </nav>
              )}
            </div>

            {/* Right Side Header Controls */}
            <div className="flex items-center gap-3">
              
              {/* Cart Icon - ONLY visible to Customers and NOT on auth pages */}
              {!isAuthPage && user && hasRole('CUSTOMER') && (
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
              )}

              {/* User Session or Sign In */}
              {user ? (
                <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-neutral-900 font-semibold leading-tight">
                      {user.fullName || 'User'}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono-numbers capitalize">
                      {user.roles?.[0]?.replace('ROLE_', '').toLowerCase() || 'Member'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="p-1.5 text-neutral-500 hover:text-semantic-danger hover:bg-neutral-100 rounded-control transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4 stroke-[1.5]" />
                  </button>
                </div>
              ) : (
                !isAuthPage && (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/login"
                      className="text-xs font-semibold px-3 py-1.5 text-brand border border-brand rounded-control hover:bg-brand-tint transition-colors"
                    >
                      Sign In
                    </Link>
                  </div>
                )
              )}

            </div>

          </div>
        </div>
      </header>

      {/* Sign Out Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Sign Out Confirmation"
        message="Are you sure you want to log out of your session? You will be redirected to the sign in page."
        confirmText="Yes, Sign Out"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
