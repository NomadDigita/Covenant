---
name: Casper Odra 0.8.1 build setup
description: How to build Odra 0.8.1 Casper smart contracts on stable Rust in this Replit environment
---

## The rule
Odra 0.8.1 uses nightly-only Rust features (`core_intrinsics`, `box_patterns`, `result_flattening`). Use `RUSTC_BOOTSTRAP=1` on stable Rust 1.88.0 (Nix) + a custom wasm32 sysroot.

**Why:** The nightly Nix package (`rustc-nightly-latest`) ships no x86_64 stdlib, so cross-compilation (wasm32) with host build scripts fails. Stable Nix Rust 1.88.0 has x86_64 stdlib and the custom sysroot adds wasm32.

## How to apply
Every time the repo is built:
```bash
export PATH="$HOME/bin:/home/runner/workspace/.local/share/.cargo/bin:$PATH"
export RUSTFLAGS="--sysroot $HOME/.rust-custom-sysroot"
export RUSTC_BOOTSTRAP=1
cd casper-contract && cargo odra build
```

## Custom sysroot setup (needed after repl restart)
```bash
# Download wasm32 stdlib for Rust 1.88.0
curl -L -o /tmp/rust-wasm32-std.tar.gz "https://static.rust-lang.org/dist/rust-std-1.88.0-wasm32-unknown-unknown.tar.gz"
mkdir -p /tmp/wasm32-extract && tar xzf /tmp/rust-wasm32-std.tar.gz -C /tmp/wasm32-extract
SYSROOT=$(rustc --print sysroot)
mkdir -p ~/.rust-custom-sysroot/lib/rustlib
ln -sf "$SYSROOT/lib/rustlib/x86_64-unknown-linux-gnu" ~/.rust-custom-sysroot/lib/rustlib/ 2>/dev/null
ln -sf "$SYSROOT/lib/rustlib/etc" ~/.rust-custom-sysroot/lib/rustlib/ 2>/dev/null
cp -r /tmp/wasm32-extract/rust-std-1.88.0-wasm32-unknown-unknown/rust-std-wasm32-unknown-unknown/lib/rustlib/wasm32-unknown-unknown ~/.rust-custom-sysroot/lib/rustlib/
```

## Rustup wrapper (needed after repl restart)
```bash
mkdir -p ~/bin
cat > ~/bin/rustup << 'SCRIPT'
#!/bin/bash
if [[ "$*" == "target list --installed" ]]; then echo "wasm32-unknown-unknown"; echo "x86_64-unknown-linux-gnu"; exit 0; fi
exec "$HOME/.cargo/bin/rustup" "$@"
SCRIPT
chmod +x ~/bin/rustup
```

## Key patches applied
- `casper-contract/vendor/odra-casper-wasm-env-0.8.1/src/lib.rs` — removed `#![feature(core_intrinsics)]` and changed panic handler from `core::intrinsics::abort()` to `loop {}` 
- `casper-event-standard = "0.4"` (not 0.2.2 which doesn't exist on crates.io)
- `use odra::{..., UnwrapOrRevert}` required explicitly; `unwrap_or_revert(&env)` takes a `&ContractEnv` arg in 0.8.1

## cargo-odra install
```bash
OPENSSL_INCLUDE_DIR=/nix/store/0225zs9jl9s2y3ai1arbg0h9z7z4bmfi-openssl-3.4.1-dev/include \
OPENSSL_LIB_DIR=/nix/store/5xmcl9wr18g6ym3dh3363hv8hp6jyxqd-openssl-3.4.1/lib \
cargo install cargo-odra
# Installs to ~/.local/share/.cargo/bin/cargo-odra
```
