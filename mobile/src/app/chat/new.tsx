import { useRef, useState } from "react";
import { Alert } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/api/endpoints";
import { keys, useVenue } from "@/api/queries";
import { useAuth } from "@/auth/AuthProvider";
import { ChatThread } from "@/features/ChatThread";
import { useAfterSignIn } from "@/features/useAfterSignIn";
import { useT } from "@/i18n";
import { useErrorMessage } from "@/ui/States";

/**
 * First message to a venue. Guests can type first; Sign in opens on Send and
 * the message goes out right after. Reuses an existing conversation if there is one.
 */
export default function NewChatScreen() {
  const { venueId, text } = useLocalSearchParams<{ venueId: string; text?: string }>();
  const t = useT();
  const router = useRouter();
  const { account } = useAuth();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const venueQ = useVenue(venueId);
  const [sending, setSending] = useState(false);
  const pendingText = useRef("");

  const deliver = async () => {
    const content = pendingText.current;
    if (!content) return;
    setSending(true);
    try {
      const list = await chatApi.list();
      const existing = list.find((c) => c.venueId === venueId);
      let conversationId: string;
      if (existing) {
        await chatApi.send(existing.id, content);
        conversationId = existing.id;
      } else {
        conversationId = (await chatApi.start(venueId, content)).id;
      }
      pendingText.current = "";
      queryClient.invalidateQueries({ queryKey: keys.chats });
      router.replace(`/chat/${conversationId}`);
    } catch (err) {
      Alert.alert(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const deliverWhenSignedIn = useAfterSignIn(deliver);

  return (
    <>
      <Stack.Screen options={{ title: venueQ.data?.venue.name ?? "" }} />
      <ChatThread
        messages={[]}
        myId={account?.id}
        initialDraft={text ?? ""}
        hint={t("startChatHint")}
        sending={sending}
        onSend={(content) => {
          pendingText.current = content;
          deliverWhenSignedIn();
          // Keep the text in the box until it is really sent.
          return false;
        }}
      />
    </>
  );
}
