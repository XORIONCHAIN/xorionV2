import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FaWallet } from 'react-icons/fa';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';

interface AccountSelectorProps {
  accounts: InjectedAccountWithMeta[];
  selectedAccount: InjectedAccountWithMeta | null;
  setSelectedAccount: (account: InjectedAccountWithMeta | null) => void;
  balance: string;
  walletName?: string;
}

const AccountSelector = ({ accounts, selectedAccount, setSelectedAccount, balance, walletName }: AccountSelectorProps) => {
  
  // Safe balance formatting function
  const formatBalanceDisplay = (balanceValue: string): string => {
    if (!balanceValue || balanceValue === '0') return '0.0000';
    
    try {
      // Remove commas and spaces from the balance string
      const cleanBalance = balanceValue.replace(/[,\s]/g, '');
      
      // Parse as number and format
      const numValue = parseFloat(cleanBalance);
      
      if (isNaN(numValue)) return '0.0000';
      
      // If it's a very large number (likely in smallest units), convert it
      if (numValue > 1000000000000000000) {
        const converted = numValue / Math.pow(10, 18);
        return converted.toLocaleString(undefined, { 
          minimumFractionDigits: 4, 
          maximumFractionDigits: 4 
        });
      }
      
      // Otherwise, format as is
      return numValue.toLocaleString(undefined, { 
        minimumFractionDigits: 4, 
        maximumFractionDigits: 4 
      });
      
    } catch (error) {
      console.warn('Error formatting balance:', balanceValue, error);
      return '0.0000';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-white space-x-2">
          <FaWallet className="w-5 h-5" />
          <span>Wallet Connection</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {walletName && (
            <div className="text-sm text-primary font-semibold">Connected Wallet: {walletName}</div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground">Select Account</label>
            <Select 
              value={selectedAccount?.address || ''} 
              onValueChange={(address) => {
                if (!address) {
                  setSelectedAccount(null);
                  return;
                }
                const account = accounts.find(acc => acc.address === address);
                setSelectedAccount(account || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.length > 0 ? (
                  accounts.map((account) => (
                    <SelectItem key={account.address} value={account.address} title={account.address}>
                      <div className="truncate">
                        {account.meta.name || `${account.address.slice(0, 8)}...${account.address.slice(-6)}`}
                      </div>
                    </SelectItem>
                  ))
                ) : selectedAccount ? (
                  <SelectItem key={selectedAccount.address} value={selectedAccount.address} title={selectedAccount.address}>
                    <div className="truncate">
                      {selectedAccount.meta.name || `${selectedAccount.address.slice(0, 8)}...${selectedAccount.address.slice(-6)}`}
                    </div>
                  </SelectItem>
                ) : (
                  <SelectItem value="no-accounts" disabled>
                    No accounts available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {selectedAccount && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="text-sm font-medium text-foreground">Address</label>
                <div className="text-sm text-white font-mono bg-zinc-700 p-2 rounded">
                  <div className="truncate" title={selectedAccount.address}>
                    {selectedAccount.address}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Balance</label>
                <div className="text-2xl font-bold text-foreground">
                  {formatBalanceDisplay(balance)} XOR
                </div>
              </div>
            </div>
          )}
          
          {accounts.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                No wallet accounts found. Please connect your wallet extension.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountSelector;
