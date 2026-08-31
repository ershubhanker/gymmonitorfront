// src/context/CacheContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';

// Cache action types
const CACHE_ACTIONS = {
  SET: 'SET',
  GET: 'GET',
  CLEAR: 'CLEAR',
  CLEAR_ALL: 'CLEAR_ALL',
  CLEAR_PATTERN: 'CLEAR_PATTERN',
  INCREMENT_VERSION: 'INCREMENT_VERSION',
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
          version: action.version || 1,
        },
      };
    case CACHE_ACTIONS.CLEAR:
      const newState = { ...state };
      delete newState[action.key];
      return newState;
    case CACHE_ACTIONS.CLEAR_PATTERN:
      // Clear all cache keys that start with the given pattern
      const patternState = { ...state };
      Object.keys(patternState).forEach(key => {
        if (key.startsWith(action.pattern)) {
          delete patternState[key];
        }
      });
      return patternState;
    case CACHE_ACTIONS.CLEAR_ALL:
      return {};
    case CACHE_ACTIONS.INCREMENT_VERSION:
      return {
        ...state,
        _version: (state._version || 0) + 1,
      };
    default:
      return state;
  }
};

// Create cache context
const CacheContext = createContext();

// Cache provider
export const CacheProvider = ({ children }) => {
  const [cache, dispatch] = useReducer(cacheReducer, {});
  
  // Track if initial load is done
  const initialLoadDone = useRef(false);

  // Load cache from localStorage on mount
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem('appCache');
      if (savedCache) {
        const parsed = JSON.parse(savedCache);
        // Check for expired items
        const now = Date.now();
        const version = parsed._version || 1;
        Object.keys(parsed).forEach(key => {
          if (key === '_version') return;
          if (parsed[key].expiry && now - parsed[key].timestamp > parsed[key].expiry) {
            delete parsed[key];
          } else {
            // Only load if version matches
            const itemVersion = parsed[key].version || 1;
            if (itemVersion >= version - 1) {
              dispatch({ type: CACHE_ACTIONS.SET, key, data: parsed[key].data, expiry: parsed[key].expiry, version: itemVersion });
            }
          }
        });
      }
      initialLoadDone.current = true;
    } catch (error) {
      console.error('Error loading cache from localStorage:', error);
      initialLoadDone.current = true;
    }
  }, []);

  // Save cache to localStorage on changes (debounced)
  const saveTimeoutRef = useRef(null);
  useEffect(() => {
    if (!initialLoadDone.current) return;
    
    // Debounce save to prevent excessive writes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem('appCache', JSON.stringify(cache));
      } catch (error) {
        console.error('Error saving cache to localStorage:', error);
      }
    }, 500);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [cache]);

  // Keep a ref in sync with the latest cache so getCache can read fresh
  // data without needing `cache` in its dependency array
  const cacheRef = useRef(cache);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  // ✅ Stable functions with empty dep arrays
  const setCache = useCallback((key, data, expiry = 5 * 60 * 1000) => {
    const version = (cacheRef.current._version || 1);
    dispatch({ type: CACHE_ACTIONS.SET, key, data, expiry, version });
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

  const clearCachePattern = useCallback((pattern) => {
    dispatch({ type: CACHE_ACTIONS.CLEAR_PATTERN, pattern });
  }, []);

  const clearAllCache = useCallback(() => {
    dispatch({ type: CACHE_ACTIONS.CLEAR_ALL });
    localStorage.removeItem('appCache');
  }, []);

  // ✅ Force cache invalidation by incrementing version
  const invalidateCache = useCallback(() => {
    dispatch({ type: CACHE_ACTIONS.INCREMENT_VERSION });
    // Also clear all cache keys that are data-dependent
    const patternsToClear = [
      CACHE_KEYS.MEMBERS_LIST,
      CACHE_KEYS.MEMBER_STATS,
      CACHE_KEYS.MEMBER_PT_DATA,
      CACHE_KEYS.MEMBER_BALANCES,
      CACHE_KEYS.DASHBOARD_STATS,
      CACHE_KEYS.DASHBOARD_STATS_OPTIMIZED,
      CACHE_KEYS.DASHBOARD_BALANCE_OVERVIEW,
      CACHE_KEYS.DASHBOARD_REVENUE,
      CACHE_KEYS.PAYMENTS_LIST,
    ];
    patternsToClear.forEach(pattern => {
      dispatch({ type: CACHE_ACTIONS.CLEAR_PATTERN, pattern });
    });
  }, []);

  // ✅ Invalidate specific data types
  const invalidateMembersCache = useCallback(() => {
    dispatch({ type: CACHE_ACTIONS.CLEAR_PATTERN, pattern: CACHE_KEYS.MEMBERS_LIST });
    dispatch({ type: CACHE_ACTIONS.CLEAR_PATTERN, pattern: CACHE_KEYS.MEMBER_STATS });
    dispatch({ type: CACHE_ACTIONS.CLEAR_PATTERN, pattern: CACHE_KEYS.MEMBER_PT_DATA });
    dispatch({ type: CACHE_ACTIONS.CLEAR_PATTERN, pattern: CACHE_KEYS.MEMBER_BALANCES });
    dispatch({ type: CACHE_ACTIONS.CLEAR_PATTERN, pattern: CACHE_KEYS.DASHBOARD_STATS });
    dispatch({ type: CACHE_ACTIONS.CLEAR_PATTERN, pattern: CACHE_KEYS.DASHBOARD_STATS_OPTIMIZED });
    dispatch({ type: CACHE_ACTIONS.CLEAR_PATTERN, pattern: CACHE_KEYS.DASHBOARD_REVENUE });
  }, []);

  const invalidatePaymentsCache = useCallback(() => {
    dispatch({ type: CACHE_ACTIONS.CLEAR_PATTERN, pattern: CACHE_KEYS.PAYMENTS_LIST });
    dispatch({ type: CACHE_ACTIONS.CLEAR_PATTERN, pattern: CACHE_KEYS.DASHBOARD_STATS });
    dispatch({ type: CACHE_ACTIONS.CLEAR_PATTERN, pattern: CACHE_KEYS.DASHBOARD_STATS_OPTIMIZED });
    dispatch({ type: CACHE_ACTIONS.CLEAR_PATTERN, pattern: CACHE_KEYS.DASHBOARD_REVENUE });
  }, []);

  const value = useMemo(() => ({
    cache,
    setCache,
    getCache,
    clearCache,
    clearCachePattern,
    clearAllCache,
    invalidateCache,
    invalidateMembersCache,
    invalidatePaymentsCache,
    CACHE_KEYS, // ✅ Expose CACHE_KEYS through context
  }), [cache, setCache, getCache, clearCache, clearCachePattern, clearAllCache, invalidateCache, invalidateMembersCache, invalidatePaymentsCache]);

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

// ============================================================
// ✅ CACHE KEYS - SINGLE SOURCE OF TRUTH (NO DUPLICATES)
// ============================================================
export const CACHE_KEYS = {
  // Staff
  STAFF_LIST: 'staff_list',
  STAFF_DEVICE_IDS: 'staff_device_ids',
  
  // Members
  MEMBERS_LIST: 'members_list',
  MEMBER_STATS: 'member_stats',
  MEMBER_PT_DATA: 'member_pt_data',
  MEMBER_BALANCES: 'member_balances',
  MEMBER_DETAIL: 'member_detail',
  
  // Payments
  PAYMENTS_LIST: 'payments_list',
  PAYMENT_DETAIL: 'payment_detail',
  
  // Dashboard
  DASHBOARD_STATS: 'dashboard_stats',
  DASHBOARD_STATS_OPTIMIZED: 'dashboard_stats_optimized',
  DASHBOARD_BALANCE_OVERVIEW: 'dashboard_balance_overview',
  DASHBOARD_REVENUE: 'dashboard_revenue',
  
  // Other
  DEVICES_LIST: 'devices_list',
  LEADS_LIST: 'leads_list',
  LEAD_DETAIL: 'lead_detail',
  PLANS_LIST: 'plans_list',
  MEMBERSHIP_PLANS: 'membership_plans',
  EXPENSES_LIST: 'expenses_list',
  EXPENSE_DETAIL: 'expense_detail',
  
  // Attendance
  ATTENDANCE_LIST: 'attendance_list',
  ATTENDANCE_TODAY: 'attendance_today',
  
  // Add-ons
  ADDONS_LIST: 'addons_list',
  MEMBER_ADDONS: 'member_addons',
  
  // PT (Personal Training)
  PT_SESSIONS: 'pt_sessions',
  PT_SESSION_DETAIL: 'pt_session_detail',
  
  // Diet Plans
  DIET_PLANS: 'diet_plans',
  MEMBER_DIET_PLANS: 'member_diet_plans',
  
  // WhatsApp
  WHATSAPP_LOGS: 'whatsapp_logs',
  WHATSAPP_STATS: 'whatsapp_stats',
  
  // Follow-ups
  FOLLOWUPS_TODAY: 'followups_today',
  
  // Trainer Schedule
  TRAINER_SCHEDULE: 'trainer_schedule',
  
  // Historical Invoices
  HISTORICAL_INVOICES: 'historical_invoices',
};