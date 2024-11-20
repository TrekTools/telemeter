<template>
  <div v-if="hasRequiredNFT" class="edit-profile">
    <h1>Edit Profile</h1>
    
    <div class="theme-selector">
      <button 
        v-for="color in themeColors" 
        :key="color.name"
        @click="setTheme(color.value)"
        class="theme-btn"
        :class="{ active: currentTheme === color.value }"
        :style="{ backgroundColor: color.value }"
      >
        {{ color.name }}
      </button>
    </div>
    
    <!-- Collapsible Wallet Manager -->
    <div class="section-header" @click="toggleWalletManager">
      <h2>Manage Wallets</h2>
      <span class="toggle-icon">{{ isWalletManagerOpen ? '▼' : '▶' }}</span>
    </div>

    <div class="toggle-group">
      <label class="toggle-switch">
        <input 
          type="checkbox" 
          :checked="!isWalletExcluded(controlWalletUuid)"
          @change="toggleWalletExclusion(controlWalletUuid)"
        >
        <span class="toggle-slider"></span>
      </label>
      <span class="toggle-label">Include control wallet in Analytics</span>
    </div>
    
    <div class="wallet-manager" v-show="isWalletManagerOpen">
      <div class="wallet-input-group">
        <div class="wallet-row">
          <input 
            type="text" 
            v-model="walletInput"
            placeholder="Enter wallet address (or multiple separated by commas)"
            class="wallet-input"
            :class="{ 'error': inputError }"
          />
          <select v-model="selectedChain" class="chain-select">
            <option value="sei">Sei</option>
          </select>
          <button 
            @click="handleAddWallets"
            class="add-wallet-btn"
            :disabled="!walletInput.trim() || loading"
          >
            {{ addButtonText }}
          </button>
        </div>
        <span v-if="inputError" class="error-message">{{ inputError }}</span>
      </div>

      <div class="linked-wallets" v-if="linkedWallets.length">
        <h3>Linked Wallets</h3>
        <table>
          <thead>
            <tr>
              <th>Label</th>
              <th>SEI Address</th>
              <th>EVM Address</th>
              <th>Added</th>
              <th>Include in Analytics</th>
              <th>Remove</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="wallet in linkedWallets" :key="wallet.uuid">
              <td class="label-cell">
                <div class="label-input-group">
                  <input 
                    type="text" 
                    v-model="wallet.label"
                    class="label-input"
                    :placeholder="wallet.sei_hash === walletAddress ? 'Primary Wallet' : 'Add label'"
                  />
                  <button 
                    @click="updateWalletLabel(wallet)"
                    class="save-btn"
                    :class="{
                      'inactive': !wallet.label?.trim(),
                      'success': wallet.saveSuccess
                    }"
                    :disabled="!wallet.label?.trim()"
                  >
                    {{ wallet.saveSuccess ? '✓' : 'Save' }}
                  </button>
                </div>
              </td>
              <td>{{ truncateAddress(wallet.sei_hash) }}</td>
              <td>{{ truncateAddress(wallet.evm_hash) }}</td>
              <td>{{ new Date(wallet.timestamp).toLocaleString() }}</td>
              <td>
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    :checked="!isWalletExcluded(wallet.uuid)"
                    @change="toggleWalletExclusion(wallet.uuid)"
                  >
                  <span class="toggle-slider"></span>
                </label>
              </td>
              <td>
                <button 
                  @click="deleteLinkedWallet(wallet.uuid)"
                  class="delete-btn"
                  v-if="wallet.sei_hash !== walletAddress"
                >×</button>
                <span 
                  v-else 
                  class="control-note"
                  title="Control wallets cannot be deleted"
                >
                  (control)
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Collapsible Social Links -->
    <div class="section-header" @click="toggleSocialManager">
      <h2>Connect Social Accounts</h2>
      <span class="toggle-icon">{{ isSocialManagerOpen ? '▼' : '▶' }}</span>
    </div>
    
    <div class="social-manager" v-show="isSocialManagerOpen">
      <div class="social-buttons">
        <button 
          class="social-btn discord disabled"
          disabled
        >
          <i class="fab fa-discord"></i>
          Connect Discord
          <span class="coming-soon-badge">Coming Soon</span>
        </button>

        <button 
          class="social-btn twitter disabled"
          disabled
        >
          <i class="fab fa-twitter"></i>
          Connect Twitter
          <span class="coming-soon-badge">Coming Soon</span>
        </button>
      </div>
    </div>
  </div>
  <div v-else class="access-denied">
    <h2>Access Denied</h2>
    <p>You need to own a Warp Boi or Trek Access Chit to view this page.</p>
  </div>
