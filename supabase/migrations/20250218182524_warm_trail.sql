/*
  # Add Payment Tracking

  1. Changes
    - Add payment tracking fields to developer_profiles table
    - Add payment_history table for tracking transactions
    - Add RLS policies for payment data

  2. Security
    - Enable RLS on payment_history table
    - Add policies for developers to view their own payment history
*/

-- Add payment tracking fields to developer_profiles
ALTER TABLE developer_profiles
ADD COLUMN IF NOT EXISTS payment_id text,
ADD COLUMN IF NOT EXISTS payment_date timestamptz,
ADD COLUMN IF NOT EXISTS payment_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS payment_method text;

-- Create payment history table
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid REFERENCES developer_profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  transaction_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Developers can view own payment history"
  ON payment_history
  FOR SELECT
  TO authenticated
  USING (
    developer_id IN (
      SELECT id FROM developer_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_payment_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamps
CREATE TRIGGER update_payment_history_timestamp
  BEFORE UPDATE ON payment_history
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_history_updated_at();