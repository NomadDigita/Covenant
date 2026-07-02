const fs = require('fs');
const path = require('path');
const { CasperClient, DeployUtil, Keys, RuntimeArgs } = require('casper-js-sdk');

// 1. Connect directly to the unblocked, active bare-metal Hetzner node on port 7777
// Inside the cloud container, port 7777 is completely unblocked
const NODE_URL = "http://135.181.233.153:7777/rpc"; 
const client = new CasperClient(NODE_URL);

// 2. Define File Paths in the Codespace root (where key.pem and AgentRegistry.wasm reside)
const PEM_PATH = path.join(__dirname, './key.pem');
const WASM_PATH = path.join(__dirname, './AgentRegistry.wasm');

console.log("🔍 Loading deployment files...");
if (!fs.existsSync(PEM_PATH)) {
    console.error("❌ Error: Private key PEM file not found!");
    process.exit(1);
}
if (!fs.existsSync(WASM_PATH)) {
    console.error("❌ Error: Compiled AgentRegistry.wasm not found!");
    process.exit(1);
}

// 3. Load and Parse the Private Key
let activeKeyPair;
try {
    activeKeyPair = Keys.Secp256K1.loadKeyPairFromPrivateFile(PEM_PATH);
    console.log("🔑 Loaded Secp256k1 keypair successfully.");
} catch (e) {
    try {
        activeKeyPair = Keys.Ed25519.loadKeyPairFromPrivateFile(PEM_PATH);
        console.log("🔑 Loaded Ed25519 keypair successfully.");
    } catch (err) {
        console.error("❌ Error: Failed to load private key PEM file!", err);
        process.exit(1);
    }
}

const publicKeyHex = activeKeyPair.publicKey.toHex();
console.log("Wallet Public Key Address:", publicKeyHex);

// 4. Read the compiled WebAssembly bytecode
const wasmBytes = fs.readFileSync(WASM_PATH);

// 5. Build the Deploy Transaction payload
const deployParams = new DeployUtil.DeployParams(
    activeKeyPair.publicKey,
    "casper-test", // Casper Testnet Chain Name
    1,             // Gas Price
    1800000        // TTL (30 minutes)
);

const session = DeployUtil.ExecutableDeployItem.newModuleBytes(
    wasmBytes,
    RuntimeArgs.fromMap({})
);

// Standard payment fee for on-chain contract installation is 50 CSPR (50,000,000,000 motes)
const payment = DeployUtil.standardPayment(50 * 1000000000); 

const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

// 6. Sign the Transaction
console.log("✍️ Signing deploy payload...");
const signedDeploy = DeployUtil.signDeploy(deploy, activeKeyPair);

// 7. Broadcast the transaction directly to the node
console.log(`🚀 Broadcasting deploy payload to Casper Testnet Node: ${NODE_URL}...`);
client.putDeploy(signedDeploy)
    .then(deployHash => {
        console.log("\n==================================================");
        console.log("🎉 DEPLOY DISPATCHED SUCCESSFULLY!");
        console.log("Deploy Hash:", deployHash);
        console.log(`Verify Execution here: https://testnet.cspr.live/deploy/${deployHash}`);
        console.log("==================================================");
    })
    .catch(err => {
        console.error("❌ Deployment broadcast failed:", err);
    });