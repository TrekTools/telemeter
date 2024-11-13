<template>
  <div v-if="hasRequiredNFT" class="trend-analysis">
    <h1>Market Trend Analysis</h1>
    <div class="coming-soon">
      <p>Trend analysis tools are coming soon!</p>
      <img 
        src="https://i.imgur.com/qaPMT8Z.gif" 
        alt="Trend Analysis Coming Soon"
        class="centered-gif"
      />
      <p>In the meantime, check out:</p>
      <a 
        href="https://seiview.xyz" 
        target="_blank" 
        rel="noopener noreferrer"
        class="alternate-link"
      >
        SeiView - Comprehensive Sei Network Analytics
      </a>
    </div>
  </div>
  <div v-else class="access-denied">
    <h2>Access Denied</h2>
    <p>You need to own a Warp Boi or Trek Access Chit to view this page.</p>
  </div>
</template>

<script>
export default {
  name: 'TrendAnalysis',
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
.trend-analysis {
  padding: 20px;
  text-align: center;
}

.coming-soon {
  margin: 40px auto;
  padding: 30px;
  background: rgba(66, 185, 131, 0.1);
  border-radius: 12px;
  max-width: 600px;
}

.centered-gif {
  display: block;
  margin: 20px auto;
  max-width: 100%;
  height: auto;
}

.alternate-link {
  display: inline-block;
  margin-top: 20px;
  padding: 15px 30px;
  background: #42b983;
  color: #1a1a1a;
  text-decoration: none;
  border-radius: 8px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.alternate-link:hover {
  background: #3aa876;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.3);
}

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