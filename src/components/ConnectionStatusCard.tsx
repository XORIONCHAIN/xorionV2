import { Card, CardContent } from '@/components/ui/card';
import React from 'react';

interface ConnectionStatusCardProps {
  apiState: {
    status: string;
    lastError?: string;
    endpoint?: string;
    connectionAttempts: number;
  };
}

const ConnectionStatusCard: React.FC<ConnectionStatusCardProps> = ({ apiState }) => (
  <div className="min-h-screen bg-card p-2 sm:p-4 lg:p-6 flex items-center justify-center">
    <Card className="w-full max-w-md">
      <CardContent className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold mb-2">
          {apiState.status === 'connecting' ? 'Connecting to Network...' :
           apiState.status === 'error' ? 'Connection Failed' :
           'Disconnected'}
        </h3>
        <p className="text-muted-foreground mb-4">
          {apiState.status === 'connecting' ? 'Establishing connection to Polkadot network...' :
           apiState.status === 'error' ? 'Unable to connect to any available endpoints' :
           'Not connected to the network'}
        </p>
        {apiState.lastError && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded mb-4">
            Error: {apiState.lastError}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          Status: {apiState.status} | 
          Endpoint: {apiState.endpoint || 'None'} |
          Attempts: {apiState.connectionAttempts}
        </div>
      </CardContent>
    </Card>
  </div>
);

export default ConnectionStatusCard; 