const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    proxy: {
      '^/pallet-api': {
        target: 'https://api.pallet.exchange',
        changeOrigin: true,
        pathRewrite: {
          '^/pallet-api': ''
        },
        logLevel: 'debug'
      }
    }
  }
})
