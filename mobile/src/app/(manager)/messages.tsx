import { View } from "react-native";
import { ChatList } from "@/features/ChatList";
import { useT } from "@/i18n";
import { TabHeader, layout } from "@/ui/Layout";

export default function ManagerMessages() {
  const t = useT();
  return (
    <View style={layout.screen}>
      <TabHeader title={t("chatsTitle")} />
      <ChatList asManager />
    </View>
  );
}
