<template>
  <div class="warp-token">
    <h1>$WARP Token Analytics</h1>
    
    <a 
      href="https://seipex.fi/0x921FaF220dcaf3E32FCd474d12C3892040DDe623" 
      target="_blank" 
      rel="noopener noreferrer" 
      class="buy-warp-button"
    >
      BUY WARP
    </a>
    
    <div v-if="loading" class="loading">
      Loading token data...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="token-dashboard">
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Price</h3>
          <div class="value">${{ formatPrice(currentPrice) }}</div>
        </div>
        <div class="metric-card">
          <h3>24h Change</h3>
          <div class="value" :class="getPriceChangeClass(priceChange24h)">
            {{ formatPriceChange(priceChange24h) }}
          </div>
        </div>
        <div class="metric-card">
          <h3>1h Change</h3>
          <div class="value" :class="getPriceChangeClass(priceChange1h)">
            {{ formatPriceChange(priceChange1h) }}
          </div>
        </div>
        <div class="metric-card">
          <h3>Holders</h3>
          <div class="value">{{ holders }}</div>
        </div>
      </div>

      <div class="chart-container">
        <h2>Price History</h2>
        <div class="chart">
          <Line
            v-if="chartData"
            :data="chartData"
            :options="chartOptions"
          />
        </div>
      </div>
      
      <div class="chart-container">
        <h2>Top Holders Distribution</h2>
        <div class="chart-wrapper">
          <Pie
            v-if="holdersPieData"
            :data="holdersPieData"
            :options="pieChartOptions"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Line, Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default {
  name: 'WarpToken',
  components: { Line, Pie },
  
  data() {
    return {
      loading: true,
      error: null,
      chartData: null,
      currentPrice: 0,
      priceChange24h: 0,
      priceChange1h: 0,
      holders: 0,
      holdersPieData: null,
      pieChartOptions: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#ffffff'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#42b983',
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(2);
                return `${label}: ${percentage}%`;
              }
            }
          }
        }
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: '#ffffff' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          },
          y: {
            ticks: { color: '#ffffff' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        plugins: {
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#42b983',
            padding: 10,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return `Price: $${context.parsed.y.toFixed(6)}`;
              }
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        }
      }
    }
  },

  methods: {
    formatPrice(price) {
      return price?.toFixed(6) || '0.000000'
    },

    formatPriceChange(change) {
      if (!change) return '0.00%'
      return `${(change * 100).toFixed(2)}%`
    },

    getPriceChangeClass(change) {
      if (!change) return ''
      return change > 0 ? 'positive-change' : 'negative-change'
    },

    calculatePriceChange(oldPrice, newPrice) {
      if (!oldPrice || !newPrice) return 0
      return (newPrice - oldPrice) / oldPrice
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
              query WarpTokenData {
                token_timeseries(
                  where: { symbol: { _eq: "WARP" } }
                  order_by: { record: asc }
                ) {
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
        
        const data = json.data.token_timeseries
        if (data.length > 0) {
          // Process chart data
          this.chartData = {
            labels: data.map(d => new Date(d.rounded_time).toLocaleString()),
            datasets: [{
              label: 'WARP Price',
              data: data.map(d => parseFloat(d.usd_price)),
              borderColor: '#42b983',
              tension: 0.4
            }]
          }

          // Calculate current price and changes
          const prices = data.map(d => parseFloat(d.usd_price))
          const currentPrice = prices[prices.length - 1]
          const hourAgoPrice = prices[Math.max(0, prices.length - 1)]
          const dayAgoPrice = prices[Math.max(0, prices.length - 24)]

          this.currentPrice = currentPrice
          this.priceChange1h = this.calculatePriceChange(hourAgoPrice, currentPrice)
          this.priceChange24h = this.calculatePriceChange(dayAgoPrice, currentPrice)
        }

        this.loading = false
      } catch (error) {
        console.error('Error fetching data:', error)
        this.error = error.message
        this.loading = false
      }
    },

    async fetchHoldersData() {
      try {
        const response = await fetch('https://seitrace.com/pacific-1/gateway/api/v1/tokens/0x921FaF220dcaf3E32FCd474d12C3892040DDe623/holders')
        const data = await response.json()
        
        if (data.items && data.items.length > 0) {
          // Set total holders count
          this.holders = data.items[0].token.holders
          
          // Process top 10 holders for pie chart
          const topHolders = data.items.slice(0, 100)
          
          // Calculate total for remaining holders
          const otherHoldersTotal = data.items.slice(10).reduce((sum, holder) => 
            sum + parseFloat(holder.value), 0
          )
          
          // Calculate remaining holders count
          const remainingHoldersCount = this.holders - 100
          
          this.holdersPieData = {
            labels: [
              ...topHolders.map(holder => {
                const address = holder.address.name || holder.address.hash.slice(0, 8) + '...'
                return address
              }),
              `${remainingHoldersCount.toLocaleString()} Others`  // Updated label
            ],
            datasets: [{
              data: [
                ...topHolders.map(holder => parseFloat(holder.value)),
                otherHoldersTotal
              ],
              backgroundColor: [
                '#42b983', '#2c3e50', '#7957d5', '#363636', '#ff3860',
                '#209cee', '#ffdd57', '#7957d5', '#fab1a0', '#00d1b2',
                '#4a4a4a'
              ]
            }]
          }
        }
      } catch (error) {
        console.error('Error fetching holders data:', error)
      }
    }
  },

  mounted() {
    this.fetchTokenData()
    this.fetchHoldersData()
    // Refresh data every 5 minutes
    this.refreshInterval = setInterval(this.fetchTokenData, 300000)
  },

  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
  }
}
</script>

<style scoped>
.warp-token {
  padding: 20px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.metric-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s ease;
}

.metric-card:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.metric-card h3 {
  color: #42b983;
  margin-bottom: 10px;
  font-size: 1.1em;
}

.metric-card .value {
  color: white;
  font-size: 1.5em;
  font-weight: bold;
}

.chart-container {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
}

.chart-container h2 {
  color: white;
  margin-bottom: 20px;
}

.chart {
  height: 400px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.loading, .error {
  text-align: center;
  color: white;
  padding: 20px;
}

.error {
  color: #ff6b6b;
}

.buy-warp-button {
  display: block;
  width: 100%;
  max-width: 400px;
  margin: 20px auto;
  padding: 20px;
  background: #42b983;
  color: #1a1a1a;
  text-align: center;
  font-size: 1.5em;
  font-weight: bold;
  text-decoration: none;
  border-radius: 12px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.buy-warp-button:hover {
  background: #3aa876;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.3);
  border-color: #42b983;
}

.buy-warp-button:active {
  transform: translateY(0);
}

.positive {
  color: #42b983 !important;
}

.negative {
  color: #ff4444 !important;
}

.chart {
  height: 400px;
  width: 100%;
}
</style> 