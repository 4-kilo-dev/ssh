import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useChats } from "@/api/queries";
import { useAuth } from "@/auth/AuthProvider";
import { tabIcon } from "@/features/tabIcon";
import { useT } from "@/i18n";
import { colors } from "@/theme";
import { HOME, sideOf } from "@/utils/roles";

/** Customer (and guest) tabs: Explore · Vendors · Bookings · Chats. */
export default function CustomerTabs() {
  const { account } = useAuth();
  const t = useT();
  const side = sideOf(account);
  const chats = useChats({ poll: side === "customer" && Boolean(account) });

  if (side !== "customer") return <Redirect href={HOME[side]} />;

  const unread = (chats.data ?? []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t("tabExplore"), tabBarIcon: tabIcon("search-outline", "search") }}
      />
      <Tabs.Screen
        name="vendors"
        options={{ title: t("tabVendors"), tabBarIcon: tabIcon("bag-handle-outline", "bag-handle") }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: t("tabBookings"), tabBarIcon: tabIcon("calendar-outline", "calendar") }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: t("tabChats"),
          tabBarIcon: tabIcon("chatbubbles-outline", "chatbubbles"),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.teal },
        }}
      />
    </Tabs>
  );
}
