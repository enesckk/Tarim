import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
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
import { LoadingBlock, PrimaryButton, Screen } from '../components/ui';
import { colors, radii, spacing, tap, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

function landLocation(land: LandDto) {
  return [land.neighborhood, land.district, land.city].filter(Boolean).join(', ');
}

function openLandOnMap(land: LandDto) {
  if (land.latitude == null || land.longitude == null) return;
  const url = `https://maps.apple.com/?ll=${land.latitude},${land.longitude}&q=${encodeURIComponent(land.name)}`;
  void Linking.openURL(url);
}

export function ProfileScreen() {
  const { user, authFetch, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const officer = isOfficer(user?.roles);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [lands, setLands] = useState<LandDto[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
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

  if (loading) return <LoadingBlock />;

  const roles = me?.roles ?? user?.roles;
  const displayName =
    me?.fullName || user?.fullName || (officer ? 'Tarım Uzmanı' : 'Üretici');
  const contact = me?.phone || me?.email || user?.email || '';

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.meta}>
            {[roleLabel(roles), contact].filter(Boolean).join(' · ')}
          </Text>
        </View>

        <View style={styles.landsBlock}>
          <Text style={styles.landsTitle}>
            {officer ? 'Arazilerim' : 'Arazilerim'}
          </Text>
          {lands.length === 0 ? (
            <Text style={styles.emptyLands}>
              {officer ? 'Henüz atanmış arazi yok' : 'Kayıtlı arazi bulunamadı'}
            </Text>
          ) : (
            lands.map((land) => {
              const location = landLocation(land);
              const hasCoords = land.latitude != null && land.longitude != null;
              const meta = [
                land.parcelNumber ? `Parsel ${land.parcelNumber}` : null,
                land.sizeInDecares != null
                  ? `${Number(land.sizeInDecares).toLocaleString('tr-TR')} da`
                  : null,
                land.activeCropType,
                land.activeWorkflowName,
              ].filter(Boolean);

              return (
                <View key={land.id} style={styles.landCard}>
                  <Text style={styles.landName}>{land.name}</Text>
                  {location ? (
                    <Text style={styles.landLine}>{location}</Text>
                  ) : null}
                  {meta.length > 0 ? (
                    <Text style={styles.landLine}>{meta.join(' · ')}</Text>
                  ) : null}
                  {land.soilType ? (
                    <Text style={styles.landLine}>Toprak: {land.soilType}</Text>
                  ) : null}
                  {hasCoords ? (
                    <Pressable
                      onPress={() => openLandOnMap(land)}
                      style={({ pressed }) => [
                        styles.mapLink,
                        pressed && styles.mapLinkPressed,
                      ]}
                      accessibilityRole="link"
                      accessibilityLabel="Haritada göster"
                    >
                      <Text style={styles.mapLinkText}>Haritada göster</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.actions}>
          {officer ? (
            <PrimaryButton
              label="Üretici ara / ara"
              onPress={() => navigation.navigate('ProducerSearch')}
            />
          ) : (
            <PrimaryButton
              label="Uzmana mesaj yaz"
              onPress={() =>
                navigation.navigate('MainTabs', { screen: 'Messages' })
              }
            />
          )}
          <PrimaryButton label="Çıkış yap" tone="secondary" onPress={logout} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  headerTitle: { ...typography.screenTitle },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxxl,
  },
  identity: {
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
    marginBottom: spacing.xl,
  },
  landsTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyLands: { ...typography.helper },
  landCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 4,
  },
  landName: {
    ...typography.bodyStrong,
    marginBottom: 2,
  },
  landLine: {
    ...typography.helper,
  },
  mapLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    minHeight: tap.min,
    justifyContent: 'center',
  },
  mapLinkPressed: { opacity: 0.7 },
  mapLinkText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  actions: {
    marginTop: 'auto',
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
});
