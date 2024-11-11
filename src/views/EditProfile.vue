<template>
  <div v-if="hasRequiredNFT" class="edit-profile">
    <h1>Edit Profile</h1>
    
    <div class="wallet-manager">
      <h2>Manage Wallets</h2>
      
      <div class="wallet-input-group">
        <div class="wallet-row">
          <input 
            type="text" 
            v-model="walletInput"
            @blur="validateAndFetchAddress"
            placeholder="Enter wallet address (or multiple separated by commas)"
            class="wallet-input"
            :class="{ 'error': inputError }"
          />
          <select v-model="selectedChain" class="chain-select">
            <option value="sei">Sei</option>
          </select>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="wallet in linkedWallets" :key="wallet.uuid">
              <td class="label-cell">
                <input 
                  type="text" 
                  v-model="wallet.label"
                  class="label-input"
                  :placeholder="wallet.sei_hash === walletAddress ? 'Primary Wallet' : 'Add label'"
                >
                <button 
                  @click="(event) => updateWalletLabel(wallet, event)"
                  class="save-btn"
                  :disabled="!isValidLabel(wallet.label)"
                  :title="!isValidLabel(wallet.label) ? 'Label cannot contain semi-colons' : ''"
                >
                  Save
                </button>
              </td>
              <td>{{ truncateAddress(wallet.sei_hash) }}</td>
              <td>{{ truncateAddress(wallet.evm_hash) }}</td>
              <td>{{ new Date(wallet.timestamp).toLocaleString() }}</td>
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
  </div>
  <div v-else class="access-denied">
    <h2>Access Denied</h2>
    <p>You need to own a Warp Boi or Trek Access Chit to view this page.</p>
  </div>
</template>

<script>
import supabase from '../supabase'  // Import shared instance
import { v4 as uuidv4 } from 'uuid'

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
      toast: null
    }
  },
  async created() {
    await this.loadLinkedWallets()
    await this.checkAndAddControlWallet()
  },
  computed: {
    hasRequiredNFT() {
      return this.warpBoisCount > 0 || this.tacCount > 0;
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

        this.linkedWallets = data || []
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
    async updateWalletLabel(wallet, event) {
      if (!this.isValidLabel(wallet.label)) {
        this.inputError = 'Label cannot contain semi-colons'
        return
      }

      try {
        const { error } = await supabase
          .from('linked_wallets')
          .update({ label: wallet.label.trim() })
          .match({ uuid: wallet.uuid })
          .eq('control_sei_hash', this.walletAddress)

        if (error) throw error

        // Show success feedback on button
        const btn = event.target
        btn.textContent = '✓'
        setTimeout(() => {
          btn.textContent = 'Save'
        }, 1000)

        // Show toast message
        this.showToast('Label updated')
      } catch (error) {
        console.error('Error updating wallet label:', error)
        this.inputError = 'Error saving label'
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
}

table {
  width: 100%;
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
  color: #42b983;
  font-weight: normal;
}

.label-input {
  background: transparent;
  border: none;
  border-bottom: 1px solid #42b983;
  color: #ffffff;
  padding: 4px 8px;
  font-family: 'Source Code Pro', monospace;
  width: 150px;
}

.label-input:disabled {
  border-bottom: 1px solid #666;
  color: #666;
}

.label-input:focus {
  outline: none;
  border-bottom: 2px solid #42b983;
}

.label-input::placeholder {
  color: #666;
}

.label-cell {
  display: flex;
  gap: 8px;
  align-items: center;
}

.save-btn {
  background: #42b983;
  color: #1a1a1a;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 0.8em;
  transition: all 0.3s ease;
}

.save-btn:disabled {
  background: #666;
  cursor: not-allowed;
}

.save-btn:hover:not(:disabled) {
  background: #3aa876;
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
  background-color: #42b983;
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
</style> 