import { forwardRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from "react-native";
import { colors, radius, space } from "@/theme";
import { Text } from "./Text";

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
  right?: ReactNode;
};

export const Field = forwardRef<TextInputInstance, Props>(function Field(
  { label, error, hint, right, style, multiline, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text variant="label" style={styles.label}>
        {label}
      </Text>
      <View
        style={[
          styles.box,
          multiline && styles.multiline,
          focused && styles.focused,
          error ? styles.errorBox : null,
        ]}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          style={[styles.input, multiline && styles.inputMultiline, style]}
          multiline={multiline}
          accessibilityLabel={label}
          maxFontSizeMultiplier={1.4}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {right}
      </View>
      {error ? (
        <Text variant="caption" color={colors.danger} style={styles.below}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" style={styles.below}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

/** A small text button placed inside a Field (e.g. Show / Hide password). */
export function FieldButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.fieldButton} accessibilityRole="button">
      <Text variant="label" color={colors.teal}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  label: { marginBottom: space.xs },
  box: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
  },
  multiline: { alignItems: "flex-start", minHeight: 96 },
  focused: { borderColor: colors.teal },
  errorBox: { borderColor: colors.danger },
  input: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: space.md },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  below: { marginTop: space.xs },
  fieldButton: { paddingLeft: space.sm, paddingVertical: space.sm },
});
