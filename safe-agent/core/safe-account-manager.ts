import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { toSafeSmartAccount } from 'permissionless/accounts';
import {
    type SmartAccount,
    type SmartAccountImplementation,
    type UserOperation,
    entryPoint06Abi,
    entryPoint07Abi,
    toSmartAccount
} from "viem/account-abstraction"
import { entryPoint07Address } from 'viem/account-abstraction';
import { createSmartAccountClient, type SmartAccountClient } from 'permissionless';

export class SafeAccountManager {
    private publicClient: PublicClient;
    private walletClient: WalletClient;
    private safeAccount: SmartAccount | null = null;
    private smartAccountClient: SmartAccountClient | null = null;
    private viemAccount;

    constructor(privateKey: string, pimlicoAPIKey: string) {
        // Ensure private key has 0x prefix
        const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
        this.viemAccount = privateKeyToAccount(formattedKey as `0x${string}`);

        // Initialize clients
        const clients = this.generateClients();
        this.publicClient = clients.publicClient;
        this.walletClient = clients.walletClient;
    }

    private generateClients() {
        return {
            publicClient: createPublicClient({
                chain: sepolia,
                transport: http()
            }),
            walletClient: createWalletClient({
                chain: sepolia,
                transport: http(),
                account: this.viemAccount
            })
        };
    }

    async setupSafe() {
        try {
            const pimlicoRpcUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${process.env.PIMLICO_API_KEY}`;
            
            // Initialize Pimlico client
            const paymasterClient = createPimlicoClient({
                transport: http(pimlicoRpcUrl),
                entryPoint: {
                    address: entryPoint07Address,
                    version: "0.7"
                }
            });

            // Create Safe smart account
            this.safeAccount = await toSafeSmartAccount({
                client: this.publicClient,
                entryPoint: {
                    address: entryPoint07Address,
                    version: "0.7"
                },
                owners: [this.viemAccount],
                version: "1.4.1"
            });

            // Initialize smart account client
            this.smartAccountClient = createSmartAccountClient({
                account: this.safeAccount,
                chain: sepolia,
                paymaster: paymasterClient,
                bundlerTransport: http(pimlicoRpcUrl),
                userOperation: {
                    estimateFeesPerGas: async () => (await paymasterClient.getUserOperationGasPrice()).fast
                }
            });

            return this.safeAccount.address;
        } catch (error) {
            console.error('Failed to setup Safe:', error);
            throw error;
        }
    }

    async executeTransaction(
        calls: {
            to: string;
            data: string;
            value: string;
        }[]
    ) {
        try {
            if (!this.smartAccountClient) {
                throw new Error('Safe not initialized. Call setupSafe() first.');
            }

            const hash = await this.smartAccountClient.sendUserOperation({
                calls: calls.map(call => ({
                    to: call.to as `0x${string}`,
                    data: call.data as `0x${string}`,
                    value: BigInt(call.value)
                }))
            });

            const receipt = await this.smartAccountClient.waitForUserOperationReceipt({
                hash
            });

            return receipt;
        } catch (error) {
            console.error('Failed to execute transaction:', error);
            throw error;
        }
    }

    async getAddress(): Promise<string> {
        if (!this.safeAccount) {
            throw new Error('Safe not initialized. Call setupSafe() first.');
        }
        return this.safeAccount.address;
    }

    async getOwner(): Promise<string> {
        return this.viemAccount.address;
    }
}