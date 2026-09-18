import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowRight, Dumbbell } from 'lucide-react';
import api from '../services/api';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subscriptionId = searchParams.get('subscription_id');

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/gym/billing/status');
        setStatus(res.data);
      } catch {
        // Non-fatal — the page still confirms success from the URL alone
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/40 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1.5 rounded-xl font-bold text-lg shadow-md flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            <span>Gym Monitor</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription activated!</h1>
          <p className="text-gray-500 mb-6">
            Your GymMonitor Pro subscription is live. You now have full access to every feature.
          </p>

          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Confirming details...
            </div>
          ) : status?.has_subscription ? (
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium text-gray-800 capitalize">{status.billing_cycle}</span>
              </div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-500">Amount</span>
                <span className="font-medium text-gray-800">₹{status.total_amount?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Next billing date</span>
                <span className="font-medium text-gray-800">
                  {status.current_period_end ? new Date(status.current_period_end).toLocaleDateString('en-IN') : '—'}
                </span>
              </div>
            </div>
          ) : null}

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </button>

          {subscriptionId && (
            <p className="text-xs text-gray-300 mt-4">Reference: {subscriptionId}</p>
          )}
        </div>
      </div>
    </div>
  );
}