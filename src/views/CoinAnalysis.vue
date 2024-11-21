<template>
  <div v-if="hasRequiredNFT" class="coin-analysis">
    <h1>Coins on Sei</h1>
    
    <div class="controls-container">
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
      
      <div class="view-toggle">
        <button 
          @click="viewMode = 'charts'"
          :class="['toggle-btn', { active: viewMode === 'charts' }]"
        >
          <i class="fas fa-chart-line"></i> Charts
        </button>
        <button 
          @click="viewMode = 'table'"
          :class="['toggle-btn', { active: viewMode === 'table' }]"
        >
          <i class="fas fa-table"></i> Table
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      Loading price data...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else>
      <!-- Charts View -->
      <div v-if="viewMode === 'charts'" class="charts-container">
        <div v-for="(chartConfig, symbol) in filteredChartData" :key="symbol" class="chart-wrapper">
          <h3>{{ symbol }}</h3>
          <LineChart
            :data="chartConfig"
            :options="chartOptions"
            class="chart"
          />
        </div>
      </div>

      <!-- Table View -->
      <div v-else class="table-container">
        <table class="token-table">
          <thead>
            <tr>
              <th class="sortable text-center" @click="sortBy('symbol')">
                Symbol
                <span v-if="sortKey === 'symbol'" class="sort-indicator">
                  {{ sortOrder === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th class="sortable text-center" @click="sortBy('currentPrice')">
                Price
                <span v-if="sortKey === 'currentPrice'" class="sort-indicator">
                  {{ sortOrder === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th class="sortable text-center" @click="sortBy('priceChange1h')">
                1h Change
                <span v-if="sortKey === 'priceChange1h'" class="sort-indicator">
                  {{ sortOrder === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
              <th class="sortable text-center" @click="sortBy('priceChange24h')">
                24h Change
                <span v-if="sortKey === 'priceChange24h'" class="sort-indicator">
                  {{ sortOrder === 'asc' ? '▲' : '▼' }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="token in sortedTableData" :key="token.symbol">
              <td class="text-center">{{ token.symbol }}</td>
              <td class="text-center">${{ formatPrice(token.currentPrice) }}</td>
              <td class="text-center" :class="getPriceChangeClass(token.priceChange1h)">
                {{ formatPriceChange(token.priceChange1h) }}
              </td>
              <td class="text-center" :class="getPriceChangeClass(token.priceChange24h)">
                {{ formatPriceChange(token.priceChange24h) }}
              </td>
            </tr>
          </tbody>
        </table>
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
    },
    warpTokenBalance: {
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
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: '#ffffff'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          y: {
            ticks: {
              color: '#ffffff'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
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
          },
          legend: {
            labels: {
              color: '#ffffff'
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        }
      },
      viewMode: 'charts',
      sortKey: 'symbol',
      sortOrder: 'asc'
    }
  },

  computed: {
    hasRequiredNFT() {
      return this.warpBoisCount > 0 || this.tacCount > 0 || this.warpTokenBalance >= 1000000;
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
    },

    tableData() {
      return Object.entries(this.processedChartData).map(([symbol, data]) => {
        const prices = data.datasets[0].data
        const currentPrice = prices[prices.length - 1] || 0
        const hourPrice = prices[Math.max(0, prices.length - 1)] || 0
        const dayPrice = prices[Math.max(0, prices.length - 24)] || 0
        
        return {
          symbol,
          currentPrice,
          priceChange1h: this.calculatePriceChange(hourPrice, currentPrice),
          priceChange24h: this.calculatePriceChange(dayPrice, currentPrice)
        }
      })
    },

    sortedTableData() {
      const filtered = this.tableData.filter(token => 
        token.symbol.toLowerCase().includes(this.searchQuery.toLowerCase())
      )
      
      return filtered.sort((a, b) => {
        const aVal = a[this.sortKey]
        const bVal = b[this.sortKey]
        const modifier = this.sortOrder === 'asc' ? 1 : -1
        
        if (typeof aVal === 'string') {
          return aVal.localeCompare(bVal) * modifier
        }
        return (aVal - bVal) * modifier
      })
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
              label: `Price in $SEI`,
              data: [],
              borderColor: [],
              pointBackgroundColor: [],
              segment: {
                borderColor: ctx => {
                  const prev = ctx.p0.parsed.y
                  const current = ctx.p1.parsed.y
                  if (current > prev) return '#42b983'
                  if (current < prev) return '#ff4444'
                  return '#ffdd57'
                }
              },
              tension: 0.4,
              borderWidth: 2
            }]
          }
        }
        
        const date = new Date(item.rounded_time).toLocaleString()
        const price = parseFloat(item.usd_price)
        const dataset = groupedData[item.symbol].datasets[0]
        
        // Determine point color based on price change
        const prevPrice = dataset.data[dataset.data.length - 1]
        let pointColor
        if (dataset.data.length === 0) {
          pointColor = '#42b983'
        } else {
          if (price > prevPrice) pointColor = '#42b983'
          else if (price < prevPrice) pointColor = '#ff4444'
          else pointColor = '#ffdd57'
        }
        
        groupedData[item.symbol].labels.push(date)
        dataset.data.push(price)
        dataset.pointBackgroundColor.push(pointColor)
      })
      
      // Limit each chart to last 48 data points
      Object.keys(groupedData).forEach(symbol => {
        const chart = groupedData[symbol]
        if (chart.labels.length > 48) {
          chart.labels = chart.labels.slice(-48)
          chart.datasets[0].data = chart.datasets[0].data.slice(-48)
          chart.datasets[0].pointBackgroundColor = chart.datasets[0].pointBackgroundColor.slice(-48)
        }
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
    },

    sortBy(key) {
      if (this.sortKey === key) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortKey = key
        this.sortOrder = 'asc'
      }
    },

    formatPrice(price) {
      return price?.toFixed(6) || '0.000000'
    },

    formatPriceChange(change) {
      if (!change) return '0.00%'
      return `${(change * 100).toFixed(2)}%`
    },

    calculatePriceChange(oldPrice, newPrice) {
      if (!oldPrice || !newPrice) return 0
      return (newPrice - oldPrice) / oldPrice
    },

    getPriceChangeClass(change) {
      if (!change) return ''
      return change > 0 ? 'positive-change' : 'negative-change'
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
  color: #42b983;
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

.controls-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0;
  padding: 0 10px;
}

.view-toggle {
  display: flex;
  gap: 8px;
}

.toggle-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggle-btn.active {
  background: #42b983;
}

.toggle-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.2);
}

.token-table th,
.token-table td {
  padding: 12px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.token-table th {
  background: rgba(255, 255, 255, 0.1);
  text-align: center;
  font-weight: bold;
  color: var(--primary-text);
}

.text-center {
  text-align: center;
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

.positive-change {
  color: var(--accent-text);
  font-weight: bold;
}

.negative-change {
  color: #ff4444;
  font-weight: bold;
}

.table-container {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
  overflow-x: auto;
}

.token-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border-radius: 8px;
  overflow: hidden;
}

.token-table tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.token-table thead tr {
  background: rgba(66, 185, 131, 0.1);
}
</style>