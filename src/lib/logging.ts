import pino from 'pino';
import { supabase } from './supabase';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create a logger instance with pretty printing for development
export const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  transport: !isBrowser ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined,
  hooks: {
    logMethod(inputArgs, method) {
      // Store log in database
      const level = method.name;
      const msg = inputArgs[0];
      const data = inputArgs[1] || {};

      // Don't block on database logging
      storeLog(level, msg, data).catch(err => {
        console.error('Failed to store log:', err);
      });

      // Continue with normal logging
      method.apply(this, inputArgs);
    }
  }
});

// Function to store logs in database
async function storeLog(
  level: string,
  message: string | Record<string, any>,
  data?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Only log for authenticated users

    let component = 'app';
    let metadata = {};
    let errorDetails = {};
    let stackTrace = null;
    let context = {};

    // Extract data from message if it's an object
    if (typeof message === 'object') {
      component = message.component || component;
      metadata = { ...message };
      delete metadata.component;
      message = message.msg || JSON.stringify(message);
    }

    // Extract error information if present
    if (data?.error instanceof Error) {
      errorDetails = {
        name: data.error.name,
        message: data.error.message
      };
      stackTrace = data.error.stack;
      delete data.error;
    }

    // Store context data
    if (data) {
      context = { ...data };
    }

    // Log to database
    const { error: logError } = await supabase.rpc('log_error', {
      p_user_id: user.id,
      p_level: level,
      p_component: component,
      p_message: message.toString(),
      p_error_details: errorDetails,
      p_stack_trace: stackTrace,
      p_metadata: metadata,
      p_context: context
    });

    if (logError) {
      console.error('Failed to store log:', logError);
    }
  } catch (err) {
    console.error('Error storing log:', err);
  }
}

// Create separate loggers for different concerns
export const appLogger = logger.child({ component: 'app' });
export const publishingLogger = logger.child({ component: 'publishing' });
export const processingLogger = logger.child({ component: 'processing' });
export const storageLogger = logger.child({ component: 'storage' });
export const databaseLogger = logger.child({ component: 'database' });

// Log publishing steps
export const logPublishingStep = (
  step: string,
  details: Record<string, any>,
  error?: Error
) => {
  const logData = {
    step,
    timestamp: new Date().toISOString(),
    ...details
  };

  if (error) {
    publishingLogger.error({ 
      ...logData, 
      error,
      component: 'publishing'
    }, `Publishing failed at step: ${step}`);
  } else {
    publishingLogger.info({ 
      ...logData,
      component: 'publishing'
    }, `Publishing step completed: ${step}`);
  }
};

// Log processing progress
export const logProcessingProgress = (
  submissionId: string,
  step: string,
  progress: number,
  details?: Record<string, any>
) => {
  const logData = {
    submissionId,
    step,
    progress,
    timestamp: new Date().toISOString(),
    ...details
  };

  processingLogger.info({ 
    ...logData,
    component: 'processing'
  }, `Processing progress: ${progress}% at step ${step}`);
};

// Create a log file for each submission
export const createSubmissionLogger = (submissionId: string) => {
  return logger.child({
    submissionId,
    component: 'submission'
  });
};