import React from 'react';
import { Shield, AlertTriangle, Clock, DollarSign, TrendingUp, Activity } from 'lucide-react';

const FraudRulesDisplay = () => {
  const fraudRules = [
    {
      id: 1,
      name: "High Amount Transaction",
      description: "Detect transactions above threshold",
      type: "transaction",
      severity: "high",
      conditions: {
        currency: "LKR",
        amount_threshold: 1000000
      },
      icon: DollarSign,
      color: "red"
    },
    {
      id: 2,
      name: "Rapid Successive Transactions",
      description: "Multiple transactions in short time",
      type: "pattern",
      severity: "medium",
      conditions: {
        amount_threshold: 100000,
        transaction_count: 3,
        time_window_minutes: 5
      },
      icon: Activity,
      color: "yellow"
    },
    {
      id: 3,
      name: "Unusual Time Transaction",
      description: "Transactions outside business hours",
      type: "transaction",
      severity: "low",
      conditions: {
        weekend_check: true,
        business_hours_end: "17:00",
        business_hours_start: "09:00"
      },
      icon: Clock,
      color: "blue"
    },
    {
      id: 4,
      name: "Large Withdrawal",
      description: "High amount withdrawals",
      type: "transaction",
      severity: "high",
      conditions: {
        amount_threshold: 500000,
        transaction_type: "withdrawal"
      },
      icon: AlertTriangle,
      color: "red"
    },
    {
      id: 5,
      name: "New Account Large Transaction",
      description: "Large transactions on new accounts",
      type: "account",
      severity: "medium",
      conditions: {
        account_age_days: 30,
        amount_threshold: 200000
      },
      icon: TrendingUp,
      color: "yellow"
    },
    {
      id: 6,
      name: "Velocity Check",
      description: "Too many transactions per day",
      type: "pattern",
      severity: "medium",
      conditions: {
        daily_limit: 10,
        amount_threshold: 50000
      },
      icon: Activity,
      color: "yellow"
    },
    {
      id: 7,
      name: "Account Balance Anomaly",
      description: "Transaction exceeds account balance significantly",
      type: "account",
      severity: "high",
      conditions: {
        balance_check: true,
        overdraft_limit: 10000
      },
      icon: Shield,
      color: "red"
    }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getIconColor = (color) => {
    switch (color) {
      case 'red':
        return 'text-red-600';
      case 'yellow':
        return 'text-yellow-600';
      case 'blue':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getBgColor = (color) => {
    switch (color) {
      case 'red':
        return 'bg-red-50';
      case 'yellow':
        return 'bg-yellow-50';
      case 'blue':
        return 'bg-blue-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-100 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-sm font-medium text-green-800">
            All fraud detection rules are active and monitoring transactions in real-time
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fraudRules.map((rule) => {
          const IconComponent = rule.icon;
          return (
            <div key={rule.id} className={`${getBgColor(rule.color)} rounded-lg border border-gray-200 p-6`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`p-2 rounded-full ${getBgColor(rule.color)}`}>
                    <IconComponent className={`h-5 w-5 ${getIconColor(rule.color)}`} />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                    <p className="text-sm text-gray-600">{rule.description}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(rule.severity)}`}>
                  {rule.severity.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Type:</span>
                  <span className="ml-2 text-gray-600 capitalize">{rule.type}</span>
                </div>
                
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Conditions:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(rule.conditions).map(([key, value]) => (
                      <div key={key} className="text-xs text-gray-600">
                        <span className="font-medium">{key.replace(/_/g, ' ')}:</span>
                        <span className="ml-1">
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center text-xs text-gray-500">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Active and monitoring
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">How Fraud Detection Works</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>• <strong>Real-time Analysis:</strong> Every transaction is automatically analyzed against all active fraud rules</p>
          <p>• <strong>Pattern Recognition:</strong> The system identifies suspicious patterns across multiple transactions</p>
          <p>• <strong>Risk Scoring:</strong> Each alert receives a fraud score based on severity and detected patterns</p>
          <p>• <strong>Automatic Alerts:</strong> High-risk transactions trigger immediate alerts for admin review</p>
          <p>• <strong>WebSocket Notifications:</strong> Real-time fraud alerts are broadcast to connected admin dashboards</p>
        </div>
      </div>
    </div>
  );
};

export default FraudRulesDisplay;

