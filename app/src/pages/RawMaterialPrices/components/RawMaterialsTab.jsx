import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, RotateCcw, Edit2, MoreVertical, AlertTriangle, 
  PackageOpen, ChevronLeft, ChevronRight, Copy, Power, PowerOff, 
  ArrowUp, ArrowDown, History, X, Check, Loader2
} from 'lucide-react';
import { normalizeIdentity } from '../../../utils/normalizer';

const DEFAULT_CATEGORIES = [
  'Grains', 
  'Brans', 
  'Oil Cakes', 
  'De-oiled Cakes', 
  'Protein Sources', 
  'Minerals', 
  'Liquid Additives', 
  'Feed', 
  'Liquid', 
  'Other'
];

export default function RawMaterialsTab({ 
  materials = [], 
  units = [], 
  priceTypes = [], 
  loading = false, 
  onRefresh, 
  showMessage 
}) {
  const navigate = useNavigate();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'display_order', direction: 'asc' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 3-dot dropdown menu state
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  // Deactivate confirmation modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [materialToDeactivate, setMaterialToDeactivate] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // In-Page Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    name_en: '',
    name_hi: '',
    category: '',
    default_unit_id: '',
    default_price_type_id: '',
    notes: '',
    daily_tracking_required: true,
    active: true,
    display_order: 99
  });

  // Local price types fallback if not passed
  const [localPriceTypes, setLocalPriceTypes] = useState(priceTypes || []);
  useEffect(() => {
    if (priceTypes && priceTypes.length > 0) {
      setLocalPriceTypes(priceTypes);
    } else {
      supabase.from('rm_price_types').select('*').order('display_order')
        .then(({ data }) => {
          if (data) setLocalPriceTypes(data);
        });
    }
  }, [priceTypes]);

  // Close 3-dot menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuRef]);

  // Dynamically collect all available categories
  const allCategories = useMemo(() => {
    const cats = new Set(DEFAULT_CATEGORIES);
    if (materials && Array.isArray(materials)) {
      materials.forEach(m => {
        if (m.category && m.category.trim()) {
          cats.add(m.category.trim());
        }
      });
    }
    return Array.from(cats);
  }, [materials]);

  // Filtered & sorted materials
  const filteredData = useMemo(() => {
    let result = materials || [];

    // Search by material name (EN / HI) or code
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(m => 
        (m.code && m.code.toLowerCase().includes(q)) ||
        (m.name_en && m.name_en.toLowerCase().includes(q)) ||
        (m.name_hi && m.name_hi.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (categoryFilter !== 'All') {
      result = result.filter(m => m.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'All') {
      const isActive = statusFilter === 'Active';
      result = result.filter(m => m.active === isActive);
    }

    // Sort
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'unit') {
          valA = a.default_unit?.unit_name || a.default_unit_id || '';
          valB = b.default_unit?.unit_name || b.default_unit_id || '';
        }

        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [materials, searchQuery, categoryFilter, statusFilter, sortConfig]);

  // Pagination calculations
  const totalRecords = filteredData.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const hasActiveFilters = searchQuery.trim() !== '' || categoryFilter !== 'All' || statusFilter !== 'All';

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={12} className="ml-1 text-orange-600 inline" />
      : <ArrowDown size={12} className="ml-1 text-orange-600 inline" />;
  };

  // Open modal for Adding new material
  const handleOpenAddModal = () => {
    setEditingMaterial(null);
    setFormError('');
    setFormData({
      code: '',
      name_en: '',
      name_hi: '',
      category: allCategories[0] || 'Grains',
      default_unit_id: units[0]?.id || '',
      default_price_type_id: localPriceTypes[0]?.id || '',
      notes: '',
      daily_tracking_required: true,
      active: true,
      display_order: (materials.length || 0) + 1
    });
    setIsModalOpen(true);
  };

  // Open modal for Editing existing material
  const handleOpenEditModal = (material) => {
    setEditingMaterial(material);
    setFormError('');
    setFormData({
      code: material.code || '',
      name_en: material.name_en || '',
      name_hi: material.name_hi || '',
      category: material.category || allCategories[0] || '',
      default_unit_id: material.default_unit_id || units[0]?.id || '',
      default_price_type_id: material.default_price_type_id || '',
      notes: material.notes || '',
      daily_tracking_required: material.daily_tracking_required !== false,
      active: material.active !== false,
      display_order: material.display_order ?? 99
    });
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  // Duplicate material into Add modal
  const handleDuplicate = (material) => {
    setEditingMaterial(null); // Fresh insert
    setFormError('');
    setFormData({
      code: '', // Require new code
      name_en: `${material.name_en || ''} (Copy)`,
      name_hi: material.name_hi || '',
      category: material.category || allCategories[0] || '',
      default_unit_id: material.default_unit_id || units[0]?.id || '',
      default_price_type_id: material.default_price_type_id || '',
      notes: material.notes || '',
      daily_tracking_required: material.daily_tracking_required !== false,
      active: true,
      display_order: (materials.length || 0) + 1
    });
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  // Save Material (Add or Edit)
  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);

    try {
      const codeTrimmed = (formData.code || '').trim().toUpperCase();
      const nameEnTrimmed = (formData.name_en || '').trim();
      const nameHiTrimmed = (formData.name_hi || '').trim();
      const categoryTrimmed = (formData.category || '').trim();
      const defaultUnitId = formData.default_unit_id;

      // Basic validation
      if (!codeTrimmed) throw new Error('Material Code is required.');
      if (!nameEnTrimmed) throw new Error('English Name is required.');
      if (!categoryTrimmed) throw new Error('Category is required.');
      if (!defaultUnitId) throw new Error('Default Unit is required.');

      const currentId = editingMaterial?.id || '00000000-0000-0000-0000-000000000000';

      // 1. Check unique code
      const { data: existingCode, error: codeErr } = await supabase
        .from('raw_materials')
        .select('id')
        .ilike('code', codeTrimmed)
        .neq('id', currentId)
        .maybeSingle();

      if (codeErr) throw codeErr;
      if (existingCode) {
        throw new Error(`Material Code "${codeTrimmed}" is already in use.`);
      }

      // 2. Check normalized name uniqueness among active materials
      const incomingNorm = normalizeIdentity(nameEnTrimmed);
      const { data: activeMats, error: nameErr } = await supabase
        .from('raw_materials')
        .select('id, name_en')
        .eq('active', true)
        .neq('id', currentId);

      if (nameErr) throw nameErr;
      if (activeMats) {
        const isDuplicate = activeMats.some(m => normalizeIdentity(m.name_en) === incomingNorm);
        if (isDuplicate) {
          throw new Error('An active material with this name already exists.');
        }
      }

      const payload = {
        code: codeTrimmed,
        name_en: nameEnTrimmed,
        name_hi: nameHiTrimmed || null,
        category: categoryTrimmed,
        default_unit_id: defaultUnitId,
        default_price_type_id: formData.default_price_type_id || null,
        notes: (formData.notes || '').trim() || null,
        daily_tracking_required: Boolean(formData.daily_tracking_required),
        active: Boolean(formData.active),
        display_order: Number(formData.display_order) || 99
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from('raw_materials')
          .update(payload)
          .eq('id', editingMaterial.id);
        if (error) throw error;
        if (showMessage) showMessage('success', 'Material updated successfully.');
      } else {
        const { error } = await supabase
          .from('raw_materials')
          .insert(payload);
        if (error) throw error;
        if (showMessage) showMessage('success', 'Material added successfully.');
      }

      setIsModalOpen(false);
      setEditingMaterial(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setFormError(err.message || 'Failed to save material.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle status (Active / Inactive)
  const handleToggleStatus = (material) => {
    setActiveMenuId(null);
    if (material.active) {
      setMaterialToDeactivate(material);
      setIsConfirmOpen(true);
    } else {
      performStatusUpdate(material.id, true);
    }
  };

  const performStatusUpdate = async (id, newStatus) => {
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('raw_materials')
        .update({ active: newStatus })
        .eq('id', id);
      if (error) throw error;
      if (showMessage) {
        showMessage('success', `Material ${newStatus ? 'activated' : 'deactivated'} successfully.`);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      if (showMessage) showMessage('error', 'Failed to update material status.');
    } finally {
      setIsUpdatingStatus(false);
      setIsConfirmOpen(false);
      setMaterialToDeactivate(null);
    }
  };

  // Category badge styling helper (pure CSS inline styles)
  const getCategoryBadgeStyle = (category) => {
    const cat = (category || '').toLowerCase();
    let bg = '#F1F5F9';
    let color = '#475569';
    let border = '#E2E8F0';

    if (cat.includes('grain')) {
      bg = '#FEF3C7'; color = '#B45309'; border = '#FDE68A';
    } else if (cat.includes('bran')) {
      bg = '#FEF9C3'; color = '#A16207'; border = '#FEF08A';
    } else if (cat.includes('cake')) {
      bg = '#FFF7ED'; color = '#EA580C'; border = '#FFEDD5';
    } else if (cat.includes('protein')) {
      bg = '#F3E8FF'; color = '#7E22CE'; border = '#E9D5FF';
    } else if (cat.includes('mineral')) {
      bg = '#E0F2FE'; color = '#0369A1'; border = '#BAE6FD';
    } else if (cat.includes('liquid') || cat.includes('additive')) {
      bg = '#CCFBF1'; color = '#0F766E'; border = '#99F6E4';
    } else if (cat.includes('feed')) {
      bg = '#ECFDF5'; color = '#047857'; border = '#A7F3D0';
    }

    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.1875rem 0.625rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      backgroundColor: bg,
      color: color,
      border: `1px solid ${border}`
    };
  };

  // Generate numbered pages array
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '0.75rem',
      border: '1px solid #E2E8F0',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Right Panel Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #E2E8F0',
        background: '#FFFFFF',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#0F172A',
            letterSpacing: '-0.01em'
          }}>
            Raw Material Master
          </h2>
          <p style={{
            margin: '0.25rem 0 0 0',
            fontSize: '0.8125rem',
            color: '#64748B'
          }}>
            Add, edit and manage raw materials with category, unit and status.
          </p>
        </div>

        <button 
          type="button"
          onClick={handleOpenAddModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: '#EA580C',
            border: 'none',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C2410C'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EA580C'}
        >
          <Plus size={16} />
          <span>Add Material</span>
        </button>
      </div>

      {/* Search and Filters – All in ONE single horizontal row */}
      <div style={{
        padding: '0.875rem 1.5rem',
        backgroundColor: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        {/* Search by material name or code */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '200px' }}>
          <Search 
            size={16} 
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8',
              pointerEvents: 'none'
            }} 
          />
          <input 
            type="text"
            placeholder="Search by material name or code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              height: '2.25rem',
              paddingLeft: '2.25rem',
              paddingRight: '0.75rem',
              fontSize: '0.875rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '0.5rem',
              color: '#0F172A',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Category dropdown */}
        <div style={{ minWidth: '150px' }}>
          <select 
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              height: '2.25rem',
              paddingLeft: '0.75rem',
              paddingRight: '1.75rem',
              fontSize: '0.875rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '0.5rem',
              color: '#334155',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              cursor: 'pointer',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          >
            <option value="All">All Categories</option>
            {allCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Status dropdown */}
        <div style={{ minWidth: '130px' }}>
          <select 
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              height: '2.25rem',
              paddingLeft: '0.75rem',
              paddingRight: '1.75rem',
              fontSize: '0.875rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '0.5rem',
              color: '#334155',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              cursor: 'pointer',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Reset button */}
        <button 
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          style={{
            height: '2.25rem',
            padding: '0 0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            border: '1px solid #E2E8F0',
            backgroundColor: hasActiveFilters ? '#FFFFFF' : '#F1F5F9',
            color: hasActiveFilters ? '#334155' : '#94A3B8',
            cursor: hasActiveFilters ? 'pointer' : 'default',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (hasActiveFilters) e.currentTarget.style.backgroundColor = '#F8FAFC';
          }}
          onMouseLeave={(e) => {
            if (hasActiveFilters) e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>
      </div>

      {/* Table Content */}
      <div style={{ flex: 1, minHeight: '360px', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div 
                key={i} 
                style={{
                  height: '3.5rem',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '0.5rem',
                  border: '1px solid #E2E8F0',
                  animation: 'pulse 1.5s infinite'
                }} 
              />
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{
            padding: '4rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <div style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '9999px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              marginBottom: '1rem'
            }}>
              <PackageOpen size={32} />
            </div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#0F172A' }}>
              {hasActiveFilters ? 'No matching materials found' : 'No Raw Materials'}
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.875rem', color: '#64748B', maxWidth: '360px' }}>
              {hasActiveFilters 
                ? 'Try adjusting your search query, category or status filter.' 
                : 'Get started by creating your first cattle-feed raw material.'}
            </p>
            {hasActiveFilters ? (
              <button 
                type="button"
                onClick={resetFilters}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#334155',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                Clear Filters
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleOpenAddModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: '#EA580C',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                <Plus size={16} />
                <span>Add Material</span>
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0'
              }}>
                <th style={{
                  padding: '0.75rem 1rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: '4.5rem',
                  textAlign: 'center'
                }}>
                  Sr. No.
                </th>
                <th 
                  onClick={() => handleSort('name_en')}
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer'
                  }}
                >
                  Material Name <SortIcon columnKey="name_en" />
                </th>
                <th 
                  onClick={() => handleSort('category')}
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer'
                  }}
                >
                  Category <SortIcon columnKey="category" />
                </th>
                <th 
                  onClick={() => handleSort('unit')}
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer'
                  }}
                >
                  Default Unit <SortIcon columnKey="unit" />
                </th>
                <th style={{
                  padding: '0.75rem 1rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'center'
                }}>
                  Track
                </th>
                <th 
                  onClick={() => handleSort('active')}
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer'
                  }}
                >
                  Status <SortIcon columnKey="active" />
                </th>
                <th style={{
                  padding: '0.75rem 1rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'right',
                  width: '6rem'
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((m, idx) => {
                const srNo = (currentPage - 1) * itemsPerPage + idx + 1;
                return (
                  <tr 
                    key={m.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Sr. No. */}
                    <td style={{
                      padding: '0.875rem 1rem',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      color: '#64748B',
                      textAlign: 'center'
                    }}>
                      {srNo}
                    </td>

                    {/* Material Name (EN, HI, Code) */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>
                          {m.name_en}
                        </span>
                        {m.code && (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            color: '#475569',
                            backgroundColor: '#F1F5F9',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '0.25rem',
                            border: '1px solid #E2E8F0'
                          }}>
                            {m.code}
                          </span>
                        )}
                      </div>
                      {m.name_hi && (
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.125rem' }}>
                          {m.name_hi}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={getCategoryBadgeStyle(m.category)}>
                        {m.category || 'Other'}
                      </span>
                    </td>

                    {/* Default Unit */}
                    <td style={{
                      padding: '0.875rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#334155'
                    }}>
                      {m.default_unit?.unit_name || m.default_unit_id || '-'}
                    </td>

                    {/* Track */}
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      {m.daily_tracking_required ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.125rem 0.625rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          border: '1px solid #DBEAFE'
                        }}>
                          Tracked
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.125rem 0.625rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: '#F1F5F9',
                          color: '#64748B',
                          border: '1px solid #E2E8F0'
                        }}>
                          No
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {m.active ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.125rem 0.625rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: '#ECFDF5',
                          color: '#059669',
                          border: '1px solid #A7F3D0'
                        }}>
                          <span style={{
                            width: '0.375rem',
                            height: '0.375rem',
                            borderRadius: '9999px',
                            backgroundColor: '#059669'
                          }} />
                          Active
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.125rem 0.625rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: '#F1F5F9',
                          color: '#64748B',
                          border: '1px solid #E2E8F0'
                        }}>
                          <span style={{
                            width: '0.375rem',
                            height: '0.375rem',
                            borderRadius: '9999px',
                            backgroundColor: '#94A3B8'
                          }} />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '0.25rem',
                        position: 'relative'
                      }}>
                        {/* Edit Icon Button */}
                        <button 
                          type="button"
                          onClick={() => handleOpenEditModal(m)}
                          title="Edit material"
                          style={{
                            padding: '0.375rem',
                            color: '#64748B',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#FFF7ED';
                            e.currentTarget.style.color = '#EA580C';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#64748B';
                          }}
                        >
                          <Edit2 size={16} />
                        </button>

                        {/* 3-Dot Menu Button */}
                        <div style={{ position: 'relative' }}>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === m.id ? null : m.id);
                            }}
                            title="More actions"
                            style={{
                              padding: '0.375rem',
                              color: activeMenuId === m.id ? '#0F172A' : '#64748B',
                              backgroundColor: activeMenuId === m.id ? '#F1F5F9' : 'transparent',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (activeMenuId !== m.id) {
                                e.currentTarget.style.backgroundColor = '#F1F5F9';
                                e.currentTarget.style.color = '#0F172A';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (activeMenuId !== m.id) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#64748B';
                              }
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Dropdown Menu */}
                          {activeMenuId === m.id && (
                            <div 
                              ref={menuRef}
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                marginTop: '0.25rem',
                                width: '11rem',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '0.5rem',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
                                padding: '0.25rem 0',
                                zIndex: 50,
                                textAlign: 'left'
                              }}
                            >
                              <button 
                                type="button"
                                onClick={() => handleDuplicate(m)}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.875rem',
                                  fontSize: '0.8125rem',
                                  color: '#334155',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Copy size={14} />
                                <span>Duplicate</span>
                              </button>

                              <button 
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  navigate(`/raw-material-prices/history?material=${m.id}`);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.875rem',
                                  fontSize: '0.8125rem',
                                  color: '#334155',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <History size={14} />
                                <span>Price History</span>
                              </button>

                              <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '0.25rem 0' }} />

                              <button 
                                type="button"
                                onClick={() => handleToggleStatus(m)}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem 0.875rem',
                                  fontSize: '0.8125rem',
                                  color: m.active ? '#DC2626' : '#059669',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = m.active ? '#FEF2F2' : '#ECFDF5';
                                }}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                {m.active ? <PowerOff size={14} /> : <Power size={14} />}
                                <span>{m.active ? 'Deactivate' : 'Activate'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {totalRecords > 0 && (
        <div style={{
          padding: '0.875rem 1.5rem',
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}>
          {/* Record count info */}
          <div style={{ fontSize: '0.875rem', color: '#475569' }}>
            Showing{' '}
            <span style={{ fontWeight: 600, color: '#0F172A' }}>
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{' '}
            to{' '}
            <span style={{ fontWeight: 600, color: '#0F172A' }}>
              {Math.min(currentPage * itemsPerPage, totalRecords)}
            </span>{' '}
            of{' '}
            <span style={{ fontWeight: 600, color: '#0F172A' }}>
              {totalRecords}
            </span>{' '}
            materials
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Rows per page selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Rows:</span>
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  height: '2rem',
                  padding: '0 0.5rem',
                  fontSize: '0.8125rem',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '0.375rem',
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Numbered page buttons with Previous / Next */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button 
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Previous page"
                style={{
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.375rem',
                  border: '1px solid #E2E8F0',
                  backgroundColor: currentPage === 1 ? '#F1F5F9' : '#FFFFFF',
                  color: currentPage === 1 ? '#CBD5E1' : '#475569',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <ChevronLeft size={16} />
              </button>

              {pageNumbers.map(num => (
                <button 
                  key={num}
                  type="button"
                  onClick={() => setCurrentPage(num)}
                  style={{
                    minWidth: '2rem',
                    height: '2rem',
                    padding: '0 0.375rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '0.375rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: currentPage === num ? 'none' : '1px solid #E2E8F0',
                    backgroundColor: currentPage === num ? '#EA580C' : '#FFFFFF',
                    color: currentPage === num ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    boxShadow: currentPage === num ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {num}
                </button>
              ))}

              <button 
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                title="Next page"
                style={{
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.375rem',
                  border: '1px solid #E2E8F0',
                  backgroundColor: (currentPage === totalPages || totalPages === 0) ? '#F1F5F9' : '#FFFFFF',
                  color: (currentPage === totalPages || totalPages === 0) ? '#CBD5E1' : '#475569',
                  cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Page Add / Edit Material Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E2E8F0',
            width: '100%',
            maxWidth: '42rem',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>
                  {editingMaterial ? 'Edit Raw Material' : 'Add Raw Material'}
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#64748B' }}>
                  {editingMaterial 
                    ? `Update properties and configuration for "${editingMaterial.name_en}".` 
                    : 'Create a new raw material master record.'}
                </p>
              </div>

              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '0.375rem',
                  color: '#64748B',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveMaterial} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div style={{
                padding: '1.5rem',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}>
                {formError && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#B91C1C',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1rem' }}>
                  {/* Code */}
                  <div style={{ gridColumn: 'span 4' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                      Material Code <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. KHAL"
                      value={formData.code}
                      onChange={(e) => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                      required
                      style={{
                        width: '100%',
                        height: '2.25rem',
                        padding: '0 0.75rem',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '0.5rem',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Name EN */}
                  <div style={{ gridColumn: 'span 8' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                      English Name <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Mustard Oil Cake"
                      value={formData.name_en}
                      onChange={(e) => setFormData(p => ({ ...p, name_en: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        height: '2.25rem',
                        padding: '0 0.75rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '0.5rem',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Name HI */}
                  <div style={{ gridColumn: 'span 6' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                      Hindi Name
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. सरसों खल"
                      value={formData.name_hi}
                      onChange={(e) => setFormData(p => ({ ...p, name_hi: e.target.value }))}
                      style={{
                        width: '100%',
                        height: '2.25rem',
                        padding: '0 0.75rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '0.5rem',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Category */}
                  <div style={{ gridColumn: 'span 6' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                      Category <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        height: '2.25rem',
                        padding: '0 0.75rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '0.5rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Select Category</option>
                      {allCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Default Unit */}
                  <div style={{ gridColumn: 'span 6' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                      Default Unit <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <select 
                      value={formData.default_unit_id}
                      onChange={(e) => setFormData(p => ({ ...p, default_unit_id: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        height: '2.25rem',
                        padding: '0 0.75rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '0.5rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Select Unit</option>
                      {units.map(u => (
                        <option key={u.id} value={u.id}>{u.unit_name} ({u.unit_code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Default Price Type */}
                  <div style={{ gridColumn: 'span 6' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                      Default Price Type
                    </label>
                    <select 
                      value={formData.default_price_type_id}
                      onChange={(e) => setFormData(p => ({ ...p, default_price_type_id: e.target.value }))}
                      style={{
                        width: '100%',
                        height: '2.25rem',
                        padding: '0 0.75rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '0.5rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">None (Optional)</option>
                      {localPriceTypes.map(pt => (
                        <option key={pt.id} value={pt.id}>{pt.type_name} ({pt.type_code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Display Order */}
                  <div style={{ gridColumn: 'span 4' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                      Display Order
                    </label>
                    <input 
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData(p => ({ ...p, display_order: e.target.value }))}
                      style={{
                        width: '100%',
                        height: '2.25rem',
                        padding: '0 0.75rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '0.5rem',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Daily Tracking Required & Active toggles */}
                  <div style={{
                    gridColumn: 'span 8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    paddingTop: '1.5rem'
                  }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>
                      <input 
                        type="checkbox"
                        checked={formData.daily_tracking_required}
                        onChange={(e) => setFormData(p => ({ ...p, daily_tracking_required: e.target.checked }))}
                        style={{ width: '1rem', height: '1rem', accentColor: '#EA580C', cursor: 'pointer' }}
                      />
                      <span>Daily Tracking Required</span>
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>
                      <input 
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData(p => ({ ...p, active: e.target.checked }))}
                        style={{ width: '1rem', height: '1rem', accentColor: '#EA580C', cursor: 'pointer' }}
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  {/* Notes */}
                  <div style={{ gridColumn: 'span 12' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                      Notes / Specification
                    </label>
                    <textarea 
                      rows={3}
                      placeholder="Enter any material specifications, notes or sourcing guidance..."
                      value={formData.notes}
                      onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '0.5rem',
                        boxSizing: 'border-box',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#475569',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                >
                  Cancel
                </button>

                <button 
                  type="submit"
                  disabled={isSaving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    backgroundColor: '#EA580C',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving) e.currentTarget.style.backgroundColor = '#C2410C';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSaving) e.currentTarget.style.backgroundColor = '#EA580C';
                  }}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{isSaving ? 'Saving...' : (editingMaterial ? 'Update Material' : 'Save Material')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deactivation */}
      {isConfirmOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 70,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E2E8F0',
            width: '100%',
            maxWidth: '24rem',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '9999px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              border: '1px solid #FEE2E2'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>
              Deactivate Material?
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748B', lineHeight: 1.5 }}>
              Are you sure you want to deactivate{' '}
              <strong style={{ color: '#0F172A' }}>"{materialToDeactivate?.name_en}"</strong>?<br/>
              It will no longer appear in daily price entry.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => {
                  setIsConfirmOpen(false);
                  setMaterialToDeactivate(null);
                }}
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#475569',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button 
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => performStatusUpdate(materialToDeactivate.id, false)}
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: '#DC2626',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: isUpdatingStatus ? 'not-allowed' : 'pointer'
                }}
              >
                {isUpdatingStatus ? 'Updating...' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
