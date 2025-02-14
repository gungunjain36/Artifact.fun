import { useState } from 'react';
import Card from './Card';

interface MemeCardProps {
  title: string;
  imageUrl: string;
  upvotes: number;
  downvotes: number;
  description?: string;
  hasBeenMinted?: boolean;
  onUpvote?: () => void;
  onDownvote?: () => void;
  onClick?: () => void;
  className?: string;
  rank?: number;
}

const MemeCard = ({
  title,
  imageUrl,
  upvotes,
  downvotes,
  description = 'Only one line is allowed for the description..',
  hasBeenMinted = false,
  onUpvote,
  onDownvote,
  onClick,
  className = '',
  rank
}: MemeCardProps) => {
  const [hoverUpvote, setHoverUpvote] = useState(false);
  const [hoverDownvote, setHoverDownvote] = useState(false);

  return (
    <Card onClick={onClick} className={`${className} w-full sm:w-[400px] h-auto sm:h-[500px] overflow-hidden rounded-2xl relative`}>
      {/* Rank Badge */}
      {rank && (
        <div className="absolute -top-4 -left-4 z-30">
          <div className="relative">
            <div className="absolute inset-0 bg-[#0F62FE] rounded-full shadow-lg blur-sm opacity-50"></div>
            <div className={`relative ${rank === 1 ? 'w-16 sm:w-20 h-16 sm:h-20' : 'w-14 sm:w-16 h-14 sm:h-16'} bg-[#0F62FE] rounded-full shadow-lg flex items-center justify-center`}>
              <span className={`text-white font-bold font-urbanist drop-shadow-lg ${rank === 1 ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'}`}>
                {rank}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar with Votes and NFT Badge */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-3 z-20">
        {/* Vote Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpvote?.();
            }}
            onMouseEnter={() => setHoverUpvote(true)}
            onMouseLeave={() => setHoverUpvote(false)}
            className="w-8 h-8 sm:w-9 sm:h-9 transition-transform"
          >
            {hoverUpvote ? (
              <img src="/arrow-variant.svg" alt="Upvote" className="w-full h-full" />
            ) : (
              <img src="/arrow-up.svg" alt="Upvote" className="w-full h-full" />
            )}
          </button>
          <span className="text-[#131315] text-sm sm:text-base font-medium">{upvotes}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownvote?.();
            }}
            onMouseEnter={() => setHoverDownvote(true)}
            onMouseLeave={() => setHoverDownvote(false)}
            className="w-8 h-8 sm:w-9 sm:h-9 transition-transform"
          >
            {hoverDownvote ? (
              <img src="/arrow-variant.svg" alt="Downvote" className="w-full h-full rotate-180" />
            ) : (
              <img src="/arrow-down.svg" alt="Downvote" className="w-full h-full" />
            )}
          </button>
        </div>

        {/* NFT Badge */}
        {hasBeenMinted && (
          <div className="bg-white/90 backdrop-blur-sm px-2 sm:px-3 py-1 rounded-md">
            <span className="text-[#131315] text-xs sm:text-sm font-medium">NFT minted</span>
          </div>
        )}
      </div>

      {/* Image */}
      <div className="w-full h-[250px] sm:h-[300px]">
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 bg-white p-3 sm:p-4 rounded-b-2xl">
        <h3 className="text-[#131315] text-sm sm:text-base font-medium mb-1 line-clamp-1">
          {title}
        </h3>
        <p className="text-[#131315]/60 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-1">
          {description}
        </p>
        <div className="flex items-center gap-3 sm:gap-4 text-[#131315]/60 text-xs sm:text-sm">
          <div className="flex items-center gap-1">
            <span>↑ {upvotes}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>↓ {downvotes}</span>
          </div>
          {hasBeenMinted && (
            <span>NFT minted</span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default MemeCard; 