import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import type { MeResponse } from '../api/client';
import { LoadingBlock, PrimaryButton, Screen, ScreenHeader } from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';

export function ProfileScreen() {
  const { user, authFetch, signOut } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      (async () => {
        try {
          const data = await authFetch<MeResponse>('/api/me');
          if (!cancelled) setMe(data);
        } catch {
          if (!cancelled) setMe(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [authFetch]),
  );

  const logout = () => {
    Alert.alert('Çıkış yap', 'Oturumu kapatmak istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış yap',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  if (loading) return <LoadingBlock />;

  return (
    <Screen>
      <ScreenHeader title="Profil" subtitle="Hesap bilgileriniz." />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.name}>{me?.fullName || user?.fullName || 'Üretici'}</Text>
          <Text style={styles.meta}>{me?.phone || me?.email || user?.email}</Text>
          {me?.email && me?.phone ? (
            <Text style={styles.meta}>{me.email}</Text>
          ) : null}
        </View>
        <Text style={styles.help}>
          Yardım: Belediyenizin tarım birimini arayın.
        </Text>
        <Text style={styles.version}>Sürüm 1.0.0</Text>
        <View style={styles.actions}>
          <PrimaryButton label="Çıkış yap" tone="danger" onPress={logout} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.screen,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: {
    ...typography.sectionTitle,
  },
  meta: {
    ...typography.helper,
    marginTop: spacing.sm,
  },
  help: {
    ...typography.helper,
    marginTop: spacing.xxl,
  },
  version: {
    ...typography.caption,
    marginTop: spacing.md,
  },
  actions: {
    marginTop: 'auto',
    paddingBottom: spacing.lg,
  },
});
