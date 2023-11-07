# web3-react-magic-universal-wallet

[Magic Universal Wallet](https://magic.link/docs/wallets/wallet-types#universal-wallet) connector for [web3-react](https://github.com/Uniswap/web3-react).

## Install

```bash
npm install @magiclabs/web3-react
```

## Usage

```ts
import { initializeConnector } from "@web3-react/core";
import { MagicUniversalConnector } from "@magiclabs/web3-react";

// Initialize the MagicUniversalConnector
export const [magicConnector, hooks] =
  initializeConnector<MagicUniversalConnector>(
    (actions) =>
      new MagicUniversalConnector({
        actions,
        options: {
          apiKey: "pk_live_5D6B70DDBFDD649A", // Magic Universal Wallet Publishable API key
          networkOptions: {
            rpcUrl:
              "https://goerli.infura.io/v3/84842078b09946638c03157f83405213", // RPC URL
            chainId: 5, // Chain ID for network
          },
        },
      })
  );
```

## Nextjs Example

Nextjs example usage [here](https://github.com/Unboxed-Software/web3-react-magic-connect-nextjs)
