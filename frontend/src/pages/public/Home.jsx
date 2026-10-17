import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Button from '../../components/Button';
import RxBadge from '../../components/RxBadge';
import { 
  Search, 
  Upload, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Plus, 
  Check, 
  HeartPulse, 
  Sparkles,
  FileText
} from 'lucide-react';

export default function Home({ onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [addedMap, setAddedMap] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/catalog/products'),
          api.get('/catalog/categories')
        ]);
        setProducts(prodRes.data || []);
        setCategories(catRes.data || []);
      } catch (err) {
        console.error("Failed to load catalog data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleAdd = async (product) => {
    if (onAddToCart) {
      await onAddToCart(product.id, 1);
      setAddedMap(prev => ({ ...prev, [product.id]: true }));
      setTimeout(() => {
        setAddedMap(prev => ({ ...prev, [product.id]: false }));
      }, 1500);
    }
  };

  return (
    <div className="space-y-12 pb-16">
      
      {/* Task-first Hero (Clinical, Trustworthy, No AI-clichés) */}
      <section className="bg-white border-b border-neutral-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-tint text-brand text-xs font-medium mb-4">
            <ShieldCheck className="w-4 h-4 stroke-[2]" />
            <span>Licensed Pharmacy • Registered Pharmacist Verification • FEFO Expiry Guarantee</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight leading-tight mb-4">
            Order Genuine Medicines with Same-Day Verified Delivery
          </h1>
          <p className="text-base text-neutral-600 max-w-2xl mb-8 leading-relaxed">
            Search 1,000+ prescription and OTC drugs, upload doctor prescriptions for instant pharmacist review, and track doorstep delivery with OTP security.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2 max-w-2xl mb-8">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3 stroke-[1.5]" />
              <input
                type="text"
                placeholder="Search by brand name or salt (e.g. Paracetamol, Novamox, Telmisartan)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 h-11 text-sm bg-neutral-50 border border-neutral-300 rounded-control focus:bg-white focus:border-brand text-neutral-900 transition-colors"
              />
            </div>
            <Button type="submit" size="lg" className="h-11">
              Find Medicines
            </Button>
          </form>

          {/* Action Callout: Prescription Upload */}
          <div className="bg-neutral-50 rounded-panel p-5 border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-brand-tint text-brand rounded-control">
                <Upload className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Have a Doctor's Prescription?</h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Upload photos or PDF of your Rx. Our on-duty pharmacist will verify dosages, check batch expiries, and prepare your order.
                </p>
              </div>
            </div>
            <Link to="/customer/prescriptions">
              <Button variant="secondary" size="md" className="whitespace-nowrap">
                <FileText className="w-4 h-4" />
                Upload Rx Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">Clinical Categories</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Browse therapies verified by licensed pharmacists</p>
          </div>
          <Link to="/products" className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1">
            View All Categories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.slice(0, 6).map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.id}`}
              className="p-4 bg-white rounded-panel border border-neutral-200 hover:border-brand hover:shadow-sm transition-all group flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-control bg-neutral-100 group-hover:bg-brand-tint group-hover:text-brand flex items-center justify-center text-neutral-600 mb-3 transition-colors">
                <HeartPulse className="w-4 h-4 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-neutral-900 group-hover:text-brand leading-snug">
                  {cat.name}
                </h3>
                <span className="text-[11px] text-neutral-500 mt-1 block">Verified Stock</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Medicines Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">Essential Medicines & Healthcare</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Transparent FEFO batch tracking with real-time stock</p>
          </div>
          <Link to="/products" className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1">
            Browse All ({products.length}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.slice(0, 8).map((prod) => {
            const isAdded = addedMap[prod.id];
            const inStock = prod.stockAvailable > 0;

            return (
              <div
                key={prod.id}
                className="bg-white rounded-panel border border-neutral-200 p-4 flex flex-col justify-between hover:border-neutral-300 transition-colors shadow-none"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono-numbers text-neutral-500 uppercase tracking-wider">
                      {prod.category?.name || 'Pharmacy'}
                    </span>
                    {prod.requiresPrescription && <RxBadge />}
                  </div>

                  <h3 className="text-sm font-semibold text-neutral-900 line-clamp-1" title={prod.name}>
                    {prod.name}
                  </h3>
                  
                  <p className="text-xs text-neutral-500 line-clamp-1 italic mt-0.5">
                    Salt: {prod.genericName}
                  </p>

                  <div className="flex items-center gap-2 mt-2 text-xs text-neutral-600">
                    <span className="px-1.5 py-0.5 bg-neutral-100 rounded-[4px] font-mono-numbers">
                      {prod.strength || 'Standard'}
                    </span>
                    <span>•</span>
                    <span className="text-neutral-500 text-[11px]">{prod.packSize}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-neutral-900 font-mono-numbers">
                      ₹{prod.mrp.toFixed(2)}
                    </div>
                    <span className={`text-[11px] ${inStock ? 'text-semantic-success' : 'text-semantic-danger'}`}>
                      {inStock ? `In Stock (${prod.stockAvailable})` : 'Out of Stock'}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant={isAdded ? "secondary" : "primary"}
                    disabled={!inStock}
                    onClick={() => handleAdd(prod)}
                    className="min-w-[84px]"
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-semantic-success stroke-[2]" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 stroke-[2]" />
                        <span>Add</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Safety & Compliance Trust Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-neutral-100 border border-neutral-200 rounded-panel p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-control text-brand border border-neutral-200">
              <ShieldCheck className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">100% Genuine Pharmacy Sourced</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Direct procurement from certified manufacturers. Full batch audit trails and GST compliant invoices with batch numbers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-control text-brand border border-neutral-200">
              <Clock className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">FEFO Expiry Protection</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                First-Expiry-First-Out dispensing logic. Zero drugs with under 30 days of shelf life are ever dispensed online.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-control text-brand border border-neutral-200">
              <Sparkles className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">Secure Delivery OTP Chain</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Handover verification codes at counter and 4-digit recipient delivery OTP ensures medication reaches the intended patient safely.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
