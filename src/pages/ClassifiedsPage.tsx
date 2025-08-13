import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, Filter, Grid, List, AlertCircle, Search, X, RefreshCcw, Sparkles, TrendingUp as Trending, Clock, DollarSign, Zap } from 'lucide-react';
import type { AppListing } from '../types';
import { getAppListings, clearAppCache } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { DeveloperButton } from '../components/DeveloperButton';
import { AdminButton } from '../components/AdminButton';
import AppCard from '../components/AppCard';

// Constants
const ITEMS_PER_PAGE = 12;
const SEARCH_DEBOUNCE = 300;
const PRICE_RANGES = [
  { label: 'All', min: null, max: null },
  { label: 'Free', min: 0, max: 0 },
  { label: 'Under $10', min: 0.01, max: 10 },
  { label: '$10 - $25', min: 10, max: 25 },
  { label: 'Over $25', min: 25, max: null }
];

const RATING_FILTERS = [
  { label: 'All', value: 0 },
  { label: '4★ & up', value: 4 },
  { label: '3★ & up', value: 3 }
];

export function ClassifiedsPage() {
  const { auth } = useAuth();
  const [apps, setApps] = useState<AppListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState(PRICE_RANGES[0]);
  const [selectedRating, setSelectedRating] = useState(RATING_FILTERS[0]);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh key for forcing re-fetch
  const searchTimeoutRef = useRef<number>();
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastAppRef = useRef<HTMLDivElement | null>(null);

  const fetchApps = useCallback(async (pageNum: number, category?: string, search?: string, forceRefresh = false) => {
    if (loadingRef.current && !forceRefresh) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // Clear cache if forcing refresh
      if (forceRefresh) {
        clearAppCache();
      }
      
      const { data: listings, count } = await getAppListings(
        pageNum, 
        ITEMS_PER_PAGE, 
        category || undefined, 
        search || undefined
      );

      // Filter apps based on price range and rating
      const filteredListings = listings.filter(app => {
        const meetsPrice = selectedPriceRange.min === null || 
          (app.price >= selectedPriceRange.min && 
           (selectedPriceRange.max === null || app.price <= selectedPriceRange.max));
        
        const meetsRating = app.rating >= selectedRating.value;
        
        return meetsPrice && meetsRating;
      });

      if (pageNum === 1 || forceRefresh) {
        setApps(filteredListings);
      } else {
        setApps(prev => [...prev, ...filteredListings]);
      }
      
      setTotalCount(count);
    } catch (err) {
      console.error('Error fetching apps:', err);
      setError(err instanceof Error ? err.message : 'Failed to load apps');
      if (pageNum === 1) setApps([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
      setRetrying(false);
    }
  }, [selectedPriceRange, selectedRating]);

  // Setup infinite scroll
  useEffect(() => {
    if (loadingRef.current || apps.length >= totalCount) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (lastAppRef.current) {
      observer.observe(lastAppRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [apps.length, totalCount]);

  // Handle search and category changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      setPage(1);
      fetchApps(1, selectedCategory || undefined, searchQuery || undefined);
    }, SEARCH_DEBOUNCE);

    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedCategory, selectedPriceRange, selectedRating, fetchApps, refreshKey]); // Add refreshKey dependency

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      fetchApps(page, selectedCategory || undefined, searchQuery || undefined);
    }
  }, [page, selectedCategory, searchQuery, fetchApps]);

  // Memoize categorized apps
  const categorizedApps = useMemo(() => {
    const grouped = apps.reduce((acc, app) => {
      if (!acc[app.category]) {
        acc[app.category] = [];
      }
      acc[app.category].push(app);
      return acc;
    }, {} as Record<string, AppListing[]>);

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [apps]);

  const categories = useMemo(() => 
    Array.from(new Set(apps.map(app => app.category))).filter(Boolean).sort(),
  [apps]);

  const featuredApps = useMemo(() => 
    apps.filter(app => app.rating >= 4.8).slice(0, 3),
  [apps]);

  const trendingApps = useMemo(() => 
    apps.sort((a, b) => b.reviews_count - a.reviews_count).slice(0, 3),
  [apps]);

  const handleRetry = () => {
    setRetrying(true);
    clearAppCache();
    setPage(1);
    fetchApps(1, selectedCategory || undefined, searchQuery || undefined, true);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1); // Increment refresh key to force re-fetch
    clearAppCache();
    setPage(1);
    fetchApps(1, selectedCategory || undefined, searchQuery || undefined, true);
  };

  if (loading && apps.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading apps..." />
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-12 overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome to The AI Verse
          </h1>
          <p className="text-xl text-white/90 mb-6 max-w-2xl">
            Discover the future of AI applications. From creative tools to productivity boosters,
            find the perfect AI companion for your needs.
          </p>
          <div className="flex items-center gap-4">
            <DeveloperButton />
            <AdminButton />
            <button 
              onClick={() => window.scrollTo({ top: featuredApps.length ? 800 : 0, behavior: 'smooth' })}
              className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Explore Apps
            </button>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-purple-600/50" />
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Search and Filters */}
      <div className="space-y-6 mb-12">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search AI apps by name, category, features, or use case..."
            className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-grow">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                selectedCategory === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Apps
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Price Range Filter */}
          <div className="relative group">
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-50">
              <DollarSign className="w-4 h-4" />
              <span>{selectedPriceRange.label}</span>
            </button>
            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {PRICE_RANGES.map((range) => (
                <button
                  key={range.label}
                  onClick={() => setSelectedPriceRange(range)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating Filter */}
          <div className="relative group">
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-50">
              <Star className="w-4 h-4" />
              <span>{selectedRating.label}</span>
            </button>
            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {RATING_FILTERS.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => setSelectedRating(filter)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh apps"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${
                viewMode === 'list'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active Filters */}
        {(selectedCategory || searchQuery || selectedPriceRange.label !== 'All' || selectedRating.label !== 'All') && (
          <div className="flex items-center gap-2">
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {selectedCategory}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="hover:bg-blue-200 rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Search: {searchQuery}
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:bg-blue-200 rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedPriceRange.label !== 'All' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {selectedPriceRange.label}
                <button
                  onClick={() => setSelectedPriceRange(PRICE_RANGES[0])}
                  className="hover:bg-blue-200 rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedRating.label !== 'All' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {selectedRating.label}
                <button
                  onClick={() => setSelectedRating(RATING_FILTERS[0])}
                  className="hover:bg-blue-200 rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {error ? (
        <div className="bg-red-50 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-medium mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <RefreshCcw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            Try Again
          </button>
        </div>
      ) : apps.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">No apps found matching your search criteria.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Featured Apps */}
          {featuredApps.length > 0 && !searchQuery && !selectedCategory && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Featured Apps
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredApps.map((app) => (
                  <AppCard key={app.id} app={app} viewMode="grid" />
                ))}
              </div>
            </div>
          )}

          {/* Trending Apps */}
          {trendingApps.length > 0 && !searchQuery && !selectedCategory && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Trending className="w-5 h-5 text-red-500" />
                Trending Now
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingApps.map((app) => (
                  <AppCard key={app.id} app={app} viewMode="grid" />
                ))}
              </div>
            </div>
          )}

          {/* All Apps by Category */}
          {categorizedApps.map(([category, categoryApps], categoryIndex) => (
            <div key={category} className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                {category}
              </h2>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
                {categoryApps.map((app, index) => {
                  const isLast = categoryIndex === categorizedApps.length - 1 && 
                               index === categoryApps.length - 1;
                  
                  return (
                    <div
                      key={app.id}
                      ref={isLast ? lastAppRef : null}
                    >
                      <AppCard app={app} viewMode={viewMode} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && apps.length > 0 && (
        <div className="flex justify-center mt-8">
          <LoadingSpinner size="medium" />
        </div>
      )}
    </main>
  );
}

export default ClassifiedsPage;