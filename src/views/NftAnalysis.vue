<template>
  <div v-if="hasRequiredNFT" class="nft-analysis" ref="nftAnalysis">
    <h1>NFTs</h1>
    
    <div class="view-controls">
      <button 
        :class="['view-button', { active: viewMode === 'wallet' }]" 
        @click="viewMode = 'wallet'"
      >
        Group by Wallet
      </button>
      <button 
        :class="['view-button', { active: viewMode === 'collection' }]" 
        @click="viewMode = 'collection'"
      >
        Group by Collection
      </button>
    </div>

    <div class="search-section">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="Search by wallet label, address, or NFT name..."
        class="search-input"
      >
    </div>
    
    <!-- Wallet View -->
    <div v-if="viewMode === 'wallet'">
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
            <div v-for="nft in filteredNFTs(wallet.nfts)" :key="nft.name" class="nft-card" :class="{ 'selected': selectedNft === nft }" @click="(event) => selectNft(nft, event)">
              <img :src="nft.image" :alt="nft.name" class="nft-image">
              <div class="nft-info">
                <span class="nft-name">{{ nft.name }}</span>
                <div v-if="nft.collection_stats" class="floor-price">
                  Floor: {{ nft.collection_stats.current_floor_1h }} $SEI
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Collection View -->
    <div v-else>
      <div v-for="(nfts, collectionName) in filteredCollections" :key="collectionName" class="wallet-section">
        <div class="wallet-header" @click="toggleCollection(collectionName)">
          <div class="header-content">
            <span class="collapse-arrow" :class="{ 'collapsed': collapsedCollections[collectionName] }">
              ▼
            </span>
            <span class="wallet-label">{{ collectionName }}</span>
            <div class="collection-stats">
              <span class="stat-item">
                <span class="stat-label">NFTs:</span>
                {{ nfts.length }}
              </span>
              <span class="stat-item">
                <span class="stat-label">Floor:</span>
                {{ nfts[0]?.collection_stats?.current_floor_1h || 0 }} $SEI
              </span>
              <span class="stat-item">
                <span class="stat-label">Volume:</span>
                {{ formatNumber(nfts[0]?.collection_stats?.current_volume_1h) }} $SEI
              </span>
              <span class="stat-item">
                <span class="stat-label">Owners:</span>
                {{ nfts[0]?.collection_stats?.current_owners_1h || 0 }}
              </span>
              <span class="stat-item">
                <span class="stat-label">Listings:</span>
                {{ nfts[0]?.collection_stats?.current_auction_count_1h || 0 }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="nft-container" v-show="!collapsedCollections[collectionName]">
          <div class="nft-grid">
            <div v-for="nft in nfts" :key="nft.name" class="nft-card" :class="{ 'selected': selectedNft === nft }" @click="(event) => selectNft(nft, event)">
              <img :src="nft.image" :alt="nft.name" class="nft-image">
              <div class="nft-info">
                <span class="nft-name">{{ nft.name }}</span>
                <div v-if="nft.collection_stats" class="floor-price">
                  Floor: {{ nft.collection_stats.current_floor_1h }} $SEI
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="access-denied">
    <h2>Access Denied</h2>
    <p>You need to own a Warp Boi or Trek Access Chit to view this page.</p>
  </div>
  <div v-if="selectedNft" class="nft-popup" :style="popupStyle">
    <div class="popup-content">
      <h3>Actions</h3>
      <div class="marketplace-links">
        <a href="#" @click.prevent="openPallet(selectedNft)" class="marketplace-link">
          List on Pallet
        </a>
        <a href="#" @click.prevent="tweetNft(selectedNft)" class="marketplace-link">
          Tweet about this NFT
        </a>
        <a href="#" @click.prevent="viewOnSeitrace(selectedNft)" class="marketplace-link">
          View Token via Contract
        </a>
        <a href="#" @click.prevent="copyWalletAddress(selectedNft)" class="marketplace-link">
          {{ copyButtonText }}
        </a>
      </div>
    </div>
  </div>
</template>

<script>
import supabase from '../supabase'
import { inject } from 'vue'

const HASURA_ENDPOINT = process.env.VUE_APP_GRAPHQL_ENDPOINT // Add this to your .env

export default {
  name: 'NftAnalysis',
  props: {
    walletAddress: String,
    warpBoisCount: {
      type: Number,
      default: 0
    },
    tacCount: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      linkedWallets: [],
      loading: true,
      error: null,
      collapsedWallets: {},
      searchQuery: '',
      viewMode: 'wallet',
      collapsedCollections: {},
      isDataCached: false,
      selectedNft: null,
      popupPosition: { x: 0, y: 0 },
      copyButtonText: 'Copy Wallet Address'
    }
  },
  computed: {
    hasRequiredNFT() {
      return this.warpBoisCount > 0 || this.tacCount > 0;
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
    },
    groupedByCollection() {
      const allNfts = this.linkedWallets.flatMap(wallet => wallet.nfts || [])
      return allNfts.reduce((groups, nft) => {
        // Use the name from collection_stats (GQL response)
        const collectionName = nft.collection_stats?.name || nft.collection?.name || 'Unknown Collection'
        if (!groups[collectionName]) {
          groups[collectionName] = []
        }
        groups[collectionName].push(nft)
        return groups
      }, {})
    },
    filteredCollections() {
      const collections = this.groupedByCollection
      if (!this.searchQuery) return collections

      const query = this.searchQuery.toLowerCase()
      const filtered = {}

      Object.entries(collections).forEach(([collectionName, nfts]) => {
        // Search in collection name
        const collectionMatches = collectionName.toLowerCase().includes(query)
        
        // Search in NFT names
        const filteredNfts = nfts.filter(nft => 
          nft.name.toLowerCase().includes(query)
        )

        if (collectionMatches || filteredNfts.length > 0) {
          filtered[collectionName] = collectionMatches ? nfts : filteredNfts
        }
      })

      return filtered
    },
    totalNftValue() {
      return this.linkedWallets.reduce((total, wallet) => {
        const walletValue = parseFloat(this.calculateWalletValue(wallet.nfts))
        return total + walletValue
      }, 0)
    },
    popupStyle() {
      return {
        position: 'absolute',
        left: `${this.popupPosition.x}px`,
        top: `${this.popupPosition.y}px`
      }
    }
  },
  methods: {
    truncateAddress(address) {
      if (!address) return ''
      return `${address.slice(0, 4)}...${address.slice(-4)}`
    },
    async fetchLinkedWallets() {
      // Check cache first
      const cachedData = sessionStorage.getItem('nftAnalysisCache')
      if (cachedData && this.isDataCached) {
        console.log('Loading from cache')
        const parsed = JSON.parse(cachedData)
        this.linkedWallets = parsed.linkedWallets
        this.collapsedWallets = parsed.collapsedWallets
        this.viewMode = parsed.viewMode
        this.searchQuery = parsed.searchQuery
        return
      }

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

        // Cache the data after fetching
        this.cacheData()
        this.isDataCached = true
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
                  slug
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
    },
    toggleCollection(collectionName) {
      this.collapsedCollections[collectionName] = !this.collapsedCollections[collectionName]
    },
    formatNumber(value) {
      if (!value) return '0.00'
      return Number(value).toFixed(2)
    },
    cacheData() {
      const dataToCache = {
        linkedWallets: this.linkedWallets,
        collapsedWallets: this.collapsedWallets,
        viewMode: this.viewMode,
        searchQuery: this.searchQuery
      }
      sessionStorage.setItem('nftAnalysisCache', JSON.stringify(dataToCache))
    },
    clearCache() {
      sessionStorage.removeItem('nftAnalysisCache')
      this.isDataCached = false
    },
    changeViewMode(mode) {
      if (mode === 'wallet' || mode === 'collection') {
        this.viewMode = mode
        // Update cache
        this.cacheData()
      }
    },
    selectNft(nft, event) {
      if (this.selectedNft === nft) {
        this.selectedNft = null;
        return;
      }
      
      this.selectedNft = nft;
      
      const rect = event.target.closest('.nft-card').getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      this.popupPosition = {
        x: rect.right + 10,
        y: rect.top + scrollTop
      };
      
      const popup = document.querySelector('.nft-popup');
      if (popup) {
        const popupRect = popup.getBoundingClientRect();
        if (rect.right + 10 + popupRect.width > window.innerWidth) {
          this.popupPosition.x = rect.left - popupRect.width - 10;
        }
      }
      this.copyButtonText = 'Copy Wallet Address';
    },
    openPallet(nft) {
      console.log('NFT object:', nft); // Debug: see the NFT structure
      const collectionSlug = nft.collection_stats?.slug;
      const tokenId = nft.token_id || nft.tokenId || nft.id;
      
      if (!collectionSlug || !tokenId) {
        console.error('Missing required NFT data:', { collectionSlug, tokenId });
        return;
      }
      
      const url = `https://pallet.exchange/collection/${collectionSlug}/${tokenId}`;
      window.open(url, '_blank');
    },
    
    tweetNft(nft) {
      const tweetText = `Check out my NFT: ${nft.name}`;
      const imageUrl = encodeURIComponent(nft.image);
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${imageUrl}`;
      window.open(tweetUrl, '_blank');
    },
    
    viewOnSeitrace(nft) {
      const collectionAddress = nft.collection?.evm_address;
      const tokenId = nft.token_id || nft.tokenId || nft.id;
      
      if (!collectionAddress || !tokenId) {
        console.error('Missing required NFT data:', { collectionAddress, tokenId });
        return;
      }
      
      const url = `https://seitrace.com/token/${collectionAddress}/instance/${tokenId}?chain=pacific-1`;
      window.open(url, '_blank');
    },
    copyWalletAddress(nft) {
      const wallet = this.linkedWallets.find(w => 
        w.nfts?.some(n => n === nft)
      );
      
      if (wallet?.evm_hash) {
        navigator.clipboard.writeText(wallet.evm_hash)
          .then(() => {
            this.copyButtonText = 'Copied!';
            setTimeout(() => {
              this.copyButtonText = 'Copy Wallet Address';
            }, 2000); // Reset after 2 seconds
          })
          .catch(err => {
            console.error('Failed to copy address:', err);
          });
      } else {
        console.error('Could not find wallet address for this NFT');
      }
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
  },
  updated() {
    this.cacheData()
  },
  setup() {
    const tokenValue = inject('tokenValue', 0)
    
    return {
      receivedTokenValue: tokenValue
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
  padding: 8px 16px;
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
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.nft-card {
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s ease, transform 0.2s;
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
  display: flex;
  gap: 16px;
  margin-left: auto;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #42b983;
  font-size: 0.9em;
  padding: 4px 8px;
  background: rgba(66, 185, 131, 0.1);
  border-radius: 4px;
}

.stat-label {
  color: #666;
  font-size: 0.9em;
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

.view-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.view-button {
  padding: 8px 16px;
  background: #2c2c2c;
  border: 1px solid #42b983;
  border-radius: 4px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-button.active {
  background: #42b983;
  color: #1a1a1a;
}

.view-button:hover {
  background: #3aa876;
  color: #1a1a1a;
}

/* Add mobile-specific styles */
@media (max-width: 768px) {
  .nft-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .nft-image {
    height: 150px; /* Smaller images on mobile */
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .collection-stats, .wallet-stats {
    margin-left: 0;
    margin-top: 8px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .stat-item {
    font-size: 0.8em;
    padding: 2px 6px;
  }

  .nft-info {
    padding: 8px;
  }

  .nft-name {
    font-size: 1em;
  }

  .search-input {
    width: 100%;
    padding: 8px;
  }

  .search-section {
    padding: 10px;
  }

  .wallet-section {
    padding: 10px;
  }
}

/* Add tablet-specific styles */
@media (min-width: 769px) and (max-width: 1024px) {
  .nft-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.nft-card.selected {
  border-color: gold;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.nft-card:hover:not(.selected) {
  border-color: rgba(255, 215, 0, 0.5);
}

.nft-popup {
  position: absolute;
  background: #2c2c2c;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  border: 1px solid #42b983;
  max-width: 300px;
}

.popup-content h3 {
  margin: 0 0 8px 0;
  color: #42b983;
  font-size: 1.1em;
}

.marketplace-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.marketplace-link {
  padding: 6px 12px;
  background: #1a1a1a;
  border-radius: 4px;
  color: #fff;
  text-decoration: none;
  transition: all 0.2s ease;
}

.marketplace-link:hover {
  background: #42b983;
  color: #1a1a1a;
  transform: translateX(5px);
}

.marketplace-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

/* Add media query for mobile responsiveness */
@media (max-width: 768px) {
  .nft-popup {
    bottom: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
}
</style>