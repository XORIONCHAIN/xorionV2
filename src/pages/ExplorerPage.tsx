import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaChartLine, FaShieldAlt, FaExchangeAlt, FaRocket, FaSearch } from 'react-icons/fa';
import Header from '@/components/Header';
import AirdropPanel from '../components/AirdropPanel';

const navItems = [
  { id: 'blocks', label: 'Blocks', icon: FaChartLine },
  { id: 'transactions', label: 'Transactions', icon: FaExchangeAlt },
  { id: 'validators', label: 'Validators', icon: FaShieldAlt },
  { id: 'contracts', label: 'Contracts', icon: FaRocket },
  { id: 'search', label: 'Search', icon: FaSearch },
  { id: 'airdrop', label: 'Airdrop', icon: FaRocket }, // Added Airdrop tab
];

const ExplorerPage = () => {
  const [activeTab, setActiveTab] = useState('blocks');

  return (
    <div className="min-h-screen bg-background">
       <div className="fixed inset-0 pointer-events-none">
        <div className="floating-bg absolute top-20 left-10 w-48 h-48 md:w-96 md:h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
        <div className="floating-bg absolute bottom-20 right-10 w-40 h-40 md:w-80 md:h-80 bg-gradient-to-r from-pink-500/20 to-red-500/20 rounded-full blur-3xl"></div>
        <div className="floating-bg absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-64 md:h-64 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-full blur-3xl"></div>
      </div>

      <Header />
      {/* Navigation Pills */}
      <div className="sticky top-0 z-40 glass-card border-b border-border/40">
        <div className="flex items-center space-x-2 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive ? 'text-primary-foreground gradient-blue-purple' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activePill"
                    className="absolute inset-0 bg-primary rounded-full"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {/* Content Area */}
      <div className="container mx-auto px-6 py-8 glass-card">
        {/* Content will be rendered here based on activeTab */}
        <div className="text-foreground">
          {activeTab === 'blocks' && <div>Blocks Content</div>}
          {activeTab === 'transactions' && <div>Transactions Content</div>}
          {activeTab === 'validators' && <div>Validators Content</div>}
          {activeTab === 'contracts' && <div>Contracts Content</div>}
          {activeTab === 'search' && <div>Search Content</div>}
          {activeTab === 'airdrop' && <AirdropPanel />}
        </div>
      </div>
    </div>
  );
};

export default ExplorerPage; 