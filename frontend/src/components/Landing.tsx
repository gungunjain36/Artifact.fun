
import { Link } from 'react-router-dom';

const Landing = () => {
  const features = [
    {
      title: "On-Chain Voting",
      description: "Community-driven voting ensures fairness & transparency",
      icon: "👥",
      gradient: "bg-[linear-gradient(132.11deg,#FFFBEA_51.61%,rgba(238,90,14,0.01)_230.57%)]"
    },
    {
      title: "AI-Powered NFT Minting & Marketing",
      description: "AI-generated memes with automated social promotion",
      icon: "🎨",
      gradient: "bg-[linear-gradient(132.11deg,#FFFBEA_51.61%,#0F62FE_230.57%)]"
    },
    {
      title: "Creator Monetization",
      description: "Reward creators with royalties from their NFTs",
      icon: "💰",
      gradient: "bg-[linear-gradient(132.11deg,#FFFBEA_51.61%,rgba(238,90,14,0.01)_230.57%)]"
    },
    {
      title: "Exclusive NFT Auctions",
      description: "Auction rare meme NFTs to the community",
      icon: "🏆",
      gradient: "bg-[linear-gradient(132.11deg,#FFFBEA_51.61%,#0F62FE_230.57%)]"
    },
    {
      title: "Reward System & Ranking NFTs",
      description: "Gain points for being a trendsetter",
      icon: "⭐",
      gradient: "bg-[linear-gradient(132.11deg,#FFFBEA_51.61%,rgba(238,90,14,0.01)_230.57%)]"
    },
    {
      title: "Autonomous Meme Agent",
      description: "Stay fresh with auto-generated viral memes",
      icon: "🤖",
      gradient: "bg-[linear-gradient(132.11deg,#FFFBEA_51.61%,#0F62FE_230.57%)]"
    }
  ];

  const sponsors = [
    { img: '/eliza.svg', alt: 'Eliza OS' },
    { img: '/story.svg', alt: 'Story Protocol' },
    { img: '/safe.svg', alt: 'Safe' },
    { img: '/fileverse.svg', alt: 'Fileverse' },
    { img: '/aws.svg', alt: 'AWS' },
    {img: '/venice.svg', alt: 'Venice'}
  ];

  return (
    <div className="min-h-screen bg-[#FFFBEA]">
      {/* Hero Section */}
      <div className="w-full min-h-[80vh] relative overflow-hidden bg-[linear-gradient(132.11deg,#FFFBEA_51.61%,rgba(238,90,14,0.01)_230.57%)]">
        <div className="absolute inset-0 bg-[url('/logo.svg')] opacity-5" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 pt-20 pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-7xl font-bold mb-8 bg-gradient-to-r from-[#4361EE] to-[#EE5A0E] text-transparent bg-clip-text">
              ARTIFACT.FUN
            </h1>
            <p className="text-2xl text-gray-700 mb-12 max-w-2xl mx-auto">
              Create, Vote, and Earn from Your Memes with the Power of AI & Blockchain
            </p>
            <div className="flex gap-6 justify-center">
              <Link 
                to="/home"
                className="flex items-center justify-center w-[192px] h-[36px] bg-gradient-to-r from-[#EE5A0E] to-[#0F62FE] text-white rounded-full text-sm font-semibold font-urbanist transition-all duration-200 shadow-[inset_0px_4px_4px_0px_#FFFBEA2B,inset_0px_-4px_4px_0px_#00000024] hover:opacity-90"
              >
                GET STARTED
              </Link>
              <a 
                href="#features"
                className="flex items-center justify-center w-[192px] h-[36px] border border-[#EE5A0E] text-[#EE5A0E] rounded-full text-sm font-semibold font-urbanist transition-all duration-200 hover:bg-[#EE5A0E] hover:text-white"
              >
                LEARN MORE
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-[1200px] mx-auto px-4 py-20">
        {/* Features Grid */}
        <div className="mb-32" id="features">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold">Key Features</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`h-[250px] rounded-2xl px-20 py-11 border border-[#9C9C9C] ${feature.gradient} flex items-center`}
              >
                <div className="flex gap-6 items-start">
                  <span className="text-4xl">{feature.icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                    <p className="text-gray-700 text-lg leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sponsors */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold">Backed by Industry Leaders</h2>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-20">
            {sponsors.map((sponsor, index) => (
              <img 
                key={index}
                src={sponsor.img}
                alt={sponsor.alt}
                className="h-12 w-auto object-contain grayscale opacity-75"
              />
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center py-20 px-6 rounded-3xl bg-[linear-gradient(132.11deg,#FFFBEA_51.61%,#0F62FE_230.57%)] border border-[#9C9C9C]">
          <h2 className="text-4xl font-bold mb-6">Ready to Create?</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Join the next generation of meme creators and start earning today
          </p>
          <Link 
            to="/home"
            className="flex items-center justify-center w-[192px] h-[36px] bg-gradient-to-r from-[#EE5A0E] to-[#0F62FE] text-white rounded-full text-sm font-semibold font-urbanist transition-all duration-200 shadow-[inset_0px_4px_4px_0px_#FFFBEA2B,inset_0px_-4px_4px_0px_#00000024] hover:opacity-90 mx-auto"
          >
            LAUNCH APP
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing; 