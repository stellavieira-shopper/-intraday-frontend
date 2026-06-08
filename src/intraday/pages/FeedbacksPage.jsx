import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import FeedbackManagerView from '../feedbacks/FeedbackMgr.jsx'
import PerformanceFeedbackPage from '../feedbacks/PerformanceFeedbackPage.jsx'
import { buildWeeksFromIndex } from '../feedbacks/FeedbackData'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function semanasToIndex(semanas) {
  return (semanas || []).map(s => ({
    week_id:      `${s.year_ref}-W${String(s.week_ref).padStart(2, '0')}`,
    status:       'published',
    generated_at: new Date().toISOString(),
    people_count: s.people_count || 0,
  }))
}

function parseWeekId(weekId) {
  const [year, wPart] = weekId.split('-W')
  return { year_ref: parseInt(year, 10), week_ref: parseInt(wPart, 10) }
}

export default function FeedbacksPage({ onVoltar, user, onLogout }) {
  const [feedbackIndex, setFeedbackIndex] = useState([])
  const [weekBundles, setWeekBundles]     = useState({})
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [bundleError, setBundleError]     = useState(null)
  // When set, shows PerformanceFeedbackPage for a specific person + week
  const [drillPerson, setDrillPerson]     = useState(null) // { personId, weekId }

  useEffect(() => {
    async function fetchIndex() {
      setLoading(true)
      try {
        const res = await axios.get(`${API}/api/intraday/performance/semanas`)
        setFeedbackIndex(semanasToIndex(res.data.semanas))
      } catch (e) {
        setError(e.response?.data?.erro || e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchIndex()
  }, [])

  const handleWeekLoad = useCallback(async (weekId) => {
    if (weekBundles[weekId] && weekBundles[weekId].erros_por_pessoa !== undefined) return
    setBundleError(null)
    try {
      const { year_ref, week_ref } = parseWeekId(weekId)
      const res = await axios.get(`${API}/api/intraday/performance/feedback`, {
        params: { year_ref, week_ref },
      })
      setWeekBundles(prev => ({ ...prev, [weekId]: res.data }))
    } catch (e) {
      setBundleError(e.response?.data?.erro || e.message)
    }
  }, [weekBundles])

  if (loading) return <div style={{ padding: '2rem', color: '#888' }}>Carregando…</div>
  if (error)   return <div style={{ padding: '2rem', color: '#c00' }}>Erro: {error}</div>

  // Drill into individual feedback
  if (drillPerson) {
    return (
      <PerformanceFeedbackPage
        feedbackIndex={feedbackIndex}
        weekBundles={weekBundles}
        onWeekLoad={handleWeekLoad}
        onBack={() => setDrillPerson(null)}
        initialPersonId={drillPerson.personId}
        initialWeekId={drillPerson.weekId}
      />
    )
  }

  return (
    <div>
      {bundleError && (
        <div style={{ padding: '8px 16px', background: '#fde8e8', color: '#c00', fontSize: 12 }}>
          Erro ao carregar semana: {bundleError}
        </div>
      )}
      <FeedbackManagerView
        viewerRole="admin"
        feedbackIndex={feedbackIndex}
        weekBundles={weekBundles}
        onWeekLoad={handleWeekLoad}
        onOpenPersonFeedback={(personId, weekId) => setDrillPerson({ personId, weekId })}
        onBack={onVoltar}
        user={user}
        onLogout={onLogout}
      />
    </div>
  )
}
