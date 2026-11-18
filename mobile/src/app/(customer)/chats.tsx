import { View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { ChatList } from "@/features/ChatList";
import { useT } from "@/i18n";
import { TabHeader, layout } from "@/ui/Layout";
import { EmptyState } from "@/ui/States";

export default function ChatsTab() {
  const t = useT();
  const router = useRouter();
  const { account } = useAuth();

  return (
    <View style={layout.screen}>
      <TabHeader title={t("chatsTitle")} />
      {account ? (
        <ChatList />
      ) : (
        <EmptyState
          icon="chatbubbles-outline"
          title={t("guestChats")}
          actionLabel={t("signIn")}
          onAction={() => router.push("/sign-in")}
        />
      )}
    </View>
  );
}
