import { useThemeColor } from "heroui-native";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

export function CoverOverlay() {
  const background = useThemeColor("background");

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="coverFade" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={background} stopOpacity="1" />
            <Stop offset="0.24" stopColor={background} stopOpacity="0.82" />
            <Stop offset="0.55" stopColor={background} stopOpacity="0.45" />
            <Stop offset="1" stopColor={background} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#coverFade)" />
      </Svg>
    </View>
  );
}
