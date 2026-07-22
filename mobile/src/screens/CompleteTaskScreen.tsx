import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { PrimaryButton, Screen } from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function CompleteTaskScreen() {
  const { authFetch } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'CompleteTask'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoAttached = route.params.photoAttached === true;
  const notes = route.params.notes?.trim() || 'Mobil uygulamadan gönderildi';

  const complete = async () => {
    setLoading(true);
    setError(null);
    try {
      await authFetch(`/api/tasks/${route.params.taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
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
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Onaya gönder</Text>
        <Text style={styles.body}>
          Görevi uzmana göndermek istediğinize emin misiniz? Uzman onaylayınca
          “Onaylandı” olarak görünecek.
        </Text>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
  },
  title: {
    ...typography.screenTitle,
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
  },
  check: {
    marginTop: spacing.xxl,
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
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
});
