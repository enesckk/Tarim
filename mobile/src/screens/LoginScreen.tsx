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
import { PrimaryButton, Screen } from '../components/ui';
import { colors, radii, spacing, tap, typography } from '../theme';
import { ApiError } from '../api/client';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
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
          <Text style={styles.brand}>Tarım</Text>
          <Text style={styles.subtitle}>Hesabınla devam et</Text>
        </View>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
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
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.helper,
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
