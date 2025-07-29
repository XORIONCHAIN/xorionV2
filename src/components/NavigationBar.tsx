import { motion } from 'framer-motion';
import { FaChartLine, FaShieldAlt, FaUsers, FaBolt } from 'react-icons/fa';

interface NavigationBarProps {
  tabs: { id: string; label: string; icon: React.ElementType }[];
  activeTab: string;
  setActiveTab: (tabId: string) => void;
}

const NavigationBar = ({ tabs, activeTab, setActiveTab }: NavigationBarProps) => {
  return (
    <nav className="sticky top-0 z-40 glass-card border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center space-x-2 py-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors group ${
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
                <span className={`relative z-10 flex items-center space-x-2 transition-transform duration-300 group-hover:scale-105 ${isActive ? 'text-primary' : 'group-hover:text-foreground text-muted-foreground'}`}>
                  <Icon className="w-4 h-4 text-current" />
                  <span>{tab.label}</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 group-hover:w-full group-hover:left-0 rounded-full pointer-events-none" />
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar; 