<template>
  <div v-if="hasRequiredNFT" class="coin-analysis">
    <h1>Coin Analysis</h1>
    
    <div class="search-container">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="Search tokens..."
        class="search-input"
      />
      <div class="token-count">
        Showing {{ filteredChartCount }} tokens
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      Loading price data...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="charts-container">
      <div v-for="(chartConfig, symbol) in filteredChartData" :key="symbol" class="chart-wrapper">
        <h3>{{ symbol }}</h3>
        <LineChart
          :data="chartConfig"
          :options="chartOptions"
          class="chart"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { Line as LineChart } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default {
  name: 'CoinAnalysis',
  components: { LineChart },
  
  props: {
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
      loading: true,
      error: null,
      rawData: [],
      processedChartData: {},
      searchQuery: '',
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false
      }
    }
  },

  computed: {
    hasRequiredNFT() {
      return this.warpBoisCount > 0 || this.tacCount > 0
    },
    
    filteredChartData() {
      const query = this.searchQuery.toLowerCase().trim()
      if (!query) return this.processedChartData
      
      return Object.entries(this.processedChartData)
        .filter(([symbol]) => symbol.toLowerCase().includes(query))
        .reduce((acc, [symbol, data]) => {
          acc[symbol] = data
          return acc
        }, {})
    },
    
    filteredChartCount() {
      return Object.keys(this.filteredChartData).length
    }
  },

  methods: {
    processData() {
      const groupedData = {}
      
      // Group by symbol
      this.rawData.forEach(item => {
        if (!groupedData[item.symbol]) {
          groupedData[item.symbol] = {
            labels: [],
            datasets: [{
              label: `${item.symbol} Price`,
              data: [],
              borderColor: '#42b883',
              tension: 0.4
            }]
          }
        }
        
        const date = new Date(item.rounded_time).toLocaleString()
        groupedData[item.symbol].labels.push(date)
        groupedData[item.symbol].datasets[0].data.push(parseFloat(item.usd_price))
      })
      
      this.processedChartData = groupedData
    },

    async fetchTokenData() {
      try {
        const response = await fetch(process.env.VUE_APP_GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': process.env.VUE_APP_HASURA_ADMIN_SECRET
          },
          body: JSON.stringify({
            query: `
              query MyQuery {
                token_timeseries(order_by: {record: asc}) {
                  symbol
                  usd_price
                  record
                  rounded_time
                }
              }
            `
          })
        })
        
        const json = await response.json()
        if (json.errors) throw new Error(json.errors[0].message)
        
        this.rawData = json.data.token_timeseries
        this.processData()
        this.loading = false
      } catch (error) {
        console.error('Error fetching data:', error)
        this.error = error.message
        this.loading = false
      }
    }
  },

  mounted() {
    if (this.hasRequiredNFT) {
      this.fetchTokenData()
    }
  }
}
</script>

<style scoped>
.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-top: 20px;
}

.chart-wrapper {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  min-height: 400px;
  transition: all 0.3s ease;
}

.chart-wrapper:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.chart-wrapper h3 {
  text-align: center;
  margin-bottom: 15px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

.chart {
  height: 350px !important;
}

.search-container {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 20px 0;
  padding: 0 10px;
}

.search-input {
  flex: 1;
  max-width: 400px;
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

.token-count {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}
</style>