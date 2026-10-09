const { createClient } = require('@supabase/supabase-js');
const { differenceInMinutes } = require('date-fns');

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const { data: users } = await supabase.from('app_users').select('id, display_name');
  
  for (const user of users) {
    console.log(`\nTesting user: ${user.display_name} (${user.id})`);
    
    const startStr = '2026-09-01T00:00:00Z';
    const endStr = '2026-10-31T23:59:59Z';

    const { data: events, error } = await supabase
      .from('vw_field_timeline')
      .select('*')
      .eq('staff_id', user.id)
      .gte('event_time', startStr)
      .lte('event_time', endStr)
      .order('event_time', { ascending: true });

    if (error) {
      console.log('Error fetching events:', error);
      continue;
    }
    
    if (!events || events.length === 0) {
      console.log('No events');
      continue;
    }

    const sessionIds = (events || []).filter(e => e.event_type === 'SESSION_START' || e.event_type === 'SESSION_END').map(e => e.id);
    
    if (sessionIds.length > 0) {
       // test if this throws when sessionIds has a null!
       if (sessionIds.includes(null)) {
         console.log('Warning: sessionIds contains null!');
       }
    }

    const groupedSessions = [];
    let currentSession = null;
    const unlinked = [];

    events.forEach(evt => {
      try {
        if (evt.event_type === 'SESSION_START') {
          if (currentSession) groupedSessions.push(currentSession);
          currentSession = { id: evt.id, startEvent: evt, endEvent: null, events: [], totalKm: 0, lastVisitEndTime: null };
        } else if (evt.event_type === 'SESSION_END') {
          if (currentSession) {
            currentSession.endEvent = evt;
            groupedSessions.push(currentSession);
            currentSession = null;
          } else {
            unlinked.push(evt);
          }
        } else {
          if (currentSession) {
            if (evt.event_type === 'VISIT') {
              const visitEndStr = evt.ended_at || evt.started_at;
              const visitEndTime = new Date(visitEndStr).getTime();
              // In JS, new Date(undefined).getTime() -> NaN
              evt.cumulativeKm = (0).toFixed(2);
              evt.legKm = (0).toFixed(2);
              evt.calcStatus = 'Calculated';
              currentSession.lastVisitEndTime = visitEndTime;
            }
            if (evt.event_type !== 'TRAVEL_SEGMENT') {
              currentSession.events.push(evt);
            }
          } else {
            unlinked.push(evt);
          }
        }
      } catch (err) {
        console.error('CRASH in group logic:', err);
      }
    });
    if (currentSession) groupedSessions.push(currentSession);
    
    // Simulate render logic
    for (const session of groupedSessions) {
      try {
        const t = differenceInMinutes(new Date(session.endEvent?.event_time), new Date(session.startEvent?.event_time));
      } catch (err) {
        console.error('CRASH in differenceInMinutes:', err);
      }
      
      for (const evt of session.events) {
        try {
           if (evt.event_type === 'VISIT') {
             const desc = evt.description.replace('Customer Visit: ', '');
           }
        } catch(e) {
           console.error('CRASH in renderEvent description:', e);
        }
      }
    }
  }
}
run();
