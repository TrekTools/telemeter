<template>
  <div v-if="hasRequiredNFT" class="edit-profile">
    <h1>Trend Analysis</h1>
    <p>Trend analysis tools coming soon...</p>
</div>
  <div v-else class="access-denied">
    <h2>Access Denied</h2>
    <p>You need to own a Warp Boi or Trek Access Chit to view this page.</p>
  </div>
</template>

<script>
export default {
  name: 'EditProfile',
  computed: {
    hasRequiredNFT() {
      const warpBoisCount = parseInt(localStorage.getItem('warpBoisCount') || '0');
      const tacCount = parseInt(localStorage.getItem('tacCount') || '0');
      return warpBoisCount > 0 || tacCount > 0;
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