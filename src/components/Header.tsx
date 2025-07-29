import WalletConnection from './WalletConnection';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="sticky top-0 z-50 glass-card w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:py-4">
        <div className="flex flex-row items-center justify-between w-full gap-x-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-x-2 min-w-0 group">
            <img src="/logo.svg" alt="XORION Logo" className="w-7 h-7 md:w-10 md:h-10 flex-shrink-0 transition-transform group-hover:scale-105" />
            <span className="text-lg md:text-2xl font-bold text-white !text-white whitespace-nowrap group-hover:!text-white transition-colors drop-shadow">
              XORION
            </span>
          </Link>
          {/* Wallet */}
          <div className="max-w-[160px] md:max-w-xs truncate flex-shrink min-w-0">
            <WalletConnection />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 