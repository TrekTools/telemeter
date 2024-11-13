import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import NftAnalysis from '../views/NftAnalysis.vue'
import CoinAnalysis from '../views/CoinAnalysis.vue'
import EditProfile from '../views/EditProfile.vue'
import PortfolioAnalysis from '../views/PortfolioAnalysis.vue'
import TelemeterGuide from '../views/TelemeterGuide.vue'
import AboutPage from '../views/AboutPage.vue'
import TrendAnalysis from '../views/TrendAnalysis.vue'
import WarpToken from '@/views/WarpToken.vue'
import { trackPageView } from '../analytics'

let appInstance = null

export function setAppInstance(app) {
  console.log('Setting app instance:', app)
  appInstance = app
}

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomeView,
      meta: {
        title: 'Telemeter - Home'
      }
    },
    {
      path: '/nft',
      name: 'nft',
      component: NftAnalysis,
      meta: { requiresNFT: true, title: 'Telemeter - NFT Analysis' }
    },
    {
      path: '/coins',
      name: 'coins',
      component: CoinAnalysis,
      meta: { requiresNFT: true, title: 'Telemeter - Coin Analysis' }
    },
    {
      path: '/profile',
      name: 'profile',
      component: EditProfile,
      meta: { requiresNFT: true, title: 'Telemeter - Edit Profile' }
    },
    {
      path: '/portfolio',
      name: 'Portfolio',
      component: PortfolioAnalysis,
      meta: { requiresNFT: true, title: 'Telemeter - Portfolio Analysis' }
    },
    {
      path: '/trends',
      name: 'trends',
      component: TrendAnalysis,
      meta: { requiresNFT: true, title: 'Telemeter - Trend Analysis' }
    },
    {
      path: '/guide',
      name: 'guide',
      component: TelemeterGuide,
      meta: { title: 'Telemeter - Guide' }
    },
    {
      path: '/about',
      name: 'about',
      component: AboutPage,
      meta: { title: 'Telemeter - About' }
    },
    {
      path: '/warp',
      name: 'WarpToken',
      component: WarpToken,
      props: true,
      meta: { title: 'Telemeter - Warp Token' }
    }
  ]
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'Telemeter'
  if (to.meta.requiresNFT) {
    try {
      console.log('Route Guard Debug:', {
        appInstance: appInstance,
        warpBoisCount: appInstance?.warpBoisCount,
        tacCount: appInstance?.tacCount,
        routerViewProps: appInstance?.$refs?.routerView,
        path: to.path
      })

      if (!appInstance) {
        console.log('App instance not available yet - denying access')
        next('/')
        return
      }

      // Check NFT counts directly from app instance
      const hasRequiredNFT = appInstance.warpBoisCount > 0 || appInstance.tacCount > 0
      
      console.log('Access Check:', {
        warpBoisCount: appInstance.warpBoisCount,
        tacCount: appInstance.tacCount,
        hasAccess: hasRequiredNFT
      })
      
      if (hasRequiredNFT) {
        console.log('Access granted - proceeding to', to.path)
        next()
      } else {
        console.log('Access denied - redirecting to home')
        next('/')
      }
    } catch (error) {
      console.error('Error in route guard:', error)
      next('/')
    }
  } else {
    next()
  }
})

router.afterEach((to) => {
  trackPageView(to.path)
})

export default router 