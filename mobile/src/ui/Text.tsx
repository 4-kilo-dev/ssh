import { StyleSheet, Text as RNText, type TextProps } from "react-native";
import { colors } from "@/theme";

export type TextVariant = "title" | "heading" | "body" | "label" | "caption";

type Props = TextProps & {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
  bold?: boolean;
};

/** App text. Font scaling is allowed (accessibility) but capped so layouts hold. */
export function Text({ variant = "body", color, center, bold, style, ...rest }: Props) {
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      style={[
        styles.base,
        styles[variant],
        color ? { color } : null,
        center ? styles.center : null,
        bold ? styles.bold : null,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { color: colors.ink },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "700" },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 23 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  caption: { fontSize: 13, lineHeight: 18, color: colors.muted },
  center: { textAlign: "center" },
  bold: { fontWeight: "700" },
});
