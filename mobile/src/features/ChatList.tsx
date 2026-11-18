import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useChats, usePullRefresh, useRefetchOnFocus } from "@/api/queries";
import type { Conversation } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import { useLocale } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { Avatar } from "@/ui/Layout";
import { RemoteImage } from "@/ui/Remote";
import { EmptyState, ErrorView, LoadingView } from "@/ui/States";
import { Text } from "@/ui/Text";
import { formatChatTime } from "@/utils/format";
import { venueCover } from "@/utils/images";

/** Conversation list shared by customers (Chats tab) and managers (Messages tab). */
export function ChatList({ asManager }: { asManager?: boolean }) {
  const { t, locale } = useLocale();
  const { account } = useAuth();
  const router = useRouter();
  const chats = useChats();
  const { refreshing, onRefresh } = usePullRefresh(chats.refetch);
  useRefetchOnFocus(chats.refetch, Boolean(account));

  if (chats.isPending) return <LoadingView />;
  if (chats.isError && !chats.data) return <ErrorView error={chats.error} onRetry={() => chats.refetch()} />;

  const list = chats.data ?? [];

  const renderItem = ({ item }: { item: Conversation }) => {
    const title = asManager ? item.customer?.name ?? t("customer") : item.venue?.name ?? "";
    const last = item.lastMessage;
    const mine = last?.senderId === account?.id;
    const unread = item.unreadCount ?? 0;
    return (
      <Pressable
        onPress={() => router.push(`/chat/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${title}${unread ? `, ${unread}` : ""}`}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {asManager || !item.venue ? (
          <Avatar name={title} size={52} />
        ) : (
          <RemoteImage uri={venueCover(item.venue)} style={styles.thumb} />
        )}
        <View style={styles.body}>
          <View style={styles.top}>
            <Text variant="label" style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {last ? <Text variant="caption">{formatChatTime(last.createdAt, locale)}</Text> : null}
          </View>
          <View style={styles.top}>
            <Text
              variant="caption"
              numberOfLines={1}
              style={styles.preview}
              color={unread ? colors.ink : colors.muted}
            >
              {last ? `${mine ? "✓ " : ""}${last.content}` : asManager ? item.venue?.name ?? "" : ""}
            </Text>
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text variant="caption" color={colors.white} bold>
                  {unread > 99 ? "99+" : unread}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <FlatList
      data={list}
      keyExtractor={(c) => c.id}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={list.length === 0 ? styles.emptyContent : styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
      ListEmptyComponent={
        <EmptyState
          icon="chatbubbles-outline"
          title={t("noChats")}
          body={asManager ? undefined : t("noChatsBody")}
          actionLabel={asManager ? undefined : t("findVenue")}
          onAction={asManager ? undefined : () => router.navigate("/")}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
  emptyContent: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.paper,
  },
  pressed: { backgroundColor: colors.tealSoft },
  thumb: { width: 52, height: 52, borderRadius: radius.md },
  body: { flex: 1, gap: 2 },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  title: { flex: 1, fontSize: 16 },
  preview: { flex: 1 },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  separator: { height: 1, backgroundColor: colors.line, marginLeft: space.lg + 52 + space.md },
});
