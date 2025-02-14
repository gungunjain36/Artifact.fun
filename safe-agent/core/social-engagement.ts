import { v4 as uuidv4 } from 'uuid';

export interface Message {
    id: string;
    text: string;
    media?: { url: string }[];
    timestamp: number;
}

export class SocialEngagementService {
    private messages: Message[] = [];

    constructor(
        private readonly privateKey: string,
        private readonly pimlicoAPIKey: string
    ) {}

    async promoteMemeOnTwitter(memeId: string, imageUrl: string, description: string) {
        try {
            const message = this.createMessage(
                `${description}\n\nView on Story Protocol: https://explorer.story.foundation/ipa/${memeId}`,
                [{ url: imageUrl }]
            );
            this.messages.push(message);
            console.log('Social Post:', message.text);
            console.log('Media:', message.media);
            return message;
        } catch (error) {
            console.error('Failed to promote meme:', error);
            throw error;
        }
    }

    async createMemeContest(config: {
        maxVotes: number;
        contestDuration: number;
        minVotesForWin: number;
        voteCost: number;
    }) {
        try {
            const message = this.createMessage(
                `🎉 New meme contest started!\n\nPrizes:\n- NFT badges\n- Ranking points\n- Community recognition\n\n#Web3 #Memes #Contest`
            );
            this.messages.push(message);
            console.log('Social Post:', message.text);
            return message;
        } catch (error) {
            console.error('Failed to announce contest:', error);
            throw error;
        }
    }

    async submitVote(memeId: string) {
        try {
            const message = this.createMessage(
                `🗳️ New vote cast for meme ${memeId}!\n\nView meme: https://explorer.story.foundation/ipa/${memeId}\n\n#Web3 #Memes`
            );
            this.messages.push(message);
            console.log('Social Post:', message.text);
            return message;
        } catch (error) {
            console.error('Failed to announce vote:', error);
            throw error;
        }
    }

    async announceWinner(memeId: string, creator: string, voteCount: number) {
        try {
            const message = this.createMessage(
                `🏆 Congratulations to the meme contest winner!\n\nCreator: ${creator}\nVotes: ${voteCount}\n\nView winning meme: https://explorer.story.foundation/ipa/${memeId}\n\n#Web3 #Memes #NFT`
            );
            this.messages.push(message);
            console.log('Social Post:', message.text);
            return message;
        } catch (error) {
            console.error('Failed to announce winner:', error);
            throw error;
        }
    }

    private createMessage(text: string, media?: { url: string }[]): Message {
        return {
            id: uuidv4(),
            text,
            media,
            timestamp: Date.now()
        };
    }

    // For testing/debugging
    getMessages(): Message[] {
        return this.messages;
    }
} 