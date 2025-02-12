import { 
    StoryClient,
    IpMetadata,
    WIP_TOKEN_ADDRESS,
    type RegisterRequest,
    type SupportedChainIds,
    type StoryConfig,
    aeneid
} from '@story-protocol/core-sdk';
import Safe from '@safe-global/protocol-kit';
import { Address, zeroAddress, createPublicClient, http } from 'viem';
import { createHash } from 'crypto';
import { uploadJSONToIPFS } from './upload-ipfs';
import { NETWORK } from './constants';

// Types for our meme content
export interface MemeContent {
    title: string;
    description: string;
    creator: string;
    imageUrl: string;
    metadata: {
        tags: string[];
        category: string;
        aiGenerated: boolean;
    };
}

export class StoryProtocolService {
    private client: StoryClient;
    private safe: Safe;

    constructor(safe: Safe) {
        this.safe = safe;
        
        // Create transport using viem
        const transport = http(process.env.RPC_URL!);
        
        // Initialize Story Protocol client with explicit chain ID
        const config: StoryConfig = {
            chainId: 'aeneid' as SupportedChainIds, // Sepolia testnet with proper type casting
            transport
        };
        
        this.client = StoryClient.newClient(config);
    }

    async generateMetadata(meme: MemeContent) {
        // Generate IP metadata using Story Protocol's helper
        const ipMetadata = this.client.ipAsset.generateIpMetadata({
            title: meme.title,
            description: meme.description,
            watermarkImg: meme.imageUrl,
            attributes: [
                {
                    key: 'Category',
                    value: meme.metadata.category
                },
                {
                    key: 'AI Generated',
                    value: String(meme.metadata.aiGenerated)
                },
                ...meme.metadata.tags.map(tag => ({
                    key: 'Tag',
                    value: tag
                }))
            ]
        });

        // NFT metadata follows ERC-721 standard
        const nftMetadata = {
            name: meme.title,
            description: meme.description,
            image: meme.imageUrl
        };

        // Upload to IPFS and generate hashes
        const ipIpfsHash = await uploadJSONToIPFS(ipMetadata);
        const ipHash = createHash('sha256').update(JSON.stringify(ipMetadata)).digest('hex');
        const nftIpfsHash = await uploadJSONToIPFS(nftMetadata);
        const nftHash = createHash('sha256').update(JSON.stringify(nftMetadata)).digest('hex');

        return {
            ipMetadata,
            nftMetadata,
            ipIpfsHash,
            nftIpfsHash,
            ipHash: `0x${ipHash}` as `0x${string}`,
            nftHash: `0x${nftHash}` as `0x${string}`
        };
    }

    async mintAndRegisterMeme(meme: MemeContent, spgNftContract: string) {
        try {
            const { ipIpfsHash, nftIpfsHash, ipHash, nftHash } = await this.generateMetadata(meme);

            const response = await this.client.ipAsset.mintAndRegisterIp({
                spgNftContract: spgNftContract as Address,
                allowDuplicates: true,
                ipMetadata: {
                    ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
                    ipMetadataHash: ipHash,
                    nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
                    nftMetadataHash: nftHash
                },
                txOptions: { waitForTransaction: true }
            });

            console.log(`Root IPA created at transaction hash ${response.txHash}, IPA ID: ${response.ipId}`);
            console.log(`View on the explorer: https://explorer.story.foundation/ipa/${response.ipId}`);
            return response;
        } catch (error) {
            console.error('Failed to mint and register meme:', error);
            throw error;
        }
    }

    async registerMemeAsDerivative(meme: MemeContent, spgNftContract: string, parentIpId: string, licenseTermsId: string) {
        try {
            const { ipIpfsHash, nftIpfsHash, ipHash, nftHash } = await this.generateMetadata(meme);

            const response = await this.client.ipAsset.mintAndRegisterIpAndMakeDerivative({
                spgNftContract: spgNftContract as Address,
                derivData: {
                    parentIpIds: [parentIpId],
                    licenseTermsIds: [licenseTermsId],
                    maxMintingFee: BigInt(0), // disabled
                    maxRts: 100_000_000, // default
                    maxRevenueShare: 100 // default
                },
                allowDuplicates: true,
                ipMetadata: {
                    ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
                    ipMetadataHash: ipHash,
                    nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
                    nftMetadataHash: nftHash
                },
                txOptions: { waitForTransaction: true }
            });

            console.log(`Derivative IPA created at transaction hash ${response.txHash}, IPA ID: ${response.ipId}`);
            return response;
        } catch (error) {
            console.error('Failed to register derivative meme:', error);
            throw error;
        }
    }

    async payRoyalty(receiverIpId: string, amount: number) {
        try {
            const payRoyalty = await this.client.royalty.payRoyaltyOnBehalf({
                receiverIpId,
                payerIpId: zeroAddress,
                token: WIP_TOKEN_ADDRESS,
                amount,
                txOptions: { waitForTransaction: true }
            });

            console.log(`Paid royalty at transaction hash ${payRoyalty.txHash}`);
            return payRoyalty;
        } catch (error) {
            console.error('Failed to pay royalty:', error);
            throw error;
        }
    }

    async claimRevenue(ipId: string) {
        try {
            const claimRevenue = await this.client.royalty.claimAllRevenue({
                ancestorIpId: ipId,
                claimer: ipId,
                currencyTokens: [WIP_TOKEN_ADDRESS],
                childIpIds: [],
                royaltyPolicies: [],
                claimOptions: {
                    autoTransferAllClaimedTokensFromIp: true,
                    autoUnwrapIpTokens: true
                }
            });

            console.log(`Claimed revenue: ${claimRevenue.claimedTokens}`);
            return claimRevenue;
        } catch (error) {
            console.error('Failed to claim revenue:', error);
            throw error;
        }
    }
} 