import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  Globe, LayoutDashboard, FileText, Package, Tag, BookOpen, 
  Compass, Settings, Image as ImageIcon, History, ExternalLink, 
  Save, Plus, Trash2, Edit3, CheckCircle, AlertTriangle, RefreshCw, Eye,
  Search, Filter, ArrowUp, ArrowDown, X, Copy, Check, UploadCloud, ShieldCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import './websiteCMS.css';

// Default initial baseline data (used when database table is empty or offline)
const DEFAULT_SETTINGS = [
  { setting_key: 'brand_name', setting_value: 'SHUBH LABH', setting_group: 'general', description: 'Official brand name' },
  { setting_key: 'brand_tagline', setting_value: 'DAIRY NUTRITION', setting_group: 'general', description: 'Brand tagline' },
  { setting_key: 'announcement_text', setting_value: 'Nutrition made with farmers in mind ✳ Serving dairy ambitions across Rajasthan', setting_group: 'general', description: 'Announcement banner text' },
  { setting_key: 'announcement_active', setting_value: '1', setting_group: 'general', description: 'Announcement active (1/0)' },
  { setting_key: 'crm_login_url', setting_value: 'https://shubhlabh-crm.vercel.app/', setting_group: 'integration', is_system_locked: true, description: 'CRM destination URL (Immutable)' },
  { setting_key: 'phone_number', setting_value: '+91 98765 43210', setting_group: 'contact', description: 'Official phone helpline' },
  { setting_key: 'whatsapp_number', setting_value: '+91 98765 43210', setting_group: 'contact', description: 'WhatsApp Business number' },
  { setting_key: 'public_email', setting_value: 'contact@shubhlabhfeeds.in', setting_group: 'contact', description: 'Public contact email' },
  { setting_key: 'postal_address', setting_value: 'Shubh Labh Feeds Pvt. Ltd., Industrial Area, Jaipur, Rajasthan', setting_group: 'contact', description: 'Office / factory address' },
  { setting_key: 'meta_title', setting_value: 'Shubh Labh | Better Nutrition. Stronger Dairy.', setting_group: 'seo', description: 'Default page meta title' },
  { setting_key: 'meta_description', setting_value: 'Shubh Labh cattle feed and dairy nutrition solutions built for cattle well-being and dairy farmer progress across Rajasthan.', setting_group: 'seo', description: 'Meta description' },
  { setting_key: 'footer_text', setting_value: 'Shubh Labh is committed to farmer-first dairy nutrition, balanced cattle feed formulation, and consistent quality across Rajasthan.', setting_group: 'general', description: 'Footer narrative' },
];

const DEFAULT_SECTIONS = [
  {
    section_key: 'hero',
    title: 'Better nutrition. Stronger dairy.',
    subtitle: 'Thoughtful cattle nutrition for the people who keep India\'s dairy story moving forward.',
    eyebrow: 'A partner in dairy progress',
    primary_cta_text: 'Explore our products ↗',
    primary_cta_url: '#products',
    secondary_cta_text: 'Discover Shubh Labh →',
    secondary_cta_url: '#about',
    is_published: true,
  },
  {
    section_key: 'trust_strip',
    title: 'Core Guiding Pillars',
    lead_text: 'Farmer-first thinking, Nutrition-led approach, Quality-minded processes, Growing together',
    is_published: true,
  },
  {
    section_key: 'about',
    title: 'For every farmer\'s effort, there is a bigger dream.',
    subtitle: 'Rooted in trust. Focused on progress.',
    eyebrow: 'Welcome to Shubh Labh',
    body_text: 'Shubh Labh brings together cattle-feed products designed to support animal wellness, milk productivity, and herd longevity. Rooted in farmer trust and focused on sustainable dairy progress.',
    is_published: true,
  },
  {
    section_key: 'dealer',
    title: 'Let\'s take dairy nutrition further.',
    subtitle: 'Partnering with progressive rural entrepreneurs across Rajasthan.',
    eyebrow: 'Become a Dealer',
    body_text: 'We partner with passionate distributors and rural dealers who believe in farmer-first values, transparent quality, and steady business growth.',
    primary_cta_text: 'Enquire about dealership ↗',
    primary_cta_url: '#contact',
    is_published: true,
  }
];

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Cattle Feed', slug: 'cattle-feed', category_badge: 'CATTLE FEED', display_order: 1 },
  { id: 2, name: 'Nutrition Support', slug: 'nutrition-support', category_badge: 'NUTRITION SUPPORT', display_order: 2 }
];

const DEFAULT_PRODUCTS = [
  { id: 1, category_id: 1, name: 'Shubh Labh Dairy Special', slug: 'dairy-special', short_description: 'Balanced dairy ration crafted to support milk yield, digestion, and daily body condition in milking cows and buffaloes.', packaging_desc: 'Available in 50 kg moisture-resistant woven bags', display_order: 1, status: 'published' },
  { id: 2, category_id: 2, name: 'Performance Premix', slug: 'performance-premix', short_description: 'Nutritional formulation built for balanced energy, mineral support, and consistent dairy performance.', packaging_desc: 'Available in 25 kg & 50 kg packs', display_order: 2, status: 'published' },
  { id: 3, category_id: 2, name: 'Specialised Nutrition', slug: 'specialised-nutrition', short_description: 'Targeted feeding solutions for transition phases, dry cows, and growing calves.', packaging_desc: 'Available in 25 kg bags', display_order: 3, status: 'published' }
];

