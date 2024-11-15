<template>
  <div id="app" :class="currentTheme">
    <router-view 
      :wallet-connected="isConnected"
      :wallet-address="walletAddress"
      :evm-address="evmAddress"
      :has-access="hasAppAccess"
      :warp-bois-count="Number(warpBoisCount)"
      :tac-count="Number(tacCount)"
      :nft-status="nftStatus"
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
        
        <!-- Add terminal indicator -->
        <div v-if="terminalHidden" 
             class="terminal-indicator" 
             @click="showTerminal">
          <span class="terminal-dot"></span>
          Terminal
        </div>

        <!-- Protected routes only shown when NFTs are owned -->
        <template v-if="warpBoisCount > 0 || tacCount > 0">
          <router-link to="/portfolio" class="nav-link">Portfolio</router-link>
          <router-link to="/coins" class="nav-link">Coins</router-link>
          <router-link to="/nft" class="nav-link">NFT Analysis</router-link>
          <router-link to="/trends" class="nav-link">Market Trends</router-link>
          <router-link to="/profile" class="nav-link">Profile</router-link>
          <router-link to="/warp" class="nav-link">$WARP</router-link>
          <router-link to="/delegations" class="nav-link">Delegations</router-link>
        </template>
      </nav>

      <!-- Mobile Navigation with Drawer -->
      <nav class="mobile-toolbar" v-show="isMobile">
        <button class="drawer-toggle" @click="isDrawerOpen = !isDrawerOpen">
          <span class="menu-icon">☰</span>
        </button>
        
        <div class="drawer" :class="{ 'drawer-open': isDrawerOpen }">
          <div class="drawer-content">
            <router-link to="/" class="drawer-link" @click="closeDrawer">Home</router-link>
            <router-link to="/about" class="drawer-link" @click="closeDrawer">About</router-link>
            <router-link to="/guide" class="drawer-link" @click="closeDrawer">Guide</router-link>
            
            <!-- Protected routes in drawer -->
            <template v-if="warpBoisCount > 0 || tacCount > 0">
              <router-link to="/portfolio" class="drawer-link" @click="closeDrawer">Portfolio</router-link>
              <router-link to="/coins" class="drawer-link" @click="closeDrawer">Coins</router-link>
              <router-link to="/nft" class="drawer-link" @click="closeDrawer">NFT Analysis</router-link>
              <router-link to="/trends" class="drawer-link" @click="closeDrawer">Market Trends</router-link>
              <router-link to="/profile" class="drawer-link" @click="closeDrawer">Profile</router-link>
              <router-link to="/warp" class="drawer-link" @click="closeDrawer">$WARP</router-link>
              <router-link to="/delegations" class="drawer-link" @click="closeDrawer">Delegations</router-link>
            </template>
          </div>
        </div>
      </nav>
    </div>
  </div>
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
      warpBoisCount: 0,
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
      WARP_MINIMUM_BALANCE: 1000000
    }
  },
  created() {
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)
    // Listen for theme changes
    window.addEventListener('themeChanged', (e) => {
      this.currentTheme = `theme-${e.detail}`
    })
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
  },
  watch: {
    async warpBoisCount(newCount) {
      if (newCount > 0 && !this.activeWarpBoi) {
        try {
          const response = await fetch(`https://api.pallet.exchange/api/v2/nfts/sei1ccqar77782xutkjnhx8wmufhqx076xxmma5ylfzzvl3kg2t6r6uqv39crm/tokens/1887`)
          const data = await response.json()
          this.activeWarpBoi = data.tokens[0]
          console.log('Fetched Warp Boi:', this.activeWarpBoi)
        } catch (error) {
          console.error('Error fetching Warp Boi:', error)
        }
      } else if (newCount === 0) {
        this.activeWarpBoi = null
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
        
        // Replace seitrace with Pallet API
        try {
          const palletResponse = await fetch(
            `https://api.pallet.exchange/api/v1/user/${this.walletAddress}?network=mainnet&include_estimated_value=true`
          );
          const palletData = await palletResponse.json();
          this.evmAddress = palletData.evm_address;
          console.log('EVM address from Pallet:', this.evmAddress);
          
          // Add this: Check WARP balance after getting EVM address
          await this.checkWarpBalance();
        } catch (error) {
          console.error('Error fetching EVM address from Pallet:', error);
        }

        // Add longer delay for mobile
        const delay = this.isMobile ? 2000 : 1000;
        
        // Multiple NFT checks with increasing delays
        setTimeout(() => this.handleNFTCheck(), delay);
        setTimeout(() => this.handleNFTCheck(), delay * 2);
        
        await this.logUserLogin();
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    },

    async handleNFTCheck() {
      if (!this.walletAddress || !this.isConnected) {
        console.error('Invalid wallet state for NFT check');
        return;
      }

      try {
        // Try Pallet API first
        const palletResponse = await fetch(
          `https://api.pallet.exchange/api/v1/user/${this.walletAddress}?network=mainnet&include_tokens=true&include_bids=true&fetch_nfts=true`
        );
        
        if (palletResponse.ok) {
          const palletData = await palletResponse.json();
          // Check for both WARP and TAC NFTs
          const warpNFTs = palletData.nfts?.filter(nft => 
            nft.collection.symbol === 'WARP'
          );
          const tacNFTs = palletData.nfts?.filter(nft => 
            nft.collection.symbol === 'TAC'
          );
          
          this.warpBoisCount = warpNFTs?.length || 0;
          this.tacCount = tacNFTs?.length || 0;
          
          console.log('NFT Check Results:', {
            warpBois: this.warpBoisCount,
            tacs: this.tacCount
          });
          return;
        }
      } catch (error) {
        console.error('Error in NFT check:', error);
        // Don't reset counts on error
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
      const wasMobile = this.isMobile
      this.isMobile = window.innerWidth <= 768
      
      // If switching from mobile to desktop or vice versa, recheck NFTs
      if (wasMobile !== this.isMobile && this.isConnected) {
        console.log('Device type changed, rechecking NFTs...')
        this.handleNFTCheck()
      }

      if (!this.isMobile) {
        this.isDrawerOpen = false
      }
    },
    closeDrawer() {
      this.isDrawerOpen = false
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
      if (!this.evmAddress) return 0;
      
      try {
        const response = await fetch(`https://seitrace.com/pacific-1/gateway/api/v1/addresses/${this.evmAddress}/tokens?type=ERC-20`);
        const data = await response.json();
        
        // Find WARP token in the response
        const warpToken = data.items.find(item => 
          item.token.address.toLowerCase() === this.WARP_CONTRACT_ADDRESS.toLowerCase()
        );
        
        if (warpToken) {
          // Get value and consider decimals (6 for WARP token)
          this.warpTokenBalance = Number(warpToken.value) / 1e6;
          console.log('WARP balance:', this.warpTokenBalance);
        } else {
          this.warpTokenBalance = 0;
        }
        
        return this.warpTokenBalance;
      } catch (error) {
        console.error('Error fetching WARP balance:', error);
        return 0;
      }
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
      return this.warpBoisCount > 0 || 
             this.tacCount > 0 || 
             this.warpTokenBalance >= this.WARP_MINIMUM_BALANCE;
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
  padding: 10px;
  display: flex;
  justify-content: center;
  gap: 20px;
  z-index: 1000;
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
  padding: 10px;
  z-index: 1000;
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
</style>