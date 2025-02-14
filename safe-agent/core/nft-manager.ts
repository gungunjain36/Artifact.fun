import { 
    StoryClient,
    type SupportedChainIds,
    type StoryConfig,
    type MintAndRegisterIpRequest,
    type RegisterRequest,
    type CreateNFTCollectionRequest,
    aeneid
} from '@story-protocol/core-sdk';
import Safe from '@safe-global/protocol-kit';
import { zeroAddress, http, createWalletClient, createPublicClient, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { AGENT, NETWORK } from './constants';
import { sepolia } from "viem/chains";
import { config } from "dotenv";

// ArtifactNFT contract ABI
const ARTIFACT_NFT_ABI = parseAbi([
    'function mintMemeNFT(address creator, string tokenURI, uint8 network) returns (uint256)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function tokenURI(uint256 tokenId) view returns (string)'
]);

export class MemeNFTManager {
    private client: StoryClient;
    private safe: Safe;
    private spgNftContract: string | null = null;
    private artifactNFTAddress: string;

    constructor(safe: Safe) {
        this.safe = safe;
        
        config();
        if (!process.env.ARTIFACT_NFT_ADDRESS) {
            throw new Error('ARTIFACT_NFT_ADDRESS must be provided');
        }
        this.artifactNFTAddress = process.env.ARTIFACT_NFT_ADDRESS;
        const transport = http(process.env.RPC_URL || "");
        const publicClient = createPublicClient({
            chain: sepolia,
            transport,
        });

        if (!process.env.AGENT_PRIVATE_KEY) {
            throw new Error('AGENT_PRIVATE_KEY must be provided');
        }

        // Create wallet client
        const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
        const wallet = createWalletClient({
            account,
            transport,
            chain: aeneid
        });
        
        // Initialize Story Protocol client
        const storyConfig: StoryConfig = {
            chainId: "aeneid" as SupportedChainIds,
            transport: transport,
            wallet: wallet
        };
        
        this.client = StoryClient.newClient(storyConfig);
    }

    async deployNFTContract(name: string, symbol: string) {
        try {
            console.log('Using existing ArtifactNFT contract at:', this.artifactNFTAddress);
            this.spgNftContract = this.artifactNFTAddress;
            return { spgNftContract: this.artifactNFTAddress };
        } catch (error) {
            console.error('Failed to deploy NFT contract:', error);
            throw error;
        }
    }

    async createSpgCollection(name: string, symbol: string) {
        try {
            // First ensure we have a deployed NFT contract
            if (!this.spgNftContract) {
                const deployment = await this.deployNFTContract(name, symbol);
                if (!deployment.spgNftContract) {
                    throw new Error('Failed to get NFT contract address');
                }
                this.spgNftContract = deployment.spgNftContract;
            }

            // Now mint and register the IP
            const request: MintAndRegisterIpRequest = {
                spgNftContract: this.spgNftContract as `0x${string}`,
                allowDuplicates: true,
                ipMetadata: {
                    ipMetadataURI: `ipfs://QmTest/${name}`,
                    ipMetadataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
                    nftMetadataURI: `ipfs://QmTest/${symbol}`,
                    nftMetadataHash: '0x0000000000000000000000000000000000000000000000000000000000000000'
                },
                txOptions: { waitForTransaction: true }
            };

            const registration = await this.client.ipAsset.mintAndRegisterIp(request);
            console.log(`Root IPA created at transaction hash ${registration.txHash}, IPA ID: ${registration.ipId}`);
            console.log(`View on the explorer: https://explorer.story.foundation/ipa/${registration.ipId}`);

            return registration;
        } catch (error) {
            console.error('Failed to create SPG collection:', error);
            throw error;
        }
    }

    async getCollectionInfo(ipId: string) {
        try {
            if (!this.spgNftContract) {
                throw new Error('No SPG NFT contract address available');
            }

            // Register request to get IP info
            const request: RegisterRequest = {
                nftContract: this.spgNftContract as `0x${string}`,
                tokenId: ipId,
                deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                txOptions: { waitForTransaction: true }
            };
            
            const ipAsset = await this.client.ipAsset.register(request);
            return ipAsset;
        } catch (error) {
            console.error('Failed to get collection info:', error);
            throw error;
        }
    }
} 