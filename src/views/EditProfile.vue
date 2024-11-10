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
              <th>SEI Address</th>
              <th>EVM Address</th>
              <th>Added</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="wallet in linkedWallets" :key="wallet.uuid">
              <td>{{ truncateAddress(wallet.sei_hash) }}</td>
              <td>{{ truncateAddress(wallet.evm_hash) }}</td>
              <td>{{ new Date(wallet.timestamp).toLocaleString() }}</td>
              <td>
                <button 
                  @click="deleteLinkedWallet(wallet.uuid)"
                  class="delete-btn"
                  v-if="wallet.sei_hash !== walletAddress"
                >×</button>
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
    evmAddress: String      // control_evm_hash
  },
  data() {
    return {
      walletInput: '',
      selectedChain: 'sei',
      inputError: null,
      linkedWallets: []
    }
  },
  async created() {
    await this.loadLinkedWallets()
    await this.checkAndAddControlWallet()
  },
  computed: {
    hasRequiredNFT() {
      const warpBoisCount = parseInt(localStorage.getItem('warpBoisCount') || '0');
      const tacCount = parseInt(localStorage.getItem('tacCount') || '0');
      return warpBoisCount > 0 || tacCount > 0;
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
      const { error } = await supabase
        .from('linked_wallets')
        .insert({
          uuid: uuidv4(),
          control_sei_hash: this.walletAddress,
          control_evm_hash: this.evmAddress,
          sei_hash: seiHash,
          evm_hash: evmHash,
          timestamp: new Date().toISOString()
        })

      if (error) {
        console.error('Error adding linked wallet:', error)
        throw error
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

        // Refresh the list
        await this.loadLinkedWallets()
      } catch (error) {
        console.error('Error deleting linked wallet:', error)
      }
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
</style> 