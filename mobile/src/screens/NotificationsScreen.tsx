import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import type { NotificationDto } from '../api/client';
import { EmptyState, ListCard, LoadingBlock, Screen, ScreenHeader } from '../components/ui';
import { colors, spacing, typography } from '../theme';

export function NotificationsScreen() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await authFetch<NotificationDto[]>('/api/notifications');
      setItems(data);
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
          title="Bildirimler yüklenemedi"
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
      <ScreenHeader
        title="Bildirimler"
        subtitle="Önemli hatırlatmalar."
      />
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
            title="Bildirim yok"
            body="Önemli hatırlatmalar burada görünür."
          />
        }
        renderItem={({ item }) => (
          <ListCard>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowBody}>{item.body}</Text>
            <Text style={styles.rowMeta}>
              {new Date(item.createdAtUtc).toLocaleString('tr-TR')}
            </Text>
          </ListCard>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
  },
  flex: { flexGrow: 1 },
  rowTitle: {
    ...typography.bodyStrong,
  },
  rowBody: {
    ...typography.helper,
    marginTop: spacing.sm,
  },
  rowMeta: {
    ...typography.caption,
    marginTop: spacing.md,
  },
});
