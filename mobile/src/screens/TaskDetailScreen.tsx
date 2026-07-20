import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import type { TaskDto } from '../api/client';
import { EmptyState, LoadingBlock, PrimaryButton, Screen } from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { formatDueLabel } from '../utils/dueDate';

export function TaskDetailScreen() {
  const { authFetch } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'TaskDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [task, setTask] = useState<TaskDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await authFetch<TaskDto>(`/api/tasks/${route.params.taskId}`);
      setTask(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [authFetch, route.params.taskId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  if (loading) return <LoadingBlock />;
  if (error || !task) {
    return (
      <Screen>
        <EmptyState
          title="Görev yüklenemedi"
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

  const guidance = task.description?.trim();

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>{task.title}</Text>

        {guidance ? (
          <View style={styles.guidance}>
            <Text style={styles.guidanceLabel}>Dikkat edilecekler</Text>
            <Text style={styles.guidanceBody}>{guidance}</Text>
          </View>
        ) : null}

        {task.dueDate ? (
          <Text style={styles.meta}>{formatDueLabel(task.dueDate)}</Text>
        ) : null}
        {task.requiresPhoto ? (
          <View style={styles.note}>
            <Text style={styles.warning}>Bu görev için fotoğraf gerekli.</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {task.status === 2 ? (
            <Text style={styles.done}>Bu görev tamamlandı.</Text>
          ) : task.requiresPhoto ? (
            <PrimaryButton
              label="Fotoğraf çek"
              onPress={() => navigation.navigate('CapturePhoto', { taskId: task.id })}
            />
          ) : (
            <PrimaryButton
              label="Görevi tamamla"
              onPress={() => navigation.navigate('CompleteTask', { taskId: task.id })}
            />
          )}
          <PrimaryButton
            label="Uzmana sor"
            tone="secondary"
            onPress={() => navigation.navigate('AskExpert', { taskId: task.id })}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.screenTitle,
    marginBottom: spacing.md,
  },
  guidance: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.sageSoft,
  },
  guidanceLabel: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  guidanceBody: {
    ...typography.body,
    color: colors.text,
  },
  meta: {
    ...typography.bodyStrong,
    marginBottom: spacing.sm,
  },
  note: {
    backgroundColor: colors.warningSoft,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  warning: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.warning,
    lineHeight: 22,
  },
  actions: {
    marginTop: 'auto',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  done: {
    ...typography.bodyStrong,
    color: colors.success,
    marginBottom: spacing.sm,
  },
});
