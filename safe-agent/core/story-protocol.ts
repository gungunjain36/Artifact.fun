import { StoryClient, StoryConfig, IpMetadata, RegisterRequest, WIP_TOKEN_ADDRESS, type SupportedChainIds, aeneid } from '@story-protocol/core-sdk';
import { createHash } from 'crypto';
import { uploadJSONToIPFS, uploadFileToIPFS } from './upload-ipfs';
import { http, zeroAddress, createPublicClient, createWalletClient, type WalletClient } from 'viem';
import { privateKeyToAccount, Address } from 'viem/accounts';
import { defaultNftContractAbi } from './utils/defaultNftContractAbi';

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

export interface StoryTransaction {
    to: string;
    data: string;
    value?: string;
}

export class StoryProtocolService {
    private client: StoryClient;
    private account;
    private publicClient;
    private walletClient: WalletClient;

    constructor(privateKey: string) {
        try {
            console.log('Initializing Story Protocol Service...');
            
            // Ensure private key has 0x prefix and proper type
            const formattedKey = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`;
            
            // Initialize account exactly like utils.ts
            this.account = privateKeyToAccount(formattedKey);
            console.log('Account created:', this.account.address);

            // Initialize clients with aeneid chain - exactly like mintNFT.ts
            const baseConfig = {
                chain: aeneid,
                transport: http('https://aeneid.storyrpc.io'),
            } as const;

            this.publicClient = createPublicClient(baseConfig);
            this.walletClient = createWalletClient({
                ...baseConfig,
                account: this.account,
            }) as WalletClient;

            // Initialize Story Protocol client - exactly like utils.ts
            const config: StoryConfig = {
                chainId: 'aeneid',
                transport: http('https://aeneid.storyrpc.io'),
                wallet: this.walletClient
            };
            
            this.client = StoryClient.newClient(config);
            console.log('Story Protocol Service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Story Protocol Service:', error);
            throw error;
        }
    }

    async mintAndRegisterMeme(meme: MemeContent) {
        try {
            console.log('Starting meme registration with Story Protocol...');
            
            // 1. Generate IP metadata - exactly like simpleMintAndRegisterSpg.ts
            console.log('Generating IP metadata...');
            const ipMetadata: IpMetadata = this.client.ipAsset.generateIpMetadata({
                title: meme.title,
                description: meme.description,
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

            // 2. Set up NFT metadata - exactly like simpleMintAndRegisterSpg.ts
            console.log('Setting up NFT metadata...');
            
            // First upload the actual image to IPFS if it's a base64 or local URL
            let imageIpfsHash;
            if (meme.imageUrl.startsWith('data:') || meme.imageUrl.startsWith('http')) {
                // If it's base64 or http URL, fetch and upload to IPFS
                const response = await fetch(meme.imageUrl);
                const buffer = await response.arrayBuffer();
                imageIpfsHash = await uploadFileToIPFS(Buffer.from(buffer));
            } else {
                // If it's already an IPFS hash, use it directly
                imageIpfsHash = meme.imageUrl.replace('ipfs://', '').replace('https://ipfs.io/ipfs/', '');
            }

            const nftMetadata = {
                name: meme.title,
                description: meme.description,
                image: `ipfs://${imageIpfsHash}`
            };

            // 3. Upload metadata to IPFS
            console.log('Uploading metadata to IPFS...');
            const ipIpfsHash = await uploadJSONToIPFS(ipMetadata);
            const ipHash = createHash('sha256').update(JSON.stringify(ipMetadata)).digest('hex');
            console.log('IP Metadata IPFS hash:', ipIpfsHash);
            console.log('ipMetadataURI', `https://ipfs.io/ipfs/${ipIpfsHash}`);

            const nftIpfsHash = await uploadJSONToIPFS(nftMetadata);
            const nftHash = createHash('sha256').update(JSON.stringify(nftMetadata)).digest('hex');
            console.log('NFT Metadata IPFS hash:', nftIpfsHash);
            console.log('nftMetadataURI', `https://ipfs.io/ipfs/${nftIpfsHash}`);

            // 4. Register with Story Protocol - exactly like simpleMintAndRegisterSpg.ts
            console.log('Registering with Story Protocol...');
            const response = await this.client.ipAsset.mintAndRegisterIp({
                spgNftContract: "0xEbE7F3D750757c0f26432CA40e178c1d10A93fe2" as Address,
                allowDuplicates: true,
                ipMetadata: {
                    ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
                    ipMetadataHash: `0x${ipHash}` as `0x${string}`,
                    nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
                    nftMetadataHash: `0x${nftHash}` as `0x${string}`
                },
                txOptions: { waitForTransaction: true }
            });

            console.log('Registration successful!');
            console.log('Transaction hash:', response.txHash);
            console.log('IP ID:', response.ipId);
            console.log('View on explorer:', `https://aeneid.explorer.story.foundation/ipa/${response.ipId}`);
            
            return response;
        } catch (error: any) {
            console.error('Failed to mint and register IP:', error);
            console.error('Stack trace:', error.stack);
            throw new Error(`Failed to mint and register IP: ${error.message}`);
        }
    }

    async registerMemeAsDerivative(
        meme: MemeContent, 
        spgNftContract: string,
        parentIpId: string,
        licenseTermsId: string
    ) {
        try {
            // 1. Generate and upload metadata
            const ipMetadata = this.client.ipAsset.generateIpMetadata({
                title: meme.title,
                description: meme.description,
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

            const nftMetadata = {
                name: meme.title,
                description: meme.description,
                image: meme.imageUrl
            };

            const ipIpfsHash = await uploadJSONToIPFS(ipMetadata);
            const ipHash = createHash('sha256').update(JSON.stringify(ipMetadata)).digest('hex');
            const nftIpfsHash = await uploadJSONToIPFS(nftMetadata);
            const nftHash = createHash('sha256').update(JSON.stringify(nftMetadata)).digest('hex');

            // 2. Register derivative with Story Protocol
            const response = await this.client.ipAsset.mintAndRegisterIpAndMakeDerivative({
                spgNftContract: spgNftContract as Address,
                derivData: {
                    parentIpIds: [parentIpId as Address],
                    licenseTermsIds: [licenseTermsId],
                    maxMintingFee: BigInt(0),
                    maxRts: 100_000_000,
                    maxRevenueShare: 100
                },
                allowDuplicates: true,
                ipMetadata: {
                    ipMetadataURI: `ipfs://${ipIpfsHash}`,
                    ipMetadataHash: `0x${ipHash}` as `0x${string}`,
                    nftMetadataURI: `ipfs://${nftIpfsHash}`,
                    nftMetadataHash: `0x${nftHash}` as `0x${string}`
                },
                txOptions: { waitForTransaction: true }
            });

            return response;
        } catch (error) {
            console.error('Failed to register derivative meme:', error);
            throw error;
        }
    }

    async payRoyalty(receiverIpId: string, amount: number) {
        try {
            return await this.client.royalty.payRoyaltyOnBehalf({
                receiverIpId: receiverIpId as Address,
                payerIpId: zeroAddress,
                token: WIP_TOKEN_ADDRESS,
                amount,
                txOptions: { waitForTransaction: true }
            });
        } catch (error) {
            console.error('Failed to pay royalty:', error);
            throw error;
        }
    }

    async claimRevenue(ipId: string) {
        try {
            return await this.client.royalty.claimAllRevenue({
                ancestorIpId: ipId as Address,
                claimer: ipId as Address,
                currencyTokens: [WIP_TOKEN_ADDRESS],
                childIpIds: [],
                royaltyPolicies: [],
                claimOptions: {
                    autoTransferAllClaimedTokensFromIp: true,
                    autoUnwrapIpTokens: true
                }
            });
        } catch (error) {
            console.error('Failed to claim revenue:', error);
            throw error;
        }
    }
}