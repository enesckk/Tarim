import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { isOfficer } from '../auth/roles';
import type { ConversationListItem, NotificationDto } from '../api/client';
import { LoadingBlock } from '../components/ui';
import { TabIcon } from '../components/TabIcon';
import { colors, typography } from '../theme';
import { AskExpertScreen } from '../screens/AskExpertScreen';
import { CapturePhotoScreen } from '../screens/CapturePhotoScreen';
import { ChatThreadScreen } from '../screens/ChatThreadScreen';
import { CompleteTaskScreen } from '../screens/CompleteTaskScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { OfficerMessagesScreen } from '../screens/OfficerMessagesScreen';
import { OfficerTasksScreen } from '../screens/OfficerTasksScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProducerSearchScreen } from '../screens/ProducerSearchScreen';
import { ReportProblemScreen } from '../screens/ReportProblemScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { TodayTasksScreen } from '../screens/TodayTasksScreen';
import type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        ...typography.tab,
        fontWeight: focused ? '700' : '500',
        color: focused ? colors.primary : colors.tabInactive,
        textAlign: 'center',
        marginTop: 2,
      }}
    >
      {label}
    </Text>
  );
}

function AnaSekmeler() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  const { authFetch, user } = useAuth();
  const officer = isOfficer(user?.roles);
  const [notifUnread, setNotifUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);

  const refreshBadges = useCallback(async () => {
    try {
      const conversationsPath = '/api/conversations/expert';
      const [notifs, convos] = await Promise.all([
        authFetch<NotificationDto[]>('/api/notifications'),
        authFetch<ConversationListItem[]>(conversationsPath),
      ]);
      setNotifUnread(notifs.filter((n) => !n.isRead).length);
      setChatUnread(convos.filter((c) => c.hasUnread).length);
    } catch {
      // Geçici hatalarda son rozet sayılarını koru.
    }
  }, [authFetch]);

  useEffect(() => {
    void refreshBadges();
    const id = setInterval(() => void refreshBadges(), 20_000);
    return () => clearInterval(id);
  }, [refreshBadges]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          minHeight: 56 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 10,
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          shadowOpacity: Platform.OS === 'ios' ? 0.06 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
      }}
      screenListeners={{
        focus: () => {
          void refreshBadges();
        },
      }}
    >
      <Tab.Screen
        name="Gorevler"
        component={officer ? OfficerTasksScreen : TodayTasksScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabLabel label={officer ? 'Onaylar' : 'Görevler'} focused={focused} />
          ),
          tabBarIcon: ({ focused }) => <TabIcon name="Gorevler" focused={focused} />,
          tabBarAccessibilityLabel: officer ? 'Onaylar' : 'Görevler',
        }}
      />
      <Tab.Screen
        name="Sohbet"
        component={officer ? OfficerMessagesScreen : MessagesScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Sohbet" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon name="Sohbet" focused={focused} />,
          tabBarAccessibilityLabel: 'Sohbet',
          tabBarBadge: chatUnread > 0 ? (chatUnread > 9 ? '9+' : chatUnread) : undefined,
        }}
      />
      <Tab.Screen
        name="Bildirimler"
        component={NotificationsScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Bildirimler" focused={focused} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Bildirimler" focused={focused} />
          ),
          tabBarAccessibilityLabel: 'Bildirimler',
          tabBarBadge: notifUnread > 0 ? (notifUnread > 9 ? '9+' : notifUnread) : undefined,
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Profil" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon name="Profil" focused={focused} />,
          tabBarAccessibilityLabel: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { ready, user } = useAuth();

  if (!ready) return <LoadingBlock label="Oturum kontrol ediliyor…" />;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
            color: colors.text,
          },
          headerStyle: {
            backgroundColor: colors.bg,
          },
          headerShadowVisible: false,
          headerBackTitle: 'Geri',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {!user ? (
          <Stack.Screen
            name="Giris"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="AnaSekmeler"
              component={AnaSekmeler}
              options={{ headerShown: false, title: 'Geri' }}
            />
            <Stack.Screen
              name="GorevDetay"
              component={TaskDetailScreen}
              options={{ title: 'Görev detayı', headerBackTitle: 'Geri' }}
            />
            <Stack.Screen
              name="FotografCek"
              component={CapturePhotoScreen}
              options={{ title: 'Fotoğraf çek', headerBackTitle: 'Geri' }}
            />
            <Stack.Screen
              name="OnayaGonder"
              component={CompleteTaskScreen}
              options={{ title: 'Onaya gönder', headerBackTitle: 'Geri' }}
            />
            <Stack.Screen
              name="UzmanaSor"
              component={AskExpertScreen}
              options={{ title: 'Uzmana sor', headerBackTitle: 'Geri' }}
            />
            <Stack.Screen
              name="SorunBildir"
              component={ReportProblemScreen}
              options={{ title: 'Sorun bildir', headerBackTitle: 'Geri' }}
            />
            <Stack.Screen
              name="SohbetKonu"
              component={ChatThreadScreen}
              options={{ title: 'Sohbet', headerBackTitle: 'Geri' }}
            />
            <Stack.Screen
              name="UreticiAra"
              component={ProducerSearchScreen}
              options={{ title: 'Üretici ara', headerBackTitle: 'Geri' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
