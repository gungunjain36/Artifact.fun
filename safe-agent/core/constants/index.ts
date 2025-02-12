// Network Configuration
export const NETWORK = {
    CHAIN_ID: Number(process.env.CHAIN_ID || '11155111'),
    RPC_URL: process.env.RPC_URL || 'https://rpc.ankr.com/eth_sepolia',
    CHAIN: process.env.CHAIN || 'sepolia'
};

// Story Protocol Configuration
export const STORY_PROTOCOL = {
    NETWORK: process.env.STORY_PROTOCOL_NETWORK || 'sepolia',
    API_KEY: process.env.STORY_PROTOCOL_API_KEY
};

// Safe Configuration
export const SAFE = {
    SIGNER_ADDRESS: process.env.SIGNER_ADDRESS,
    SIGNER_PRIVATE_KEY: process.env.SIGNER_PRIVATE_KEY,
    SAFE_ADDRESS: process.env.SAFE_ADDRESS
};

// Fileverse Configuration
export const FILEVERSE = {
    CHAIN: process.env.CHAIN || 'sepolia',
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    PINATA_JWT: process.env.PINATA_JWT,
    PINATA_GATEWAY: process.env.PINATA_GATEWAY,
    PIMLICO_API_KEY: process.env.PIMLICO_API_KEY,
    NAMESPACE: 'artifact-fun'
};

// Agent Configuration
export const AGENT = {
    ADDRESS: process.env.AGENT_ADDRESS
};

// IPFS Configuration
export const IPFS = {
    GATEWAY: 'https://ipfs.io/ipfs/'
}; 