</template>

<script>
import supabase from '../supabase'  // Import shared instance
import { v4 as uuidv4 } from 'uuid'
import { mapState } from 'vuex'

export default {
  name: 'EditProfile',
  props: {
    walletAddress: String,  // control_sei_hash
    evmAddress: String,     // control_evm_hash
    warpBoisCount: {        // Add this prop
      type: Number,
      default: 0
    },
    tacCount: {             // Add this prop
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      walletInput: '',
      selectedChain: 'sei',
      inputError: null,
      linkedWallets: [],
      toast: null,
      loading: false,
      addButtonText: 'Add Wallets',
      discordConnected: false,
      twitterConnected: false,
      discordUsername: '',
      twitterHandle: '',
      discordError: null,
      twitterError: null,
      isWalletManagerOpen: true,
      isSocialManagerOpen: true,
      currentTheme: 'theme-green', // Default green
      themeColors: [
        { name: 'Green', value: 'green' },
        { name: 'Red', value: 'red' },
        { name: 'Cyan', value: 'cyan' },
        { name: 'Gold', value: 'gold' },
        { name: 'White', value: 'white' }
      ],
    }
  },
  async created() {
    await this.$store.dispatch('initializePreferences', this.walletAddress)
    await this.loadLinkedWallets()
    await this.checkAndAddControlWallet()
    await this.loadSocialConnections()
  },
  computed: {
    hasRequiredNFT() {
      return this.warpBoisCount > 0 || this.tacCount > 0;
    },
    isValidDiscord() {
      return this.discordUsername && /^.{3,32}#[0-9]{4}$/.test(this.discordUsername)
    },
    isValidTwitter() {
      return this.twitterHandle && /^@?(\w){1,15}$/.test(this.twitterHandle)
    },
    ...mapState({
      excludedWallets: state => state.preferences.excludedWallets
    }),
    
    controlWalletUuid() {
      const controlWallet = this.linkedWallets.find(
        wallet => wallet.sei_hash === this.walletAddress
      )
      return controlWallet?.uuid
    }
  },
  methods: {
    truncateAddress(address) {
      if (!address) return ''
      return `${address.slice(0, 4)}...${address.slice(-4)}`
    },
    async checkAndAddControlWallet() {
      if (!this.walletAddress) return

      try {
        // Check if control wallet is already in the table
        const { data, error } = await supabase
          .from('linked_wallets')
          .select('*')
          .eq('control_sei_hash', this.walletAddress)
          .eq('sei_hash', this.walletAddress)
          .maybeSingle()

        if (error) {
          console.error('Error checking control wallet:', error)
          return
        }

        if (!data) {
          // Add control wallet as first entry
          const { error: insertError } = await supabase
            .from('linked_wallets')
            .insert({
              uuid: uuidv4(),
              control_sei_hash: this.walletAddress,
              control_evm_hash: this.evmAddress,
              sei_hash: this.walletAddress,
              evm_hash: this.evmAddress,
              timestamp: new Date().toISOString()
            })

          if (insertError) {
            console.error('Error inserting control wallet:', insertError)
            return
          }
          
          await this.loadLinkedWallets()
        }
      } catch (error) {
        console.error('Error in checkAndAddControlWallet:', error)
      }
    },
    async loadLinkedWallets() {
      if (!this.walletAddress) return

      try {
        const { data, error } = await supabase
          .from('linked_wallets')
          .select('*')
          .eq('control_sei_hash', this.walletAddress)
          .order('timestamp', { ascending: false })

        if (error) {
          console.error('Error loading linked wallets:', error)
          return
        }

        this.linkedWallets = data.map(wallet => ({
          ...wallet,
          saveSuccess: false
        }))
      } catch (error) {
        console.error('Error in loadLinkedWallets:', error)
      }
    },
    validateAddress(address) {
      return /^[a-zA-Z0-9,]+$/.test(address)
    },
    async validateAndFetchAddress() {
      if (!this.walletInput.trim()) {
        this.inputError = 'Please enter a valid wallet address'
        return
      }

      const addresses = this.walletInput.trim().split(',')

      try {
        for (const address of addresses) {
          const cleanAddress = address.trim()
          
          if (!this.validateAddress(cleanAddress)) {
            this.inputError = 'Invalid address format'
            return
          }

          if (cleanAddress.startsWith('sei')) {
            const response = await fetch(`https://seitrace.com/pacific-1/gateway/api/v1/addresses/${cleanAddress}`)
            const data = await response.json()
            const evmHash = data.association?.evm_hash

            if (evmHash) {
              await this.addLinkedWallet(cleanAddress, evmHash)
            }
          } else if (cleanAddress.startsWith('0x')) {
            const response = await fetch(`https://seitrace.com/pacific-1/gateway/api/v1/addresses/${cleanAddress}`)
            const data = await response.json()
            const seiHash = data.association?.sei_hash

            if (seiHash) {
              await this.addLinkedWallet(seiHash, cleanAddress)
            }
          }
        }

        this.inputError = null
        this.walletInput = ''
        await this.loadLinkedWallets()
      } catch (error) {
        this.inputError = 'Error validating address'
        console.error('Error:', error)
      }
    },
    async addLinkedWallet(seiHash, evmHash) {
      try {
        // First check if wallet pair already exists
        const { data: existingWallet, error: checkError } = await supabase
          .from('linked_wallets')
          .select('*')
          .eq('control_sei_hash', this.walletAddress)
          .eq('sei_hash', seiHash)
          .eq('evm_hash', evmHash)
          .maybeSingle()

        if (checkError) {
          console.error('Error checking existing wallet:', checkError)
          throw checkError
        }

        // If wallet already exists, don't add it again
        if (existingWallet) {
          console.log('Wallet pair already exists')
          return
        }

        // If wallet doesn't exist, add it
        const { error: insertError } = await supabase
          .from('linked_wallets')
          .insert({
            uuid: uuidv4(),
            control_sei_hash: this.walletAddress,
            control_evm_hash: this.evmAddress,
            sei_hash: seiHash,
            evm_hash: evmHash,
            label: '',
            timestamp: new Date().toISOString()
          })

        if (insertError) {
          console.error('Error adding linked wallet:', insertError)
          throw insertError
        }

        // Clear NFT Analysis cache after adding wallet
        this.clearNFTAnalysisCache()
        
        // Refresh the wallet list
        await this.loadLinkedWallets()
      } catch (error) {
        console.error('Error in addLinkedWallet:', error)
        this.inputError = 'Error adding wallet: Wallet may already be linked'
      }
    },
    async deleteLinkedWallet(uuid) {
      try {
        // First check if this is the control wallet
        const { data: walletToDelete } = await supabase
          .from('linked_wallets')
          .select('sei_hash')
          .eq('uuid', uuid)
          .single()

        // Don't allow deletion if it's the control wallet
        if (walletToDelete.sei_hash === this.walletAddress) {
          console.error('Cannot delete control wallet')
          return
        }

        const { error } = await supabase
          .from('linked_wallets')
          .delete()
          .match({ uuid })
          .eq('control_sei_hash', this.walletAddress) // Safety check

        if (error) throw error

        // Clear NFT Analysis cache after deleting wallet
        this.clearNFTAnalysisCache()
        await this.loadLinkedWallets()
      } catch (error) {
        console.error('Error deleting linked wallet:', error)
      }
    },
    isValidLabel(label) {
      return label && !label.includes(';')
    },
    async updateWalletLabel(wallet) {
      if (!wallet.label?.trim()) return

      try {
        const { error } = await supabase
          .from('linked_wallets')
          .update({ label: wallet.label.trim() })
          .eq('uuid', wallet.uuid)

        if (error) throw error

        // Show success state
        wallet.saveSuccess = true
        
        // Reset success state after 2 seconds
        setTimeout(() => {
          wallet.saveSuccess = false
        }, 2000)

      } catch (error) {
        console.error('Error updating label:', error)
        // Optionally show error toast
        this.showToast('Failed to update label')
      }
    },
    showToast(message) {
      this.toast = message
      setTimeout(() => {
        this.toast = null
      }, 3000)
    },
    clearNFTAnalysisCache() {
      sessionStorage.removeItem('nftAnalysisCache')
    },
    async handleAddWallets() {
      if (!this.walletInput.trim()) return
      
      this.loading = true
      this.addButtonText = '⌛'
      
      try {
        await this.validateAndFetchAddress()
        this.addButtonText = '✓'
        setTimeout(() => {
          this.addButtonText = 'Add Wallets'
        }, 2000)
      } catch (error) {
        this.addButtonText = '✗'
        setTimeout(() => {
          this.addButtonText = 'Add Wallets'
        }, 2000)
      } finally {
        this.loading = false
      }
    },
    async loadSocialConnections() {
      try {
        const { data, error } = await supabase
          .from('linked_wallets')
          .select('discord_username, twitter_handle')
          .eq('control_sei_hash', this.walletAddress)
          .single()

        if (error) throw error

        if (data) {
          this.discordConnected = !!data.discord_username
          this.twitterConnected = !!data.twitter_handle
          this.discordUsername = data.discord_username || ''
          this.twitterHandle = data.twitter_handle || ''
        }
      } catch (error) {
        console.error('Error loading social connections:', error)
      }
    },
    connectDiscord() {
      // Discord OAuth URL with your client ID
      const DISCORD_CLIENT_ID = process.env.VUE_APP_DISCORD_CLIENT_ID
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth/discord/callback`)
      const scope = 'identify'
      
      window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`
    },

    connectTwitter() {
      // Twitter OAuth URL
      const TWITTER_CLIENT_ID = process.env.VUE_APP_TWITTER_CLIENT_ID
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth/twitter/callback`)
      const scope = 'users.read'
      
      window.location.href = `https://twitter.com/i/oauth2/authorize?client_id=${TWITTER_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`
    },

    async disconnectSocial(platform) {
      try {
        const updateData = {}
        if (platform === 'discord') {
          updateData.discord_id = null
          updateData.discord_username = null
          this.discordConnected = false
          this.discordUsername = ''
        } else if (platform === 'twitter') {
          updateData.twitter_id = null
          updateData.twitter_handle = null
          this.twitterConnected = false
          this.twitterHandle = ''
        }

        const { error } = await supabase
          .from('linked_wallets')
          .update(updateData)
          .eq('control_sei_hash', this.walletAddress)

        if (error) throw error

        this.showToast(`${platform} account disconnected`)
      } catch (error) {
        console.error(`Error disconnecting ${platform}:`, error)
      }
    },
    toggleWalletManager() {
      this.isWalletManagerOpen = !this.isWalletManagerOpen
    },
    toggleSocialManager() {
      this.isSocialManagerOpen = !this.isSocialManagerOpen
    },
    setTheme(color) {
      // Dispatch theme change event
      window.dispatchEvent(new CustomEvent('themeChanged', { 
        detail: color 
      }))
      
      // Store theme preference (optional)
      localStorage.setItem('preferred-theme', color)
    },
    async toggleWalletExclusion(walletUuid) {
      if (!walletUuid) return

      try {
        await this.$store.dispatch('updateWalletExclusion', {
          walletUuid,
          excluded: !this.isWalletExcluded(walletUuid)
        })
      } catch (error) {
        this.showToast('Failed to update preference')
      }
    },
    isWalletExcluded(walletUuid) {
      return this.excludedWallets.has(walletUuid)
    }
  },
  mounted() {
    // Load saved theme preference (optional)
    const savedTheme = localStorage.getItem('preferred-theme')
    if (savedTheme) {
      this.setTheme(savedTheme)
    }
  }
}
</script>

