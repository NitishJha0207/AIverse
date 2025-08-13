import { processAppSubmission } from '../lib/appProcessing';
import { supabase } from '../lib/supabase';
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty'
  }
});

async function processNextApp() {
  try {
    // Get next pending submission
    const { data: submission, error } = await supabase
      .from('app_submissions')
      .select('*')
      .eq('status', 'pending')
      .order('submission_date', { ascending: true })
      .limit(1)
      .single();

    if (error || !submission) {
      if (error.code !== 'PGRST116') { // Not found is okay
        logger.error('Failed to fetch next submission:', error);
      }
      return;
    }

    // Get the binary file
    const { data: binaryData, error: binaryError } = await supabase.storage
      .from('app-binaries')
      .download(`${submission.id}/${submission.binary_url}`);

    if (binaryError) {
      logger.error('Failed to download binary:', binaryError);
      return;
    }

    // Convert to File object
    const file = new File([binaryData], submission.binary_url, {
      type: 'application/octet-stream'
    });

    // Process the submission
    await processAppSubmission(
      submission,
      file,
      (progress) => {
        logger.info(`Processing progress for ${submission.id}: ${progress}%`);
      }
    );

  } catch (error) {
    logger.error('Processing failed:', error);
  }
}

// Start processing loop
async function startProcessing() {
  logger.info('Starting app processing worker...');
  
  while (true) {
    await processNextApp();
    // Wait 5 seconds before checking for next app
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

startProcessing().catch(error => {
  logger.error('Processing worker failed:', error);
  process.exit(1);
});