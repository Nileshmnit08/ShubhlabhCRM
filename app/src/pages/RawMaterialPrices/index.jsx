import React from 'react';
import './raw-material-stitch.css';
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
  return (
    <div className="page-container animate-fade-in mx-auto w-full max-w-[1280px] px-4 md:px-6 lg:px-8 pb-12">
      <RawMaterialPriceHeader />

      <div className="mt-space-md">
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
