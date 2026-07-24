import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import type { ConversationListItem } from '../api/client';
import { IconSearch } from '../components/icons';
import { EmptyState, LoadingBlock, Screen } from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';
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

function Avatar({ label }: { label: string }) {
  const initial = (label.trim()[0] || 'U').toLocaleUpperCase('tr-TR');
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

export function MessagesScreen() {
  const { authFetch } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

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

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return items;
    return items.filter((i) => {
      const hay = `${i.subject} ${i.lastMessagePreview ?? ''}`.toLocaleLowerCase(
        'tr-TR',
      );
      return hay.includes(q);
    });
  }, [items, query]);

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

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sohbet</Text>
        <Pressable
          onPress={() => {
            setSearchOpen((v) => !v);
            if (searchOpen) setQuery('');
          }}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Ara"
        >
          <IconSearch color={colors.text} />
        </Pressable>
      </View>

      {searchOpen ? (
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Konuşmalarda ara"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoFocus
            autoCorrect={false}
          />
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
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
        ListHeaderComponent={
          <View style={styles.hero}>
            <View style={styles.heroArt}>
              <View style={styles.hillBack} />
              <View style={styles.hillFront} />
              <View style={styles.bubble}>
                <View style={styles.bubbleDot} />
                <View style={styles.bubbleDot} />
                <View style={styles.bubbleDot} />
              </View>
            </View>
            <Text style={styles.heroTitle}>Uzmanlarımıza sor</Text>
            <Text style={styles.heroBody}>
              Tarımla ilgili her şeyi sorabilirsiniz — sulama, hastalık, gübre.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('UzmanaSor', {})}
              style={({ pressed }) => [
                styles.askBtn,
                pressed && styles.askBtnPressed,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.askBtnText}>Uzmana sor</Text>
            </Pressable>
            {filtered.length > 0 ? (
              <Text style={styles.sectionLabel}>Son konuşmalar</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyHint}>
            {query.trim()
              ? 'Aramayla eşleşen konuşma yok.'
              : 'Henüz konuşma yok — ilk sorunu yaz.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate('SohbetKonu', { conversationId: item.id })
            }
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            accessibilityRole="button"
          >
            <Avatar label={item.subject} />
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
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessagePreview || 'Henüz mesaj yok'}
              </Text>
            </View>
            {item.hasUnread ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        )}
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
  searchWrap: {
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxxl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroArt: {
    width: '100%',
    height: 140,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    justifyContent: 'flex-end',
  },
  hillBack: {
    position: 'absolute',
    left: -20,
    right: 40,
    bottom: 0,
    height: 70,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    backgroundColor: '#A5C9A8',
  },
  hillFront: {
    position: 'absolute',
    left: 60,
    right: -10,
    bottom: 0,
    height: 55,
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
    backgroundColor: colors.primary,
    opacity: 0.55,
  },
  bubble: {
    position: 'absolute',
    right: 28,
    top: 28,
    width: 52,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  bubbleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  heroTitle: {
    ...typography.sectionTitle,
    textAlign: 'center',
  },
  heroBody: {
    ...typography.helper,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    maxWidth: 300,
  },
  askBtn: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  askBtnPressed: { opacity: 0.9 },
  askBtnText: {
    ...typography.button,
    color: colors.onPrimary,
  },
  sectionLabel: {
    alignSelf: 'stretch',
    ...typography.sectionTitle,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  emptyHint: {
    ...typography.helper,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.bgWarm },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
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
  preview: {
    ...typography.helper,
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
