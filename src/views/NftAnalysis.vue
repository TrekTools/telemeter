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
          <div class="wallet-stats">
            <span class="nft-count">NFTs: {{ wallet.nfts?.length || 0 }}</span>
            <span class="estimated-value">Est. Value: {{ calculateWalletValue(wallet.nfts) }} $SEI</span>
          </div>
        </div>
      </div>
      
      <div class="nft-container" v-show="!collapsedWallets[wallet.sei_hash]">
        <div class="nft-grid">
          <div v-for="nft in filteredNFTs(wallet.nfts)" :key="nft.name" class="nft-card">
            <img :src="nft.image" :alt="nft.name" class="nft-image">
            <div class="nft-info">
              <span class="nft-name">{{ nft.name }}</span>
              <div class="debug-info" style="color: red; font-size: 0.8em;">
                Slug: {{ nft.collection_slug }}
              </div>
              <div v-if="nft.collection_stats" class="floor-price">
                Floor: {{ nft.collection_stats.current_floor_1h }} $SEI
              </div>
              <div v-else class="floor-price">
                No stats available
              </div>
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

const HASURA_ENDPOINT = process.env.VUE_APP_GRAPHQL_ENDPOINT // Add this to your .env

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
        
        if (data.nfts && data.nfts.length > 0) {
          // Get unique EVM addresses
          const uniqueAddresses = [...new Set(data.nfts.map(nft => nft.collection?.evm_address))]
          console.log('Unique EVM addresses:', uniqueAddresses)
          
          // Fetch all collection stats in one query
          const collectionStats = await this.fetchCollectionStats(uniqueAddresses)
          console.log('Collection stats received:', collectionStats)

          // Create a map using EVM address as key
          const statsMap = {}
          collectionStats.forEach(stats => {
            if (stats && stats.evm_address) {
              statsMap[stats.evm_address] = stats
              console.log(`Mapping stats for address ${stats.evm_address}:`, stats)
            }
          })

          // Enrich NFT data with collection stats
          const enrichedNFTs = data.nfts.map(nft => {
            const stats = statsMap[nft.collection?.evm_address]
            console.log(`Enriching NFT ${nft.name} with stats:`, stats)
            return {
              ...nft,
              collection_stats: stats || null
            }
          })

          // Update the wallet's NFTs
          const walletIndex = this.linkedWallets.findIndex(w => w.sei_hash === wallet.sei_hash)
          if (walletIndex !== -1) {
            this.linkedWallets[walletIndex].nfts = enrichedNFTs
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
    },
    async fetchCollectionStats(evmAddresses) {
      try {
        console.log('Fetching stats for EVM addresses:', evmAddresses)
        
        const response = await fetch(HASURA_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': process.env.VUE_APP_HASURA_ADMIN_SECRET
          },
          body: JSON.stringify({
            query: `
              query collection_stats {
                pallet_time_comparison {
                  evm_address
                  name
                  current_floor_1h
                  volume_diff_1h
                  volume_percent_diff_1h
                  previous_volume_1h
                  previous_owners_1h
                  previous_floor_1h
                  previous_auction_count_1h
                  owners_percent_diff_1h
                  owners_diff_1h
                  floor_percent_diff_1h
                  floor_diff_1h
                  current_volume_1h
                  current_owners_1h
                  current_auction_count_1h
                  auction_count_percent_diff_1h
                  auction_count_diff_1h
                }
              }
            `
          })
        })
        
        const responseData = await response.json()
        console.log('GraphQL response:', responseData)
        return responseData.data?.pallet_time_comparison || []
      } catch (error) {
        console.error('Error in fetchCollectionStats:', error)
        return []
      }
    },
    calculateWalletValue(nfts) {
      if (!nfts) return '0'
      
      const total = nfts.reduce((sum, nft) => {
        // Make sure we're accessing the correct property path
        const floor = parseFloat(nft.collection_stats?.current_floor_1h) || 0
        return sum + floor
      }, 0)
      
      return total.toFixed(2)
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
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.collection-stats {
  margin-top: 8px;
  font-size: 0.9em;
  border-top: 1px solid #333;
  padding-top: 8px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.label {
  color: #666;
  min-width: 50px;
}

.value {
  color: #fff;
}

.diff {
  font-size: 0.8em;
  padding: 2px 4px;
  border-radius: 4px;
}

.diff.positive {
  color: #42b983;
  background: rgba(66, 185, 131, 0.1);
}

.diff.negative {
  color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

.wallet-stats {
  margin-left: auto;
  display: flex;
  gap: 12px;
  align-items: center;
}

.estimated-value {
  color: #42b983;
  font-size: 0.9em;
  padding: 4px 8px;
  background: rgba(66, 185, 131, 0.1);
  border-radius: 4px;
}

.floor-price {
  color: #42b983;
  font-size: 0.9em;
  margin-top: 8px;
  padding: 4px 8px;
  background: rgba(66, 185, 131, 0.1);
  border-radius: 4px;
  display: inline-block;
}
</style>