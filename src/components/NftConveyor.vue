<template>
  <div 
    class="nft-conveyor"
    v-if="isConnected && (warpBoisCount > 0 || tacCount > 0)"
  >
    <pre class="debug-info" style="position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.8); color: #42b983; padding: 10px; font-size: 12px;">
      Connected: {{ isConnected }}
      Warp Bois: {{ warpBoisCount }}
      TAC: {{ tacCount }}
      NFTs Length: {{ nftList.length }}
    </pre>

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

const supabaseUrl = process.env.VUE_APP_SUPABASE_URL
const supabaseAnonKey = process.env.VUE_APP_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseAnonKey ? 'exists' : 'missing')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

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
  created() {
    console.log('NftConveyor created with props:', {
      isConnected: this.isConnected,
      walletAddress: this.walletAddress,
      warpBoisCount: this.warpBoisCount,
      tacCount: this.tacCount
    })
  },
  mounted() {
    console.log('NftConveyor mounted')
    this.logVisibilityState()
  },
  methods: {
    logVisibilityState() {
      console.log('Visibility check:', {
        isConnected: this.isConnected,
        warpBoisCount: this.warpBoisCount,
        tacCount: this.tacCount,
        shouldShow: this.isConnected && (this.warpBoisCount > 0 || this.tacCount > 0),
        nftListLength: this.nftList.length
      })
    },
    async fetchNFTs() {
      try {
        const response = await fetch(
          `https://api.pallet.exchange/api/v1/user/${this.walletAddress}?network=mainnet&include_tokens=true&include_bids=true&fetch_nfts=true`
        )

        // Handle 404 and other error status codes gracefully
        if (!response.ok) {
          console.log(`No NFTs found or API error (${response.status}), skipping NFT conveyor`)
          this.nftList = []
          return
        }

        // Try to parse JSON only if we got a successful response
        try {
          const data = await response.json()
          this.nftList = data.nfts?.filter(nft => 
            nft.collection_address === import.meta.env.VITE_WARP_BOIS_ADDRESS ||
            nft.collection_address === import.meta.env.VITE_TAC_ADDRESS
          ) || []
        } catch (jsonError) {
          console.log('Invalid JSON response from Pallet API, skipping NFT conveyor')
          this.nftList = []
        }

      } catch (error) {
        console.log('Error fetching NFTs for conveyor:', error)
        this.nftList = []
      }
    }
  },
  watch: {
    walletAddress: {
      immediate: true,
      handler(newAddress) {
        if (newAddress) {
          this.fetchNFTs().catch(error => {
            console.log('Failed to fetch NFTs for conveyor:', error)
            this.nftList = []
          })
        } else {
          this.nftList = []
        }
      }
    },
    isConnected(newVal) {
      console.log('Connection state changed:', newVal)
      this.logVisibilityState()
    },
    warpBoisCount(newVal) {
      console.log('Warp Bois count changed:', newVal)
      this.logVisibilityState()
    },
    tacCount(newVal) {
      console.log('TAC count changed:', newVal)
      this.logVisibilityState()
    }
  }
}
</script>

<style scoped>
.nft-conveyor {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 80px;
  background: rgba(28, 28, 28, 0.95);
  overflow: hidden;
  z-index: 999;
  display: flex;
  border-bottom: 1px solid rgba(66, 185, 131, 0.3);
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
  color: var(--primary-text);
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

.debug-info {
  z-index: 1000;
  font-family: monospace;
  white-space: pre;
  margin: 0;
}
</style> 