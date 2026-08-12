import axios from 'axios'

const BASE_URL = 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const registerUser = (data) => api.post('/api/auth/register', data)
export const loginUser = (data) => api.post('/api/auth/login', data)
export const analyzeProfile = (data) => api.post('/api/analyze/profile', data)
export const getAnalysisHistory = () => api.get('/api/analyze/history')
export const getTwitterBots = () => api.get('/api/analyze/twitter-bots')
export const getBotsByPlatform = (platform = 'Twitter') => api.get(`/api/analyze/bots?platform=${platform}`)
export const getAllReports = () => api.get('/api/reports/all')
export const getReportStats = () => api.get('/api/reports/stats')
export const detectDeepfake = (formData) => api.post('/api/deepfake/detect', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const scanSimilarity = (data) => api.post('/api/similarity/scan', data)
export const scoreCredibility = (data) => api.post('/api/credibility/score', data)

export default api