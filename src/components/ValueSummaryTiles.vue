<template>
  <div class="value-summary">
    <div class="value-tile total">
      <h3>Total Portfolio Value</h3>
      <div class="value">${{ formatNumber(totalValue, 2) }}</div>
    </div>
    <div class="value-tile">
      <h3>Token Portfolio Value</h3>
      <div class="value">${{ formatNumber(tokenValue, 2) }}</div>
    </div>
    <div class="value-tile">
      <h3>NFT Portfolio Value</h3>
      <div class="value">${{ formatNumber(nftValue, 2) }}</div>
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
  computed: {
    totalValue() {
      return this.tokenValue + this.nftValue
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

.value-tile.total {
  flex: 1.5;
  background: #1a1a1a;
  border: 1px solid #42b983;
}

.value-tile.total .value {
  font-size: 2.2em;
  color: #42b983;
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

.value-tiles {
  display: flex;
  gap: 20px;
  margin: 20px;
  flex-wrap: wrap;
}

.value-tile {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 12px;
  flex: 1;
  min-width: 200px;
}

.tile-label {
  color: #999;
  font-size: 0.9em;
  margin-bottom: 8px;
}

.tile-value {
  color: #42b983;
  font-size: 1.5em;
  font-weight: bold;
}

@media (max-width: 768px) {
  .value-tiles {
    flex-direction: column;
    margin: 10px;
  }

  .value-tile {
    width: 100%;
    min-width: unset;
    margin-bottom: 10px;
  }
}
</style> 