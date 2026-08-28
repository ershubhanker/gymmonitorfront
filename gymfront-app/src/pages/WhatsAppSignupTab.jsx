// WhatsAppSignupTab.jsx
// Drop this file next to Profile.jsx (e.g. src/components/WhatsAppSignupTab.jsx)
// and wire it into Profile.jsx as a new tab - see PROFILE_INTEGRATION.md.

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, CheckCircle2, Loader2, AlertCircle, Unplug } from 'lucide-react';
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

  // Captured from the WA_EMBEDDED_SIGNUP window message event, used once
  // FB.login()'s own callback fires with the auth code.
  const signupDataRef = useRef({ waba_id: null, phone_number_id: null, business_id: null });

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
      initFacebookSdk(configRes.data.app_id, configRes.data.graph_api_version);
    } catch (error) {
      console.error('Failed to load WhatsApp settings:', error);
      toast.error(error.response?.data?.detail || 'Failed to load WhatsApp settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEmbeddedSignupMessage = (event) => {
    if (!event.origin?.endsWith('facebook.com')) return;
    try {
      const data = JSON.parse(event.data);
      if (data.type !== 'WA_EMBEDDED_SIGNUP') return;

      if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA') {
        const { waba_id, phone_number_id, business_id } = data.data || {};
        signupDataRef.current = { waba_id, phone_number_id, business_id };
      } else if (data.event === 'CANCEL') {
        toast.error(
          `WhatsApp setup cancelled${data.data?.current_step ? ` at step: ${data.data.current_step}` : ''}`
        );
        setConnecting(false);
      } else if (data.event === 'ERROR') {
        toast.error(data.data?.error_message || 'WhatsApp setup failed');
        setConnecting(false);
      }
    } catch {
      // Non-JSON message events (SDK debug noise) - ignore.
    }
  };

  const fbLoginCallback = async (response) => {
    if (!response.authResponse) {
      setConnecting(false);
      return;
    }
    const code = response.authResponse.code;
    const { waba_id, phone_number_id, business_id } = signupDataRef.current;

    if (!waba_id || !phone_number_id) {
      setConnecting(false);
      toast.error('WhatsApp setup did not finish completely. Please try again.');
      return;
    }

    try {
      const res = await api.post('/gym/whatsapp/embedded-signup/callback', {
        code,
        waba_id,
        phone_number_id,
        business_id,
      });
      setStatus({ connected: true, ...res.data });
      toast.success(`WhatsApp connected: ${res.data.phone_number}`);
    } catch (error) {
      console.error('WhatsApp callback error:', error);
      toast.error(error.response?.data?.detail || 'Failed to connect WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  const launchWhatsAppSignup = () => {
    if (!window.FB || !config?.config_id) {
      toast.error('WhatsApp signup is still loading — try again in a moment.');
      return;
    }
    signupDataRef.current = { waba_id: null, phone_number_id: null, business_id: null };
    setConnecting(true);
    window.FB.login(fbLoginCallback, {
      config_id: config.config_id,
      response_type: 'code',
      override_default_response_type: true,
      extras: { setup: {} },
    });
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect this WhatsApp number? Your gym will stop sending notifications until you reconnect.')) {
      return;
    }
    try {
      await api.post('/gym/whatsapp/disconnect');
      setStatus({ connected: false });
      toast.success('WhatsApp disconnected');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to disconnect');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          WhatsApp Business
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Connect your gym's own WhatsApp number so invoices and notifications go out under your business name and templates.
        </p>
      </div>

      {status?.connected ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-900">
              Connected — {status.display_name || 'WhatsApp Business Account'}
            </p>
            <p className="text-sm text-green-700">{status.phone_number}</p>
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
          <p className="text-sm text-yellow-800">
            No WhatsApp number connected yet. Notifications currently use the shared platform number.
          </p>
        </div>
      )}

      <button
        onClick={launchWhatsAppSignup}
        disabled={connecting || !config}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#1877f2] text-white rounded-lg hover:bg-[#166fe0] disabled:opacity-50 font-medium transition-colors"
      >
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        {connecting ? 'Connecting…' : status?.connected ? 'Reconnect / Switch Number' : 'Connect WhatsApp Number'}
      </button>
    </div>
  );
};

export default WhatsAppSignupTab;