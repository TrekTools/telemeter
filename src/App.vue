<template>
  <v-app>
    <div id="app" :class="[currentTheme, 'app-container']">
      <router-view 
        :wallet-connected="isConnected"
        :wallet-address="walletAddress"
        :evm-address="evmAddress"
        :warp-bois-count="Number(warpBoisCount)"
        :tac-count="Number(tacCount)"
        :warp-token-balance="warpTokenBalance"
        @connect-wallet="handleConnect"
        @disconnect-wallet="disconnectWallet"
        @check-nfts="handleNFTCheck"
      />
      
      <!-- Add CommandToast with all required props -->
      <CommandToast 
        :wallet-connected="isConnected"
        :wallet-address="walletAddress"
        :evm-address="evmAddress"
        :warp-bois-count="warpBoisCount"
        :tac-count="tacCount"
        @connect-wallet="handleConnect"
        @disconnect-wallet="disconnectWallet"
        @terminal-hidden="handleTerminalHidden"
        ref="commandToast"
      />

      <NftConveyor 
        :wallet-connected="isConnected"
        :wallet-address="walletAddress"
        :warp-bois-count="warpBoisCount"
        :tac-count="tacCount"
      />
      
      <div class="nav-container">
        <!-- Desktop Navigation -->
        <nav class="bottom-toolbar" v-show="!isMobile">
          <router-link to="/" class="nav-link">Home</router-link>
          <router-link to="/about" class="nav-link">About</router-link>
          <router-link to="/guide" class="nav-link">Guide</router-link>
          
          <!-- Terminal indicator -->
          <div v-if="terminalHidden" 
               class="terminal-indicator" 
               @click="showTerminal">
            <span class="terminal-dot"></span>
            Terminal
          </div>

          <!-- Protected routes only shown when NFTs are owned -->
          <template v-if="hasAppAccess">
            <router-link to="/portfolio" class="nav-link">Portfolio</router-link>
            <router-link to="/defi" class="nav-link">DeFi</router-link>
            <router-link to="/nft" class="nav-link">NFTs</router-link>
            <router-link to="/delegations" class="nav-link">Staking</router-link>
            <router-link to="/coins" class="nav-link">Coins</router-link>
            <router-link to="/trends" class="nav-link">Market Trends</router-link>
            <router-link to="/profile" class="nav-link">Profile</router-link>
            <router-link to="/warp" class="nav-link">$WARP</router-link>
          </template>
          
          <!-- SEI price indicator moved to end -->
          <div class="sei-price-indicator">
            1 SEI = ${{ formatNumber(seiPrice, 4) }}
          </div>
        </nav>

        <!-- Mobile Navigation with Drawer -->
        <nav class="mobile-toolbar" v-show="isMobile">
          <button class="drawer-toggle" @click="toggleDrawer">
            <span class="menu-icon" :class="{ 'drawer-open': drawer }">☰</span>
          </button>
          
          <v-navigation-drawer
            v-model="drawer"
            temporary
            location="bottom"
            :height="drawerHeight"
          >
            <div class="drawer-content">
              <router-link to="/" class="drawer-link" @click="closeDrawer">Home</router-link>
              <router-link to="/about" class="drawer-link" @click="closeDrawer">About</router-link>
              <router-link to="/guide" class="drawer-link" @click="closeDrawer">Guide</router-link>
              
              <!-- Protected routes in drawer -->
              <template v-if="hasAppAccess">
                <router-link to="/portfolio" class="drawer-link" @click="closeDrawer">Portfolio</router-link>
                <router-link to="/defi" class="drawer-link" @click="closeDrawer">DeFi</router-link>
                <router-link to="/nft" class="drawer-link" @click="closeDrawer">NFTs</router-link>
                <router-link to="/delegations" class="drawer-link" @click="closeDrawer">Staking</router-link>
                <router-link to="/coins" class="drawer-link" @click="closeDrawer">Coins</router-link>
                <router-link to="/trends" class="drawer-link" @click="closeDrawer">Market Trends</router-link>
                <router-link to="/profile" class="drawer-link" @click="closeDrawer">Profile</router-link>
                <router-link to="/warp" class="drawer-link" @click="closeDrawer">$WARP</router-link>
              </template>
              
              <!-- Add SEI price to mobile drawer -->
              <div class="drawer-link sei-price-mobile">
                1 SEI = ${{ formatNumber(seiPrice, 4) }}
              </div>
            </div>
          </v-navigation-drawer>
          
          <!-- If you have a backdrop overlay, add this -->
          <div 
            v-if="drawer" 
            class="drawer-backdrop"
            @click="closeDrawer"
          ></div>
        </nav>
      </div>
    </div>
  </v-app>
</template>

