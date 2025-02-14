export function validateEnvironment() {
    const requiredVars = [
        // Network Configuration
        'CHAIN_ID',
        'RPC_URL',
        'CHAIN',

        // Story Protocol Configuration
        'STORY_PROTOCOL_NETWORK',
        'STORY_PROTOCOL_API_KEY',
        // 'SPG_NFT_CONTRACT_ADDRESS',

        // Safe Configuration
        'SIGNER_ADDRESS',
        'SIGNER_PRIVATE_KEY',
        'SAFE_ADDRESS',

        // Agent Configuration
        'AGENT_ADDRESS',
        'AGENT_PRIVATE_KEY',

        // Fileverse Configuration
        'PINATA_JWT',
        'PINATA_API_KEY',
        'PINATA_API_KEY_SECRET',
        'PINATA_GATEWAY',

        // Pimlico Configuration
        'PIMLICO_API_KEY',

        // Venice AI Configuration
        'VENICE_API_KEY',

        // Contract Addresses
        'CONTEST_CONTRACT_ADDRESS',
        'RANKING_NFT_CONTRACT_ADDRESS',
        'MEME_NFT_CONTRACT_ADDRESS',

        // Contest Configuration
        'MAX_VOTES_PER_USER',
        'CONTEST_DURATION_DAYS',
        'MIN_VOTES_FOR_WIN',
        'VOTE_COST_WEI'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate private keys
    const privateKeys = ['SIGNER_PRIVATE_KEY', 'AGENT_PRIVATE_KEY'];
    privateKeys.forEach(key => {
        const value = process.env[key];
        if (!value?.startsWith('0x')) {
            throw new Error(`${key} must start with 0x`);
        }
    });

    // Validate addresses
    const addresses = [
        'SIGNER_ADDRESS',
        'SAFE_ADDRESS',
        'AGENT_ADDRESS',
        // 'SPG_NFT_CONTRACT_ADDRESS',
        'CONTEST_CONTRACT_ADDRESS',
        'RANKING_NFT_CONTRACT_ADDRESS',
        'MEME_NFT_CONTRACT_ADDRESS'
    ];
    addresses.forEach(key => {
        const value = process.env[key];
        if (!value?.startsWith('0x')) {
            throw new Error(`${key} must be a valid Ethereum address starting with 0x`);
        }
    });

    // Validate numeric values
    const numericValues = [
        'MAX_VOTES_PER_USER',
        'CONTEST_DURATION_DAYS',
        'MIN_VOTES_FOR_WIN',
        'VOTE_COST_WEI'
    ];
    numericValues.forEach(key => {
        const value = process.env[key];
        if (isNaN(Number(value))) {
            throw new Error(`${key} must be a valid number`);
        }
    });

    console.log('Environment variables validated successfully');
} 