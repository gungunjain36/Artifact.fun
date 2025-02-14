import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("Story Protocol Integration", function () {
    let example: Contract;
    let simpleNFT: Contract;
    let owner: any;
    let alice: any;
    let bob: any;

    // Story Protocol contract addresses on Sepolia
    const IP_ASSET_REGISTRY = "0x77319B4031e6eF1250907aa00018B8B1c67a244b";
    const LICENSING_MODULE = "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f";
    const PIL_TEMPLATE = "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316";
    const ROYALTY_POLICY_LAP = "0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E";
    const WIP = "0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E";

    beforeEach(async function () {
        [owner, alice, bob] = await ethers.getSigners();

        // Deploy Example contract
        const Example = await ethers.getContractFactory("Example");
        example = await Example.deploy(
            IP_ASSET_REGISTRY,
            LICENSING_MODULE,
            PIL_TEMPLATE,
            ROYALTY_POLICY_LAP,
            WIP
        );
        await example.waitForDeployment();

        // Get SimpleNFT instance
        const simpleNFTAddress = await example.SIMPLE_NFT();
        const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
        simpleNFT = SimpleNFT.attach(simpleNFTAddress);
    });

    describe("Minting and Registration", function () {
        it("Should mint NFT and register as IP Asset", async function () {
            const tx = await example.mintAndRegisterAndCreateTermsAndAttach(alice.address);
            const receipt = await tx.wait();

            // Get the tokenId from events
            const mintEvent = receipt.events?.find(e => e.event === "Transfer");
            expect(mintEvent).to.not.be.undefined;
            expect(mintEvent.args.to).to.equal(alice.address);

            // Verify NFT ownership
            const tokenId = mintEvent.args.tokenId;
            expect(await simpleNFT.ownerOf(tokenId)).to.equal(alice.address);
        });

        it("Should create derivative NFT", async function () {
            // First create parent NFT
            const parentTx = await example.mintAndRegisterAndCreateTermsAndAttach(alice.address);
            const parentReceipt = await parentTx.wait();
            const parentEvent = parentReceipt.events?.find(e => e.event === "Transfer");
            const parentTokenId = parentEvent.args.tokenId;

            // Now create derivative
            const tx = await example.mintLicenseTokenAndRegisterDerivative(
                parentTokenId,
                1, // licenseTermsId from parent
                bob.address
            );
            const receipt = await tx.wait();

            // Verify derivative NFT ownership
            const derivativeEvent = receipt.events?.find(e => e.event === "Transfer");
            const derivativeTokenId = derivativeEvent.args.tokenId;
            expect(await simpleNFT.ownerOf(derivativeTokenId)).to.equal(bob.address);
        });
    });
}); 