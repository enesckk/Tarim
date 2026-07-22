import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, tap, typography } from '../theme';

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

export function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'primary' | 'danger' | 'secondary';
}) {
  const backgroundColor =
    tone === 'danger'
      ? colors.danger
      : tone === 'secondary'
        ? colors.surface
        : colors.primary;
  const textColor = tone === 'secondary' ? colors.primary : colors.onPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        tone === 'secondary' && styles.secondaryBorder,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <Text style={[styles.buttonText, { color: textColor, opacity: 0.7 }]}>…</Text>
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function ListCard({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  if (!onPress) {
    return <View style={styles.card}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {children}
    </Pressable>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? (
        <View style={styles.emptyAction}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

/** Soft skeleton — prefer over spinner (premium loading). */
export function LoadingBlock({ label }: { label?: string }) {
  return (
    <View style={styles.loading} accessibilityLabel={label ?? 'Yükleniyor'}>
      <View style={styles.skelBlock} />
      <View style={[styles.skelBlock, styles.skelShort]} />
      <View style={styles.skelCard} />
      <View style={styles.skelCard} />
      <View style={styles.skelCard} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.screenTitle,
  },
  headerSubtitle: {
    ...typography.helper,
    marginTop: spacing.sm,
    maxWidth: 320,
  },
  button: {
    minHeight: tap.primary,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  secondaryBorder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  buttonText: {
    ...typography.button,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    minHeight: tap.row,
    marginBottom: spacing.md,
    // Breath over borders — hairline only
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardPressed: {
    backgroundColor: colors.bgWarm,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    ...typography.sectionTitle,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.body,
    maxWidth: 280,
  },
  emptyAction: {
    marginTop: spacing.xxl,
    alignSelf: 'stretch',
  },
  loading: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xxxl,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  skelBlock: {
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.sageSoft,
    opacity: 0.55,
    width: '55%',
  },
  skelShort: {
    width: '38%',
    height: 16,
    marginBottom: spacing.lg,
  },
  skelCard: {
    height: 76,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
