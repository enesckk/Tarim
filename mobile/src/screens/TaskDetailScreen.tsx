import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { isOfficer } from '../auth/roles';
import {
  ApiError,
  type ConversationListItem,
  type TaskDto,
  uploadTaskPhoto,
} from '../api/client';
import { API_BASE_URL } from '../api/config';
import { StatusBadge } from '../components/design';
import {
  EmptyState,
  LoadingBlock,
  PrimaryButton,
  Screen,
} from '../components/ui';
import { colors, radii, spacing, tap, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { formatDueLabel, isOverdueTask } from '../utils/dueDate';
import {
  isApproved,
  isAwaitingApproval,
  isNeedsRevision,
  taskBadge,
} from '../utils/taskStatus';
import * as ImagePicker from 'expo-image-picker';
import { enqueuePhotoUpload } from '../offline/photoQueue';

function meaningfulText(value?: string | null) {
  const t = value?.trim() ?? '';
  if (t.length < 2) return null;
  // Tek harf / anlamsız placeholder (ör. "x") gösterme
  if (/^[a-zA-ZığüşöçİĞÜŞÖÇ]$/u.test(t)) return null;
  return t;
}

export function TaskDetailScreen() {
  const { authFetch, accessToken, refreshToken, user } = useAuth();
  const officer = isOfficer(user?.roles);
  const route = useRoute<RouteProp<RootStackParamList, 'GorevDetay'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [task, setTask] = useState<TaskDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [producerNote, setProducerNote] = useState('');
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

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
      <Screen edges={['left', 'right', 'bottom']}>
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

  const approved = isApproved(task.status);
  const awaiting = isAwaitingApproval(task.status);
  const needsRevision = isNeedsRevision(task.status);
  const overdue = isOverdueTask(task.status, task.dueDate);
  const badge = taskBadge(task, overdue);
  const serverPhotoCount = task.photoCount ?? task.photos?.length ?? 0;
  const hasPhoto = serverPhotoCount > 0;
  const pendingLocalPhoto = localPhotos.length > 0 && serverPhotoCount === 0;
  const needsPhoto = task.requiresPhoto && !hasPhoto;
  const needsQuantity = Boolean(task.requiresQuantity);
  const quantityOk = !needsQuantity || quantity.trim().length > 0;
  const closed = approved || (awaiting && !officer);
  const canSubmit = !officer && !closed && !needsPhoto && quantityOk;
  const guidance = meaningfulText(task.description);
  const revisionReason = meaningfulText(task.revisionReason);

  const buildNotes = () =>
    [
      producerNote.trim() || null,
      needsQuantity && quantity.trim()
        ? `Miktar: ${quantity.trim()}${task.quantityUnit ? ` ${task.quantityUnit}` : ''}`
        : null,
      'Mobil uygulamadan gönderildi',
    ]
      .filter(Boolean)
      .join('\n');

  const approve = async () => {
    setSaving(true);
    setActionError(null);
    try {
      await authFetch(`/api/tasks/${task.id}/approve`, { method: 'POST' });
      Alert.alert('Onaylandı', 'Görev onaylandı. Üreticiye bildirildi.', [
        { text: 'Tamam', onPress: () => navigation.popToTop() },
      ]);
    } catch (e) {
      setActionError(
        e instanceof ApiError ? e.message : 'Görev onaylanamadı.',
      );
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      setActionError('Düzeltme nedeni yazın.');
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await authFetch(`/api/tasks/${task.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      Alert.alert('Düzeltme istendi', 'Üreticiye bildirildi.', [
        { text: 'Tamam', onPress: () => navigation.popToTop() },
      ]);
    } catch (e) {
      setActionError(
        e instanceof ApiError ? e.message : 'Düzeltme isteği gönderilemedi.',
      );
    } finally {
      setSaving(false);
    }
  };

  const openProducerChat = async () => {
    setActionError(null);
    try {
      const threads = await authFetch<ConversationListItem[]>(
        `/api/lands/${task.landId}/conversations`,
      );
      const thread = threads[0];
      if (!thread) {
        Alert.alert(
          'Sohbet yok',
          'Üretici henüz bu arazi için sohbet başlatmamış. Sohbet sekmesinden mevcut yazışmalara bakabilirsiniz.',
        );
        return;
      }
      navigation.navigate('SohbetKonu', { conversationId: thread.id });
    } catch (e) {
      setActionError(
        e instanceof ApiError ? e.message : 'Sohbet açılamadı.',
      );
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setSaving(true);
    setActionError(null);
    try {
      await uploadTaskPhoto(task.id, asset.uri, accessToken, refreshToken, {
        fileName: asset.fileName ?? undefined,
        contentType: asset.mimeType ?? undefined,
      });
      setLocalPhotos((prev) => [...prev, asset.uri]);
      await load();
    } catch {
      await enqueuePhotoUpload({
        taskId: task.id,
        localUri: asset.uri,
        fileName: asset.fileName ?? undefined,
        contentType: asset.mimeType ?? undefined,
      });
      setLocalPhotos((prev) => [...prev, asset.uri]);
      setActionError(
        'Bağlantı yok — fotoğraf kuyruğa alındı, sonra yüklenecek.',
      );
    } finally {
      setSaving(false);
    }
  };

  const goCapture = () => {
    if (needsQuantity && !quantityOk) {
      setActionError('Önce miktarı girin.');
      return;
    }
    navigation.navigate('FotografCek', {
      taskId: task.id,
      notes: buildNotes(),
    });
  };

  const goComplete = () => {
    if (!canSubmit) return;
    navigation.navigate('OnayaGonder', {
      taskId: task.id,
      photoAttached: hasPhoto,
      notes: buildNotes(),
    });
  };

  const videoUrl = task.videoUrl?.trim() || null;
  const imageRaw = task.imageUrl?.trim() || null;
  const guidanceImage = imageRaw
    ? imageRaw.startsWith('http')
      ? imageRaw
      : `${API_BASE_URL}/${imageRaw.replace(/^\//, '')}`
    : null;
  const photoUrls =
    task.photos?.map((p) =>
      p.storageKey.startsWith('http')
        ? p.storageKey
        : `${API_BASE_URL}/${p.storageKey.replace(/^\//, '')}`,
    ) ?? [];

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.title}>{task.title}</Text>
            <StatusBadge label={badge.label} tone={badge.tone} />
          </View>
          {task.dueDate ? (
            <Text
              style={[
                styles.dueLine,
                overdue && !closed && styles.dueDanger,
                approved && styles.dueOk,
              ]}
            >
              {formatDueLabel(task.dueDate)}
            </Text>
          ) : null}
          {task.landName ? (
            <Text style={styles.landLine}>{task.landName}</Text>
          ) : null}
        </View>

        {guidance ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Açıklama</Text>
            <Text style={styles.cardBody}>{guidance}</Text>
          </View>
        ) : null}

        {guidanceImage ? (
          <Image
            source={{ uri: guidanceImage }}
            style={styles.guidanceImage}
            accessibilityLabel="Eğitim görseli"
          />
        ) : null}

        {videoUrl ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(videoUrl)}
            style={styles.videoBtn}
          >
            <Text style={styles.videoBtnText}>Eğitim videosunu aç</Text>
          </Pressable>
        ) : null}

        {needsRevision && !officer ? (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Düzeltme istendi</Text>
            {revisionReason ? (
              <Text style={styles.alertBody}>{revisionReason}</Text>
            ) : null}
            <Text style={styles.alertHint}>
              Fotoğrafı yenileyip tekrar onaya gönderin.
            </Text>
          </View>
        ) : null}

        {approved ? (
          <View style={[styles.card, styles.okCard]}>
            <Text style={styles.okTitle}>Onaylandı</Text>
            {task.completedAtUtc ? (
              <Text style={styles.okBody}>
                {new Date(task.completedAtUtc).toLocaleDateString('tr-TR')}
              </Text>
            ) : null}
          </View>
        ) : null}

        {awaiting && !officer ? (
          <View style={styles.waitCard}>
            <Text style={styles.waitTitle}>Uzman onayı bekleniyor</Text>
            <Text style={styles.waitBody}>
              Gönderiniz incelenir; sonuç burada ve bildirimlerde görünür.
            </Text>
          </View>
        ) : null}

        {awaiting && officer ? (
          <View style={styles.waitCard}>
            <Text style={styles.waitTitle}>Onay bekliyor</Text>
            <Text style={styles.waitBody}>
              Kanıtı kontrol edin — onaylayın veya düzeltme isteyin.
            </Text>
          </View>
        ) : null}

        {officer && awaiting ? (
          <View style={styles.actions}>
            {(photoUrls.length > 0 || localPhotos.length > 0) && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Kanıt fotoğrafları</Text>
                <View style={styles.photos}>
                  {photoUrls.map((uri) => (
                    <Image key={uri} source={{ uri }} style={styles.thumb} />
                  ))}
                </View>
              </View>
            )}
            {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
            {!showReject ? (
              <>
                <PrimaryButton
                  label="Görevi onayla"
                  onPress={() => void approve()}
                  loading={saving}
                />
                <PrimaryButton
                  label="Düzeltme iste"
                  tone="secondary"
                  onPress={() => setShowReject(true)}
                />
                <PrimaryButton
                  label="Üreticiye yaz"
                  tone="secondary"
                  onPress={() => void openProducerChat()}
                />
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Düzeltme nedeni</Text>
                <TextInput
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Örn. Fotoğraf net değil, yakından çekin"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.area]}
                  multiline
                  textAlignVertical="top"
                />
                <PrimaryButton
                  label="Üreticiye gönder"
                  tone="danger"
                  onPress={() => void reject()}
                  loading={saving}
                />
                <PrimaryButton
                  label="Vazgeç"
                  tone="secondary"
                  onPress={() => {
                    setShowReject(false);
                    setRejectReason('');
                  }}
                />
              </>
            )}
          </View>
        ) : null}

        {!closed && !officer ? (
          <>
            {needsQuantity ? (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>
                  {task.quantityUnit
                    ? `Miktar (${task.quantityUnit})`
                    : 'Miktar'}
                </Text>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                  style={styles.input}
                  placeholder="Örn. 25"
                  placeholderTextColor={colors.muted}
                />
              </View>
            ) : null}

            {(task.requiresPhoto ||
              photoUrls.length > 0 ||
              localPhotos.length > 0) && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>
                  {task.requiresPhoto ? 'Fotoğraf (gerekli)' : 'Fotoğraf'}
                </Text>
                {photoUrls.length > 0 || localPhotos.length > 0 ? (
                  <View style={styles.photos}>
                    {photoUrls.map((uri) => (
                      <Image key={uri} source={{ uri }} style={styles.thumb} />
                    ))}
                    {localPhotos.map((uri) => (
                      <Image key={uri} source={{ uri }} style={styles.thumb} />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.cardHint}>
                    Onaya göndermeden önce fotoğraf ekleyin.
                  </Text>
                )}
              </View>
            )}

            {!needsPhoto ? (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Açıklama (isteğe bağlı)</Text>
                <TextInput
                  value={producerNote}
                  onChangeText={setProducerNote}
                  placeholder="Uzmana not yazın…"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.area]}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            ) : null}

            {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
            {pendingLocalPhoto ? (
              <Text style={styles.error}>
                Fotoğraf henüz sunucuya yüklenmedi. Bağlantı gelince yükleyin;
                onaya göndermek için sunucu fotoğrafı gerekli.
              </Text>
            ) : null}

            <View style={styles.actions}>
              {needsPhoto ? (
                <>
                  <PrimaryButton
                    label="Fotoğraf çek"
                    onPress={goCapture}
                    disabled={needsQuantity && !quantityOk}
                  />
                  <PrimaryButton
                    label="Galeriden seç"
                    tone="secondary"
                    onPress={() => void pickFromGallery()}
                    loading={saving}
                    disabled={needsQuantity && !quantityOk}
                  />
                </>
              ) : (
                <>
                  <PrimaryButton
                    label="Onaya gönder"
                    onPress={goComplete}
                    disabled={!canSubmit}
                  />
                  {task.requiresPhoto ? (
                    <PrimaryButton
                      label="Başka fotoğraf çek"
                      tone="secondary"
                      onPress={goCapture}
                    />
                  ) : null}
                </>
              )}

              <PrimaryButton
                label="Uzmana sor"
                tone="secondary"
                onPress={() =>
                  navigation.navigate('UzmanaSor', {
                    taskId: task.id,
                    taskTitle: task.title,
                    landId: task.landId,
                  })
                }
              />

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate('SorunBildir', {
                    taskId: task.id,
                    taskTitle: task.title,
                    landId: task.landId,
                  })
                }
                style={styles.linkBtn}
              >
                <Text style={styles.linkText}>Sorun bildir</Text>
              </Pressable>
            </View>
          </>
        ) : !officer ? (
          <View style={styles.actions}>
            <PrimaryButton
              label="Uzmana sor"
              tone="secondary"
              onPress={() =>
                navigation.navigate('UzmanaSor', {
                  taskId: task.id,
                  taskTitle: task.title,
                  landId: task.landId,
                })
              }
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 24,
    flex: 1,
  },
  dueLine: {
    ...typography.helper,
    fontWeight: '600',
  },
  dueDanger: { color: colors.danger },
  dueOk: { color: colors.success },
  landLine: {
    ...typography.caption,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardLabel: {
    ...typography.label,
  },
  cardBody: {
    ...typography.body,
  },
  cardHint: {
    ...typography.helper,
  },
  okCard: {
    backgroundColor: colors.successSoft,
    borderColor: colors.primarySoft,
  },
  okTitle: {
    ...typography.bodyStrong,
    color: colors.success,
  },
  okBody: {
    ...typography.helper,
    color: colors.success,
  },
  alertCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#FFCC80',
    gap: spacing.sm,
  },
  alertTitle: {
    ...typography.bodyStrong,
    color: colors.warning,
  },
  alertBody: {
    ...typography.body,
    color: colors.text,
  },
  alertHint: {
    ...typography.helper,
    color: colors.warning,
    fontWeight: '600',
  },
  waitCard: {
    backgroundColor: colors.badgeTodaySoft,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  waitTitle: {
    ...typography.bodyStrong,
    color: colors.badgeToday,
  },
  waitBody: {
    ...typography.helper,
  },
  guidanceImage: {
    width: '100%',
    height: 200,
    borderRadius: radii.lg,
    backgroundColor: colors.bgWarm,
  },
  videoBtn: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  videoBtnText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: 4,
  },
  input: {
    minHeight: tap.primary,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    backgroundColor: colors.bg,
    color: colors.text,
  },
  area: {
    minHeight: 110,
    paddingTop: spacing.md,
  },
  photos: {
    gap: spacing.sm,
  },
  thumb: {
    width: '100%',
    height: 180,
    borderRadius: radii.lg,
    backgroundColor: colors.bgWarm,
  },
  error: {
    color: colors.danger,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.md,
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
