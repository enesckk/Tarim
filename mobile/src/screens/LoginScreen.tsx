import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { LeafMark } from '../components/design';
import { PrimaryButton, Screen } from '../components/ui';
import { colors, radii, spacing, tap, typography } from '../theme';
import { ApiError } from '../api/client';
import { API_BASE_URL } from '../api/config';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(__DEV__ ? '5537472823' : '');
  const [password, setPassword] = useState(__DEV__ ? 'asd' : '');  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.status === 403
            ? e.message
            : 'Telefon / e-posta veya şifre hatalı.'
          : 'Bağlantı yok. Tekrar dene.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.hero}>
          <LeafMark size={44} />
          <Text style={styles.brand}>Tarım</Text>
          <Text style={styles.subtitle}>Hesabınla devam et</Text>
          {__DEV__ ? (
            <Text style={styles.devUrl} numberOfLines={1}>
              Sunucu: {API_BASE_URL}
            </Text>
          ) : null}
        </View>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="phone-pad"
          value={email}
          onChangeText={setEmail}
          placeholder="Telefon veya e-posta"
          placeholderTextColor={colors.muted}
          style={styles.input}
          accessibilityLabel="Telefon veya e-posta"
        />

        <TextInput
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Şifre"
          placeholderTextColor={colors.muted}
          style={styles.input}
          accessibilityLabel="Şifre"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.cta}>
          <PrimaryButton label="Giriş yap" onPress={onSubmit} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxxl,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xxxl + spacing.md,
  },
  brand: {
    ...typography.brand,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.helper,
  },
  devUrl: {
    ...typography.helper,
    fontSize: 11,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  input: {
    ...typography.body,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    color: colors.text,
    minHeight: tap.min,
    marginBottom: spacing.md,
  },
  error: {
    ...typography.helper,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  cta: {
    marginTop: spacing.lg,
  },
});
