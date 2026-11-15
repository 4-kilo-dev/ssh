import { Platform, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "@/i18n";
import { colors, space } from "@/theme";
import { IconButton } from "@/ui/Layout";
import { Text } from "@/ui/Text";

/** Title + close button at the top of a modal sheet. */
export function SheetHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const t = useT();
  const insets = useSafeAreaInsets();
  // iOS shows modals as a card below the status bar; Android shows them full screen.
  const top = Platform.OS === "ios" ? space.xl : insets.top + space.md;
  return (
    <View style={[styles.header, { paddingTop: top }]}>
      <View style={styles.flex}>
        <Text variant="title" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text color={colors.muted}>{subtitle}</Text> : null}
      </View>
      <IconButton icon="close" label={t("close")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  flex: { flex: 1, gap: space.xs },
});
