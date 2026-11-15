import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ApiError } from "@/api/client";
import { useT } from "@/i18n";
import { colors, space } from "@/theme";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

export function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.teal} />
    </View>
  );
}

/** Readable message for any thrown error. */
export function useErrorMessage() {
  const t = useT();
  return (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.isNetwork) return t("networkError");
      if (error.status >= 500) return t("genericError");
      return error.message;
    }
    return t("genericError");
  };
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useT();
  const message = useErrorMessage()(error);
  return (
    <View style={styles.center}>
      <Icon name="cloud-offline-outline" size={40} color={colors.muted} />
      <Text center color={colors.muted} style={styles.gap}>
        {message}
      </Text>
      {onRetry ? <Button title={t("retry")} variant="secondary" onPress={onRetry} style={styles.gap} /> : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={32} color={colors.teal} />
      </View>
      <Text variant="heading" center style={styles.gap}>
        {title}
      </Text>
      {body ? (
        <Text center color={colors.muted} style={styles.smallGap}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={[styles.gap, styles.action]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
    minHeight: 320,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  gap: { marginTop: space.lg },
  smallGap: { marginTop: space.sm },
  action: { alignSelf: "stretch" },
});
