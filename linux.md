● Phase 0 is done on my side. Committed. Here's what's left and exactly how
  to do it:

  Status

  ┌───────────────────────────────────────────────────┬───────────────────┐
  │                   Phase 0 item                    │      Status       │
  ├───────────────────────────────────────────────────┼───────────────────┤
  │ Monorepo scaffold (package.json,                  │ ✅                │
  │ pnpm-workspace.yaml)                              │                   │
  ├───────────────────────────────────────────────────┼───────────────────┤
  │ .gitignore (excludes env, keypairs, Claude local  │ ✅                │
  │ settings)                                         │                   │
  ├───────────────────────────────────────────────────┼───────────────────┤
  │ Git repo initialized, scaffold committed          │ ✅                │
  ├───────────────────────────────────────────────────┼───────────────────┤
  │ Supabase / Helius / Privy / LP Agent creds in     │ ✅                │
  │ .env.local + verified live                        │                   │
  ├───────────────────────────────────────────────────┼───────────────────┤
  │ specs/ref/lpagent-llms.txt (7.3 KB)               │ ✅                │
  ├───────────────────────────────────────────────────┼───────────────────┤
  │ Toolchain (Rust / Solana CLI / Anchor / Node /    │ ⏳ you            │
  │ pnpm)                                             │                   │
  ├───────────────────────────────────────────────────┼───────────────────┤
  │ Dev wallet keypair + devnet airdrop               │ ⏳ you (needs     │
  │                                                   │ toolchain)        │
  ├───────────────────────────────────────────────────┼───────────────────┤
  │ Scoring oracle Ed25519 keypair                    │ ⏳ you (needs     │
  │                                                   │ toolchain)        │
  └───────────────────────────────────────────────────┴───────────────────┘

  Your turn: WSL + toolchain (~45 min, half of that waiting)

  1. Install WSL — open PowerShell as Administrator, run:

  wsl --install -d Ubuntu

  Reboot when it tells you. On first launch of Ubuntu it'll ask for a UNIX
  username + password — pick anything, you'll need the password for sudo.

  2. Inside the Ubuntu shell, copy-paste this whole block:

  # System deps
  sudo apt update && sudo apt install -y build-essential pkg-config
  libssl-dev libudev-dev curl git

  # Rust
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"

  # Solana CLI (Agave fork, 1.18 series)
  sh -c "$(curl -sSfL https://release.anza.xyz/v1.18.26/install)"
  echo 'export
  PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >>
  ~/.bashrc
  export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

  # Anchor via avm
  cargo install --git https://github.com/coral-xyz/anchor avm --locked
  --force
  avm install 0.30.1
  avm use 0.30.1

  # Node 20 + pnpm via nvm
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh |
  bash
  export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && .
  "$NVM_DIR/nvm.sh"
  nvm install 20 && nvm use 20
  npm install -g pnpm

  # Sanity check
  rustc --version && solana --version && anchor --version && node -v && pnpm
  -v

  All five version lines should print without errors.

  3. Copy the project into WSL native FS (faster builds than /mnt/e/):

  mkdir -p ~/projects
  cp -r /mnt/e/20-days-20-apps/lptrack ~/projects/lp-arena
  cd ~/projects/lp-arena

  4. Dev wallet + airdrop:

  solana-keygen new --outfile ~/.config/solana/id.json --no-bip39-passphrase
  solana config set -u devnet
  solana address        # save this — it's your admin pubkey
  solana airdrop 5      # retry if throttled; https://faucet.solana.com as
  backup
  solana balance

  5. Generate scoring oracle + protocol fee vault keypairs:

  solana-keygen new --outfile ./keypairs/scoring-oracle.json
  --no-bip39-passphrase
  solana-keygen new --outfile ./keypairs/protocol-fee-vault.json
  --no-bip39-passphrase
  solana-keygen pubkey ./keypairs/scoring-oracle.json         # note this
  solana-keygen pubkey ./keypairs/protocol-fee-vault.json     # note this

  6. Then restart Claude Code from inside WSL so I can run anchor build /
  anchor test directly:

  cd ~/projects/lp-arena
  claude    # if you've installed Claude Code in WSL; otherwise keep this
  session and I'll work blind-ish for code edits

  When you're back, paste me:
  - Output of the five version lines from step 2
  - The three pubkeys from step 4 + step 5
  - Confirmation that solana balance shows ≥ 1 SOL

  Then I'll fix the Phase 1 program bugs from the review, write the 7 Anchor
  test suites, and drive it to anchor test green — in that order.

✻ Worked for 4m 8s

※ recap: Building LP Arena for the LP Agent hackathon; Phase 0 scaffold is
  committed and all service keys verified, now blocked on you installing WSL
  and the Solana/Anchor toolchain. Next: run the WSL install and toolchain
  setup block I posted, then paste back the version output and generated
  pubkeys. (disable recaps in /config)

─────────────────────────────────────────────────────────────────────────────
❯  
─────────────────────────────────────────────────────────────────────────────
  ⏵⏵ accept edits on (shift+tab to cycle)
  When you're back, paste me:
  - Output of the five version lines from step 2
  - The three pubkeys from step 4 + step 5
  - Confirmation that solana balance shows ≥ 1 SOL

  Then I'll fix the Phase 1 program bugs from the review, write the 7 Anchor test suites, and
  drive it to anchor test green — in that order.

✻ Worked for 4m 8s

※ recap: Building LP Arena for the LP Agent hackathon; Phase 0 scaffold is committed and all
  service keys verified, now blocked on you installing WSL and the Solana/Anchor toolchain. Next:
  run the WSL install and toolchain setup block I posted, then paste back the version output and
  generated pubkeys. (disable recaps in /config)