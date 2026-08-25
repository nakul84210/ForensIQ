import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import TwitterBots from './pages/TwitterBots'
import Reports from './pages/Reports'
import NetworkGraph from './pages/NetworkGraph'
import ThreatFeed from './pages/ThreatFeed'
import DeepfakeDetector from './pages/DeepfakeDetector'
import SimilarityScanner from './pages/SimilarityScanner'
import CredibilityScorer from './pages/CredibilityScorer'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Protected Routes wrapped in Layout */}
          <Route
            path="/dashboard"
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />
          <Route
            path="/analyze"
            element={
              <Layout>
                <Analyze />
              </Layout>
            }
          />
          <Route
            path="/twitter-bots"
            element={
              <Layout>
                <TwitterBots />
              </Layout>
            }
          />
          <Route
            path="/deepfake"
            element={
              <Layout>
                <DeepfakeDetector />
              </Layout>
            }
          />
          <Route
            path="/similarity"
            element={
              <Layout>
                <SimilarityScanner />
              </Layout>
            }
          />
          <Route
            path="/credibility"
            element={
              <Layout>
                <CredibilityScorer />
              </Layout>
            }
          />
          <Route
            path="/network"
            element={
              <Layout>
                <NetworkGraph />
              </Layout>
            }
          />

          <Route
            path="/threats"
            element={
              <Layout>
                <ThreatFeed />
              </Layout>
            }
          />
          <Route
            path="/reports"
            element={
              <Layout>
                <Reports />
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App