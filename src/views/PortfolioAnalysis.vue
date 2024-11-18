<template>
  <div v-if="hasAccess" class="portfolio-analysis">
    <h1>Portfolio</h1>
    
    <ValueSummaryTiles 
      :token-value="totalTokenValue"
      :nft-value="totalNftValue"
      :delegation-value="delegationValue"
    />
    
    <div class="beta-notice">
      ⓘ Note: While beta evaluation is ongoing, token values are currently updated once per day.
    </div>
    
    <div class="search-container">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="Search tokens..."
        class="search-input"
      />
    </div>
    
    <div v-if="loading" class="loading">
      Loading portfolio data...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="token-table-container">
      <table class="token-table">
        <thead>
          <tr>
            <th @click="sort('walletLabel')" class="sortable">
              Wallet
              <span class="sort-indicator">{{ getSortIndicator('walletLabel') }}</span>
            </th>
            <th @click="sort('name')" class="sortable">
              Name
              <span class="sort-indicator">{{ getSortIndicator('name') }}</span>
            </th>
            <th @click="sort('type')" class="sortable">
              Type
              <span class="sort-indicator">{{ getSortIndicator('type') }}</span>
            </th>
            <th @click="sort('adjustedBalance')" class="sortable numeric">
              Balance
              <span class="sort-indicator">{{ getSortIndicator('adjustedBalance') }}</span>
            </th>
            <th @click="sort('priceUSD')" class="sortable numeric">
              Price (USD)
              <span class="sort-indicator">{{ getSortIndicator('priceUSD') }}</span>
            </th>
            <th @click="sort('calculatedValue')" class="sortable numeric">
              Value (USD)
              <span class="sort-indicator">{{ getSortIndicator('calculatedValue') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(token, index) in filteredAndSortedTokens" :key="token.address + '-' + index">
            <td>{{ token.walletLabel }}</td>
            <td>{{ token.name }}</td>
            <td>{{ token.type }}</td>
            <td>{{ formatNumber(token.adjustedBalance, 6) }}</td>
            <td>${{ formatNumber(token.priceUSD || 0, 6) }}</td>
            <td>${{ formatNumber(token.calculatedValue, 2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  
  <div v-else class="access-denied">
    <h2>Access Denied</h2>
    <p>You need one of the following to access this page:</p>
    <ul>
      <li>Own a Warp Boi NFT</li>
      <li>Own a Trek Access Chit NFT</li>
      <li>Hold at least 1,000,000 $WARP tokens</li>
    </ul>
  </div>
</template>

<script>
import supabase from '../supabase'
import ValueSummaryTiles from '@/components/ValueSummaryTiles.vue'

export default {
  name: 'PortfolioAnalysis',
  components: {
    ValueSummaryTiles
  },
  
  props: {
    hasAccess: {
      type: Boolean,
      required: true
    },
    warpBoisCount: {
      type: Number,
      default: 0
    },
    tacCount: {
      type: Number,
      default: 0
    },
    walletAddress: {
      type: String,
      required: true
    },
    evmAddress: {
      type: String,
      required: true
    }
  },

  data() {
    return {
      loading: true,
      error: null,
      tokens: [],
      prices: {},
      searchQuery: '',
      sortKey: 'calculatedValue',
      sortOrder: 'desc',
      internalWalletLabels: {},
      linkedWallets: [],
      seiUsdPrice: 0,
      delegations: [],
    }
  },

  computed: {
    tokensWithPrices() {
      return this.tokens.map(token => {
        const priceEntry = this.prices[token.address?.toLowerCase()]
        
        console.log('Token price lookup:', {
          token: token.name,
          address: token.address,
          priceFound: !!priceEntry,
          price: priceEntry?.PriceUSD
        })

        return {
          ...token,
          priceUSD: priceEntry?.PriceUSD || 0
        }
      })
    },
    filteredAndSortedTokens() {
      const query = this.searchQuery.trim().toLowerCase();

      let groupedTokens = this.tokensWithPrices.reduce((acc, token) => {
        const key = `${token.walletLabel.toLowerCase()}-${token.name.toLowerCase()}`;
        
        if (!acc[key]) {
          acc[key] = {
            walletLabel: token.walletLabel,
            name: token.name,
            types: new Set(),
            balances: [],
            calculatedValue: 0,
            priceUSD: 0,
            count: 0
          };
        }
        
        acc[key].types.add(token.type);
        
        // Get decimals from prices lookup
        const decimals = this.prices[token.address?.toLowerCase()]?.decimals;
        
        // Calculate adjusted balance with special handling
        let adjustedBalance = decimals !== undefined ? 
          parseFloat(token.value) / Math.pow(10, decimals) : 
          parseFloat(token.value);

        // Additional adjustment for YAKA and specific token
        if (token.name === 'YAKA' || 
            token.address?.toLowerCase() === '0x51121bcae92e302f19d06c193c95e1f7b81a444b'.toLowerCase()) {
          adjustedBalance = adjustedBalance / Math.pow(10, 12);
        }

        acc[key].balances.push(adjustedBalance);
        acc[key].calculatedValue += ((token.priceUSD || 0) * adjustedBalance);
        acc[key].priceUSD += (token.priceUSD || 0);
        acc[key].count++;
        
        return acc;
      }, {});

      // Convert to array and format with averages
      let result = Object.values(groupedTokens).map(group => ({
        walletLabel: group.walletLabel,
        name: group.name,
        type: Array.from(group.types).sort().join(', '),
        adjustedBalance: group.balances.reduce((sum, bal) => sum + bal, 0) / group.count,
        priceUSD: group.priceUSD / group.count,
        calculatedValue: group.calculatedValue / group.count
      }));

      // Apply search filter
      if (query) {
        result = result.filter(token => 
          token.name.toLowerCase().includes(query) ||
          token.walletLabel.toLowerCase().includes(query)
        );
      }

      // Sort the results
      result.sort((a, b) => {
        let aVal = a[this.sortKey];
        let bVal = b[this.sortKey];

        if (typeof aVal === 'string' && !isNaN(aVal)) aVal = Number(aVal);
        if (typeof bVal === 'string' && !isNaN(bVal)) bVal = Number(bVal);

        if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      return result;
    },
    totalTokenValue() {
      return this.filteredAndSortedTokens.reduce((sum, token) => {
        return sum + (token.calculatedValue || 0)
      }, 0)
    },
    seiPrice() {
      // Get SEI price from the existing prices data
      // Using the native SEI token address
      return this.prices['usei']?.PriceUSD || 0
    },
    totalNftValue() {
      const nftValueInSei = this.linkedWallets?.reduce((total, wallet) => {
        return total + this.calculateWalletValue(wallet.nfts)
      }, 0) || 0

      // Convert SEI value to USD
      return nftValueInSei * this.seiPrice
    },
    totalDelegationAmount() {
      return this.delegations.reduce((sum, delegation) => {
        if (delegation.denom === 'usei') {
          return sum + (parseFloat(delegation.amount) / 1000000)
        }
        return sum
      }, 0)
    },
    delegationValue() {
      return this.totalDelegationAmount * this.seiUsdPrice
    }
  },

  methods: {
    truncateAddress(address) {
      if (!address) return ''
      return `${address.slice(0, 6)}...${address.slice(-4)}`
    },

    formatNumber(num, decimals = 0) {
      if (!num) return '0'
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(num)
    },

    async fetchTokens(address, type) {
      try {
        const response = await fetch(`https://seitrace.com/pacific-1/gateway/api/v1/addresses/${address}/tokens?type=${type}`)
        const data = await response.json()
        return data.items || []
      } catch (error) {
        console.error(`Error fetching ${type} tokens:`, error)
        return []
      }
    },

    async fetchPrices() {
      try {
        // First get current_max
        const maxRecordResponse = await fetch(process.env.VUE_APP_GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': process.env.VUE_APP_HASURA_ADMIN_SECRET
          },
          body: JSON.stringify({
            query: `
              query mrn24 {
                max_record_24 {
                  current_max
                }
              }
            `
          })
        });
        
        const maxRecordJson = await maxRecordResponse.json();
        const currentMax = maxRecordJson.data.max_record_24[0].current_max;

        // Fetch both prices and decimals
        const response = await fetch(process.env.VUE_APP_GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': process.env.VUE_APP_HASURA_ADMIN_SECRET
          },
          body: JSON.stringify({
            query: `
              query latest_prices_and_decimals {
                token_prices(where: {record: {_eq: ${currentMax}}}) {
                  Token
                  PriceUSD
                }
                token_timeseries(distinct_on: address) {
                  address
                  decimals
                }
              }
            `
          })
        });
        
        const data = await response.json();
        if (data.errors) throw new Error(data.errors[0].message);
        
        // Create decimals lookup
        const decimalsLookup = data.data.token_timeseries.reduce((acc, item) => {
          acc[item.address.toLowerCase()] = item.decimals;
          return acc;
        }, {});

        // Create prices lookup with decimals
        this.prices = data.data.token_prices.reduce((acc, price) => {
          acc[price.Token.toLowerCase()] = {
            ...price,
            decimals: decimalsLookup[price.Token.toLowerCase()] || 6 // fallback to 6 if not found
          };
          return acc;
        }, {});

        console.log('Fetched prices and decimals:', this.prices);
      } catch (error) {
        console.error('Error fetching prices:', error);
        this.error = 'Failed to fetch price data';
      }
    },

    async fetchWalletLabels() {
      try {
        let query;
        if (this.walletAddress.startsWith('sei')) {
          query = supabase
            .from('linked_wallets')
            .select('sei_hash, evm_hash, label')
            .eq('control_sei_hash', this.walletAddress)
        } else if (this.walletAddress.startsWith('0x')) {
          query = supabase
            .from('linked_wallets')
            .select('sei_hash, evm_hash, label')
            .eq('control_evm_hash', this.walletAddress)
        }

        const { data, error } = await query
        if (error) throw error

        // Convert to lookup object for both SEI and EVM addresses
        this.internalWalletLabels = data.reduce((acc, wallet) => {
          acc[wallet.sei_hash] = wallet.label || `Wallet ${wallet.sei_hash.slice(0, 6)}`
          if (wallet.evm_hash) {
            acc[wallet.evm_hash] = wallet.label || `Wallet ${wallet.evm_hash.slice(0, 6)}`
          }
          return acc
        }, {})

        console.log('Fetched Labels:', data) // Debug log
        console.log('Processed Labels:', this.internalWalletLabels) // Debug log
      } catch (error) {
        console.error('Error fetching wallet labels:', error)
      }
    },

    async fetchNFTsForWallet(wallet) {
      try {
        const response = await fetch(
          `https://api.pallet.exchange/api/v1/user/${wallet.sei_hash}?network=mainnet&include_tokens=true&include_bids=true`
        )
        const data = await response.json()
        
        if (data.nfts && data.nfts.length > 0) {
          const uniqueAddresses = [...new Set(data.nfts.map(nft => nft.collection?.evm_address))]
          const collectionStats = await this.fetchCollectionStats(uniqueAddresses)
          
          const statsMap = {}
          collectionStats.forEach(stats => {
            if (stats && stats.evm_address) {
              statsMap[stats.evm_address] = stats
            }
          })

          return data.nfts.map(nft => ({
            ...nft,
            collection_stats: statsMap[nft.collection?.evm_address] || null
          }))
        }
        return []
      } catch (error) {
        console.error(`Error fetching NFTs for wallet ${wallet.sei_hash}:`, error)
        return []
      }
    },

    async fetchCollectionStats(evmAddresses) {
      try {
        const response = await fetch(process.env.VUE_APP_GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': process.env.VUE_APP_HASURA_ADMIN_SECRET
          },
          body: JSON.stringify({
            query: `
              query collection_stats($addresses: [String!]) {
                pallet_time_comparison(where: {evm_address: {_in: $addresses}}) {
                  evm_address
                  name
                  current_floor_1h
                  current_volume_1h
                  current_owners_1h
                  current_auction_count_1h
                }
              }
            `,
            variables: {
              addresses: evmAddresses
            }
          })
        })
        
        const responseData = await response.json()
        return responseData.data?.pallet_time_comparison || []
      } catch (error) {
        console.error('Error in fetchCollectionStats:', error)
        return []
      }
    },

    async fetchSeiPrice() {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sei-network&vs_currencies=usd')
        const data = await response.json()
        this.seiUsdPrice = data['sei-network'].usd
      } catch (error) {
        console.error('Error fetching SEI price:', error)
        this.seiUsdPrice = 0
      }
    },

    calculateWalletValue(nfts) {
      if (!nfts) return 0
      return nfts.reduce((sum, nft) => {
        const floorInSei = parseFloat(nft.collection_stats?.current_floor_1h) || 0
        return sum + floorInSei
      }, 0)
    },

    async fetchAllData() {
      this.loading = true
      try {
        await this.fetchSeiPrice()
        
        await Promise.all([
          this.fetchWalletLabels(),
          this.fetchPrices()
        ])

        // First, get all linked wallets
        const linkedWalletsData = await supabase
          .from('linked_wallets')
          .select('*')
          .eq('control_sei_hash', this.walletAddress)

        if (linkedWalletsData.error) throw linkedWalletsData.error
        
        // Create an array of promises for fetching tokens from all wallets
        const tokenPromises = linkedWalletsData.data.flatMap(wallet => [
          this.fetchTokens(wallet.evm_hash, 'ERC-20'),
          this.fetchTokens(wallet.sei_hash, 'CW-20'),
          this.fetchTokens(wallet.sei_hash, 'NATIVE')
        ])

        // Wait for all token fetches to complete
        const allTokenResults = await Promise.all(tokenPromises)

        // Process and combine all tokens
        this.tokens = allTokenResults.flatMap((tokens, index) => {
          const walletIndex = Math.floor(index / 3) // Determine which wallet these tokens belong to
          const wallet = linkedWalletsData.data[walletIndex]
          const tokenType = ['ERC-20', 'CW-20', 'NATIVE'][index % 3]
          const walletAddress = tokenType === 'ERC-20' ? wallet.evm_hash : wallet.sei_hash

          return tokens.map(t => ({
            ...t.token,
            value: t.value,
            type: tokenType,
            walletAddress: walletAddress,
            walletLabel: this.internalWalletLabels[walletAddress] || this.truncateAddress(walletAddress)
          }))
        })

        // Fetch NFTs for each wallet
        const walletsWithNfts = await Promise.all(
          linkedWalletsData.data.map(async wallet => ({
            ...wallet,
            nfts: await this.fetchNFTsForWallet(wallet)
          }))
        )

        this.linkedWallets = walletsWithNfts

        // Fetch delegations for all wallets
        const delegationsPromises = linkedWalletsData.data.map(wallet => 
          fetch(`https://rest.wallet.pacific-1.sei.io/cosmos/staking/v1beta1/delegations/${wallet.sei_hash}`)
            .then(res => res.json())
            .then(data => data.delegation_responses?.map(item => ({
              delegatorAddress: item.delegation.delegator_address,
              validatorAddress: item.delegation.validator_address,
              shares: item.delegation.shares,
              denom: item.balance.denom,
              amount: item.balance.amount
            })) || [])
        )

        const delegationsResults = await Promise.all(delegationsPromises)
        this.delegations = delegationsResults.flat()

        this.loading = false
      } catch (error) {
        console.error('Error in fetchAllData:', error)
        this.error = 'Failed to fetch portfolio data'
        this.loading = false
      }
    },

    sort(key) {
      if (this.sortKey === key) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortKey = key
        this.sortOrder = 'desc'
      }
    },

    getSortIndicator(key) {
      if (this.sortKey !== key) return '↕'
      return this.sortOrder === 'asc' ? '↑' : '↓'
    }
  },

  watch: {
    totalTokenValue: {
      immediate: true,
      handler(newValue) {
        this.$emit('token-value-update', newValue)
      }
    }
  },

  mounted() {
    if (this.hasAccess && this.walletAddress) {
      this.fetchAllData()
    }
    // Emit initial token value
    this.$emit('token-value-update', this.totalTokenValue)
  }
}
</script>

