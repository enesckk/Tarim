import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { PrimaryButton, Screen } from '../components/ui';
import { colors, radii, spacing, tap, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function AskExpertScreen() {
  const { authFetch } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'AskExpert'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [subject, setSubject] = useState(
    route.params?.taskId ? 'Görev hakkında soru' : 'Genel soru',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const id = await authFetch<string>('/api/conversations/ask-expert', {
        method: 'POST',
        body: JSON.stringify({ subject }),
      });
      const conversationId = typeof id === 'string' ? id : String(id);
      navigation.replace('ChatThread', { conversationId });
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message || 'Sohbet başlatılamadı.'
          : 'Sohbet başlatılamadı. Bağlantınızı kontrol edin.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Uzmana sor</Text>
        <Text style={styles.helper}>
          Kısa bir konu yazın, sonra sohbete geçin.
        </Text>
        <Text style={styles.label}>Konu (isteğe bağlı)</Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          style={styles.input}
          placeholder="Genel soru"
          placeholderTextColor={colors.muted}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <PrimaryButton label="Sohbete git" onPress={start} loading={loading} />
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
    marginBottom: spacing.sm,
  },
  helper: {
    ...typography.helper,
    marginBottom: spacing.xxl,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
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
  error: {
    marginTop: spacing.md,
    color: colors.danger,
    fontSize: 15,
  },
  actions: {
    marginTop: 'auto',
    paddingBottom: spacing.lg,
  },
});
