import { 
    StoryClient,
    type CreateNFTCollectionRequest,
    type SupportedChainIds,
    type StoryConfig
} from '@story-protocol/core-sdk';
import Safe from '@safe-global/protocol-kit';
import { zeroAddress, http } from 'viem';

export class MemeNFTManager {
    private client: StoryClient;
    private safe: Safe;

    constructor(safe: Safe) {
        this.safe = safe;
        
        // Create transport using viem
        const transport = http(process.env.RPC_URL!);
        
        // Initialize Story Protocol client
        const config: StoryConfig = {
            chainId: '11155111' as SupportedChainIds, // Sepolia testnet
            transport
        };
        
        this.client = StoryClient.newClient(config);
    }

    async createSpgCollection(name: string, symbol: string) {
        try {
            const request: CreateNFTCollectionRequest = {
                name,
                symbol,
                isPublicMinting: true,
                mintOpen: true,
                mintFeeRecipient: zeroAddress,
                contractURI: '',
                txOptions: { waitForTransaction: true }
            };

            const newCollection = await this.client.nftClient.createNFTCollection(request);

            console.log(`New SPG NFT collection created at transaction hash ${newCollection.txHash}`);
            console.log(`NFT contract address: ${newCollection.spgNftContract}`);

            return newCollection;
        } catch (error) {
            console.error('Failed to create SPG collection:', error);
            throw error;
        }
    }

    async getCollectionInfo(collectionAddress: string) {
        try {
            // Get collection info from NFT contract
            const collection = await this.client.nftClient.createNFTCollection({
                name: 'Artifacts',
                symbol: 'ARTI',
                isPublicMinting: true,
                mintOpen: true,
                mintFeeRecipient: zeroAddress,
                contractURI: '',
                txOptions: { waitForTransaction: true }
            });
            
            return collection;
        } catch (error) {
            console.error('Failed to get collection info:', error);
            throw error;
        }
    }
} 