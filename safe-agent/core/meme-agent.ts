import { ethers } from 'ethers';
import { type MemeContent } from './types';

export interface TrendData {
    topic: string;
    sentiment: string;
    viralScore: number;
    keywords: string[];
}

export interface ContestConfig {
    maxVotes: number;
    contestDuration: number;
    minVotesForWin: number;
    voteCost: bigint;
}

export interface Meme {
    id: number;
    creator: string;
    ipfsHash: string;
    title: string;
    description: string;
    socialLinks: string;
    networkId: number;
    voteCount: number;
    submissionTime: number;
    isActive: boolean;
    hasBeenMinted: boolean;
}

export class MemeAgent {
    private contestContract: ethers.Contract;
    private rankingContract: ethers.Contract;
    private signer: ethers.Wallet;

    constructor(
        provider: ethers.JsonRpcProvider,
        signer: ethers.Wallet
    ) {
        this.signer = signer;

        // Load contract ABIs
        const contestAbi = require('../../safe-agent/abi/ArtixMemeContest.json');
        const rankingAbi = require('../../safe-agent/abi/ArtifactRanking.json');

        // Initialize smart contracts
        this.contestContract = new ethers.Contract(
            process.env.CONTEST_CONTRACT_ADDRESS!,
            contestAbi,
            signer
        );

        this.rankingContract = new ethers.Contract(
            process.env.RANKING_NFT_CONTRACT_ADDRESS!,
            rankingAbi,
            signer
        );
    }

    async getContestConfig(): Promise<ContestConfig> {
        const config = await this.contestContract.votingConfiguration();
        return {
            maxVotes: Number(config.maxVotes),
            contestDuration: Number(config.contestDuration),
            minVotesForWin: Number(config.minVotesForWin),
            voteCost: config.voteCost
        };
    }

    async startContest(config: ContestConfig) {
        try {
            const tx = await this.contestContract.initialize(
                config.maxVotes,
                config.contestDuration,
                config.minVotesForWin,
                config.voteCost
            );
            await tx.wait();
            return tx.hash;
        } catch (error) {
            console.error('Failed to start contest:', error);
            throw error;
        }
    }

    async vote(memeId: string, voteCost: bigint) {
        try {
            const tx = await this.contestContract.voteMeme(memeId, { value: voteCost });
            await tx.wait();

            // Update ranking
            const voter = await this.signer.getAddress();
            const rankingTx = await this.rankingContract.updateRanking(voter, 1);
            await rankingTx.wait();

            return tx.hash;
        } catch (error) {
            console.error('Failed to vote:', error);
            throw error;
        }
    }

    async getWinningMemes(minVotes: number): Promise<Meme[]> {
        try {
            const memeCount = await this.contestContract.memeCount();
            const winners: Meme[] = [];

            for (let i = 0; i < memeCount; i++) {
                const meme = await this.contestContract.memes(i);
                if (meme.voteCount >= minVotes) {
                    winners.push({
                        id: i,
                        creator: meme.creator,
                        ipfsHash: meme.ipfsHash,
                        title: meme.title,
                        description: meme.description,
                        socialLinks: meme.socialLinks,
                        networkId: Number(meme.networkId),
                        voteCount: Number(meme.voteCount),
                        submissionTime: Number(meme.submissionTime),
                        isActive: meme.isActive,
                        hasBeenMinted: meme.hasBeenMinted
                    });
                    
                    // Update creator's ranking
                    const rankingTx = await this.rankingContract.updateRanking(
                        meme.creator,
                        meme.voteCount
                    );
                    await rankingTx.wait();
                }
            }

            return winners;
        } catch (error) {
            console.error('Failed to get winning memes:', error);
            throw error;
        }
    }

    async getUserRank(address: string) {
        try {
            const ranking = await this.rankingContract.userRankings(address);
            return {
                totalVotes: ranking.totalVotes.toString(),
                totalMemeSubmissions: ranking.totalMemeSubmissions.toString(),
                currentRank: ranking.currentRank,
                points: ranking.points.toString()
            };
        } catch (error) {
            console.error('Failed to get user rank:', error);
            throw error;
        }
    }

    async handleMemeCreation(trend: TrendData) {
        try {
            const memeContent = await this.generateMemeFromTrend(trend);
            
            // Submit to contest
            const tx = await this.contestContract.submitMeme(
                memeContent.title,
                memeContent.description,
                JSON.stringify({ twitter: '', discord: '' }), // social links
                1 // networkId for Base Sepolia
            );
            await tx.wait();

            return {
                meme: memeContent,
                txHash: tx.hash
            };
        } catch (error) {
            console.error('Failed in agent meme creation:', error);
            throw error;
        }
    }

    private async generateMemeFromTrend(trend: TrendData): Promise<MemeContent> {
        return {
            title: `${trend.topic} Meme`,
            description: `A meme about ${trend.topic} with sentiment: ${trend.sentiment}`,
            creator: await this.signer.getAddress(),
            imageUrl: 'generated_image_url',
            metadata: {
                tags: trend.keywords,
                category: this.determineMemeCategory(trend),
                aiGenerated: true
            }
        };
    }

    private determineMemeCategory(trend: TrendData): string {
        if (trend.viralScore > 8) return 'VIRAL';
        if (trend.sentiment === 'humor') return 'FUNNY';
        if (trend.sentiment === 'serious') return 'COMMENTARY';
        return 'GENERAL';
    }

    async handleDerivativeMeme(trend: TrendData, parentIpId: string, licenseTermsId: string) {
        try {
            const memeContent = await this.generateMemeFromTrend(trend);
            
            // Submit derivative to contest
            const tx = await this.contestContract.submitDerivativeMeme(
                memeContent.title,
                memeContent.description,
                parentIpId,
                licenseTermsId,
                JSON.stringify({ twitter: '', discord: '' }), // social links
                1 // networkId for Base Sepolia
            );
            await tx.wait();

            return {
                meme: memeContent,
                txHash: tx.hash
            };
        } catch (error) {
            console.error('Failed in agent derivative meme creation:', error);
            throw error;
        }
    }
} 