import React, { useEffect, useState, useContext, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2 } from 'lucide-react';

export default function NotificationBell() {
  const { userProfile } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (userProfile) {
      fetchNotifications();
    }
  }, [userProfile]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const { data, error } = await supabase
        .from('crm_notifications')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }

  async function handleNotificationClick(notif) {
    try {
      // Mark as read
      await supabase
        .from('crm_notifications')
        .update({ is_read: true })
        .eq('id', notif.id);

      setNotifications(prev => prev.filter(n => n.id !== notif.id));
      setIsOpen(false);
      
      // Navigate to action
      if (notif.link_url) {
        navigate(notif.link_url);
      }
    } catch (err) {
      console.error('Error handling notification click:', err);
    }
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        className="btn btn-ghost" 
        style={{ position: 'relative', padding: '0.5rem' }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={20} color="var(--text-secondary)" />
        {notifications.length > 0 && (
          <span style={{
            position: 'absolute', top: '0.2rem', right: '0.2rem',
            background: 'var(--danger)', color: 'white',
            borderRadius: '50%', width: '18px', height: '18px',
            fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
          width: '320px', background: 'var(--bg-card)', 
          borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          border: '1px solid var(--border)', zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Notifications</h4>
            {notifications.length > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{notifications.length} Unread</span>
            )}
          </div>
          
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>You're all caught up!</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{ 
                    padding: '1rem', borderBottom: '1px solid var(--border)', 
                    cursor: 'pointer', transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-main)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {notif.title}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {notif.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
