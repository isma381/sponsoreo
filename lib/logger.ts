import { NextRequest } from 'next/server';

type LogLevel = 'info' | 'warn' | 'error' | 'security';

interface LogData {
  level: LogLevel;
  action: string;
  userId?: string;
  email?: string;
  ip?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  const ip = forwarded?.split(',')[0]?.trim() || realIP?.trim() || cfIP?.trim() || 'unknown';
  return ip;
}

export function logSecurity(
  action: string,
  request: NextRequest,
  data: {
    userId?: string;
    email?: string;
    success?: boolean;
    error?: string;
    metadata?: Record<string, any>;
  }
) {
  const logData: LogData = {
    level: 'security',
    action,
    userId: data.userId,
    email: data.email,
    ip: getClientIP(request),
    metadata: {
      ...data.metadata,
      success: data.success ?? true,
      error: data.error,
    },
    timestamp: new Date().toISOString(),
  };

  // Log estructurado para fácil parsing
  console.log('[SECURITY]', JSON.stringify(logData));
}

export function logError(
  action: string,
  request: NextRequest,
  error: Error | string,
  metadata?: Record<string, any>
) {
  const logData: LogData = {
    level: 'error',
    action,
    ip: getClientIP(request),
    metadata: {
      ...metadata,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    },
    timestamp: new Date().toISOString(),
  };

  console.error('[ERROR]', JSON.stringify(logData));
}

export function logAction(
  action: string,
  request: NextRequest,
  data: {
    userId: string;
    success?: boolean;
    metadata?: Record<string, any>;
  }
) {
  const logData: LogData = {
    level: 'info',
    action,
    userId: data.userId,
    ip: getClientIP(request),
    metadata: {
      ...data.metadata,
      success: data.success ?? true,
    },
    timestamp: new Date().toISOString(),
  };

  console.log('[ACTION]', JSON.stringify(logData));
}
