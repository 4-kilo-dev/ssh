import { Image, type ImageProps } from "expo-image";
import { StyleSheet } from "react-native";
import { colors } from "@/theme";

/** Network image with a soft placeholder colour and fade-in. Handles SVG too. */
export function RemoteImage({ uri, style, ...rest }: Omit<ImageProps, "source"> & { uri: string }) {
  return (
    <Image
      source={{ uri }}
      contentFit="cover"
      transition={150}
      style={[styles.base, style]}
      accessibilityIgnoresInvertColors
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.tealSoft },
});
