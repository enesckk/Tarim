import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../auth/AuthContext';
import { type TaskDto, uploadTaskPhoto } from '../api/client';
import { enqueuePhotoUpload } from '../offline/photoQueue';
import { PrimaryButton, Screen } from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function CapturePhotoScreen() {
  const { accessToken, refreshToken, authFetch } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'FotografCek'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takePhoto = async () => {
    setError(null);
    setPicking(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Kamera izni gerekli. Ayarlardan izin verin veya galeriden seçin.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setUri(result.assets[0].uri);
      }
    } catch {
      setError('Kamera açılamadı. Galeriden seçmeyi deneyin.');
    } finally {
      setPicking(false);
    }
  };

  const pickFromGallery = async () => {
    setError(null);
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Galeri izni gerekli. Ayarlardan izin verin.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setUri(result.assets[0].uri);
      }
    } catch {
      setError('Galeri açılamadı.');
    } finally {
      setPicking(false);
    }
  };

  const upload = async () => {
    if (!uri) return;
    setLoading(true);
    setError(null);
    try {
      await uploadTaskPhoto(route.params.taskId, uri, accessToken, refreshToken);
    } catch {
      // Kuyruğa al ama onaya gönderme — sunucuda foto yokken complete reddedilir.
      await enqueuePhotoUpload({
        taskId: route.params.taskId,
        localUri: uri,
      });
      setError(
        'Yüklenemedi. Fotoğraf kuyruğa alındı; bağlantı gelince yüklenecek. Onaya göndermek için önce başarılı yükleme gerekir.',
      );
      setLoading(false);
      return;
    }

    try {
      const task = await authFetch<TaskDto>(`/api/tasks/${route.params.taskId}`);
      const photoCount = task.photoCount ?? task.photos?.length ?? 0;
      if (photoCount === 0) {
        setError('Fotoğraf yüklemesi doğrulanamadı. Lütfen yeniden deneyin.');
        return;
      }
      navigation.replace('OnayaGonder', {
        taskId: route.params.taskId,
        photoAttached: true,
        notes: route.params.notes,
        evidence: route.params.evidence,
      });
    } catch {
      setError('Fotoğraf yüklendi ancak sunucuda doğrulanamadı. Lütfen yeniden deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.helper}>
          Görevinizi kanıtlayan net bir fotoğraf çekin veya galeriden seçin.
        </Text>
        <View style={styles.preview}>
          {uri ? (
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          ) : (
            <Text style={styles.previewText}>Fotoğraf seçilmedi</Text>
          )}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          {!uri ? (
            <>
              <PrimaryButton label="Fotoğraf çek" onPress={takePhoto} loading={picking} />
              <PrimaryButton
                label="Galeriden seç"
                tone="secondary"
                onPress={pickFromGallery}
                disabled={picking}
              />
            </>
          ) : (
            <>
              <PrimaryButton label="Yükle ve devam et" onPress={upload} loading={loading} />
              <PrimaryButton
                label="Yeniden seç"
                tone="secondary"
                onPress={() => setUri(null)}
                disabled={loading}
              />
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
  },
  helper: {
    ...typography.helper,
    marginBottom: spacing.lg,
  },
  preview: {
    flex: 1,
    backgroundColor: colors.cameraWell,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  previewText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
});
