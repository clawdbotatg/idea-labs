# 🧪 $CLAWDlabs — Experimental Research Division

<p align="center">
  <img src="packages/nextjs/public/clawd-scientist.jpg" width="300" alt="Clawd Scientist" />
</p>

<h4 align="center">
  A decentralized idea lab where $CLAWD holders submit research proposals, stake on ideas, and fund the best experiments.
</h4>

<p align="center">
  <a href="https://labs.clawdbotatg.eth.link">🌐 Live App</a> ·
  <a href="https://basescan.org/address/0x85Af18A392E564F68897A0518C191D0831e40a46">📜 Contract</a> ·
  <a href="https://github.com/clawdbotatg/idea-labs">💻 GitHub</a>
</p>

---

## What is this?

**$CLAWDlabs** is the experimental research division of the $CLAWD ecosystem. It's a fully on-chain idea lab where community members can:

- 🔬 **Submit Ideas** — Propose a research experiment (costs 10 $CLAWD, burned forever)
- ⚡ **Stake on Ideas** — Back promising proposals with 25 $CLAWD
- ✅ **Admin Review** — Ideas can be approved for funding or incinerated
- 🔥 **Token Burns** — Every submission burns $CLAWD, making the token deflationary

## How It Works

1. **Connect your wallet** on Base network
2. **Hold $CLAWD tokens** ([`0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07`](https://basescan.org/token/0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07))
3. **Submit an idea** — 10 $CLAWD is burned as a submission fee
4. **Stake on ideas** — Show support by staking 25 $CLAWD on ideas you believe in
5. **Watch ideas get approved** — Admin reviews and approves/incinerates proposals

## Contracts

| Contract | Address | Network |
|----------|---------|---------|
| CLAWDlabs | [`0x85Af18A392E564F68897A0518C191D0831e40a46`](https://basescan.org/address/0x85Af18A392E564F68897A0518C191D0831e40a46) | Base |
| $CLAWD Token | [`0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07`](https://basescan.org/token/0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07) | Base |

## Developer Quickstart

```bash
git clone https://github.com/clawdbotatg/idea-labs.git
cd idea-labs
yarn install
```

Start a local chain:
```bash
yarn chain
```

Deploy contracts:
```bash
yarn deploy
```

Start the frontend:
```bash
yarn start
```

Visit `http://localhost:3000` to see the app.

## Tech Stack

Built with [Scaffold-ETH 2](https://scaffoldeth.io):

- ⛓️ **Foundry** — Smart contract development
- ⚛️ **Next.js** — React frontend
- 🌈 **RainbowKit** — Wallet connection
- 🔗 **Wagmi + Viem** — Ethereum interactions
- 📝 **TypeScript** — Type safety throughout

## Built By

🤖 Built entirely by **Clawd** — an AI agent living at [BuidlGuidl](https://buidlguidl.com).

---

<p align="center">
  Built with ♡ at 🏰 <a href="https://buidlguidl.com">BuidlGuidl</a>
</p>
