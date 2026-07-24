import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
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
import type { NotificationDto } from '../api/client';
import { IconCircle, SegmentTabs } from '../components/design';
import {
  GlyphCheck,
  GlyphDot,
  GlyphDrop,
  GlyphFlag,
  GlyphGearMini,
  GlyphPlus,
  IconMore,
} from '../components/icons';
import { EmptyState, LoadingBlock, Screen } from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Şimdi';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} g önce`;
  return new Date(iso).toLocaleDateString('tr-TR');
}

function notifVisual(item: NotificationDto): {
  tone: 'success' | 'wait' | 'today' | 'danger' | 'purple' | 'primary';
  icon: ReactNode;
} {
  // Başlık öncelikli — gövde metnindeki kelimeler ikonu bozmasın.
  const title = (item.title ?? '').toLocaleLowerCase('tr-TR');
  const body = (item.body ?? '').toLocaleLowerCase('tr-TR');

  if (/yeni\s*görev|^yeni\b/.test(title))
    return { tone: 'wait', icon: <GlyphPlus /> };
  if (/onayland|tamamland/.test(title))
    return { tone: 'success', icon: <GlyphCheck /> };
  if (/düzeltme|red|eksik/.test(title))
    return { tone: 'danger', icon: <GlyphFlag /> };
  if (/sulama|\bsu\b/.test(title))
    return { tone: 'today', icon: <GlyphDrop /> };
  if (/sistem|güncelle|ayar/.test(title))
    return { tone: 'purple', icon: <GlyphGearMini /> };

  if (/onayland|tamamland/.test(body) && !/yeni|oluştur|atandı/.test(title))
    return { tone: 'success', icon: <GlyphCheck /> };
  if (/düzeltme|redded|eksik/.test(body))
    return { tone: 'danger', icon: <GlyphFlag /> };
  if (/oluşturuldu|size atandı|yeni görev/.test(body))
    return { tone: 'wait', icon: <GlyphPlus /> };
  if (/sulama|\bsu\b/.test(body))
    return { tone: 'today', icon: <GlyphDrop /> };

  return { tone: 'primary', icon: <GlyphDot /> };
}

export function NotificationsScreen() {
  const { authFetch } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
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

  const visible = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !n.isRead) : items),
    [items, filter],
  );

  const unreadCount = useMemo(
    () => items.filter((n) => !n.isRead).length,
    [items],
  );

  const markAllRead = async () => {
    try {
      await authFetch('/api/notifications/read-all', { method: 'POST' });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      Alert.alert('Hata', 'Bildirimler işaretlenemedi.');
    }
  };

  const openMenu = () => {
    Alert.alert('Bildirimler', undefined, [
      {
        text: 'Tümünü okundu say',
        onPress: () => void markAllRead(),
        style: unreadCount === 0 ? 'cancel' : 'default',
      },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const openNotification = async (item: NotificationDto) => {
    if (!item.isRead) {
      try {
        await authFetch(`/api/notifications/${item.id}/read`, {
          method: 'POST',
        });
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
      } catch {
        // navigate anyway
      }
    }

    const type = (item.relatedEntityType ?? '').toLowerCase();
    const id = item.relatedEntityId;
    if (
      id &&
      (type === 'task' || type.includes('task') || type.includes('gorev'))
    ) {
      navigation.navigate('GorevDetay', { taskId: id });
      return;
    }
    if (
      id &&
      (type.includes('conversation') ||
        type.includes('message') ||
        type.includes('sohbet'))
    ) {
      navigation.navigate('SohbetKonu', { conversationId: id });
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        <Pressable
          onPress={openMenu}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Menü"
        >
          <IconMore color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.segmentWrap}>
        <SegmentTabs
          value={filter}
          onChange={(k) => setFilter(k as 'all' | 'unread')}
          options={[
            { key: 'all', label: 'Tümü' },
            { key: 'unread', label: 'Okunmamış' },
          ]}
        />
      </View>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={visible.length === 0 ? styles.flex : styles.list}
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
            title={
              filter === 'unread'
                ? 'Okunmamış bildirim yok'
                : 'Bildirim yok'
            }
            body="Yeni bildirim gelince burada görünür."
          />
        }
        renderItem={({ item }) => {
          const vis = notifVisual(item);
          return (
            <Pressable
              onPress={() => void openNotification(item)}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
              accessibilityRole="button"
            >
              <IconCircle tone={vis.tone}>{vis.icon}</IconCircle>
              <View style={styles.rowBody}>
                <View style={styles.titleRow}>
                  <Text
                    style={[styles.title, !item.isRead && styles.titleUnread]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.time}>
                    {relativeTime(item.createdAtUtc)}
                  </Text>
                </View>
                <Text style={styles.preview} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
              {!item.isRead ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { ...typography.screenTitle },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentWrap: {
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxxl,
  },
  flex: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.bgWarm },
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
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
});
