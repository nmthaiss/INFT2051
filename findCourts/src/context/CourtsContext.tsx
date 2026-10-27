import { useCourts } from '@/hooks/useCourts'
import { CourtCluster } from '@/type/CourtCluster';
import { createContext, useContext, useState } from 'react';
import type { Dispatch, PropsWithChildren, SetStateAction } from 'react';

type CourtsContextValue = ReturnType<typeof useCourts> & {
    selectedCluster: CourtCluster | null;
    setSelectedCluster: Dispatch<SetStateAction<CourtCluster | null>>;
}
const CourtsContext = createContext<CourtsContextValue | undefined>(undefined);

export function CourtsProvider({ children }: PropsWithChildren) {
    const courtsState = useCourts();
    const [selectedCluster, setSelectedCluster] = useState<CourtCluster | null>(null);

    return (
        <CourtsContext.Provider
                value={{
                    ...courtsState,
                    selectedCluster,
                    setSelectedCluster,
                }}
            >
                {children}
            </CourtsContext.Provider>
    );
}

export function useCourtsContext() {
    const context = useContext(CourtsContext);

    if (context === undefined) {
        throw new Error(
            'useCourtsContext must be used inside CourtsProvider.',
        );
    }

    return context;
}
