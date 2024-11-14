<template>
  <div class="home">
    <NftConveyor
      :is-connected="walletConnected"
      :wallet-address="walletAddress"
      :warp-bois-count="warpBoisCount"
      :tac-count="tacCount"
    />
    
    <div class="terminal-header">
      <div class="terminal-bar">
        <span class="terminal-buttons">
          <span class="terminal-circle red"></span>
          <span class="terminal-circle yellow"></span>
          <span class="terminal-circle green"></span>
        </span>
        <span class="terminal-title">telemeter_bata_v0.1</span>
      </div>
      <div class="terminal-content">
        <span class="prompt">$</span>
        <span class="command">./access_advanced</span>
        <span class="response">
          <span class="redacted">TELEMETER</span> protocol initialized...
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
      :class="['connect-button', walletConnected ? 'disconnect' : 'connect']"
    >
      {{ walletConnected ? 'disconnect' : 'connect wallet' }}
    </button>
    <p v-if="walletAddress" class="wallet-address">
      SEI Address: {{ truncateAddress(walletAddress) }}
    </p>
    <p v-if="evmAddress" class="wallet-address">
      EVM Address: {{ truncateAddress(evmAddress) }}
    </p>

    <div class="status-container">
      <p v-if="nftStatus" class="nft-status">
        {{ nftStatus }}
        <span v-if="warpBoisCount > 0" class="nft-count">Warp Bois: {{ warpBoisCount }}</span>
        <span v-if="tacCount > 0" class="nft-count">TACs: {{ tacCount }}</span>
      </p>
    </div>

    <HomeCharts />

    <h1>welcome to Telemeter v0.1 (Beta)</h1>
    
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
import NftConveyor from '@/components/NftConveyor.vue'

export default {
  name: 'HomeView',
  components: {
    HomeCharts,
    NftConveyor
  },
  props: {
    walletConnected: {
      type: Boolean,
      default: false
    },
    walletAddress: String,
    evmAddress: String,
    warpBoisCount: {
      type: Number,
      default: 0,
      validator(value) {
        console.log('Validating warpBoisCount:', value)
        return typeof value === 'number' && value >= 0
      }
    },
    tacCount: {
      type: Number,
      default: 0,
      validator(value) {
        console.log('Validating tacCount:', value)
        return typeof value === 'number' && value >= 0
      }
    },
    nftStatus: {
      type: String,
      default: ''
    }
  },
  emits: ['connect-wallet', 'disconnect-wallet'],
  data() {
    return {
      isTerminalOpen: !this.isMobile(),
    }
  },
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
    },
    isMobile() {
      return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    }
  },
  mounted() {
    window.addEventListener('resize', () => {
      if (this.isMobile() && this.isTerminalOpen) {
        this.isTerminalOpen = false
      }
    })
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  },
  watch: {
    warpBoisCount: {
      handler(newVal, oldVal) {
        console.log('HomeView: warpBoisCount changed:', {
          old: oldVal,
          new: newVal,
          type: typeof newVal
        })
      },
      immediate: true
    },
    nftStatus: {
      handler(newVal, oldVal) {
        console.log('HomeView: nftStatus changed:', {
          old: oldVal,
          new: newVal
        })
      },
      immediate: true
    },
    walletConnected: {
      handler(newVal) {
        console.log('HomeView: walletConnected changed:', newVal)
      },
      immediate: true
    }
  }
}
</script>

<style scoped>
.home {
  padding: 20px;
  padding-top: 100px;
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
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Source Code Pro', monospace;
  margin: 20px 0;
  transition: all 0.3s ease;
}

.connect-button.connect {
  background-color: #42b983;
}

.connect-button.disconnect {
  background-color: #ff4444;
}

.connect-button.connect:hover {
  background-color: #3aa876;
}

.connect-button.disconnect:hover {
  background-color: #ff6666;
}

.wallet-address {
  font-family: 'Source Code Pro', monospace;
  color: #42b983;
  margin: 5px 0;
}

.nft-status {
  color: #fff;
  margin: 10px 0;
}

.nft-count {
  background: #42b983;
  color: #1a1a1a;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
  font-size: 0.9em;
}

.terminal-header {
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
}

.terminal-bar {
  background: #2c2c2c;
  padding: 8px;
  display: flex;
  align-items: center;
}

.terminal-buttons {
  display: flex;
  gap: 6px;
  margin-right: 12px;
}

.terminal-circle {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.red { background: #ff5f56; }
.yellow { background: #ffbd2e; }
.green { background: #27c93f; }

.terminal-title {
  color: #666;
  font-family: 'Source Code Pro', monospace;
}

.terminal-content {
  padding: 16px;
  font-family: 'Source Code Pro', monospace;
  color: #fff;
}

.prompt {
  color: #42b983;
  margin-right: 8px;
}

.command {
  color: #fff;
}

.response {
  display: block;
  margin-top: 8px;
  line-height: 1.5;
}

.redacted {
  background: #666;
  color: #666;
}

.highlight {
  color: #42b983;
}

.warning {
  color: #ffbd2e;
}

.requirement {
  display: inline-block;
  background: rgba(66, 185, 131, 0.1);
  color: #42b983;
  padding: 2px 8px;
  border-radius: 4px;
  margin: 4px;
}

.cursor {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

.nft-status {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.checking-status {
  color: #666;
  font-style: italic;
}

.nft-count {
  background: #42b983;
  color: #1a1a1a;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  display: inline-flex;
  align-items: center;
  height: 24px;
}

.status-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin: 20px 0;
}

.nft-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  text-align: center;
}

.nft-count {
  background: #42b983;
  color: #1a1a1a;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  display: inline-flex;
  align-items: center;
  height: 24px;
  margin: 0 4px;
}
</style> 