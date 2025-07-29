import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaChartLine, FaShieldAlt, FaExchangeAlt, FaRocket, FaSun, FaMoon } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';

const navItems = [
  { id: 'overview', label: 'Overview', icon: FaChartLine },
  { id: 'staking', label: 'Staking', icon: FaShieldAlt },
  { id: 'transactions', label: 'Transactions', icon: FaExchangeAlt },
  { id: 'validators', label: 'Validators', icon: FaRocket },
];

const LandingHeader = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  const handleLaunchExplorer = () => {
    navigate('/explorer');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center space-x-4 group">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
              <FaShieldAlt className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">XORION</h1>
              <p className="text-sm text-muted-foreground">Blockchain Explorer</p>
            </div>
          </Link>

          {/* Navigation Pills */}
          <div className="hidden md:flex items-center space-x-2 bg-muted/50 p-1 rounded-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
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

          {/* Launch Button */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleLaunchExplorer}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Launch Explorer
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader; 