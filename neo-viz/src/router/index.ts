import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../pages/HomePage.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/about', name: 'about', component: () => import('../pages/AboutPage.vue') },
  { path: '/help', name: 'help', component: () => import('../pages/HelpPage.vue') },
  { path: '/explore', name: 'explore', component: () => import('../pages/ExplorePage.vue') },
  { path: '/dashboard', name: 'dashboard', component: () => import('../pages/DashboardPage.vue') },
  { path: '/cohort', name: 'cohort', component: () =>import('../pages/Cohort.vue')}
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
