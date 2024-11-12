<template>
  <div class="value-summary">
    <div class="value-tile">
      <h3>Token Portfolio Value</h3>
      <div class="value">${{ formatNumber(tokenValue, 2) }}</div>
    </div>
    <div class="value-tile">
      <h3>NFT Portfolio Value</h3>
      <div class="value">${{ formatNumber(nftValue, 2) }} SEI</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ValueSummaryTiles',
  props: {
    tokenValue: {
      type: Number,
      default: 0
    },
    nftValue: {
      type: Number,
      default: 0
    }
  },
  methods: {
    formatNumber(num, decimals = 0) {
      if (!num) return '0'
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(num)
    }
  }
}
</script>

<style scoped>
.value-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 0 20px;
}

.value-tile {
  flex: 1;
  background: #2c2c2c;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.value-tile h3 {
  color: #42b983;
  margin: 0 0 10px 0;
  font-size: 1.1em;
}

.value {
  font-size: 1.8em;
  font-weight: bold;
  color: white;
}
</style> 