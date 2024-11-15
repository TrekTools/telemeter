<template>
  <div v-if="hasRequiredNFT" class="delegations-analysis">
    <h1>Delegations Analysis</h1>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <h3>Delegation Count</h3>
        <div class="value">{{ delegations.length }}</div>
      </div>
      <div class="metric-card">
        <h3>Total Delegation Amount</h3>
        <div class="value">{{ formatNumber(totalDelegationAmount) }} SEI</div>
      </div>
    </div>

    <div class="search-container">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="Search delegations..."
        class="search-input"
      />
    </div>
    
    <div v-if="loading" class="loading">
      Loading delegation data...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else-if="delegations.length" class="table-container">
      <table class="delegations-table">
        <thead>
          <tr>
            <th @click="sort('delegatorLabel')" class="sortable">
              Delegator Label
              <span class="sort-indicator">{{ getSortIndicator('delegatorLabel') }}</span>
            </th>
            <th @click="sort('validatorAddress')" class="sortable">
              Validator
              <span class="sort-indicator">{{ getSortIndicator('validatorAddress') }}</span>
            </th>
            <th @click="sort('amount')" class="sortable">
              Amount
              <span class="sort-indicator">{{ getSortIndicator('amount') }}</span>
            </th>
            <th @click="sort('shares')" class="sortable">
              Shares
              <span class="sort-indicator">{{ getSortIndicator('shares') }}</span>
            </th>
            <th @click="sort('denom')" class="sortable">
              Denom
              <span class="sort-indicator">{{ getSortIndicator('denom') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="delegation in filteredAndSortedDelegations" :key="delegation.id">
            <td>{{ delegation.delegatorLabel }}</td>
            <td>
              <div class="validator-info">
                <div class="validator-name">{{ getValidatorMoniker(delegation.validatorAddress) }}</div>
                <div class="validator-address">{{ truncateAddress(delegation.validatorAddress) }}</div>
              </div>
            </td>
            <td>{{ formatAmount(delegation.amount, delegation.denom) }}</td>
            <td>{{ formatNumber(delegation.shares) }}</td>
            <td>{{ formatDenom(delegation.denom) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div v-else class="no-data">
      No delegations found for your wallets.
    </div>
  </div>
  
  <div v-else class="access-denied">
    <h2>Access Denied</h2>
    <p>You need to own a Warp Boi or Trek Access Chit to view this page.</p>
  </div>
</template>

<script>
import supabase from '../supabase'

export default {
  name: 'DelegationsAnalysis',
  
  props: {
    walletConnected: {
      type: Boolean,
      default: false
    },
    walletAddress: {
      type: String,
      required: true
    },
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
      delegations: [],
      loading: false,
      error: null,
      linkedWallets: [],
      walletLabels: {},
      searchQuery: '',
      sortKey: 'amount',
      sortOrder: 'desc',
      validators: {},
      seiUsdPrice: 0,
    }
  },

  computed: {
    hasRequiredNFT() {
      return this.warpBoisCount > 0 || this.tacCount > 0
    },
    
    totalDelegationAmount() {
      return this.delegations.reduce((sum, delegation) => {
        if (delegation.denom === 'usei') {
          return sum + (parseFloat(delegation.amount) / 1000000)
        }
        return sum
      }, 0)
    },

    filteredAndSortedDelegations() {
      let result = [...this.delegations]
      
      // Apply search filter
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase().trim()
        result = result.filter(delegation => 
          delegation.delegatorLabel.toLowerCase().includes(query) ||
          delegation.validatorAddress.toLowerCase().includes(query) ||
          delegation.denom.toLowerCase().includes(query)
        )
      }
      
      // Apply sorting
      result.sort((a, b) => {
        let aVal = a[this.sortKey]
        let bVal = b[this.sortKey]
        
        // Convert string numbers to floats for proper sorting
        if (this.sortKey === 'amount' || this.sortKey === 'shares') {
          aVal = parseFloat(aVal)
          bVal = parseFloat(bVal)
        }
        
        if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1
        if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1
        return 0
      })
      
      return result
    },

    delegationValueUSD() {
      return this.totalDelegationAmount * this.seiUsdPrice
    }
  },

  methods: {
    truncateAddress(address) {
      if (!address) return ''
      return `${address.slice(0, 8)}...${address.slice(-8)}`
    },

    formatNumber(value) {
      if (!value) return '0'
      const num = parseFloat(value)
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6
      })
    },

    formatDenom(denom) {
      return denom === 'usei' ? 'SEI' : denom
    },

    formatAmount(amount, denom) {
      if (!amount) return '0'
      const value = parseFloat(amount)
      if (denom === 'usei') {
        return this.formatNumber(value / 1000000)
      }
      return this.formatNumber(value)
    },

    async fetchLinkedWallets() {
      try {
        let query;
        if (this.walletAddress.startsWith('sei')) {
          query = supabase
            .from('linked_wallets')
            .select('sei_hash, label')
            .eq('control_sei_hash', this.walletAddress)
        } else if (this.walletAddress.startsWith('0x')) {
          query = supabase
            .from('linked_wallets')
            .select('sei_hash, label')
            .eq('control_evm_hash', this.walletAddress)
        }

        const { data, error } = await query
        if (error) throw error

        // Create a map of sei_hash to labels
        this.walletLabels = data.reduce((acc, wallet) => {
          acc[wallet.sei_hash] = wallet.label || this.truncateAddress(wallet.sei_hash)
          return acc
        }, {})

        return data
      } catch (error) {
        console.error('Error fetching linked wallets:', error)
        this.error = 'Failed to fetch wallet data'
        return []
      }
    },

    async fetchDelegations(seiHash) {
      try {
        const response = await fetch(
          `https://rest.wallet.pacific-1.sei.io/cosmos/staking/v1beta1/delegations/${seiHash}`
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch delegation data')
        }

        const data = await response.json()
        
        // Add console.log to debug delegation data
        console.log('Delegation data for', seiHash, ':', data)
        
        return data.delegation_responses.map(item => ({
          delegatorAddress: item.delegation.delegator_address,
          delegatorLabel: this.walletLabels[item.delegation.delegator_address] || 
                         this.truncateAddress(item.delegation.delegator_address),
          validatorAddress: item.delegation.validator_address,
          shares: item.delegation.shares,
          denom: item.balance.denom,
          amount: item.balance.amount
        }))
      } catch (error) {
        console.error('Error fetching delegations:', error)
        return []
      }
    },

    async fetchAllDelegations() {
      this.loading = true
      this.error = null
      
      try {
        await this.fetchSeiPrice()
        await this.fetchValidators()
        const wallets = await this.fetchLinkedWallets()
        
        const allDelegations = await Promise.all(
          wallets.map(wallet => this.fetchDelegations(wallet.sei_hash))
        )

        // Flatten and combine all delegations
        this.delegations = allDelegations.flat()
        this.loading = false
      } catch (error) {
        console.error('Error fetching all delegations:', error)
        this.error = 'Failed to fetch delegation data'
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
    },

    async fetchValidators() {
      try {
        const response = await fetch('https://sei.api.explorers.guru/api/validators')
        const data = await response.json()
        
        // Add console.log to debug validator data
        console.log('Validator data:', data)
        
        this.validators = data.reduce((acc, validator) => {
          acc[validator.operator_address] = validator
          return acc
        }, {})
        
        // Add console.log to check final validators object
        console.log('Validators map:', this.validators)
      } catch (error) {
        console.error('Error fetching validators:', error)
      }
    },

    getValidatorMoniker(validatorAddress) {
      // Add console.log to debug validator lookup
      console.log('Looking up validator:', validatorAddress)
      console.log('Found validator:', this.validators[validatorAddress])
      
      const validator = this.validators[validatorAddress]
      return validator ? validator.moniker : this.truncateAddress(validatorAddress)
    },

    async fetchSeiPrice() {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sei-network&vs_currencies=usd')
        const data = await response.json()
        console.log('SEI price fetched:', data['sei-network'].usd) // Debug log
        this.seiUsdPrice = data['sei-network'].usd
      } catch (error) {
        console.error('Error fetching SEI price:', error)
        this.seiUsdPrice = 0
      }
    }
  },

  async created() {
    if (this.hasRequiredNFT) {
      await this.fetchSeiPrice()
      await this.fetchAllDelegations()
    }
  },

  watch: {
    delegationValueUSD: {
      immediate: true,
      handler(newValue) {
        console.log('Emitting delegation value:', newValue) // Debug log
        this.$emit('delegation-value-update', newValue)
      }
    }
  }
}
</script>

