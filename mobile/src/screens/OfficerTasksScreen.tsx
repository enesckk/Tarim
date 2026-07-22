import React, { useCallback, useMemo, useState } from 'react';
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
import type { TaskDto } from '../api/client';
import { EmptyState, LoadingBlock, Screen } from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { TaskStatus } from '../utils/taskStatus';

export function OfficerTasksScreen() {
  const { authFetch } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      setTasks(await authFetch<TaskDto[]>('/api/tasks/pending-approval'));
    } catch {
      setError(true);
      setTasks([]);
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

  const awaiting = useMemo(
    () => tasks.filter((t) => t.status === TaskStatus.AwaitingApproval),
    [tasks],
  );

  if (loading) return <LoadingBlock />;
  if (error) {
    return (
      <Screen>
        <EmptyState
          title="Bağlantı yok"
          body="Onay kuyruğu yüklenemedi."
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
        <Text style={styles.headerTitle}>Onaylar</Text>
        <Text style={styles.directive}>
          {awaiting.length > 0
            ? `${awaiting.length} onay seni bekliyor — dokun ve bitir`
            : 'Şu an bekleyen onay yok'}
        </Text>
      </View>

      <FlatList
        data={awaiting}
        keyExtractor={(t) => t.id}
        contentContainerStyle={awaiting.length === 0 ? styles.flex : styles.list}
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
            title="Kuyruk boş"
            body="Üretici kanıt gönderince burada görünür."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {[item.landName, 'Onayla'].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
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
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.screenTitle,
  },
  directive: {
    ...typography.helper,
    marginTop: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxxl,
  },
  flex: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 72,
  },
  rowPressed: { backgroundColor: colors.bgWarm },
  rowBody: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  rowTitle: { ...typography.bodyStrong },
  rowMeta: {
    ...typography.caption,
    marginTop: 4,
    color: colors.primary,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 20,
    color: colors.borderStrong,
    fontWeight: '300',
  },
});
