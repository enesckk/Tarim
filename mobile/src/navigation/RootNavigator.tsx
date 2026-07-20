import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
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
import { ProfileScreen } from '../screens/ProfileScreen';
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

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

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
    >
      <Tab.Screen
        name="Today"
        component={TodayTasksScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Görevler" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon name="Today" focused={focused} />,
          tabBarAccessibilityLabel: 'Görevler',
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Sohbet" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon name="Messages" focused={focused} />,
          tabBarAccessibilityLabel: 'Sohbet',
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Bildirimler" focused={focused} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Notifications" focused={focused} />
          ),
          tabBarAccessibilityLabel: 'Bildirimler',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Profil" focused={focused} />,
          tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} />,
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
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{ title: 'Görev detayı' }}
            />
            <Stack.Screen
              name="CapturePhoto"
              component={CapturePhotoScreen}
              options={{ title: 'Fotoğraf' }}
            />
            <Stack.Screen
              name="CompleteTask"
              component={CompleteTaskScreen}
              options={{ title: 'Görevi tamamla' }}
            />
            <Stack.Screen
              name="AskExpert"
              component={AskExpertScreen}
              options={{ title: 'Uzmana sor' }}
            />
            <Stack.Screen
              name="ChatThread"
              component={ChatThreadScreen}
              options={{ title: 'Sohbet' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
