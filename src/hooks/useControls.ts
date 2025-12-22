import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RoutingControls, DEFAULT_CONTROLS } from '@/types/routing';

interface ControlValue {
  value: number | boolean;
}

export function useControls() {
  const [controls, setControls] = useState<RoutingControls>(DEFAULT_CONTROLS);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchControls = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('controls')
        .select('*');

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const controlsMap: Partial<RoutingControls> = {};
        let latestUpdate = '';

        data.forEach((row) => {
          const key = row.key as keyof RoutingControls;
          const rowValue = row.value as unknown as ControlValue | null;
          if (key in DEFAULT_CONTROLS && rowValue) {
            (controlsMap as any)[key] = rowValue.value;
          }
          if (row.updated_at > latestUpdate) {
            latestUpdate = row.updated_at;
          }
        });

        setControls({ ...DEFAULT_CONTROLS, ...controlsMap });
        setLastUpdated(latestUpdate);
      }
    } catch (err) {
      console.error('Error fetching controls:', err);
      setError('Failed to load controls');
    } finally {
      setIsLoading(false);
    }
  };

  const updateControl = async (key: keyof RoutingControls, value: number | boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('controls')
        .update({ value: { value } })
        .eq('key', key);

      if (updateError) throw updateError;

      setControls(prev => ({ ...prev, [key]: value }));
      setLastUpdated(new Date().toISOString());
      return true;
    } catch (err) {
      console.error('Error updating control:', err);
      throw err;
    }
  };

  const resetToDefaults = async () => {
    try {
      const updates = Object.entries(DEFAULT_CONTROLS).map(([key, value]) =>
        supabase
          .from('controls')
          .update({ value: { value } })
          .eq('key', key)
      );

      await Promise.all(updates);
      setControls(DEFAULT_CONTROLS);
      setLastUpdated(new Date().toISOString());
      return true;
    } catch (err) {
      console.error('Error resetting controls:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchControls();
  }, []);

  return {
    controls,
    lastUpdated,
    isLoading,
    error,
    updateControl,
    resetToDefaults,
    refetch: fetchControls,
  };
}
