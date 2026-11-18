import { useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { supportApi } from "@/api/endpoints";
import { useT, type CopyKey } from "@/i18n";
import { colors, space } from "@/theme";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Field } from "@/ui/Field";
import { Notice, layout } from "@/ui/Layout";
import { useErrorMessage } from "@/ui/States";
import { Text } from "@/ui/Text";

const TOPICS = ["booking", "payment", "account", "other"] as const;

export default function Support() {
  const t = useT();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("booking");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: () => supportApi.create({ category: topic, subject: subject.trim(), message: message.trim() }),
    onSuccess: () => {
      Alert.alert(t("ticketSent"));
      router.back();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const submit = () => {
    setError(null);
    if (!subject.trim() || !message.trim()) {
      setError(t("requiredField"));
      return;
    }
    send.mutate();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={layout.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text color={colors.muted} style={styles.intro}>
          {t("supportBody")}
        </Text>
        <Text variant="label" style={styles.label}>
          {t("topic")}
        </Text>
        <View style={[layout.wrap, styles.topics]}>
          {TOPICS.map((k) => (
            <Chip key={k} label={t(`topic_${k}` as CopyKey)} selected={topic === k} onPress={() => setTopic(k)} />
          ))}
        </View>
        <Field label={t("subject")} value={subject} onChangeText={setSubject} maxLength={120} />
        <Field label={t("messageLabel")} value={message} onChangeText={setMessage} multiline maxLength={2000} />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button title={t("send")} icon="send" loading={send.isPending} onPress={submit} style={styles.button} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl },
  intro: { marginBottom: space.lg },
  label: { marginBottom: space.sm },
  topics: { marginBottom: space.lg },
  button: { marginTop: space.md },
});
