import { LicenseTerms, StoryClient, StoryConfig, WIP_TOKEN_ADDRESS, aeneid } from '@story-protocol/core-sdk'
import { http, zeroAddress, zeroHash, createWalletClient } from 'viem'
import { privateKeyToAccount, Address, Account } from 'viem/accounts'
import dotenv from 'dotenv'
import { LicensingConfig } from '@story-protocol/core-sdk/dist/declarations/src/types/common'
dotenv.config()

// Add your rpc provider url to your .env file
// You can select from one of these: https://docs.story.foundation/docs/story-network#-rpcs
export const RPCProviderUrl = process.env.RPC_URL || 'https://aeneid.storyrpc.io'

// Add your private key to your .env file.
const privateKey = process.env.ADMIN_PRIVATE_KEY!;
if (!privateKey) {
    throw new Error('ADMIN_PRIVATE_KEY is required');
}

const formattedKey = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`;
export const account = privateKeyToAccount(formattedKey);

// Initialize Story Protocol client with the exact same config as the example
const config: StoryConfig = {
    chainId: 'aeneid',
    transport: http(RPCProviderUrl),
    wallet: createWalletClient({
        chain: aeneid,
        transport: http(RPCProviderUrl),
        account
    })
}

export const client = StoryClient.newClient(config)

// This is a pre-configured PIL Flavor: https://docs.story.foundation/docs/pil-flavors
export const NonCommercialSocialRemixingTermsId = '1'

// A NFT contract address that will be used to represent your IP Assets
export const NFTContractAddress: Address = (process.env.NFT_CONTRACT_ADDRESS as Address) || '0x937bef10ba6fb941ed84b8d249abc76031429a9a'
export const SPGNFTContractAddress: Address = process.env.SPG_NFT_CONTRACT_ADDRESS as Address

// Docs: https://docs.story.foundation/docs/deployed-smart-contracts
export const RoyaltyPolicyLAP: Address = '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E'

export function createCommercialRemixTerms(terms: { commercialRevShare: number; defaultMintingFee: number }): LicenseTerms {
    return {
        transferable: true,
        royaltyPolicy: RoyaltyPolicyLAP,
        defaultMintingFee: BigInt(terms.defaultMintingFee),
        expiration: BigInt(0),
        commercialUse: true,
        commercialAttribution: true,
        commercializerChecker: zeroAddress,
        commercializerCheckerData: zeroAddress,
        commercialRevShare: terms.commercialRevShare,
        commercialRevCeiling: BigInt(0),
        derivativesAllowed: true,
        derivativesAttribution: true,
        derivativesApproval: false,
        derivativesReciprocal: true,
        derivativeRevCeiling: BigInt(0),
        currency: WIP_TOKEN_ADDRESS,
        uri: '',
    }
}

export const defaultLicensingConfig: LicensingConfig = {
    isSet: false,
    mintingFee: BigInt(0),
    licensingHook: zeroAddress,
    hookData: zeroHash,
    commercialRevShare: 0,
    disabled: false,
    expectMinimumGroupRewardShare: 0,
    expectGroupRewardPool: zeroAddress,
} 