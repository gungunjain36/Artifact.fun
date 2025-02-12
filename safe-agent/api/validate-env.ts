export function validateEnvironment() {
    const requiredVars = [
        'CHAIN_ID',
        'RPC_URL',
        'STORY_PROTOCOL_API_KEY',
        'SIGNER_ADDRESS',
        'SIGNER_PRIVATE_KEY',
        'SAFE_ADDRESS',
        'AGENT_ADDRESS',
        'AGENT_PRIVATE_KEY',
        'CHAIN',
        'PRIVATE_KEY',
        'PINATA_JWT',
        'PINATA_GATEWAY',
        'PIMLICO_API_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate private keys
    const privateKeys = ['SIGNER_PRIVATE_KEY', 'AGENT_PRIVATE_KEY', 'PRIVATE_KEY'];
    privateKeys.forEach(key => {
        const value = process.env[key];
        if (!value?.startsWith('0x')) {
            throw new Error(`${key} must start with 0x`);
        }
    });

    // Validate addresses
    const addresses = ['SIGNER_ADDRESS', 'SAFE_ADDRESS', 'AGENT_ADDRESS'];
    addresses.forEach(key => {
        const value = process.env[key];
        if (!value?.startsWith('0x')) {
            throw new Error(`${key} must be a valid Ethereum address starting with 0x`);
        }
    });

    console.log('Environment variables validated successfully');
} 