<style scoped>
:root {
  --theme-color: #42b983;
}

.edit-profile {
  padding: 20px;
  max-width: 1200px;
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
  border: 1px solid var(--theme-color);
  background-color: #1a1a1a;
  color: #ffffff;
  border-radius: 4px;
  font-family: 'Source Code Pro', monospace;
}

.chain-select {
  padding: 8px 12px;
  border: 1px solid var(--theme-color);
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
  padding: 8px 16px;
  border: 1px solid var(--theme-color);
  background-color: #1a1a1a;
  color: var(--theme-color);
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Source Code Pro', monospace;
  min-width: 100px;
  transition: all 0.3s ease;
}

.add-wallet-btn:hover:not(:disabled) {
  background-color: var(--theme-color);
}

.add-wallet-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.error {
  border-color: #ff4444 !important;
}

.error-message {
  color: #ff4444;
  font-size: 0.8em;
  margin-top: 4px;
  display: block;
}

.linked-wallets {
  margin-top: 20px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.linked-wallets table {
  width: 100%;
  min-width: 1000px;
  border-collapse: collapse;
  margin-top: 10px;
  background-color: #1a1a1a;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #3c3c3c;
}

th {
  color: var(--theme-color);
  font-weight: normal;
}

.label-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  position: relative;
}

