import { supabase } from './supabase';

export interface PaymentDetails {
  cardNumber: string;
  expiryDate: string;
  cvc: string;
  amount: number;
}

export async function processPayment(developerId: string, details: PaymentDetails) {
  try {
    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payment_history')
      .insert({
        developer_id: developerId,
        amount: details.amount,
        payment_method: 'card',
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // In a real app, you would integrate with a payment provider here
    // For demo purposes, we'll simulate a successful payment
    const transactionId = `demo_${Date.now()}`;

    // Update payment record
    const { error: updateError } = await supabase
      .from('payment_history')
      .update({
        status: 'completed',
        transaction_id: transactionId
      })
      .eq('id', payment.id);

    if (updateError) throw updateError;

    // Update developer profile
    const { error: profileError } = await supabase
      .from('developer_profiles')
      .update({
        payment_status: 'active',
        payment_id: transactionId,
        payment_date: new Date().toISOString(),
        payment_amount: details.amount,
        payment_method: 'card'
      })
      .eq('id', developerId);

    if (profileError) throw profileError;

    return { success: true, transactionId };
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw error;
  }
}

export async function getPaymentHistory(developerId: string) {
  try {
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('developer_id', developerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch payment history:', error);
    throw error;
  }
}