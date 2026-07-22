import React, { useCallback, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { isOfficer } from '../auth/roles';
import type { ConversationDetail } from '../api/client';
import { EmptyState, LoadingBlock, PrimaryButton, Screen } from '../components/ui';
import { colors, radii, spacing, tap, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function ChatThreadScreen() {
  const { authFetch, user } = useAuth();
  const officer = isOfficer(user?.roles);
  const route = useRoute<RouteProp<RootStackParamList, 'ChatThread'>>();
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await authFetch<ConversationDetail>(
        `/api/conversations/${route.params.conversationId}`,
      );
      setDetail(data);
    } catch {
      setError(true);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [authFetch, route.params.conversationId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await authFetch(`/api/conversations/${route.params.conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: body.trim() }),
      });
      setBody('');
      await load();
    } catch {
      setSendError('Mesaj gönderilemedi. Tekrar deneyin.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingBlock />;
  if (error || !detail) {
    return (
      <Screen>
        <EmptyState
          title="Sohbet yüklenemedi"
          body="Bağlantınızı kontrol edin."
          actionLabel="Tekrar dene"
          onAction={() => {
            setLoading(true);
            void load();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <Text style={styles.title}>{detail.subject}</Text>
        <FlatList
          data={detail.messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {officer
                ? 'Üreticiye yazın. Mesaj arazi sohbetine düşer.'
                : 'Uzmanınıza yazın. Genelde aynı gün yanıtlanır.'}
            </Text>
          }
          renderItem={({ item }) => {
            const mine = item.senderUserId === user?.userId;
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.bubbleText, mine && styles.mineText]}>{item.body}</Text>
              </View>
            );
          }}
        />
        <View style={styles.composer}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Mesajınızı yazın"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
          {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}
          <PrimaryButton label="Gönder" onPress={send} loading={sending} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: {
    ...typography.bodyStrong,
    fontSize: 18,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
  },
  list: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  empty: {
    ...typography.body,
    padding: spacing.sm,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  mineText: {
    color: colors.onPrimary,
  },
  composer: {
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    minHeight: tap.primary,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  sendError: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
});
