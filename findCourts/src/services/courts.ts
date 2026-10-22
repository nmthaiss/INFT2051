import {
    FunctionsFetchError,
    FunctionsHttpError,
    FunctionsRelayError,
} from '@supabase/supabase-js';

import type { Court } from '@/components/map/CourtsMarker';
import { supabase } from '@/lib/supabase';

export type CourtBounds = {
    south: number;
    west: number;
    north: number;
    east: number;
};

type GetCourtsResponse = {
    courts: Court[];
    cache: {
        fetchedTiles: number;
        reusedTiles: number;
    };
};

export async function getCourts(bounds: CourtBounds) {
    if (!supabase) {
        throw new Error('Supabase environment variables are not configured.');
    }

    const { data, error } = await supabase.functions.invoke<GetCourtsResponse>('get-courts', {
        body: bounds,
    });

    if (error instanceof FunctionsHttpError) {
        const responseBody = await error.context.clone().json().catch(() => null) as {
            error?: string;
            message?: string;
        } | null;
        throw new Error(responseBody?.error ?? responseBody?.message ?? error.message);
    }

    if (error instanceof FunctionsRelayError) {
        throw new Error(`Supabase function relay error: ${error.message}`);
    }

    if (error instanceof FunctionsFetchError) {
        throw new Error(`Unable to reach Supabase: ${error.message}`);
    }

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error('The court service returned no data.');
    }

    return data;
}
