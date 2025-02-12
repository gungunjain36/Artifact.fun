import { StoryProtocolService } from './story-protocol';
import { MemeNFTManager } from './nft-manager';
import { MemeContent } from './story-protocol';
import { Address } from 'viem';

export class MemeCreationFlow {
    private storyService: StoryProtocolService;
    private nftManager: MemeNFTManager;
    private spgNftContract: Address | null = null;

    constructor(storyService: StoryProtocolService, nftManager: MemeNFTManager) {
        this.storyService = storyService;
        this.nftManager = nftManager;
    }

    async initializeCollection() {
        try {
            // Create a new SPG collection if we don't have one
            if (!this.spgNftContract) {
                const collection = await this.nftManager.createSpgCollection('Artifacts', 'ARTI');
                this.spgNftContract = collection.spgNftContract as Address;
                console.log('Created new SPG collection:', this.spgNftContract);
            }
            return this.spgNftContract;
        } catch (error) {
            console.error('Failed to initialize collection:', error);
            throw error;
        }
    }

    async createMeme(meme: MemeContent) {
        try {
            // Ensure we have a collection
            const spgNftContract = await this.initializeCollection();

            // Register the meme as an IP Asset
            const registration = await this.storyService.mintAndRegisterMeme(meme, spgNftContract);
            console.log('Meme registered with ID:', registration.ipId);

            return registration;
        } catch (error) {
            console.error('Failed to create meme:', error);
            throw error;
        }
    }

    async createDerivativeMeme(meme: MemeContent, parentIpId: string, licenseTermsId: string) {
        try {
            // Ensure we have a collection
            const spgNftContract = await this.initializeCollection();

            // Register the derivative meme
            const registration = await this.storyService.registerMemeAsDerivative(
                meme,
                spgNftContract,
                parentIpId,
                licenseTermsId
            );
            console.log('Derivative meme registered with ID:', registration.ipId);

            return registration;
        } catch (error) {
            console.error('Failed to create derivative meme:', error);
            throw error;
        }
    }

    async payRoyalties(memeId: string, amount: number) {
        try {
            const payment = await this.storyService.payRoyalty(memeId, amount);
            console.log('Royalty payment successful:', payment.txHash);
            return payment;
        } catch (error) {
            console.error('Failed to pay royalties:', error);
            throw error;
        }
    }

    async claimRoyalties(memeId: string) {
        try {
            const claim = await this.storyService.claimRevenue(memeId);
            console.log('Revenue claimed:', claim.claimedTokens);
            return claim;
        } catch (error) {
            console.error('Failed to claim royalties:', error);
            throw error;
        }
    }
} 