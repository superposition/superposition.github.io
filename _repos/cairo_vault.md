---
repo: superposition/cairo_vault
title: Cairo Vault
slug: cairo_vault
tagline: A Starknet contract that keeps a per-caller deposit balance and a running total
language: Cairo
stars: 0
pushed: 2025-12-16
url: https://github.com/superposition/cairo_vault
order: 19
---

## What it is

One Starknet contract written in Cairo, about a hundred lines long, in `src/vault.cairo`. It stores an owner address, a balance for every address that has deposited, and a running total. Three getters read that state back, and two events record the calls that changed it. `src/lib.cairo` is a single line declaring the module.

The repository works one small stateful Starknet contract end to end: a trait for the interface, a storage struct, a constructor, an implementation block marked `#[abi(embed_v0)]` so the trait becomes the contract's ABI, and a README carrying the deployment it produced — the Sepolia contract address, class hash and owner, with a Starkscan link — followed by the exact `sncast` commands that got there. Its subject is the shape of a contract and the toolchain around it, not a financial design.

## How it works

The storage struct in `src/vault.cairo` holds `owner: ContractAddress`, `balances: Map<ContractAddress, u256>`, and `total_deposits: u256`. `deposit` asserts that the amount is positive with the message `'Amount must be positive'`, reads the caller from `get_caller_address()`, adds the amount to that caller's entry and to the total, then emits `Deposit { user, amount }` with `user` marked `#[key]` so it can be filtered. `withdraw` reads the current balance, asserts the same positivity, asserts `current_balance >= amount` with `'Insufficient balance'`, subtracts from both the balance and the total, and emits `Withdrawal`.

The three getters — `get_balance(account)`, `get_total_deposits()`, `get_owner()` — are read-only storage reads. The constructor takes the owner address and writes it alongside a zeroed total, so the contract's owner is fixed at deploy time and cannot be changed afterwards.

`Scarb.toml` names the package `hello_world` and targets `starknet-contract` with `casm = true` and `sierra-replace-ids = true`, which is what makes `scarb build` emit both the Sierra and the CASM class along with the ABI. The dependency declaration is `starknet = "2.14.0"`, and the edition is `2024_07`.

## Run it

```bash
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh
scarb build
```

The compiled contract lands in `target/dev/`. To put it on Sepolia, the README installs Starknet Foundry and then:

```bash
snfoundryup
sncast account create --name myaccount --type oz --network sepolia
sncast account deploy --name myaccount --network sepolia
sncast --account myaccount declare --contract-name Vault --network sepolia
sncast --account myaccount deploy --class-hash <CLASS_HASH> --arguments '<OWNER_ADDRESS>' --network sepolia
sncast --account myaccount invoke --contract-address <CONTRACT_ADDRESS> --function deposit --arguments '100, 0' --network sepolia
```

The account has to be funded between the create and the deploy steps; the README points at two Sepolia faucets. The `'100, 0'` argument is a `u256` given as its two field elements, low then high, which is why 100 is written that way and a withdraw of 50 reads `'50, 0'`.

## Caveats

The vault does not move tokens. A deposit writes a number into the map and adds it to the total, and no call anywhere transfers STRK or an ERC-20 — there is no token address in storage, no dispatcher, and no balance check against anything external. A caller's "deposit" is a claim it makes about itself, so the contract is an accounting exercise rather than a vault.

There are no tests: no `tests/` directory and no test module in either source file, so the two assertions and the event payloads are unexercised outside the README's manual `sncast` calls. `owner` is written by the constructor and read by `get_owner`, and nothing else consults it — there is no privileged function and no access control to exercise. The package is still called `hello_world`, and the README's project-structure block still shows a `cairo_hello_world/` directory that does not exist in the repository.

The README's own troubleshooting is worth reading before deploying: as of Starknet v0.14.1 CASM class hashes use Blake rather than Poseidon, so declaring with `starkli` fails and `sncast` is required; `starkli 0.4.2` pairs with RPC v0.8.1 while `sncast 0.54.0` pairs with v0.10.0; and the BlastAPI endpoints the README once used are gone. Nothing in the repository pins a Scarb version, so which Scarb compiles this edition is unrecorded.