const DEFAULT_ARTICLES = [
  { id: 1, title: 'Essential Feeding Practices for Peak Milk Production', slug: 'feeding-practices-peak-production', category: 'Dairy Nutrition', summary: 'Practical guidance on dry matter intake, green fodder proportion, and clean drinking water for lactating animals.', content_body: '<p>A balanced ration provides energy, protein, fiber, minerals, and vitamins in correct proportion.</p>', status: 'published', display_order: 1 },
  { id: 2, title: 'Seasonal Dairy Care & Transition Management', slug: 'seasonal-dairy-care', category: 'Dairy Care', summary: 'Supporting cow health and metabolic balance through weather shifts and calving cycles.', content_body: '<p>Managing heat stress during peak summers and providing shelter during chilly winter nights preserves lactation persistence.</p>', status: 'published', display_order: 2 }
];

const DEFAULT_NAV = [
  { id: 1, location: 'header', label: 'Home', url: '#home', target: '_self', display_order: 1, is_active: true },
  { id: 2, location: 'header', label: 'Products', url: '#products', target: '_self', display_order: 2, is_active: true },
  { id: 3, location: 'header', label: 'About us', url: '#about', target: '_self', display_order: 3, is_active: true },
  { id: 4, location: 'header', label: 'Knowledge', url: '#knowledge', target: '_self', display_order: 4, is_active: true },
  { id: 5, location: 'header', label: 'Become a dealer', url: '#dealer', target: '_self', display_order: 5, is_active: true },
  { id: 6, location: 'header', label: 'Contact', url: '#contact', target: '_self', display_order: 6, is_active: true }
];

