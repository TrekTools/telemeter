<template>
  <div class="guide">
    <h1>Telemeter Guide</h1>
    <div class="coming-soon">
      <p>Comprehensive guides are coming soon!</p>
      <img 
        src="https://i.imgur.com/6xYss8x.gif" 
        alt="Guide Coming Soon"
        class="centered-gif"
      />
      <p>For now, explore Sei Network with:</p>
      <a 
        href="https://seimap.xyz" 
        target="_blank" 
        rel="noopener noreferrer"
        class="alternate-link"
      >
        SeiMap - Interactive Sei Ecosystem Map
      </a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TelemeterGuide'
}
</script>

<style scoped>
.guide {
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
</style> 