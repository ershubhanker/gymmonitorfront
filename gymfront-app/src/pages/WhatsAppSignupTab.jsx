// WhatsAppSignupTab.jsx
// Complete working implementation with Meta WhatsApp Embedded Signup and Phone Number Management

import React, { useEffect, useRef, useState } from 'react';
import { 
  MessageCircle, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Unplug, 
  Smartphone, 
  Building2, 
  Phone, 
  RefreshCw, 
  Check, 
  PlusCircle, 
  ShieldCheck 
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const FB_SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';

const initFacebookSdk = (appId, version) => {
  if (!appId) return;
  const apiVersion = version || 'v21.0';
  if (window.FB) {
    try {
      window.FB.init({ appId, cookie: true, autoLogAppEvents: true, xfbml: true, version: apiVersion });
    } catch (e) {
      console.warn('FB.init error:', e);
    }
    return;
  }
  window.fbAsyncInit = () => {
    try {
      window.FB.init({ appId, cookie: true, autoLogAppEvents: true, xfbml: true, version: apiVersion });
    } catch (e) {
      console.warn('FB.init error:', e);
    }
  };
  if (!document.getElementById('facebook-jssdk')) {
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = FB_SDK_SRC;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }
};

const WhatsAppSignupTab = ({ onNavigateToChat }) => {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [switchingNumber, setSwitchingNumber] = useState(false);

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

      if (statusRes.data?.connected) {
        fetchPhoneNumbers();
      }
      
      // Initialize Facebook SDK
      if (configRes.data.app_id) {
        initFacebookSdk(configRes.data.app_id, configRes.data.graph_api_version || 'v25.0');
        if (window.FB) {
          setSdkLoaded(true);
        } else {
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

  const fetchPhoneNumbers = async () => {
    try {
      const res = await api.get('/gym/whatsapp/phone-numbers');
      if (res.data?.phone_numbers) {
        setPhoneNumbers(res.data.phone_numbers);
      }
    } catch (error) {
      console.warn('Could not fetch WABA phone numbers:', error);
    }
  };

  // ============================================================
  // ✅ ROBUST MESSAGE EVENT HANDLER - Handles Objects & JSON Strings
  // ============================================================
  const handleEmbeddedSignupMessage = (event) => {
    // Only process messages from Facebook
    if (!event.origin || (!event.origin.endsWith('facebook.com') && !event.origin.includes('facebook'))) return;

    let data = null;
    try {
      if (typeof event.data === 'string') {
        data = JSON.parse(event.data);
      } else if (typeof event.data === 'object' && event.data !== null) {
        data = event.data;
      }
    } catch {
      // Non-JSON message event, ignore
      return;
    }

    if (!data || data.type !== 'WA_EMBEDDED_SIGNUP') return;

    console.log('📨 Embedded Signup message event:', data);

    // ============================================================
    // ✅ SUCCESSFUL COMPLETION - Captures all asset IDs
    // ============================================================
    if (
      data.event === 'FINISH' || 
      data.event === 'FINISH_ONLY_WABA' || 
      data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' || 
      data.event === 'FINISH_OBO_MIGRATION' || 
      data.event === 'FINISH_GRANT_ONLY_API_ACCESS'
    ) {
      const eventData = data.data || {};
      
      // Store all captured IDs
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

      console.log('✅ WABA Signup Data Captured from Meta popup:', signupDataRef.current);
      toast.success(
        `WhatsApp setup complete in popup! Finalizing connection...`,
        { duration: 4000 }
      );

    // ============================================================
    // ❌ CANCELLED FLOW
    // ============================================================
    } else if (data.event === 'CANCEL') {
      const cancelData = data.data || {};
      if (cancelData.error_message) {
        toast.error(`WhatsApp setup error: ${cancelData.error_message}`);
        console.error('WhatsApp setup error reported:', cancelData);
      } else {
        const step = cancelData.current_step || 'unknown';
        toast.info(`WhatsApp setup window closed at step: ${step}`);
      }
      setConnecting(false);

    // ============================================================
    // ❌ ERROR OCCURRED
    // ============================================================
    } else if (data.event === 'ERROR') {
      const errorData = data.data || {};
      toast.error(errorData.error_message || 'WhatsApp setup failed');
      console.error('WhatsApp error event:', errorData);
      setConnecting(false);
    }
  };

  // ============================================================
  // ✅ FB LOGIN CALLBACK - Receives the auth code
  // ============================================================
  const fbLoginCallback = (response) => {
    console.log('🔑 FB Login response:', response);
    
    if (response?.error_message) {
      setConnecting(false);
      toast.error(`Facebook login error: ${response.error_message}`);
      return;
    }

    if (!response || !response.authResponse || !response.authResponse.code) {
      setConnecting(false);
      if (response?.status === 'unknown') {
        toast.info('Facebook login popup was closed or blocked.');
      } else {
        toast.error('Facebook authentication was not completed. Please try again.');
      }
      return;
    }

    const code = response.authResponse.code;
    console.log('🔑 Exchangeable auth code received:', code);

    const { waba_id, phone_number_id, business_id } = signupDataRef.current;

    // Send code to backend; backend auto-discovers WABA and Phone IDs if missing
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
      
      // Fetch refreshed phone numbers under the WABA
      fetchPhoneNumbers();

      // Clear the stored ref data
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
  // ✅ LAUNCH WHATSAPP SIGNUP / ADD PHONE NUMBER
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
    
    try {
      window.FB.login(fbLoginCallback, {
        config_id: config.config_id,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '3',
        },
      });
    } catch (err) {
      console.error('FB.login error:', err);
      toast.error('Failed to open Facebook login: ' + err.message);
      setConnecting(false);
    }
  };

  // ============================================================
  // ✅ SELECT / SWITCH PHONE NUMBER
  // ============================================================
  const handleSelectPhoneNumber = async (phoneNumberId) => {
    if (switchingNumber || phoneNumberId === status?.phone_number_id) return;

    setSwitchingNumber(true);
    try {
      const res = await api.post('/gym/whatsapp/select-phone-number', {
        phone_number_id: phoneNumberId,
      });

      setStatus(prev => ({
        ...prev,
        phone_number: res.data.phone_number,
        phone_number_id: res.data.phone_number_id,
        display_name: res.data.display_name,
      }));

      toast.success(`Active WhatsApp number set to ${res.data.phone_number || 'selected number'}`);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Failed to switch phone number:', error);
      toast.error(error.response?.data?.detail || 'Failed to switch phone number');
    } finally {
      setSwitchingNumber(false);
    }
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
      setPhoneNumbers([]);
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
          Connect your gym's WhatsApp Business number so member invoices and renewal 
          notifications go out directly from your verified business number.
        </p>
      </div>

      {/* Status Card */}
      {status?.connected ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-900">
                ✅ Connected — {status.display_name || 'WhatsApp Business Account'}
              </p>
              <p className="text-sm text-green-700 flex items-center gap-2 mt-0.5">
                <Phone className="h-3.5 w-3.5" />
                Active Number: <span className="font-semibold">{status.phone_number || 'Phone number verified'}</span>
              </p>
              {status.waba_id && (
                <p className="text-xs text-green-600 mt-1 font-mono">
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

          <div className="pt-2.5 border-t border-green-200/80 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-green-800">
              Your number is live for notifications, automated invoices, and 2-way member chat.
            </p>
            {onNavigateToChat && (
              <button
                type="button"
                onClick={onNavigateToChat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <MessageCircle className="h-4 w-4" /> Open WhatsApp Live Chat
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              No WhatsApp Business connected
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Connect your own WhatsApp Business number to send invoices and notifications 
              under your gym's official name and phone number.
            </p>
          </div>
        </div>
      )}

      {/* Phone Numbers List (if connected and multiple numbers exist) */}
      {status?.connected && phoneNumbers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              Registered Phone Numbers under your Account ({phoneNumbers.length})
            </h4>
            <button
              onClick={fetchPhoneNumbers}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Refresh List
            </button>
          </div>

          <div className="space-y-2">
            {phoneNumbers.map((num) => {
              const isActive = status?.phone_number === num.display_phone_number || status?.phone_number_id === num.id;
              return (
                <div 
                  key={num.id}
                  className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-colors ${
                    isActive ? 'bg-green-50/70 border-green-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Phone className={`h-4 w-4 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        {num.display_phone_number}
                        {num.verified_name && (
                          <span className="text-xs text-gray-500 font-normal">({num.verified_name})</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        Status: <span className="font-mono text-gray-700">{num.code_verification_status || 'VERIFIED'}</span>
                        {num.quality_rating && ` • Quality: ${num.quality_rating}`}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSelectPhoneNumber(num.id)}
                        disabled={switchingNumber}
                        className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        {switchingNumber ? 'Switching...' : 'Use this number'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connection Buttons */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={launchWhatsAppSignup}
          disabled={connecting || !sdkLoaded || !config}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium
            transition-all duration-200
            ${(connecting || !sdkLoaded || !config) 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-[#1877f2] hover:bg-[#166fe0] shadow-sm'}
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
              Loading Facebook SDK...
            </>
          ) : status?.connected ? (
            <>
              <PlusCircle className="h-4 w-4" />
              Add / Reconnect WhatsApp Number
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
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
          <span>WhatsApp Embedded Signup Ready ✓</span>
          <span className="font-mono text-gray-400">Meta API {config.graph_api_version || 'v25.0'}</span>
        </div>
      )}

      {/* Help / Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          How Embedded Signup & Phone Number Setup works
        </h4>
        <ul className="mt-2 text-xs text-blue-700 space-y-1.5 list-disc list-inside">
          <li>Click <strong>"Connect WhatsApp Number"</strong> (or <strong>"Add / Reconnect WhatsApp Number"</strong>).</li>
          <li>Meta's secure popup window will open where you log into your Facebook / Meta account.</li>
          <li>Select or create your <strong>WhatsApp Business Account (WABA)</strong>.</li>
          <li>Select an existing phone number or choose <strong>"Add a phone number"</strong> and verify it via SMS or Phone Call OTP.</li>
          <li>Once verified, close the popup — GymMonitor will automatically configure the Cloud API sending credentials for your gym.</li>
        </ul>
        <p className="mt-2 text-xs text-blue-600">
          ⚠️ Make sure popups are allowed for this site in your browser.
        </p>
      </div>
    </div>
  );
};

export default WhatsAppSignupTab;
