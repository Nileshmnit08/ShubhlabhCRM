import { supabase } from './supabase';

/**
 * Logs an activity to the activity_logs table.
 * 
 * @param {Object} params
 * @param {string} params.module - 'Customers', 'FollowUps', 'DataSync', 'Auth'
 * @param {string} params.actionType - 'CREATED', 'UPDATED', 'COMPLETED', 'LOGIN'
 * @param {string} [params.entityType] - e.g. 'crm_parties'
 * @param {string} [params.entityId] - UUID of the entity
 * @param {string} params.summary - Human readable summary
 * @param {Object} [params.metadata] - JSON payload (before/after changes)
 */
export const logActivity = async ({
  module,
  actionType,
  entityType = null,
  entityId = null,
  summary,
  metadata = null
}) => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const actorId = sessionData?.session?.user?.id || null;

    const { error } = await supabase.from('activity_logs').insert({
      actor_id: actorId,
      module,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      summary,
      metadata
    });

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Exception in logActivity:', err);
  }
};
