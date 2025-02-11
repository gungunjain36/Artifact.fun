import Safe from '@safe-global/protocol-kit'

const SIGNER_ADDRESS = process.env.SIGNER_ADDRESS
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY
const RPC_URL = 'https://rpc.ankr.com/eth_sepolia'

if (!SIGNER_ADDRESS || !SIGNER_PRIVATE_KEY) {
  throw new Error('SIGNER_ADDRESS and SIGNER_PRIVATE_KEY must be provided')
}

// this creates a Smart Account for Our AI Agent
const safeClient = await Safe.init({
  provider: RPC_URL,
  signer: SIGNER_PRIVATE_KEY,
  predictedSafe: {
    safeAccountConfig: {
      owners: [SIGNER_ADDRESS],
      threshold: 1,
    },
  },
})

export default safeClient