<template>
  <div class="about-page">
    <h1>About Telemeter</h1>
    
    <div class="about-section">
      <p>Welcome to Telemeter, your comprehensive NFT and cryptocurrency analytics platform.</p>
    </div>

    <div class="about-section">
      <h2>About Our Platform</h2>
      <p>
        Telemeter is a comprehensive analytics platform for the Sei Network NFT ecosystem.<br>
        Our mission is to provide real-time market insights and data visualization tools <br>
        to help users make informed decisions.
      </p>
    </div>

    <div class="about-section warning-section">
      <h2>Important Beta Version Note!</h2>
      <p>
        Our pipeline is currently in beta. This means that some data may be incomplete<br>
        or inaccurate, and currently only a 24-hour lookback with 1 hour resolution is available.<br>
        Further filters to include a weekly and monthly lookback are planned.
      </p>
    </div>

    <div class="about-section">
      <h2>Features</h2>
      <ul class="feature-list">
        <li>Real-time NFT market data</li>
        <li>Collection statistics and trends</li>
        <li>Market analysis tools</li>
        <li>Time series data visualization</li>
      </ul>
    </div>

    <div class="about-section">
      <h2>Contact</h2>
      <p>
        For support or inquiries, reach out to us on:
        <a href="https://twitter.com/ark7dev" target="_blank" rel="noopener noreferrer">Twitter</a>
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AboutPage'
}
</script>

<style scoped>
.about-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.about-section {
  background-color: #2c2c2c;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  transition: transform 0.3s ease;
}

.about-section:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.warning-section {
  border-left: 4px solid #ff4444;
}

h1 {
  color: #42b983;
  margin-bottom: 30px;
}

h2 {
  color: #42b983;
  margin-bottom: 15px;
  font-size: 1.5em;
}

p {
  color: #ffffff;
  line-height: 1.6;
}

.feature-list {
  list-style: none;
  padding: 0;
}

.feature-list li {
  color: #ffffff;
  margin-bottom: 10px;
  padding-left: 20px;
  position: relative;
}

.feature-list li::before {
  content: "•";
  color: #42b983;
  position: absolute;
  left: 0;
}

a {
  color: #42b983;
  text-decoration: none;
  transition: color 0.3s ease;
}

a:hover {
  color: #3aa876;
}
</style> 