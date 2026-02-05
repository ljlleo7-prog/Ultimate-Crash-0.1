
import { supabase } from '../lib/supabase';

const TABLE_NAME = 'flight_saves';

export const cloudSaveService = {
  /**
   * Save flight data to the cloud.
   * If an active save exists for the user, update it, otherwise create a new one.
   * @param {Object} flightData - The complete flight state.
   * @returns {Promise<{data, error}>}
   */
  async saveFlight(flightData) {
    if (!supabase) return { error: { message: 'Supabase not configured' } };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'User not logged in' } };

    // Check for existing active save
    const { data: existingSaves, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (fetchError) return { error: fetchError };

    if (existingSaves && existingSaves.length > 0) {
      // Update existing
      return await supabase
        .from(TABLE_NAME)
        .update({
          data: flightData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSaves[0].id);
    } else {
      // Insert new
      return await supabase
        .from(TABLE_NAME)
        .insert({
          user_id: user.id,
          data: flightData,
          status: 'active'
        });
    }
  },

  /**
   * Retrieve the latest active flight plan.
   * @returns {Promise<{data, error}>}
   */
  async getLatestFlight() {
    if (!supabase) return { error: { message: 'Supabase not configured' } };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'User not logged in' } };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        return { error };
    }

    return { data };
  },

  /**
   * Discard (soft delete) the active flight plan.
   * @param {string} saveId 
   * @returns {Promise<{data, error}>}
   */
  async discardFlight(saveId) {
    if (!supabase) return { error: { message: 'Supabase not configured' } };

    return await supabase
      .from(TABLE_NAME)
      .update({ status: 'discarded' })
      .eq('id', saveId);
  }
};
