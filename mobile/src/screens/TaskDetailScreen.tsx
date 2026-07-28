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
import { mediaUrl } from '../api/media';
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
import {
  compactEvidence,
  formatEvidenceEntries,
  parseOptionalNumber,
  themeLabel,
  themeMinPhotos,
  validateEvidence,
  type TaskEvidence,
} from '../utils/taskThemes';
import * as ImagePicker from 'expo-image-picker';
import { enqueuePhotoUpload } from '../offline/photoQueue';

function meaningfulText(value?: string | null) {
  const t = value?.trim() ?? '';
  if (t.length < 2) return null;
  // Tek harf / anlamsız placeholder (ör. "x") gösterme
  if (/^[a-zA-ZığüşöçİĞÜŞÖÇ]$/u.test(t)) return null;
  return t;
}

function parseLocalDateTime(raw: string): string | null {
  const t = raw.trim().replace(' ', 'T');
  if (!t) return null;
  const d = new Date(t.length === 16 ? `${t}:00` : t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
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

  // Tema bazlı kanıt alanları
  const [durationMinutes, setDurationMinutes] = useState('');
  const [waterAmount, setWaterAmount] = useState('');
  const [fertilizerName, setFertilizerName] = useState('');
  const [amount, setAmount] = useState('');
  const [pesticideName, setPesticideName] = useState('');
  const [dose, setDose] = useState('');
  const [seedlingCount, setSeedlingCount] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [crateCount, setCrateCount] = useState('');
  const [bakimDescription, setBakimDescription] = useState('');

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
  const theme = task.theme ?? null;
  const themed = Boolean(theme);
  const minPhotos = themed ? themeMinPhotos(theme) : task.requiresPhoto ? 1 : 0;
  const needsPhoto = minPhotos > 0 && serverPhotoCount < minPhotos;
  const needsQuantity = !themed && Boolean(task.requiresQuantity);
  const quantityOk = !needsQuantity || quantity.trim().length > 0;

  const buildEvidence = (): TaskEvidence => {
    switch (theme) {
      case 'Sulama':
        return {
          durationMinutes: parseOptionalNumber(durationMinutes),
          waterAmount: parseOptionalNumber(waterAmount),
          waterUnit: 'litre',
        };
      case 'Gubreleme':
        return {
          fertilizerName: fertilizerName.trim() || null,
          amount: parseOptionalNumber(amount),
          amountUnit: task.quantityUnit?.trim() || 'kg',
        };
      case 'Ilaclama':
        return {
          pesticideName: pesticideName.trim() || null,
          dose: dose.trim() || null,
          waterAmount: parseOptionalNumber(waterAmount),
          waterUnit: 'litre',
        };
      case 'Dikim':
        return {
          seedlingCount: parseOptionalNumber(seedlingCount),
          startedAt: parseLocalDateTime(startedAt),
          endedAt: parseLocalDateTime(endedAt),
        };
      case 'Hasat':
        return {
          productQuantity: parseOptionalNumber(productQuantity),
          productUnit: task.quantityUnit?.trim() || 'kg',
          crateCount: parseOptionalNumber(crateCount),
        };
      case 'Bakim':
        return { description: bakimDescription.trim() || null };
      default:
        return {};
    }
  };

  const evidenceOk =
    !themed || validateEvidence(theme, buildEvidence()) === null;
  const closed = approved || (awaiting && !officer);
  const canSubmit =
    !officer && !closed && !needsPhoto && quantityOk && evidenceOk;
  const guidance = meaningfulText(task.description);
  const revisionReason = meaningfulText(task.revisionReason);
  const themeName = themeLabel(theme);
  const plannedRows = formatEvidenceEntries(theme, task.plannedEvidenceJson, {
    planned: true,
  });
  const actualRows = formatEvidenceEntries(theme, task.evidenceJson);

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

  const ensureEvidenceReady = () => {
    if (!themed) return true;
    const msg = validateEvidence(theme, buildEvidence());
    if (msg) {
      setActionError(msg);
      return false;
    }
    return true;
  };

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
    if (!ensureEvidenceReady()) return;
    navigation.navigate('FotografCek', {
      taskId: task.id,
      notes: buildNotes(),
      evidence: themed ? compactEvidence(buildEvidence()) : undefined,
    });
  };

  const goComplete = () => {
    if (!ensureEvidenceReady()) return;
    if (!canSubmit) return;
    navigation.navigate('OnayaGonder', {
      taskId: task.id,
      photoAttached: hasPhoto,
      notes: buildNotes(),
      evidence: themed ? compactEvidence(buildEvidence()) : undefined,
    });
  };

  const videoUrl = task.videoUrl?.trim() || null;
  const imageRaw = task.imageUrl?.trim() || null;
  const guidanceImage = imageRaw ? mediaUrl(imageRaw, accessToken) : null;
  const photoUrls =
    task.photos?.map((p) => mediaUrl(p.storageKey, accessToken)) ?? [];

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
          {themeName ? (
            <Text style={styles.themeLine}>İşlem: {themeName}</Text>
          ) : null}
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

        {plannedRows.length > 0 ? (
          <View style={[styles.card, styles.plannedCard]}>
            <Text style={styles.cardLabel}>Planlanan (hedef)</Text>
            {plannedRows.map((row) => (
              <View key={`p-${row.label}`} style={styles.evidenceRow}>
                <Text style={styles.evidenceLabel}>{row.label}</Text>
                <Text style={styles.evidenceValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {guidance || guidanceImage || videoUrl ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Rehber / eğitim</Text>
            {guidance ? (
              <Text style={styles.cardBody}>{guidance}</Text>
            ) : (
              <Text style={styles.cardHint}>
                Bu adım için yazılı açıklama yok; varsa aşağıdaki link veya
                görseli kullanın.
              </Text>
            )}
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
                <Text style={styles.videoBtnText}>Eğitim videosunu / linki aç</Text>
                <Text style={styles.videoUrlText} numberOfLines={2}>
                  {videoUrl}
                </Text>
              </Pressable>
            ) : null}
          </View>
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
            {plannedRows.length > 0 || actualRows.length > 0 || task.completionNotes ? (
              <View style={styles.card}>
                {plannedRows.length > 0 ? (
                  <>
                    <Text style={styles.cardLabel}>Planlanan (hedef)</Text>
                    {plannedRows.map((row) => (
                      <View key={`op-${row.label}`} style={styles.evidenceRow}>
                        <Text style={styles.evidenceLabel}>{row.label}</Text>
                        <Text style={styles.evidenceValue}>{row.value}</Text>
                      </View>
                    ))}
                  </>
                ) : null}
                <Text style={[styles.cardLabel, plannedRows.length > 0 && styles.cardLabelSpaced]}>
                  Gerçekleşen (üretici)
                </Text>
                {actualRows.length > 0 ? (
                  actualRows.map((row) => (
                    <View key={`oa-${row.label}`} style={styles.evidenceRow}>
                      <Text style={styles.evidenceLabel}>{row.label}</Text>
                      <Text style={styles.evidenceValue}>{row.value}</Text>
                    </View>
                  ))
                ) : task.completionNotes ? (
                  <Text style={styles.cardBody}>{task.completionNotes}</Text>
                ) : (
                  <Text style={styles.cardHint}>Yapılandırılmış kanıt yok</Text>
                )}
              </View>
            ) : null}
            {(photoUrls.length > 0 || localPhotos.length > 0) && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>
                  {theme === 'Bakim'
                    ? 'Kanıt fotoğrafları (öncesi / sonrası)'
                    : 'Kanıt fotoğrafları'}
                </Text>
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
            {themed ? (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>
                  Gerçekleşen kanıt ({themeName})
                </Text>
                {theme === 'Sulama' ? (
                  <>
                    <Text style={styles.fieldLabel}>Süre (dakika)</Text>
                    <TextInput
                      value={durationMinutes}
                      onChangeText={setDurationMinutes}
                      keyboardType="number-pad"
                      style={styles.input}
                      placeholder="Örn. 45"
                      placeholderTextColor={colors.muted}
                    />
                    <Text style={styles.fieldLabel}>Su miktarı (litre)</Text>
                    <TextInput
                      value={waterAmount}
                      onChangeText={setWaterAmount}
                      keyboardType="decimal-pad"
                      style={styles.input}
                      placeholder="Örn. 200"
                      placeholderTextColor={colors.muted}
                    />
                  </>
                ) : null}
                {theme === 'Gubreleme' ? (
                  <>
                    <Text style={styles.fieldLabel}>Gübre adı</Text>
                    <TextInput
                      value={fertilizerName}
                      onChangeText={setFertilizerName}
                      style={styles.input}
                      placeholder="Örn. 15-15-15"
                      placeholderTextColor={colors.muted}
                    />
                    <Text style={styles.fieldLabel}>Miktar (kg)</Text>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      style={styles.input}
                      placeholder="Örn. 25"
                      placeholderTextColor={colors.muted}
                    />
                  </>
                ) : null}
                {theme === 'Ilaclama' ? (
                  <>
                    <Text style={styles.fieldLabel}>İlaç adı</Text>
                    <TextInput
                      value={pesticideName}
                      onChangeText={setPesticideName}
                      style={styles.input}
                      placeholder="Örn. Fungisit X"
                      placeholderTextColor={colors.muted}
                    />
                    <Text style={styles.fieldLabel}>Doz</Text>
                    <TextInput
                      value={dose}
                      onChangeText={setDose}
                      style={styles.input}
                      placeholder="Örn. 100 ml / 100 L"
                      placeholderTextColor={colors.muted}
                    />
                    <Text style={styles.fieldLabel}>Su miktarı (litre)</Text>
                    <TextInput
                      value={waterAmount}
                      onChangeText={setWaterAmount}
                      keyboardType="decimal-pad"
                      style={styles.input}
                      placeholder="Örn. 100"
                      placeholderTextColor={colors.muted}
                    />
                  </>
                ) : null}
                {theme === 'Dikim' ? (
                  <>
                    <Text style={styles.fieldLabel}>Fide sayısı</Text>
                    <TextInput
                      value={seedlingCount}
                      onChangeText={setSeedlingCount}
                      keyboardType="number-pad"
                      style={styles.input}
                      placeholder="Örn. 500"
                      placeholderTextColor={colors.muted}
                    />
                    <Text style={styles.fieldLabel}>
                      Başlangıç (YYYY-AA-GG SS:DD)
                    </Text>
                    <TextInput
                      value={startedAt}
                      onChangeText={setStartedAt}
                      style={styles.input}
                      placeholder="2026-07-27 08:00"
                      placeholderTextColor={colors.muted}
                      autoCapitalize="none"
                    />
                    <Text style={styles.fieldLabel}>
                      Bitiş (YYYY-AA-GG SS:DD)
                    </Text>
                    <TextInput
                      value={endedAt}
                      onChangeText={setEndedAt}
                      style={styles.input}
                      placeholder="2026-07-27 12:30"
                      placeholderTextColor={colors.muted}
                      autoCapitalize="none"
                    />
                  </>
                ) : null}
                {theme === 'Hasat' ? (
                  <>
                    <Text style={styles.fieldLabel}>Ürün miktarı (kg)</Text>
                    <TextInput
                      value={productQuantity}
                      onChangeText={setProductQuantity}
                      keyboardType="decimal-pad"
                      style={styles.input}
                      placeholder="Örn. 120"
                      placeholderTextColor={colors.muted}
                    />
                    <Text style={styles.fieldLabel}>Kasa sayısı</Text>
                    <TextInput
                      value={crateCount}
                      onChangeText={setCrateCount}
                      keyboardType="number-pad"
                      style={styles.input}
                      placeholder="Örn. 8"
                      placeholderTextColor={colors.muted}
                    />
                  </>
                ) : null}
                {theme === 'Bakim' ? (
                  <>
                    <Text style={styles.fieldLabel}>Açıklama</Text>
                    <TextInput
                      value={bakimDescription}
                      onChangeText={setBakimDescription}
                      placeholder="Yapılan bakımı kısaca yazın…"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, styles.area]}
                      multiline
                      textAlignVertical="top"
                    />
                  </>
                ) : null}
              </View>
            ) : null}

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

            {(minPhotos > 0 ||
              photoUrls.length > 0 ||
              localPhotos.length > 0) && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>
                  {theme === 'Bakim'
                    ? `Fotoğraf (öncesi + sonrası, en az ${minPhotos})`
                    : minPhotos > 0
                      ? `Fotoğraf (gerekli${minPhotos > 1 ? `, en az ${minPhotos}` : ''})`
                      : 'Fotoğraf'}
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
                    {theme === 'Bakim'
                      ? 'Öncesi ve sonrası olmak üzere en az 2 fotoğraf ekleyin.'
                      : 'Onaya göndermeden önce fotoğraf ekleyin.'}
                  </Text>
                )}
                {theme === 'Bakim' && serverPhotoCount === 1 ? (
                  <Text style={styles.cardHint}>
                    Bir fotoğraf var — sonrası için bir fotoğraf daha ekleyin.
                  </Text>
                ) : null}
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>
                {theme === 'Bakim' ? 'Ek not (isteğe bağlı)' : 'Açıklama (isteğe bağlı)'}
              </Text>
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
                    label={
                      theme === 'Bakim' && serverPhotoCount === 0
                        ? 'Öncesi fotoğraf çek'
                        : theme === 'Bakim'
                          ? 'Sonrası fotoğraf çek'
                          : 'Fotoğraf çek'
                    }
                    onPress={goCapture}
                    disabled={(needsQuantity && !quantityOk) || (themed && !evidenceOk)}
                  />
                  <PrimaryButton
                    label="Galeriden seç"
                    tone="secondary"
                    onPress={() => {
                      if (!ensureEvidenceReady()) return;
                      void pickFromGallery();
                    }}
                    loading={saving}
                    disabled={(needsQuantity && !quantityOk) || (themed && !evidenceOk)}
                  />
                </>
              ) : (
                <>
                  <PrimaryButton
                    label="Onaya gönder"
                    onPress={goComplete}
                    disabled={!canSubmit}
                  />
                  {minPhotos > 0 ? (
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
  themeLine: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
  plannedCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  evidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  evidenceLabel: {
    ...typography.helper,
    flex: 1,
    color: colors.muted,
  },
  evidenceValue: {
    ...typography.bodyStrong,
    flexShrink: 0,
    maxWidth: '55%',
    textAlign: 'right',
  },
  cardLabelSpaced: {
    marginTop: spacing.md,
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
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
    marginTop: spacing.sm,
  },
  videoBtnText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  videoUrlText: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
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
