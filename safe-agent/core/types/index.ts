// Meme Types
export interface MemeContent {
    title: string;
    description: string;
    creator: string;
    imageUrl: string;
    metadata: {
        tags: string[];
        category: string;
        aiGenerated: boolean;
        parentIpId?: string;
        licenseTermsId?: string;
    };
}

export interface TrendData {
    topic: string;
    sentiment: string;
    viralScore: number;
    keywords: string[];
}

// Story Protocol Types
export interface IPRegistration {
    ipId: string;
    txHash: string;
}

export interface LicenseTerms {
    id: string;
    terms: {
        creator: string;
        isCommercial: boolean;
        isSoulbound: boolean;
        isRoyaltyEnabled: boolean;
    };
}

// Fileverse Types
export interface FileMetadata {
    fileId: string;
    portalAddress: string;
    metadataIpfsHash: string;
    contentIpfsHash: string;
}

export interface TransactionResult {
    hash: string;
    fileId: string;
    portalAddress: string;
}

// Safe Types
export interface SafeTransaction {
    to: string;
    value: string;
    data: string;
} 