<script>
import NftConveyor from './components/NftConveyor.vue'
import CommandToast from '@/components/CommandToast.vue'
import supabase from './supabase'  // Import shared instance
import { v4 as uuidv4 } from 'uuid'
import { ref, provide } from 'vue'

export default {
  name: 'App',
  components: {
    NftConveyor,
    CommandToast
  },
  data() {
    return {
      isConnected: false,
      walletAddress: null,
      evmAddress: null,
      warpBoisCount: 1,
      tacCount: 0,
      nftStatus: null,
      warpTokenCount: 0,
      isDrawerOpen: false,
      isMobile: false,
      activeWarpBoi: null,
      terminalHidden: false,
      nftAnalysisData: {
        linkedWallets: []
      },
      currentTheme: 'theme-green', // default theme
      warpTokenBalance: 0,
      WARP_CONTRACT_ADDRESS: '0x921FaF220dcaf3E32FCd474d12C3892040DDe623',
      WARP_MINIMUM_BALANCE: 1000000,
      drawer: false, // Start closed
      seiPrice: 0,
    }
  },
  created() {
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)
    // Listen for theme changes
    window.addEventListener('themeChanged', (e) => {
      this.currentTheme = `theme-${e.detail}`
    })
    this.fetchSeiPrice()
    // Optional: Update price every 5 minutes
    setInterval(this.fetchSeiPrice, 300000)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
  },
  watch: {
    walletAddress: {
      immediate: true,
      async handler(newAddress) {
        if (newAddress) {
          await this.$store.dispatch('initializePreferences', newAddress)
        }
      }
    }
  },
  methods: {
    async handleConnect() {
      try {
        if (!window.compass) {
          alert("Please install Compass wallet");
          return;
        }

        const chainId = "pacific-1";
        await window.compass.enable(chainId);
        const offlineSigner = window.compass.getOfflineSigner(chainId);
        const accounts = await offlineSigner.getAccounts();
        
        this.walletAddress = accounts[0].address;
        this.isConnected = true;
        this.warpBoisCount = 1; // Always set to 1 after connection
        
        // Try to get EVM address from seitrace
        try {
          const seitraceResponse = await fetch(
            `https://seitrace.com/pacific-1/gateway/api/v1/addresses/${this.walletAddress}`
          );

          if (seitraceResponse.ok) {
            const seitraceData = await seitraceResponse.json();
            if (seitraceData.association?.evm_hash) {
              this.evmAddress = seitraceData.association.evm_hash;
              console.log('Found EVM address from seitrace:', this.evmAddress);
            }
          }
          
          // Check WARP balance after getting EVM address
          if (this.evmAddress) {
            await this.checkWarpBalance();
          }
        } catch (error) {
          console.log('Error fetching EVM address:', error);
        }

        await this.logUserLogin();
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    },
    async logUserLogin() {
      try {
        // First try to insert into unique_wallets if this pair doesn't exist
        const { error: uniqueError } = await supabase
          .from('unique_wallets')
          .insert({
            uuid: uuidv4(),
            sei_hash: this.walletAddress,
            evm_hash: this.evmAddress,
            timestamp: new Date().toISOString()
          })
          .select()
          .maybeSingle()

        // If there's a unique constraint error, that's fine - the pair already exists
        if (uniqueError && !uniqueError.message.includes('unique constraint')) {
          console.error('Error inserting unique wallet:', uniqueError)
        }

        // Update the label for primary wallet if it's empty
        const { error: labelError } = await supabase
          .from('linked_wallets')
          .update({ label: 'Primary Wallet' })
          .match({
            control_sei_hash: this.walletAddress,
            sei_hash: this.walletAddress,
            control_evm_hash: this.evmAddress,
            evm_hash: this.evmAddress,
            label: ''
          })

        if (labelError) {
          console.error('Error updating primary wallet label:', labelError)
        }

        // Always log the login attempt
        const { error: loginError } = await supabase
          .from('wallet_connections')
          .insert({
            uuid: uuidv4(),
            sei_hash: this.walletAddress,
            evm_hash: this.evmAddress,
            timestamp: new Date().toISOString(),
            warp_boi_count: this.warpBoisCount,
            tac_count: this.tacCount,
            warp_token_count: this.warpTokenCount
          })

        if (loginError) throw loginError
      } catch (error) {
        console.error('Error logging user login:', error)
      }
    },
    checkMobile() {
      this.isMobile = window.innerWidth <= 768
      
      if (!this.isMobile) {
        this.isDrawerOpen = false
      }
    },
    toggleDrawer() {
      this.drawer = !this.drawer;
    },
    closeDrawer() {
      this.drawer = false;
    },
    handleWalletAction() {
      if (this.isConnected) {
        this.disconnectWallet()
      } else {
        this.handleConnect()
      }
    },
    disconnectWallet() {
      // Reset all wallet-related state
      this.isConnected = false
      this.walletAddress = null
      this.evmAddress = null
      this.warpBoisCount = 0
      this.tacCount = 0
      this.nftStatus = null
      this.warpTokenCount = 0
      
      // If using compass wallet, you might want to disconnect it
      if (window.compass) {
        try {
          window.compass.disconnect()
        } catch (error) {
          console.error('Error disconnecting Compass wallet:', error)
        }
      }
    },
    handleTerminalHidden(hidden) {
      this.terminalHidden = hidden
    },
    showTerminal() {
      if (this.$refs.commandToast) {
        this.$refs.commandToast.hidden = false
        this.terminalHidden = false
      }
    },
    async checkWarpBalance() {
      if (!this.evmAddress) {
        console.log('No EVM address available for WARP balance check')
        return 0
      }
      
      try {
        const response = await fetch(
          `https://seitrace.com/pacific-1/gateway/api/v1/addresses/${this.evmAddress}/tokens?type=ERC-20`
        )
        
        if (!response.ok) {
          console.log(`Seitrace API error: ${response.status}`)
          return 0
        }

        const data = await response.json()
        
        // Find WARP token in the response
        const warpToken = data.items.find(item => 
          item.token.address.toLowerCase() === this.WARP_CONTRACT_ADDRESS.toLowerCase()
        )
        
        if (warpToken) {
          // Get value and consider decimals (6 for WARP token)
          const balance = Number(warpToken.value) / 1e6
          this.warpTokenBalance = balance
          console.log('WARP balance:', balance)
        } else {
          console.log('No WARP token found in wallet')
          this.warpTokenBalance = 0
        }
        
        return this.warpTokenBalance
      } catch (error) {
        console.log('Error fetching WARP balance:', error)
        this.warpTokenBalance = 0
        return 0
      }
    },
    async fetchSeiPrice() {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sei-network&vs_currencies=usd');
        const data = await response.json();
        this.seiPrice = data['sei-network'].usd;
      } catch (error) {
        console.error('Error fetching SEI price:', error);
        this.seiPrice = 0;
      }
    },
    formatNumber(num, decimals = 0) {
      if (!num) return '0';
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(num);
    }
  },
  setup() {
    const sharedTokenValue = ref(0)
    provide('tokenValue', sharedTokenValue)
    
    const updateSharedTokenValue = (value) => {
      sharedTokenValue.value = value
    }

    return {
      sharedTokenValue,
      updateSharedTokenValue
    }
  },
  computed: {
    hasAppAccess() {
      // Always return true if connected since we assume they have a Warp Boi
      return this.isConnected;
    },
    drawerHeight() {
      return window.innerHeight * 0.7; // 70% of the screen height
    }
  }
}
</script>
<style>
:root {
  /* Default theme (green) */
  --primary-text: #42b983;
  --secondary-text: #34495e;
  --accent-text: #42b983;
  --negative-text: #ff4444;  /* For price decreases */
}

