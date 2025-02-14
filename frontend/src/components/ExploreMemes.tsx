import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import ArtixMemeContestABI from '../abi/ArtixMemeContest.json';
// import ArtifactNFTABI from '../abi/ArtifactNFT.json';
import ArtifactRankingABI from '../abi/ArtifactRanking.json';
// import { uploadToPinata } from '../utils/pinata';
import AIMarketing from './AIMarketing';
import { Link } from 'react-router-dom';

const ARTIX_CONTRACT_ADDRESS = import.meta.env.VITE_ARTIX_CONTRACT_ADDRESS;
// const ARTIX_NFT_CONTRACT_ADDRESS = import.meta.env.VITE_ARTIX_NFT_CONTRACT_ADDRESS;
const ARTIX_RANKING_CONTRACT_ADDRESS = import.meta.env.VITE_ARTIX_RANKING_CONTRACT_ADDRESS;
const CDP_AGENT_URL = import.meta.env.VITE_CDP_AGENT_URL;

// Base Sepolia network parameters
const BASE_SEPOLIA_PARAMS = {
  chainId: '0x' + Number(84532).toString(16),
  chainName: 'Base Sepolia',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://sepolia.base.org'],
  blockExplorerUrls: ['https://sepolia.basescan.org']
};

interface Meme {
  id: number;
  creator: string;
  ipfsHash: string;
  title: string;
  description: string;
  socialLinks: string;
  networkId: number;
  voteCount: number;
  submissionTime: number;
  isActive: boolean;
  hasBeenMinted: boolean;
  hasVoted?: boolean; // Whether current user has voted for this meme
}

interface VotingConfig {
  maxVotes: number;
  contestDuration: number;
  minVotesForWin: number;
  voteCost: ethers.BigNumber;
}

interface ConnectedWallet {
  address: string;
  walletClientType: string;
  getEthereumProvider: () => Promise<any>;
}

interface AuctionInfo {
  id: string;
  memeId: number;
  startPrice: ethers.BigNumber;
  currentPrice: ethers.BigNumber;
  highestBidder: string;
  endTime: number;
  isActive: boolean;
}

// Update API endpoints
const API_ENDPOINTS = {
    GET_MEMES: '/api/memes',
    GET_MEME: (fileId: string) => `/api/memes/${fileId}`,
    VOTE_MEME: (memeId: string) => `/api/memes/${memeId}/vote`,
    CLAIM_ROYALTIES: (memeId: string) => `/api/memes/${memeId}/claim-royalties`,
    MINT_NFT: (memeId: string) => `/api/memes/${memeId}/mint-nft`,
    AGENT_ALLOWANCE: '/api/agent/allowance',
    AGENT_SPEND: '/api/agent/spend',
    GET_AUCTION: '/api/auctions',
    CREATE_AUCTION: '/api/auctions',
    PLACE_BID: '/api/auctions/place-bid'
};

