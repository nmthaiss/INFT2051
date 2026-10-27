import { Dimensions, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Base width from iPhone 11
const BASE_WIDTH = 375;

const widthScale = SCREEN_WIDTH / BASE_WIDTH;

const moderateScale = (size: number, factor = 0.5) =>
  size + (widthScale * size - size) * factor;

export const responsiveFontSize = (fontSize: number, factor = 0.5) => {
  const newSize = moderateScale(fontSize, factor);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};
