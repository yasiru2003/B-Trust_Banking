import React, { useState, useEffect, useRef } from 'react';
import { 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Scatter,
  ScatterChart
} from 'recharts';
import { 
  AlertTriangle, 
  Activity, 
  Shield, 
  TrendingUp,
  Eye,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/authService';

const LiveFraudAnalyzer = () => {
  const { user } = useAuth();
  const [timelineData, setTimelineData] = useState([]);
  const [fraudStats, setFraudStats] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastFraudAlert, setLastFraudAlert] = useState(null);
  const wsRef = useRef(null);
  const audioRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const maxDataPoints = 100; // Keep last 100 data points

  // Helper function to safely send WebSocket messages
  const sendWebSocketMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
      }
    } else {
      console.warn('WebSocket is not ready to send messages');
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    if (user?.role !== 'Admin') return;

    const connectWebSocket = () => {
      try {
        const wsUrl = `ws://localhost:5001/ws/fraud`;
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('Fraud monitoring WebSocket connected');
          setIsConnected(true);
          
          // Wait for WebSocket to be ready before sending
          setTimeout(() => {
            sendWebSocketMessage({
              type: 'subscribe',
              channels: ['fraud_alerts', 'transaction_updates']
            });
          }, 100);

          // Start ping interval to keep connection alive
          pingIntervalRef.current = setInterval(() => {
            sendWebSocketMessage({ type: 'ping' });
          }, 30000); // Ping every 30 seconds
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (error) {
            console.error('WebSocket message error:', error);
          }
        };

        wsRef.current.onclose = () => {
          console.log('Fraud monitoring WebSocket disconnected');
          setIsConnected(false);
          
          // Clear ping interval
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setIsConnected(false);
        // Retry connection after 5 seconds
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [user?.role, handleWebSocketMessage]);

  // Initialize audio for fraud alerts
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
  }, []);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'fraud_stats':
        setFraudStats(data.data);
        break;
      case 'fraud_alert':
        handleFraudAlert(data.data);
        break;
      case 'transaction_update':
        handleTransactionUpdate(data.data);
        break;
      case 'pong':
        // Keep connection alive
        break;
      default:
        // Handle unknown message types
        break;
    }
  };

  const handleFraudAlert = (alert) => {
    setLastFraudAlert(alert);
    
    // Play alert sound if enabled
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }

    // Add to timeline data
    const newPoint = {
      time: new Date(alert.detected_at).toISOString(),
      timestamp: new Date(alert.detected_at).getTime(),
      amount: alert.amount,
      type: alert.transaction_type,
      customer: alert.customer_name,
      account: alert.account_number,
      isFraud: true,
      fraudScore: alert.fraud_score,
      severity: alert.severity,
      fraudDescription: alert.description,
      alertId: alert.alert_id
    };

    setTimelineData(prev => {
      const updated = [...prev, newPoint];
      return updated.slice(-maxDataPoints); // Keep only last 100 points
    });
  };

  const handleTransactionUpdate = (transaction) => {
    const newPoint = {
      time: new Date(transaction.transaction_date).toISOString(),
      timestamp: new Date(transaction.transaction_date).getTime(),
      amount: transaction.amount,
      type: transaction.transaction_type,
      customer: transaction.customer_id,
      account: transaction.account_id,
      isFraud: transaction.isFraud,
      fraudScore: transaction.fraudScore,
      severity: transaction.severity
    };

    setTimelineData(prev => {
      const updated = [...prev, newPoint];
      return updated.slice(-maxDataPoints);
    });
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [statsResponse, feedResponse] = await Promise.all([
          api.get('/fraud/stats').catch(() => ({ data: { data: { total_alerts: 0, pending_alerts: 0, today_alerts: 0 } } })),
          api.get('/fraud/live-feed?minutes=10').catch(() => ({ data: { data: [] } }))
        ]);

        setFraudStats(statsResponse.data.data);
        setTimelineData(feedResponse.data.data.slice(-maxDataPoints));
      } catch (error) {
        console.error('Failed to fetch initial fraud data:', error);
        // Set default values if API fails
        setFraudStats({
          total_alerts: 0,
          pending_alerts: 0,
          investigating_alerts: 0,
          resolved_alerts: 0,
          critical_alerts: 0,
          high_alerts: 0,
          today_alerts: 0,
          avg_fraud_score: 0
        });
        setTimelineData([]);
      }
    };

    if (user?.role === 'Admin') {
      fetchInitialData();
    }
  }, [user?.role]);

  // Add mock data for testing when API is not available
  useEffect(() => {
    if (user?.role === 'Admin' && !fraudStats) {
      // Generate some mock timeline data for testing
      const mockData = [];
      const now = Date.now();
      
      for (let i = 0; i < 20; i++) {
        const timestamp = now - (i * 30000); // Every 30 seconds
        const isFraud = Math.random() < 0.1; // 10% chance of fraud
        
        mockData.push({
          time: new Date(timestamp).toISOString(),
          timestamp: timestamp,
          amount: Math.random() * 2000000 + 100000, // Rs. 100K to 2M
          type: ['deposit', 'withdrawal', 'transfer'][Math.floor(Math.random() * 3)],
          customer: `Customer ${Math.floor(Math.random() * 1000)}`,
          account: `ACC${Math.floor(Math.random() * 10000)}`,
          isFraud: isFraud,
          fraudScore: isFraud ? Math.random() * 0.5 + 0.5 : 0,
          severity: isFraud ? ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] : null,
          fraudDescription: isFraud ? 'Suspicious transaction pattern detected' : null
        });
      }
      
      setTimelineData(mockData);
      
      // Set mock fraud stats
      setFraudStats({
        total_alerts: 15,
        pending_alerts: 3,
        investigating_alerts: 2,
        resolved_alerts: 10,
        critical_alerts: 1,
        high_alerts: 4,
        today_alerts: 5,
        avg_fraud_score: 0.65
      });
    }
  }, [user?.role, fraudStats]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };


  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{formatTime(data.timestamp)}</p>
          <p className="text-sm text-gray-600">Amount: Rs. {data.amount?.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Type: {data.type}</p>
          {data.isFraud && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-medium text-red-800">🚨 Fraud Detected</p>
              <p className="text-xs text-red-600">Score: {data.fraudScore}</p>
              <p className="text-xs text-red-600">Severity: {data.severity}</p>
              <p className="text-xs text-red-600">{data.fraudDescription}</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Fraud monitoring is only available to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900">Live Fraud Analyzer</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-500">{isConnected ? 'Live' : 'Disconnected'}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg ${soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            
            {fraudStats && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Today's Alerts</p>
                <p className="text-lg font-bold text-red-600">{fraudStats.today_alerts}</p>
              </div>
            )}
            
            {!isConnected && (
              <div className="text-right">
                <p className="text-xs text-orange-600">Demo Mode</p>
                <p className="text-xs text-gray-500">Using mock data</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fraud Stats Cards */}
      {fraudStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-900">{fraudStats.critical_alerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">High Risk</p>
                <p className="text-2xl font-bold text-orange-900">{fraudStats.high_alerts}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{fraudStats.pending_alerts}</p>
              </div>
              <Eye className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Resolved</p>
                <p className="text-2xl font-bold text-green-900">{fraudStats.resolved_alerts}</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Live Transaction Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-500" />
            Live Transaction Timeline
          </h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Normal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Fraud</span>
            </div>
          </div>
        </div>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={timelineData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                type="number" 
                dataKey="timestamp" 
                scale="time" 
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => formatTime(value)}
                stroke="#6b7280"
              />
              <YAxis 
                dataKey="amount" 
                tickFormatter={(value) => `Rs. ${(value / 1000000).toFixed(1)}M`}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Normal transactions */}
              <Scatter
                data={timelineData.filter(d => !d.isFraud)}
                fill="#10b981"
                r={4}
              />
              
              {/* Fraud transactions */}
              <Scatter
                data={timelineData.filter(d => d.isFraud)}
                fill="#ef4444"
                r={8}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Last Fraud Alert */}
      {lastFraudAlert && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <div>
              <p className="font-medium text-red-800">Latest Fraud Alert</p>
              <p className="text-sm text-red-600">{lastFraudAlert.description}</p>
              <p className="text-xs text-red-500">
                {lastFraudAlert.customer_name} - Account {lastFraudAlert.account_number} - 
                Rs. {lastFraudAlert.amount?.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveFraudAnalyzer;
