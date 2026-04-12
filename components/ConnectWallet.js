'use client'
import { useState, useEffect } from 'react' // 1. Add these
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

export default function ConnectWallet() {
  const [mounted, setMounted] = useState(false) // 2. Track mounting
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  // 3. Set mounted to true after the component loads
  useEffect(() => {
    setMounted(true)
  }, [])

  // 4. Return null or a placeholder while the server is thinking
  if (!mounted) return null 

  if (isConnected) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-green-400 font-mono text-sm">
          Connected: {address?.slice(0,6)}...{address?.slice(-4)}
        </p>
        <button onClick={() => disconnect()} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-white font-bold transition">
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button 
      onClick={() => connect({ connector: injected() })} 
      className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-lg text-white font-bold transition shadow-lg"
    >
      Connect MetaMask
    </button>
  )
}