// src/context/CacheContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';

// Cache action types
const CACHE_ACTIONS = {
  SET: 'SET',
  GET: 'GET',
  CLEAR: 'CLEAR',
  CLEAR_ALL: 'CLEAR_ALL',
  SET_EXPIRY: 'SET_EXPIRY',
};

// Cache reducer
const cacheReducer = (state, action) => {
  switch (action.type) {
    case CACHE_ACTIONS.SET:
      return {
        ...state,
        [action.key]: {
          data: action.data,
          timestamp: Date.now(),
          expiry: action.expiry || 5 * 60 * 1000, // 5 minutes default
        },
      };
    case CACHE_ACTIONS.CLEAR:
      const newState = { ...state };
      delete newState[action.key];
      return newState;
    case CACHE_ACTIONS.CLEAR_ALL:
      return {};
    default:
      return state;
  }
};

// Create cache context
const CacheContext = createContext();

// Cache provider
export const CacheProvider = ({ children }) => {
  const [cache, dispatch] = useReducer(cacheReducer, {});

  // Load cache from localStorage on mount
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem('appCache');
      if (savedCache) {
        const parsed = JSON.parse(savedCache);
        // Check for expired items
        const now = Date.now();
        Object.keys(parsed).forEach(key => {
          if (parsed[key].expiry && now - parsed[key].timestamp > parsed[key].expiry) {
            delete parsed[key];
          }
        });
        Object.keys(parsed).forEach(key => {
          dispatch({ type: CACHE_ACTIONS.SET, key, data: parsed[key].data, expiry: parsed[key].expiry });
        });
      }
    } catch (error) {
      console.error('Error loading cache from localStorage:', error);
    }
  }, []);

  // Save cache to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem('appCache', JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving cache to localStorage:', error);
    }
  }, [cache]);

  // Keep a ref in sync with the latest cache so getCache can read fresh
  // data without needing `cache` in its dependency array (which would
  // change its identity, and any consumer's identity, on every cache
  // write — causing effects that depend on it to re-run in a loop).
  const cacheRef = useRef(cache);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  // Stable (never-changing) function identities via useCallback with
  // empty dep arrays, since they only ever use dispatch/refs, not
  // `cache` directly. This is what keeps consumers like
  // `fetchDashboardData` (which lists getCache/setCache as deps) from
  // being recreated on every render, which was previously re-triggering
  // fetch effects and causing an infinite fetch loop.
  const setCache = useCallback((key, data, expiry = 5 * 60 * 1000) => {
    dispatch({ type: CACHE_ACTIONS.SET, key, data, expiry });
  }, []);

  const getCache = useCallback((key) => {
    const item = cacheRef.current[key];
    if (!item) return null;

    // Check if expired
    if (item.expiry && Date.now() - item.timestamp > item.expiry) {
      dispatch({ type: CACHE_ACTIONS.CLEAR, key });
      return null;
    }
    return item.data;
  }, []);

  const clearCache = useCallback((key) => {
    dispatch({ type: CACHE_ACTIONS.CLEAR, key });
  }, []);

  const clearAllCache = useCallback(() => {
    dispatch({ type: CACHE_ACTIONS.CLEAR_ALL });
    localStorage.removeItem('appCache');
  }, []);

  const value = useMemo(() => ({
    cache,
    setCache,
    getCache,
    clearCache,
    clearAllCache,
  }), [cache, setCache, getCache, clearCache, clearAllCache]);

  return <CacheContext.Provider value={value}>{children}</CacheContext.Provider>;
};

// Custom hook to use cache
export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

// Cache keys constants
export const CACHE_KEYS = {
  // Staff
  STAFF_LIST: 'staff_list',
  STAFF_DEVICE_IDS: 'staff_device_ids',
  
  // Members
  MEMBERS_LIST: 'members_list',
  MEMBER_STATS: 'member_stats',
  MEMBER_BALANCES: 'member_balances',
  MEMBER_PT_DATA: 'member_pt_data',
  
  // Payments
  PAYMENTS_LIST: 'payments_list',
  
  // Dashboard
  DASHBOARD_STATS: 'dashboard_stats',
  DASHBOARD_BALANCE_OVERVIEW: 'dashboard_balance_overview',
  
  // Other
  DEVICES_LIST: 'devices_list',
  LEADS_LIST: 'leads_list',
  PLANS_LIST: 'plans_list',
  EXPENSES_LIST: 'expenses_list',
};