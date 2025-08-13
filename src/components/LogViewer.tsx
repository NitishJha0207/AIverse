import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, Search, X, Filter, Clock, AlertCircle } from 'lucide-react';
import { logger } from '../lib/logging';

interface LogEntry {
  level: string;
  time: string;
  msg: string;
  component?: string;
  error?: any;
  stack?: string;
  [key: string]: any;
}

interface LogViewerProps {
  onClose?: () => void;
}

export function LogViewer({ onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [componentFilter, setComponentFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '5min' | '15min' | '1hour'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to logger
    const subscription = logger.subscribe((log: LogEntry) => {
      setLogs(prev => [...prev, log]);
    });

    // Load existing logs from localStorage if any
    const storedLogs = localStorage.getItem('app_logs');
    if (storedLogs) {
      try {
        const parsedLogs = JSON.parse(storedLogs);
        setLogs(parsedLogs);
      } catch (err) {
        console.error('Failed to parse stored logs:', err);
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Save logs to localStorage
  useEffect(() => {
    localStorage.setItem('app_logs', JSON.stringify(logs.slice(-1000))); // Keep last 1000 logs
  }, [logs]);

  const getTimeFilteredLogs = (logs: LogEntry[]) => {
    if (timeFilter === 'all') return logs;
    
    const now = new Date();
    const filterTime = new Date();
    
    switch (timeFilter) {
      case '5min':
        filterTime.setMinutes(now.getMinutes() - 5);
        break;
      case '15min':
        filterTime.setMinutes(now.getMinutes() - 15);
        break;
      case '1hour':
        filterTime.setHours(now.getHours() - 1);
        break;
    }

    return logs.filter(log => new Date(log.time) > filterTime);
  };

  const filteredLogs = getTimeFilteredLogs(logs).filter(log => {
    const matchesSearch = filter === '' || 
      JSON.stringify(log).toLowerCase().includes(filter.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesComponent = componentFilter === 'all' || log.component === componentFilter;
    const matchesErrorFilter = !showErrorsOnly || log.level === 'error';
    return matchesSearch && matchesLevel && matchesComponent && matchesErrorFilter;
  });

  const uniqueComponents = Array.from(new Set(logs.map(log => log.component))).filter(Boolean);
  const logLevels = ['debug', 'info', 'warn', 'error'];

  const handleDownload = () => {
    const logText = filteredLogs
      .map(log => JSON.stringify(log, null, 2))
      .join('\n');
    
    const blob = new Blob([logText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aiverse-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('app_logs');
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-50 text-red-700';
      case 'warn': return 'bg-yellow-50 text-yellow-700';
      case 'info': return 'bg-blue-50 text-blue-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl m-4 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">System Logs</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Levels</option>
              {logLevels.map(level => (
                <option key={level} value={level}>{level.toUpperCase()}</option>
              ))}
            </select>

            <select
              value={componentFilter}
              onChange={(e) => setComponentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Components</option>
              {uniqueComponents.map(component => (
                <option key={component} value={component}>{component}</option>
              ))}
            </select>

            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Time</option>
              <option value="5min">Last 5 minutes</option>
              <option value="15min">Last 15 minutes</option>
              <option value="1hour">Last hour</option>
            </select>

            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Logs
            </button>

            <button
              onClick={clearLogs}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoScroll"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="autoScroll" className="text-sm text-gray-600">
                Auto-scroll to new logs
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showErrors"
                checked={showErrorsOnly}
                onChange={(e) => setShowErrorsOnly(e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="showErrors" className="text-sm text-gray-600">
                Show errors only
              </label>
            </div>
          </div>
        </div>

        <div 
          ref={logContainerRef}
          className="flex-1 overflow-auto p-4 font-mono text-sm bg-gray-50"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No logs found matching your criteria
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg ${getLogColor(log.level)}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">[{log.level.toUpperCase()}]</span>
                    <Clock className="w-4 h-4" />
                    <span className="text-gray-500">{new Date(log.time).toLocaleString()}</span>
                    {log.component && (
                      <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">
                        {log.component}
                      </span>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{log.msg}</div>
                  {log.error && (
                    <div className="mt-2 text-red-600">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Error: {log.error}</span>
                      </div>
                      {log.stack && (
                        <pre className="mt-1 text-xs overflow-x-auto p-2 bg-red-100 rounded">
                          {log.stack}
                        </pre>
                      )}
                    </div>
                  )}
                  {Object.entries(log)
                    .filter(([key]) => !['level', 'time', 'msg', 'component', 'error', 'stack'].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="mt-1 text-sm opacity-75">
                        <span className="font-medium">{key}:</span>{' '}
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                      </div>
                    ))
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}