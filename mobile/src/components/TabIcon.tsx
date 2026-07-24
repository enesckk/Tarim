import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import type { MainTabParamList } from '../navigation/types';

type TabName = keyof MainTabParamList;

/**
 * Çizimli sekme ikonları — emoji yok.
 * Aktif = dolu yeşil; pasif = soluk çerçeve.
 */
export function TabIcon({ name, focused }: { name: TabName; focused: boolean }) {
  const stroke = focused ? colors.primary : colors.tabInactive;
  const fill = focused ? colors.primarySoft : 'transparent';

  if (name === 'Gorevler') {
    return (
      <View style={[styles.box, { borderColor: stroke, backgroundColor: fill }]}>
        <View style={[styles.checkBar, { backgroundColor: stroke }]} />
        <View style={[styles.checkBar, { backgroundColor: stroke, width: 10 }]} />
      </View>
    );
  }

  if (name === 'Sohbet') {
    return (
      <View style={[styles.bubble, { borderColor: stroke, backgroundColor: fill }]}>
        <View style={[styles.bubbleTail, { borderTopColor: stroke }]} />
      </View>
    );
  }

  if (name === 'Bildirimler') {
    return (
      <View style={styles.bellWrap}>
        <View style={[styles.bell, { borderColor: stroke, backgroundColor: fill }]} />
        <View style={[styles.bellClapper, { backgroundColor: stroke }]} />
      </View>
    );
  }

  return (
    <View style={styles.person}>
      <View style={[styles.head, { borderColor: stroke, backgroundColor: fill }]} />
      <View style={[styles.shoulders, { borderColor: stroke, backgroundColor: fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.75,
    paddingHorizontal: 4,
    paddingVertical: 5,
    justifyContent: 'center',
    gap: 3,
  },
  checkBar: {
    height: 2,
    borderRadius: 1,
    width: 12,
  },
  bubble: {
    width: 22,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.75,
    marginBottom: 3,
  },
  bubbleTail: {
    position: 'absolute',
    left: 4,
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bellWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bell: {
    width: 16,
    height: 14,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderWidth: 1.75,
  },
  bellClapper: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  person: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  head: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.75,
    marginBottom: 2,
  },
  shoulders: {
    width: 18,
    height: 8,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderWidth: 1.75,
    borderBottomWidth: 0,
  },
});