.save-btn {
  position: relative;
  flex-shrink: 0;
  background: green;
  color: #1a1a1a;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 0.8em;
  height: 24px;
  min-width: 50px;
  margin-left: 8px;
  transition: all 0.3s ease;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.save-btn.inactive {
  background: #666666 !important;
  cursor: not-allowed;
  opacity: 1 !important;
}

.save-btn.success {
  background: #42b983 !important;
  opacity: 1 !important;
}

.save-btn:not(.inactive):hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.label-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.label-input {
  flex: 1;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--theme-color);
  color: #ffffff;
  padding: 4px 8px;
  font-family: 'Source Code Pro', monospace;
  min-width: 120px;
}

.delete-btn {
  background: none;
  border: none;
  color: #ff4444;
  cursor: pointer;
  font-size: 1.2em;
  padding: 0 8px;
  transition: color 0.3s;
}

.delete-btn:hover {
  color: #ff6666;
}

td {
  padding: 8px 12px;
  vertical-align: middle;
}

.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: var(--theme-color);
  color: #1a1a1a;
  padding: 12px 24px;
  border-radius: 4px;
  z-index: 1000;
  opacity: 0;
  transform: translateY(-20px);
  transition: all 0.3s ease;
}

.toast-show {
  opacity: 1;
  transform: translateY(0);
}

