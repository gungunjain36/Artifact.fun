import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import axios from 'axios';
import ArtixMemeContestABI from '../abi/ArtixMemeContest.json';
import ArtifactRankingABI from '../abi/ArtifactRanking.json';
import { Link } from 'react-router-dom';

const ARTIX_CONTRACT_ADDRESS = import.meta.env.VITE_ARTIX_CONTRACT_ADDRESS;
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY;
const VENICE_API_KEY = import.meta.env.VITE_VENICE_API_KEY;
const ARTIX_RANKING_CONTRACT_ADDRESS = import.meta.env.VITE_ARTIX_RANKING_CONTRACT_ADDRESS;

// Base Sepolia network parameters
const BASE_SEPOLIA_PARAMS = {
  chainId: '0x' + Number(84532).toString(16), // Base Sepolia chainId in hex
  chainName: 'Base Sepolia',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://sepolia.base.org'],
  blockExplorerUrls: ['https://sepolia.basescan.org']
};

// Update API endpoints
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const API_ENDPOINTS = {
    CREATE_SAFE: `${API_BASE_URL}/auth/create-safe`,
    GET_USER_SAFE: (userAddress: string) => `${API_BASE_URL}/auth/user-safe/${userAddress}`,
    CREATE_MEME: `${API_BASE_URL}/memes`,
    GET_MEME: (fileId: string) => `${API_BASE_URL}/memes/${fileId}`,
    SUBMIT_MEME: `${API_BASE_URL}/memes/submit`,
    INITIALIZE_AGENT: `${API_BASE_URL}/agent/initialize`,
    AGENT_MESSAGE: `${API_BASE_URL}/agent/message`,
    UPLOAD_FILE: `${API_BASE_URL}/files/upload`
};

interface APIResponse<T> {
  success: boolean;
  error?: string;
  details?: string;
  data?: T;
}

interface MemeResponse {
  meme: {
    title: string;
    description: string;
    creator: string;
    imageUrl: string;
    metadata: {
      tags: string[];
      category: string;
      aiGenerated: boolean;
    };
    registration: any;
    file: {
      id: string;
      url: string;
    };
  };
  variations?: string[];
  enhancedPrompt?: string;
}

interface AIGenerationResult {
  imageUrl: string;
  variations: string[];
  metadata: {
    style: string;
    prompt: string;
    enhancedPrompt: string;
  };
}

interface MemeStyle {
  name: string;
  description: string;
  icon: string;
}

const MEME_STYLES: MemeStyle[] = [
  {
    name: "Classic Meme",
    description: "Traditional viral-worthy memes that are relatable and funny",
    icon: "🎭"
  },
  {
    name: "Dank Meme",
    description: "Surreal, absurdist humor with deep-fried aesthetics",
    icon: "🌀"
  },
  {
    name: "Wholesome",
    description: "Heartwarming and positive memes that make people smile",
    icon: "💖"
  }
];

