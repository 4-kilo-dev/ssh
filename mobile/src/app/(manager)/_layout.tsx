import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useBookings, useChats } from "@/api/queries";
import { useAuth } from "@/auth/AuthProvider";
import { tabIcon } from "@/features/tabIcon";
import { useT } from "@/i18n";
import { colors } from "@/theme";
import { HOME, sideOf } from "@/utils/roles";

/** Venue manager tabs: Requests · Calendar · Messages · My venue. */
export default function ManagerTabs() {
  const { account } = useAuth();
  const t = useT();
  const side = sideOf(account);
  const isManager = side === "manager";
  const chats = useChats({ poll: isManager });
  const bookings = useBookings();

  if (!isManager) return <Redirect href={HOME[side]} />;

  const unread = (chats.data ?? []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
  const now = Date.now();
  const newRequests = (bookings.data ?? []).filter(
    (b) => b.status === "requested" && new Date(b.endTime).getTime() >= now
  ).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarBadgeStyle: { backgroundColor: colors.teal },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen
        name="requests"
        options={{
          title: t("tabRequests"),
          tabBarIcon: tabIcon("file-tray-outline", "file-tray-full"),
          tabBarBadge: newRequests > 0 ? newRequests : undefined,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: t("tabCalendar"), tabBarIcon: tabIcon("calendar-outline", "calendar") }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t("tabMessages"),
          tabBarIcon: tabIcon("chatbubbles-outline", "chatbubbles"),
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen
        name="my-venue"
        options={{ title: t("tabMyVenue"), tabBarIcon: tabIcon("business-outline", "business") }}
      />
    </Tabs>
  );
}
