import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import type { TaskDto } from '../api/client';
import { EmptyState, ListCard, LoadingBlock, Screen, ScreenHeader } from '../components/ui';
import { colors, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { formatDueLabel } from '../utils/dueDate';

function statusLabel(task: TaskDto): { text: string; color: string } {
  if (task.status === 3) return { text: 'Gecikti', color: colors.overdue };
  if (task.requiresPhoto) return { text: 'Fotoğraf gerekli', color: colors.warning };
  return { text: 'Yapılacak', color: colors.muted };
}

export function TodayTasksScreen() {
  const { authFetch } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await authFetch<TaskDto[]>('/api/tasks/today');
      setTasks(data);
    } catch {
      setError(true);
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
          title="Görevler yüklenemedi"
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
        title="Bugünün görevleri"
        subtitle="Bugün yapmanız gereken işler."
      />
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tasks.length === 0 ? styles.flex : styles.list}
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
            title="Bugün görev yok"
            body="Yeni görev geldiğinde burada görünecek."
          />
        }
        renderItem={({ item }) => {
          const status = statusLabel(item);
          return (
            <ListCard
              onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
            >
              <Text style={styles.rowTitle}>{item.title}</Text>
              {item.description?.trim() ? (
                <Text style={styles.rowGuidance} numberOfLines={2}>
                  {item.description.trim()}
                </Text>
              ) : null}
              <Text style={[styles.rowStatus, { color: status.color }]}>{status.text}</Text>
              {item.dueDate ? (
                <Text style={styles.rowMeta}>{formatDueLabel(item.dueDate)}</Text>
              ) : null}
            </ListCard>
          );
        }}
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
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  rowGuidance: {
    ...typography.helper,
    marginBottom: spacing.sm,
  },
  rowStatus: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
});