/* Theme variations */
.theme-green {
  --primary-text: #42b983;
  --secondary-text: #34495e;
  --accent-text: #42b983;
  --negative-text: #ff4444;
}

.theme-red {
  --primary-text: #ff7070;
  --secondary-text: #ff9999;
  --accent-text: #ff7070;
  --negative-text: #ff4444;
}

.theme-cyan {
  --primary-text: #70d7ff;
  --secondary-text: #99e6ff;
  --accent-text: #70d7ff;
  --negative-text: #ff4444;
}

.theme-gold {
  --primary-text: #ffd700;
  --secondary-text: #ffeb99;
  --accent-text: #ffd700;
  --negative-text: #ff4444;
}

.theme-white {
  --primary-text: #ffffff;
  --secondary-text: #dddddd;
  --accent-text: #ffffff;
  --negative-text: #ff4444;
}

/* Global text styles */
h1, h2, h3, h4, h5, h6,
.title, .subtitle,
th, td,
label,
.chart-title,
.legend-item,
.token-count,
.chart-label,
.axis-label,
.tooltip-text,
button:not(.theme-btn),
.toggle-btn,
.section-header,
.prompt,
.command,
.response,
.highlight,
.requirement,
.debug-info,
.token-table th {
  color: var(--primary-text);
}

/* Chart.js customization */
.chartjs-render-monitor text,
.chartjs-axis-label,
.chartjs-legend-item-text {
  color: var(--primary-text) !important;
}

/* Price changes */
.positive-change {
  color: var(--accent-text) !important;
}

.negative-change {
  color: var(--negative-text) !important;
}

/* Keep theme buttons with their own colors */
.theme-btn {
  color: #1a1a1a !important;
}

#app {
  font-family: 'Source Code Pro', monospace;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #42b983;
  background-color: #1a1a1a;
  min-height: 100vh;
}

body {
  margin: 0;
  padding: 0;
  background-color: #1a1a1a;
}

