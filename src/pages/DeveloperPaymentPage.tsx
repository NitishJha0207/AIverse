import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';

interface LocationState {
  developerId: string;
  message?: string;
}

export function DeveloperPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const state = location.state as LocationState;

  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '4242 4242 4242 4242', // Pre-filled test card
    expiryDate: '12/25',
    cvc: '123'
  });

  useEffect(() => {
    if (!state?.developerId) {
      navigate('/developer/register');
      return;
    }

    if (!auth.isAuthenticated) {
      navigate('/login', { 
        state: { 
          returnTo: '/developer/register',
          message: 'Please log in to complete your registration.' 
        } 
      });
      return;
    }

    setLoading(false);
  }, [state, auth.isAuthenticated, navigate]);

  const handlePayment = async () => {
    try {
      setProcessing(true);
      setError(null);

      // Update developer profile to set payment_status to 'active'
      const { error: updateError } = await supabase
        .from('developer_profiles')
        .update({
          payment_status: 'active',
          payment_id: `test_${Date.now()}`,
          payment_date: new Date().toISOString(),
          payment_amount: 20.00,
          payment_method: 'card'
        })
        .eq('id', state.developerId);

      if (updateError) throw updateError;

      // Create a payment record
      const { error: paymentError } = await supabase
        .from('payment_history')
        .insert({
          developer_id: state.developerId,
          amount: 20.00,
          payment_method: 'card',
          status: 'completed',
          transaction_id: `test_${Date.now()}`
        });

      if (paymentError) {
        console.warn('Failed to create payment record, but payment status was updated:', paymentError);
      }

      setSuccess('Payment successful! You can now publish apps.');
      
      // Navigate to developer console after a short delay
      setTimeout(() => {
        navigate('/developer/console');
      }, 2000);
    } catch (err) {
      console.error('Payment processing failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  // Auto-process payment for testing
  useEffect(() => {
    if (!loading && !processing && !success && !error) {
      const timer = setTimeout(() => {
        handlePayment();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [loading, processing, success, error]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" message="Loading payment details..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Registration</h1>
          <p className="mt-2 text-gray-600">
            One-time payment to start publishing your AI apps
          </p>
          {state.message && (
            <p className="mt-2 text-blue-600 font-medium">{state.message}</p>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span>{success}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Developer License</h3>
              <p className="text-gray-600">Lifetime access to developer features</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">$20</p>
              <p className="text-sm text-gray-500">one-time payment</p>
            </div>
          </div>

          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-2 text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Publish unlimited AI apps</span>
            </li>
            <li className="flex items-center gap-2 text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Detailed analytics and metrics</span>
            </li>
            <li className="flex items-center gap-2 text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Developer support</span>
            </li>
            <li className="flex items-center gap-2 text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Early access to new features</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card Number
              </label>
              <input
                type="text"
                value={paymentDetails.cardNumber}
                onChange={(e) => setPaymentDetails(prev => ({ ...prev, cardNumber: e.target.value }))}
                placeholder="4242 4242 4242 4242"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={processing || !!success}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={paymentDetails.expiryDate}
                  onChange={(e) => setPaymentDetails(prev => ({ ...prev, expiryDate: e.target.value }))}
                  placeholder="MM/YY"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={processing || !!success}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVC
                </label>
                <input
                  type="text"
                  value={paymentDetails.cvc}
                  onChange={(e) => setPaymentDetails(prev => ({ ...prev, cvc: e.target.value }))}
                  placeholder="123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={processing || !!success}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={processing || !!success}
            className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Payment Complete
              </>
            ) : (
              <>
                Complete Payment
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeveloperPaymentPage;