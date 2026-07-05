const fs = require('fs');
const path = require('path');
const {
  PrivateKey,
  Deploy,
  DeployHeader,
  ExecutableDeployItem,
  StoredContractByHash,
  Args,
  CLValue,
  ContractHash,
  Key,
  URef,
  KeyAlgorithm,
  HttpHandler,
  RpcClient,
} = require('casper-js-sdk');

// ─── Configuration ────────────────────────────────────────────────────────────

const TESTNET_RPC_URL = 'https://node.testnet.casper.network/rpc';
const CHAIN_NAME = 'casper-test';
const PAYMENT_AMOUNT = '3000000000'; // 3 CSPR in motes, adjust per entry point cost
const KEY_PEM_PATH = path.resolve(__dirname, 'key.pem');

// ─── CLI Usage ──────────────────────────────────────────────────────────────
//
//   node interact.js <contractHash> <entryPoint> [argName:type=value ...]
//
// Supported types: string, u32, u64, u128, u256, u512, bool, key, account-hash, uref
//
// Example:
//   node interact.js hash-abc123... register_agent name:string=Agent1 score:u64=100
//

function parseArg(raw) {
  const eqIdx = raw.indexOf('=');
  if (eqIdx === -1) {
    throw new Error(`Invalid argument "${raw}". Expected format name:type=value`);
  }
  const namePart = raw.slice(0, eqIdx);
  const value = raw.slice(eqIdx + 1);
  const [name, type] = namePart.split(':');
  if (!name || !type) {
    throw new Error(`Invalid argument "${raw}". Expected format name:type=value`);
  }

  let clValue;
  switch (type.toLowerCase()) {
    case 'string':
      clValue = CLValue.newCLString(value);
      break;
    case 'u32':
      clValue = CLValue.newCLUInt32(parseInt(value, 10));
      break;
    case 'u64':
      clValue = CLValue.newCLUint64(value);
      break;
    case 'u128':
      clValue = CLValue.newCLUInt128(value);
      break;
    case 'u256':
      clValue = CLValue.newCLUInt256(value);
      break;
    case 'u512':
      clValue = CLValue.newCLUInt512(value);
      break;
    case 'bool':
      clValue = CLValue.newCLValueBool(value.toLowerCase() === 'true');
      break;
    case 'key': {
      // Stripping prefixes from direct key strings to prevent parsing errors
      let sanitizedKey = value;
      if (sanitizedKey.startsWith('account-hash-')) sanitizedKey = sanitizedKey.slice(13);
      if (sanitizedKey.startsWith('hash-')) sanitizedKey = sanitizedKey.slice(5);
      const key = Key.newKey(sanitizedKey);
      clValue = CLValue.newCLKey(key);
      break;
    }
    case 'account-hash': {
      let sanitizedAccount = value;
      if (sanitizedAccount.startsWith('account-hash-')) sanitizedAccount = sanitizedAccount.slice(13);
      const accountHashStr = `account-hash-${sanitizedAccount}`;
      const key = Key.newKey(accountHashStr);
      clValue = CLValue.newCLKey(key);
      break;
    }
    case 'uref': {
      const uref = URef.fromString(value);
      clValue = CLValue.newCLUref(uref);
      break;
    }
    default:
      throw new Error(`Unsupported argument type "${type}" in "${raw}"`);
  }

  return { name, clValue };
}

async function main() {
  const [contractHashArg, entryPoint, ...rest] = process.argv.slice(2);

  if (!contractHashArg || !entryPoint) {
    console.error(
      'Usage: node interact.js <contractHash> <entryPoint> [argName:type=value ...] [--dry-run]'
    );
    process.exit(1);
  }

  const dryRun = rest.includes('--dry-run');
  const argTokens = rest.filter((t) => t !== '--dry-run');

  // 1. Build the contract call arguments
  const argsMap = new Map();
  for (const token of argTokens) {
    const { name, clValue } = parseArg(token);
    argsMap.set(name, clValue);
  }
  const callArgs = new Args(argsMap);

  // 2. Load the private key
  console.log(`Loading private key from: ${KEY_PEM_PATH}`);
  if (!fs.existsSync(KEY_PEM_PATH)) {
    throw new Error(`Private key file not found at: ${KEY_PEM_PATH}`);
  }
  const pemContent = fs.readFileSync(KEY_PEM_PATH, 'utf8');
  const algorithm = pemContent.includes('EC PRIVATE KEY')
    ? KeyAlgorithm.SECP256K1
    : KeyAlgorithm.ED25519;
  const privateKey = PrivateKey.fromPem(pemContent, algorithm);
  const publicKey = privateKey.publicKey;
  console.log(`Account public key: ${publicKey.toHex()}`);

  // 3. Build the session (sanitizing 'hash-' prefix from the target contract)
  let sanitizedContractHex = contractHashArg;
  if (sanitizedContractHex.startsWith('hash-')) {
    sanitizedContractHex = sanitizedContractHex.slice(5);
  }
  const contractHash = ContractHash.newContract(sanitizedContractHex);
  const session = new ExecutableDeployItem();
  session.storedContractByHash = new StoredContractByHash(
    contractHash,
    entryPoint,
    callArgs
  );

  // 4. Build payment
  const payment = ExecutableDeployItem.standardPayment(PAYMENT_AMOUNT);

  // 5. Build deploy header + assemble
  const deployHeader = DeployHeader.default();
  deployHeader.account = publicKey;
  deployHeader.chainName = CHAIN_NAME;

  const deploy = Deploy.makeDeploy(deployHeader, payment, session);

  // 6. Sign
  deploy.sign(privateKey);
  console.log(`Deploy hash: ${deploy.hash.toHex()}`);
  deploy.validate();
  console.log('Deploy validated successfully.');

  if (dryRun) {
    console.log('Dry run enabled — not sending to the network.');
    console.log(JSON.stringify(Deploy.toJSON(deploy), null, 2));
    return;
  }

  // 7. Send to Testnet
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
  console.log('✓ Contract call submitted successfully!');
  console.log(`  Contract hash : ${contractHashArg}`);
  console.log(`  Entry point   : ${entryPoint}`);
  console.log(`  Deploy hash   : ${hashHex}`);
  console.log(`  Track on CSPR.live: https://testnet.cspr.live/deploy/${hashHex}`);
}

main().catch((err) => {
  console.error('Interaction failed:', err.message || err);
  process.exit(1);
});