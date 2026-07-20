import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import type { ConversationListItem } from '../api/client';
import {
  EmptyState,
  ListCard,
  LoadingBlock,
  PrimaryButton,
  Screen,
  ScreenHeader,
} from '../components/ui';
import { colors, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function MessagesScreen() {
  const { authFetch } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await authFetch<ConversationListItem[]>('/api/conversations');
      setItems(data);
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authFetch]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  if (loading) return <LoadingBlock />;

  if (error) {
    return (
      <Screen>
        <EmptyState
          title="Sohbetler yüklenemedi"
          body="Bağlantınızı kontrol edin."
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
      <ScreenHeader
        title="Sohbet"
        subtitle="Tarım uzmanınıza yazın."
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.flex : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="Henüz sohbet yok"
            body="Tarım uzmanına soru sormak için aşağıdaki düğmeyi kullanın."
          />
        }
        renderItem={({ item }) => (
          <ListCard
            onPress={() =>
              navigation.navigate('ChatThread', { conversationId: item.id })
            }
          >
            <Text style={styles.rowTitle}>{item.subject}</Text>
            <Text style={styles.rowPreview} numberOfLines={1}>
              {item.lastMessagePreview || 'Henüz mesaj yok'}
            </Text>
          </ListCard>
        )}
      />
      <View style={styles.footer}>
        <PrimaryButton
          label="Uzmana sor"
          onPress={() => navigation.navigate('AskExpert', {})}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 100,
  },
  flex: { flexGrow: 1, paddingBottom: 100 },
  rowTitle: {
    ...typography.bodyStrong,
  },
  rowPreview: {
    ...typography.helper,
    marginTop: spacing.xs,
  },
  footer: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    bottom: spacing.lg,
  },
});
