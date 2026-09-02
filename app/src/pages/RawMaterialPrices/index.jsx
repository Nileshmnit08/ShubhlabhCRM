import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import RawMaterialPriceHeader from './components/RawMaterialPriceHeader';
import PriceModuleTabs from './components/PriceModuleTabs';

import Dashboard from './Dashboard';
import DailyPriceEntry from './DailyPriceEntry';
import PriceHistory from './PriceHistory';
import PriceAnalysis from './PriceAnalysis';
import WhatsAppUpdate from './WhatsAppUpdate';
import Configuration from './Configuration';

const RawMaterialPrices = () => {
  return (
    <div className="page-container animate-fade-in max-w-7xl mx-auto">
      <RawMaterialPriceHeader />
      <PriceModuleTabs />

      <div className="tab-content mt-6">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="daily-entry" element={<DailyPriceEntry />} />
          <Route path="history" element={<PriceHistory />} />
          <Route path="analysis" element={<PriceAnalysis />} />
          <Route path="whatsapp" element={<WhatsAppUpdate />} />
          <Route path="configuration" element={<Configuration />} />
          <Route path="*" element={<Navigate to="/raw-material-prices" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default RawMaterialPrices;
