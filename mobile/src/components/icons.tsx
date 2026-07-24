import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/** Çizimli başlık / arayüz ikonları — emoji yok. */

export function IconBell({ color = colors.text, size = 22 }: { color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View
        style={{
          width: size * 0.72,
          height: size * 0.62,
          borderTopLeftRadius: size * 0.36,
          borderTopRightRadius: size * 0.36,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
          borderWidth: 1.8,
          borderColor: color,
        }}
      />
      <View
        style={{
          width: size * 0.18,
          height: size * 0.18,
          borderRadius: size * 0.09,
          backgroundColor: color,
          marginTop: 1,
        }}
      />
    </View>
  );
}

export function IconSearch({ color = colors.text, size = 22 }: { color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.55,
          height: size * 0.55,
          borderRadius: size * 0.28,
          borderWidth: 1.8,
          borderColor: color,
          marginRight: size * 0.12,
          marginBottom: size * 0.12,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.38,
          height: 1.8,
          backgroundColor: color,
          right: 1,
          bottom: size * 0.18,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

export function IconGear({ color = colors.text, size = 22 }: { color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.55,
          height: size * 0.55,
          borderRadius: size * 0.28,
          borderWidth: 1.8,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.22,
          height: size * 0.22,
          borderRadius: size * 0.11,
          backgroundColor: color,
        }}
      />
      {[0, 45, 90, 135].map((deg) => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            width: size * 0.16,
            height: size * 0.16,
            borderRadius: 2,
            backgroundColor: color,
            transform: [{ rotate: `${deg}deg` }, { translateY: -size * 0.32 }],
          }}
        />
      ))}
    </View>
  );
}

export function IconMore({ color = colors.text, size = 22 }: { color?: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

export function IconCalendar({ color = colors.text, size = 20 }: { color?: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        borderWidth: 1.8,
        borderColor: color,
        paddingTop: 4,
      }}
    >
      <View style={{ height: 1.8, backgroundColor: color, marginBottom: 3 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-evenly' }}>
        <View style={{ width: 3, height: 3, borderRadius: 1, backgroundColor: color }} />
        <View style={{ width: 3, height: 3, borderRadius: 1, backgroundColor: color }} />
        <View style={{ width: 3, height: 3, borderRadius: 1, backgroundColor: color }} />
      </View>
    </View>
  );
}

export function GlyphCheck({ color = colors.primary }: { color?: string }) {
  return (
    <View style={g.box}>
      <View style={[g.checkArm, { backgroundColor: color, transform: [{ rotate: '-45deg' }], width: 8 }]} />
      <View
        style={[
          g.checkArm,
          {
            backgroundColor: color,
            transform: [{ rotate: '45deg' }],
            width: 14,
            marginLeft: -2,
          },
        ]}
      />
    </View>
  );
}

export function GlyphPlus({ color = colors.badgeWait }: { color?: string }) {
  return (
    <View style={g.box}>
      <View style={[g.plusH, { backgroundColor: color }]} />
      <View style={[g.plusV, { backgroundColor: color }]} />
    </View>
  );
}

export function GlyphFlag({ color = colors.danger }: { color?: string }) {
  return (
    <View style={g.box}>
      <View style={[g.flagPole, { backgroundColor: color }]} />
      <View style={[g.flagCloth, { backgroundColor: color }]} />
    </View>
  );
}

export function GlyphDrop({ color = colors.badgeToday }: { color?: string }) {
  return (
    <View style={g.box}>
      <View
        style={{
          width: 12,
          height: 16,
          borderRadius: 8,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }, { scaleY: 1.15 }],
        }}
      />
    </View>
  );
}

export function GlyphGearMini({ color = '#7B1FA2' }: { color?: string }) {
  return (
    <View style={g.box}>
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function GlyphDot({ color = colors.primary }: { color?: string }) {
  return <View style={[g.dot, { backgroundColor: color }]} />;
}

/** Görev kartı sol logo — çizimli marka ikonu (emoji değil). */
export type TaskGlyphKind = 'leaf' | 'water' | 'tomato' | 'sprout' | 'camera' | 'default';

export function DrawnTaskGlyph({ kind }: { kind: TaskGlyphKind }) {
  if (kind === 'water') {
    return (
      <View
        style={[tg.wrap, { backgroundColor: colors.badgeWaitSoft }]}
        accessibilityLabel="Sulama logosu"
      >
        <View style={tg.drop}>
          <View style={tg.dropHighlight} />
        </View>
      </View>
    );
  }
  if (kind === 'tomato') {
    return (
      <View
        style={[tg.wrap, { backgroundColor: '#FFEBEE' }]}
        accessibilityLabel="Domates logosu"
      >
        <View style={tg.tomatoBody} />
        <View style={tg.tomatoShine} />
        <View style={tg.calyx}>
          <View style={[tg.calyxLeaf, { transform: [{ rotate: '-40deg' }] }]} />
          <View style={[tg.calyxLeaf, { transform: [{ rotate: '40deg' }] }]} />
          <View style={tg.calyxStem} />
        </View>
      </View>
    );
  }
  if (kind === 'sprout') {
    return (
      <View
        style={[tg.wrap, { backgroundColor: '#E8F5E9' }]}
        accessibilityLabel="Fide logosu"
      >
        <View style={tg.stem} />
        <View style={[tg.sproutLeaf, tg.sproutLeft]} />
        <View style={[tg.sproutLeaf, tg.sproutRight]} />
      </View>
    );
  }
  if (kind === 'camera') {
    return (
      <View
        style={[tg.wrap, { backgroundColor: colors.sageSoft }]}
        accessibilityLabel="Kamera logosu"
      >
        <View style={tg.camBody}>
          <View style={tg.camLensOuter}>
            <View style={tg.camLensInner} />
          </View>
        </View>
        <View style={tg.camFlash} />
      </View>
    );
  }
  // leaf / default — uygulama yaprak logosu
  return (
    <View
      style={[tg.wrap, { backgroundColor: colors.primarySoft }]}
      accessibilityLabel="Yaprak logosu"
    >
      <View style={tg.leafShape}>
        <View style={tg.leafVeinMain} />
        <View style={[tg.leafVeinSide, { top: 8, transform: [{ rotate: '28deg' }] }]} />
        <View style={[tg.leafVeinSide, { top: 14, transform: [{ rotate: '-28deg' }] }]} />
      </View>
    </View>
  );
}

const g = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  checkArm: { height: 2.5, borderRadius: 1 },
  plusH: { position: 'absolute', width: 14, height: 2.5, borderRadius: 1 },
  plusV: { position: 'absolute', width: 2.5, height: 14, borderRadius: 1 },
  flagPole: { width: 2, height: 16, borderRadius: 1, marginRight: 1 },
  flagCloth: {
    width: 10,
    height: 8,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

const tg = StyleSheet.create({
  wrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  drop: {
    width: 16,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.badgeWait,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropHighlight: {
    width: 5,
    height: 7,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginTop: -2,
    marginLeft: -2,
  },
  tomatoBody: {
    width: 22,
    height: 20,
    borderRadius: 11,
    backgroundColor: '#E53935',
    marginTop: 4,
  },
  tomatoShine: {
    position: 'absolute',
    top: 16,
    left: 14,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  calyx: {
    position: 'absolute',
    top: 8,
    width: 18,
    height: 12,
    alignItems: 'center',
  },
  calyxLeaf: {
    position: 'absolute',
    top: 2,
    width: 10,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
  },
  calyxStem: {
    width: 3,
    height: 6,
    borderRadius: 1,
    backgroundColor: '#1B5E20',
    marginTop: 0,
  },
  stem: {
    width: 3,
    height: 18,
    backgroundColor: colors.primary,
    borderRadius: 1.5,
    marginTop: 6,
  },
  sproutLeaf: {
    position: 'absolute',
    width: 13,
    height: 9,
    borderRadius: 6,
    backgroundColor: '#43A047',
    top: 14,
  },
  sproutLeft: {
    left: 9,
    transform: [{ rotate: '-38deg' }],
    backgroundColor: '#66BB6A',
  },
  sproutRight: {
    right: 9,
    transform: [{ rotate: '38deg' }],
  },
  camBody: {
    width: 26,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#546E7A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  camLensOuter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#263238',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camLensInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#90A4AE',
  },
  camFlash: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 5,
    height: 4,
    borderRadius: 1,
    backgroundColor: '#FFD54F',
  },
  leafShape: {
    width: 18,
    height: 26,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
    backgroundColor: colors.primary,
    transform: [{ rotate: '-18deg' }],
    alignItems: 'center',
    overflow: 'hidden',
  },
  leafVeinMain: {
    width: 1.5,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginTop: 4,
    borderRadius: 1,
  },
  leafVeinSide: {
    position: 'absolute',
    width: 7,
    height: 1.2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1,
  },
});
