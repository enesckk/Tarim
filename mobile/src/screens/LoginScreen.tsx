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
  // Seed demo: phone or email both work (Identity looks up PhoneNumber / Email).
  const [email, setEmail] = useState('05559876543');
  const [password, setPassword] = useState('Producer123!');
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
          ? 'Telefon veya şifre hatalı. Belediyenizle iletişime geçin.'
          : 'Giriş yapılamadı. Bağlantınızı kontrol edin.';
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
          <Text style={styles.subtitle}>Belediye hesabınızla giriş yapın.</Text>
        </View>

        <Text style={styles.label}>Telefon / kullanıcı adı</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="0555… veya e-posta"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.label}>Şifre</Text>
        <TextInput
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Şifreniz"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.cta}>
          <PrimaryButton label="Giriş yap" onPress={onSubmit} loading={loading} />
        </View>

        <Text style={styles.help}>
          Hesabınız yoksa belediyenizin tarım birimini arayın.
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xxxl,
  },
  brand: {
    ...typography.brand,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
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
    color: colors.danger,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  cta: {
    marginTop: spacing.xxl,
  },
  help: {
    ...typography.helper,
    marginTop: spacing.xxl,
    textAlign: 'center',
  },
});
