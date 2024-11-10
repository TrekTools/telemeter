<template>
  <router-view 
    :wallet-connected="isConnected"
    :walletAddress="walletAddress"
    :evmAddress="evmAddress"
    :warpBoisCount="warpBoisCount"
    :tacCount="tacCount"
    :nftStatus="nftStatus"
    @connect-wallet="handleConnect"
    @check-nfts="handleNFTCheck"
  ></router-view>
  <NftConveyor 
    :wallet-connected="isConnected"
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
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const supabase = createClient(
  process.env.VUE_APP_SUPABASE_URL,
  process.env.VUE_APP_SUPABASE_ANON_KEY
)

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
      warpBoisCount: 0,
      tacCount: 0,
      nftStatus: null,
      warpTokenCount: 0
    }
  },
  methods: {
    async handleConnect() {
      try {
        // First check if Compass is installed
        if (!window.compass) {
          alert("Please install Compass wallet");
          return;
        }

        // Use the correct chain ID format
        const chainId = "pacific-1";
        await window.compass.enable(chainId);
        const offlineSigner = window.compass.getOfflineSigner(chainId);
        const accounts = await offlineSigner.getAccounts();
        
        this.walletAddress = accounts[0].address;
        this.isConnected = true;
        
        // Get EVM address from SEI Trace API with correct endpoint
        const traceResponse = await fetch(`https://seitrace.com/pacific-1/gateway/api/v1/addresses/${this.walletAddress}`);
        const traceData = await traceResponse.json();
        this.evmAddress = traceData.association?.evm_hash;
        
        await this.handleNFTCheck();
        await this.logUserLogin();
      } catch (error) {
        console.error("Error connecting wallet:", error);
        if (error.message.includes("chain id not set")) {
          alert("Please make sure Compass wallet is properly configured for SEI Pacific-1");
        }
      }
    },
    async handleNFTCheck() {
      try {
        const WARP_BOIS_CONTRACT = "sei1ccqar77782xutkjnhx8wmufhqx076xxmma5ylfzzvl3kg2t6r6uqv39crm";
        const TAC_CONTRACT = "sei14cvgwjct3rcds3xzvem6eweaehe0vd3trjjpaz6zxzgse7yx890q8w8jam";
        
        const response = await fetch(`https://rest.sei-apis.com/cosmwasm/wasm/v1/contract/${WARP_BOIS_CONTRACT}/smart/${Buffer.from(JSON.stringify({tokens: {owner: this.walletAddress}})).toString('base64')}`);
        const data = await response.json();
        this.warpBoisCount = data.data.tokens.length;
        
        const tacResponse = await fetch(`https://rest.sei-apis.com/cosmwasm/wasm/v1/contract/${TAC_CONTRACT}/smart/${Buffer.from(JSON.stringify({tokens: {owner: this.walletAddress}})).toString('base64')}`);
        const tacData = await tacResponse.json();
        this.tacCount = tacData.data.tokens.length;
        
        this.nftStatus = this.warpBoisCount > 0 || this.tacCount > 0 ? "Warp Boi holder! 👾" : null;
      } catch (error) {
        console.error("Error checking NFTs:", error);
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
    }
  }
}
</script>

<style>
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

.connect-button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Source Code Pro', monospace;
  margin: 20px 0;
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
</style>