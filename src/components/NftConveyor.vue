<template>
  <div class="nft-conveyor" v-if="isConnected && (warpBoisCount > 0 || tacCount > 0)">
    <div class="conveyor-title">
      <span class="title-text">Your NFTs:</span>
    </div>
    <div class="conveyor-content">
      <div class="conveyor-belt">
        <div class="nft-row">
          <div v-for="nft in nftList" :key="nft.id" class="nft-item">
            <img :src="nft.image" :alt="nft.name">
            <span class="nft-name">{{ nft.name }}</span>
          </div>
        </div>
        <!-- Duplicate for seamless loop -->
        <div class="nft-row">
          <div v-for="nft in nftList" :key="'dup-'+nft.id" class="nft-item">
            <img :src="nft.image" :alt="nft.name">
            <span class="nft-name">{{ nft.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VUE_APP_SUPABASE_URL
const supabaseAnonKey = process.env.VUE_APP_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseAnonKey ? 'exists' : 'missing')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

export default {
  name: 'NftConveyor',
  props: {
    isConnected: Boolean,
    walletAddress: String,
    warpBoisCount: Number,
    tacCount: Number
  },
  data() {
    return {
      nftList: []
    }
  },
  watch: {
    walletAddress: {
      immediate: true,
      handler: 'fetchNFTs'
    }
  },
  methods: {
    async fetchNFTs() {
      if (this.walletAddress) {
        try {
          const response = await fetch(`https://api.pallet.exchange/api/v1/user/${this.walletAddress}?network=mainnet&include_tokens=true&include_bids=true`);
          const data = await response.json();
          
          if (data.nfts) {
            this.nftList = data.nfts;
          }
        } catch (error) {
          console.error('Error fetching NFTs:', error);
        }
      }
    },
    async storeConnection(seiAddress, evmAddress) {
      try {
        const { data, error } = await supabase
          .from('wallet_connections')
          .insert([
            { 
              sei_address: seiAddress,
              evm_address: evmAddress
            }
          ])
        
        if (error) throw error
        console.log('Connection stored:', data)
      } catch (error) {
        console.error('Error storing connection:', error)
      }
    }
  }
}
</script>

<style scoped>
.nft-conveyor {
  position: fixed;
  bottom: 60px;
  left: 0;
  width: 100%;
  height: 80px;
  background: rgba(28, 28, 28, 0.9);
  overflow: hidden;
  z-index: 100;
  display: flex;
}

.conveyor-title {
  width: 12%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 2px solid #42b983;
  background: rgba(28, 28, 28, 0.95);
}

.title-text {
  color: #42b983;
  font-size: 1.2em;
  font-weight: bold;
  text-transform: uppercase;
  text-shadow: 0 0 10px rgba(66, 185, 131, 0.3);
}

.conveyor-content {
  width: 80%;
  overflow: hidden;
}

.conveyor-belt {
  display: flex;
  animation: scroll 30s linear infinite;
}

.nft-row {
  display: flex;
  gap: 20px;
  padding: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}

.nft-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
  flex-shrink: 0;
}

.nft-item img {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  object-fit: cover;
}

.nft-name {
  font-size: 0.8em;
  color: #42b983;
  margin-top: 4px;
}

@keyframes scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
</style> 