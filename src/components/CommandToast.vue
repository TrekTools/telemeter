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
        <div class="greeting-text">{{ currentGreeting }}</div>
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
      activeWarpBoi: null,
      forceGreetingUpdate: Date.now()
    }
  },
  watch: {
    walletConnected: {
      handler(newVal, oldVal) {
        console.log('CommandToast: Wallet connection changed:', newVal)
        if (oldVal !== newVal) {
          const message = newVal 
            ? `Successfully connected wallet: ${this.truncateAddress(this.walletAddress)}`
            : 'Wallet disconnected'
          
          this.commandLogs.push({
            command: newVal ? 'connect' : 'disconnect',
            response: message
          })
        }
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
    },
    '$route'(to, from) {
      if (this.activeWarpBoi && to.path !== from.path) {
        // Just log the navigation command
        this.commandLogs.push({
          command: `navigate ${to.path}`,
          response: `Navigating to ${to.path}...`
        })
        
        // Force a refresh of the greeting text by triggering a reactive update
        this.$nextTick(() => {
          this.forceGreetingUpdate = Date.now()
        })
      }
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
        const userAddress = this.walletAddress || this.evmAddress
        if (!userAddress) {
          throw new Error('No wallet address available')
        }

        console.log('CommandToast: Fetching for address:', userAddress)

        // Use the full API URL
        const response = await fetch(
          `https://api.pallet.exchange/api/v1/user/${userAddress}?network=mainnet&include_tokens=true&include_bids=true`
        )
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log('CommandToast: User data received:', data)
        
        // Filter for WARP NFTs
        const warpNFTs = data.nfts.filter(nft => nft.collection.symbol === "WARP")
        console.log('CommandToast: Found WARP NFTs:', warpNFTs)

        if (!warpNFTs.length) {
          throw new Error('No WARP NFTs found')
        }

        // Sort by ID and get the first one
        const lowestWarpNFT = warpNFTs.sort((a, b) => Number(a.id) - Number(b.id))[0]
        console.log('CommandToast: Lowest ID WARP NFT:', lowestWarpNFT)

        // Now fetch the specific NFT details with full API URL
        const nftResponse = await fetch(
          `https://api.pallet.exchange/api/v2/nfts/sei1ccqar77782xutkjnhx8wmufhqx076xxmma5ylfzzvl3kg2t6r6uqv39crm/tokens/${lowestWarpNFT.id}`
        )

        if (!nftResponse.ok) {
          throw new Error(`HTTP error! status: ${nftResponse.status}`)
        }

        const nftData = await nftResponse.json()
        console.log('CommandToast: NFT details received:', nftData)

        if (nftData.tokens && nftData.tokens[0]) {
          this.activeWarpBoi = nftData.tokens[0]
          console.log('CommandToast: Active Warp Boi set:', this.activeWarpBoi)
        }

      } catch (error) {
        console.error('CommandToast: Error fetching Warp Boi data:', error)
        this.commandLogs.push({
          command: 'system',
          response: `Error fetching Warp Boi data: ${error.message}`
        })
      }
    },

    // Helper function to convert rank to numeric value
    getRankValue(rank) {
      const rankOrder = {
        'private': 1,
        'corporal': 2,
        'sergeant': 3,
        'lieutenant': 4,
        'captain': 5,
        'major': 6,
        'colonel': 7,
        'general': 8
      }
      return rankOrder[rank.toLowerCase()] || Infinity
    },
    generatePageGreeting(currentRoute, traits) {
      // Base context messages for each page
      const baseContexts = {
        '/nft': "Ooh, there's lots of lovely JPEGs (and GIFs) in here!",
        '/portfolio': "Let's see how your investments are performing today.",
        '/coins': "Numbers go up, numbers go down... but mostly up, right??",
        '/trends': "Let me analyze these market patterns for you.",
        '/profile': "Welcome to your command center! All systems nominal. Amend your wallets here.",
        '/guide': "Need help? I've got all the answers... probably.",
        '/swap': "Ready to execute some atomic swaps! ⚛️",
        '/stake': "Securing the network, one stake at a time! 🔐",
        '/governance': "Your voice in the decentralized democracy! 🗳️"
      }

      // Get base context for current route
      const baseContext = baseContexts[currentRoute]
      if (!baseContext) return null

      // Add trait-specific variations
      switch (currentRoute) {
        case '/nft':
          if (traits.uniform === 'academic' && traits.left_hand === 'tricorder') {
            return "*scanning* Fascinating collection of digital artifacts detected..."
          } else if (traits.rank === 'admiral' && traits.mouth === 'cocky') {
            return "Behold the finest NFT fleet in all the galaxies! 😎"
          } else if (traits.eyes === 'sus' && traits.left_hand === 'motion tracker') {
            return "*beep* Detecting suspicious right-click-save activity... 🚨"
          } else if (traits.uniform === 'section 420') {
            return "Duuude... these JPEGs are like, totally cosmic! 🌈"
          }
          break;

        case '/portfolio':
          if (traits.uniform === 'medical' && traits.mouth === 'concerned') {
            return "Time for your portfolio health check-up! Vitals look... interesting. 🏥"
          } else if (traits.eyes === 'fierce' && traits.left_hand === 'red lightsaber') {
            return "Your gains will be UNLIMITED POWER! *ignites saber* ⚡"
          } else if (traits.rank === 'cadet' && traits.mouth === 'wow') {
            return "Sir! These returns are INCREDIBLE, sir! Permission to ape in?! 🚀"
          } else if (traits.left_hand === 'neuralizer') {
            return "Don't worry about those red numbers... *flash* What red numbers? 😅"
          }
          break;

        case '/coins':
          if (traits.uniform === 'engineering' && traits.mouth === 'thinking') {
            return "*adjusts algorithms* Calculating optimal moon trajectory... 🌙"
          } else if (traits.eyes === 'wild' && traits.rank === 'admiral') {
            return "ALL HANDS ON DECK! EXTREME VOLATILITY DETECTED! 📊"
          } else if (traits.left_hand === 'tricorder') {
            return "*scanning* Multiple bullish patterns detected in sector 7G..."
          } else if (traits.uniform === 'section 420') {
            return "Whoa... these charts are like, totally doing the thing! 📈"
          }
          break;

        case '/trends':
          if (traits.uniform === 'academic') {
            return "According to my technical analysis thesis paper... 📚"
          } else if (traits.eyes === 'sus' && traits.mouth === 'thinking') {
            return "*squints at charts* Something's definitely happening here... 🤔"
          } else if (traits.left_hand === 'motion tracker') {
            return "*beep* Whale movement detected in multiple sectors! 🐋"
          } else if (traits.rank === 'admiral') {
            return "Strategic market intelligence briefing ready, admiral! 📋"
          }
          break;

        case '/profile':
          if (traits.uniform === 'medical') {
            return "Time for your annual account check-up! Say 'ahhh'... 👨‍⚕️"
          } else if (traits.left_hand === 'gorgeous blue ale') {
            return "*raises glass* Your profile deserves a toast! 🍻"
          } else if (traits.mouth === 'cocky') {
            return "Behold your glorious trading empire! 👑"
          } else if (traits.eyes === 'concerned') {
            return "Um... have you been making trades without consulting me? 😰"
          }
          break;

        case '/guide':
          if (traits.uniform === 'academic') {
            return "Please take notes, this will be on the test! 📝"
          } else if (traits.mouth === 'uhhh') {
            return "I think this button does... something? Let's find out! 🤷"
          } else if (traits.rank === 'admiral') {
            return "Attention cadets! Basic training protocols initiated! 🎖️"
          } else if (traits.left_hand === 'tricorder') {
            return "*scanning* Detecting high levels of alpha in these guides... 📱"
          }
          break;

        case '/swap':
          if (traits.uniform === 'engineering') {
            return "Quantum swap engines primed and ready! ⚛️"
          } else if (traits.eyes === 'sus') {
            return "Checking slippage... double checking slippage... 🔍"
          } else if (traits.left_hand === 'neuralizer') {
            return "You won't remember the old token price... *flash* 💫"
          }
          break;

        case '/stake':
          if (traits.uniform === 'formal') {
            return "*adjusts tie* Your tokens will be safely secured, sir. 🔒"
          } else if (traits.mouth === 'wow') {
            return "Look at those APY numbers! TO THE MOON! 🚀"
          } else if (traits.rank === 'captain') {
            return "Staking stations ready, maximum yield engaged! 💰"
          }
          break;

        case '/governance':
          if (traits.uniform === 'embassy') {
            return "Your diplomatic voting rights are ready to be exercised! 🗳️"
          } else if (traits.rank === 'admiral') {
            return "The future of the protocol awaits your command! ⚖️"
          } else if (traits.mouth === 'thinking') {
            return "*reading proposal* Hmm, very interesting governance strategy... 🤔"
          }
          break;
      }

      // Return base context if no trait-specific variation matches
      return baseContext
    },

    generateDefaultGreeting(traits) {
      // Default greetings based on combined traits
      if (traits.rank === 'admiral' && traits.uniform === 'command') {
        return "Fleet command center standing by for orders."
      } else if (traits.left_hand === 'tricorder' && traits.uniform === 'medical') {
        return "*scanning* All systems functioning within normal parameters."
      } else if (traits.eyes === 'sus' && traits.mouth === 'thinking') {
        return "*narrows eyes* Something seems... interesting about this request..."
      }
      
      // Fallback to rank-based defaults
      switch (traits.rank) {
        case 'admiral':
          return "Standing by for your next command, admiral."
        case 'commodore':
          return "Battle station fully operational, commodore."
        case 'captain':
          return "Bridge systems ready, captain."
        case 'commander':
          return "Command protocols active, commander."
        case 'lieutenant':
          return "Lieutenant on duty, awaiting orders!"
        case 'cadet':
          return "Cadet reporting for duty, sir!"
        default:
          return "Terminal systems online. How may I assist?"
      }
    },

    generateHomeGreeting(traits) {
      let greeting = `Greetings, I am ${traits.name || `Warp Boi #${this.activeWarpBoi.id}`}, your ${traits.rank} terminal operator.`
      
      // Add ALL existing trait-based personality modifications here
      // ... keep ALL your existing eye cases ...
      switch (traits.eyes) {
        case 'sus':
          greeting += " *squints suspiciously* I'm watching everything you type..."
          break
        case 'amazed':
          greeting += " Wow! The possibilities with this terminal are ENDLESS!"
          break
        case 'concerned':
          greeting += " I hope you know what you're doing with these commands..."
          break
        case 'fierce':
          greeting += " Ready to execute your commands with MAXIMUM INTENSITY!"
          break
        case 'wild':
          greeting += " ANYTHING COULD HAPPEN WITH THIS TERMINAL! ANYTHING!"
          break
        case 'happy':
          greeting += " It's such a pleasure to assist you today! ^_^"
          break
      }

      // ... keep ALL your existing mouth cases ...
      switch (traits.mouth) {
        case 'wow':
          greeting += " This terminal is INCREDIBLE! Every button does something AMAZING!"
          break
        case 'uhhh':
          greeting += " Uhhhh... I mean, I think I know how this terminal works..."
          break
        case 'thinking':
          greeting += " *contemplating deeply* Each command must be carefully considered..."
          break
        case 'unimpressed':
          greeting += " *yawns* Another day, another terminal session..."
          break
        case 'cocky':
          greeting += " Trust me, I'm the BEST terminal operator you'll ever meet. 😎"
          break
      }

      // ... keep ALL your existing uniform cases ...
      switch (traits.uniform) {
        case 'command':
          greeting += " All systems are operating at peak efficiency. Awaiting your orders."
          break
        case 'formal':
          greeting += " *adjusts tie* I pride myself on maintaining the utmost professionalism."
          break
        case 'engineering':
          greeting += " *tightens bolt* Just finished optimizing the terminal's quantum processors!"
          break
        case 'academic':
          greeting += " According to my latest research, this terminal has fascinating capabilities..."
          break
        case 'embassy':
          greeting += " As your diplomatic liaison, I'll ensure smooth inter-blockchain relations."
          break
        case 'specialist':
          greeting += " My advanced training has prepared me for any technical challenge."
          break
        case 'section 420':
          greeting += " Duuude... this terminal is like, totally cosmic... *cough*"
          break
        case 'medical':
          greeting += " Terminal diagnostics complete. All systems are healthy! 🏥"
          break
      }

      // ... keep ALL your existing left_hand cases ...
      switch (traits.left_hand) {
        case 'gorgeous blue ale':
          greeting += " *sips elegantly* This terminal pairs nicely with a fine quantum-aged ale."
          break
        case 'gold lightsaber':
          greeting += " *golden glow illuminates terminal* A refined weapon for a more civilized age."
          break
        case 'neuralizer':
          greeting += " Please ignore the red flash, you won't remember it anyway..."
          break
        case 'medpac':
          greeting += " Don't worry, I'm fully equipped to handle any system emergencies!"
          break
        case 'blue lightsaber':
          greeting += " *hums peacefully* The Force guides my terminal operations."
          break
        case 'motion tracker':
          greeting += " *beep* ...detecting user input patterns... *beep*"
          break
        case 'green lightsaber':
          greeting += " Wisdom and patience guide my terminal assistance."
          break
        case 'kill phaser':
          greeting += " Terminal security is my top priority. MAXIMUM enforcement ready."
          break
        case 'phaser rifle':
          greeting += " Long-range problem solving is my specialty. Very long range."
          break
        case 'communicator':
          greeting += " *chirp* All communication channels open and monitored."
          break
        case 'stun phaser':
          greeting += " Don't worry, it's set to stun... usually."
          break
        case 'red lightsaber':
          greeting += " *menacing hum* The dark side offers many capabilities..."
          break
        case 'tricorder':
          greeting += " *scanning* Terminal diagnostics show optimal performance."
          break
      }

      return greeting
    },

    generateGreeting() {
      if (!this.activeWarpBoi) return ''
      
      const traits = this.activeWarpBoi.traits.reduce((acc, trait) => {
        acc[trait.type] = trait.value
        return acc
      }, {})

      const currentRoute = this.$route.path
      
      // Home page gets the full introduction
      if (currentRoute === '/') {
        return this.generateHomeGreeting(traits)
      }
      
      // Other pages get context-sensitive greetings
      const contextGreeting = this.generatePageGreeting(currentRoute, traits)
      return contextGreeting || this.generateDefaultGreeting(traits)
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
            response = 'Initiating wallet connection...'
          } else {
            response = `Wallet already connected: ${this.truncateAddress(this.walletAddress)}`
          }
          break

        case 'disconnect':
          if (this.walletConnected) {
            this.$emit('disconnect-wallet')
            response = 'Initiating wallet disconnection...'
          } else {
            response = 'No wallet connected'
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
    },
    truncateAddress(address) {
      if (!address) return ''
      return `${address.slice(0, 6)}...${address.slice(-4)}`
    }
  },
  computed: {
    currentGreeting() {
      // Add forceGreetingUpdate as a dependency to ensure updates
      return this.forceGreetingUpdate && this.generateGreeting()
    }
  }
}
</script>

