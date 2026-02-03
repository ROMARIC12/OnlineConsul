import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface DoctorPricing {
  consultation_price_min: number;
  consultation_price_max: number;
  accepts_mobile_money: boolean;
  accepts_insurance: boolean;
}

const DEFAULT_PRICING: DoctorPricing = {
  consultation_price_min: 300, // Default 300 FCFA
  consultation_price_max: 300,
  accepts_mobile_money: true,
  accepts_insurance: false,
};

export function useDoctorPricing(doctorId: string | null) {
  const [pricing, setPricing] = useState<DoctorPricing>(DEFAULT_PRICING);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPricing = useCallback(async () => {
    if (!doctorId) {
      setPricing(DEFAULT_PRICING);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('consultation_price_min, consultation_price_max, accepts_mobile_money, accepts_insurance')
        .eq('id', doctorId)
        .single();

      if (error) throw error;

      setPricing({
        consultation_price_min: data?.consultation_price_min || DEFAULT_PRICING.consultation_price_min,
        consultation_price_max: data?.consultation_price_max || DEFAULT_PRICING.consultation_price_max,
        accepts_mobile_money: data?.accepts_mobile_money ?? DEFAULT_PRICING.accepts_mobile_money,
        accepts_insurance: data?.accepts_insurance ?? DEFAULT_PRICING.accepts_insurance,
      });
    } catch (error) {
      console.error('Error fetching doctor pricing:', error);
      setPricing(DEFAULT_PRICING);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  // Initial fetch
  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  // Real-time updates for doctor pricing changes
  useRealtimeSubscription({
    table: 'doctors',
    filter: doctorId ? 'id' : undefined,
    filterValue: doctorId || undefined,
    onChange: (payload) => {
      console.log('[useDoctorPricing] Doctor pricing updated:', payload);
      if (payload.new) {
        const newData = payload.new as any;
        setPricing({
          consultation_price_min: newData.consultation_price_min || DEFAULT_PRICING.consultation_price_min,
          consultation_price_max: newData.consultation_price_max || DEFAULT_PRICING.consultation_price_max,
          accepts_mobile_money: newData.accepts_mobile_money ?? DEFAULT_PRICING.accepts_mobile_money,
          accepts_insurance: newData.accepts_insurance ?? DEFAULT_PRICING.accepts_insurance,
        });
      }
    },
  });

  const getDepositAmount = useCallback(() => {
    // Calculate 30% deposit, minimum 50 FCFA
    const deposit = Math.round(pricing.consultation_price_min * 0.3);
    return Math.max(deposit, 50); // Minimum 50 FCFA
  }, [pricing.consultation_price_min]);

  return {
    pricing,
    isLoading,
    depositAmount: getDepositAmount(),
    refetch: fetchPricing,
  };
}
