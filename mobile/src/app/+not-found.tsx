import { View } from "react-native";
import { useRouter } from "expo-router";
import { useT } from "@/i18n";
import { layout } from "@/ui/Layout";
import { EmptyState } from "@/ui/States";

export default function NotFound() {
  const t = useT();
  const router = useRouter();
  return (
    <View style={layout.screen}>
      <EmptyState icon="compass-outline" title={t("notFound")} actionLabel={t("goHome")} onAction={() => router.replace("/")} />
    </View>
  );
}
