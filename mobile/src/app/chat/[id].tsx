import { useEffect } from "react";
import { Alert } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/api/endpoints";
import { keys, useChat } from "@/api/queries";
import type { Conversation, Message } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import { ChatThread } from "@/features/ChatThread";
import { useT } from "@/i18n";
import { ErrorView, LoadingView, useErrorMessage } from "@/ui/States";

type ChatData = { conversation: Conversation; messages: Message[] };

export default function ChatScreen() {
  const { id, text } = useLocalSearchParams<{ id: string; text?: string }>();
  const t = useT();
  const { account } = useAuth();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const chatQ = useChat(id);

  // Opening a chat marks it read on the server — refresh the list badges.
  useEffect(() => {
    if (chatQ.isSuccess) queryClient.invalidateQueries({ queryKey: keys.chats });
  }, [chatQ.isSuccess, queryClient]);

  if (chatQ.isPending) return <LoadingView />;
  if (chatQ.isError || !chatQ.data) return <ErrorView error={chatQ.error} onRetry={() => chatQ.refetch()} />;

  const { conversation, messages } = chatQ.data;
  const isManager = account?.id === conversation.managerId;
  const title = isManager ? conversation.customer?.name ?? t("customer") : conversation.venue?.name ?? "";

  const onSend = async (content: string) => {
    try {
      const message = await chatApi.send(id, content);
      queryClient.setQueryData(keys.chat(id), (old: ChatData | undefined) =>
        old ? { ...old, messages: [...old.messages, message] } : old
      );
      queryClient.invalidateQueries({ queryKey: keys.chats });
      return true;
    } catch (err) {
      Alert.alert(errorMessage(err));
      return false;
    }
  };

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ChatThread messages={messages} myId={account?.id} initialDraft={text ?? ""} onSend={onSend} />
    </>
  );
}
