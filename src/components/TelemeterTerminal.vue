<template>
  <div 
    v-show="!hidden"
    class="command-toast" 
    :class="{ 'toast-open': isOpen, 'minimized': isMinimized }"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @mousedown="startDrag"
  >
    <pre style="color: white; font-size: 12px; padding: 10px;">
      Wallet Connected: {{ walletConnected }}
      Has Warp Boi: {{ !!activeWarpBoi }}
      Warp Boi ID: {{ activeWarpBoi?.id }}
      Warp Boi Image: {{ activeWarpBoi?.image }}
      Warp Boi Name: {{ activeWarpBoi?.name }}
    </pre>

    <div class="toast-header">
      <div class="drag-handle">
        <span class="terminal-buttons">
          <span class="terminal-circle red" @click.stop="hide"></span>
          <span class="terminal-circle yellow" @click.stop="minimize"></span>
          <span class="terminal-circle green" @click.stop="toggleToast"></span>
        </span>
        <span class="terminal-title">
          Telemeter Terminal 
          <span v-if="activeWarpBoi" class="warp-boi-id">#{{ activeWarpBoi?.id }}</span>
        </span>
      </div>
    </div>

    <div class="toast-content" v-if="isOpen">
      <div v-if="walletConnected &&  activeWarpBoi" class="warp-boi-greeting">
        <img 
          :src="activeWarpBoi.image" 
          :alt="activeWarpBoi.name"
          class="warp-boi-avatar"
        />
        <div class="greeting-text">{{ generateGreeting() }}</div>
      </div>
      
      <div class="command-line">
        <span class="prompt">$</span>
        <input 
          type="text" 
          v-model="command" 
          @keyup.enter="executeCommand"
          placeholder="Enter command (try 'help')"
          ref="commandInput"
        >
      </div>
      <div class="command-history">
        <div v-for="(log, index) in commandLogs" :key="index" class="log-entry">
          <div class="command">$ {{ log.command }}</div>
          <div class="response">{{ log.response }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TelemeterTerminal',
  props: {
    walletConnected: {
      type: Boolean,
      default: false
    },
    walletAddress: String,
    evmAddress: String,
    warpBoisCount: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      isOpen: true,
      hidden: false,
      isMinimized: false,
      position: { x: 20, y: 20 },
      command: '',
      commandLogs: [],
      activeWarpBoi: null
    }
  },
  watch: {
    walletConnected: {
      handler(newVal) {
        console.log('TelemeterTerminal: Wallet connection changed:', newVal)
      },
      immediate: true
    },
    warpBoisCount: {
      handler(newCount) {
        console.log('TelemeterTerminal: WarpBoisCount changed to:', newCount)
        if (newCount > 0 && !this.activeWarpBoi) {
          console.log('TelemeterTerminal: Triggering Warp Boi fetch...')
          this.fetchWarpBoiData()
        } else if (newCount === 0) {
          console.log('TelemeterTerminal: Clearing active Warp Boi')
          this.activeWarpBoi = null
        }
      },
      immediate: true
    }
  },
  created() {
    console.log('TelemeterTerminal created with props:', {
      walletConnected: this.walletConnected,
      warpBoisCount: this.warpBoisCount,
      walletAddress: this.walletAddress
    })
  },
  methods: {
    async fetchWarpBoiData() {
      console.log('TelemeterTerminal: Starting Warp Boi fetch...')
      try {
        const response = await fetch(`https://api.pallet.exchange/api/v2/nfts/sei1ccqar77782xutkjnhx8wmufhqx076xxmma5ylfzzvl3kg2t6r6uqv39crm/tokens/1887`)
        console.log('TelemeterTerminal: Fetch response received:', response.status)
        const data = await response.json()
        console.log('TelemeterTerminal: Raw data:', data)
        
        if (data.tokens && data.tokens[0]) {
          this.activeWarpBoi = data.tokens[0]
          console.log('TelemeterTerminal: Active Warp Boi set:', this.activeWarpBoi)
          
          const traits = this.activeWarpBoi.traits.reduce((acc, trait) => {
            acc[trait.type] = trait.value
            return acc
          }, {})
          
          console.log('TelemeterTerminal: Processed traits:', traits)
        } else {
          console.error('TelemeterTerminal: No tokens found in response')
        }
      } catch (error) {
        console.error('TelemeterTerminal: Error fetching Warp Boi:', error)
      }
    },
    generateGreeting() {
      if (!this.activeWarpBoi) return ''
      
      const traits = this.activeWarpBoi.traits.reduce((acc, trait) => {
        acc[trait.type] = trait.value
        return acc
      }, {})

      let greeting = `Greetings, I am ${traits.name || `Warp Boi #${this.activeWarpBoi.id}`}, your ${traits.rank} terminal operator. `

      if (traits.eyes === 'wat') {
        greeting += "I'm a bit confused by all this technology... "
      }
      if (traits.mouth === 'thinking') {
        greeting += "Let me ponder your requests carefully. "
      }
      if (traits.uniform === 'section 420') {
        greeting += "Don't mind the smoke, it helps me process commands better. "
      }
      if (traits.left_hand === 'neuralizer') {
        greeting += "Just don't look directly at this device in my hand... "
      }
      if (traits.right_hand === 'red lightsaber') {
        greeting += "And yes, I am authorized to carry this weapon. "
      }

      return greeting
    }
  }
}
</script>

<style scoped>
.warp-boi-greeting {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(66, 185, 131, 0.1);
  border-radius: 8px;
  margin-bottom: 12px;
}

.warp-boi-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #42b983;
}

.greeting-text {
  color: #42b983;
  font-style: italic;
  font-size: 0.9em;
  line-height: 1.4;
}

.warp-boi-id {
  color: #42b983;
  font-size: 0.9em;
  margin-left: 8px;
}
</style> 