function CreateMeme() {
  const { login, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [acceptRoyalty, setAcceptRoyalty] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'manual' | 'ai'>('manual');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    socialLinks: '',
    networkId: '84532', // Default to Base Sepolia
    fileId: ''
  });
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<'Classic Meme' | 'Dank Meme' | 'Wholesome'>('Classic Meme');
  const [variations, setVariations] = useState<string[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<number>(0);
  const [ipRegistrationStatus, setIpRegistrationStatus] = useState<'pending' | 'success' | 'error' | null>(null);
  const [generationHistory, setGenerationHistory] = useState<AIGenerationResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string>('');
  const [isLoadingEnhancement, setIsLoadingEnhancement] = useState(false);
  const [submissionLogs, setSubmissionLogs] = useState<string[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const uploadToPinata = async (file: File): Promise<string> => {
    try {
      console.log('Starting upload to Pinata...');
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Log headers (without showing full credentials)
      console.log('Upload headers check:', {
        hasApiKey: !!PINATA_API_KEY,
        hasSecretKey: !!PINATA_SECRET_KEY,
        contentType: 'multipart/form-data'
      });

      // Upload to Pinata
      const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          'Content-Type': `multipart/form-data`,
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY
        }
      });

      // Return the IPFS hash
      const ipfsHash = `ipfs://${res.data.IpfsHash}`;
      console.log('Upload successful. IPFS Hash:', ipfsHash);
      return ipfsHash;
    } catch (error: any) {
      console.error('Detailed upload error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new Error(`Failed to upload image to IPFS: ${error.response?.data?.message || error.message}`);
    }
  };

  const switchToBaseSepolia = async (provider: any) => {
    try {
      // Try switching to Base Sepolia
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_SEPOLIA_PARAMS.chainId }],
      });
    } catch (switchError: any) {
      // If the chain hasn't been added to MetaMask, add it
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

  const generateAIMeme = async () => {
    if (!aiPrompt) return;
    
    try {
      setIsGeneratingAI(true);
      setIsLoadingEnhancement(true);
      
      // Generate meme with variations using autonomous agent
      const response = await fetch(API_ENDPOINTS.CREATE_MEME, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          style: selectedStyle,
          generateVariations: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || 
          errorData?.details || 
          `Server error: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate meme');
      }

      const { meme } = data.data;
      
      // Update form with generated content
      setFormData(prev => ({
        ...prev,
        title: meme.title || aiPrompt,
        description: meme.description || `AI-generated meme: ${aiPrompt}`,
        socialLinks: '',
        fileId: meme.id // Store the Fileverse file ID
      }));

      // Set image preview - prefer base64 data over URL
      console.log('Setting image preview...');
      if (meme.imageData) {
        console.log('Using base64 image data');
        setImagePreview(meme.imageData);
      } else if (meme.imageUrl) {
        console.log('Using image URL:', meme.imageUrl);
        setImagePreview(meme.imageUrl);
      }
      
      // For debugging - log if image loads successfully
      const img = new Image();
      img.onload = () => console.log('Image loaded successfully');
      img.onerror = (e) => console.error('Error loading image:', e);
      img.src = meme.imageUrl;

      setVariations([]); // Clear variations for now
      setEnhancedPrompt(meme.metadata.prompt || aiPrompt);
      
      // Add to generation history
      setGenerationHistory(prev => [{
        imageUrl: meme.imageUrl,
        variations: [],
        metadata: {
          style: selectedStyle,
          prompt: aiPrompt,
          enhancedPrompt: meme.metadata.prompt || aiPrompt
        }
      }, ...prev]);

    } catch (error: any) {
      console.error('Error generating AI meme:', error);
      alert(error.message || 'Failed to generate AI meme. Please try again.');
    } finally {
      setIsGeneratingAI(false);
      setIsLoadingEnhancement(false);
    }
  };

  const addLog = (message: string) => {
    setSubmissionLogs(prev => [...prev, message]);
  };

  const submitMeme = async () => {
    if (!authenticated || !wallets?.[0]) {
      alert('Please connect your wallet first');
      return;
    }

    if (!formData.fileId && !imageFile) {
      alert('Please generate or upload a meme first');
      return;
    }

    try {
      setIsUploading(true);
      setIpRegistrationStatus('pending');
      setSubmissionLogs([]); // Clear previous logs
      
      const wallet = wallets[0];
      const userAddress = wallet.address;

      // If we have a manual upload, store it in Fileverse first
      let fileId = formData.fileId;
      if (!fileId && imageFile) {
        addLog('📤 Uploading image to Fileverse...');
        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadResponse = await fetch(API_ENDPOINTS.UPLOAD_FILE, {
          method: 'POST',
          body: formData
        });
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }
        const uploadData = await uploadResponse.json();
        fileId = uploadData.fileId;
        addLog('✅ Image uploaded successfully!');
      }
      
      const submitData = {
        userAddress,
        title: formData.title,
        description: formData.description,
        socialLinks: formData.socialLinks,
        networkId: formData.networkId,
        fileId,
        registerIP: true,
        metadata: {
          aiGenerated: uploadMethod === 'ai',
          style: selectedStyle,
          prompt: aiPrompt,
          tags: formData.title.toLowerCase().split(' ')
        }
      };

      addLog('🔄 Preparing Story Protocol registration...');
      console.log('Submission data:', submitData);

      // Submit meme with Story Protocol registration
      const response = await fetch(API_ENDPOINTS.SUBMIT_MEME, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || 
          errorData?.details || 
          `Server error: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit meme');
      }

      console.log('Meme submitted successfully:', data);
      
      // Handle pending registration status
      if (data.meme?.registration?.status === 'pending') {
        addLog('📝 Transaction submitted to blockchain!');
        addLog(`🔗 Transaction Hash: ${data.meme.registration.txHash}`);
        addLog('⏳ Waiting for blockchain confirmation (this may take 3-5 minutes)...');
        addLog(`🔍 Track progress: https://sepolia.basescan.org/tx/${data.meme.registration.txHash}`);
        if (data.meme.registration.message) {
          addLog(data.meme.registration.message);
        }
        setIpRegistrationStatus('pending');
      } else if (data.meme?.registration?.ipId) {
        addLog('🎉 Registration successful!');
        addLog(`📋 IP ID: ${data.meme.registration.ipId}`);
        addLog(`🔍 View on Story Protocol Explorer: https://explorer.story.foundation/ipa/${data.meme.registration.ipId}`);
        setIpRegistrationStatus('success');
      }
      
      setSubmissionSuccess(true);

      // Clear form
      setFormData({
        title: '',
        description: '',
        socialLinks: '',
        networkId: '84532',
        fileId: ''
      });
      setImageFile(null);
      setImagePreview(null);
      setAiPrompt('');
      setVariations([]);
      setEnhancedPrompt('');

    } catch (error: any) {
      console.error('Detailed error:', error);
      setIpRegistrationStatus('error');
      addLog('❌ Error: ' + error.message);
      
      // Provide more specific error messages
      if (error.message?.includes('Timed out')) {
        addLog('⏳ Transaction submitted but confirmation is taking longer than expected.');
        addLog('ℹ️ The registration should complete in a few minutes.');
        addLog('🔄 You can check back later to see the final status.');
        if (error.hash) {
          addLog(`🔍 Track progress: https://sepolia.basescan.org/tx/${error.hash}`);
        }
      }
      alert('Error submitting meme: ' + (error.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => {
    if (!authenticated) {
      login();
    } else {
      setStep(prev => prev === 3 ? 3 : (prev + 1) as 1 | 2 | 3);
    }
  };

  const handlePrevious = () => {
    setStep(prev => prev === 1 ? 1 : (prev - 1) as 1 | 2 | 3);
  };

  const renderVariations = () => {
    if (!variations.length) return null;

    return (
      <div className="mt-6">
        <h3 className="text-white text-lg font-medium mb-4">Style Variations</h3>
        <div className="grid grid-cols-3 gap-4">
          {variations.map((variation, index) => (
            <div
              key={index}
              className={`relative cursor-pointer rounded-lg overflow-hidden ${
                selectedVariation === index ? 'ring-2 ring-[#FFD700]' : ''
              }`}
              onClick={() => {
                setSelectedVariation(index);
                setImagePreview(variation);
              }}
            >
              <img
                src={variation}
                alt={`Variation ${index + 1}`}
                className="w-full h-40 object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-sm py-1 px-2">
                Style {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderIPRegistrationStatus = () => {
    if (!ipRegistrationStatus) return null;

    const statusConfig = {
      pending: {
        text: 'Registering IP on Story Protocol...',
        icon: 'loading'
      },
      success: {
        text: 'IP successfully registered!',
        icon: 'check'
      },
      error: {
        text: 'Failed to register IP',
        icon: 'error'
      }
    };

    const config = statusConfig[ipRegistrationStatus];

    return (
      <div className={`flex items-center gap-2 mt-4 ${
        ipRegistrationStatus === 'error' ? 'text-red-500' : 'text-[#FFD700]'
      }`}>
        {config.icon === 'loading' && (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {config.icon === 'check' && (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        {config.icon === 'error' && (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}
        <span className="text-sm font-medium">{config.text}</span>
      </div>
    );
  };

  const renderStyleSelection = () => (
    <div className="space-y-4">
      <label className="text-white/60 text-sm font-['Poppins']">Select Meme Style</label>
      <div className="grid grid-cols-1 gap-3">
        {MEME_STYLES.map((style) => (
          <button
            key={style.name}
            onClick={() => setSelectedStyle(style.name as any)}
            className={`flex items-center p-4 rounded-xl transition-all ${
              selectedStyle === style.name
                ? 'bg-[#FFD700] text-[#121212]'
                : 'bg-[#1A1A1A] text-white/60 hover:bg-[#1A1A1A]/80 hover:text-white'
            }`}
          >
            <span className="text-2xl mr-3">{style.icon}</span>
            <div className="text-left">
              <div className="font-medium">{style.name}</div>
              <div className="text-sm opacity-80">{style.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderGenerationHistory = () => {
    if (!showHistory || generationHistory.length === 0) return null;

    return (
      <div className="mt-6 p-4 bg-[#1A1A1A] rounded-xl">
        <h3 className="text-white text-lg font-medium mb-4">Generation History</h3>
        <div className="space-y-4">
          {generationHistory.map((result, index) => (
            <div key={index} className="p-4 bg-black/20 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[#FFD700]">{result.metadata.style}</span>
                  <p className="text-white/60 text-sm mt-1">{result.metadata.prompt}</p>
                  <p className="text-white/40 text-xs mt-1">Enhanced: {result.metadata.enhancedPrompt}</p>
                </div>
                <button
                  onClick={() => {
                    setImagePreview(result.imageUrl);
                    setSelectedVariation(0);
                  }}
                  className="px-3 py-1 bg-[#FFD700]/10 text-[#FFD700] rounded-full text-sm hover:bg-[#FFD700]/20"
                >
                  Use
                </button>
              </div>
              <img
                src={result.imageUrl}
                alt={`Generation ${index + 1}`}
                className="w-full h-40 object-cover rounded-lg"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSubmissionLogs = () => (
    <div className="mt-8 text-left max-w-lg mx-auto">
      <div className="bg-[#1A1A1A] rounded-xl p-4 font-mono text-sm">
        {submissionLogs.map((log, index) => (
          <div key={index} className="text-white/80">
            {log}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAIGenerationForm = () => (
    <div className="space-y-6">
      <div className="relative">
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Describe your meme idea..."
          className="w-full h-32 px-6 py-4 bg-[#1A1A1A] text-white placeholder-white/40 rounded-2xl border border-[#FFD700]/20 focus:border-[#FFD700] focus:outline-none font-['Poppins']"
        />
        {enhancedPrompt && (
          <div className="mt-2 p-3 bg-[#1A1A1A]/50 rounded-xl">
            <span className="text-[#FFD700] text-sm">Enhanced Prompt:</span>
            <p className="text-white/80 text-sm mt-1">{enhancedPrompt}</p>
          </div>
        )}
      </div>

      {renderStyleSelection()}

      <div className="flex gap-4">
        <button
          onClick={generateAIMeme}
          disabled={!aiPrompt || isGeneratingAI}
          className={`flex-1 px-6 py-3 rounded-full font-['Poppins'] font-medium transition-all ${
            !aiPrompt || isGeneratingAI 
              ? 'bg-[#1A1A1A]/50 text-white/60' 
              : 'bg-[#FFD700] text-[#121212] hover:bg-[#FFD700]/90'
          }`}
        >
          {isGeneratingAI ? (
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>generating...</span>
            </div>
          ) : (
            <span>generate meme</span>
          )}
        </button>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="px-4 py-3 bg-[#1A1A1A] text-white/60 rounded-full font-['Poppins'] hover:text-white transition-all"
        >
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
      </div>

      {renderGenerationHistory()}
    </div>
  );

  return (
    <div className="relative min-h-screen">
      {/* Background gradient */}
      <div className="absolute" />

        {/* Accent gradient div */}
        <div className="relative w-full h-[300px] rounded-t-full overflow-hidden mt-22">
          <div className="absolute inset-0 bg-gradient-to-b from-[#010EFB] to-[#121212] opacity-20" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h1 className="text-[64px] font-bold text-white mb-2 font-['Poppins'] text-center">
              Create Your Meme
            </h1>
            <p className="text-white/60 text-lg font-['Poppins'] text-center">
              When your meme completes its bonding curve you receive XYZ
            </p>
          </div>
        </div>
      
      <div className="relative max-w-3xl mx-auto px-4 py-16">

        {/* Progress Steps */}
        <div className="flex items-stretch w-full mb-12 bg-[#0A1D0A] rounded-full overflow-hidden h-12">
          <div className={`flex-1 flex items-center gap-3 px-6 ${
            step === 1 ? 'bg-[#143114]' : ''
          }`}>
            {step === 1 && (
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span className={`text-base font-medium font-['Poppins'] ${
              step === 1 ? 'text-white' : 'text-white/60'
            }`}>1. meme</span>
          </div>

          <div className={`flex-1 flex items-center gap-3 px-6 ${
            step === 2 ? 'bg-[#143114]' : ''
          }`}>
            {step === 2 && (
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span className={`text-base font-medium font-['Poppins'] ${
              step === 2 ? 'text-white' : 'text-white/60'
            }`}>{authenticated ? '2. submit meme' : '2. connect wallet'}</span>
          </div>

          <div className={`flex-1 flex items-center gap-3 px-6 ${
            step === 3 ? 'bg-[#143114]' : ''
          }`}>
            {step === 3 && (
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span className={`text-base font-medium font-['Poppins'] ${
              step === 3 ? 'text-white' : 'text-white/60'
            }`}>3. AI Marketing</span>
          </div>
        </div>

        {/* Upload Method Selection */}
        <div className="flex gap-2 mb-8 bg-[#1A1A1A] p-1 rounded-full max-w-md mx-auto">
          <button
            onClick={() => setUploadMethod('ai')}
            className={`flex-1 px-6 py-2.5 rounded-full font-['Poppins'] font-medium transition-all ${
              uploadMethod === 'ai' 
                ? 'bg-[#FFD700] text-[#121212]' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            generate with ai
          </button>
          <button
            onClick={() => setUploadMethod('manual')}
            className={`flex-1 px-6 py-2.5 rounded-full font-['Poppins'] font-medium transition-all ${
              uploadMethod === 'manual' 
                ? 'bg-[#1A1A1A] text-[#FFD700] border border-[#FFD700]' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            upload your meme
          </button>
        </div>

        <p className="text-white/60 text-center text-sm mb-8 font-['Poppins']">
          You can either generate your memes with our AI superpowers or<br />
          upload your own meme that you created before
        </p>

        {/* Main Form Section */}
        {step === 1 && (
          <div className="flex gap-8">
            {/* Left Column - Upload/Preview */}
            <div className="w-1/2 space-y-6">
              {uploadMethod === 'ai' ? (
                renderAIGenerationForm()
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="meme-upload"
                  />
                  <label
                    htmlFor="meme-upload"
                    className="block w-full aspect-square bg-[#1A1A1A] border-2 border-dashed border-[#FFD700]/20 rounded-2xl cursor-pointer hover:border-[#FFD700]/40 transition-colors"
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 mb-4 text-[#FFD700]/60">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <span className="text-white/60 font-['Poppins']">Click to upload your meme</span>
                    </div>
                  </label>
                </div>
              )}

              {imagePreview && (
                <div className="relative w-full aspect-square bg-[#1A1A1A] rounded-2xl overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Meme preview"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      console.error('Error loading image in component:', e);
                      const target = e.target as HTMLImageElement;
                      // Only try fallback if it's a URL (not base64)
                      if (target.src.includes('mypinata.cloud')) {
                        const ipfsHash = target.src.split('/ipfs/')[1];
                        target.src = `https://ipfs.io/ipfs/${ipfsHash}`;
                      }
                    }}
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-4 right-4 px-4 py-2 bg-[#121212]/80 backdrop-blur-sm text-white rounded-full font-['Poppins'] hover:bg-[#121212] transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}

              {variations.length > 0 && renderVariations()}
            </div>

            {/* Right Column - Form Fields */}
            <div className="w-1/2 space-y-4">
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="title of your meme"
                className="w-full px-6 py-4 bg-[#1A1A1A] text-white placeholder-white/40 rounded-full border border-[#FFD700]/20 focus:border-[#FFD700] focus:outline-none font-['Poppins']"
              />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="description of your meme"
                rows={4}
                className="w-full px-6 py-4 bg-[#1A1A1A] text-white placeholder-white/40 rounded-2xl border border-[#FFD700]/20 focus:border-[#FFD700] focus:outline-none font-['Poppins']"
              />

              <input
                type="text"
                name="socialLinks"
                value={formData.socialLinks}
                onChange={handleInputChange}
                placeholder="your social link (x.com)"
                className="w-full px-6 py-4 bg-[#1A1A1A] text-white placeholder-white/40 rounded-2xl border border-[#FFD700]/20 focus:border-[#FFD700] focus:outline-none font-['Poppins']"
              />

              <select
                name="networkId"
                value={formData.networkId}
                onChange={handleInputChange}
                className="w-full px-6 py-4 bg-[#1A1A1A] text-white/60 rounded-full border border-[#FFD700]/20 focus:border-[#FFD700] focus:outline-none font-['Poppins'] appearance-none"
              >
                <option value="84532">select network</option>
                <option value="84532">Base Sepolia</option>
              </select>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="royalty"
                    checked={acceptRoyalty}
                    onChange={(e) => setAcceptRoyalty(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    acceptRoyalty 
                      ? 'border-[#FFD700] bg-[#FFD700]' 
                      : 'border-[#FFD700]/20 bg-transparent'
                  }`}>
                    {acceptRoyalty && (
                      <div className="w-3 h-3 rounded-full bg-[#121212]" />
                    )}
                  </div>
                </div>
                <label htmlFor="royalty" className="text-white/60 font-['Poppins']">
                  I confirm that I accept the 3% royalty fee.
                </label>
              </div>

              <button
                onClick={authenticated ? handleNext : login}
                disabled={!acceptRoyalty || (!imageFile && !formData.fileId) || !formData.title}
                className={`w-full px-6 py-4 rounded-full font-['Poppins'] font-medium transition-all ${
                  !acceptRoyalty || (!imageFile && !formData.fileId) || !formData.title
                    ? 'bg-[#1A1A1A]/50 text-white/60'
                    : 'bg-[#FFD700] text-[#121212] hover:bg-[#FFD700]/90'
                }`}
              >
                {authenticated ? 'next: submit meme →' : 'connect wallet to continue →'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-16">
            {!authenticated ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-6 font-['Poppins']">Connect Your Wallet</h2>
                <p className="text-white/60 mb-8 font-['Poppins'] max-w-sm">
                  Connect your wallet to submit your meme to the blockchain
                </p>
                <button
                  onClick={login}
                  className="px-8 py-4 bg-[#FFD700] text-[#121212] rounded-full font-['Poppins'] font-medium hover:bg-[#FFD700]/90 transition-all"
                >
                  connect wallet
                </button>
              </div>
            ) : submissionSuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 mb-6">
                  <svg className="w-full h-full text-[#FFD700]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4 font-['Poppins']">Meme Submitted Successfully!</h2>
                <p className="text-white/60 mb-8 font-['Poppins'] max-w-sm">
                  Your meme has been successfully submitted to the blockchain.
                </p>
                <div className="flex gap-4">
                  <Link
                    to="/explore"
                    className="px-8 py-4 bg-[#FFD700] text-[#121212] rounded-full font-['Poppins'] font-medium hover:bg-[#FFD700]/90 transition-all"
                  >
                    discover memes →
                  </Link>
                  <Link
                    to="/"
                    className="px-8 py-4 bg-[#1A1A1A] text-white rounded-full font-['Poppins'] font-medium hover:bg-[#1A1A1A]/80 transition-all"
                  >
                    back to home
                  </Link>
                </div>
              </div>
            ) : isUploading ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6">
                  <svg className="animate-spin w-full h-full text-[#FFD700]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4 font-['Poppins']">Submitting Your Meme</h2>
                <p className="text-white/60 mb-4 font-['Poppins'] max-w-sm">
                  Please wait while we submit your meme to the blockchain...
                </p>
                {renderSubmissionLogs()}
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4 font-['Poppins']">Ready to Submit</h2>
                <p className="text-white/60 mb-8 font-['Poppins'] max-w-sm">
                  Your meme is ready to be submitted to the blockchain
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handlePrevious}
                    className="px-8 py-4 bg-[#1A1A1A] text-white rounded-full font-['Poppins'] font-medium hover:bg-[#1A1A1A]/80 transition-all"
                  >
                    ← previous
                  </button>
                  <button
                    onClick={submitMeme}
                    className="px-8 py-4 bg-[#FFD700] text-[#121212] rounded-full font-['Poppins'] font-medium hover:bg-[#FFD700]/90 transition-all"
                  >
                    submit meme
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 mb-6">
              <svg className="w-full h-full text-[#FFD700]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4 font-['Poppins']">AI Marketing Coming Soon</h2>
            <p className="text-white/60 mb-8 font-['Poppins'] max-w-sm">
              We're working on something magical to help promote your memes with AI. Stay tuned!
            </p>
            <button
              onClick={handlePrevious}
              className="px-8 py-4 bg-[#1A1A1A] text-white rounded-full font-['Poppins'] font-medium hover:bg-[#1A1A1A]/80 transition-all"
            >
              ← back to submission
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateMeme; 