<style scoped>
.delegations-analysis {
  padding: 20px;
}

.input-container {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.address-input {
  flex: 1;
  max-width: 500px;
  padding: 12px 16px;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transition: all 0.3s ease;
}

.address-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.address-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 2px rgba(66, 184, 131, 0.5);
}

.fetch-button {
  padding: 12px 24px;
  background: #42b983;
  color: #1a1a1a;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.fetch-button:hover {
  background: #3aa876;
  transform: translateY(-2px);
}

.table-container {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
  overflow-x: auto;
}

.delegations-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border-radius: 8px;
  overflow: hidden;
}

.delegations-table th,
.delegations-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.delegations-table th {
  background: rgba(66, 185, 131, 0.1);
  font-weight: bold;
  color: #42b983;
}

.delegations-table tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.loading, .error, .no-data {
  text-align: center;
  padding: 20px;
  color: #fff;
}

.error {
  color: #ff4444;
}

h1 {
  color: #42b983;
  margin-bottom: 20px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.metric-card h3 {
  margin: 0 0 10px 0;
  color: #ffffff;
  font-size: 1.1em;
}

.metric-card .value {
  font-size: 1.5em;
  font-weight: bold;
  color: #42b983;
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

.search-container {
  margin: 20px 0;
}

.search-input {
  width: 100%;
  max-width: 300px;
  padding: 12px 16px;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transition: all 0.3s ease;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 2px rgba(66, 184, 131, 0.5);
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
  display: inline-block;
  vertical-align: middle;
}

.delegations-table th {
  padding: 12px 24px 12px 12px;
  text-align: left;
  background: rgba(255, 255, 255, 0.1);
  transition: background-color 0.2s;
}

.delegations-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.delegations-table tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.delegations-table tbody tr:last-child {
  border-bottom: none;
}

.validator-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.validator-name {
  color: #42b983;
  font-weight: 500;
}

.validator-address {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85em;
  font-family: monospace;
}
</style> 