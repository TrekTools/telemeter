<template>
  <div class="home">
    <h1>welcome to ████████</h1>
    
    <div class="feature-grid">
      <div class="feature-card">
        <h3>NFT Analytics</h3>
        <p>Track and analyze your NFT portfolio performance</p>
      </div>
      
      <div class="feature-card">
        <h3>Portfolio Tracking</h3>
        <p>Monitor your cryptocurrency holdings and performance</p>
      </div>
      
      <div class="feature-card">
        <h3>Market Trends</h3>
        <p>Stay updated with the latest market trends and analysis</p>
      </div>
      
      <div class="feature-card">
        <h3>Coin Analysis</h3>
        <p>Deep dive into cryptocurrency metrics and data</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomeView'
}
</script>

<style scoped>
.home {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 40px;
}

.feature-card {
  background-color: #2c2c2c;
  padding: 20px;
  border-radius: 8px;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}
</style> 