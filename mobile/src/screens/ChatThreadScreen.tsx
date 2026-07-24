import React, { useCallback, useEffect, useRef, useState } from 'react';
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

function formatMsgTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatThreadScreen() {
  const { authFetch, user } = useAuth();
  const officer = isOfficer(user?.roles);
  const route = useRoute<RouteProp<RootStackParamList, 'SohbetKonu'>>();
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setError(false);
      const data = await authFetch<ConversationDetail>(
        `/api/conversations/${route.params.conversationId}`,
      );
      setDetail(data);
    } catch {
      if (!silent) {
        setError(true);
        setDetail(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [authFetch, route.params.conversationId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
      const id = setInterval(() => void load(true), 12_000);
      return () => clearInterval(id);
    }, [load]),
  );

  useEffect(() => {
    if (!detail?.messages.length) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(t);
  }, [detail?.messages.length]);

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
      await load(true);
    } catch {
      setSendError('Mesaj gönderilemedi. Tekrar deneyin.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingBlock />;
  if (error || !detail) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
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
    <Screen edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <Text style={styles.title}>{detail.subject}</Text>
        <FlatList
          ref={listRef}
          data={detail.messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
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
                <Text style={[styles.bubbleText, mine && styles.mineText]}>
                  {item.body}
                </Text>
                {item.sentAtUtc ? (
                  <Text style={[styles.time, mine && styles.timeMine]}>
                    {formatMsgTime(item.sentAtUtc)}
                  </Text>
                ) : null}
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
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  empty: {
    ...typography.helper,
    marginTop: spacing.xxl,
    textAlign: 'center',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  bubbleText: {
    ...typography.body,
    color: colors.text,
  },
  mineText: {
    color: colors.onPrimary,
  },
  time: {
    marginTop: 4,
    fontSize: 11,
    color: colors.muted,
  },
  timeMine: {
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'right',
  },
  composer: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
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
    fontSize: 17,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  sendError: {
    color: colors.danger,
    fontSize: 14,
  },
});
