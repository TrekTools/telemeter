<template>
  <div v-if="hasRequiredNFT" class="edit-profile">
    <h1>Coin Analysis</h1>
    <p>Coin analysis tools coming soon...</p>
</div>
  <div v-else class="access-denied">
    <h2>Access Denied</h2>
    <p>You need to own a Warp Boi or Trek Access Chit to view this page.</p>
  </div>
</template>

<script>
export default {
  name: 'CoinAnalysis',
  props: {
    warpBoisCount: {
      type: Number,
      default: 0
    },
    tacCount: {
      type: Number,
      default: 0
    }
  },
  computed: {
    hasRequiredNFT() {
      return this.warpBoisCount > 0 || this.tacCount > 0;
    }
  }
}
</script>

<style scoped>
.access-denied {
  text-align: center;
  padding: 20px;
  color: #ff4444;
  background-color: #2c2c2c;
  border-radius: 8px;
  margin: 20px auto;
  max-width: 800px;
}
</style>