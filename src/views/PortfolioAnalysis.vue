<template>
  <div v-if="hasRequiredNFT" class="portfolio-analysis">
    <h1>Portfolio Analysis</h1>
    
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
            <th>Symbol</th>
            <th>Name</th>
            <th>Address</th>
            <th>Holders</th>
            <th>Total Supply</th>
            <th>Balance</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="token in tokens" :key="token.address">
            <td>{{ token.symbol }}</td>
            <td>{{ token.name }}</td>
            <td class="address">{{ truncateAddress(token.address) }}</td>
            <td>{{ formatNumber(token.holders) }}</td>
            <td>{{ formatNumber(token.total_supply) }}</td>
            <td>{{ formatNumber(token.value) }}</td>
            <td>{{ token.type }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  
  <div v-else class="access-denied">
    <h2>Access Denied</h2>
    <p>You need to own a Warp Boi or Trek Access Chit to view this page.</p>
  </div>
</template>

<script>
export default {
  name: 'PortfolioAnalysis',
  
  props: {
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
    }
  },

  computed: {
    hasRequiredNFT() {
      return this.warpBoisCount > 0 || this.tacCount > 0
    }
  },

  methods: {
    truncateAddress(address) {
      if (!address) return ''
      return `${address.slice(0, 6)}...${address.slice(-4)}`
    },

    formatNumber(num) {
      if (!num) return '0'
      return new Intl.NumberFormat().format(num)
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

    async fetchAllTokens() {
      this.loading = true
      try {
        const [erc20Tokens, cw20Tokens, nativeTokens] = await Promise.all([
          this.fetchTokens(this.evmAddress, 'ERC-20'),
          this.fetchTokens(this.walletAddress, 'CW-20'),
          this.fetchTokens(this.walletAddress, 'NATIVE')
        ])

        // Process and combine all tokens
        this.tokens = [
          ...erc20Tokens.map(t => ({ ...t.token, value: t.value, type: 'ERC-20' })),
          ...cw20Tokens.map(t => ({ ...t.token, value: t.value, type: 'CW-20' })),
          ...nativeTokens.map(t => ({ ...t.token, value: t.value, type: 'NATIVE' }))
        ]

        this.loading = false
      } catch (error) {
        this.error = 'Failed to fetch portfolio data'
        this.loading = false
      }
    }
  },

  mounted() {
    if (this.hasRequiredNFT && this.walletAddress) {
      this.fetchAllTokens()
    }
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
}

.token-table th,
.token-table td {
  padding: 10px;
  text-align: left;
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
</style>