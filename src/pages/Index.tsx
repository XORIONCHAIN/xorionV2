import { useState, useEffect } from 'react';
import NetworkStats from '@/components/NetworkStats';
import { Suspense, lazy } from 'react';
import { FaChartLine, FaShieldAlt, FaUsers, FaBolt, FaPaperPlane } from 'react-icons/fa';
import Header from '@/components/Header';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import Footer from '@/components/Footer';
import AirdropPanel from '@/components/AirdropPanel';
import { Label } from 'recharts';
import { GiTwoCoins } from "react-icons/gi"
//import NavigationBar from '@/components/NavigationBar';

const StakingInterface = lazy(() => import('@/components/StakingInterface'));
const ValidatorPanel = lazy(() => import('@/components/ValidatorPanel'));
const TransactionExplorer = lazy(() => import('@/components/TransactionExplorer'));
const TransferFunds = lazy(() => import('@/components/TransferFunds'));

const NavigationBar = ({ tabs, activeTab, setActiveTab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Navigation - Visible on lg+ screens */}
      <nav className="hidden lg:block bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-4 border-b-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-transparent bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent border-b-2 border-gradient-to-r from-pink-400 to-purple-500'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <IconComponent className="w-4 h-4  text-gradient-to-r from-pink-400 to-purple-500" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Hamburger menu for lg- screens */}
      <nav className="lg:hidden bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            {/* Current Tab Indicator */}
            <div className="flex items-center space-x-2">
              {(() => {
                const currentTab = tabs.find(tab => tab.id === activeTab);
                const IconComponent = currentTab?.icon;
                return (
                  <>
                    <IconComponent className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{currentTab?.label}</span>
                  </>
                );
              })()}
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5 text-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 bg-background">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Navigation</h3>
                </div>
                
                <div className="space-y-2">
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          activeTab === tab.id
                            ? 'bg-primary/10 text-primary border border-primary/30'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </>
  );
};

// STARTING POINT
const Index = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchHash, setSearchHash] = useState('');

  const handleSearchTransaction = (hash: string) => {
    setSearchHash(hash);
    setActiveTab('transactions');
  };

  // Clear search hash when switching away from transactions tab
  useEffect(() => {
    if (activeTab !== 'transactions') {
      setSearchHash('');
    }
  }, [activeTab]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FaChartLine },
    { id: 'staking', label: 'Staking', icon: FaShieldAlt },
    { id: 'validators', label: 'Validators', icon: FaUsers },
    { id: 'transactions', label: 'Transactions', icon: FaBolt },
    { id: 'transfer', label: 'Transfer', icon: FaPaperPlane },
    {id:'airdrop', label:'Airdrop' ,icon:GiTwoCoins }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <NetworkStats />;
      case 'staking':
        return (
          <Suspense fallback={<div>Loading staking...</div>}>
            <StakingInterface />
          </Suspense>
        );
      case 'validators':
        return (
          <Suspense fallback={<div>Loading validators...</div>}>
            <ValidatorPanel />
          </Suspense>
        );
      case 'transactions':
        return (
          <Suspense fallback={<div>Loading transactions...</div>}>
            <TransactionExplorer initialSearchHash={searchHash} />
          </Suspense>
        );
      case 'airdrop':
        return (
          <Suspense fallback={<div>Loading transfer...</div>}>
            <AirdropPanel />
          </Suspense>
        );
      case 'transfer':
        return (
          <Suspense fallback={<div>Loading transfer...</div>}>
            <TransferFunds onSearchTransaction={handleSearchTransaction} />
          </Suspense>
        );
      default:
        return <NetworkStats />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
       <div className="fixed inset-0 pointer-events-none">
        <div className="floating-bg absolute top-20 left-10 w-48 h-48 md:w-96 md:h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
        <div className="floating-bg absolute bottom-20 right-10 w-40 h-40 md:w-80 md:h-80 bg-gradient-to-r from-pink-500/20 to-red-500/20 rounded-full blur-3xl"></div>
        <div className="floating-bg absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-64 md:h-64 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Header - Always clean and visible */}
      <Header />
      {/* Navigation - Responsive tabs */}
      <NavigationBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 glass-card">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};

export default Index;