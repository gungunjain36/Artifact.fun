import { getAllowanceModuleDeployment } from '@safe-global/safe-modules-deployments';
import {
    createPublicClient,
    http,
    createWalletClient,
    zeroAddress,
    type PublicClient,
    type WalletClient,
    type Hash
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { NETWORK, SAFE, AGENT } from '../constants';

export class AgentService {
    private publicClient: PublicClient;
    private walletClient: WalletClient;
    private allowanceModule: any;
    private allowanceModuleAddress: string;

    constructor() {
        // Validate required environment variables
        if (!process.env.AGENT_PRIVATE_KEY) {
            throw new Error('AGENT_PRIVATE_KEY must be provided');
        }

        // Ensure private key starts with 0x
        const privateKey = process.env.AGENT_PRIVATE_KEY.startsWith('0x') 
            ? process.env.AGENT_PRIVATE_KEY 
            : `0x${process.env.AGENT_PRIVATE_KEY}`;

        // Initialize clients
        this.publicClient = createPublicClient({ 
            transport: http(NETWORK.RPC_URL)
        });

        const agentAccount = privateKeyToAccount(privateKey as `0x${string}`);
        this.walletClient = createWalletClient({ 
            transport: http(NETWORK.RPC_URL),
            account: agentAccount
        });

        // Get allowance module for Sepolia
        this.allowanceModule = getAllowanceModuleDeployment({ network: '11155111' })!;
        this.allowanceModuleAddress = this.allowanceModule.networkAddresses['11155111'];

        console.log('Agent service initialized with address:', agentAccount.address);
    }

    async getCurrentAllowance(): Promise<any> {
        return await this.publicClient.readContract({
            address: this.allowanceModuleAddress,
            abi: this.allowanceModule.abi,
            functionName: 'getTokenAllowance',
            args: [SAFE.SAFE_ADDRESS, AGENT.ADDRESS, zeroAddress]
        });
    }

    async spendAllowance(amount: bigint): Promise<Hash> {
        try {
            console.log('Getting current allowance...');
            const allowance = await this.getCurrentAllowance();
            console.log('Current allowance:', allowance);
            console.log('Attempting to spend:', amount.toString(), 'wei');

            // Generate hash for the transfer
            console.log('Generating transfer hash...');
            const hash = await this.publicClient.readContract({
                address: this.allowanceModuleAddress,
                abi: this.allowanceModule.abi,
                functionName: 'generateTransferHash',
                args: [
                    SAFE.SAFE_ADDRESS,
                    zeroAddress, // ETH address
                    AGENT.ADDRESS,
                    amount,
                    zeroAddress,
                    0n,
                    allowance[4] // nonce
                ]
            });

            // Sign the hash with agent's private key
            console.log('Signing transaction...');
            const agentAccount = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY! as `0x${string}`);
            const signature = await agentAccount.sign({
                hash: hash as unknown as `0x${string}`
            });

            // Simulate and execute the transaction
            console.log('Simulating transaction...');
            const { request } = await this.publicClient.simulateContract({
                address: this.allowanceModuleAddress,
                abi: this.allowanceModule.abi,
                functionName: 'executeAllowanceTransfer',
                args: [
                    SAFE.SAFE_ADDRESS,
                    zeroAddress, // ETH address
                    AGENT.ADDRESS,
                    amount,
                    zeroAddress,
                    0n,
                    AGENT.ADDRESS,
                    signature
                ],
                account: agentAccount
            });

            console.log('Executing transaction...');
            const tx = await this.walletClient.writeContract(request);
            console.log('Transaction executed:', tx);
            return tx;
        } catch (error) {
            console.error('Error spending allowance:', error);
            throw error;
        }
    }
} 