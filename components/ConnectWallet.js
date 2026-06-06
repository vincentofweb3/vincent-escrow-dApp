"use client";
import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export default function ConnectWallet() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // STEP 1: Wallet is Not Connected
  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: injected() })}
        className="bg-white text-black px-8 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-transform uppercase tracking-wider"
      >
        Connect Wallet
      </button>
    );
  }

  // STEP 2: Wallet is Connected (Shows profile data cleanly next to your custom actions)
  return (
    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-xs font-mono text-blue-400 font-bold">
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </span>
      <button
        onClick={() => disconnect()}
        className="text-[10px] font-black text-red-500 uppercase hover:text-red-400 ml-2 transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}

// "use client";
// import { useState, useEffect } from "react";
// import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
// import { injected } from "wagmi/connectors";

// export default function ConnectWallet() {
//   const [mounted, setMounted] = useState(false);
//   const { address, isConnected, chain } = useAccount();
//   const { connect } = useConnect();
//   const { disconnect } = useDisconnect();
//   const { switchChain } = useSwitchChain();

//   // MUST MATCH YOUR PROVIDER.JS ID EXACTLY
//   const ARC_TESTNET_ID = 5042002;

//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   if (!mounted) return null;

//   // STEP 1: If not connected at all
//   if (!isConnected) {
//     return (
//       <button
//         onClick={() => connect({ connector: injected() })}
//         className="bg-white text-black px-8 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-transform"
//       >
//         CONNECT WALLET
//       </button>
//     );
//   }

//   // STEP 2: If connected, but the Network ID is NOT Arc (e.g., it's Sei)
//   // This is the part that is currently being skipped in your code!
//   if (isConnected && chain?.id !== ARC_TESTNET_ID) {
//     return (
//       <button
//         onClick={async () => {
//           try {
//             // This triggers the MetaMask Popup
//             await switchChain({ chainId: ARC_TESTNET_ID });
//           } catch (error) {
//             // If the network isn't in their MetaMask, we force add it
//             if (window.ethereum) {
//               await window.ethereum.request({
//                 method: 'wallet_addEthereumChain',
//                 params: [{
//                   chainId: `0x${ARC_TESTNET_ID.toString(16)}`,
//                   chainName: 'Arc Network Testnet',
//                   nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
//                   rpcUrls: ['https://arc-testnet.drpc.org'],
//                   blockExplorerUrls: ['https://testnet.arcscan.app']
//                 }]
//               });
//             }
//           }
//         }}
//         className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-black text-xs animate-pulse border-2 border-white/20"
//       >
//         ⚠️ SWITCH TO ARC NETWORK
//       </button>
//     );
//   }

//   // STEP 3: Only if Connected AND on the right network, show the address
//   return (
//     <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
//       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
//       <span className="text-xs font-mono text-blue-400 font-bold">
//         {address?.slice(0, 6)}...{address?.slice(-4)}
//       </span>
//       <button
//         onClick={() => disconnect()}
//         className="text-[10px] font-black text-red-500 uppercase hover:text-red-400 ml-2"
//       >
//         Disconnect
//       </button>
//     </div>
//   );
// }
