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
import { isOverdueTask, shortDueLabel } from '../utils/dueDate';
import {
  isApproved,
  isAwaitingApproval,
  isOpenWorkStatus,
  taskStatusLabel,
} from '../utils/taskStatus';

type SubTab = 'yapilacaklar' | 'surec';

function TaskRow({
  task,
  onOpen,
}: {
  task: TaskDto;
  onOpen: () => void;
}) {
  const overdue = isOverdueTask(task.status, task.dueDate);
  const awaiting = isAwaitingApproval(task.status);
  const approved = isApproved(task.status);
  const label = taskStatusLabel(task, overdue);
  const due =
    task.dueDate && !approved && !awaiting ? shortDueLabel(task.dueDate) : null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {task.title}
        </Text>
        <Text
          style={[
            styles.rowMeta,
            overdue && !awaiting && !approved && styles.metaDanger,
            awaiting && styles.metaWarn,
          ]}
          numberOfLines={1}
        >
          {[label, due].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function TodayTasksScreen() {
  const { authFetch } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [subTab, setSubTab] = useState<SubTab>('yapilacaklar');
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [allTasks, setAllTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const me = await authFetch<{ producerId?: string | null }>('/api/me');
      const pid = me.producerId ?? null;
      const today = await authFetch<TaskDto[]>('/api/tasks/today');
      setTasks(today);
      if (pid) {
        setAllTasks(await authFetch<TaskDto[]>(`/api/tasks?producerId=${pid}`));
      } else {
        setAllTasks(today);
      }
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

  const overdue = useMemo(
    () => tasks.filter((t) => isOverdueTask(t.status, t.dueDate)),
    [tasks],
  );
  const todayOnly = useMemo(
    () => tasks.filter((t) => !isOverdueTask(t.status, t.dueDate)),
    [tasks],
  );
  const actionList = useMemo(() => [...overdue, ...todayOnly], [overdue, todayOnly]);

  const process = useMemo(() => {
    const awaiting = allTasks.filter((t) => isAwaitingApproval(t.status));
    const open = allTasks.filter((t) => isOpenWorkStatus(t.status));
    const done = allTasks
      .filter((t) => isApproved(t.status))
      .sort((a, b) => (b.completedAtUtc ?? '').localeCompare(a.completedAtUtc ?? ''))
      .slice(0, 6);
    return { awaiting, open, done };
  }, [allTasks]);

  const directive = useMemo(() => {
    if (subTab === 'surec') {
      if (process.awaiting.length > 0)
        return `${process.awaiting.length} görev onay bekliyor`;
      if (process.open.length > 0) return `${process.open.length} adım sürüyor`;
      return 'Süreçte açık adım yok';
    }
    if (overdue.length > 0) return `${overdue.length} geciken — önce bunlara bak`;
    if (todayOnly.length > 0) return `Bugün ${todayOnly.length} görev`;
    return 'Bugünlük işin tamam';
  }, [subTab, overdue.length, todayOnly.length, process]);

  if (loading) return <LoadingBlock />;
  if (error) {
    return (
      <Screen>
        <EmptyState
          title="Bağlantı yok"
          body="Tekrar dene — görevlerin burada."
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
        <Text style={styles.headerTitle}>
          {subTab === 'yapilacaklar' ? 'Bugün' : 'Süreç'}
        </Text>
        <Text style={styles.directive}>{directive}</Text>

        <View style={styles.segment}>
          {(
            [
              ['yapilacaklar', 'Yapılacak'],
              ['surec', 'Süreç'],
            ] as const
          ).map(([key, label]) => {
            const active = subTab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSubTab(key)}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {subTab === 'yapilacaklar' ? (
        <FlatList
          data={actionList}
          keyExtractor={(t) => t.id}
          contentContainerStyle={
            actionList.length === 0 ? styles.flex : styles.list
          }
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
              title="Bugünlük tamam"
              body="Yeni görev gelince burada görünür."
            />
          }
          renderItem={({ item }) => (
            <TaskRow
              task={item}
              onOpen={() => navigation.navigate('TaskDetail', { taskId: item.id })}
            />
          )}
        />
      ) : (
        <FlatList
          data={[{ key: 'timeline' }]}
          keyExtractor={(i) => i.key}
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
          renderItem={() => (
            <View style={styles.timeline}>
              <TimelineBlock
                title="Şimdi"
                empty="Açık adım yok"
                items={process.open}
                onOpen={(id) => navigation.navigate('TaskDetail', { taskId: id })}
              />
              <TimelineBlock
                title="Onay bekliyor"
                empty="Bekleyen yok"
                items={process.awaiting}
                onOpen={(id) => navigation.navigate('TaskDetail', { taskId: id })}
              />
              <TimelineBlock
                title="Tamamlanan"
                empty="Henüz onaylanan yok"
                items={process.done}
                onOpen={(id) => navigation.navigate('TaskDetail', { taskId: id })}
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

function TimelineBlock({
  title,
  empty,
  items,
  onOpen,
}: {
  title: string;
  empty: string;
  items: TaskDto[];
  onOpen: (id: string) => void;
}) {
  return (
    <View style={styles.tlBlock}>
      <Text style={styles.tlLabel}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.tlEmpty}>{empty}</Text>
      ) : (
        items.map((t) => (
          <TaskRow key={t.id} task={t} onOpen={() => onOpen(t.id)} />
        ))
      )}
    </View>
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
    marginBottom: spacing.lg,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.bgWarm,
    borderRadius: radii.md,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.sm,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.text,
    fontWeight: '600',
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
  rowPressed: {
    backgroundColor: colors.bgWarm,
  },
  rowBody: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  rowTitle: {
    ...typography.bodyStrong,
  },
  rowMeta: {
    ...typography.caption,
    marginTop: 4,
  },
  metaDanger: { color: colors.danger },
  metaWarn: { color: colors.warning },
  chevron: {
    fontSize: 20,
    color: colors.borderStrong,
    fontWeight: '300',
  },
  timeline: { gap: spacing.xxl },
  tlBlock: { gap: spacing.sm },
  tlLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  tlEmpty: {
    ...typography.helper,
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
  },
});
