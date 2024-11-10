<template>
  <div v-if="hasRequiredNFT" class="edit-profile">
    <h1>Edit Profile</h1>
    
    <div class="wallet-manager">
      <h2>Manage Wallets</h2>
      
      <div v-for="(wallet, index) in wallets" :key="index" class="wallet-input-group">
        <div class="wallet-row">
          <input 
            type="text" 
            v-model="wallet.address"
            placeholder="Enter wallet address"
            class="wallet-input"
          />
          <select v-model="wallet.chain" class="chain-select">
            <option value="sei">Sei</option>
          </select>
          <button 
            @click="removeWallet(index)" 
            class="remove-wallet"
            v-if="wallets.length > 1"
          >
            ×
          </button>
        </div>
      </div>

      <button 
        @click="addWallet" 
        class="add-wallet-btn"
        :disabled="wallets.length >= 6"
      >
        + Add Wallet
      </button>
    </div>
  </div>
  <div v-else class="access-denied">
    <h2>Access Denied</h2>
    <p>You need to own a Warp Boi or Trek Access Chit to view this page.</p>
  </div>
</template>

<script>
export default {
  name: 'EditProfile',
  data() {
    return {
      wallets: [{
        address: '',
        chain: 'sei'
      }]
    }
  },
  computed: {
    hasRequiredNFT() {
      const warpBoisCount = parseInt(localStorage.getItem('warpBoisCount') || '0');
      const tacCount = parseInt(localStorage.getItem('tacCount') || '0');
      return warpBoisCount > 0 || tacCount > 0;
    }
  },
  methods: {
    addWallet() {
      if (this.wallets.length < 6) {
        this.wallets.push({
          address: '',
          chain: 'sei'
        });
      }
    },
    removeWallet(index) {
      this.wallets.splice(index, 1);
    }
  }
}
</script>

<style scoped>
.edit-profile {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.wallet-manager {
  background-color: #2c2c2c;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.wallet-input-group {
  margin-bottom: 15px;
}

.wallet-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.wallet-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #42b983;
  background-color: #1a1a1a;
  color: #ffffff;
  border-radius: 4px;
  font-family: 'Source Code Pro', monospace;
}

.chain-select {
  padding: 8px 12px;
  border: 1px solid #42b983;
  background-color: #1a1a1a;
  color: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Source Code Pro', monospace;
}

.remove-wallet {
  padding: 8px 12px;
  border: 1px solid #ff4444;
  background-color: #1a1a1a;
  color: #ff4444;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Source Code Pro', monospace;
}

.add-wallet-btn {
  padding: 8px 12px;
  border: 1px solid #42b983;
  background-color: #1a1a1a;
  color: #42b983;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Source Code Pro', monospace;
}

.access-denied {
  text-align: center;
  padding: 20px;
  color: #ff4444;
  background-color: #2c2c2c;
  border-radius: 8px;
  margin: 20px auto;
  max-width: 800px;
}
</style> 