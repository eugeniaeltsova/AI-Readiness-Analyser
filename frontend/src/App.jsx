import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import QuestionnaireForm from './components/QuestionnaireForm'
import PastReports from './components/PastReports'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                element={<LandingPage />} />
        <Route path="/analyze"         element={<QuestionnaireForm />} />
        <Route path="/reports"         element={<PastReports />} />
        <Route path="/reports/:reportId" element={<PastReports />} />
      </Routes>
    </BrowserRouter>
  )
}
