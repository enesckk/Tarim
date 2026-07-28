import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import type { LandDto, TaskDto } from '../api/client';
import {
  LeafMark,
  SegmentTabs,
  StatusBadge,
  TaskGlyph,
} from '../components/design';
import { IconBell, IconCalendar } from '../components/icons';
import { EmptyState, LoadingBlock, Screen } from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import {
  daysUntilDue,
  formatDueLabel,
  isOverdueTask,
  parseDueDate,
  shortDueLabel,
} from '../utils/dueDate';
import {
  isApproved,
  isAwaitingApproval,
  isNeedsRevision,
  isOpenWorkStatus,
  taskBadge,
} from '../utils/taskStatus';
import { themeLabel, themeMinPhotos } from '../utils/taskThemes';

type SubTab = 'yapilacaklar' | 'surec';

function taskMetaLine(task: TaskDto, land?: LandDto | null) {
  const crop = land?.activeCropType?.trim();
  const landName = (land?.name ?? task.landName)?.trim();
  const parts = [crop, landName].filter(Boolean);
  return parts.length > 0 ? [...new Set(parts)].join(' · ') : 'Görev';
}

function taskNote(task: TaskDto): string | null {
  const revision = task.revisionReason?.trim();
  if (revision) return revision;
  const description = task.description?.trim();
  if (description) return description;
  return null;
}

function taskDetailChips(task: TaskDto): string[] {
  const chips: string[] = [];
  const theme = themeLabel(task.theme);
  if (theme) chips.push(theme);
  const minPhotos = task.theme
    ? themeMinPhotos(task.theme)
    : task.requiresPhoto
      ? 1
      : 0;
  if (minPhotos > 0) {
    chips.push(minPhotos > 1 ? `${minPhotos} fotoğraf` : 'Fotoğraf');
  }
  if (task.videoUrl?.trim() || task.imageUrl?.trim()) chips.push('Eğitim linki');
  if (task.plannedEvidenceJson?.trim()) chips.push('Hedef değer');
  return chips;
}

/** Absolute due text: "20.03.2026 tarihine kadar" */
function dueUntilLabel(task: TaskDto): string {
  if (!task.dueDate) return 'Son tarih belirtilmedi';
  const due = parseDueDate(task.dueDate);
  if (!due) return formatDueLabel(task.dueDate);
  const formatted = due.toLocaleDateString('tr-TR');
  const diff = daysUntilDue(task.dueDate);
  if (diff == null) return `${formatted} tarihine kadar`;
  if (diff < 0) return `${formatted} tarihine kadar · ${shortDueLabel(task.dueDate)}`;
  if (diff === 0) return `Bugün yapılmalı · ${formatted}`;
  if (diff === 1) return `Yarın yapılmalı · ${formatted}`;
  return `${formatted} tarihine kadar · ${diff} gün kaldı`;
}

/**
 * Yapılacaklar: geciken / düzeltme istenenler + her arazide sıradaki açık görev.
 */
function buildYapilacaklar(allTasks: TaskDto[]): TaskDto[] {
  const open = allTasks.filter((t) => isOpenWorkStatus(t.status));
  const mustShow = open.filter(
    (t) => isNeedsRevision(t.status) || isOverdueTask(t.status, t.dueDate),
  );

  const byLand = new Map<string, TaskDto[]>();
  for (const t of open) {
    const list = byLand.get(t.landId) ?? [];
    list.push(t);
    byLand.set(t.landId, list);
  }

  const nextByLand: TaskDto[] = [];
  for (const list of byLand.values()) {
    const sorted = [...list].sort((a, b) => {
      const aRev = isNeedsRevision(a.status) ? 0 : 1;
      const bRev = isNeedsRevision(b.status) ? 0 : 1;
      if (aRev !== bRev) return aRev - bRev;
      const aOver = isOverdueTask(a.status, a.dueDate) ? 0 : 1;
      const bOver = isOverdueTask(b.status, b.dueDate) ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
    });
    if (sorted[0]) nextByLand.push(sorted[0]);
  }

  const sortKey = (t: TaskDto) => {
    if (isNeedsRevision(t.status)) return `0-${t.dueDate ?? '9999'}`;
    if (isOverdueTask(t.status, t.dueDate)) return `1-${t.dueDate ?? '9999'}`;
    return `2-${t.dueDate ?? '9999'}`;
  };

  const seen = new Set<string>();
  const result: TaskDto[] = [];
  for (const t of [...mustShow, ...nextByLand].sort((a, b) =>
    sortKey(a).localeCompare(sortKey(b)),
  )) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    result.push(t);
  }
  return result;
}

