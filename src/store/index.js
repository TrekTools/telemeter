import { createStore } from 'vuex'
import supabase from '../supabase'

export default createStore({
  state: {
    preferences: {
      excludedWallets: new Set()
    },
    defiPositions: []
  },

  mutations: {
    SET_EXCLUDED_WALLETS(state, walletUuids) {
      state.preferences.excludedWallets = new Set(walletUuids)
    },
    
    TOGGLE_WALLET_EXCLUSION(state, walletUuid) {
      if (state.preferences.excludedWallets.has(walletUuid)) {
        state.preferences.excludedWallets.delete(walletUuid)
      } else {
        state.preferences.excludedWallets.add(walletUuid)
      }
    },
    setDefiPositions(state, positions) {
      console.log('Setting DeFi positions with total value:', 
        positions.reduce((sum, pos) => sum + (pos.calculatedValue || 0), 0)
      );
      state.defiPositions = positions;
    }
  },

  actions: {
    async initializePreferences({ dispatch }, walletAddress) {
      if (walletAddress) {
        await dispatch('loadUserPreferences', walletAddress)
      }
    },

    async updateWalletExclusion({ commit }, { walletUuid, excluded }) {
      try {
        const { error } = await supabase
          .from('linked_wallets')
          .update({ exclude_from_analytics: excluded })
          .eq('uuid', walletUuid)

        if (error) throw error
        
        commit('TOGGLE_WALLET_EXCLUSION', walletUuid)
      } catch (error) {
        console.error('Error updating wallet exclusion:', error)
        throw error
      }
    },
    
    async loadUserPreferences({ commit }, controlWalletAddress) {
      try {
        const { data, error } = await supabase
          .from('linked_wallets')
          .select('uuid, exclude_from_analytics')
          .eq('control_sei_hash', controlWalletAddress)
          .eq('exclude_from_analytics', true)
        
        if (error) throw error
        
        const excludedWallets = data.map(wallet => wallet.uuid)
        commit('SET_EXCLUDED_WALLETS', excludedWallets)
      } catch (error) {
        console.error('Error loading preferences:', error)
      }
    }
  }
}) 