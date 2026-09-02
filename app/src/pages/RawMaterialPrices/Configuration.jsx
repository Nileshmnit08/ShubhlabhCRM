import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Edit2, CheckCircle, AlertTriangle, PackageOpen, LayoutList, Users, Ruler, IndianRupee } from 'lucide-react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import ConfigurationLanding from './components/ConfigurationLanding';
import MasterDataSectionHeader from './components/MasterDataSectionHeader';
import StatusBadge from './components/StatusBadge';
import EmptyState from './components/EmptyState';
import MasterDataTable from './components/MasterDataTable';
import RawMaterialsTab from './components/RawMaterialsTab';

import QualityParametersTab from './components/QualityParametersTab';
import BrokersTab from './components/BrokersTab';
import UnitsTab from './components/UnitsTab';
import PriceTypesTab from './components/PriceTypesTab';
import GeneralSettingsTab from './components/GeneralSettingsTab';

const ConfigurationLayout = () => (
  <div className="w-full max-w-6xl mx-auto">
    <Outlet />
  </div>
);

const Configuration = () => {
  const [loading, setLoading] = useState(true);
  
  const [materials, setMaterials] = useState([]);
  const [qualityGrades, setQualityGrades] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [units, setUnits] = useState([]);
  const [priceTypes, setPriceTypes] = useState([]);
  const [settings, setSettings] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mats, grades, brks, un, pt, sets] = await Promise.all([
        supabase.from('raw_materials').select(`*, default_unit:rm_units(unit_name)`).order('display_order'),
        supabase.from('material_quality_grades').select(`*, raw_materials(name_en)`).order('display_order'),
        supabase.from('brokers').select('*, broker_materials(raw_material_id)').order('broker_name'),
        supabase.from('rm_units').select('*').order('display_order'),
        supabase.from('rm_price_types').select('*').order('display_order'),
        supabase.from('raw_material_price_settings').select('*').limit(1).single()
      ]);

      setMaterials(mats.data || []);
      setQualityGrades(grades.data || []);
      setBrokers(brks.data || []);
      setUnits(un.data || []);
      setPriceTypes(pt.data || []);
      if (sets.data) {
        setSettings(sets.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const renderSkeleton = (columns) => (
    <MasterDataTable>
      <thead className="bg-slate-50 text-secondary border-b border-base">
        <tr>
          {Array(columns).fill(0).map((_, idx) => (
            <th key={idx} className="p-4 font-semibold uppercase tracking-wider text-xs">Loading...</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-base">
        {[1, 2, 3, 4, 5].map(i => (
          <tr key={i} className="animate-pulse">
            {Array(columns).fill(0).map((_, idx) => (
              <td key={idx} className="p-4"><div className="h-4 bg-base/50 rounded w-full max-w-[120px]"></div></td>
            ))}
          </tr>
        ))}
      </tbody>
    </MasterDataTable>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}

      <Routes>
        <Route path="/" element={<ConfigurationLanding />} />
        
        <Route element={<ConfigurationLayout />}>
          {/* RAW MATERIALS TAB */}
        <Route path="raw-materials" element={
          <RawMaterialsTab 
            materials={materials} 
            units={units} 
            loading={loading} 
            onRefresh={fetchData} 
            showMessage={showMessage} 
          />
        } />

        {/* QUALITY PARAMETERS TAB */}
        <Route path="quality-parameters" element={
          <QualityParametersTab 
            qualityGrades={qualityGrades} 
            materials={materials} 
            loading={loading} 
            onRefresh={fetchData} 
            showMessage={showMessage} 
          />
        } />

        {/* BROKERS TAB */}
        <Route path="brokers" element={
          <BrokersTab 
            brokers={brokers} 
            materials={materials} 
            loading={loading} 
            onRefresh={fetchData} 
            showMessage={showMessage} 
          />
        } />

        {/* UNITS TAB */}
        <Route path="units" element={
          <UnitsTab 
            units={units} 
            loading={loading} 
            onRefresh={fetchData} 
            showMessage={showMessage} 
          />
        } />

        {/* PRICE TYPES TAB */}
        <Route path="price-types" element={
          <PriceTypesTab 
            priceTypes={priceTypes} 
            loading={loading} 
            onRefresh={fetchData} 
            showMessage={showMessage} 
          />
        } />

        {/* GENERAL SETTINGS TAB */}
        <Route path="general-settings" element={
          <GeneralSettingsTab 
            settings={settings} 
            loading={loading} 
            onRefresh={fetchData} 
            showMessage={showMessage} 
          />
        } />
        </Route>
      </Routes>

    </div>
  );
};

export default Configuration;
