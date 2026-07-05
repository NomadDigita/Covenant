const fs = require('fs');
const path = require('path');
const {
  PrivateKey,
  Deploy,
  DeployHeader,
  ExecutableDeployItem,
  Args,
  CLValue,
  KeyAlgorithm,
  HttpHandler,
  RpcClient,
} = require('casper-js-sdk');

// ─── Configuration ────────────────────────────────────────────────────────────

const TESTNET_RPC_URL = 'https://node.testnet.casper.network/rpc';
const CHAIN_NAME = 'casper-test';
const PAYMENT_AMOUNT = '200000000000'; // 200 CSPR in motes
const KEY_PEM_PATH = path.resolve(__dirname, 'key.pem');

// Accept WASM filename as CLI argument, default to AgentRegistry.wasm
const wasmArg = process.argv[2];
const WASM_PATH = wasmArg
  ? path.resolve(__dirname, wasmArg)
  : path.resolve(__dirname, 'AgentRegistry.wasm');

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Verify WASM file exists
  if (!fs.existsSync(WASM_PATH)) {
    throw new Error(`WASM file not found: ${WASM_PATH}`);
  }

  // 1. Load the private key from PEM
  console.log(`Loading private key from: ${KEY_PEM_PATH}`);
  const pemContent = fs.readFileSync(KEY_PEM_PATH, 'utf8');

  // Detect algorithm from PEM header (Ed25519 or Secp256K1)
  const algorithm = pemContent.includes('EC PRIVATE KEY')
    ? KeyAlgorithm.SECP256K1
    : KeyAlgorithm.ED25519;

  const privateKey = PrivateKey.fromPem(pemContent, algorithm);
  const publicKey = privateKey.publicKey;
  console.log(`Account public key: ${publicKey.toHex()}`);

  // 2. Read the WASM bytes
  console.log(`Loading WASM from: ${WASM_PATH}`);
  const wasmBytes = new Uint8Array(fs.readFileSync(WASM_PATH));
  console.log(`WASM size: ${wasmBytes.length} bytes`);

  // 3. Build the session (ModuleBytes = WASM deploy)
  // FIXED: Added 'odra_cfg_constructor' with 'init' as required by the Odra installer
  const contractName = path.basename(WASM_PATH, '.wasm');
  const session = ExecutableDeployItem.newModuleBytes(
    wasmBytes,
    Args.fromMap({
      odra_cfg_package_hash_key_name: CLValue.newCLString(contractName),
      odra_cfg_allow_key_override: CLValue.newCLValueBool(true),
      odra_cfg_is_upgradable: CLValue.newCLValueBool(true),
      odra_cfg_constructor: CLValue.newCLString('init'), 
    }),
  );

  // 4. Build the payment
  const payment = ExecutableDeployItem.standardPayment(PAYMENT_AMOUNT);

  // 5. Build the deploy header
  const deployHeader = DeployHeader.default();
  deployHeader.account = publicKey;
  deployHeader.chainName = CHAIN_NAME;

  // 6. Assemble the Deploy
  const deploy = Deploy.makeDeploy(deployHeader, payment, session);

  // 7. Sign the deploy
  deploy.sign(privateKey);
  console.log(`Deploy hash: ${deploy.hash.toHex()}`);

  // 8. Validate before sending
  deploy.validate();
  console.log('Deploy validated successfully.');

  // 9. Send to Testnet
  console.log(`Sending deploy to Casper Testnet: ${TESTNET_RPC_URL}`);
  const handler = new HttpHandler(TESTNET_RPC_URL);
  const client = new RpcClient(handler);

  const result = await client.putDeploy(deploy);
  const hashHex =
    typeof result.deployHash === 'string'
      ? result.deployHash
      : result.deployHash?.toHex?.() ||
        Buffer.from(result.deployHash).toString('hex');

  console.log('');
  console.log('✓ Deploy submitted successfully!');
  console.log(`  Contract : ${path.basename(WASM_PATH)}`);
  console.log(`  Deploy hash: ${hashHex}`);
  console.log(`  Track on CSPR.live: https://testnet.cspr.live/deploy/${hashHex}`);
}

main().catch((err) => {
  console.error('Deployment failed:', err.message || err);
  process.exit(1);
});