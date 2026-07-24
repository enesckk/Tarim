import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import type { LandDto } from '../api/client';
import { DrawnTaskGlyph, type TaskGlyphKind } from './icons';

export type BadgeTone = 'danger' | 'today' | 'wait' | 'success' | 'neutral';

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: BadgeTone;
}) {
  const bg =
    tone === 'danger'
      ? colors.dangerSoft
      : tone === 'today'
        ? colors.badgeTodaySoft
        : tone === 'wait'
          ? colors.badgeWaitSoft
          : tone === 'success'
            ? colors.successSoft
            : colors.sageSoft;
  const fg =
    tone === 'danger'
      ? colors.danger
      : tone === 'today'
        ? colors.badgeToday
        : tone === 'wait'
          ? colors.badgeWait
          : tone === 'success'
            ? colors.primary
            : colors.muted;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function SegmentTabs({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.segmentBtn, active && styles.segmentBtnActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Uygulama yaprak logosu (emoji değil). */
export function LeafMark({ size = 36 }: { size?: number }) {
  return (
    <View
      style={[styles.leafWrap, { width: size, height: size }]}
      accessibilityLabel="Tarım logosu"
    >
      <View style={[styles.leafOuter, { width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39 }]}>
        <View
          style={[
            styles.leafVein,
            {
              width: size * 0.38,
              height: size * 0.5,
              borderRadius: size * 0.25,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function IconCircle({
  tone,
  children,
}: {
  tone: BadgeTone | 'purple' | 'primary';
  children: React.ReactNode;
}) {
  const bg =
    tone === 'danger'
      ? colors.dangerSoft
      : tone === 'today'
        ? colors.badgeTodaySoft
        : tone === 'wait'
          ? colors.badgeWaitSoft
          : tone === 'success' || tone === 'primary'
            ? colors.primarySoft
            : tone === 'purple'
              ? '#F3E5F5'
              : colors.sageSoft;
  return (
    <View style={[styles.iconCircle, { backgroundColor: bg }]}>{children}</View>
  );
}

/** Arazi özeti — harita / haritada aç yok. */
export function LandCard({ land }: { land: LandDto; onPress?: () => void }) {
  const landName = land.name;
  const crop = land.activeCropType?.trim() || null;
  const size =
    land.sizeInDecares != null ? `${land.sizeInDecares} dekar` : null;
  const meta = [crop, size].filter(Boolean).join(' · ');

  return (
    <View style={styles.landCard} accessibilityLabel={`Arazi: ${landName}`}>
      <Text style={styles.landName} numberOfLines={1}>
        {landName}
      </Text>
      {meta ? (
        <Text style={styles.landMeta} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

/** Görev kartı sol logosu — çizimli marka ikonu (emoji değil). */
export function TaskGlyph({ title }: { title: string }) {
  const t = title.toLocaleLowerCase('tr-TR');
  let kind: TaskGlyphKind = 'default';
  if (/sulama|su |ıslah|irrig|damla|hortum/.test(t)) kind = 'water';
  else if (/domates|meyve|hasat|elma|üzüm|biber|salatalık/.test(t))
    kind = 'tomato';
  else if (/toprak|nem|gübre|fide|ekim|dikim|tohum|ilaç/.test(t)) kind = 'sprout';
  else if (/foto|görüntü|kanıt|çekim|kamera/.test(t)) kind = 'camera';
  else if (/yaprak|bitki|mahsul|ürün|tarla|bahçe/.test(t)) kind = 'leaf';
  return <DrawnTaskGlyph kind={kind} />;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.bgWarm,
    borderRadius: radii.md,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.sm,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.onPrimary,
  },
  leafWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-25deg' }],
  },
  leafVein: {
    width: 14,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    opacity: 0.9,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 4,
  },
  landName: {
    ...typography.bodyStrong,
    fontSize: 17,
  },
  landMeta: {
    ...typography.caption,
    color: colors.muted,
  },
});
