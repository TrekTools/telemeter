import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import NftAnalysis from '../views/NftAnalysis.vue'
import CoinAnalysis from '../views/CoinAnalysis.vue'
import EditProfile from '../views/EditProfile.vue'
import PortfolioAnalysis from '../views/PortfolioAnalysis.vue'
import TelemeterGuide from '../views/TelemeterGuide.vue'
import AboutPage from '../views/AboutPage.vue'
import TrendAnalysis from '../views/TrendAnalysis.vue'

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/nft',
      name: 'nft',
      component: NftAnalysis,
      meta: { requiresNFT: true }
    },
    {
      path: '/coins',
      name: 'coins',
      component: CoinAnalysis,
      meta: { requiresNFT: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: EditProfile,
      meta: { requiresNFT: true }
    },
    {
      path: '/portfolio',
      name: 'portfolio',
      component: PortfolioAnalysis,
      meta: { requiresNFT: true }
    },
    {
      path: '/trends',
      name: 'trends',
      component: TrendAnalysis,
      meta: { requiresNFT: true }
    },
    {
      path: '/guide',
      name: 'guide',
      component: TelemeterGuide
    },
    {
      path: '/about',
      name: 'about',
      component: AboutPage
    }
  ]
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresNFT) {
    const warpBoisCount = parseInt(localStorage.getItem('warpBoisCount') || '0')
    const tacCount = parseInt(localStorage.getItem('tacCount') || '0')
    
    if (warpBoisCount > 0 || tacCount > 0) {
      next()
    } else {
      next('/')
    }
  } else {
    next()
  }
})

export default router 