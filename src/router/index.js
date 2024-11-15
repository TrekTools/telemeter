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
import DelegationsAnalysis from '@/views/DelegationsAnalysis.vue'
import { trackPageView } from '../analytics'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
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
  },
  {
    path: '/delegations',
    name: 'delegations',
    component: DelegationsAnalysis,
    props: true,
    meta: { requiresNFT: true, title: 'Telemeter - Delegation Analysis' }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

let appInstance = null

export const setAppInstance = (app) => {
  appInstance = app
}

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    if (!appInstance) {
      console.error('App instance not found');
      next('/');
      return;
    }

    // Get access state from root component
    const root = appInstance._instance.root;
    const hasAccess = root.ctx.hasAppAccess || 
                     root.ctx.warpBoisCount > 0 || 
                     root.ctx.tacCount > 0 || 
                     root.ctx.warpTokenBalance >= root.ctx.WARP_MINIMUM_BALANCE;

    console.log('Access Check:', {
      warpBoisCount: root.ctx.warpBoisCount,
      tacCount: root.ctx.tacCount,
      warpTokenBalance: root.ctx.warpTokenBalance,
      hasAccess
    });

    if (!hasAccess) {
      sessionStorage.setItem('intendedPath', to.path);
      console.log('Access denied - redirecting to home');
      next('/');
    } else {
      next();
    }
  } else {
    next();
  }
})

router.afterEach((to) => {
  trackPageView(to.path)
})

export default router 