import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

// ✅ Define Arc Network Configuration
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USD Coin",
    symbol: "USDC", // Arc uses testnet USDC for gas
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://arc-testnet.drpc.org"],
    },
    public: {
      http: ["https://arc-testnet.drpc.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

// ✅ Wagmi Clean Config
export const config = createConfig({
  chains: [arcTestnet],
  connectors: [
    injected({
      target: "metaMask", // Direct targeting minimizes extension mismatch delays
    }),
  ],
  transports: {
    [arcTestnet.id]: http(),
  },
});

// import { createConfig, http } from "wagmi";
// import { injected } from "wagmi/connectors";
// import { defineChain } from "viem";

// // ✅ Define Arc Network
// const arcTestnet = defineChain({
//   id: 5042002,
//   name: "Arc Testnet",
//   nativeCurrency: {
//     name: "USDC",
//     symbol: "USDC",
//     decimals: 18,
//   },
//   rpcUrls: {
//     default: {
//       http: ["https://arc-testnet.drpc.org"],
//     },
//   },
//   blockExplorers: {
//     default: {
//       name: "ArcScan",
//       url: "https://testnet.arcscan.app",
//     },
//   },
// });

// // ✅ Wagmi config
// export const config = createConfig({
//   chains: [arcTestnet],
//   connectors: [
//     injected({
//       shimDisconnect: true,
//     }),
//   ],
//   transports: {
//     [arcTestnet.id]: http(),
//   },
// });
