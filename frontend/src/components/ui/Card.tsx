import { useState } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  navigateTo?: string;
  upvotes?: number;
  downvotes?: number;
  title?: string;
  description?: string;
}

const Card = ({ 
  children, 
  onClick, 
  className = '', 
  navigateTo,
  upvotes = 103,
  downvotes = 0,
  title = "This is a nice title",
  description = "Only one line is allowed for the description..."
}: CardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hoveredUpvote, setHoveredUpvote] = useState(false);
  const [hoveredDownvote, setHoveredDownvote] = useState(false);

  return (
    <motion.div
      className={`
        relative
        w-[400px] h-[500px]
        rounded-2xl
        bg-[#FFFBEA]
        cursor-pointer
        overflow-hidden
        ${className}
      `}
      style={{
        position: 'relative',
        ...(isHovered || isPressed ? {
          background: 'linear-gradient(#FFFBEA, #FFFBEA) padding-box, linear-gradient(90deg, #EE5A0E 0%, #0F62FE 100%) border-box',
          border: '3px solid transparent',
          borderRadius: '16px'
        } : {
          border: '1px solid #9C9C9C',
          borderRadius: '16px'
        }),
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onTapStart={() => setIsPressed(true)}
      onTap={() => {
        setIsPressed(false);
        onClick?.();
      }}
      onTapCancel={() => setIsPressed(false)}
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-[#FFFBEA] z-10">
        <div className="flex items-center gap-2">
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center cursor-pointer"
            onHoverStart={() => setHoveredUpvote(true)}
            onHoverEnd={() => setHoveredUpvote(false)}
          >
            <img 
              src={hoveredUpvote ? "/arrow-variant.svg" : "/arrow-up.svg"} 
              alt="Upvote" 
              className="w-6 h-6" 
            />
          </motion.div>
          <motion.span 
            className="text-base font-medium"
            style={{
              background: hoveredUpvote ? 'linear-gradient(90deg, #EE5A0E 0%, #0F62FE 100%)' : 'none',
              WebkitBackgroundClip: hoveredUpvote ? 'text' : 'none',
              WebkitTextFillColor: hoveredUpvote ? 'transparent' : 'inherit',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {upvotes}
          </motion.span>
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center cursor-pointer"
            onHoverStart={() => setHoveredDownvote(true)}
            onHoverEnd={() => setHoveredDownvote(false)}
          >
            <img 
              src={hoveredDownvote ? "/arrow-variant.svg" : "/arrow-down.svg"} 
              alt="Downvote" 
              className="w-6 h-6 rotate-180" 
            />
          </motion.div>
        </div>
        <span className="text-sm px-3 py-1 rounded-full border border-[#9C9C9C]">
          NFT minted
        </span>
      </div>

      {/* Main Content */}
      <img 
        src="/placeholder.svg" 
        alt="Placeholder" 
        className="w-full h-full object-cover"
      />

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#FFFBEA]">
        <motion.h3 
          className="text-xl font-semibold mb-2"
          style={{
            background: isHovered ? 'linear-gradient(90deg, #EE5A0E 0%, #0F62FE 100%)' : 'none',
            WebkitBackgroundClip: isHovered ? 'text' : 'none',
            WebkitTextFillColor: isHovered ? 'transparent' : 'inherit',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {title}
        </motion.h3>
        <p className="text-sm text-gray-600">{description}</p>
        <div className="flex items-center gap-4 mt-3">
          <span className="flex items-center gap-1">
            <img src="/user.svg" alt="Views" className="w-4 h-4" />
            {upvotes}
          </span>
          <span className="flex items-center gap-1">
            <img src="/thick-arrow.svg" alt="Shares" className="w-4 h-4" />
            1063
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default Card; 