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
const API_URL = import.meta.env.VITE_API_URL;

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

// Add at the top with other constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

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
  voteCost: bigint;
}

interface ConnectedWallet {
  address: string;
  walletClientType: string;
  getEthereumProvider: () => Promise<any>;
}

interface AuctionInfo {
  id: string;
  memeId: number;
  startPrice: bigint;
  currentPrice: bigint;
  highestBidder: string;
  endTime: number;
  isActive: boolean;
}

// Update API endpoints
const API_ENDPOINTS = {
    GET_MEMES: `${API_URL}/memes`,
    GET_MEME: (fileId: string) => `${API_URL}/memes/${fileId}`,
    VOTE_MEME: (memeId: string) => `${API_URL}/memes/${memeId}/vote`,
    CLAIM_ROYALTIES: (memeId: string) => `${API_URL}/memes/${memeId}/claim-royalties`,
    MINT_NFT: (memeId: string) => `${API_URL}/memes/${memeId}/mint-nft`,
    REGISTER_MEME: `${API_URL}/memes/register`,
    AGENT_ALLOWANCE: `${API_URL}/agent/allowance`,
    AGENT_SPEND: `${API_URL}/agent/spend`,
    GET_AUCTION: `${API_URL}/auctions`,
    CREATE_AUCTION: `${API_URL}/auctions`,
    PLACE_BID: `${API_URL}/auctions/place-bid`
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

  // Get the authenticated wallet address
  const getAuthenticatedWallet = () => {
    if (!authenticated || !user?.wallet?.address) return null;

    // First check if we have the user's authenticated wallet address
    const authWalletAddress = user.wallet.address;
    // console.log('Auth wallet address:', authWalletAddress);

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

  const fetchVotingConfig = async (contract: ethers.Contract): Promise<VotingConfig> => {
    try {
      const config = await contract.votingConfiguration();
      return {
        maxVotes: Number(config.maxVotes),
        contestDuration: Number(config.contestDuration),
        minVotesForWin: 1,
        voteCost: config.voteCost
      };
    } catch (err) {
      console.error('Error fetching voting config:', err);
      throw err;
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

  // Modified fetchMemes to get data from blockchain
  const fetchMemes = async () => {
    try {
      // Remove cache check and always fetch fresh data
      setLoading(true);
      setError(null);

      const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_PARAMS.rpcUrls[0]);
      const contract = new ethers.Contract(
        ARTIX_CONTRACT_ADDRESS,
        ArtixMemeContestABI,
        provider
      );

      // Fetch voting configuration
      const config = await contract.votingConfiguration();
      setVotingConfig({
        maxVotes: Number(config.maxVotes),
        contestDuration: Number(config.contestDuration),
        minVotesForWin: 1,
        voteCost: config.voteCost
      });

      const memesList: Meme[] = [];
      let memeId = 0;
      const MAX_MEMES_TO_CHECK = 100;
      let emptyMemeCount = 0;
      
      console.log('Fetching fresh meme data from blockchain...');
      
      while (memeId < MAX_MEMES_TO_CHECK) {
        try {
          const meme = await contract.memes(memeId);
          
          if (meme.creator === '0x0000000000000000000000000000000000000000' || meme.ipfsHash === '') {
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
              networkId: Number(meme.networkId),
              voteCount: Number(meme.voteCount),
              submissionTime: Number(meme.submissionTime),
              isActive: meme.isActive,
              hasBeenMinted: meme.hasBeenMinted
            };
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
        const memesWithVoteStatus = await checkUserVotes(contract, memesList, activeWallet.address);
        setMemes(memesWithVoteStatus);
        setFilteredMemes(memesWithVoteStatus);
      } else {
        setMemes(memesList);
        setFilteredMemes(memesList);
      }

    } catch (err: any) {
      console.error('Error fetching memes:', err);
      setError(err.message || 'Error fetching memes');
    } finally {
      setLoading(false);
    }
  };

  // Update useEffect to fetch on mount and when authentication changes
  useEffect(() => {
    fetchMemes();
  }, [authenticated]); // Re-fetch when authentication status changes

  const checkAndMintNFT = async (meme: Meme) => {
    console.log('Checking NFT minting conditions for meme:', {
      memeId: meme.id,
      voteCount: meme.voteCount,
      minVotesRequired: votingConfig?.minVotesForWin || 1,
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
      console.log('Meme qualifies for NFT minting! Proceeding with Story Protocol registration...');
      try {
        // First register with Story Protocol
        const registerResponse = await fetch(API_ENDPOINTS.REGISTER_MEME, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            memeId: meme.id,
            title: meme.title,
            description: meme.description,
            creator: meme.creator,
            imageUrl: `https://ipfs.io/ipfs/${meme.ipfsHash}`,
            metadata: {
              tags: [], // Add tags if available
              category: 'Community Meme',
              aiGenerated: false
            }
          })
        });

        if (!registerResponse.ok) {
          const errorData = await registerResponse.json();
          throw new Error(errorData.details || 'Failed to register with Story Protocol');
        }

        const registrationData = await registerResponse.json();
        console.log('Story Protocol registration successful:', registrationData);

        // Then mint NFT using the backend endpoint
        const mintResponse = await fetch(API_ENDPOINTS.MINT_NFT(meme.id.toString()), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ipId: registrationData.ipId // Pass the Story Protocol IP ID
          })
        });

        if (!mintResponse.ok) {
          throw new Error('Failed to mint NFT');
        }

        const mintData = await mintResponse.json();
        console.log('NFT minting successful:', mintData);

        // Refresh memes to get latest state
        await fetchMemes();

        alert(`NFT minted and registered with Story Protocol!\nTransaction Hash: ${mintData.transactionHash}\nToken ID: ${mintData.tokenId}\nView on OpenSea: ${getOpenSeaUrl(mintData.contractAddress, mintData.tokenId)}\nView on Story Protocol: https://aeneid.explorer.story.foundation/ipa/${registrationData.ipId}`);
      } catch (error) {
        console.error('Error in NFT minting process:', error);
        alert('Failed to process NFT: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    } else {
      console.log(`Meme needs ${votingConfig.minVotesForWin - meme.voteCount} more votes to qualify for NFT minting`);
    }
  };

  // Update voteMeme function to refresh after voting
  const voteMeme = async (memeId: number) => {
    if (!activeWallet) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      console.log('Starting vote process for meme:', memeId);
      setVotingStatus(prev => ({
        ...prev,
        [memeId]: 'loading'
      }));

      const provider = await activeWallet.getEthereumProvider();
      await switchToBaseSepolia(provider);

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = new ethers.Contract(ARTIX_CONTRACT_ADDRESS, ArtixMemeContestABI, signer);

      const votingConfig = await fetchVotingConfig(contract);
      console.log('Submitting vote transaction...');
      const tx = await contract.voteMeme(memeId, { value: votingConfig.voteCost });
      console.log('Waiting for transaction confirmation...');
      await tx.wait();
      console.log('Vote transaction confirmed:', tx.hash);

      // Add alert for successful vote
      alert('Vote cast successfully!');

      console.log('Refreshing memes list...');
      // Refresh memes list to update vote count
      await fetchMemes();
      console.log('Memes list refreshed');

      // Get the fresh data for this meme after fetching
      const updatedMeme = memes.find(m => m.id === memeId);
      if (updatedMeme) {
        // Get fresh data from contract to ensure accuracy
        const freshMemeData = await contract.memes(memeId);
        const currentVoteCount = Number(freshMemeData.voteCount);
        const votesNeeded = (votingConfig?.minVotesForWin || 1) - currentVoteCount;
        
        if (votesNeeded <= 0 && !freshMemeData.hasBeenMinted) {
          // Eligible for minting
          const shouldMint = window.confirm(
            `Congratulations! This meme has reached ${currentVoteCount} votes and is eligible for NFT minting!\n\nWould you like to mint it now?`
          );
          
          if (shouldMint) {
            console.log('Starting minting process...');
            await checkAndMintNFT({
              ...updatedMeme,
              voteCount: currentVoteCount,
              hasBeenMinted: freshMemeData.hasBeenMinted
            });
          }
        } else if (!freshMemeData.hasBeenMinted) {
          // Not yet eligible
          alert(`This meme now has ${currentVoteCount} vote${currentVoteCount !== 1 ? 's' : ''}.\nNeeds ${votesNeeded} more vote${votesNeeded !== 1 ? 's' : ''} to be eligible for NFT minting!`);
        }
      }

      setVotingStatus(prev => ({
        ...prev,
        [memeId]: 'success'
      }));

      // Reset voting status after 5 seconds
      setTimeout(() => {
        setVotingStatus(prev => ({
          ...prev,
          [memeId]: null
        }));
      }, 5000);

    } catch (error) {
      console.error('Error voting:', error);
      setVotingStatus(prev => ({
        ...prev,
        [memeId]: 'error'
      }));

      // Reset error status after 5 seconds
      setTimeout(() => {
        setVotingStatus(prev => ({
          ...prev,
          [memeId]: null
        }));
      }, 5000);
    }
  };

  const registerWithStoryProtocol = async (meme: any) => {
    try {
      // Register with Story Protocol
      const response = await fetch('/api/memes/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: meme.title,
          description: meme.description,
          creator: meme.creator,
          imageUrl: `https://ipfs.io/ipfs/${meme.imageHash}`,
          metadata: {
            tags: meme.metadata.tags,
            category: 'Community Meme',
            aiGenerated: meme.metadata.aiGenerated
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register with Story Protocol');
      }

      const data = await response.json();
      console.log('Story Protocol registration successful:', data);

      // Update meme in local storage to mark as registered
      const storedMemes = JSON.parse(localStorage.getItem('memes') || '[]');
      const updatedMemes = storedMemes.map((m: any) => {
        if (m.timestamp === meme.timestamp) {
          return {
            ...m,
            storyProtocolId: data.ipId,
            registered: true
          };
        }
        return m;
      });
      localStorage.setItem('memes', JSON.stringify(updatedMemes));
      setMemes(updatedMemes);

      alert(`Meme registered with Story Protocol!\nView on Story Protocol: https://aeneid.explorer.story.foundation/ipa/${data.ipId}`);
    } catch (error) {
      console.error('Error registering with Story Protocol:', error);
      alert('Failed to register meme with Story Protocol');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  console.log(formatDate(1712832000))


  const getIPFSGatewayURL = (ipfsHash: string | undefined) => {
    if (!ipfsHash) return '';
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
    return `Vote (${ethers.formatEther(votingConfig?.voteCost || '0')} ETH)`;
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
          startPrice: ethers.parseEther('0.1').toString(), // Default start price
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
          amount: ethers.parseEther(bidAmount).toString()
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
    const currentPrice = ethers.formatEther(auction.currentPrice);
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
    <div className="relative min-h-screen bg-[#FFFBEA]">
      {/* Header Section */}
      <div className="relative w-full h-[300px] overflow-hidden mt-12">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-[64px] font-bold text-[#131315] font-urbanist text-center">
            Discover Memes
          </h1>
          <p className="text-[#131315]/60 text-lg font-urbanist text-center">
            Discover and vote for the best memes
          </p>
        </div>
      </div>
    
      {/* Voting Information */}
      <div className="relative w-full h-[300px] rounded-t-full mb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#EE5A0E] to-[#0F62FE] opacity-5" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h2 className="text-3xl font-bold text-[#131315] mb-2 font-urbanist text-center">
            Voting Information
          </h2>
          <div className="grid grid-cols-2 gap-8 max-w-md mx-auto">
            <div className="bg-[#FFFBEA] backdrop-blur-sm rounded-2xl p-6 border border-[#9C9C9C]">
              <span className="text-[#EE5A0E] text-sm font-medium font-urbanist">vote cost</span>
              <p className="text-[#131315] text-2xl font-bold font-urbanist">
                {votingConfig ? ethers.formatEther(votingConfig.voteCost) : '0.01'} ETH
              </p>
            </div>
            <div className="bg-[#FFFBEA] backdrop-blur-sm rounded-2xl p-6 border border-[#9C9C9C]">
              <span className="text-[#EE5A0E] text-sm font-medium font-urbanist">max votes</span>
              <p className="text-[#131315] text-2xl font-bold font-urbanist">
                {votingConfig ? votingConfig.maxVotes : '100'}
              </p>
            </div>
          </div>
          {!authenticated && (
            <button
              onClick={login}
              className="mt-8 px-8 py-3 bg-gradient-to-r from-[#EE5A0E] to-[#0F62FE] text-white rounded-full font-urbanist font-medium hover:opacity-90 transition-all"
            >
              + CONNECT WALLET
            </button>
          )}
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4">
        {/* Filters Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-6 mb-8 gap-4">
          {/* Left side - Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[#131315]/60 text-sm font-urbanist">Filter</span>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveFilter('top rated')}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors font-urbanist ${
                  activeFilter === 'top rated' 
                    ? 'border-[#EE5A0E] text-[#EE5A0E]' 
                    : 'border-transparent text-[#131315]/60 hover:text-[#131315]'
                }`}
              >
                TOP RATED
              </button>
              <button 
                onClick={() => setActiveFilter('new')}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors font-urbanist ${
                  activeFilter === 'new' 
                    ? 'border-[#EE5A0E] text-[#EE5A0E]' 
                    : 'border-transparent text-[#131315]/60 hover:text-[#131315]'
                }`}
              >
                NEW
              </button>
              <button 
                onClick={() => setActiveFilter('nft minted')}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors font-urbanist ${
                  activeFilter === 'nft minted' 
                    ? 'border-[#EE5A0E] text-[#EE5A0E]' 
                    : 'border-transparent text-[#131315]/60 hover:text-[#131315]'
                }`}
              >
                NFT MINTED
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-[300px]">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-[#131315]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memes..."
              className="w-full bg-[#FFFBEA] text-[#131315] pl-10 pr-4 py-1.5 rounded-full text-sm focus:outline-none border border-[#EE5A0E]/50 focus:border-[#EE5A0E] font-urbanist"
            />
          </div>
        </div>

        {/* Meme Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-[420px]">
            <div className="text-[#131315]/70 text-lg font-urbanist">Loading memes...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
          </div>
        ) : filteredMemes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#131315]/60">No memes found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredMemes.map((meme) => (
              <div key={meme.id} className="w-full h-[500px] rounded-2xl overflow-hidden bg-[#FFFBEA] border border-[#9C9C9C] group transition-all duration-300 hover:border-transparent hover:bg-gradient-to-r hover:from-[#EE5A0E] hover:to-[#0F62FE] hover:p-[1px]">
                <div className="w-full h-full bg-[#FFFBEA] rounded-2xl overflow-hidden flex flex-col">
                  {/* Top Bar */}
                  <div className="h-12 bg-[#FFFBEA] flex items-center justify-between px-4 border-b border-[#9C9C9C] flex-shrink-0">
                    {/* Vote Controls */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          voteMeme(meme.id);
                        }}
                        disabled={!authenticated || meme.hasVoted || votingStatus[meme.id] === 'loading'}
                        className="relative group"
                      >
                        <img 
                          src={meme.hasVoted || votingStatus[meme.id] === 'success' ? "/arrow-variant.svg" : "/arrow-up.svg"}
                          alt="Upvote"
                          className={`w-6 h-6 ${meme.hasVoted ? 'transform rotate-180' : ''}`}
                        />
                      </button>
                      <span className={`text-sm font-medium ${
                        meme.hasVoted ? 'text-[#EE5A0E]' : 'text-[#131315]/60'
                      }`}>
                        {meme.voteCount}
                      </span>
                    </div>

                    {/* NFT Badge */}
                    {(meme.hasBeenMinted || meme.voteCount >= (votingConfig?.minVotesForWin || 0)) && (
                      <div className="px-3 py-1 rounded-full border border-[#9C9C9C] bg-[#FFFBEA]">
                        <span className="text-sm text-[#131315]">
                          {meme.hasBeenMinted ? 'NFT minted' : 'Ready to mint'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Meme Image */}
                  <Link to={`/meme/${meme.id}`} className="flex-1 flex flex-col">
                    <div className="h-[320px] overflow-hidden flex-shrink-0">
                      <img 
                        src={meme.ipfsHash ? getIPFSGatewayURL(meme.ipfsHash) : '/placeholder.svg'}
                        alt={meme.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                          e.currentTarget.onerror = null;
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-[#131315] text-lg font-medium mb-2 line-clamp-1 group-hover:bg-gradient-to-r group-hover:from-[#EE5A0E] group-hover:to-[#0F62FE] group-hover:text-transparent group-hover:bg-clip-text transition-all duration-300 font-urbanist">
                          {meme.title}
                        </h3>
                        <p className="text-[#131315]/60 text-sm line-clamp-2 font-urbanist">
                          {meme.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src="/user.svg" alt="Creator" className="w-4 h-4 flex-shrink-0" />
                          <span className="text-[#131315]/60 text-sm font-urbanist truncate">
                            {formatAddress(meme.creator)}
                          </span>
                        </div>
                        {meme.voteCount >= (votingConfig?.minVotesForWin || 0) && (
                          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                            <AIMarketing meme={meme} />
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExploreMemes; 