.control-note {
  color: #666;
  font-size: 0.8em;
  font-style: italic;
}

.social-manager {
  background-color: #2c2c2c;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.social-buttons {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.social-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 1.1em;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
}

.social-btn i {
  font-size: 1.2em;
}

.social-btn.discord {
  background-color: #5865F2;
}

.social-btn.twitter {
  background-color: #1DA1F2;
}

.social-btn.discord:hover {
  background-color: #4752c4;
}

.social-btn.twitter:hover {
  background-color: #1a8cd8;
}

.social-btn.connected {
  background-color: var(--theme-color);
}

.connected-accounts {
  margin-top: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  margin-top: 10px;
}

.disconnect-btn {
  margin-left: auto;
  padding: 6px 12px;
  border: 1px solid #ff4444;
  background: transparent;
  color: #ff4444;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.disconnect-btn:hover {
  background: #ff4444;
  color: white;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  background-color: #2c2c2c;
  border-radius: 8px;
  margin-top: 20px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.section-header:hover {
  background-color: #363636;
}

.toggle-icon {
  color: var(--theme-color);
  font-size: 0.8em;
}

.social-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  position: relative;
  overflow: hidden;
}

.coming-soon-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  white-space: nowrap;
}

.social-btn.disabled:hover .coming-soon-badge {
  display: block;
}

.wallet-manager, .social-manager {
  transition: all 0.3s ease;
}

.theme-selector {
  display: flex;
  gap: 10px;
  margin: 20px 0;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.theme-btn {
  padding: 8px 16px;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #1a1a1a;
  font-weight: bold;
  transition: all 0.3s ease;
}

.theme-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.theme-btn.active {
  border-color: #ffffff;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.toggle-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 20px 0;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #2c2c2c;
  transition: .4s;
  border-radius: 34px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #42b983;
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.toggle-label {
  color: #ffffff;
  font-size: 0.9em;
}
</style> 