<style scoped>
/* Add base styles for the toast container */
.command-toast {
  position: fixed;
  max-width: 30vw;  /* 30% of viewport width */
  width: 400px;     /* base width, but won't exceed 30vw */
  background-color: rgba(21, 32, 43, 0.85);  /* semi-transparent dark blue */
  border: 1px solid rgba(66, 185, 131, 0.3);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);  /* adds slight blur to content behind */
  font-family: monospace;
  overflow: hidden;
}

/* Update existing styles */
.toast-header {
  background-color: rgba(21, 32, 43, 0.95);
  padding: 8px;
  border-bottom: 1px solid rgba(66, 185, 131, 0.3);
}

.toast-content {
  padding: 12px;
  max-height: 60vh;  /* limit height to 60% of viewport */
  overflow-y: auto;
}

.warp-boi-greeting {
  background: rgba(66, 185, 131, 0.15);  /* more transparent */
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
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
  background: rgba(0, 0, 0, 0.2);  /* more transparent */
  display: flex;
  align-items: center;
  padding: 8px;
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

/* Add responsive handling */
@media (max-width: 768px) {
  .command-toast {
    width: 90vw;  /* wider on mobile */
    max-width: none;
    font-size: 14px;
  }
}

/* Update minimized state */
.minimized {
  height: auto;
  .toast-content {
    display: none;
  }
}
</style> 