import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { ApiError, type TaskDto } from '../api/client';
import { PrimaryButton, Screen } from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function CompleteTaskScreen() {
  const { authFetch } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'OnayaGonder'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoAttached, setPhotoAttached] = useState(false);
  const seedNotes = route.params.notes?.trim() ?? '';
  const [note, setNote] = useState(
    seedNotes
      .split('\n')
      .filter((line) => line && line !== 'Mobil uygulamadan gönderildi')
      .join('\n')
      .trim(),
  );

  useEffect(() => {
    let active = true;
    void authFetch<TaskDto>(`/api/tasks/${route.params.taskId}`)
      .then((task) => {
        if (active) {
          setPhotoAttached((task.photoCount ?? task.photos?.length ?? 0) > 0);
        }
      })
      .catch(() => {
        if (active) setPhotoAttached(false);
      });
    return () => {
      active = false;
    };
  }, [authFetch, route.params.taskId]);

  const buildNotes = () => {
    const parts = [note.trim() || null, 'Mobil uygulamadan gönderildi'].filter(
      Boolean,
    );
    return parts.join('\n');
  };

  const complete = async () => {
    setLoading(true);
    setError(null);
    try {
      await authFetch(`/api/tasks/${route.params.taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ notes: buildNotes() }),
      });
      Alert.alert('Gönderildi', 'Göreviniz uzman onayına gönderildi.', [
        {
          text: 'Tamam',
          onPress: () => navigation.popToTop(),
        },
      ]);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message || 'Görev gönderilemedi.'
          : 'Görev gönderilemedi. Bağlantınızı kontrol edin.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.body}>
            Görevi uzmana göndermek istediğinize emin misiniz? İsterseniz kısa
            bir açıklama ekleyin.
          </Text>

          <Text style={styles.label}>Açıklama (isteğe bağlı)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Örn. Sulama tamam, fotoğrafta hortum görünüyor"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            textAlignVertical="top"
          />

          {photoAttached ? (
            <View style={styles.check}>
              <Text style={styles.checkText}>Fotoğraf eklendi</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <PrimaryButton
              label="Evet, onaya gönder"
              onPress={() => void complete()}
              loading={loading}
            />
            <PrimaryButton
              label="Vazgeç"
              tone="secondary"
              onPress={() => navigation.goBack()}
              disabled={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  body: {
    ...typography.body,
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: 17,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  check: {
    marginTop: spacing.xl,
    backgroundColor: colors.successSoft,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  checkText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
  error: {
    marginTop: spacing.lg,
    color: colors.danger,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
});
