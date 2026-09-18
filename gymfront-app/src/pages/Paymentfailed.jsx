import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, RotateCcw, LifeBuoy, Dumbbell } from 'lucide-react';

const REASON_MESSAGES = {
  cancelled: "You closed the payment window before finishing. No charge was made.",
  verification_failed: "We couldn't verify your payment. If money was deducted, it will be auto-refunded within 5-7 business days.",
  payment_failed: "Your bank or payment method declined the transaction.",
};

function friendlyReason(reason) {
  if (!reason) return "Something went wrong while processing your payment.";
  return REASON_MESSAGES[reason] || decodeURIComponent(reason);
}

export default function PaymentFailed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-red-50/30 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1.5 rounded-xl font-bold text-lg shadow-md flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            <span>Gym Monitor</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <XCircle className="h-9 w-9 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment not completed</h1>
          <p className="text-gray-500 mb-8">{friendlyReason(reason)}</p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/pricing')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Try Again
            </button>
            <a
              href="mailto:info@maskottchentechnology.com"
              className="w-full text-gray-500 font-medium py-3 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <LifeBuoy className="h-4 w-4" /> Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}