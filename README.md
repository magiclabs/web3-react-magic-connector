# web3-react-magic-connect

[Magic Connect](https://magic.link/docs/connect/overview) connector for [web3-react](https://github.com/Uniswap/web3-react).

## Install

```bash
npm install web3-react-magic
```

## Usage

```ts
import { initializeConnector } from "@web3-react/core"
import { MagicConnect } from "web3-react-magic"

// Initialize the MagicConnect connector
export const [magicConnect, hooks] = initializeConnector<MagicConnect>(
  (actions) =>
    new MagicConnect({
      actions,
      options: {
        apiKey: "pk_live_5D6B70DDBFDD649A", // Magic Connect Publishable API key
        networkOptions: {
          rpcUrl: "https://goerli.infura.io/v3/84842078b09946638c03157f83405213", // RPC URL
          chainId: 5, // Chain ID for network
        },
      },
    })
)
```

## Nextjs Example

Nextjs example usage [here](https://github.com/Unboxed-Software/web3-react-magic-connect-nextjs)
