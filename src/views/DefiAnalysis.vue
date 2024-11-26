<template>
  <div v-if="hasRequiredAccess" class="defi-analysis">
    <h1>DeFi Analysis</h1>
    
    <div v-if="loading" class="loading">
      Loading DeFi data...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="defi-table-container">
      <table class="defi-table">
        <thead>
          <tr>
            <th class="text-center">Wallet Label</th>
            <th class="text-center">Protocol</th>
            <th class="text-center">Pool Name</th>
            <th class="text-center">Pool Address</th>
            <th class="text-center">Value ($USD)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="position in poolPositions" :key="position.id">
            <td>{{ position.walletLabel }}</td>
            <td>DragonSwap</td>
            <td>{{ position.poolName || `${position.tokens?.[0]?.symbol || '-'}/${position.tokens?.[1]?.symbol || '-'}` }}</td>
            <td>{{ truncateAddress(position.pool_address) }}</td>
            <td>{{ formatNumber(position.first_token_amount, 2) }}</td>
          </tr>
          <tr v-for="position in jellyPositions" :key="position.id">
            <td>{{ position.walletLabel }}</td>
            <td>Jellyverse</td>
            <td>{{ position.name }}</td>
            <td>{{ truncateAddress(position.address) }}</td>
            <td>{{ formatNumber(position.balance, 2) }}</td>
          </tr>
          <tr v-for="position in yeiPositions" :key="position.id">
            <td>{{ position.walletLabel }}</td>
            <td>YEI Finance</td>
            <td>{{ position.name }}</td>
            <td>{{ truncateAddress(position.underlyingAsset) }}</td>
            <td>{{ formatNumber(position.balance, 2) }}</td>
          </tr>
          <tr v-if="poolPositions.length === 0 && jellyPositions.length === 0 && yeiPositions.length === 0">
            <td colspan="5" class="no-data">No DeFi positions found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import supabase from '../supabase'

