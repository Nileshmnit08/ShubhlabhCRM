import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, AlertTriangle, Package, Sliders, Users, Ruler, IndianRupee, Settings } from 'lucide-react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';

import MasterDataSectionHeader from './components/MasterDataSectionHeader';
import StatusBadge from './components/StatusBadge';
import EmptyState from './components/EmptyState';
import MasterDataTable from './components/MasterDataTable';
import RawMaterialsTab from './components/RawMaterialsTab';
import RawMaterialFormPage from './components/RawMaterialFormPage';

import QualityParametersTab from './components/QualityParametersTab';
import QualityParameterFormPage from './components/QualityParameterFormPage';
import BrokersTab from './components/BrokersTab';
import BrokerFormPage from './components/BrokerFormPage';
import UnitsTab from './components/UnitsTab';
import UnitFormPage from './components/UnitFormPage';
import PriceTypesTab from './components/PriceTypesTab';
import PriceTypeFormPage from './components/PriceTypeFormPage';
import GeneralSettingsTab from './components/GeneralSettingsTab';

export const CONFIGURATION_TABS = [
  { id: 'raw-materials', label: 'Raw Materials', icon: Package },
  { id: 'quality-parameters', label: 'Quality Parameters', icon: Sliders },
  { id: 'brokers', label: 'Brokers', icon: Users },
  { id: 'units', label: 'Units', icon: Ruler },
  { id: 'price-types', label: 'Price Types', icon: IndianRupee },
  { id: 'general-settings', label: 'General Settings', icon: Settings },
];

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

  return (
    <div className="animate-fade-in" style={{maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px'}}>
      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border shadow-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}

      <div className="page-header" style={{marginBottom: '2rem'}}>
        <div>
          <h1 style={{margin: 0}}>Configuration</h1>
          <p className="text-secondary" style={{marginTop: '0.5rem', fontSize: '0.95rem'}}>Manage settings, lists, and parameters for Raw Material Prices.</p>
        </div>
      </div>

      <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
        {/* Sidebar Nav */}
        <div style={{flex: '1 1 250px'}}>
          <div className="glass-panel" style={{display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0}}>
            {CONFIGURATION_TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <NavLink 
                  key={tab.id}
                  to={`/raw-material-prices/configuration/${tab.id}`}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: '0.75rem', 
                    padding: '1.25rem 1rem', textAlign: 'left', border: 'none',
                    background: isActive ? 'var(--bg-surface-hover)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: isActive ? 600 : 400,
                    borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                    borderBottom: '1px solid var(--border)',
                    textDecoration: 'none'
                  })}
                >
                  <Icon size={18} />
                  {tab.label}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div style={{flex: '3 1 600px'}}>
          <Routes>
            <Route index element={<Navigate to="raw-materials" replace />} />
            
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
            <Route path="raw-materials/new" element={
              <RawMaterialFormPage 
                units={units} 
                onRefresh={fetchData} 
                showMessage={showMessage} 
              />
            } />
            <Route path="raw-materials/:id/edit" element={
              <RawMaterialFormPage 
                units={units} 
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
            <Route path="quality-parameters/new" element={
              <QualityParameterFormPage 
                materials={materials} 
                onRefresh={fetchData} 
                showMessage={showMessage} 
              />
            } />
            <Route path="quality-parameters/:id/edit" element={
              <QualityParameterFormPage 
                materials={materials} 
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
            <Route path="brokers/new" element={
              <BrokerFormPage 
                materials={materials} 
                onRefresh={fetchData} 
                showMessage={showMessage} 
              />
            } />
            <Route path="brokers/:id/edit" element={
              <BrokerFormPage 
                materials={materials} 
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
            <Route path="units/new" element={
              <UnitFormPage 
                onRefresh={fetchData} 
                showMessage={showMessage} 
              />
            } />
            <Route path="units/:id/edit" element={
              <UnitFormPage 
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
            <Route path="price-types/new" element={
              <PriceTypeFormPage 
                onRefresh={fetchData} 
                showMessage={showMessage} 
              />
            } />
            <Route path="price-types/:id/edit" element={
              <PriceTypeFormPage 
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
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Configuration;
