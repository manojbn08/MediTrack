import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import Button from '../../components/Button';
import RxBadge from '../../components/RxBadge';
import { Search, Filter, Check, Plus, AlertCircle } from 'lucide-react';

export default function Catalog({ onAddToCart }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedMap, setAddedMap] = useState({});

  const query = searchParams.get('q') || '';
  const categoryId = searchParams.get('category') || '';
  const rxFilter = searchParams.get('rx') || ''; // 'true', 'false', or ''

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/catalog/products', {
            params: {
              q: query || undefined,
              category: categoryId || undefined,
              rx: rxFilter ? rxFilter === 'true' : undefined,
            }
          }),
          api.get('/catalog/categories')
        ]);
        setProducts(prodRes.data || []);
        setCategories(catRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [query, categoryId, rxFilter]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Pharmaceutical Catalog</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Displaying {products.length} medicines • Verified clinical inventory with FEFO batch controls
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 stroke-[1.5]" />
          <input
            type="text"
            placeholder="Search medicine or composition..."
            value={query}
            onChange={(e) => updateFilter('q', e.target.value)}
            className="w-full pl-9 pr-3 h-9 text-xs bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
          />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <span className="text-neutral-500 font-medium flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </span>

        {/* All Categories Pill */}
        <button
          onClick={() => updateFilter('category', '')}
          className={`px-3 py-1.5 rounded-full border transition-colors ${
            !categoryId 
              ? 'bg-brand text-white border-brand font-medium' 
              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          All Categories
        </button>

        {/* Category Pills */}
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => updateFilter('category', String(c.id))}
            className={`px-3 py-1.5 rounded-full border transition-colors ${
              categoryId === String(c.id)
                ? 'bg-brand text-white border-brand font-medium'
                : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            {c.name}
          </button>
        ))}

        <div className="h-4 w-px bg-neutral-300 mx-1 hidden sm:block" />

        {/* Rx vs OTC filter */}
        <button
          onClick={() => updateFilter('rx', rxFilter === 'true' ? '' : 'true')}
          className={`px-3 py-1.5 rounded-full border transition-colors ${
            rxFilter === 'true'
              ? 'bg-semantic-danger text-white border-semantic-danger font-medium'
              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          Rx Only
        </button>

        <button
          onClick={() => updateFilter('rx', rxFilter === 'false' ? '' : 'false')}
          className={`px-3 py-1.5 rounded-full border transition-colors ${
            rxFilter === 'false'
              ? 'bg-brand text-white border-brand font-medium'
              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          OTC Only
        </button>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-panel border border-neutral-200 p-4 space-y-3 animate-pulse">
              <div className="h-3 bg-neutral-200 rounded w-1/3" />
              <div className="h-4 bg-neutral-200 rounded w-3/4" />
              <div className="h-3 bg-neutral-100 rounded w-1/2" />
              <div className="h-8 bg-neutral-100 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-panel p-12 text-center max-w-md mx-auto my-8">
          <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto mb-3 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-neutral-900">No medicines found</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Try adjusting your search query or reset category and prescription filters.
          </p>
          <Button 
            variant="secondary" 
            size="sm" 
            className="mt-4"
            onClick={() => setSearchParams({})}
          >
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
          {products.map((prod) => {
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
                      {prod.category?.name}
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
                    <span className="px-1.5 py-0.5 bg-neutral-100 rounded-[4px] font-mono-numbers text-[11px]">
                      {prod.strength || 'Standard'}
                    </span>
                    <span>•</span>
                    <span className="text-neutral-500 text-[11px]">{prod.packSize}</span>
                  </div>

                  {prod.description && (
                    <p className="text-[11px] text-neutral-600 mt-2 line-clamp-2 leading-relaxed">
                      {prod.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-neutral-900 font-mono-numbers">
                      ₹{prod.mrp.toFixed(2)}
                    </div>
                    <span className={`text-[11px] ${inStock ? 'text-semantic-success' : 'text-semantic-danger'}`}>
                      {inStock ? `Available (${prod.stockAvailable})` : 'Out of Stock'}
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
      )}

    </div>
  );
}