<style scoped>
.access-denied {
  text-align: center;
  padding: 20px;
  color: #ff4444;
  background-color: #2c2c2c;
  border-radius: 8px;
  margin: 20px auto;
  max-width: 800px;
}

.portfolio-analysis {
  padding: 20px;
}

.token-table-container {
  overflow-x: auto;
  margin-top: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
}

.token-table {
  width: 100%;
  border-collapse: collapse;
  color: white;
  margin-top: 20px;
}

.token-table th,
.token-table td {
  padding: 12px;
  text-align: right;
}

.token-table th {
  background-color: rgba(255, 255, 255, 0.1);
}

.address {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.loading {
  text-align: center;
  margin-top: 20px;
  color: #999;
}

.error {
  text-align: center;
  margin-top: 20px;
  color: #ff4444;
}

.token-table td:first-child,
.token-table td:nth-child(2) {
  text-align: left;
}

.search-container {
  margin: 20px 0;
  padding: 0 20px;
}

.search-input {
  width: 100%;
  max-width: 300px;
  padding: 8px 12px;
  border: 1px solid rgba(66, 185, 131, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}

.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.sortable:hover {
  background: rgba(255, 255, 255, 0.15);
}

.sort-indicator {
  margin-left: 5px;
  color: #42b983;
  font-size: 0.8em;
}

.token-table th.numeric {
  text-align: right;
}

.token-table th {
  padding: 12px 24px 12px 12px;
  background: rgba(255, 255, 255, 0.1);
  transition: background-color 0.2s;
}

.token-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.token-table tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.token-table tbody tr:last-child {
  border-bottom: none;
}

.beta-notice {
  background: rgba(66, 185, 131, 0.1);
  border-left: 4px solid #42b983;
  padding: 12px 20px;
  margin: 20px;
  border-radius: 4px;
  color: #42b983;
  font-size: 0.9em;
}

.token-table td:first-child,
.token-table td:nth-child(2),
.token-table td:nth-child(3),
.token-table th:first-child,
.token-table th:nth-child(2),
.token-table th:nth-child(3) {
  text-align: left;
}
</style>