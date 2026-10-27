import { useCallback, useEffect, useMemo, useState } from "react";
import type { Court } from "@/type/Court";
import type { CourtBounds } from "@/type/CourtBounds";
import { clusterCourts } from "@/utils/clusterizeCourts";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadCachedCourts, saveCachedCourts } from "@/services/courtCache";
import { getCourts } from "@/services/courts";

export function useCourts() {
    const [courts, setCourts] = useState<Court[]>([]);
    const [courtsLoading, setCourtsLoading] = useState(false);
    const [courtsError, setCourtsError] = useState<string | null>(null);
    const [cacheLoadFinished, setCacheLoadFinished] = useState(false);      // finish reading cache or not

    // everytime dependencies courts changes, automatically call this 
    const courtClusters = useMemo(
        () => clusterCourts(courts),
        [courts],
    );
    
    useEffect(() => {
        let active = true;

        async function loadCache() {
            const cached = await loadCachedCourts();
            if (active && cached) {
                setCourts(cached.courts);
            }

            if (active) {
                setCacheLoadFinished(true);
            }
        }

        loadCache();

        return () => {
            active = false;
        };
    }, []);

    // Call get courts via Supabase
    const loadCourts = useCallback(async (bounds: CourtBounds) => {
        if (!isSupabaseConfigured) return;

        setCourtsLoading(true);
        setCourtsError(null);

        try {
            const result = await getCourts(bounds);
            setCourts(result.courts);
            await saveCachedCourts(result.courts);
        } catch (error) {
            const cached = await loadCachedCourts();
            if (cached) {
                setCourts(cached.courts);
            }

            const message = error instanceof Error ? error.message : 'Unable to load courts.';
            setCourtsError(cached ? `${message} Showing saved courts.` : message);
        } finally {
            setCourtsLoading(false);
        }
    }, []);

     const clearCourtsError = useCallback(() => {
        setCourtsError(null);
    }, []);

    return {
        courts,
        courtClusters,
        courtsLoading,
        courtsError,
        cacheLoadFinished,
        loadCourts,
        clearCourtsError,
    };
}


    