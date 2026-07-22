import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import type { NotificationDto } from '../api/client';
import {
  EmptyState,
  ListCard,
  LoadingBlock,
  Screen,
  ScreenHeader,
} from '../components/ui';
import { colors, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

function relativeTime(iso: string) {
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

export function NotificationsScreen() {
  const { authFetch } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      setItems(await authFetch<NotificationDto[]>('/api/notifications'));
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

  const openNotification = async (item: NotificationDto) => {
    if (!item.isRead) {
      try {
        await authFetch(`/api/notifications/${item.id}/read`, { method: 'POST' });
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
      } catch {
        // navigate anyway
      }
    }

    const type = (item.relatedEntityType ?? '').toLowerCase();
    const id = item.relatedEntityId;
    if (id && (type === 'task' || type.includes('task') || type.includes('gorev'))) {
      navigation.navigate('TaskDetail', { taskId: id });
      return;
    }
    if (
      id &&
      (type.includes('conversation') ||
        type.includes('message') ||
        type.includes('sohbet'))
    ) {
      navigation.navigate('ChatThread', { conversationId: id });
      return;
    }
    // Fallback: task-related titles from API still carry relatedEntityId as Task.
    if (id && /görev|düzeltme|onay/i.test(`${item.title} ${item.body}`)) {
      navigation.navigate('TaskDetail', { taskId: id });
    }
  };

  if (loading) return <LoadingBlock />;
  if (error) {
    return (
      <Screen>
        <EmptyState
          title="Bağlantı yok"
          body="Bildirimler yüklenemedi."
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
      <ScreenHeader title="Bildirimler" />
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
          <EmptyState title="Hepsi okundu" body="Yeni bildirim gelince burada." />
        }
        renderItem={({ item }) => (
          <ListCard onPress={() => void openNotification(item)}>
            <View style={styles.row}>
              <View style={[styles.dot, item.isRead && styles.dotRead]} />
              <View style={styles.rowBody}>
                <View style={styles.titleRow}>
                  <Text
                    style={[styles.title, !item.isRead && styles.titleUnread]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.time}>{relativeTime(item.createdAtUtc)}</Text>
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.body}
                </Text>
              </View>
            </View>
          </ListCard>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxxl,
  },
  flex: { flexGrow: 1 },
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
  dotRead: {
    backgroundColor: 'transparent',
  },
  rowBody: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.bodyStrong,
    flex: 1,
  },
  titleUnread: {
    fontWeight: '700',
  },
  time: {
    ...typography.caption,
  },
  preview: {
    ...typography.helper,
    marginTop: 4,
  },
});
