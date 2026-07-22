import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { ApiError, uploadTaskPhoto } from '../api/client';
import { PrimaryButton, Screen } from '../components/ui';
import { colors, radii, spacing, tap, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type PhotoAsset = { uri: string; fileName?: string; mimeType?: string };

export function ReportProblemScreen() {
  const { authFetch, accessToken, refreshToken } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'ReportProblem'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && !loading;
  const contextLabel = route.params?.taskTitle;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 3,
    });
    if (result.canceled || !result.assets?.length) return;
    setPhotos((prev) =>
      [
        ...prev,
        ...result.assets.map((a) => ({
          uri: a.uri,
          fileName: a.fileName ?? undefined,
          mimeType: a.mimeType ?? undefined,
        })),
      ].slice(0, 3),
    );
  };

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const subject = `Sorun: ${title.trim()}`;
      const conversationIdRaw = await authFetch<string>('/api/conversations/ask-expert', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          landId: route.params?.landId ?? null,
        }),
      });
      const conversationId =
        typeof conversationIdRaw === 'string'
          ? conversationIdRaw.replace(/"/g, '')
          : String(conversationIdRaw).replace(/"/g, '');

      const bodyParts = [
        title.trim(),
        description.trim() || null,
        route.params?.taskTitle ? `İlgili görev: ${route.params.taskTitle}` : null,
        photos.length ? `${photos.length} görsel eklendi.` : null,
      ].filter(Boolean);

      await authFetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: bodyParts.join('\n\n') }),
      });

      if (route.params?.taskId && photos.length) {
        for (const photo of photos) {
          await uploadTaskPhoto(
            route.params.taskId,
            photo.uri,
            accessToken,
            refreshToken,
            {
              fileName: photo.fileName,
              contentType: photo.mimeType,
            },
          );
        }
      }

      navigation.replace('ChatThread', { conversationId });
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message || 'Sorun gönderilemedi.'
          : 'Sorun gönderilemedi. Bağlantınızı kontrol edin.',
      );
    } finally {
      setLoading(false);
    }
  };

  const helper = useMemo(
    () =>
      route.params?.taskId
        ? 'Görseller bu göreve de kanıt olarak eklenir.'
        : 'Görsel ekleyebilirsiniz; metin uzmana sohbet olarak gider.',
    [route.params?.taskId],
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Sorun bildir</Text>
        <Text style={styles.helper}>{helper}</Text>

        {contextLabel ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{contextLabel}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Başlık</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholder="Örn. Sulama hattında kaçak"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Açıklama (isteğe bağlı)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.area]}
          placeholder="Kısaca anlatın…"
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Görsel (isteğe bağlı)</Text>
        <View style={styles.photos}>
          {photos.map((p) => (
            <Image key={p.uri} source={{ uri: p.uri }} style={styles.thumb} />
          ))}
          {photos.length < 3 ? (
            <Pressable style={styles.addPhoto} onPress={() => void pickPhoto()}>
              <Text style={styles.addPhotoText}>+ Foto</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            label="Gönder"
            onPress={() => void submit()}
            loading={loading}
            disabled={!canSubmit}
          />
          <PrimaryButton
            label="Vazgeç"
            tone="secondary"
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  title: {
    ...typography.screenTitle,
  },
  helper: {
    ...typography.helper,
    marginBottom: spacing.md,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgWarm,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  label: {
    ...typography.label,
    marginTop: spacing.sm,
  },
  input: {
    minHeight: tap.primary,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  area: {
    minHeight: 110,
    paddingTop: spacing.md,
  },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    backgroundColor: colors.bgWarm,
  },
  addPhoto: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  addPhotoText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
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
});
