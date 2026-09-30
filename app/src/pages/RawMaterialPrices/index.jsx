import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import RawMaterialPriceHeader from './components/RawMaterialPriceHeader';

import Dashboard from './Dashboard';
import DailyPriceEntry from './DailyPriceEntry';
import PriceHistory from './PriceHistory';
import PriceAnalysis from './PriceAnalysis';
import WhatsAppUpdate from './WhatsAppUpdate';
import Configuration from './Configuration';
import AttentionCenter from './AttentionCenter';

const RawMaterialPrices = () => {
  const location = useLocation();
  const isStitchRoute = ['/raw-material-prices', '/raw-material-prices/', '/raw-material-prices/daily-entry', '/raw-material-prices/history', '/raw-material-prices/analysis', '/raw-material-prices/whatsapp'].includes(location.pathname);

  return (
    <div className={`page-container animate-fade-in mx-auto ${isStitchRoute ? 'w-full' : 'max-w-7xl'}`}>
      {!isStitchRoute && <RawMaterialPriceHeader />}

      <div className={isStitchRoute ? "" : "tab-content"}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="daily-entry" element={<DailyPriceEntry />} />
          <Route path="history" element={<PriceHistory />} />
          <Route path="analysis" element={<PriceAnalysis />} />
          <Route path="whatsapp" element={<WhatsAppUpdate />} />
          <Route path="attention" element={<AttentionCenter />} />
          <Route path="configuration/*" element={<Configuration />} />
          <Route path="*" element={<Navigate to="/raw-material-prices" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default RawMaterialPrices;
