import { useCallback, useEffect, useRef, useState } from "react";
import type { CourtCluster } from "@/type/CourtCluster";
import { isSupabaseConfigured } from "@/lib/supabase";
import { searchCourts } from "@/services/courts";
import { clusterCourts } from "@/utils/clusterizeCourts";

export function useCourtSearch(localClusters: CourtCluster[]) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<CourtCluster[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const searchRequestId = useRef(0);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const cancelPendingSearch = useCallback(() => {
        searchRequestId.current += 1;

        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
            searchTimeout.current = null;
        }
    }, []);

    const localSuggestionsForQuery = useCallback(
        (value: string) => {
            const normalizedQuery = value.trim().toLocaleLowerCase();
            if (!normalizedQuery) return [];

            return localClusters
                .filter((cluster) => cluster.courts.some((court) => 
                    court.name.toLocaleLowerCase().includes(normalizedQuery)
                    || court.address?.toLocaleLowerCase().includes(normalizedQuery),
                ),)
                .sort((first, second) => {
                    const firstName = first.courts[0]?.name.toLocaleLowerCase() ?? '';
                    const secondName = second.courts[0]?.name.toLocaleLowerCase() ?? '';
                    const firstStartsWithQuery   = firstName.startsWith(normalizedQuery);
                    const secondStartsWithQuery   = secondName.startsWith(normalizedQuery);

                    if (firstStartsWithQuery !== secondStartsWithQuery) {
                        return firstStartsWithQuery ? -1 : 1;
                    }

                    return firstName.localeCompare(secondName);
                })
                .slice(0, 8);
        },
        [localClusters],
    );
    
    const changeQuery = useCallback(
        (value: string) => {
            setQuery(value);
            setSearchError(null);
            cancelPendingSearch();

            const normalizedQuery = value.trim();

            // if query == 0 submit is not allowed
            if (!normalizedQuery) {
                setSuggestions([]);
                setSuggestionsLoading(false);
                setShowSuggestions(false);
                return;
            }

            const localSuggestions = localSuggestionsForQuery(normalizedQuery);

            // use alr loaded suggestions or local suggestion for 1 character bcs we want to be responsive
            if (normalizedQuery.length === 1 || !isSupabaseConfigured) {
                setSuggestions(localSuggestions);
                setSuggestionsLoading(false);
                setShowSuggestions(true);
                return;
            }

            const requestId = ++searchRequestId.current;
            setSuggestionsLoading(true);
            setShowSuggestions(true);

            searchTimeout.current = setTimeout(() => {
                searchCourts(normalizedQuery)
                    .then((results) => {
                        if (requestId === searchRequestId.current) setSuggestions(clusterCourts(results));
                    })
                    .catch((error) => {
                        if (requestId === searchRequestId.current){
                            setSuggestions(localSuggestions);
                            setSearchError(error instanceof Error ? error.message : 'Unable to search courts.',);
                        } 
                        
                    })
                    .finally(() => {
                        if (requestId === searchRequestId.current) setSuggestionsLoading(false);
                    });
            }, 250);
        }, 
        [cancelPendingSearch, localSuggestionsForQuery]
    );

    const dismissSuggestions = useCallback(() => {
        setShowSuggestions(false);
    }, []);

    const selectSuggestion = useCallback(
        (cluster: CourtCluster) => {
            cancelPendingSearch();

            setQuery(cluster.courts[0]?.name ?? '');
            setSuggestions([]);
            setSuggestionsLoading(false);
            setShowSuggestions(false);

        }, [cancelPendingSearch]);

    useEffect(() => {
        return cancelPendingSearch;
    }, [cancelPendingSearch]);
    
    return {
        query,
        suggestions,
        suggestionsLoading,
        showSuggestions,
        searchError,
        changeQuery,
        selectSuggestion,
        dismissSuggestions,
    };
}
