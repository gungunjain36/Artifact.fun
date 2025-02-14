import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ArtixMemeContestABI from '../abi/ArtixMemeContest.json';
import MemeCard from './ui/MemeCard';
import Card from './ui/Card';

const ARTIX_CONTRACT_ADDRESS = import.meta.env.VITE_ARTIX_CONTRACT_ADDRESS;

// Base Sepolia network parameters
const BASE_SEPOLIA_PARAMS = {
  chainId: '0x' + Number(84532).toString(16),
  chainName: 'Base Sepolia',
  rpcUrls: ['https://sepolia.base.org'],
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
  hasVoted?: boolean;
}

const Home = () => {
  const [activeFilter, setActiveFilter] = useState<'top rated' | 'new'>('top rated');
  const [activeStatus, setActiveStatus] = useState<'voting open' | 'NFT minted' | 'voting closed'>('voting open');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 68;
  const [topMemes, setTopMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);

  const getIPFSGatewayURL = (ipfsHash: string) => {
    const hash = ipfsHash.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${hash}`;
  };

  const fetchTopMemes = async () => {
    try {
      setLoading(true);
      const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_PARAMS.rpcUrls[0]);
      const contract = new ethers.Contract(
        ARTIX_CONTRACT_ADDRESS,
        ArtixMemeContestABI,
        provider
      );

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

      // Sort memes by vote count and get top 6
      const sortedMemes = memesList.sort((a, b) => b.voteCount - a.voteCount).slice(0, 6);
      setTopMemes(sortedMemes);
    } catch (err) {
      console.error('Error fetching top memes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopMemes();
  }, []);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 3;
    
    // Always show first page
    pages.push(
      <button 
        key={1}
        onClick={() => handlePageChange(1)}
        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${
          currentPage === 1 
            ? 'bg-yellow-400 text-black' 
            : 'text-gray-400 hover:text-white'
        }`}
      >
        1
      </button>
    );

    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(startPage + maxVisiblePages - 1, totalPages - 1);

    if (startPage > 2) {
      pages.push(
        <span key="ellipsis1" className="w-8 h-8 flex items-center justify-center text-gray-400">
          ...
        </span>
      );
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${
            currentPage === i 
              ? 'bg-yellow-400 text-black' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages - 1) {
      pages.push(
        <span key="ellipsis2" className="w-8 h-8 flex items-center justify-center text-gray-400">
          ...
        </span>
      );
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${
            currentPage === totalPages 
              ? 'bg-yellow-400 text-black' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="relative min-h-screen bg-[#FFFBEA]">
      {/* Main gradient overlay */}
      <div className="absolute top-0 left-0 w-full h-[600px] md:h-[700px]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#EE5A0E] via-transparent to-transparent opacity-20" />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="pt-20 md:pt-32 pb-24">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-left max-w-2xl">
              <p className="text-[#EE5A0E] text-lg md:text-base uppercase font-medium mb-2 font-urbanist tracking-wide animate-fade-in">
                Meme Contest DAO Platform
              </p>
              <h1 className="text-[#0F62FE] text-4xl sm:text-4xl md:text-8xl lg:text-[130px] font-bold font-urbanist leading-[0.9] mb-8 animate-fade-in-up">
                ARTIFACT.FUN
              </h1>
              <div className="space-y-6 mb-8 md:mb-12">
                <p className="text-[#131315]/80 text-base md:text-lg lg:text-xl font-urbanist max-w-xl leading-relaxed">
                  Create, Vote & Earn from Memes on the Blockchain. Powered by AI Agents for seamless creation and management.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                <Link
                  to="/create"
                  className="w-full sm:w-[192px] h-[36px] inline-flex items-center justify-center bg-gradient-to-r from-[#EE5A0E] to-[#0F62FE] text-white rounded-full text-sm font-semibold font-urbanist transition-all duration-200 shadow-[inset_0px_4px_4px_0px_#FFFBEA2B,inset_0px_-4px_4px_0px_#00000024] hover:opacity-90 hover:-translate-y-0.5"
                >
                  + CREATE MEME
                </Link>
                <Link
                  to="/explore"
                  className="w-full sm:w-[192px] h-[36px] inline-flex items-center justify-center bg-[#FFFBEA] border border-[#EE5A0E] text-black bg-clip-text bg-gradient-to-r from-[#EE5A0E] to-[#0F62FE] rounded-full text-sm font-semibold font-urbanist transition-all duration-200 hover:shadow-[inset_0px_4px_4px_0px_#FFFBEA2B,inset_0px_-4px_4px_0px_#00000024] hover:bg-gradient-to-r hover:from-[#EE5A0E] hover:to-[#0F62FE] hover:text-white group relative overflow-hidden"
                >
                  <span className="relative z-10">EXPLORE MEMES</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#EE5A0E] to-[#0F62FE] opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Best of Memes Section */}
        <div className="mb-20 md:mb-40">
          <div className="best-memes-container p-6 md:p-8 lg:p-12 relative">
            {/* Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img 
                src="/celebrate.svg" 
                alt="" 
                className="absolute -top-11 -left-0 w-48 md:w-64 h-48 md:h-64 transform -rotate-12"
              />
              <img 
                src="/trophy.svg" 
                alt="" 
                className="absolute -bottom-12 -right-12 w-48 md:w-64 h-48 md:h-64 transform rotate-12"
              />
            </div>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-8 md:mb-12 lg:mb-16 font-urbanist text-[#131315] relative z-10">
              Best of Memes
            </h2>

            {/* Cards Grid */}
            <div className="grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative z-10 mt-8 hidden md:grid">
              {/* Order: 2nd, 1st, 3rd */}
              {[0, 1, 2].map((index) => {
                const meme = topMemes[index];
                if (!meme) return null;
                
                // Center card is the top voted one (index 0)
                const isCenter = index === 1;
                return (
                  <div key={meme.id} className={`relative ${isCenter ? '-mt-12' : ''}`}>
                    <img 
                      src={`/rank-${index === 1 ? 1 : index === 0 ? 2 : 3}.svg`} 
                      alt={`Rank ${index === 1 ? 1 : index === 0 ? 2 : 3}`} 
                      className="absolute -top-2 -left-2 z-20 w-24 h-24"
                    />
                    <div className="w-full h-[400px] rounded-2xl overflow-hidden bg-[#FFFBEA] border border-[#9C9C9C] group transition-all duration-300 hover:border-transparent hover:bg-gradient-to-r hover:from-[#EE5A0E] hover:to-[#0F62FE] hover:p-[1px]">
                      <div className="w-full h-full bg-[#FFFBEA] rounded-2xl overflow-hidden">
                        {/* Image */}
                        <img 
                          src={getIPFSGatewayURL(meme.ipfsHash)} 
                          alt={meme.title}
                          className="w-full h-[300px] object-cover"
                        />
                        
                        {/* Content */}
                        <div className="p-6">
                          <h3 className="text-[#131315] text-lg font-medium mb-2 line-clamp-1 group-hover:bg-gradient-to-r group-hover:from-[#EE5A0E] group-hover:to-[#0F62FE] group-hover:text-transparent group-hover:bg-clip-text transition-all duration-300">
                            {meme.title}
                          </h3>
                          <p className="text-[#131315]/60 text-sm line-clamp-1">
                            {meme.description || "Only one line is allowed for the description..."}
                          </p>
                          <div className="flex items-center gap-2 mt-4">
                            <span className="text-sm text-[#131315]/60">↑ {meme.voteCount}</span>
                            <span className="text-sm text-[#131315]/60">• 1063</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Grid */}
            <div className="grid grid-cols-1 gap-6 md:hidden">
              {topMemes.map((meme, index) => (
                <div key={meme.id} className="relative">
                  <img 
                    src={`/rank-${index + 1}.svg`} 
                    alt={`Rank ${index + 1}`} 
                    className="absolute -top-4 -left-4 w-16 h-16 z-20"
                  />
                  <div className="w-full h-[350px] rounded-2xl overflow-hidden bg-[#FFFBEA] border border-[#9C9C9C] group transition-all duration-300 hover:border-transparent hover:bg-gradient-to-r hover:from-[#EE5A0E] hover:to-[#0F62FE] hover:p-[1px]">
                    <div className="w-full h-full bg-[#FFFBEA] rounded-2xl overflow-hidden">
                      <img 
                        src={getIPFSGatewayURL(meme.ipfsHash)} 
                        alt={meme.title}
                        className="w-full h-[250px] object-cover"
                      />
                      <div className="p-4">
                        <h3 className="text-[#131315] text-base font-medium mb-2 line-clamp-1 group-hover:bg-gradient-to-r group-hover:from-[#EE5A0E] group-hover:to-[#0F62FE] group-hover:text-transparent group-hover:bg-clip-text transition-all duration-300">
                          {meme.title}
                        </h3>
                        <p className="text-[#131315]/60 text-sm line-clamp-1">
                          {meme.description || "Only one line is allowed for the description..."}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-sm text-[#131315]/60">↑ {meme.voteCount}</span>
                          <span className="text-sm text-[#131315]/60">• 1063</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {topMemes.length === 0 && (
              <div className="flex justify-center items-center h-full">
                <div className="text-[#131315]/70 text-lg font-urbanist">
                  No memes found. Be the first to create one!
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Ranked Memes Section */}
        <div className="mb-20 md:mb-32">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 md:mb-6 font-urbanist text-center text-[#131315]">Top Ranked Memes</h2>
          <p className="text-[#131315]/70 text-lg mb-8 md:mb-12 text-center font-urbanist">
            Vote to get rewarded. <a href="#" className='text-[#EE5A0E] hover:text-[#EE5A0E]/80 transition-colors'>Read more</a> on how it works.
          </p>
          
          {/* Filters and Search Bar - Mobile Responsive */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-3 px-4 rounded-lg mb-8">
            {/* Left side - Filter */}
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <span className="text-[#131315]/60 text-sm font-urbanist">Filter</span>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setActiveFilter('top rated')}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors font-urbanist ${
                    activeFilter === 'top rated' 
                      ? 'bg-transparent text-[#EE5A0E] border-[#EE5A0E]' 
                      : 'text-[#131315]/60 border-transparent hover:text-[#131315] hover:border-[#131315]'
                  }`}
                >
                  TOP RATED
                </button>
                <button 
                  onClick={() => setActiveFilter('new')}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors font-urbanist ${
                    activeFilter === 'new' 
                      ? 'bg-transparent text-[#EE5A0E] border-[#EE5A0E]' 
                      : 'text-[#131315]/60 border-transparent hover:text-[#131315] hover:border-[#131315]'
                  }`}
                >
                  NEW
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
                placeholder="Search memes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[#131315] pl-10 pr-4 py-1.5 rounded-full text-sm focus:outline-none border border-[#EE5A0E]/50 focus:border-[#EE5A0E] font-urbanist"
              />
            </div>
          </div>
          
          {/* Meme Grid - Mobile Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
            {loading ? (
              <div className="col-span-full flex justify-center items-center py-12">
                <div className="text-[#131315]/70 text-lg font-urbanist">Loading top memes...</div>
              </div>
            ) : topMemes.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-[#131315]/60 font-urbanist">No memes found. Be the first to create one!</p>
              </div>
            ) : (
              topMemes.map((meme) => (
                <div key={meme.id} className="w-full h-[500px] rounded-2xl overflow-hidden bg-[#FFFBEA] border border-[#9C9C9C] group transition-all duration-300 hover:border-transparent hover:bg-gradient-to-r hover:from-[#EE5A0E] hover:to-[#0F62FE] hover:p-[1px]">
                  <div className="w-full h-full bg-[#FFFBEA] rounded-2xl overflow-hidden flex flex-col">
                    {/* Top Bar */}
                    <div className="h-12 bg-[#FFFBEA] flex items-center justify-between px-4 border-b border-[#9C9C9C] flex-shrink-0">
                      {/* Vote Controls */}
                      <div className="flex items-center gap-2">
                        <button className="relative group">
                          <img 
                            src="/arrow-up.svg"
                            alt="Upvote"
                            className="w-6 h-6"
                          />
                        </button>
                        <span className="text-sm font-medium text-[#131315]/60">
                          {meme.voteCount}
                        </span>
                        <button className="relative group">
                          <img 
                            src="/arrow-down.svg"
                            alt="Downvote"
                            className="w-6 h-6"
                          />
                        </button>
                      </div>

                      {/* NFT Badge */}
                      {meme.hasBeenMinted && (
                        <div className="px-3 py-1 rounded-full border border-[#9C9C9C] bg-[#FFFBEA]">
                          <span className="text-sm text-[#131315]">
                            NFT minted
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
                              {`${meme.creator.slice(0, 6)}...${meme.creator.slice(-4)}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <img src="/thick-arrow.svg" alt="Shares" className="w-4 h-4" />
                            <span className="text-[#131315]/60 text-sm">1063</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* View More Button */}
          {topMemes.length > 0 && (
            <div className="flex justify-center mt-12">
              <Link
                to="/explore"
                className="w-[192px] h-[36px] inline-flex items-center justify-center bg-gradient-to-r from-[#EE5A0E] to-[#0F62FE] text-white rounded-full text-sm font-semibold font-urbanist transition-all duration-200 shadow-[inset_0px_4px_4px_0px_#FFFBEA2B,inset_0px_-4px_4px_0px_#00000024] hover:opacity-90"
              >
                DISCOVER MORE →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;