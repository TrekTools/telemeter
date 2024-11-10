<template>
  <div v-if="hasRequiredNFT" class="nft-analysis">
    <h1>NFT Analysis</h1>
    
    <div class="search-section">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="Search by wallet label, address, or NFT name..."
        class="search-input"
      >
    </div>
    
    <div v-for="wallet in filteredWallets" :key="wallet.sei_hash" class="wallet-section">
      <div class="wallet-header" @click="toggleWallet(wallet.sei_hash)">
        <div class="header-content">
          <span class="collapse-arrow" :class="{ 'collapsed': collapsedWallets[wallet.sei_hash] }">
            ▼
          </span>
          <span class="wallet-label">
            {{ wallet.label || truncateAddress(wallet.sei_hash) }}
          </span>
          <span class="evm-address">(EVM: {{ truncateAddress(wallet.evm_hash) }})</span>
          <span class="nft-count">NFTs: {{ wallet.nfts?.length || 0 }}</span>
        </div>
      </div>
      
      <div class="nft-container" v-show="!collapsedWallets[wallet.sei_hash]">
        <div class="nft-grid">
          <div v-for="nft in filteredNFTs(wallet.nfts)" :key="nft.name" class="nft-card">
            <img :src="nft.image" :alt="nft.name" class="nft-image">
            <div class="nft-info">
              <span class="nft-name">{{ nft.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading NFTs...</div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
  <div v-else class="access-denied">
    <h2>Access Denied</h2>
    <p>You need to own a Warp Boi or Trek Access Chit to view this page.</p>
  </div>
</template>

<script>
import supabase from '../supabase'

export default {
  name: 'NftAnalysis',
  props: {
    walletAddress: String
  },
  data() {
    return {
      linkedWallets: [],
      loading: true,
      error: null,
      collapsedWallets: {},
      searchQuery: ''
    }
  },
  computed: {
    hasRequiredNFT() {
      const warpBoisCount = parseInt(localStorage.getItem('warpBoisCount') || '0');
      const tacCount = parseInt(localStorage.getItem('tacCount') || '0');
      return warpBoisCount > 0 || tacCount > 0;
    },
    filteredWallets() {
      if (!this.searchQuery) return this.linkedWallets

      const query = this.searchQuery.toLowerCase()
      return this.linkedWallets.filter(wallet => {
        // Search in wallet details
        const walletMatches = (
          (wallet.label && wallet.label.toLowerCase().includes(query)) ||
          wallet.sei_hash.toLowerCase().includes(query) ||
          (wallet.evm_hash && wallet.evm_hash.toLowerCase().includes(query))
        )

        // Search in NFT names
        const nftMatches = wallet.nfts?.some(nft => 
          nft.name.toLowerCase().includes(query)
        )

        return walletMatches || nftMatches
      })
    }
  },
  methods: {
    truncateAddress(address) {
      if (!address) return ''
      return `${address.slice(0, 4)}...${address.slice(-4)}`
    },
    async fetchLinkedWallets() {
      try {
        const { data, error } = await supabase
          .from('linked_wallets')
          .select('*')
          .eq('control_sei_hash', this.walletAddress)

        if (error) throw error

        // Initialize NFTs array for each wallet
        this.linkedWallets = data.map(wallet => ({
          ...wallet,
          nfts: []
        }))

        // Fetch NFTs for each wallet
        await Promise.all(
          this.linkedWallets.map(wallet => this.fetchNFTsForWallet(wallet))
        )
      } catch (error) {
        console.error('Error fetching linked wallets:', error)
        this.error = 'Failed to fetch linked wallets'
      } finally {
        this.loading = false
      }
    },
    async fetchNFTsForWallet(wallet) {
      try {
        const response = await fetch(
          `https://api.pallet.exchange/api/v1/user/${wallet.sei_hash}?network=mainnet&include_tokens=true&include_bids=true`
        )
        const data = await response.json()
        
        if (data.nfts) {
          // Find and update the wallet in linkedWallets array
          const walletIndex = this.linkedWallets.findIndex(w => w.sei_hash === wallet.sei_hash)
          if (walletIndex !== -1) {
            this.linkedWallets[walletIndex].nfts = data.nfts
          }
        }
      } catch (error) {
        console.error(`Error fetching NFTs for wallet ${wallet.sei_hash}:`, error)
      }
    },
    toggleWallet(seiHash) {
      this.collapsedWallets[seiHash] = !this.collapsedWallets[seiHash]
    },
    filteredNFTs(nfts) {
      if (!this.searchQuery || !nfts) return nfts
      
      const query = this.searchQuery.toLowerCase()
      return nfts.filter(nft => 
        nft.name.toLowerCase().includes(query)
      )
    }
  },
  async created() {
    if (this.walletAddress) {
      await this.fetchLinkedWallets()
    }
  },
  watch: {
    walletAddress: {
      immediate: true,
      handler(newAddress) {
        if (newAddress) {
          this.fetchLinkedWallets()
        }
      }
    }
  }
}
</script>

<style scoped>
.nft-analysis {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.wallet-section {
  margin-bottom: 20px;
  background: #2c2c2c;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s ease;
}

.wallet-header {
  color: #42b983;
  margin-bottom: 20px;
  font-family: 'Source Code Pro', monospace;
  cursor: pointer;
  user-select: none;
  padding: 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.wallet-header:hover {
  background-color: #1a1a1a;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.collapse-arrow {
  display: inline-block;
  transition: transform 0.3s ease;
  font-size: 0.8em;
  width: 20px;
}

.collapse-arrow.collapsed {
  transform: rotate(-90deg);
}

.wallet-label {
  font-weight: bold;
}

.nft-container {
  transition: max-height 0.3s ease-out;
  overflow: hidden;
}

.evm-address {
  color: #666;
  font-size: 0.9em;
}

.nft-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 20px;
  margin-top: 20px;
}

.nft-card {
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;
}

.nft-card:hover {
  transform: translate(0, -5px);
}

.nft-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.nft-info {
  padding: 10px;
}

.nft-name {
  font-size: 1.2em;
  font-weight: bold;
}

.access-denied {
  text-align: center;
  padding: 20px;
  color: #ff4444;
  background-color: #2c2c2c;
  border-radius: 8px;
  margin: 20px auto;
  max-width: 800px;
}

.nft-count {
  color: #42b983;
  font-size: 0.9em;
  margin-left: auto;
  padding: 4px 8px;
  background: rgba(66, 185, 131, 0.1);
  border-radius: 4px;
}

.search-section {
  margin-bottom: 20px;
  padding: 20px;
  background: #2c2c2c;
  border-radius: 8px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.search-input {
  width: 90%;
  padding: 12px;
  background: #1a1a1a;
  border: 1px solid #42b983;
  border-radius: 4px;
  color: #ffffff;
  font-size: 1em;
  font-family: 'Source Code Pro', monospace;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3aa876;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

.search-input::placeholder {
  color: #666;
}
</style>