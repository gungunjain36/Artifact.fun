"use client";
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { formatEther } from 'viem';


const Navbar = () => {
  const { login, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();
  const [scrolled, setScrolled] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.00');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // console.log('balance', balance);
  // console.log('user', user);
  // console.log('userDisplayName', userDisplayName);

  useEffect(() => {
    const fetchBalance = async () => {
      if (wallets && wallets.length > 0) {
        const wallet = wallets[0];
        try {
          const provider = await wallet.getEthereumProvider();
          const publicClient = await provider.request({ 
            method: 'eth_getBalance',
            params: [wallet.address, 'latest']
          });
          
          // Format balance from wei to ETH
          const formattedBalance = formatEther(BigInt(publicClient));
          // Round to 4 decimal places
          setBalance(Number(formattedBalance).toFixed(4));
        } catch (err) {
          console.error('Error fetching balance:', err);
          setBalance('0.00');
        }
      }
    };

    if (authenticated) {
      fetchBalance();
      // Refresh balance every 30 seconds
      const interval = setInterval(fetchBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [wallets, authenticated]);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (user) {
      if (user.google) {
        setUserDisplayName(user.google.email.split('@')[0]);
      } else if (user.email) {
        setUserDisplayName(user.email.address.split('@')[0]);
      } else if (user.wallet) {
        setUserDisplayName(user.wallet.address.slice(0, 6));
      } else {
        setUserDisplayName(user.id.slice(0, 6));
      }
    }
  }, [user]);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[#FFFBEA]/80 backdrop-blur-md' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src={'/logo.svg'} alt="Logo" className="w-10 h-10" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {authenticated ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/explore"
                  className="text-[#131315] hover:text-[#EE5A0E] text-sm font-medium font-urbanist transition-colors uppercase"
                >
                  EXPLORE
                </Link>

                <Link
                  to="/leaderboard"
                  className="text-[#131315] hover:text-[#EE5A0E] text-sm font-medium font-urbanist transition-colors uppercase"
                >
                  LEADERBOARD
                </Link>

                <Link
                  to="/create"
                  className="flex items-center justify-center w-[192px] h-[36px] bg-gradient-to-r from-[#EE5A0E] to-[#0F62FE] text-white rounded-full text-sm font-semibold font-urbanist transition-all duration-200 shadow-[inset_0px_4px_4px_0px_#FFFBEA2B,inset_0px_-4px_4px_0px_#00000024] hover:opacity-90"
                >
                  + CREATE
                </Link>

                {/* Wallet Display */}
                <Link to="/my-page" className="flex items-center gap-2 bg-[#FFFBEA] backdrop-blur-sm rounded-full px-3 py-1.5 border border-[#9C9C9C]">
                  <span className="text-[#131315] text-sm font-semibold font-urbanist">{balance} ETH</span>
                  <span className="text-[#131315]/60 text-sm font-medium font-urbanist uppercase">{wallets?.[0]?.address?.slice(0, 6)}</span>
                  
                  {/* User Avatar */}
                  <div className="flex items-center gap-2 transition-all duration-200 rounded-full">
                    <div className="w-7 h-7 rounded-full bg-[#0F62FE] flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'default'}`}
                        alt="User Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </Link>

                {/* Logout Icon */}
                <button
                  onClick={() => logout()}
                  className="text-[#131315]/60 hover:text-[#EE5A0E] transition-colors"
                  aria-label="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/explore"
                  className="text-[#131315] hover:text-[#EE5A0E] text-sm font-medium font-urbanist transition-colors uppercase"
                >
                  EXPLORE
                </Link>

                <Link
                  to="/leaderboard"
                  className="text-[#131315] hover:text-[#EE5A0E] text-sm font-medium font-urbanist transition-colors uppercase"
                >
                  LEADERBOARD
                </Link>
                
                <button
                  onClick={() => login()}
                  className="flex items-center justify-center w-[192px] h-[36px] bg-gradient-to-r from-[#EE5A0E] to-[#0F62FE] text-white rounded-full text-sm font-semibold font-urbanist transition-all duration-200 shadow-[inset_0px_4px_4px_0px_#FFFBEA2B,inset_0px_-4px_4px_0px_#00000024] hover:opacity-90"
                >
                  CONNECT WALLET
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-[#131315] hover:text-[#EE5A0E] transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden transition-all duration-300 ${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="py-4 space-y-4 bg-[#FFFBEA]/95 backdrop-blur-md rounded-b-2xl">
            {authenticated ? (
              <>
                <Link
                  to="/explore"
                  className="block px-4 py-2 text-[#131315] hover:text-[#EE5A0E] text-sm font-medium font-urbanist transition-colors uppercase"
                  onClick={() => setIsMenuOpen(false)}
                >
                  EXPLORE
                </Link>

                <Link
                  to="/leaderboard"
                  className="block px-4 py-2 text-[#131315] hover:text-[#EE5A0E] text-sm font-medium font-urbanist transition-colors uppercase"
                  onClick={() => setIsMenuOpen(false)}
                >
                  LEADERBOARD
                </Link>

                <Link
                  to="/create"
                  className="block mx-4 text-center h-[36px] leading-[36px] bg-gradient-to-r from-[#EE5A0E] to-[#0F62FE] text-white rounded-full text-sm font-semibold font-urbanist transition-all duration-200 shadow-[inset_0px_4px_4px_0px_#FFFBEA2B,inset_0px_-4px_4px_0px_#00000024]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  + CREATE
                </Link>

                <div className="px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#0F62FE] flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'default'}`}
                        alt="User Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[#131315] text-sm font-semibold font-urbanist">{balance} ETH</span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="text-[#131315]/60 hover:text-[#EE5A0E] transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/explore"
                  className="block px-4 py-2 text-[#131315] hover:text-[#EE5A0E] text-sm font-medium font-urbanist transition-colors uppercase"
                  onClick={() => setIsMenuOpen(false)}
                >
                  EXPLORE
                </Link>

                <Link
                  to="/leaderboard"
                  className="block px-4 py-2 text-[#131315] hover:text-[#EE5A0E] text-sm font-medium font-urbanist transition-colors uppercase"
                  onClick={() => setIsMenuOpen(false)}
                >
                  LEADERBOARD
                </Link>

                <button
                  onClick={() => {
                    login();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-center bg-gradient-to-r from-[#EE5A0E] to-[#0F62FE] text-white text-sm font-semibold font-urbanist transition-all duration-200 shadow-[inset_0px_4px_4px_0px_#FFFBEA2B,inset_0px_-4px_4px_0px_#00000024]"
                >
                  CONNECT WALLET
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;