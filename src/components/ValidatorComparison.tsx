import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Mock validator data
const validators = [
  { id: 1, name: 'Cosmos Hub Validator', commission: 5, apr: 12.8, uptime: 99.9 },
  { id: 2, name: 'Secure Staking Co.', commission: 3, apr: 12.5, uptime: 99.8 },
  { id: 3, name: 'Decentralized Pool', commission: 7, apr: 12.2, uptime: 99.7 },
  { id: 4, name: 'Community Validator', commission: 4, apr: 12.6, uptime: 99.5 },
  { id: 5, name: 'Network Guardian', commission: 6, apr: 12.3, uptime: 99.2 }
];

const metrics = [
  { key: 'commission', label: 'Commission', max: 10 },
  { key: 'apr', label: 'APR', max: 15 },
  { key: 'uptime', label: 'Uptime', max: 100 }
];

const themeColors = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
];

const ValidatorComparison = () => {
  const [selectedValidators, setSelectedValidators] = useState([]);

  const handleValidatorSelect = (value, index) => {
    const newSelection = [...selectedValidators];
    newSelection[index] = value;
    setSelectedValidators(newSelection);
  };

  const clearValidator = (index) => {
    const newSelection = [...selectedValidators];
    newSelection[index] = '';
    setSelectedValidators(newSelection);
  };

  // Prepare radar chart data with normalized values for better visualization
  const radarData = metrics.map(metric => {
    const entry = { metric: metric.label };
    selectedValidators.forEach((name, idx) => {
      if (name) {
        const validator = validators.find(val => val.name === name);
        if (validator) {
          // Normalize values for better radar chart visualization
          let normalizedValue;
          if (metric.key === 'commission') {
            // For commission, lower is better, so invert the scale
            normalizedValue = ((metric.max - validator[metric.key]) / metric.max) * 100;
          } else {
            // For APR and uptime, higher is better
            normalizedValue = (validator[metric.key] / metric.max) * 100;
          }
          entry[name] = normalizedValue;
        }
      }
    });
    return entry;
  });

  const hasSelectedValidators = selectedValidators.some(v => v);

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center space-x-2 text-xl">
            <Shield className="w-5 h-5 text-blue-600" />
            <span>Validator Comparison</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Validator Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Validator {index + 1}
                </label>
                <Select
                  onValueChange={(value) => handleValidatorSelect(value, index)}
                  value={selectedValidators[index] || ''}
                >
                  <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Select validator" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    <SelectItem value="">
                      <span className="text-gray-500">None selected</span>
                    </SelectItem>
                    {validators.map((validator) => (
                      <SelectItem 
                        key={validator.id} 
                        value={validator.name}
                        disabled={selectedValidators.includes(validator.name) && selectedValidators[index] !== validator.name}
                      >
                        <div className="flex flex-col py-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {validator.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {validator.commission}% commission • {validator.apr}% APR • {validator.uptime}% uptime
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedValidators[index] && (
                  <button
                    onClick={() => clearValidator(index)}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Comparison Chart */}
          {hasSelectedValidators && (
            <div className="w-full">
              <div className="overflow-x-auto whitespace-nowrap py-2">
                <div className="inline-block min-w-[400px] sm:min-w-[500px] w-[400px] sm:w-[500px] h-80 sm:h-96 align-top bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <PolarGrid 
                        stroke="#d1d5db" 
                        className="dark:stroke-gray-600" 
                      />
                      <PolarAngleAxis 
                        dataKey="metric" 
                        tick={{ 
                          fill: '#374151', 
                          fontSize: 12, 
                          fontWeight: 500 
                        }} 
                        className="dark:fill-gray-300"
                      />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]} 
                        tick={false} 
                        axisLine={false} 
                      />
                      {selectedValidators.map((name, idx) => 
                        name ? (
                          <Radar
                            key={name}
                            name={name}
                            dataKey={name}
                            stroke={themeColors[idx % themeColors.length]}
                            fill={themeColors[idx % themeColors.length]}
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        ) : null
                      )}
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: '16px',
                          fontSize: '12px'
                        }} 
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'white',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          color: '#374151',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value, name, props) => {
                          const validator = validators.find(v => v.name === name);
                          if (!validator) return [value, name];
                          
                          const metric = metrics.find(m => m.label === props.payload.metric);
                          if (!metric) return [value, name];
                          
                          const actualValue = validator[metric.key];
                          const unit = metric.key === 'commission' || metric.key === 'apr' || metric.key === 'uptime' ? '%' : '';
                          
                          return [`${actualValue}${unit}`, name];
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Comparison Table */}
          {hasSelectedValidators && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] sm:min-w-[500px] border-collapse border border-gray-200 dark:border-gray-700 rounded-lg">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                      Validator
                    </th>
                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                      Commission
                    </th>
                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                      APR
                    </th>
                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                      Uptime
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedValidators.map((name, idx) => {
                    if (!name) return null;
                    const validator = validators.find(v => v.name === name);
                    if (!validator) return null;
                    
                    return (
                      <tr key={name} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: themeColors[idx % themeColors.length] }}
                            />
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {validator.name}
                            </span>
                          </div>
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">
                          {validator.commission}%
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">
                          {validator.apr}%
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100">
                          {validator.uptime}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!hasSelectedValidators && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No validators selected</p>
              <p className="text-sm">Select up to 3 validators to compare their performance metrics</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidatorComparison;