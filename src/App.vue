<template>
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
  <button @click="connectWallet" class="connect-button">
    {{ isConnected ? 'Connected to SEI' : 'connect wallet' }}
  </button>
  <p v-if="walletAddress" class="wallet-address">
    SEI Address: {{ walletAddress }}
  </p>
  <p v-if="evmAddress" class="wallet-address">
    EVM Address: {{ evmAddress }}
  </p>
  <p v-if="nftStatus" class="nft-status">
    {{ nftStatus }}
    <span v-if="warpBoisCount > 0" class="nft-count">Warp Bois: {{ warpBoisCount }}</span>
    <span v-if="tacCount > 0" class="nft-count">TACs: {{ tacCount }}</span>
  </p>
  <router-view></router-view>
  <NftConveyor 
    :isConnected="isConnected"
    :walletAddress="walletAddress"
    :warpBoisCount="warpBoisCount"
    :tacCount="tacCount"
  />
  
  <nav class="bottom-toolbar">
    <router-link to="/" class="nav-link">Home</router-link>
    <router-link to="/guide" class="nav-link">Guide</router-link>
    <router-link to="/about" class="nav-link">About</router-link>
    
    <!-- Protected routes only shown when NFTs are owned -->
    <template v-if="warpBoisCount > 0 || tacCount > 0">
      <router-link to="/nft" class="nav-link">NFT Analysis</router-link>
      <router-link to="/coins" class="nav-link">Coins</router-link>
      <router-link to="/portfolio" class="nav-link">Portfolio</router-link>
      <router-link to="/trends" class="nav-link">Trends</router-link>
      <router-link to="/profile" class="nav-link">Profile</router-link>
    </template>
  </nav>
</template>

<script>
import NftConveyor from './components/NftConveyor.vue'

export default {
  name: 'App',
  components: {
    NftConveyor
  },
  data() {
    return {
      isConnected: false,
      walletAddress: null,
      evmAddress: null,
      nftStatus: null,
      WARP_BOIS_CONTRACT: "sei1ccqar77782xutkjnhx8wmufhqx076xxmma5ylfzzvl3kg2t6r6uqv39crm",
      TAC_CONTRACT: "sei14cvgwjct3rcds3xzvem6eweaehe0vd3trjjpaz6zxzgse7yx890q8w8jam",
      warpBoisCount: 0,
      tacCount: 0
    }
  },
  methods: {
    async connectWallet() {
      try {
        if (!window.compass) {
          alert('Please install Compass Wallet');
          return;
        }

        const response = await window.compass.getOfflineSigner("pacific-1");
        const accounts = await response.getAccounts();
        
        this.walletAddress = accounts[0].address;
        
        // Check NFT ownership
        await this.checkNFTs();
        
        // Fetch EVM address from SEI trace API
        const seiTraceResponse = await fetch(`https://seitrace.com/pacific-1/gateway/api/v1/addresses/${this.walletAddress}`);
        const data = await seiTraceResponse.json();
        if (data.association && data.association.evm_hash) {
          this.evmAddress = data.association.evm_hash;
        }
        
        this.isConnected = true;
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        alert('Failed to connect wallet');
      }
    },

    async checkNFTs() {
      try {
        console.log('Checking NFTs for address:', this.walletAddress);
        const palletResponse = await fetch(`https://api.pallet.exchange/api/v1/user/${this.walletAddress}?network=mainnet&include_tokens=true&include_bids=true`);
        const data = await palletResponse.json();
        
        if (data.error === "User not found") {
          this.nftStatus = "Please purchase a Warp Boi or Trek Access Chit from Pallet Exchange";
          this.warpBoisCount = 0;
          this.tacCount = 0;
          localStorage.setItem('warpBoisCount', '0');
          localStorage.setItem('tacCount', '0');
          return;
        }

        // Count the NFTs
        this.warpBoisCount = data.nfts?.filter(nft => 
          nft.collection.sei_address === this.WARP_BOIS_CONTRACT
        ).length || 0;
        
        this.tacCount = data.nfts?.filter(nft => 
          nft.collection.sei_address === this.TAC_CONTRACT
        ).length || 0;

        // Store counts in localStorage
        localStorage.setItem('warpBoisCount', this.warpBoisCount.toString());
        localStorage.setItem('tacCount', this.tacCount.toString());

        if (this.warpBoisCount > 0 && this.tacCount > 0) {
          this.nftStatus = "Trek Maxi! 🚀";
        } else if (this.warpBoisCount > 0) {
          this.nftStatus = "Warp Boi holder! 👾";
        } else if (this.tacCount > 0) {
          this.nftStatus = "TAC Holder! 🎫";
        } else {
          this.nftStatus = "Please purchase a Warp Boi or Trek Access Chit from Pallet Exchange";
        }
      } catch (error) {
        console.error('Failed to check NFTs:', error);
        this.nftStatus = "Error checking NFT status";
        this.warpBoisCount = 0;
        this.tacCount = 0;
        localStorage.setItem('warpBoisCount', '0');
        localStorage.setItem('tacCount', '0');
      }
    }
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;600&display=swap');

#app {
  font-family: 'Source Code Pro', 'Courier New', Courier, monospace;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #ffffff;
  margin-top: 60px;
  background-color: #1a1a1a;
  min-height: 100vh;
  padding: 20px;
  padding-bottom: 80px;
}

body {
  margin: 0;
  background-color: #1a1a1a;
}

.connect-button {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
  font-family: 'Source Code Pro', 'Courier New', Courier, monospace;
}

.connect-button:hover {
  background-color: #3aa876;
  box-shadow: 0 0 15px rgba(66, 185, 131, 0.3);
}

.wallet-address {
  margin-top: 20px;
  word-break: break-all;
  padding: 15px 20px;
  font-family: 'Source Code Pro', 'Courier New', Courier, monospace;
  background-color: #2c2c2c;
  border-radius: 8px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  color: #42b983;
}

img {
  filter: brightness(0.9);
}

.nft-status {
  margin-top: 20px;
  padding: 15px 20px;
  background-color: #2c2c2c;
  border-radius: 8px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  color: #42b983;
  font-weight: bold;
}

.nft-count {
  display: block;
  font-size: 0.9em;
  margin-top: 8px;
  color: #42b983;
}

.edit-profile,
.nft-analysis,
.coin-analysis,
.trend-analysis,
.portfolio-analysis {
  padding: 20px;
  margin: 20px auto;
  max-width: 800px;
  background-color: #2c2c2c;
  border-radius: 8px;
}

h1 {
  color: #42b983;
  margin-bottom: 20px;
}

p {
  color: #ffffff;
  line-height: 1.6;
}

.bottom-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #2c2c2c;
  padding: 15px;
  display: flex;
  justify-content: center;
  gap: 20px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
}

.nav-link {
  color: #ffffff;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 4px;
  transition: all 0.3s ease;
  font-family: 'Source Code Pro', 'Courier New', Courier, monospace;
}

.nav-link:hover {
  background-color: #42b983;
  color: #1a1a1a;
}

.nav-link.router-link-active {
  background-color: #42b983;
  color: #1a1a1a;
}

.terminal-header {
  width: 400px;
  margin: 20px auto;
  background-color: #1a1a1a;
  border-radius: 6px;
  box-shadow: 0 0 20px rgba(66, 185, 131, 0.2);
  overflow: hidden;
}

.terminal-bar {
  background-color: #2c2c2c;
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
  color: #666;
  font-size: 12px;
  margin-left: 20px;
}

.terminal-content {
  padding: 15px;
  font-family: 'Source Code Pro', monospace;
  color: #42b983;
  font-size: 14px;
  text-shadow: 0 0 5px rgba(66, 185, 131, 0.3);
}

.prompt {
  color: #42b983;
  margin-right: 8px;
}

.command {
  color: #fff;
  margin-right: 8px;
}

.response {
  display: block;
  margin-top: 8px;
  color: #42b983;
  line-height: 1.5;
}

.cursor {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.redacted {
  background-color: #42b983;
  color: #42b983;
  padding: 0 4px;
  font-family: monospace;
  text-shadow: none;
  position: relative;
}

.highlight {
  color: #42b983;
  font-weight: bold;
  text-shadow: 0 0 8px rgba(66, 185, 131, 0.5);
}

.warning {
  color: #ffbd2e;
  font-weight: bold;
  margin-top: 8px;
  display: block;
}

.requirement {
  color: #42b983;
  display: block;
  padding-left: 12px;
  font-size: 0.9em;
  opacity: 0.9;
}

.requirement::before {
  content: '>';
  margin-right: 6px;
  color: #42b983;
}
</style>