export default {
  name: 'DefiAnalysis',
  props: {
    walletAddress: String,
    warpBoisCount: {
      type: Number,
      default: 0
    },
    tacCount: {
      type: Number,
      default: 0
    },
    warpTokenBalance: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      loading: true,
      error: null,
      poolPositions: [],
      jellyPositions: [],
      yeiPositions: [],
      farmPositions: [],
      linkedWallets: []
    }
  },
  computed: {
    hasRequiredAccess() {
      console.log('Access check:', {
        warpBoisCount: this.warpBoisCount,
        tacCount: this.tacCount,
        warpTokenBalance: this.warpTokenBalance
      })
      return this.warpBoisCount > 0 || this.tacCount > 0 || this.warpTokenBalance >= 1000000
    }
  },
  methods: {
    truncateAddress(address) {
      if (!address) return ''
      return `${address.slice(0, 6)}...${address.slice(-4)}`
    },
    formatNumber(num, decimals = 4) {
      if (!num) return '0'
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(num)
    },
    async loadLinkedWallets() {
      try {
        const { data, error } = await supabase
          .from('linked_wallets')
          .select('*')
          .eq('control_sei_hash', this.walletAddress)
        
        if (error) throw error
        console.log('Linked wallets:', data)
        this.linkedWallets = data
      } catch (error) {
        console.error('Error loading linked wallets:', error)
        this.error = 'Failed to load wallet data'
      }
    },
    async fetchPoolPositions(evmAddress, walletLabel) {
      try {
        // First get the current max record
        const maxRecordResponse = await fetch(process.env.VUE_APP_GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': process.env.VUE_APP_HASURA_ADMIN_SECRET
          },
          body: JSON.stringify({
            query: `
              query MyQuery {
                max_record {
                  current_max
                }
              }
            `
          })
        });
        const maxRecordData = await maxRecordResponse.json();
        const currentMax = maxRecordData.data.max_record[0].current_max;

        console.log('Current max record:', currentMax);

        // Fetch token prices
        const pricesResponse = await fetch(process.env.VUE_APP_GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': process.env.VUE_APP_HASURA_ADMIN_SECRET
          },
          body: JSON.stringify({
            query: `
              query seiprice {
                token_prices(where: {record: {_eq: ${currentMax}}}) {
                  PriceUSD
                  Token
                  record
                  rounded_time
                }
              }
            `
          })
        });
        const pricesData = await pricesResponse.json();
        const tokenPrices = pricesData.data.token_prices;

        console.log('Token prices:', tokenPrices);

        // Fetch DragonSwap pools and farms
        const [poolsResponse, farmsResponse] = await Promise.all([
          fetch(`https://sei-api.dragonswap.app/api/v1/user/${evmAddress}/pools`),
          fetch(`https://sei-api.dragonswap.app/api/v1/user/${evmAddress}/farms`)
        ]);

        const [poolsData, farmsData] = await Promise.all([
          poolsResponse.json(),
          farmsResponse.json()
        ]);

        // Process farms data
        const farmPositions = farmsData.status === 'ok' ? farmsData.farms.map(farm => {
          const rewardToken = farmsData.tokens.find(t => 
            t.address.toLowerCase() === farm.reward_token_address.toLowerCase()
          );
          const boosterToken = farm.booster_token_address ? farmsData.tokens.find(t => 
            t.address.toLowerCase() === farm.booster_token_address.toLowerCase()
          ) : null;

          return {
            ...farm,
            id: `farm-${evmAddress}-${farm.farm_address}`,
            walletLabel,
            rewardToken,
            boosterToken
          };
        }) : [];

        // Log DragonSwap data
        console.log('DragonSwap Data for', walletLabel, `(${evmAddress}):`, {
          tokens: poolsData.tokens,
          incentives: poolsData.incentives,
          pools: poolsData.pools,
          rawResponse: poolsData
        });

        // Fetch Jellyverse data
        const jellyverseResponse = await fetch('https://graph.mainnet.jellyverse.org/subgraphs/name/jelly/verse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query MyQuery {
                user(id: "${evmAddress.toLowerCase()}") {
                  sharesOwned {
                    balance
                    poolId {
                      name
                      address
                      symbol
                      tokensList
                    }
                  }
                }
              }
            `
          })
        });
        const jellyverseData = await jellyverseResponse.json();
        
        // Process Jellyverse positions
        const jellyPositions = jellyverseData.data?.user?.sharesOwned?.map(share => ({
          id: `jelly-${evmAddress}-${share.poolId.address}`,
          walletLabel,
          name: share.poolId.name,
          address: share.poolId.address,
          symbol: share.poolId.symbol,
          balance: share.balance,
          tokensList: share.poolId.tokensList
        })) || [];

        // Updated YEI Finance query to include decimals
        const yeiResponse = await fetch('https://api.goldsky.com/api/public/project_clwiviwsnjeci01x35eoqdpmn/subgraphs/yei-finance/3.0.1/gn', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              {
                userReserves(where: {user: "${evmAddress.toLowerCase()}"}) {
                  currentATokenBalance
                  reserve(first: 100, orderBy: symbol) {
                    id
                    symbol
                    name
                    underlyingAsset
                    decimals
                    isActive
                    isFrozen
                    usageAsCollateralEnabled
                    borrowingEnabled
                    stableBorrowRateEnabled
                  }
                }
              }
            `
          })
        });
        const yeiData = await yeiResponse.json();
        
        // Process YEI positions with prices and decimals
        const yeiPositions = yeiData.data?.userReserves?.map(userReserve => {
          const tokenPrice = tokenPrices.find(
            price => price.Token.toLowerCase() === userReserve.reserve.underlyingAsset.toLowerCase()
          );
          
          const decimals = userReserve.reserve.decimals;
          const adjustedBalance = userReserve.currentATokenBalance / Math.pow(10, decimals);
          const priceUSD = tokenPrice?.PriceUSD || 0;
          const valueUSD = adjustedBalance * priceUSD;

          console.log('YEI position calculation:', {
            asset: userReserve.reserve.underlyingAsset,
            symbol: userReserve.reserve.symbol,
            rawBalance: userReserve.currentATokenBalance,
            decimals: decimals,
            adjustedBalance: adjustedBalance,
            priceUSD: priceUSD,
            valueUSD: valueUSD
          });

          return {
            id: `yei-${evmAddress}-${userReserve.reserve.id}`,
            walletLabel,
            name: userReserve.reserve.name,
            symbol: userReserve.reserve.symbol,
            underlyingAsset: userReserve.reserve.underlyingAsset,
            isActive: userReserve.reserve.isActive,
            isFrozen: userReserve.reserve.isFrozen,
            decimals: decimals,
            rawBalance: userReserve.currentATokenBalance,
            balance: adjustedBalance,
            priceUSD: priceUSD,
            valueUSD: adjustedBalance * priceUSD
          };
        }) || [];

        // Log processed positions for verification
        console.log('Processed YEI positions:', yeiPositions);

        return {
          dragonSwap: poolsData.status === 'ok' ? poolsData.pools.map(pool => ({
            ...pool,
            walletLabel,
            tokens: poolsData.tokens,
            id: `dragon-${evmAddress}-${pool.pool_address}`
          })) : [],
          farms: farmPositions,
          jellyverse: jellyPositions,
          yei: yeiPositions
        };
      } catch (error) {
        console.error(`Error fetching pool data for ${evmAddress}:`, error);
        return { dragonSwap: [], farms: [], jellyverse: [], yei: [] };
      }
    },
    async fetchAllPoolPositions() {
      this.loading = true;
      this.error = null;
      
      try {
        await this.loadLinkedWallets();
        
        const allPositions = await Promise.all(
          this.linkedWallets.map(wallet => 
            this.fetchPoolPositions(
              wallet.evm_hash,
              wallet.label || this.truncateAddress(wallet.sei_hash)
            )
          )
        );
        
        // Separate all positions
        this.poolPositions = allPositions.flatMap(pos => pos.dragonSwap);
        this.jellyPositions = allPositions.flatMap(pos => pos.jellyverse);
        this.yeiPositions = allPositions.flatMap(pos => pos.yei);

        // Format positions for Portfolio view
        const formattedPositions = [
          ...this.poolPositions.map(pos => {
            const value = parseFloat(pos.total_liquidity_usd) || 0;
            console.log(`DragonSwap Position ${pos.poolName}: $${value}`);
            return {
              walletLabel: pos.walletLabel,
              name: pos.poolName || `${pos.tokens?.[0]?.symbol || '-'}/${pos.tokens?.[1]?.symbol || '-'}`,
              type: 'DragonSwap',
              adjustedBalance: parseFloat(pos.first_token_amount) || 0,
              priceUSD: value / (parseFloat(pos.first_token_amount) || 1),
              calculatedValue: value
            };
          }),
          ...this.jellyPositions.map(pos => {
            const value = parseFloat(pos.valueUSD) || 0;
            console.log(`Jellyverse Position ${pos.name}: $${value}`);
            return {
              walletLabel: pos.walletLabel,
              name: pos.name,
              type: 'Jellyverse',
              adjustedBalance: parseFloat(pos.balance) || 0,
              priceUSD: value / (parseFloat(pos.balance) || 1),
              calculatedValue: value
            };
          })
        ];

        console.log('Total formatted DeFi value:', 
          formattedPositions.reduce((sum, pos) => sum + pos.calculatedValue, 0)
        );

        // Commit to Vuex
        this.$store.commit('setDefiPositions', formattedPositions);
        
      } catch (error) {
        console.error('Error fetching pool positions:', error);
        this.error = 'Failed to load DeFi positions';
      } finally {
        this.loading = false;
      }
    }
  },
  async created() {
    console.log('DefiAnalysis component created')
    if (this.hasRequiredAccess) {
      console.log('User has required access, fetching positions')
      await this.fetchAllPoolPositions()
    } else {
      console.log('User does not have required access')
    }
  }
}
</script>

<style scoped>
.defi-analysis {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.defi-table-container {
  overflow-x: auto;
  margin-top: 20px;
  background: #2c2c2c;
  border-radius: 8px;
  padding: 20px;
}

.defi-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
}

.defi-table th {
  text-align: center;
  padding: 12px;
  color: #42b983;
  border-bottom: 1px solid #3c3c3c;
}

.defi-table td {
  padding: 12px;
  border-bottom: 1px solid #3c3c3c;
  text-align: left;
}

.defi-table td:last-child {
  text-align: right;
}

.loading, .error, .access-denied {
  text-align: center;
  padding: 20px;
  background: #2c2c2c;
  border-radius: 8px;
  margin-top: 20px;
}

.error {
  color: #ff4444;
}

.no-data {
  text-align: center;
  color: #666;
  font-style: italic;
}

.access-denied {
  color: #ff4444;
  max-width: 800px;
  margin: 20px auto;
}
</style> 