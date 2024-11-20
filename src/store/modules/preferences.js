export default {
  state: {
    excludeControlWallet: false
  },
  
  mutations: {
    SET_EXCLUDE_CONTROL_WALLET(state, value) {
      state.excludeControlWallet = value
    }
  },
  
  actions: {
    async updateExcludeControlWallet({ commit }, { value, walletAddress }) {
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            wallet_address: walletAddress,
            exclude_control_wallet: value
          })
        
        if (error) throw error
        
        commit('SET_EXCLUDE_CONTROL_WALLET', value)
      } catch (error) {
        console.error('Error updating preference:', error)
      }
    },
    
    async loadUserPreferences({ commit }, walletAddress) {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('exclude_control_wallet')
          .eq('wallet_address', walletAddress)
          .single()
        
        if (error) throw error
        
        if (data) {
          commit('SET_EXCLUDE_CONTROL_WALLET', data.exclude_control_wallet)
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
      }
    }
  }
} 