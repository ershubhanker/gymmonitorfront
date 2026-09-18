// WhatsAppSignupTab.jsx
// Complete working implementation with full data capture from Meta

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, CheckCircle2, Loader2, AlertCircle, Unplug, Smartphone, Building2, Phone } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const FB_SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';

const initFacebookSdk = (appId, version) => {
  if (!appId) return;
  if (window.FB) {
    window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version });
    return;
  }
  window.fbAsyncInit = () => {
    window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version });
  };
  if (!document.getElementById('facebook-jssdk')) {
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = FB_SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
  }
};

const WhatsAppSignupTab = () => {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Store all data from the Embedded Signup message event
  const signupDataRef = useRef({
    waba_id: null,
    phone_number_id: null,
    business_id: null,
    waba_ids: [],
    ad_account_ids: [],
    page_ids: [],
    dataset_ids: [],
    catalog_ids: [],
    instagram_account_ids: [],
    event_type: null
  });

  useEffect(() => {
    loadInitialData();
    window.addEventListener('message', handleEmbeddedSignupMessage);
    return () => window.removeEventListener('message', handleEmbeddedSignupMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [configRes, statusRes] = await Promise.all([
        api.get('/gym/whatsapp/config'),
        api.get('/gym/whatsapp/status'),
      ]);
      setConfig(configRes.data);
      setStatus(statusRes.data);
      
      // Initialize Facebook SDK
      if (configRes.data.app_id) {
        initFacebookSdk(configRes.data.app_id, configRes.data.graph_api_version || 'v26.0');
        // Check if SDK is loaded
        if (window.FB) {
          setSdkLoaded(true);
        } else {
          // Wait for SDK to load
          const checkSDK = setInterval(() => {
            if (window.FB) {
              setSdkLoaded(true);
              clearInterval(checkSDK);
            }
          }, 500);
          setTimeout(() => clearInterval(checkSDK), 10000);
        }
      }
    } catch (error) {
      console.error('Failed to load WhatsApp settings:', error);
      toast.error(error.response?.data?.detail || 'Failed to load WhatsApp settings');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ✅ COMPLETE MESSAGE EVENT HANDLER - Captures ALL data
  // ============================================================
  const handleEmbeddedSignupMessage = (event) => {
    // Only process messages from Facebook
    if (!event.origin?.endsWith('facebook.com')) return;

    try {
      const data = JSON.parse(event.data);
      
      if (data.type !== 'WA_EMBEDDED_SIGNUP') return;

      console.log('📨 Embedded Signup message event:', data);

      // ============================================================
      // ✅ SUCCESSFUL COMPLETION - Captures all asset IDs
      // ============================================================
      if (data.event === 'FINISH' || 
          data.event === 'FINISH_ONLY_WABA' || 
          data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' || 
          data.event === 'FINISH_OBO_MIGRATION' || 
          data.event === 'FINISH_GRANT_ONLY_API_ACCESS') {
        
        const eventData = data.data || {};
        
        // ✅ Store ALL available data
        signupDataRef.current = {
          waba_id: eventData.waba_id || null,
          phone_number_id: eventData.phone_number_id || null,
          business_id: eventData.business_id || null,
          waba_ids: eventData.waba_ids || [],
          ad_account_ids: eventData.ad_account_ids || [],
          page_ids: eventData.page_ids || [],
          dataset_ids: eventData.dataset_ids || [],
          catalog_ids: eventData.catalog_ids || [],
          instagram_account_ids: eventData.instagram_account_ids || [],
          event_type: data.event
        };

        console.log('✅ WABA Signup Data Captured:', signupDataRef.current);
        
        // Show success toast with the captured data
        toast.success(
          `WhatsApp Business connected! WABA ID: ${eventData.waba_id || 'N/A'}`,
          { duration: 5000 }
        );

      // ============================================================
      // ❌ CANCELLED FLOW
      // ============================================================
      } else if (data.event === 'CANCEL') {
        const cancelData = data.data || {};
        
        if (cancelData.error_message) {
          // User reported an error
          toast.error(`WhatsApp setup error: ${cancelData.error_message}`);
          console.error('WhatsApp error:', cancelData);
        } else {
          // User cancelled voluntarily
          const step = cancelData.current_step || 'unknown';
          toast.info(`WhatsApp setup cancelled at step: ${step}`);
        }
        setConnecting(false);

      // ============================================================
      // ❌ ERROR OCCURRED
      // ============================================================
      } else if (data.event === 'ERROR') {
        const errorData = data.data || {};
        toast.error(errorData.error_message || 'WhatsApp setup failed');
        console.error('WhatsApp error:', errorData);
        setConnecting(false);
      }
    } catch (e) {
      // Non-JSON message events - ignore
      console.log('Non-JSON message event (ignored):', event.data);
    }
  };

  // ============================================================
  // ✅ FB LOGIN CALLBACK - Receives the auth code
  // ============================================================
  const fbLoginCallback = (response) => {
    console.log('🔑 FB Login response:', response);
    
    if (!response.authResponse) {
      setConnecting(false);
      toast.error('Facebook login failed. Please try again.');
      return;
    }

    const code = response.authResponse.code;
    console.log('🔑 Exchangeable token code received:', code);

    const { waba_id, phone_number_id, business_id } = signupDataRef.current;

    // ✅ Validate that we have the required data
    if (!waba_id || !phone_number_id) {
      setConnecting(false);
      toast.error(
        'WhatsApp setup did not complete fully. ' +
        'Please close the popup and try again. ' +
        'Make sure you complete all steps including phone number verification.'
      );
      console.error('Missing required data:', { waba_id, phone_number_id });
      return;
    }

    // Send all data to backend
    completeWhatsAppConnection(code, waba_id, phone_number_id, business_id);
  };

  // ============================================================
  // ✅ COMPLETE CONNECTION - Send to backend
  // ============================================================
  const completeWhatsAppConnection = async (code, waba_id, phone_number_id, business_id) => {
    try {
      console.log('📤 Sending to backend:', { code, waba_id, phone_number_id, business_id });
      
      const res = await api.post('/gym/whatsapp/embedded-signup/callback', {
        code,
        waba_id,
        phone_number_id,
        business_id,
      });

      console.log('✅ Backend response:', res.data);
      
      setStatus({ 
        connected: true, 
        ...res.data,
        phone_number: res.data.phone_number || 'Connected',
        display_name: res.data.display_name || 'WhatsApp Business'
      });
      
      toast.success(`✅ WhatsApp connected: ${res.data.phone_number || 'Success!'}`);
      
      // Clear the stored data after successful connection
      signupDataRef.current = {
        waba_id: null,
        phone_number_id: null,
        business_id: null,
        waba_ids: [],
        ad_account_ids: [],
        page_ids: [],
        dataset_ids: [],
        catalog_ids: [],
        instagram_account_ids: [],
        event_type: null
      };
      
    } catch (error) {
      console.error('WhatsApp callback error:', error);
      toast.error(error.response?.data?.detail || 'Failed to connect WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  // ============================================================
  // ✅ LAUNCH WHATSAPP SIGNUP
  // ============================================================
  const launchWhatsAppSignup = () => {
    if (!window.FB) {
      toast.error('Facebook SDK not loaded. Please refresh the page.');
      return;
    }

    if (!config?.config_id) {
      toast.error('WhatsApp configuration not found. Please contact support.');
      return;
    }

    // Reset stored data before launching
    signupDataRef.current = {
      waba_id: null,
      phone_number_id: null,
      business_id: null,
      waba_ids: [],
      ad_account_ids: [],
      page_ids: [],
      dataset_ids: [],
      catalog_ids: [],
      instagram_account_ids: [],
      event_type: null
    };
    
    setConnecting(true);
    
    console.log('🚀 Launching WhatsApp Embedded Signup with config:', config.config_id);
    
    window.FB.login(fbLoginCallback, {
      config_id: config.config_id,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
      },
    });
  };

  // ============================================================
  // ✅ DISCONNECT
  // ============================================================
  const handleDisconnect = async () => {
    if (!window.confirm(
      'Disconnect this WhatsApp number?\n\n' +
      'Your gym will stop sending WhatsApp notifications until you reconnect.'
    )) {
      return;
    }

    try {
      await api.post('/gym/whatsapp/disconnect');
      setStatus({ connected: false });
      toast.success('WhatsApp disconnected successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to disconnect');
    }
  };

  // ============================================================
  // ✅ RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading WhatsApp settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          WhatsApp Business
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Connect your gym's own WhatsApp Business number so invoices and notifications 
          go out under your business name and templates.
        </p>
      </div>

      {/* Status Card */}
      {status?.connected ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-900">
              ✅ Connected — {status.display_name || 'WhatsApp Business Account'}
            </p>
            <p className="text-sm text-green-700 flex items-center gap-2">
              <Phone className="h-3 w-3" />
              {status.phone_number || 'Phone number verified'}
            </p>
            {status.waba_id && (
              <p className="text-xs text-green-600 mt-1">
                WABA ID: {status.waba_id}
              </p>
            )}
          </div>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium flex-shrink-0"
          >
            <Unplug className="h-4 w-4" /> Disconnect
          </button>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              No WhatsApp Business connected
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Connect your own WhatsApp Business number to send invoices 
              and notifications under your gym's name.
            </p>
          </div>
        </div>
      )}

      {/* Connection Button */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={launchWhatsAppSignup}
          disabled={connecting || !sdkLoaded || !config}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium
            transition-all duration-200
            ${(connecting || !sdkLoaded || !config) 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-[#1877f2] hover:bg-[#166fe0]'}
          `}
        >
          {connecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : !sdkLoaded ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading SDK...
            </>
          ) : status?.connected ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Reconnect / Switch Number
            </>
          ) : (
            <>
              <MessageCircle className="h-4 w-4" />
              Connect WhatsApp Number
            </>
          )}
        </button>

        {!sdkLoaded && (
          <p className="text-xs text-gray-500">
            ⏳ Facebook SDK is loading...
          </p>
        )}
      </div>

      {/* Configuration Status */}
      {config && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-500">
            WhatsApp configuration loaded ✓
          </p>
        </div>
      )}

      {/* Help / Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          How it works
        </h4>
        <ul className="mt-2 text-xs text-blue-700 space-y-1.5 list-disc list-inside">
          <li>Click "Connect WhatsApp Number" to start the setup</li>
          <li>A popup will open where you'll connect your Facebook account</li>
          <li>Follow the steps to create or connect your WhatsApp Business Account</li>
          <li>You'll need to verify your phone number during the process</li>
          <li>After successful setup, all invoices and notifications will use your number</li>
        </ul>
        <p className="mt-2 text-xs text-blue-600">
          ⚠️ Make sure popups are allowed for this site
        </p>
      </div>
    </div>
  );
};

// Missing import for RefreshCw
import { RefreshCw } from 'lucide-react';

export default WhatsAppSignupTab;