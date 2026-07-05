# Covenant Smart Contracts — Casper Network

Covenant is a suite of 4 Odra-based smart contracts deployed on the Casper blockchain for AI agent registry, trust scoring, credit scoring, and machine-to-machine micropayments.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages

## Casper Contract Build

```bash
export PATH="$HOME/bin:/home/runner/workspace/.local/share/.cargo/bin:$PATH"
export RUSTFLAGS="--sysroot $HOME/.rust-custom-sysroot"
export RUSTC_BOOTSTRAP=1
cd casper-contract
cargo odra build
# WASM files appear in casper-contract/wasm/
```

## Casper Contract Deploy

```bash
cp casper-contract/wasm/*.wasm casper-deploy/
cd casper-deploy
node deploy.js AgentRegistry.wasm
node deploy.js ReputationContract.wasm
node deploy.js CreditContract.wasm
node deploy.js PaymentContract.wasm
```

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Casper contracts: Rust + Odra 0.8.1 framework → WASM
- Deploy: casper-js-sdk (Node.js)

## Where things live

- `casper-contract/` — Rust smart contract source (Odra 0.8.1)
- `casper-contract/src/lib.rs` — All 4 contract modules
- `casper-contract/wasm/` — Compiled WASM files
- `casper-deploy/` — Deploy scripts + key + compiled WASM
- `casper-deploy/DEPLOYMENT_RESULTS.md` — Deploy hashes & tracking links
- `artifacts/api-server/` — Express API server

## Contracts

| Contract | Purpose |
|---|---|
| AgentRegistry | Register AI agents with capabilities + version |
| ReputationContract | Governor-managed trust scores (0-1000) |
| CreditContract | Governor-managed credit scores (0-1000) |
| PaymentContract | Deposit + machine-to-machine micropayments |

## Architecture decisions

- Odra 0.8.1 framework for Casper WASM contracts (not the latest 2.x)
- `RUSTC_BOOTSTRAP=1` enables nightly features on stable Rust 1.88.0
- Custom wasm32 sysroot at `~/.rust-custom-sysroot` with downloaded Rust 1.88.0 stdlib
- `vendor/odra-casper-wasm-env-0.8.1` patches panic handler for stable Rust (`loop {}` instead of `core::intrinsics::abort()`)
- `casper-event-standard 0.4.x` (not 0.2.x — that version doesn't exist on crates.io)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always set RUSTFLAGS, RUSTC_BOOTSTRAP and PATH before building contracts
- wasm32 stdlib must be present at `~/.rust-custom-sysroot`; re-run setup if the repl restarts
- The `rustup` at `~/bin/rustup` is a wrapper script to satisfy cargo-odra's check
- Private key at `casper-deploy/key.pem` is Secp256k1 (EC PRIVATE KEY header)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `casper-deploy/DEPLOYMENT_RESULTS.md` for live deploy hashes
