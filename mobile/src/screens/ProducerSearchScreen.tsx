import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, LoadingBlock, Screen } from '../components/ui';
import { colors, radii, spacing, tap, typography } from '../theme';

type ProducerRow = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
};

function callPhone(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) return;
  void Linking.openURL(`tel:${digits}`);
}

export function ProducerSearchScreen() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState<ProducerRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await authFetch<ProducerRow[]>('/api/producers');
      setItems(data);
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr-TR');
    if (!needle) return items;
    return items.filter((p) => {
      const hay = `${p.fullName} ${p.phone} ${p.email ?? ''}`.toLocaleLowerCase(
        'tr-TR',
      );
      return hay.includes(needle);
    });
  }, [items, q]);

  if (loading) return <LoadingBlock />;
  if (error) {
    return (
      <Screen>
        <EmptyState
          title="Bağlantı yok"
          body="Üreticiler yüklenemedi."
          actionLabel="Tekrar dene"
          onAction={() => {
            setLoading(true);
            void load();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Üretici ara</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="İsim veya telefon"
          placeholderTextColor={colors.muted}
          style={styles.search}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={
          filtered.length === 0 ? styles.flex : styles.list
        }
        ListEmptyComponent={
          <EmptyState title="Sonuç yok" body="Başka bir arama dene." />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.fullName} ara`}
            onPress={() => callPhone(item.phone)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowBody}>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.phone}>{item.phone}</Text>
            </View>
            <Text style={styles.call}>Ara</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  title: { ...typography.screenTitle, marginBottom: spacing.lg },
  search: {
    ...typography.body,
    minHeight: tap.min,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxxl,
  },
  flex: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.bgWarm },
  rowBody: { flex: 1, minWidth: 0 },
  name: { ...typography.bodyStrong },
  phone: { ...typography.caption, marginTop: 4 },
  call: {
    ...typography.bodyStrong,
    color: colors.primary,
    paddingLeft: spacing.md,
  },
});