export default function WebsiteCMS() {
  const { userProfile } = useContext(AuthContext) || {};
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [dbStatus, setDbStatus] = useState('checking'); // 'connected' | 'fallback'

  // Content state
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [articles, setArticles] = useState(DEFAULT_ARTICLES);
  const [navigation, setNavigation] = useState(DEFAULT_NAV);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Search & Filters
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [articleSearch, setArticleSearch] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('all');

  // Modals & Confirmation Dialogs
  const [modalType, setModalType] = useState(null); // 'product' | 'category' | 'article' | 'nav' | 'media'
  const [formData, setFormData] = useState({});
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm }
  const [copiedId, setCopiedId] = useState(null);

  const showNotification = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Helper: Log audit action to Supabase
  const logAuditAction = async (action, entity_type, entity_id, details) => {
    try {
      await supabase.from('website_audit_logs').insert([{
        user_id: userProfile?.id || null,
        action,
        entity_type,
        entity_id: String(entity_id || ''),
        details: details || {},
        ip_address: 'crm-admin-browser'
      }]);
    } catch (e) {
      console.warn('Audit log write error:', e);
    }
  };

  // Load all live CMS data from Supabase
  const loadCmsData = async () => {
    setLoading(true);
    try {
      // 1. Settings
      const { data: sData, error: sErr } = await supabase.from('website_site_settings').select('*').order('id');
      if (!sErr && sData && sData.length > 0) {
        setSettings(sData);
        setDbStatus('connected');
      }

      // 2. Sections
      const { data: secData, error: secErr } = await supabase.from('website_site_sections').select('*').order('id');
      if (!secErr && secData && secData.length > 0) {
        setSections(secData);
      }

      // 3. Categories
      const { data: catData, error: catErr } = await supabase.from('website_product_categories').select('*').order('display_order');
      if (!catErr && catData && catData.length > 0) {
        setCategories(catData);
      }

      // 4. Products
      const { data: pData, error: pErr } = await supabase.from('website_products').select('*').order('display_order');
      if (!pErr && pData && pData.length > 0) {
        setProducts(pData);
      }

      // 5. Articles
      const { data: aData, error: aErr } = await supabase.from('website_knowledge_articles').select('*').order('display_order');
      if (!aErr && aData && aData.length > 0) {
        setArticles(aData);
      }

      // 6. Navigation
      const { data: nData, error: nErr } = await supabase.from('website_navigation_items').select('*').order('display_order');
      if (!nErr && nData && nData.length > 0) {
        setNavigation(nData);
      }

      // 7. Media Assets
      const { data: mData, error: mErr } = await supabase.from('website_media_assets').select('*').order('created_at', { ascending: false });
      if (!mErr && mData) {
        setMediaAssets(mData);
      }

      // 8. Audit Logs
      const { data: logData, error: logErr } = await supabase.from('website_audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (!logErr && logData) {
        setAuditLogs(logData);
      }
    } catch (err) {
      console.warn('CMS Supabase load error:', err);
      setDbStatus('fallback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCmsData();
  }, []);

  // ---------------------------------------------------------------------------
  // CRUD Handlers
  // ---------------------------------------------------------------------------

  // 1. Settings Save
  const handleSaveSetting = async (key, val) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('website_site_settings').update({
        setting_value: val,
        updated_at: new Date().toISOString()
      }).eq('setting_key', key);

      if (error) throw error;
      await logAuditAction('UPDATE', 'site_settings', key, { value: val });
      showNotification('success', `Setting "${key}" updated successfully!`);
      loadCmsData();
    } catch (err) {
      showNotification('error', `Failed to update setting: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Section Save
  const handleSaveSection = async (sec) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('website_site_sections').upsert({
        section_key: sec.section_key,
        title: sec.title,
        subtitle: sec.subtitle || null,
        eyebrow: sec.eyebrow || null,
        lead_text: sec.lead_text || null,
        body_text: sec.body_text || null,
        primary_cta_text: sec.primary_cta_text || null,
        primary_cta_url: sec.primary_cta_url || null,
        secondary_cta_text: sec.secondary_cta_text || null,
        secondary_cta_url: sec.secondary_cta_url || null,
        is_published: sec.is_published ?? true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'section_key' });

      if (error) throw error;
      await logAuditAction('UPDATE', 'site_sections', sec.section_key, { title: sec.title, published: sec.is_published });
      showNotification('success', `Homepage section "${sec.title}" saved!`);
      loadCmsData();
    } catch (err) {
      showNotification('error', `Failed to save section: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Product Save & Delete
  const handleSaveProductModal = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      showNotification('error', 'Product name and URL slug are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        category_id: Number(formData.category_id) || 1,
        short_description: formData.short_description || '',
        full_description: formData.full_description || null,
        packaging_desc: formData.packaging_desc || null,
        display_order: Number(formData.display_order) || 1,
        status: formData.status || 'published',
        updated_at: new Date().toISOString()
      };

      let error;
      if (formData.id) {
        const res = await supabase.from('website_products').update(payload).eq('id', formData.id);
        error = res.error;
      } else {
        const res = await supabase.from('website_products').insert([payload]);
        error = res.error;
      }

      if (error) throw error;
      await logAuditAction(formData.id ? 'UPDATE' : 'CREATE', 'products', payload.name, payload);
      showNotification('success', `Product "${payload.name}" saved!`);
      setModalType(null);
      loadCmsData();
    } catch (err) {
      showNotification('error', `Failed to save product: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = (prod) => {
    setConfirmDialog({
      title: 'Delete Product',
      message: `Are you sure you want to permanently delete "${prod.name}"? This will remove it from the public catalog.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const { error } = await supabase.from('website_products').delete().eq('id', prod.id);
          if (error) throw error;
          await logAuditAction('DELETE', 'products', prod.id, { name: prod.name });
          showNotification('success', `Product "${prod.name}" deleted.`);
          loadCmsData();
        } catch (err) {
          showNotification('error', `Failed to delete product: ${err.message}`);
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  const handleProductQuickStatus = async (prod, newStatus) => {
    try {
      const { error } = await supabase.from('website_products').update({ status: newStatus }).eq('id', prod.id);
      if (error) throw error;
      await logAuditAction('UPDATE_STATUS', 'products', prod.id, { old: prod.status, new: newStatus });
      showNotification('success', `Updated "${prod.name}" status to ${newStatus}.`);
      loadCmsData();
    } catch (err) {
      showNotification('error', `Failed to update status: ${err.message}`);
    }
  };

  const handleReorderProduct = async (prod, direction) => {
    const curIdx = products.findIndex(p => p.id === prod.id);
    if (direction === 'up' && curIdx === 0) return;
    if (direction === 'down' && curIdx === products.length - 1) return;
    const targetIdx = direction === 'up' ? curIdx - 1 : curIdx + 1;
    const targetProd = products[targetIdx];

    try {
      await supabase.from('website_products').update({ display_order: targetProd.display_order }).eq('id', prod.id);
      await supabase.from('website_products').update({ display_order: prod.display_order }).eq('id', targetProd.id);
      loadCmsData();
    } catch (e) {
      showNotification('error', 'Reorder failed: ' + e.message);
    }
  };

  // 4. Category Save & Delete
  const handleSaveCategoryModal = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      showNotification('error', 'Category name and slug are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        category_badge: formData.category_badge || formData.name.toUpperCase(),
        display_order: Number(formData.display_order) || categories.length + 1
      };

      let error;
      if (formData.id) {
        const res = await supabase.from('website_product_categories').update(payload).eq('id', formData.id);
        error = res.error;
      } else {
        const res = await supabase.from('website_product_categories').insert([payload]);
        error = res.error;
      }

      if (error) throw error;
      await logAuditAction(formData.id ? 'UPDATE' : 'CREATE', 'product_categories', payload.name, payload);
      showNotification('success', `Category "${payload.name}" saved!`);
      setModalType(null);
      loadCmsData();
    } catch (err) {
      showNotification('error', `Failed to save category: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = (cat) => {
    // Check if category has linked products
    const linked = products.filter(p => p.category_id === cat.id);
    if (linked.length > 0) {
      showNotification('error', `Cannot delete "${cat.name}": ${linked.length} products are assigned to this category.`);
      return;
    }

    setConfirmDialog({
      title: 'Delete Category',
      message: `Delete category "${cat.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const { error } = await supabase.from('website_product_categories').delete().eq('id', cat.id);
          if (error) throw error;
          await logAuditAction('DELETE', 'product_categories', cat.id, { name: cat.name });
          showNotification('success', `Category "${cat.name}" deleted.`);
          loadCmsData();
        } catch (err) {
          showNotification('error', `Delete category error: ${err.message}`);
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // 5. Knowledge Article Save & Delete
  const handleSaveArticleModal = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.slug) {
      showNotification('error', 'Article title and slug are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        slug: formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        category: formData.category || 'Dairy Nutrition',
        summary: formData.summary || '',
        content_body: formData.content_body || '<p></p>',
        status: formData.status || 'published',
        display_order: Number(formData.display_order) || 1,
        published_at: formData.published_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let error;
      if (formData.id) {
        const res = await supabase.from('website_knowledge_articles').update(payload).eq('id', formData.id);
        error = res.error;
      } else {
        const res = await supabase.from('website_knowledge_articles').insert([payload]);
        error = res.error;
      }

      if (error) throw error;
      await logAuditAction(formData.id ? 'UPDATE' : 'CREATE', 'knowledge_articles', payload.title, payload);
      showNotification('success', `Article "${payload.title}" saved!`);
      setModalType(null);
      loadCmsData();
    } catch (err) {
      showNotification('error', `Failed to save article: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArticle = (art) => {
    setConfirmDialog({
      title: 'Delete Article',
      message: `Delete article "${art.title}"?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const { error } = await supabase.from('website_knowledge_articles').delete().eq('id', art.id);
          if (error) throw error;
          await logAuditAction('DELETE', 'knowledge_articles', art.id, { title: art.title });
          showNotification('success', `Article "${art.title}" deleted.`);
          loadCmsData();
        } catch (err) {
          showNotification('error', `Failed to delete article: ${err.message}`);
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // 6. Navigation Link Save & Delete
  const handleSaveNavModal = async (e) => {
    e.preventDefault();
    if (!formData.label || !formData.url) {
      showNotification('error', 'Navigation label and URL target are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        label: formData.label.trim(),
        url: formData.url.trim(),
        target: formData.target || '_self',
        location: formData.location || 'header',
        display_order: Number(formData.display_order) || navigation.length + 1,
        is_active: formData.is_active ?? true
      };

      let error;
      if (formData.id) {
        const res = await supabase.from('website_navigation_items').update(payload).eq('id', formData.id);
        error = res.error;
      } else {
        const res = await supabase.from('website_navigation_items').insert([payload]);
        error = res.error;
      }

      if (error) throw error;
      await logAuditAction(formData.id ? 'UPDATE' : 'CREATE', 'navigation_items', payload.label, payload);
      showNotification('success', `Navigation link "${payload.label}" saved!`);
      setModalType(null);
      loadCmsData();
    } catch (err) {
      showNotification('error', `Failed to save navigation item: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNavActive = async (item) => {
    try {
      const { error } = await supabase.from('website_navigation_items').update({ is_active: !item.is_active }).eq('id', item.id);
      if (error) throw error;
      await logAuditAction('UPDATE_STATUS', 'navigation_items', item.id, { is_active: !item.is_active });
      loadCmsData();
    } catch (err) {
      showNotification('error', `Failed to toggle navigation item: ${err.message}`);
    }
  };

  const handleDeleteNav = (item) => {
    setConfirmDialog({
      title: 'Delete Navigation Item',
      message: `Delete navigation link "${item.label}"?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const { error } = await supabase.from('website_navigation_items').delete().eq('id', item.id);
          if (error) throw error;
          await logAuditAction('DELETE', 'navigation_items', item.id, { label: item.label });
          showNotification('success', `Navigation item deleted.`);
          loadCmsData();
        } catch (err) {
          showNotification('error', `Failed to delete navigation item: ${err.message}`);
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // 7. Media Assets Save & Delete
  const handleSaveMediaModal = async (e) => {
    e.preventDefault();
    if (!formData.file_name || !formData.file_path) {
      showNotification('error', 'File name and file path/URL are required.');
      return;
    }
    setLoading(true);
    try {
      const storedName = formData.stored_name || `media_${Date.now()}_${formData.file_name.toLowerCase().replace(/[^a-z0-9.]/g, '_')}`;
      const payload = {
        file_name: formData.file_name.trim(),
        stored_name: storedName,
        file_path: formData.file_path.trim(),
        mime_type: formData.mime_type || 'image/jpeg',
        file_size: Number(formData.file_size) || 0,
        width: Number(formData.width) || null,
        height: Number(formData.height) || null,
        alt_text: formData.alt_text || '',
        is_public: formData.is_public ?? true,
        uploaded_by: userProfile?.id || null
      };

      let error;
      if (formData.id) {
        const res = await supabase.from('website_media_assets').update(payload).eq('id', formData.id);
        error = res.error;
      } else {
        const res = await supabase.from('website_media_assets').insert([payload]);
        error = res.error;
      }

      if (error) throw error;
      await logAuditAction(formData.id ? 'UPDATE' : 'CREATE', 'media_assets', payload.file_name, payload);
      showNotification('success', `Media asset "${payload.file_name}" registered!`);
      setModalType(null);
      loadCmsData();
    } catch (err) {
      showNotification('error', `Failed to save media asset: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedia = (media) => {
    setConfirmDialog({
      title: 'Delete Media Asset',
      message: `Delete media asset "${media.file_name}"? If any products or articles reference this image, they may fail to display it.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const { error } = await supabase.from('website_media_assets').delete().eq('id', media.id);
          if (error) throw error;
          await logAuditAction('DELETE', 'media_assets', media.id, { file_name: media.file_name });
          showNotification('success', `Media asset deleted.`);
          loadCmsData();
        } catch (err) {
          showNotification('error', `Failed to delete media asset: ${err.message}`);
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
                          (p.slug || '').toLowerCase().includes(productSearch.toLowerCase());
      const matchStatus = productStatusFilter === 'all' || p.status === productStatusFilter;
      const matchCat = productCategoryFilter === 'all' || String(p.category_id) === String(productCategoryFilter);
      return matchSearch && matchStatus && matchCat;
    });
  }, [products, productSearch, productStatusFilter, productCategoryFilter]);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      return (a.title || '').toLowerCase().includes(articleSearch.toLowerCase()) ||
             (a.category || '').toLowerCase().includes(articleSearch.toLowerCase());
    });
  }, [articles, articleSearch]);

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(l => {
      return auditEntityFilter === 'all' || l.entity_type === auditEntityFilter;
    });
  }, [auditLogs, auditEntityFilter]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="website-cms-portal animate-fade-in">
      {/* CMS Header */}
      <div className="cms-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="cms-brand-badge">शुभ</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }}>
                Website CMS Manager
              </h1>
              <span className={`cms-badge ${dbStatus === 'connected' ? 'cms-badge-success' : 'cms-badge-warning'}`}>
                {dbStatus === 'connected' ? '● Supabase Live' : '● Baseline Fallback'}
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0 }}>
              Native Content Management for Shubh Labh Public Website & Cattle Nutrition Catalog
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Eye size={15} /> Preview Live Website <ExternalLink size={13} />
          </a>
          <button
            onClick={loadCmsData}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            title="Reload live content"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {feedback && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem',
          fontWeight: 500,
          backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: feedback.type === 'success' ? '#166534' : '#991b1b'
        }}>
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tab Bar */}
      <div className="cms-tab-bar">
        {[
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'sections', label: 'Homepage Sections', icon: FileText },
          { id: 'products', label: 'Products Catalog', icon: Package, count: products.length },
          { id: 'categories', label: 'Categories', icon: Tag, count: categories.length },
          { id: 'knowledge', label: 'Knowledge Hub', icon: BookOpen, count: articles.length },
          { id: 'navigation', label: 'Navigation Menu', icon: Compass, count: navigation.length },
          { id: 'media', label: 'Media Assets', icon: ImageIcon, count: mediaAssets.length },
          { id: 'settings', label: 'Site Settings & SEO', icon: Settings },
          { id: 'audit', label: 'Audit History', icon: History },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`cms-tab-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface-hover)',
                  color: isActive ? '#fff' : 'var(--text-muted)'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: OVERVIEW DASHBOARD
      ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="animate-fade-in">
          <div className="cms-stat-grid">
            <div className="cms-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Published Products</span>
                <Package size={20} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                {products.filter(p => p.status === 'published').length}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of {products.length} total products</span>
            </div>

            <div className="cms-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Product Categories</span>
                <Tag size={20} color="#0284c7" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                {categories.length}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cattle Feed & Nutrition Taxonomy</span>
            </div>

            <div className="cms-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Knowledge Articles</span>
                <BookOpen size={20} color="#16a34a" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                {articles.filter(a => a.status === 'published').length}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Farmer nutrition guides</span>
            </div>

            <div className="cms-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Media Assets</span>
                <ImageIcon size={20} color="#8b5cf6" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                {mediaAssets.length}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Catalog images & banners</span>
            </div>

            <div className="cms-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active Nav Anchors</span>
                <Compass size={20} color="#d97706" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                {navigation.filter(n => n.is_active).length}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of {navigation.length} menu items</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button onClick={() => { setFormData({ status: 'published', category_id: 1, display_order: products.length + 1 }); setModalType('product'); }} className="btn btn-primary">
                <Plus size={15} /> Add New Product
              </button>
              <button onClick={() => { setFormData({ display_order: categories.length + 1 }); setModalType('category'); }} className="btn btn-secondary">
                <Tag size={15} /> Add Category
              </button>
              <button onClick={() => { setFormData({ status: 'published', category: 'Dairy Nutrition', display_order: articles.length + 1 }); setModalType('article'); }} className="btn btn-secondary">
                <BookOpen size={15} /> Add Article
              </button>
              <button onClick={() => { setFormData({ is_public: true }); setModalType('media'); }} className="btn btn-secondary">
                <ImageIcon size={15} /> Register Media Asset
              </button>
              <button onClick={() => setActiveTab('settings')} className="btn btn-secondary">
                <Settings size={15} /> Edit Helpline & WhatsApp
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Recent Website Audit Activity</h3>
              <button onClick={() => setActiveTab('audit')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                View All History
              </button>
            </div>
            {auditLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No recent admin changes logged. Content is currently synchronized with baseline.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {auditLogs.slice(0, 5).map(log => (
                  <div key={log.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--bg-surface-hover)',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}>
                    <div>
                      <span className="cms-badge cms-badge-primary" style={{ marginRight: '0.5rem' }}>{log.action}</span>
                      <strong>{log.entity_type}</strong>: {log.entity_id}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: HOMEPAGE SECTIONS
      ========================================================================= */}
      {activeTab === 'sections' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {sections.map(sec => (
            <div key={sec.section_key} className="cms-item-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                    Section: <span style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{sec.section_key}</span>
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Key: {sec.section_key}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      const updated = sections.map(s => s.section_key === sec.section_key ? { ...s, is_published: !s.is_published } : s);
                      setSections(updated);
                      handleSaveSection({ ...sec, is_published: !sec.is_published });
                    }}
                    className={`cms-badge ${sec.is_published ? 'cms-badge-success' : 'cms-badge-warning'}`}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {sec.is_published ? '● Published' : '○ Draft (Hidden)'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Section Eyebrow</label>
                  <input
                    type="text"
                    className="form-control"
                    value={sec.eyebrow || ''}
                    onChange={(e) => {
                      const updated = sections.map(s => s.section_key === sec.section_key ? { ...s, eyebrow: e.target.value } : s);
                      setSections(updated);
                    }}
                    placeholder="e.g. A partner in dairy progress"
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Headline / Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={sec.title || ''}
                    onChange={(e) => {
                      const updated = sections.map(s => s.section_key === sec.section_key ? { ...s, title: e.target.value } : s);
                      setSections(updated);
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Subtitle / Narrative Description</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={sec.subtitle || sec.body_text || ''}
                  onChange={(e) => {
                    const updated = sections.map(s => s.section_key === sec.section_key ? { ...s, subtitle: e.target.value, body_text: e.target.value } : s);
                    setSections(updated);
                  }}
                />
              </div>

              {sec.primary_cta_text !== undefined && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Primary Button Text</label>
                    <input
                      type="text"
                      className="form-control"
                      value={sec.primary_cta_text || ''}
                      onChange={(e) => {
                        const updated = sections.map(s => s.section_key === sec.section_key ? { ...s, primary_cta_text: e.target.value } : s);
                        setSections(updated);
                      }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Primary Button Target Anchor</label>
                    <input
                      type="text"
                      className="form-control"
                      value={sec.primary_cta_url || ''}
                      onChange={(e) => {
                        const updated = sections.map(s => s.section_key === sec.section_key ? { ...s, primary_cta_url: e.target.value } : s);
                        setSections(updated);
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleSaveSection(sec)}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  <Save size={15} /> Save Changes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          TAB 3: PRODUCTS CATALOG
      ========================================================================= */}
      {activeTab === 'products' && (
        <div className="animate-fade-in">
          {/* Controls Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '32px' }}
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>

              <select
                className="form-control"
                style={{ width: 'auto' }}
                value={productStatusFilter}
                onChange={(e) => setProductStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft (Hidden)</option>
                <option value="archived">Archived</option>
              </select>

              <select
                className="form-control"
                style={{ width: 'auto' }}
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setFormData({
                  status: 'published',
                  category_id: categories[0]?.id || 1,
                  display_order: products.length + 1
                });
                setModalType('product');
              }}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Plus size={15} /> Add Product
            </button>
          </div>

          {/* Product Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredProducts.length === 0 ? (
              <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No products match the selected filters.
              </div>
            ) : (
              filteredProducts.map((prod, idx) => {
                const categoryObj = categories.find(c => c.id === prod.category_id);
                return (
                  <div key={prod.id} className="cms-item-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{prod.name}</h4>
                          <span className="cms-badge cms-badge-primary">
                            {categoryObj?.name || 'General'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>slug: /{prod.slug} • Order: {prod.display_order}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* Reorder Buttons */}
                        <button
                          onClick={() => handleReorderProduct(prod, 'up')}
                          disabled={idx === 0}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.5rem' }}
                          title="Move up in order"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          onClick={() => handleReorderProduct(prod, 'down')}
                          disabled={idx === filteredProducts.length - 1}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.5rem' }}
                          title="Move down in order"
                        >
                          <ArrowDown size={13} />
                        </button>

                        {/* Status Dropdown */}
                        <select
                          className="form-control"
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', width: 'auto' }}
                          value={prod.status}
                          onChange={(e) => handleProductQuickStatus(prod, e.target.value)}
                        >
                          <option value="published">Published</option>
                          <option value="draft">Draft (Hidden)</option>
                          <option value="archived">Archived</option>
                        </select>

                        {/* Edit Button */}
                        <button
                          onClick={() => {
                            setFormData({ ...prod });
                            setModalType('product');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          title="Edit Product"
                        >
                          <Edit3 size={13} /> Edit
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteProduct(prod)}
                          className="btn btn-danger"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          title="Delete Product"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {prod.short_description}
                    </p>
                    {prod.packaging_desc && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        📦 Packaging: {prod.packaging_desc}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: PRODUCT CATEGORIES
      ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Catalog Categories ({categories.length})</h3>
            <button
              onClick={() => {
                setFormData({ display_order: categories.length + 1 });
                setModalType('category');
              }}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Plus size={15} /> Add Category
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {categories.map(cat => {
              const count = products.filter(p => p.category_id === cat.id).length;
              return (
                <div key={cat.id} className="cms-item-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <strong style={{ fontSize: '1rem' }}>{cat.name}</strong>
                      <span className="cms-badge cms-badge-primary">{cat.category_badge}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>slug: /{cat.slug}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Assigned Products: {count} • Display Order: {cat.display_order}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setFormData({ ...cat });
                        setModalType('category');
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="btn btn-danger"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: KNOWLEDGE HUB (ARTICLES)
      ========================================================================= */}
      {activeTab === 'knowledge' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '32px' }}
                placeholder="Search articles..."
                value={articleSearch}
                onChange={(e) => setArticleSearch(e.target.value)}
              />
            </div>

            <button
              onClick={() => {
                setFormData({
                  status: 'published',
                  category: 'Dairy Nutrition',
                  display_order: articles.length + 1
                });
                setModalType('article');
              }}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Plus size={15} /> Add Article
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredArticles.map(art => (
              <div key={art.id} className="cms-item-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{art.title}</h4>
                      <span className={`cms-badge ${art.status === 'published' ? 'cms-badge-success' : 'cms-badge-warning'}`}>
                        {art.status}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Category: {art.category} • Slug: /{art.slug}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setFormData({ ...art });
                        setModalType('article');
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteArticle(art)}
                      className="btn btn-danger"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{art.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: NAVIGATION MENU
      ========================================================================= */}
      {activeTab === 'navigation' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Website Header Links ({navigation.length})</h3>
            <button
              onClick={() => {
                setFormData({
                  location: 'header',
                  target: '_self',
                  is_active: true,
                  display_order: navigation.length + 1
                });
                setModalType('nav');
              }}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Plus size={15} /> Add Link
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {navigation.map(item => (
              <div key={item.id} className="cms-item-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong>{item.label}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({item.url})</span>
                    <span className={`cms-badge ${item.is_active ? 'cms-badge-success' : 'cms-badge-warning'}`}>
                      {item.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Target: {item.target} • Location: {item.location} • Order: {item.display_order}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleToggleNavActive(item)}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                  >
                    {item.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => {
                      setFormData({ ...item });
                      setModalType('nav');
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteNav(item)}
                    className="btn btn-danger"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: MEDIA ASSETS
      ========================================================================= */}
      {activeTab === 'media' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Media Library ({mediaAssets.length})</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Manage photos, packaging images, and banners for public display
              </p>
            </div>
            <button
              onClick={() => {
                setFormData({ is_public: true, mime_type: 'image/jpeg' });
                setModalType('media');
              }}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <UploadCloud size={15} /> Add Media Asset
            </button>
          </div>

          {mediaAssets.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <ImageIcon size={36} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
              <p>No media assets registered yet. Click "Add Media Asset" to link image URLs or paths.</p>
            </div>
          ) : (
            <div className="cms-media-grid">
              {mediaAssets.map(asset => (
                <div key={asset.id} className="cms-media-card">
                  <div className="cms-media-preview">
                    {asset.file_path && (asset.file_path.startsWith('http') || asset.file_path.startsWith('/')) ? (
                      <img src={asset.file_path} alt={asset.alt_text || asset.file_name} onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <ImageIcon size={32} color="var(--text-muted)" />
                    )}
                    <span className={`cms-badge ${asset.is_public ? 'cms-badge-success' : 'cms-badge-warning'}`} style={{ position: 'absolute', top: '8px', right: '8px' }}>
                      {asset.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <div className="cms-media-body">
                    <div>
                      <strong style={{ fontSize: '0.9rem', display: 'block', wordBreak: 'break-all' }}>{asset.file_name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asset.mime_type}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                      <button
                        onClick={() => copyToClipboard(asset.file_path, asset.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        {copiedId === asset.id ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                        {copiedId === asset.id ? 'Copied' : 'Copy URL'}
                      </button>
                      <button
                        onClick={() => handleDeleteMedia(asset)}
                        className="btn btn-danger"
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 8: SITE SETTINGS & SEO
      ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="animate-fade-in glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>Site Settings & SEO</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {settings.map(setting => (
              <div key={setting.setting_key} style={{
                padding: '1rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                backgroundColor: setting.is_system_locked ? 'var(--bg-surface-hover)' : 'var(--bg-surface)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{setting.description || setting.setting_key}</strong>
                  {setting.is_system_locked && (
                    <span className="cms-badge cms-badge-warning">Locked System URL</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    disabled={setting.is_system_locked}
                    className="form-control"
                    value={setting.setting_value || ''}
                    onChange={(e) => {
                      const updated = settings.map(s => s.setting_key === setting.setting_key ? { ...s, setting_value: e.target.value } : s);
                      setSettings(updated);
                    }}
                  />
                  {!setting.is_system_locked && (
                    <button
                      onClick={() => handleSaveSetting(setting.setting_key, setting.setting_value)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.85rem' }}
                    >
                      <Save size={14} /> Save
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 9: AUDIT HISTORY
      ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="animate-fade-in glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Immutable Audit Log</h3>
            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={auditEntityFilter}
              onChange={(e) => setAuditEntityFilter(e.target.value)}
            >
              <option value="all">All Entities</option>
              <option value="products">Products</option>
              <option value="product_categories">Categories</option>
              <option value="site_sections">Sections</option>
              <option value="site_settings">Settings</option>
              <option value="knowledge_articles">Knowledge</option>
              <option value="navigation_items">Navigation</option>
              <option value="media_assets">Media</option>
            </select>
          </div>

          {filteredLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No audit history records found for the filter.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.6rem' }}>Timestamp</th>
                    <th style={{ padding: '0.6rem' }}>Action</th>
                    <th style={{ padding: '0.6rem' }}>Entity</th>
                    <th style={{ padding: '0.6rem' }}>Target</th>
                    <th style={{ padding: '0.6rem' }}>Metadata Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.6rem' }}>
                        <span className="cms-badge cms-badge-primary">{log.action}</span>
                      </td>
                      <td style={{ padding: '0.6rem' }}><strong>{log.entity_type}</strong></td>
                      <td style={{ padding: '0.6rem' }}>{log.entity_id}</td>
                      <td style={{ padding: '0.6rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODALS
      ========================================================================= */}

      {/* Product Modal */}
      {modalType === 'product' && (
        <div className="cms-modal-overlay">
          <div className="cms-modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {formData.id ? 'Edit Product' : 'Add New Feed Product'}
              </h3>
              <button onClick={() => setModalType(null)} className="btn-icon" style={{ background: 'transparent', border: 'none' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveProductModal}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Shubh Labh Dairy Special"
                  />
                </div>
                <div>
                  <label className="form-label">URL Slug *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={formData.slug || ''}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. dairy-special"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={formData.category_id || 1}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Publication Status</label>
                  <select
                    className="form-control"
                    value={formData.status || 'published'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.display_order || 1}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Packaging Specifications</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.packaging_desc || ''}
                  onChange={(e) => setFormData({ ...formData, packaging_desc: e.target.value })}
                  placeholder="e.g. Available in 50 kg moisture-resistant woven bags"
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Short Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={formData.short_description || ''}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  placeholder="Summary for product catalog cards"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {modalType === 'category' && (
        <div className="cms-modal-overlay">
          <div className="cms-modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {formData.id ? 'Edit Category' : 'Add Category'}
              </h3>
              <button onClick={() => setModalType(null)} className="btn-icon" style={{ background: 'transparent', border: 'none' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCategoryModal}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cattle Feed"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">URL Slug *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={formData.slug || ''}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. cattle-feed"
                  />
                </div>
                <div>
                  <label className="form-label">Category Badge Text</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.category_badge || ''}
                    onChange={(e) => setFormData({ ...formData, category_badge: e.target.value })}
                    placeholder="e.g. CATTLE FEED"
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Display Order</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.display_order || 1}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Article Modal */}
      {modalType === 'article' && (
        <div className="cms-modal-overlay">
          <div className="cms-modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {formData.id ? 'Edit Knowledge Article' : 'Add Knowledge Article'}
              </h3>
              <button onClick={() => setModalType(null)} className="btn-icon" style={{ background: 'transparent', border: 'none' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveArticleModal}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Article Title *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">Slug *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={formData.slug || ''}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.category || 'Dairy Nutrition'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={formData.status || 'published'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft (Hidden)</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Summary</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formData.summary || ''}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Article Content Body (HTML Supported)</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={formData.content_body || ''}
                  onChange={(e) => setFormData({ ...formData, content_body: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">Save Article</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation Link Modal */}
      {modalType === 'nav' && (
        <div className="cms-modal-overlay">
          <div className="cms-modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {formData.id ? 'Edit Navigation Link' : 'Add Navigation Link'}
              </h3>
              <button onClick={() => setModalType(null)} className="btn-icon" style={{ background: 'transparent', border: 'none' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveNavModal}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">Link Label *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={formData.label || ''}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="e.g. Products"
                  />
                </div>
                <div>
                  <label className="form-label">Target URL / Anchor *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={formData.url || ''}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="e.g. #products or /about"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="form-label">Target Window</label>
                  <select
                    className="form-control"
                    value={formData.target || '_self'}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  >
                    <option value="_self">Same Tab (_self)</option>
                    <option value="_blank">New Tab (_blank)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Location</label>
                  <select
                    className="form-control"
                    value={formData.location || 'header'}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  >
                    <option value="header">Site Header</option>
                    <option value="footer">Site Footer</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.display_order || 1}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">Save Link</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Modal */}
      {modalType === 'media' && (
        <div className="cms-modal-overlay">
          <div className="cms-modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {formData.id ? 'Edit Media Asset' : 'Register New Media Asset'}
              </h3>
              <button onClick={() => setModalType(null)} className="btn-icon" style={{ background: 'transparent', border: 'none' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveMediaModal}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">File Display Name *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={formData.file_name || ''}
                  onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
                  placeholder="e.g. dairy-special-pack.png"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Image Path or Public CDN URL *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={formData.file_path || ''}
                  onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
                  placeholder="e.g. https://images.unsplash.com/... or /assets/images/bag.png"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">MIME Type</label>
                  <select
                    className="form-control"
                    value={formData.mime_type || 'image/jpeg'}
                    onChange={(e) => setFormData({ ...formData, mime_type: e.target.value })}
                  >
                    <option value="image/jpeg">image/jpeg</option>
                    <option value="image/png">image/png</option>
                    <option value="image/webp">image/webp</option>
                    <option value="image/svg+xml">image/svg+xml</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Visibility</label>
                  <select
                    className="form-control"
                    value={formData.is_public ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.value === 'true' })}
                  >
                    <option value="true">Public (Visible on Website)</option>
                    <option value="false">Private / Internal</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Alt Text (Accessibility & SEO)</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.alt_text || ''}
                  onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                  placeholder="Describe image content for screen readers"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">Save Media Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="cms-modal-overlay">
          <div className="cms-modal-content" style={{ maxWidth: '440px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', color: 'var(--danger)' }}>
              <AlertTriangle size={22} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{confirmDialog.title}</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn btn-danger"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
