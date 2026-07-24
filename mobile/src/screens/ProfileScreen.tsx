import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { isOfficer, roleLabel } from '../auth/roles';
import type { LandDto, MeResponse } from '../api/client';
import { LandCard } from '../components/design';
import { IconGear } from '../components/icons';
import { EmptyState, LoadingBlock, PrimaryButton, Screen } from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function ProfileScreen() {
  const { user, authFetch, signOut } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const officer = isOfficer(user?.roles);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [lands, setLands] = useState<LandDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setLoadError(false);
      (async () => {
        try {
          const meData = await authFetch<MeResponse>('/api/me');
          if (!cancelled) setMe(meData);
          const landData = await authFetch<LandDto[]>('/api/lands');
          if (!cancelled) setLands(landData);
        } catch {
          if (!cancelled) {
            setMe(null);
            setLands([]);
            setLoadError(true);
          }
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

  const showAccount = () => {
    const name =
      me?.fullName || user?.fullName || (officer ? 'Tarım Uzmanı' : 'Üretici');
    const lines = [
      name,
      roleLabel(me?.roles ?? user?.roles),
      me?.phone || null,
      me?.email || user?.email || null,
    ].filter(Boolean);
    Alert.alert('Hesap bilgileri', lines.join('\n'));
  };

  if (loading) return <LoadingBlock />;

  if (loadError) {
    return (
      <Screen>
        <EmptyState
          title="Bağlantı yok"
          body="Profil yüklenemedi."
          actionLabel="Tekrar dene"
          onAction={() => {
            setLoading(true);
            setLoadError(false);
            void (async () => {
              try {
                const meData = await authFetch<MeResponse>('/api/me');
                setMe(meData);
                setLands(await authFetch<LandDto[]>('/api/lands'));
              } catch {
                setLoadError(true);
              } finally {
                setLoading(false);
              }
            })();
          }}
        />
      </Screen>
    );
  }

  const roles = me?.roles ?? user?.roles;
  const displayName =
    me?.fullName || user?.fullName || (officer ? 'Tarım Uzmanı' : 'Üretici');
  const contact = me?.phone || me?.email || user?.email || '';

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        {!officer ? (
          <Pressable
            onPress={showAccount}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Hesap bilgileri"
          >
            <IconGear color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {officer ? (
          <View style={styles.officerIdentity}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.meta}>
              {[roleLabel(roles), contact].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ) : (
          <View style={styles.heroCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(displayName.trim()[0] || 'Ü').toLocaleUpperCase('tr-TR')}
              </Text>
            </View>
            <Text style={styles.heroName}>{displayName}</Text>
            <Text style={styles.heroRole}>{roleLabel(roles)}</Text>
            <Pressable
              onPress={showAccount}
              style={({ pressed }) => [
                styles.accountBtn,
                pressed && styles.accountBtnPressed,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.accountBtnText}>Hesap bilgileri</Text>
            </Pressable>
          </View>
        )}

        {officer ? (
          <View style={styles.landsBlock}>
            <Text style={styles.sectionTitle}>Arazilerim</Text>
            {lands.length === 0 ? (
              <Text style={styles.emptyLands}>Henüz atanmış arazi yok</Text>
            ) : (
              lands.map((land) => (
                <Text key={land.id} style={styles.officerLand}>
                  {land.name}
                </Text>
              ))
            )}
          </View>
        ) : (
          <View style={styles.landsBlock}>
            <Text style={styles.sectionTitle}>
              {lands.length > 1 ? 'Araziler' : 'Arazi'}
            </Text>
            {lands.length === 0 ? (
              <Text style={styles.emptyLands}>Kayıtlı arazi bulunamadı</Text>
            ) : (
              lands.map((land) => (
                <View key={land.id} style={styles.landCardWrap}>
                  <LandCard land={land} />
                </View>
              ))
            )}
          </View>
        )}

        <View style={styles.menu}>
          {!officer ? (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.menuRow,
                  pressed && styles.menuRowPressed,
                ]}
                onPress={() =>
                  navigation.navigate('AnaSekmeler', { screen: 'Bildirimler' })
                }
                accessibilityRole="button"
              >
                <Text style={styles.menuText}>Bildirimler</Text>
                <Text style={styles.menuChevron}>›</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.menuRow,
                  pressed && styles.menuRowPressed,
                ]}
                onPress={() =>
                  navigation.navigate('AnaSekmeler', { screen: 'Sohbet' })
                }
                accessibilityRole="button"
              >
                <Text style={styles.menuText}>Sohbet</Text>
                <Text style={styles.menuChevron}>›</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.menuRow,
              pressed && styles.menuRowPressed,
              !officer && styles.menuRowLast,
            ]}
            onPress={logout}
            accessibilityRole="button"
          >
            <Text style={[styles.menuText, styles.logoutText]}>Çıkış yap</Text>
          </Pressable>
        </View>

        {officer ? (
          <View style={styles.officerActions}>
            <PrimaryButton
              label="Üretici ara"
              onPress={() => navigation.navigate('UreticiAra')}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { ...typography.screenTitle },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxxl,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  heroRole: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  accountBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  accountBtnPressed: { opacity: 0.85 },
  accountBtnText: {
    color: colors.onPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  officerIdentity: {
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.xl,
  },
  name: { ...typography.sectionTitle },
  meta: {
    ...typography.helper,
    marginTop: spacing.sm,
  },
  landsBlock: {
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  landCardWrap: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
  },
  emptyLands: { ...typography.helper },
  officerLand: {
    ...typography.bodyStrong,
    paddingVertical: spacing.sm,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuRowPressed: { backgroundColor: colors.bgWarm },
  menuText: { ...typography.bodyStrong },
  menuChevron: {
    fontSize: 20,
    color: colors.borderStrong,
  },
  logoutText: { color: colors.danger },
  officerActions: {
    marginTop: spacing.xxl,
  },
});
