<template>
  <div class="home">
    <div class="terminal-header">
      <div class="terminal-bar">
        <span class="terminal-buttons">
          <span class="terminal-circle red"></span>
          <span class="terminal-circle yellow"></span>
          <span class="terminal-circle green"></span>
        </span>
        <span class="terminal-title">[CLASSIFIED]_v1.0</span>
      </div>
      <div class="terminal-content">
        <span class="prompt">$</span>
        <span class="command">./access_[REDACTED]</span>
        <span class="response">
          <span class="redacted">████████</span> protocol initialized...
          <br>
          clearance level: <span class="highlight">ALPHA</span>
          <br>
          <span class="warning">ACCESS REQUIREMENTS:</span>
          <br>
          <span class="requirement"> WARP BOI NFT</span>
          <span class="requirement"> TREK ACCESS CHIT</span>
          <span class="requirement"> $WARP TOKEN</span>
        </span>
        <span class="cursor">█</span>
      </div>
    </div>

    <button 
      @click="handleWalletAction" 
      class="connect-button"
    >
      {{ walletConnected ? 'disconnect' : 'connect wallet' }}
    </button>
    <p v-if="walletAddress" class="wallet-address">
      SEI Address: {{ truncateAddress(walletAddress) }}
    </p>
    <p v-if="evmAddress" class="wallet-address">
      EVM Address: {{ truncateAddress(evmAddress) }}
    </p>
    <p v-if="nftStatus" class="nft-status">
      {{ nftStatus }}
      <span v-if="warpBoisCount > 0" class="nft-count">Warp Bois: {{ warpBoisCount }}</span>
      <span v-if="tacCount > 0" class="nft-count">TACs: {{ tacCount }}</span>
    </p>
    <HomeCharts />

    <h1>welcome to ████████</h1>
    
    <div class="feature-grid">
      <div class="feature-card">
        <h3>NFT Analytics</h3>
        <p>Track and analyze your NFT portfolio performance</p>
      </div>
      
      <div class="feature-card">
        <h3>Portfolio Tracking</h3>
        <p>Monitor your cryptocurrency holdings and performance</p>
      </div>
      
      <div class="feature-card">
        <h3>Market Trends</h3>
        <p>Stay updated with the latest market trends and analysis</p>
      </div>
      
      <div class="feature-card">
        <h3>Coin Analysis</h3>
        <p>Deep dive into cryptocurrency metrics and data</p>
      </div>
    </div>
  </div>
</template>

<script>
import HomeCharts from '@/components/HomeCharts.vue'

export default {
  name: 'HomeView',
  components: {
    HomeCharts
  },
  props: {
    walletConnected: {
      type: Boolean,
      default: false
    },
    walletAddress: String,
    evmAddress: String,
    warpBoisCount: Number,
    tacCount: Number,
    nftStatus: String
  },
  emits: ['connect-wallet', 'disconnect-wallet'],
  methods: {
    handleWalletAction() {
      if (this.walletConnected) {
        this.$emit('disconnect-wallet')
      } else {
        this.$emit('connect-wallet')
      }
    },
    truncateAddress(address) {
      if (!address) return ''
      return `${address.slice(0, 4)}...${address.slice(-4)}`
    }
  }
}
</script>

<style scoped>
.home {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 40px;
}

.feature-card {
  background-color: #2c2c2c;
  padding: 20px;
  border-radius: 8px;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.connect-button {
  background-color: v-bind(walletConnected ? '#ff4444' : '#42b983');
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Source Code Pro', monospace;
  margin: 20px 0;
  transition: all 0.3s ease;
}

.connect-button:hover {
  background-color: v-bind(walletConnected ? '#ff6666' : '#3aa876');
}
</style> 