.terminal-header {
  background-color: #2c2c2c;
  border-radius: 8px;
  margin: 20px auto;
  max-width: 800px;
  overflow: hidden;
}

.terminal-bar {
  background-color: #3c3c3c;
  padding: 8px;
  display: flex;
  align-items: center;
}

.terminal-buttons {
  display: flex;
  gap: 6px;
}

.terminal-circle {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.red { background-color: #ff5f56; }
.yellow { background-color: #ffbd2e; }
.green { background-color: #27c93f; }

.terminal-title {
  flex-grow: 1;
  text-align: center;
  color: #999;
}

.terminal-content {
  padding: 20px;
  text-align: left;
  line-height: 1.6;
}

.prompt {
  color: #42b983;
  margin-right: 8px;
}

.command {
  color: #fff;
}

.response {
  color: #666;
  display: block;
  margin-top: 10px;
}

.highlight {
  color: #42b983;
  font-weight: bold;
}

.warning {
  color: #ffbd2e;
}

.requirement {
  color: #42b983;
  display: block;
  margin-left: 20px;
}

.cursor {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

.wallet-address {
  color: #666;
  font-family: 'Source Code Pro', monospace;
}

.nft-status {
  color: #42b983;
  margin: 20px 0;
}

.nft-count {
  background-color: #2c2c2c;
  padding: 4px 8px;
  border-radius: 4px;
  margin: 0 5px;
}

.bottom-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #2c2c2c;
  padding: 15px;  /* Increased padding */
  display: flex;
  justify-content: center;
  gap: 20px;
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2); /* Optional: adds subtle shadow */
}

.nav-link {
  color: #42b983;
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.nav-link:hover {
  background-color: #3c3c3c;
}

.redacted {
  background-color: #666;
  color: #666;
  padding: 0 4px;
  user-select: none;
}

.nav-container {
  position: relative;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background-color: #2c2c2c;
  height: 60px;
}

.toolbar-left, .toolbar-right {
  display: flex;
  gap: 20px;
  align-items: center;
}

.nav-link {
  color: #ffffff;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background-color: #42b983;
  color: #1a1a1a;
}

.nav-link.router-link-active {
  color: #42b983;
}

/* Mobile Styles */
.mobile-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #2c2c2c;
  padding: 15px;  /* Increased padding */
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
}

.drawer-toggle {
  width: 100%;
  padding: 10px;
  background: none;
  border: none;
  color: #42b983;
  font-size: 24px;
  cursor: pointer;
}

.drawer {
  position: fixed;
  bottom: -100%;
  left: 0;
  right: 0;
  background-color: #2c2c2c;
  transition: bottom 0.3s ease;
  z-index: 999;
  max-height: 70vh;
  overflow-y: auto;
}

.drawer-open {
  bottom: 50px;
}

.drawer-content {
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.drawer-link {
  color: #ffffff;
  text-decoration: none;
  padding: 15px;
  border-bottom: 1px solid #3c3c3c;
  transition: all 0.3s ease;
}

.drawer-link:hover {
  background-color: #42b983;
  color: #1a1a1a;
}

.drawer-link.router-link-active {
  color: #42b983;
}

.menu-icon {
  display: inline-block;
  transition: transform 0.3s ease;
}

.drawer-open .menu-icon {
  transform: rotate(180deg);
}

/* Add backdrop when drawer is open */
.drawer-open::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: -1;
}

@media (max-width: 768px) {
  .toolbar {
    display: none;
  }
}

/* Add any necessary styles for the floating toast */
.command-toast {
  position: fixed;
  z-index: 1000;
  /* Initial position is set in the component */
}

.terminal-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #42b983;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.terminal-indicator:hover {
  background-color: #3c3c3c;
}

.terminal-dot {
  width: 8px;
  height: 8px;
  background-color: #27c93f;
  border-radius: 50%;
  display: inline-block;
}

.drawer-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 5; /* Make sure this is below your drawer's z-index */
}

.v-navigation-drawer {
  background-color: #2c2c2c !important;
  z-index: 1000 !important;
}

.drawer-content {
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #2c2c2c;
}

.drawer-link {
  color: #ffffff;
  text-decoration: none;
  padding: 15px;
  border-bottom: 1px solid #3c3c3c;
  transition: all 0.3s ease;
}

.v-application {
  background: transparent !important;
}

.sei-price-indicator {
  background: rgba(255, 59, 59, 0.2);
  color: #ff3b3b;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.9em;
  white-space: nowrap;
  cursor: default;
  user-select: none;
}

/* Add padding to main container to prevent toolbar overlap */
.app-container {
  padding-bottom: 80px; /* For desktop */
}

@media (max-width: 768px) {
  .app-container {
    padding-bottom: 120px; /* More padding for mobile */
  }
}
</style>