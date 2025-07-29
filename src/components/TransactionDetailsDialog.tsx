import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FaInfoCircle, FaTimesCircle, FaArrowLeft, FaCopy } from 'react-icons/fa';
import React from 'react';
import { cn } from '@/lib/utils';

interface DecodedArg {
  name: string;
  type: string;
  value: string;
}

interface Event {
  phase: string;
  event: { 
    section: string; 
    method: string; 
    data?: any;
  };
}

interface TransactionDetails {
  hash: string;
  blockNumber: number;
  section: string;
  method: string;
  timestamp?: Date;
  success: boolean;
  signer: string;
  fee: string;
  nonce: number;
  tip: string;
  era: number;
  index: number;
  decodedArgs?: DecodedArg[];
  events?: Event[];
  signature: string;
}

interface TransactionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDetailsLoading: boolean;
  detailsError?: string;
  transactionDetails?: TransactionDetails;
  formatHash: (hash: string) => string;
  formatAddress: (address: string) => string;
  formatBalance: (balance: string) => string;
  getStatusIcon: (success: boolean) => React.ReactNode;
  getMethodColor: (section: string) => string;
  handleCopyToClipboard: (text: string, label: string) => void;
}

const TransactionDetailsDialog: React.FC<TransactionDetailsDialogProps> = ({
  open,
  onOpenChange,
  isDetailsLoading,
  detailsError,
  transactionDetails,
  formatHash,
  formatAddress,
  formatBalance,
  getStatusIcon,
  getMethodColor,
  handleCopyToClipboard,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
          <FaInfoCircle className="w-5 h-5 text-primary" />
          <span>Transaction Details</span>
        </DialogTitle>
      </DialogHeader>
      <ScrollArea className="max-h-[calc(90vh-120px)]">
        <div className="space-y-6 p-4">
          {isDetailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading transaction details...</p>
              </div>
            </div>
          ) : detailsError ? (
            <div className="text-center py-12">
              <div className="text-destructive mb-4">
                <FaTimesCircle className="w-12 h-12 mx-auto mb-2" />
                <p className="text-lg font-semibold">Transaction Not Found</p>
              </div>
              <p className="text-muted-foreground mb-4">{detailsError}</p>
              <Button onClick={() => onOpenChange(false)} variant="outline">
                <FaArrowLeft className="w-4 h-4 mr-2" />
                Back to Explorer
              </Button>
            </div>
          ) : transactionDetails ? (
            <>
              {/* Transaction Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Transaction Overview</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(transactionDetails.success)}
                      <Badge variant={transactionDetails.success ? "default" : "destructive"}>
                        {transactionDetails.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Transaction Hash</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="font-mono text-sm">{formatHash(transactionDetails.hash)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyToClipboard(transactionDetails.hash, 'Transaction Hash')}
                          className="h-6 w-6 p-0"
                        >
                          <FaCopy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Block Number</label>
                      <p className="text-sm mt-1">{transactionDetails.blockNumber.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Method</label>
                      <Badge className={cn("mt-1", getMethodColor(transactionDetails.section))}>
                        {transactionDetails.section}.{transactionDetails.method}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                      <p className="text-sm mt-1">
                        {transactionDetails.timestamp ? 
                          transactionDetails.timestamp.toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Transaction Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Signer</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="font-mono text-sm">{formatAddress(transactionDetails.signer)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyToClipboard(transactionDetails.signer, 'Signer Address')}
                          className="h-6 w-6 p-0"
                        >
                          <FaCopy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Fee</label>
                      <p className="text-sm mt-1">{formatBalance(transactionDetails.fee)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nonce</label>
                      <p className="text-sm mt-1">{transactionDetails.nonce}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tip</label>
                      <p className="text-sm mt-1">{formatBalance(transactionDetails.tip)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Era</label>
                      <p className="text-sm mt-1">{transactionDetails.era}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Index</label>
                      <p className="text-sm mt-1">{transactionDetails.index}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Arguments */}
              {transactionDetails.decodedArgs && transactionDetails.decodedArgs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Arguments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {transactionDetails.decodedArgs.map((arg, index) => (
                        <div key={index} className="flex items-start space-x-4 p-3 bg-muted/50 rounded-lg">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{arg.name}</span>
                              <Badge variant="outline" className="text-xs">{arg.type}</Badge>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="font-mono text-sm break-all">{arg.value}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyToClipboard(arg.value, `${arg.name} value`)}
                                className="h-6 w-6 p-0"
                              >
                                <FaCopy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Events */}
              {transactionDetails.events && transactionDetails.events.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {transactionDetails.events.map((event, index) => (
                        <div key={index} className="flex items-center space-x-3 p-2 bg-muted/30 rounded">
                          <Badge variant="outline" className="text-xs">
                            {event.phase}
                          </Badge>
                          <span className="text-sm">
                            {event.event?.section && event.event?.method 
                              ? `${event.event.section}.${event.event.method}`
                              : 'Unknown Event'
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Signature */}
              <Card>
                <CardHeader>
                  <CardTitle>Signature</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm break-all">{formatHash(transactionDetails.signature)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyToClipboard(transactionDetails.signature, 'Signature')}
                      className="h-6 w-6 p-0"
                    >
                      <FaCopy className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
);

export default TransactionDetailsDialog; 