# Covenant Smart Contract Deployments — Casper Testnet

**Network:** Casper Testnet (`casper-test`)  
**Account Public Key:** `0202c032c1b5bbb2da4ce6259a4de792e8a5e6bef962b3b1a407e5a7c144907813e2`  
**Deployed:** 2026-07-05 (v2 — includes PaymentContract `withdraw` entrypoint + pinned deps + proper abort panic handler)

## Contract Deploy Hashes (v2 — current)

| Contract | Deploy Hash | CSPR.live Link |
|----------|-------------|----------------|
| AgentRegistry | `7a7625244a8cc693fc058b4a37dde4bfa712983d13bb7ddc86c45c6ec5547dbe` | [View](https://testnet.cspr.live/deploy/7a7625244a8cc693fc058b4a37dde4bfa712983d13bb7ddc86c45c6ec5547dbe) |
| ReputationContract | `baa7335d1ab3f87df6ff7f3b0e2100616b5e2621dc731116a8c82eece48b166c` | [View](https://testnet.cspr.live/deploy/baa7335d1ab3f87df6ff7f3b0e2100616b5e2621dc731116a8c82eece48b166c) |
| CreditContract | `c1e93b6bb935a26b020c7d881c449138c387e8a5d621b0e4e6096af57b6c049e` | [View](https://testnet.cspr.live/deploy/c1e93b6bb935a26b020c7d881c449138c387e8a5d621b0e4e6096af57b6c049e) |
| PaymentContract | `1eafc5e92e53b24ce87f1f8bf8b483ba5283aa35b22d13024cf27a3db32ad76f` | [View](https://testnet.cspr.live/deploy/1eafc5e92e53b24ce87f1f8bf8b483ba5283aa35b22d13024cf27a3db32ad76f) |

## Contract Entry Points

### AgentRegistry
| Entry Point | Args | Returns |
|---|---|---|
| `register_agent` | `name: String`, `capabilities: Vec<String>`, `version: String` | — |
| `get_agent` | `wallet: Key` | `Option<AgentProfile>` |

### ReputationContract / CreditContract
| Entry Point | Args | Returns |
|---|---|---|
| `init` | — | — |
| `get_score` / `get_credit_score` | `agent: Key` | `u32` (0–1000, default 500) |
| `update_score` / `update_credit` | `agent: Key`, `new_score: u32` | — (governor only) |
| `change_governor` / `change_governor_credit` | `new_governor: Key` | — (governor only) |

### PaymentContract
| Entry Point | Args | Returns |
|---|---|---|
| `deposit` | — (attach CSPR) | — |
| `execute_micropayment` | `recipient: Key`, `amount: U512` | — |
| `withdraw` | — | — (transfers full balance to caller) |
| `get_balance` | `wallet: Key` | `U512` |

## Re-build & Re-deploy

```bash
# Build
export PATH="$HOME/bin:/home/runner/workspace/.local/share/.cargo/bin:$PATH"
export RUSTFLAGS="--sysroot $HOME/.rust-custom-sysroot"
export RUSTC_BOOTSTRAP=1
cd casper-contract && cargo odra build
cp casper-contract/wasm/*.wasm casper-deploy/

# Deploy
cd casper-deploy
node deploy.js AgentRegistry.wasm
node deploy.js ReputationContract.wasm
node deploy.js CreditContract.wasm
node deploy.js PaymentContract.wasm
```

## ⚠️ Security Note
`casper-deploy/key.pem` is a live Secp256k1 private key stored in the workspace.  
**Do not commit this file to any public repository or share it.**  
Move it to a secrets manager or environment variable before any CI/CD integration.
