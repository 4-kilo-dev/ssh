import { useState } from "react";
import { FlatList, KeyboardAvoidingView, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import type { Message } from "@/api/types";
import { useLocale } from "@/i18n";
import { colors, radius, space } from "@/theme";
import { Icon } from "@/ui/Icon";
import { Text } from "@/ui/Text";
import { formatChatTime } from "@/utils/format";

/**
 * Message list + composer. Used for an existing conversation and for a new one
 * (with no messages yet and a hint at the top).
 */
export function ChatThread({
  messages,
  myId,
  initialDraft = "",
  hint,
  sending,
  onSend,
}: {
  messages: Message[];
  myId: string | undefined;
  initialDraft?: string;
  hint?: string;
  sending?: boolean;
  /** Return false to keep the draft (e.g. when sending failed). */
  onSend: (text: string) => Promise<boolean> | boolean;
}) {
  const { t, locale } = useLocale();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [draft, setDraft] = useState(initialDraft);

  const submit = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    const ok = await onSend(text);
    if (!ok) setDraft(text);
  };

  const reversed = [...messages].reverse();

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} style={styles.flex}>
      <FlatList
        data={reversed}
        inverted
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          hint ? (
            <View style={styles.hint}>
              <Icon name="chatbubble-ellipses-outline" size={28} color={colors.teal} />
              <Text center color={colors.muted}>
                {hint}
              </Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          const mine = item.senderId === myId;
          return (
            <View style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text color={mine ? colors.white : colors.ink}>{item.content}</Text>
                <Text variant="caption" color={mine ? colors.tealSoft : colors.muted} style={styles.time}>
                  {formatChatTime(item.createdAt, locale)}
                </Text>
              </View>
            </View>
          );
        }}
      />
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t("typeMessage")}
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
          maxLength={2000}
          accessibilityLabel={t("typeMessage")}
          maxFontSizeMultiplier={1.4}
        />
        <Pressable
          onPress={submit}
          disabled={!draft.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel={t("send")}
          style={({ pressed }) => [
            styles.send,
            (!draft.trim() || sending) && styles.sendDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="send" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  list: { padding: space.lg, gap: space.sm, flexGrow: 1 },
  hint: { alignItems: "center", gap: space.sm, paddingVertical: space.xl, paddingHorizontal: space.lg },
  bubbleRow: { flexDirection: "row" },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },
  bubble: { maxWidth: "80%", paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.lg },
  mine: { backgroundColor: colors.teal, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 4 },
  time: { marginTop: 2, alignSelf: "flex-end", fontSize: 11 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: space.md,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
    color: colors.ink,
    borderRadius: 22,
    backgroundColor: colors.paper,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { backgroundColor: colors.disabled },
  pressed: { opacity: 0.8 },
});