function TaskCard({
  task,
  land,
  onOpen,
}: {
  task: TaskDto;
  land?: LandDto | null;
  onOpen: () => void;
}) {
  const overdue = isOverdueTask(task.status, task.dueDate);
  const badge = taskBadge(task, overdue);
  const note = taskNote(task);
  const dueLine = dueUntilLabel(task);
  const chips = taskDetailChips(task);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardTop}>
        <TaskGlyph title={task.title} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {task.title}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {taskMetaLine(task, land)}
          </Text>
        </View>
        <StatusBadge label={badge.label} tone={badge.tone} />
      </View>
      <Text
        style={[styles.dueLine, overdue || isNeedsRevision(task.status) ? styles.dueLineUrgent : null]}
        numberOfLines={2}
      >
        {dueLine}
      </Text>
      {chips.length > 0 ? (
        <View style={styles.chipRow}>
          {chips.map((c) => (
            <View key={c} style={styles.chip}>
              <Text style={styles.chipText}>{c}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {note ? (
        <Text style={styles.noteLine} numberOfLines={4}>
          {note}
        </Text>
      ) : null}
    </Pressable>
  );
}

function TimelineRow({
  task,
  land,
  timeLabel,
  isLast,
  onOpen,
}: {
  task: TaskDto;
  land?: LandDto | null;
  timeLabel: string;
  isLast: boolean;
  onOpen: () => void;
}) {
  const overdue = isOverdueTask(task.status, task.dueDate);
  const badge = taskBadge(task, overdue);
  const note = taskNote(task);
  const chips = taskDetailChips(task);

  return (
    <Pressable
      onPress={onOpen}
      style={styles.tlRow}
      accessibilityRole="button"
    >
      <View style={styles.tlRail}>
        <Text style={styles.tlTime}>{timeLabel}</Text>
        <View style={styles.tlDot} />
        {!isLast ? <View style={styles.tlLine} /> : null}
      </View>
      <View style={styles.tlCard}>
        <View style={styles.tlCardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {task.title}
          </Text>
          <StatusBadge label={badge.label} tone={badge.tone} />
        </View>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {taskMetaLine(task, land)}
        </Text>
        {task.dueDate ? (
          <Text style={styles.tlDue} numberOfLines={1}>
            {dueUntilLabel(task)}
          </Text>
        ) : null}
        {chips.length > 0 ? (
          <View style={styles.chipRow}>
            {chips.map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {note ? (
          <Text style={styles.noteLine} numberOfLines={3}>
            {note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function formatTimelineLabel(task: TaskDto) {
  if (isApproved(task.status) && task.completedAtUtc) {
    const done = new Date(task.completedAtUtc);
    if (!Number.isNaN(done.getTime())) {
      return done.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  if (task.dueDate) {
    const diff = daysUntilDue(task.dueDate);
    if (diff === 0) return 'Bugün';
    if (diff === 1) return 'Yarın';
    if (diff != null && diff < 0) return 'Geç';
    const due = parseDueDate(task.dueDate);
    if (due) {
      return due.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
      });
    }
  }
  return '—';
}

function todayLabelTr() {
  return new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function TodayTasksScreen() {
  const { authFetch } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [subTab, setSubTab] = useState<SubTab>('yapilacaklar');
  const [allTasks, setAllTasks] = useState<TaskDto[]>([]);
  const [lands, setLands] = useState<LandDto[]>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const me = await authFetch<{ producerId?: string | null }>('/api/me');
      const pid = me.producerId ?? null;
      const [today, landsRes, notifs] = await Promise.all([
        authFetch<TaskDto[]>('/api/tasks/today'),
        authFetch<LandDto[]>('/api/lands'),
        authFetch<{ isRead: boolean }[]>('/api/notifications'),
      ]);
      setLands(landsRes);
      setNotifUnread(notifs.filter((n) => !n.isRead).length);
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

  const landById = useMemo(() => {
    const map = new Map<string, LandDto>();
    for (const l of lands) map.set(l.id, l);
    return map;
  }, [lands]);

  const overdue = useMemo(
    () => allTasks.filter((t) => isOpenWorkStatus(t.status) && isOverdueTask(t.status, t.dueDate)),
    [allTasks],
  );
  const actionList = useMemo(() => buildYapilacaklar(allTasks), [allTasks]);

  const processTimeline = useMemo(() => {
    const open = allTasks.filter((t) => isOpenWorkStatus(t.status));
    const awaiting = allTasks.filter((t) => isAwaitingApproval(t.status));
    const done = allTasks
      .filter((t) => isApproved(t.status))
      .sort((a, b) =>
        (b.completedAtUtc ?? '').localeCompare(a.completedAtUtc ?? ''),
      )
      .slice(0, 4);
    const sortByDue = (a: TaskDto, b: TaskDto) =>
      (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
    return [...open.sort(sortByDue), ...awaiting.sort(sortByDue), ...done];
  }, [allTasks]);

  const openCalendar = () => {
    if (Platform.OS === 'ios') {
      void Linking.openURL('calshow:');
    } else {
      void Linking.openURL('content://com.android.calendar/time/');
    }
  };

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

  const countLabel =
    actionList.length > 0
      ? overdue.length > 0
        ? `${actionList.length} görev · ${overdue.length} geciken`
        : `${actionList.length} görev sırada`
      : 'Şimdilik sıradaki iş yok';

  return (
    <Screen>
      <View style={styles.topBar}>
        <LeafMark />
        <Pressable
          onPress={() => navigation.navigate('AnaSekmeler', { screen: 'Bildirimler' })}
          style={styles.bellBtn}
          accessibilityRole="button"
          accessibilityLabel="Bildirimler"
        >
          <IconBell color={colors.text} />
          {notifUnread > 0 ? (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {notifUnread > 9 ? '9+' : String(notifUnread)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {subTab === 'yapilacaklar' ? (
        <>
          <View style={styles.headerBlock}>
            <Text style={styles.headerTitle}>Görevlerin</Text>
            <Text style={styles.headerSub}>{countLabel}</Text>
          </View>
          <View style={styles.segmentWrap}>
            <SegmentTabs
              value={subTab}
              onChange={(k) => setSubTab(k as SubTab)}
              options={[
                { key: 'yapilacaklar', label: 'Yapılacak' },
                { key: 'surec', label: 'Süreç' },
              ]}
            />
          </View>
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
            ListHeaderComponent={
              <Text style={styles.sectionLabel}>
                Sıradaki ve yapılmayanlar
              </Text>
            }
            ListEmptyComponent={
              <EmptyState
                title="Şimdilik boş"
                body="Sıradaki görev veya geciken iş olunca burada görünür."
              />
            }
            renderItem={({ item }) => (
              <TaskCard
                task={item}
                land={landById.get(item.landId)}
                onOpen={() =>
                  navigation.navigate('GorevDetay', { taskId: item.id })
                }
              />
            )}
          />
        </>
      ) : (
        <>
          <View style={styles.headerBlock}>
            <Text style={styles.headerTitle}>Bugün</Text>
          </View>
          <View style={styles.segmentWrap}>
            <SegmentTabs
              value={subTab}
              onChange={(k) => setSubTab(k as SubTab)}
              options={[
                { key: 'yapilacaklar', label: 'Yapılacak' },
                { key: 'surec', label: 'Süreç' },
              ]}
            />
          </View>
          <View style={styles.dateCard}>
            <Text style={styles.dateText}>{todayLabelTr()}</Text>
            <IconCalendar color={colors.text} />
          </View>
          <FlatList
            data={processTimeline}
            keyExtractor={(t) => t.id}
            contentContainerStyle={
              processTimeline.length === 0 ? styles.flex : styles.list
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
              <EmptyState title="Süreç boş" body="Açık adım yok." />
            }
            ListFooterComponent={
              processTimeline.length > 0 ? (
                <Pressable
                  onPress={openCalendar}
                  style={({ pressed }) => [
                    styles.calBtn,
                    pressed && styles.calBtnPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.calBtnText}>Takvimi aç</Text>
                </Pressable>
              ) : null
            }
            renderItem={({ item, index }) => (
              <TimelineRow
                task={item}
                land={landById.get(item.landId)}
                timeLabel={formatTimelineLabel(item)}
                isLast={index === processTimeline.length - 1}
                onOpen={() =>
                  navigation.navigate('GorevDetay', { taskId: item.id })
                }
              />
            )}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bellBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  headerBlock: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: { ...typography.screenTitle },
  headerSub: {
    ...typography.helper,
    marginTop: 4,
  },
  segmentWrap: {
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.sectionTitle,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxxl,
  },
  flex: { flexGrow: 1, paddingHorizontal: spacing.screen },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 8,
  },
  cardPressed: { backgroundColor: colors.bgWarm },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { ...typography.bodyStrong },
  cardMeta: {
    ...typography.caption,
    marginTop: 2,
  },
  dueLine: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  dueLineUrgent: {
    color: colors.danger,
  },
  noteLine: {
    ...typography.caption,
    color: colors.muted,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  tlDue: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 6,
  },
  dateCard: {
    marginHorizontal: spacing.screen,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dateText: { ...typography.bodyStrong },
  tlRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    minHeight: 88,
  },
  tlRail: {
    width: 64,
    alignItems: 'center',
  },
  tlTime: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
    fontSize: 12,
  },
  tlDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    zIndex: 1,
  },
  tlLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderStrong,
    marginTop: 2,
  },
  tlCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginLeft: spacing.sm,
  },
  tlCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  calBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calBtnPressed: { opacity: 0.9 },
  calBtnText: {
    ...typography.button,
    color: colors.onPrimary,
  },
});
