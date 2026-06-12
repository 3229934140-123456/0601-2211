import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AssetList from './pages/AssetList';
import MetricsInput from './pages/MetricsInput';
import Valuation from './pages/Valuation';
import RiskAlert from './pages/RiskAlert';
import QuoteScheme from './pages/QuoteScheme';
import ApprovalRecord from './pages/ApprovalRecord';
import ReportCenter from './pages/ReportCenter';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/assets" replace />} />
        <Route path="assets" element={<AssetList />} />
        <Route path="metrics" element={<MetricsInput />} />
        <Route path="valuation" element={<Valuation />} />
        <Route path="risk" element={<RiskAlert />} />
        <Route path="quote" element={<QuoteScheme />} />
        <Route path="approval" element={<ApprovalRecord />} />
        <Route path="reports" element={<ReportCenter />} />
      </Route>
    </Routes>
  );
}

export default App;
