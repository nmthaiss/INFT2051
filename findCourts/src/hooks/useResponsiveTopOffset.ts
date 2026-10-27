import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useResponsiveTopOffset(offset = 4) {
    const insets = useSafeAreaInsets();
    return insets.top + offset;
}