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
  name: 'CommandToast',
  emits: ['connect-wallet', 'disconnect-wallet'],
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
    },
    tacCount: {
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
        console.log('CommandToast: Wallet connection changed:', newVal)
      },
      immediate: true
    },
    warpBoisCount: {
      handler(newCount) {
        console.log('CommandToast: WarpBoisCount changed to:', newCount)
        if (newCount > 0 && !this.activeWarpBoi) {
          console.log('CommandToast: Triggering Warp Boi fetch...')
          this.fetchWarpBoiData()
        } else if (newCount === 0) {
          console.log('CommandToast: Clearing active Warp Boi')
          this.activeWarpBoi = null
        }
      },
      immediate: true
    }
  },
  created() {
    console.log('CommandToast created with props:', {
      walletConnected: this.walletConnected,
      warpBoisCount: this.warpBoisCount,
      walletAddress: this.walletAddress
    })
  },
  methods: {
    async fetchWarpBoiData() {
      console.log('CommandToast: Starting Warp Boi fetch...')
      try {
        const response = await fetch(`https://api.pallet.exchange/api/v2/nfts/sei1ccqar77782xutkjnhx8wmufhqx076xxmma5ylfzzvl3kg2t6r6uqv39crm/tokens/1887`)
        console.log('CommandToast: Fetch response received:', response.status)
        const data = await response.json()
        console.log('CommandToast: Raw data:', data)
        
        if (data.tokens && data.tokens[0]) {
          this.activeWarpBoi = data.tokens[0]
          console.log('CommandToast: Active Warp Boi set:', this.activeWarpBoi)
          
          const traits = this.activeWarpBoi.traits.reduce((acc, trait) => {
            acc[trait.type] = trait.value
            return acc
          }, {})
          
          console.log('CommandToast: Processed traits:', traits)
        } else {
          console.error('CommandToast: No tokens found in response')
        }
      } catch (error) {
        console.error('CommandToast: Error fetching Warp Boi:', error)
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
    },
    executeCommand() {
      if (!this.command.trim()) return

      console.log('CommandToast: Executing command:', this.command)

      let response = ''
      const cmd = this.command.toLowerCase().trim()

      const navigateProtected = (path, pageName) => {
        if (this.checkNFTAccess()) {
          this.$router.push(path)
          response = `Navigating to ${pageName}...`
        } else {
          response = 'Access denied: Requires Warp Boi or TAC NFT'
          console.log('CommandToast: Access denied for protected route:', path)
          this.$router.push('/')
        }
      }

      switch (cmd) {
        case 'help':
          response = `Available commands:
          help - Show this help message
          clear - Clear command history
          status - Show connection status
          info - Show Warp Boi info
          connect - Connect wallet
          disconnect - Disconnect wallet
          minimize - Minimize terminal
          hide - Hide terminal
          
          Navigation:
          home - Go to home page
          about - Go to about page
          guide - Go to guide page
          portfolio - Go to portfolio (requires NFT)
          coins - Go to coins page (requires NFT)
          nft - Go to NFT analysis (requires NFT)
          trends - Go to market trends (requires NFT)
          profile - Go to profile (requires NFT)`
          break

        case 'connect':
          if (!this.walletConnected) {
            this.$emit('connect-wallet')
            response = 'Connecting wallet...'
          } else {
            response = 'Wallet already connected'
          }
          break

        case 'disconnect':
          if (this.walletConnected) {
            this.$emit('disconnect-wallet')
            response = 'Disconnecting wallet...'
          } else {
            response = 'Wallet not connected'
          }
          break

        // Navigation commands
        case 'home':
          this.$router.push('/')
          response = 'Navigating to home page...'
          break

        case 'about':
          this.$router.push('/about')
          response = 'Navigating to about page...'
          break

        case 'guide':
          this.$router.push('/guide')
          response = 'Navigating to guide page...'
          break

        case 'portfolio':
          navigateProtected('/portfolio', 'portfolio page')
          break

        case 'coins':
          navigateProtected('/coins', 'coins page')
          break

        case 'nft':
          navigateProtected('/nft', 'NFT analysis page')
          break

        case 'trends':
          navigateProtected('/trends', 'market trends page')
          break

        case 'profile':
          navigateProtected('/profile', 'profile page')
          break

        case 'clear':
          this.commandLogs = []
          return

        case 'status':
          response = `Wallet Connected: ${this.walletConnected}
          SEI Address: ${this.walletAddress || 'Not connected'}
          EVM Address: ${this.evmAddress || 'Not connected'}
          Warp Bois: ${this.warpBoisCount}
          TAC NFTs: ${this.tacCount}`
          break

        case 'info':
          if (this.activeWarpBoi) {
            const traits = this.activeWarpBoi.traits.reduce((acc, trait) => {
              acc[trait.type] = trait.value
              return acc
            }, {})
            response = `Warp Boi #${this.activeWarpBoi.id}
            Name: ${traits.name || 'Unknown'}
            Rank: ${traits.rank || 'Unknown'}
            Eyes: ${traits.eyes || 'Unknown'}
            Mouth: ${traits.mouth || 'Unknown'}
            Uniform: ${traits.uniform || 'Unknown'}
            Left Hand: ${traits.left_hand || 'Unknown'}
            Right Hand: ${traits.right_hand || 'Unknown'}`
          } else {
            response = 'No Warp Boi detected'
          }
          break

        case 'minimize':
          this.minimize()
          response = 'Terminal minimized'
          break

        case 'hide':
          this.hide()
          response = 'Terminal hidden'
          break

        default:
          response = `Command not recognized: ${this.command}. Type 'help' for available commands.`
      }

      this.commandLogs.push({
        command: this.command,
        response: response
      })

      this.command = ''
      
      // Scroll to bottom of command history
      this.$nextTick(() => {
        const history = this.$el.querySelector('.command-history')
        if (history) {
          history.scrollTop = history.scrollHeight
        }
      })
    },
    minimize() {
      this.isMinimized = !this.isMinimized
    },
    hide() {
      this.hidden = true
    },
    toggleToast() {
      this.isOpen = !this.isOpen
    },
    startDrag(event) {
      if (!event.target.classList.contains('drag-handle') && 
          !event.target.closest('.drag-handle')) return

      const startX = event.clientX - this.position.x
      const startY = event.clientY - this.position.y

      const drag = (e) => {
        this.position = {
          x: e.clientX - startX,
          y: e.clientY - startY
        }
      }

      const stopDrag = () => {
        document.removeEventListener('mousemove', drag)
        document.removeEventListener('mouseup', stopDrag)
      }

      document.addEventListener('mousemove', drag)
      document.addEventListener('mouseup', stopDrag)
    },
    checkNFTAccess() {
      const hasRequiredNFT = this.warpBoisCount > 0 || this.tacCount > 0
      console.log('CommandToast: Access Check:', {
        warpBoisCount: this.warpBoisCount,
        tacCount: this.tacCount,
        hasAccess: hasRequiredNFT
      })
      return hasRequiredNFT
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

.command-line {
  display: flex;
  align-items: center;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.prompt {
  color: #42b983;
  margin-right: 8px;
  font-family: monospace;
}

input {
  flex: 1;
  background: transparent;
  border: none;
  color: white;
  font-family: monospace;
  outline: none;
}

.command-history {
  margin-top: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.log-entry {
  margin-bottom: 8px;
}

.log-entry .command {
  color: #42b983;
  font-family: monospace;
}

.log-entry .response {
  color: #fff;
  white-space: pre-wrap;
  font-family: monospace;
  margin-top: 4px;
  padding-left: 16px;
}
</style> 