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
  taskStatusLabel,
} from '../utils/taskStatus';
import * as ImagePicker from 'expo-image-picker';
import { enqueuePhotoUpload } from '../offline/photoQueue';

export function TaskDetailScreen() {
  const { authFetch, accessToken, refreshToken, user } = useAuth();
  const officer = isOfficer(user?.roles);
  const route = useRoute<RouteProp<RootStackParamList, 'TaskDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [task, setTask] = useState<TaskDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [quantity, setQuantity] = useState('');
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

  const approved = isApproved(task.status);
  const awaiting = isAwaitingApproval(task.status);
  const needsRevision = isNeedsRevision(task.status);
  const overdue = isOverdueTask(task.status, task.dueDate);
  const serverPhotoCount = task.photoCount ?? task.photos?.length ?? 0;
  const hasPhoto = serverPhotoCount > 0 || localPhotos.length > 0;
  const needsPhoto = task.requiresPhoto && !hasPhoto;
  const needsQuantity = Boolean(task.requiresQuantity);
  const quantityOk = !needsQuantity || quantity.trim().length > 0;
  // Producer cannot edit after submit; officer acts on awaiting.
  const closed = approved || (awaiting && !officer);
  const canSubmit = !officer && !closed && !needsPhoto && quantityOk;
  const statusText = taskStatusLabel(task, overdue);

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
      navigation.navigate('ChatThread', { conversationId: thread.id });
    } catch (e) {
      setActionError(
        e instanceof ApiError ? e.message : 'Sohbet açılamadı.',
      );
    }
  };

  const buildNotes = () =>
    [
      'Mobil uygulamadan gönderildi',
      needsQuantity && quantity.trim()
        ? `Miktar: ${quantity.trim()}${task.quantityUnit ? ` ${task.quantityUnit}` : ''}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ');

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
    } catch (e) {
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
    navigation.navigate('CapturePhoto', {
      taskId: task.id,
      notes: buildNotes(),
    });
  };

  const goComplete = () => {
    if (!canSubmit) return;
    navigation.navigate('CompleteTask', {
      taskId: task.id,
      photoAttached: hasPhoto || !task.requiresPhoto,
      notes: buildNotes(),
    });
  };

  const guidance = task.description?.trim();
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
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{task.title}</Text>
        <Text
          style={[
            styles.metaLine,
            awaiting && styles.metaWarn,
            approved && styles.metaOk,
            overdue && !closed && styles.metaDanger,
          ]}
        >
          {[statusText, task.dueDate ? formatDueLabel(task.dueDate) : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        {guidance ? <Text style={styles.body}>{guidance}</Text> : null}

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

        {approved ? (
          <Text style={styles.hint}>
            Onaylandı
            {task.completedAtUtc
              ? ` · ${new Date(task.completedAtUtc).toLocaleDateString('tr-TR')}`
              : ''}
          </Text>
        ) : null}

        {needsRevision && task.revisionReason ? (
          <Text style={[styles.hint, styles.metaWarn]}>
            Düzeltme: {task.revisionReason}
          </Text>
        ) : null}

        {needsRevision && !officer ? (
          <Text style={[styles.hint, styles.metaWarn]}>
            Uzman düzeltme istedi — fotoğrafı yenile ve tekrar gönder
          </Text>
        ) : null}

        {awaiting && officer ? (
          <Text style={[styles.hint, styles.metaWarn]}>
            Kanıtı kontrol et — onayla veya düzeltme iste
          </Text>
        ) : null}

        {awaiting && !officer ? (
          <Text style={[styles.hint, styles.metaWarn]}>
            Uzmana gönderildi — onay gelince burada
          </Text>
        ) : null}

        {officer && awaiting ? (
          <View style={styles.actions}>
            {(photoUrls.length > 0 || localPhotos.length > 0) && (
              <View style={styles.field}>
                <Text style={styles.label}>Kanıt fotoğrafları</Text>
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
                <Text style={styles.label}>Düzeltme nedeni</Text>
                <TextInput
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Örn. Fotoğraf net değil, yakından çekin"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  multiline
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
              <View style={styles.field}>
                <Text style={styles.label}>
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

            {(task.requiresPhoto || photoUrls.length > 0 || localPhotos.length > 0) && (
              <View style={styles.field}>
                <Text style={styles.label}>
                  {task.requiresPhoto ? 'Fotoğraf (gerekli)' : 'Fotoğraf'}
                </Text>
                <View style={styles.photos}>
                  {photoUrls.map((uri) => (
                    <Image key={uri} source={{ uri }} style={styles.thumb} />
                  ))}
                  {localPhotos.map((uri) => (
                    <Image key={uri} source={{ uri }} style={styles.thumb} />
                  ))}
                </View>
              </View>
            )}

            {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

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
                  navigation.navigate('AskExpert', {
                    taskId: task.id,
                    landId: task.landId,
                  })
                }
              />

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate('ReportProblem', {
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
                navigation.navigate('AskExpert', {
                  taskId: task.id,
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
    gap: spacing.sm,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 26,
  },
  metaLine: {
    ...typography.helper,
    marginBottom: spacing.md,
  },
  metaWarn: { color: colors.warning, fontWeight: '600' },
  metaOk: { color: colors.success, fontWeight: '600' },
  metaDanger: { color: colors.danger, fontWeight: '600' },
  body: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  guidanceImage: {
    width: '100%',
    height: 200,
    borderRadius: radii.lg,
    backgroundColor: colors.bgWarm,
    marginBottom: spacing.md,
  },
  videoBtn: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  videoBtnText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  hint: {
    ...typography.helper,
    marginBottom: spacing.md,
  },
  field: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  label: {
    ...typography.caption,
  },
  input: {
    minHeight: tap.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    backgroundColor: colors.surface,
    color: colors.text,
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
    marginTop: spacing.sm,
  },
  actions: {
    marginTop: spacing.xl,
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
