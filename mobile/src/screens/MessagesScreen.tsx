import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import type { ConversationListItem } from '../api/client';
import {
  EmptyState,
  ListCard,
  LoadingBlock,
  PrimaryButton,
  Screen,
} from '../components/ui';
import { colors, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

function relativeTime(iso?: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Şimdi';
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} g`;
  return new Date(iso).toLocaleDateString('tr-TR');
}

export function MessagesScreen() {
  const { authFetch } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      setItems(await authFetch<ConversationListItem[]>('/api/conversations/expert'));
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authFetch]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  if (loading) return <LoadingBlock />;
  if (error) {
    return (
      <Screen>
        <EmptyState
          title="Bağlantı yok"
          body="Sohbetler yüklenemedi."
          actionLabel="Tekrar dene"
          onAction={() => {
            setLoading(true);
            void load();
          }}
        />
      </Screen>
    );
  }

  const unread = items.filter((i) => i.hasUnread).length;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sohbet</Text>
        <Text style={styles.directive}>
          {unread > 0
            ? `${unread} okunmamış mesaj`
            : items.length > 0
              ? 'Uzmanına yaz'
              : 'İlk mesajını gönder'}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.flex : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="Henüz sohbet yok"
            body="Bir soru yaz — uzman yanıtlar."
            actionLabel="Uzmana sor"
            onAction={() => navigation.navigate('AskExpert', {})}
          />
        }
        renderItem={({ item }) => (
          <ListCard
            onPress={() =>
              navigation.navigate('ChatThread', { conversationId: item.id })
            }
          >
            <View style={styles.row}>
              <View style={[styles.dot, !item.hasUnread && styles.dotRead]} />
              <View style={styles.rowBody}>
                <View style={styles.titleRow}>
                  <Text
                    style={[styles.rowTitle, item.hasUnread && styles.unread]}
                    numberOfLines={1}
                  >
                    {item.subject}
                  </Text>
                  <Text style={styles.time}>
                    {relativeTime(item.lastMessageAtUtc)}
                  </Text>
                </View>
                <Text style={styles.rowPreview} numberOfLines={1}>
                  {item.lastMessagePreview || 'Henüz mesaj yok'}
                </Text>
              </View>
            </View>
          </ListCard>
        )}
      />

      {items.length > 0 ? (
        <View style={styles.footer}>
          <PrimaryButton
            label="Uzmana sor"
            onPress={() => navigation.navigate('AskExpert', {})}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('ReportProblem', {})}
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>Sorun bildir</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  headerTitle: { ...typography.screenTitle },
  directive: {
    ...typography.helper,
    marginTop: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 140,
  },
  flex: { flexGrow: 1, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  dotRead: { backgroundColor: 'transparent' },
  rowBody: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    ...typography.bodyStrong,
    flex: 1,
  },
  unread: { fontWeight: '700' },
  time: { ...typography.caption },
  rowPreview: {
    ...typography.helper,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    bottom: spacing.lg,
    gap: spacing.sm,
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
});
