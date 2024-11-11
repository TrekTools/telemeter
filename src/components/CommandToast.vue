<template>
  <div 
    v-show="!hidden"
    class="command-toast" 
    :class="{ 'toast-open': isOpen, 'minimized': isMinimized }"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @mousedown="startDrag"
  >
    <div class="toast-header">
      <div class="drag-handle">
        <span class="terminal-buttons">
          <span class="terminal-circle red" @click.stop="hide"></span>
          <span class="terminal-circle yellow" @click.stop="minimize"></span>
          <span class="terminal-circle green" @click.stop="toggleToast"></span>
        </span>
        <span class="terminal-title">Telemeter Terminal</span>
      </div>
    </div>
    <div class="toast-content" v-if="isOpen">
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
          <span class="prompt">$</span>
          <span class="command-text">{{ log.command }}</span>
          <span class="response-text">{{ log.response }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Dock icon when minimized -->
  <div 
    v-show="isMinimized || hidden"
    class="dock-icon"
    @click="restore"
  >
    <span class="terminal-circle green"></span>
    Terminal
  </div>
</template>

<script>
export default {
  name: 'CommandToast',
  props: {
    walletConnected: {
      type: Boolean,
      default: false
    }
  },
  emits: ['connect-wallet', 'disconnect-wallet'],
  data() {
    return {
      isOpen: false,
      isMinimized: false,
      hidden: false,
      command: '',
      commandLogs: [],
      position: {
        x: window.innerWidth - 420,
        y: window.innerHeight - 400
      },
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
      commands: {
        help: 'Available commands: connect, disconnect, profile, nft, portfolio, coins, trends, about, guide, clear',
        profile: '/profile',
        nft: '/nft',
        portfolio: '/portfolio',
        coins: '/coins',
        trends: '/trends',
        about: '/about',
        guide: '/guide',
        clear: 'clear',
        connect: 'connect',
        disconnect: 'disconnect'
      }
    }
  },
  mounted() {
    window.addEventListener('mousemove', this.onDrag)
    window.addEventListener('mouseup', this.stopDrag)
  },
  beforeUnmount() {
    window.removeEventListener('mousemove', this.onDrag)
    window.removeEventListener('mouseup', this.stopDrag)
  },
  methods: {
    startDrag(e) {
      if (e.target.closest('.terminal-buttons')) return
      this.isDragging = true
      this.dragOffset = {
        x: e.clientX - this.position.x,
        y: e.clientY - this.position.y
      }
    },
    onDrag(e) {
      if (!this.isDragging) return
      
      const maxX = window.innerWidth - 400
      const maxY = window.innerHeight - 300
      
      this.position = {
        x: Math.min(Math.max(0, e.clientX - this.dragOffset.x), maxX),
        y: Math.min(Math.max(0, e.clientY - this.dragOffset.y), maxY)
      }
    },
    stopDrag() {
      this.isDragging = false
    },
    minimize() {
      this.isMinimized = true
      this.isOpen = false
    },
    hide() {
      this.hidden = true
      this.isMinimized = false
      this.isOpen = false
    },
    restore() {
      this.isMinimized = false
      this.hidden = false
      this.isOpen = true
    },
    toggleToast() {
      if (!this.isMinimized) {
        this.isOpen = !this.isOpen
        if (this.isOpen) {
          this.$nextTick(() => {
            this.$refs.commandInput?.focus()
          })
        }
      }
    },
    executeCommand() {
      const cmd = this.command.toLowerCase().trim()
      let response = 'Command not found. Type "help" for available commands.'
      
      if (cmd === 'clear') {
        this.commandLogs = []
        this.command = ''
        return
      }

      if (cmd === 'connect') {
        if (this.walletConnected) {
          response = 'Wallet is already connected!'
        } else {
          this.$emit('connect-wallet')
          response = 'Connecting wallet...'
        }
      } else if (cmd === 'disconnect') {
        if (!this.walletConnected) {
          response = 'No wallet is connected!'
        } else {
          this.$emit('disconnect-wallet')
          response = 'Disconnecting wallet...'
        }
      } else if (this.commands[cmd]) {
        if (typeof this.commands[cmd] === 'string' && this.commands[cmd].startsWith('/')) {
          this.$router.push(this.commands[cmd])
          response = `Navigating to ${cmd}...`
        } else {
          response = this.commands[cmd]
        }
      }
      
      this.commandLogs.push({
        command: cmd,
        response: response
      })
      
      this.command = ''
    }
  }
}
</script>

<style scoped>
.command-toast {
  position: fixed;
  width: 400px;
  background-color: #1a1a1a;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
  resize: both;
  transition: all 0.3s ease;
}

.minimized {
  display: none;
}

.drag-handle {
  display: flex;
  align-items: center;
  width: 100%;
  cursor: move;
  user-select: none;
}

.dock-icon {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #2c2c2c;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  z-index: 1000;
  transition: transform 0.2s ease;
}

.dock-icon:hover {
  transform: translateY(-2px);
}

.toast-header {
  background-color: #2c2c2c;
  padding: 8px 12px;
  display: flex;
  align-items: center;
}
</style> 