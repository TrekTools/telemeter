<template>
  <div class="warp-token">
    <h1>$WARP Token Analytics (Coming Soon)</h1>
    
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
          <div class="value">$0.00</div>
        </div>
        <div class="metric-card">
          <h3>Market Cap</h3>
          <div class="value">$0</div>
        </div>
        <div class="metric-card">
          <h3>24h Volume</h3>
          <div class="value">$0</div>
        </div>
        <div class="metric-card">
          <h3>Holders</h3>
          <div class="value">0</div>
        </div>
      </div>
      
      <div class="chart-container">
        <h2>Price History</h2>
        <div class="chart">
          <!-- Chart component will go here -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WarpToken',
  
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
      tokenData: null
    }
  },
  
  computed: {
    hasRequiredNFT() {
      return this.warpBoisCount > 0 || this.tacCount > 0
    }
  },
  
  mounted() {
    if (this.hasRequiredNFT) {
      this.fetchTokenData()
    }
  },
  
  methods: {
    async fetchTokenData() {
      try {
        // Placeholder for API call
        this.loading = false
      } catch (error) {
        console.error('Error fetching token data:', error)
        this.error = error.message
        this.loading = false
      }
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
</style> 