function ExploreMemes() {
  const { authenticated, login, user } = usePrivy();
  const { wallets } = useWallets();
  const [memes, setMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votingConfig, setVotingConfig] = useState<VotingConfig | null>(null);
  const [votingStatus, setVotingStatus] = useState<{ [key: number]: 'loading' | 'success' | 'error' | null }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'top rated' | 'new' | 'nft minted'>('top rated');
  const [filteredMemes, setFilteredMemes] = useState<Meme[]>([]);
  const [memesCache, setMemesCache] = useState<{
    data: Meme[];
    timestamp: number;
  } | null>(null);
  const [auctions, setAuctions] = useState<{ [key: number]: AuctionInfo }>({});
  const [bidAmount, setBidAmount] = useState<string>('');
  const [activeBidMemeId, setActiveBidMemeId] = useState<number | null>(null);
  const [auctionLoading, setAuctionLoading] = useState(false);

  // Cache duration in milliseconds (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;

  // Get the authenticated wallet address
  const getAuthenticatedWallet = () => {
    if (!authenticated || !user?.wallet?.address) return null;

    // First check if we have the user's authenticated wallet address
    const authWalletAddress = user.wallet.address;
    console.log('Auth wallet address:', authWalletAddress);

    // Find the matching wallet from wallets list
    const matchingWallet = wallets?.find(w => 
      w.address.toLowerCase() === authWalletAddress.toLowerCase()
    );

    if (matchingWallet) {
      console.log('Found matching wallet:', {
        type: matchingWallet.walletClientType,
        address: matchingWallet.address
      });
      return matchingWallet as ConnectedWallet;
    }

    // If no matching wallet found but we have the auth address, return null instead of minimal wallet object
    return null;
  };

  const activeWallet = getAuthenticatedWallet();

  const switchToBaseSepolia = async (provider: any) => {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_SEPOLIA_PARAMS.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [BASE_SEPOLIA_PARAMS],
          });
        } catch (addError) {
          console.error('Error adding Base Sepolia network:', addError);
          throw new Error('Could not add Base Sepolia network to your wallet');
        }
      } else {
        console.error('Error switching to Base Sepolia:', switchError);
        throw new Error('Could not switch to Base Sepolia network');
      }
    }
  };

  const fetchVotingConfig = async (contract: ethers.Contract) => {
    try {
      const config = await contract.votingConfiguration();
      setVotingConfig({
        maxVotes: config.maxVotes.toNumber(),
        contestDuration: config.contestDuration.toNumber(),
        // minVotesForWin: config.minVotesForWin.toNumber(),
        minVotesForWin: 2,
        voteCost: config.voteCost
      });
    } catch (err) {
      console.error('Error fetching voting config:', err);
    }
  };

  const checkUserVotes = async (contract: ethers.Contract, memesList: Meme[], userAddress: string) => {
    console.log('Checking user votes for:', userAddress);
    
    try {
      const votedStatuses = await Promise.all(
        memesList.map(meme => contract.hasVoted(meme.id, userAddress))
      );
      
      return memesList.map((meme, index) => ({
        ...meme,
        hasVoted: votedStatuses[index]
      }));
    } catch (err) {
      console.error('Error checking user votes:', err);
      return memesList;
    }
  };

  // Update filtered memes whenever search query or filter changes
  useEffect(() => {
    if (!memes.length) return;

    let filtered = [...memes];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(meme => 
        meme.title.toLowerCase().includes(query) ||
        meme.description.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    switch (activeFilter) {
      case 'top rated':
        filtered.sort((a, b) => b.voteCount - a.voteCount);
        break;
      case 'new':
        filtered.sort((a, b) => b.submissionTime - a.submissionTime);
        break;
      case 'nft minted':
        filtered = filtered.filter(meme => meme.hasBeenMinted);
        break;
    }

    setFilteredMemes(filtered);
  }, [memes, searchQuery, activeFilter]);

  // Modified fetchMemes to use cache
  const fetchMemes = async () => {
    try {
      // Check cache first
      if (memesCache && (Date.now() - memesCache.timestamp) < CACHE_DURATION) {
        setMemes(memesCache.data);
        return;
      }

      setLoading(true);
      setError(null);

      const provider = new ethers.providers.JsonRpcProvider(BASE_SEPOLIA_PARAMS.rpcUrls[0]);
      const contract = new ethers.Contract(
        ARTIX_CONTRACT_ADDRESS,
        ArtixMemeContestABI,
        provider
      );

      // Fetch voting configuration
      await fetchVotingConfig(contract);

      const memesList: Meme[] = [];
      let memeId = 0;
      const MAX_MEMES_TO_CHECK = 100;
      let emptyMemeCount = 0;
      
      console.log('Starting to fetch memes from blockchain...');
      
      while (memeId < MAX_MEMES_TO_CHECK) {
        try {
          const meme = await contract.memes(memeId);
          console.log(`Meme #${memeId} Data:`, {
            creator: meme.creator,
            ipfsHash: meme.ipfsHash,
            title: meme.title,
            description: meme.description,
            socialLinks: meme.socialLinks,
            networkId: meme.networkId.toString(),
            voteCount: meme.voteCount.toString(),
            submissionTime: meme.submissionTime.toString(),
            isActive: meme.isActive,
            hasBeenMinted: meme.hasBeenMinted,
            rawData: meme // Log the raw data as well
          });
          
          if (meme.creator === '0x0000000000000000000000000000000000000000' || meme.ipfsHash === '') {
            console.log(`Meme #${memeId} is empty, count: ${emptyMemeCount + 1}`);
            emptyMemeCount++;
            if (emptyMemeCount >= 3) break;
          } else {
            emptyMemeCount = 0;
            const memeData = {
              id: memeId,
              creator: meme.creator,
              ipfsHash: meme.ipfsHash,
              title: meme.title,
              description: meme.description,
              socialLinks: meme.socialLinks,
              networkId: meme.networkId.toNumber(),
              voteCount: meme.voteCount.toNumber(),
              submissionTime: meme.submissionTime.toNumber(),
              isActive: meme.isActive,
              hasBeenMinted: meme.hasBeenMinted
            };
            console.log(`Processed Meme #${memeId}:`, memeData);
            memesList.push(memeData);
          }
          memeId++;
        } catch (e) {
          console.error(`Error fetching meme #${memeId}:`, e);
          break;
        }
      }

      // Check user's voted status if authenticated
      if (authenticated && activeWallet?.address) {
        console.log('Checking vote status for user:', activeWallet.address);
        const memesWithVoteStatus = await checkUserVotes(contract, memesList, activeWallet.address);
        console.log('Memes with vote status:', memesWithVoteStatus);
        setMemes(memesWithVoteStatus);
      } else {
        console.log('Setting memes without vote status:', memesList);
        setMemes(memesList);
      }

      // Update cache with new data
      setMemesCache({
        data: memesList,
        timestamp: Date.now()
      });

      // After fetching memes, get auction data for each
      const auctionData: { [key: number]: AuctionInfo } = {};
      await Promise.all(
        memesList.map(async (meme) => {
          const auction = await fetchAuctionData(meme.id);
          if (auction) {
            auctionData[meme.id] = auction;
          }
        })
      );
      setAuctions(auctionData);

    } catch (err: any) {
      console.error('Error fetching memes:', err);
      setError(err.message || 'Error fetching memes');
    } finally {
      setLoading(false);
    }
  };

  const checkAndMintNFT = async (meme: Meme) => {
    console.log('Checking NFT minting conditions for meme:', {
      memeId: meme.id,
      voteCount: meme.voteCount,
      minVotesRequired: votingConfig?.minVotesForWin || 0,
      hasBeenMinted: meme.hasBeenMinted
    });

    if (!votingConfig) {
      console.warn('Voting config not available, cannot check minting conditions');
      return;
    }

    if (meme.hasBeenMinted) {
      console.log('Meme has already been minted as NFT');
      return;
    }

    if (meme.voteCount >= votingConfig.minVotesForWin) {
      console.log('Meme qualifies for NFT minting! Proceeding with minting...');
      try {
        const response = await fetch(API_ENDPOINTS.MINT_NFT(meme.id.toString()), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || 'Failed to mint NFT');
        }

        const data = await response.json();
        console.log('NFT minting successful:', data);

        // Refresh to get latest state
        await fetchMemes();

        alert(`NFT minted successfully!\nTransaction Hash: ${data.transactionHash}\nToken ID: ${data.tokenId}\nView on OpenSea: ${getOpenSeaUrl(data.contractAddress, data.tokenId)}`);
      } catch (error: any) {
        console.error('Error minting NFT:', error);
        alert('Failed to mint NFT: ' + (error.message || 'Unknown error'));
      }
    } else {
      console.log(`Meme needs ${votingConfig.minVotesForWin - meme.voteCount} more votes to qualify for NFT minting`);
    }
  };

  const voteMeme = async (memeId: number) => {
    if (!authenticated || !activeWallet?.address) {
      login();
      return;
    }

    try {
      setVotingStatus(prev => ({ ...prev, [memeId]: 'loading' }));

      const wallet = activeWallet as ConnectedWallet;
      if (!wallet.getEthereumProvider) {
        throw new Error('Wallet does not support Ethereum provider');
      }
      const provider = await wallet.getEthereumProvider();
      
      await switchToBaseSepolia(provider);

      const ethersProvider = new ethers.providers.Web3Provider(provider);
      const signer = ethersProvider.getSigner();
      
      // Vote on meme
      const memeContract = new ethers.Contract(
        ARTIX_CONTRACT_ADDRESS,
        ArtixMemeContestABI,
        signer
      );

      const voteCost = votingConfig?.voteCost || ethers.utils.parseEther("0.01");
      const voteTx = await memeContract.voteMeme(memeId, { value: voteCost });
      await voteTx.wait();

      // Update user's ranking
      console.log('Updating user ranking after vote...');
      const rankingContract = new ethers.Contract(
        ARTIX_RANKING_CONTRACT_ADDRESS,
        ArtifactRankingABI,
        signer
      );

      const rankingTx = await rankingContract.updateRanking(activeWallet.address, 1, false);
      await rankingTx.wait();
      console.log('Ranking updated successfully');

      // Refresh memes after successful vote
      await fetchMemes();
      setVotingStatus(prev => ({ ...prev, [memeId]: 'success' }));

      // After successful vote, check if meme should be minted
      const votedMeme = memes.find(m => m.id === memeId);
      if (votedMeme) {
        await checkAndMintNFT(votedMeme);
      }
    } catch (err: any) {
      console.error('Error voting:', err);
      setVotingStatus(prev => ({ ...prev, [memeId]: 'error' }));
      alert(err.message || 'Error voting for meme');
    }
  };

  useEffect(() => {
    console.log('ExploreMemes useEffect triggered', {
      authenticated,
      userWallet: user?.wallet?.address,
      activeWallet: activeWallet?.address,
      allWallets: wallets?.map(w => ({
        type: w.walletClientType,
        address: w.address
      }))
    });
    fetchMemes();
  }, [authenticated, user?.wallet?.address, activeWallet?.address]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  console.log(formatDate(1712832000))


  const getIPFSGatewayURL = (ipfsHash: string) => {
    const hash = ipfsHash.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${hash}`;
  };

  const getOpenSeaUrl = (contractAddress: string, tokenId: string) => {
    return `https://testnets.opensea.io/assets/base_sepolia/${contractAddress}/${tokenId}`;
  };

  const getVoteButtonText = (meme: Meme, status: string | null) => {
    if (status === 'loading') return 'Voting...';
    if (status === 'success') return 'Voted!';
    if (status === 'error') return 'Failed - Try Again';
    if (meme.hasVoted) return 'Already Voted';
    return `Vote (${ethers.utils.formatEther(votingConfig?.voteCost || '0')} ETH)`;
  };

  console.log(getVoteButtonText(memes[0], 'loading'))

  // Add this function to fetch auction data
  const fetchAuctionData = async (memeId: number) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.GET_AUCTION}/${memeId}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return data as AuctionInfo;
    } catch (error) {
      console.error('Error fetching auction data:', error);
      return null;
    }
  };

  // Add auction creation function
  const createAuction = async (memeId: number) => {
    if (!authenticated || !activeWallet?.address) {
      login();
      return;
    }

    try {
      setAuctionLoading(true);
      const response = await fetch(API_ENDPOINTS.CREATE_AUCTION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          memeId,
          startPrice: ethers.utils.parseEther('0.1').toString(), // Default start price
          duration: 7 * 24 * 60 * 60 // 7 days in seconds
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create auction');
      }

      const data = await response.json();
      setAuctions(prev => ({
        ...prev,
        [memeId]: data
      }));

      alert('Auction created successfully!');
    } catch (error: any) {
      console.error('Error creating auction:', error);
      alert(error.message || 'Error creating auction');
    } finally {
      setAuctionLoading(false);
    }
  };

  // Add bidding function
  const placeBid = async (memeId: number) => {
    if (!authenticated || !activeWallet?.address) {
      login();
      return;
    }

    try {
      setAuctionLoading(true);
      const response = await fetch(API_ENDPOINTS.PLACE_BID, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          memeId,
          amount: ethers.utils.parseEther(bidAmount).toString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to place bid');
      }

      const data = await response.json();
      setAuctions(prev => ({
        ...prev,
        [memeId]: data
      }));

      setBidAmount('');
      setActiveBidMemeId(null);
      alert('Bid placed successfully!');
    } catch (error: any) {
      console.error('Error placing bid:', error);
      alert(error.message || 'Error placing bid');
    } finally {
      setAuctionLoading(false);
    }
  };

  // Add this to your meme card rendering
  const renderAuctionInfo = (meme: Meme) => {
    const auction = auctions[meme.id];
    if (!auction) {
      if (meme.hasBeenMinted && meme.creator === activeWallet?.address) {
        return (
          <button
            onClick={() => createAuction(meme.id)}
            disabled={auctionLoading}
            className="px-4 py-2 bg-[#FFD700] text-[#121212] rounded-full text-sm font-medium hover:bg-[#FFD700]/90 transition-all"
          >
            {auctionLoading ? 'Creating...' : 'Start Auction'}
          </button>
        );
      }
      return null;
    }

    const isEnded = auction.endTime < Date.now() / 1000;
    const currentPrice = ethers.utils.formatEther(auction.currentPrice);
    const isHighestBidder = auction.highestBidder === activeWallet?.address;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-sm">Current Price</span>
          <span className="text-white font-medium">{currentPrice} ETH</span>
        </div>
        
        {!isEnded && (
          <div className="space-y-2">
            {isHighestBidder ? (
              <div className="text-[#FFD700] text-sm">You are the highest bidder!</div>
            ) : (
              <>
                <input
                  type="number"
                  step="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="Enter bid amount in ETH"
                  className="w-full px-3 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm"
                />
                <button
                  onClick={() => placeBid(meme.id)}
                  disabled={auctionLoading || !bidAmount}
                  className="w-full px-4 py-2 bg-[#FFD700] text-[#121212] rounded-full text-sm font-medium hover:bg-[#FFD700]/90 transition-all disabled:opacity-50"
                >
                  {auctionLoading ? 'Placing Bid...' : 'Place Bid'}
                </button>
              </>
            )}
          </div>
        )}

        <div className="text-white/40 text-xs">
          {isEnded ? 'Auction ended' : `Ends in ${formatTimeLeft(auction.endTime)}`}
        </div>
      </div>
    );
  };

  const formatTimeLeft = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = endTime - now;
    
    if (timeLeft <= 0) return 'Ended';
    
    const days = Math.floor(timeLeft / (24 * 60 * 60));
    const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="relative min-h-screen">
      
        {/* Accent gradient div */}
        <div className="relative w-full h-[300px] rounded-t-full overflow-hidden mt-12">
          <div className="absolute inset-0" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h1 className="text-[64px] font-bold text-white mb-2 font-['Poppins'] text-center">
              Discover Memes
            </h1>
            <p className="text-white/60 text-lg font-['Poppins'] text-center">
              Discover and vote for the best memes
            </p>
          </div>
        </div>
      
        {/* Voting Information */}
        <div className="relative w-full h-[300px] rounded-t-full mb-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#010EFB] to-[#121212] opacity-45" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h2 className="text-3xl font-bold text-white mb-2 font-['Poppins'] text-center">
              Voting Information
            </h2>
            <div className="grid grid-cols-2 gap-8 max-w-md mx-auto">
              <div className="bg-[#1A1A1A]/50 backdrop-blur-sm rounded-2xl p-6">
                <span className="text-[#FFD700] text-sm font-medium font-['Poppins']">vote cost</span>
                <p className="text-white text-2xl font-bold font-['Poppins']">
                  {votingConfig ? ethers.utils.formatEther(votingConfig.voteCost) : '0.01'} ETH
                </p>
              </div>
              <div className="bg-[#1A1A1A]/50 backdrop-blur-sm rounded-2xl p-6">
                <span className="text-[#FFD700] text-sm font-medium font-['Poppins']">max votes</span>
                <p className="text-white text-2xl font-bold font-['Poppins']">
                  {votingConfig ? votingConfig.maxVotes : '100'}
                </p>
              </div>
            </div>
            {!authenticated && (
              <button
                onClick={login}
                className="mt-8 px-8 py-3 bg-[#FFD700] text-[#121212] rounded-full font-['Poppins'] font-medium hover:bg-[#FFD700]/90 transition-all"
              >
                + connect wallet
              </button>
            )}
          </div>
        </div>

      <div className="relative max-w-7xl mx-auto px-4">


        {/* Filters Section */}
        <div className="flex items-center justify-between py-6 mb-8">
          {/* Left side - Filters */}
          <div className="flex items-center gap-4">
            <span className="text-white/60 text-sm font-['Poppins']">Filter</span>
            <button 
              onClick={() => setActiveFilter('top rated')}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors font-['Poppins'] ${
                activeFilter === 'top rated' 
                  ? 'border-[#FFD700] text-[#FFD700]' 
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              top rated
            </button>
            <button 
              onClick={() => setActiveFilter('new')}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors font-['Poppins'] ${
                activeFilter === 'new' 
                  ? 'border-[#FFD700] text-[#FFD700]' 
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              new
            </button>
            <button 
              onClick={() => setActiveFilter('nft minted')}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors font-['Poppins'] ${
                activeFilter === 'nft minted' 
                  ? 'border-[#FFD700] text-[#FFD700]' 
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              NFT minted
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-[300px]">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search memes..."
              className="w-full bg-transparent text-white pl-10 pr-4 py-1.5 rounded-full text-sm focus:outline-none border border-[#FFD700]/50 focus:border-[#FFD700] font-['Poppins']"
            />
          </div>
        </div>

        {/* Meme Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-[420px]">
            <div className="text-white/70 text-lg font-['Poppins']">Loading memes...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
          </div>
        ) : filteredMemes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/60">No memes found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-8">
            {filteredMemes.map((meme) => (
              <div key={meme.id} className="relative bg-[#1A1A1A] rounded-3xl overflow-hidden flex flex-col h-[480px] group">
                {/* Top Bar - Fixed height */}
                <div className="h-12 bg-black/60 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0 z-10">
                  {/* Left side - Vote */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        voteMeme(meme.id);
                      }}
                      disabled={!authenticated || meme.hasVoted || votingStatus[meme.id] === 'loading'}
                      className="relative group"
                    >
                      <svg 
                        className={`w-5 h-5 ${meme.hasVoted ? 'text-[#FFD700]' : 'text-white/60 group-hover:text-white'}`} 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                      >
                        <path d="M12 4l8 8h-6v8h-4v-8H4l8-8z"/>
                      </svg>
                    </button>
                    <span className={`text-sm font-medium ${
                      meme.hasVoted ? 'text-[#FFD700]' : 'text-white/60'
                    }`}>
                      {meme.voteCount}
                    </span>
                    <svg 
                      className={`w-5 h-5 ${meme.hasVoted ? 'text-[#FFD700]' : 'text-white/60 group-hover:text-white'}`} 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <path d="M12 20l-8-8h6V4h4v8h6l-8 8z"/>
                    </svg>
                  </div>

                  {/* Right side - NFT Badge */}
                  {(meme.hasBeenMinted || meme.voteCount >= (votingConfig?.minVotesForWin || 0)) && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-[#FFD700]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                      </svg>
                      <span className="text-sm text-[#FFD700]">
                        {meme.hasBeenMinted ? 'NFT minted' : 'Ready to mint'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Clickable area */}
                <Link 
                  to={`/meme/${meme.id}`} 
                  className="flex flex-col flex-1"
                >
                  {/* Meme Image - Fixed height with overflow hidden */}
                  <div className="h-[300px] flex-shrink-0 overflow-hidden">
                    <img 
                      src={getIPFSGatewayURL(meme.ipfsHash)}
                      alt={meme.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {/* Content - Fixed height */}
                  <div className="p-4 bg-[#1A1A1A] flex-1 flex flex-col">
                    <h3 className="text-white text-lg font-semibold font-['Poppins'] mb-2 line-clamp-1">{meme.title}</h3>
                    <p className="text-white/60 text-sm font-['Poppins'] line-clamp-2 mb-auto">{meme.description}</p>
                    
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-white/40 text-sm">
                        by {formatAddress(meme.creator)}
                      </span>
                      {meme.voteCount >= (votingConfig?.minVotesForWin || 0) && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <AIMarketing meme={meme} />
                        </div>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Add auction info after vote button */}
                {meme.hasBeenMinted && renderAuctionInfo(meme)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExploreMemes; 