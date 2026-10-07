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
export const searchProfile = (username) => api.get(`/api/analyze/search/${username}`)
export const analyzeProfile = (data) => api.post('/api/analyze/profile', data)
export const getAnalysisHistory = () => api.get('/api/analyze/history')
export const getTwitterBots = () => api.get('/api/analyze/twitter-bots')
export const getBotsByPlatform = (platform = 'Twitter') => api.get(`/api/analyze/bots?platform=${platform}`)
export const getThreatFeed = () => api.get('/api/analyze/threats')
export const getAllReports = () => api.get('/api/reports/all')
export const getReportStats = () => api.get('/api/reports/stats')
export const getModelMetrics = () => api.get('/api/metrics/metrics')
export const detectDeepfake = (formData) => api.post('/api/deepfake/detect', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const scanSimilarity = (data) => api.post('/api/similarity/scan', data)
export const scoreCredibility = (data) => api.post('/api/credibility/score', data)
export const getNetworkGraph = () => api.get('/api/network/graph')
export const generateNarrative = (analysisId, regenerate = false) =>
  api.post(`/api/analyze/${analysisId}/narrate`, { regenerate })

export const getReportPdfUrl = (analysisId) => `${BASE_URL}/api/analyze/${analysisId}/report.pdf`

export const downloadReportPdf = async (analysisId, filename) => {
  const safeFilename = filename || `ForensIQ_Report_${analysisId}.pdf`
  const res = await api.get(`/api/analyze/${analysisId}/report.pdf`, {
    responseType: 'blob',
  })
  const blob = new Blob([res.data], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', safeFilename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default api