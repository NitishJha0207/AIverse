/*
  # Fix app_submissions status constraint
  
  1. Changes
    - Update status check constraint to include all valid statuses
    - Add missing status values:
      - pending_review
      - pending_processing
      - processing
      - automated_review
*/

-- Drop existing status constraint
ALTER TABLE app_submissions 
DROP CONSTRAINT IF EXISTS app_submissions_status_check;

-- Add updated status constraint
ALTER TABLE app_submissions
ADD CONSTRAINT app_submissions_status_check
CHECK (status IN (
  'draft',
  'pending',
  'pending_review',
  'pending_processing',
  'processing',
  'automated_review',
  'approved',
  'rejected',
  'failed'
));

-- Update any existing rows with invalid status
UPDATE app_submissions
SET status = 'pending'
WHERE status NOT IN (
  'draft',
  'pending',
  'pending_review',
  'pending_processing',
  'processing',
  'automated_review',
  'approved',
  'rejected',
  'failed'
);