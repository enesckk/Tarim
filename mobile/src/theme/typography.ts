import { TextStyle } from 'react-native';
import { colors } from './colors';

/** Three levels: Heading · Body · Caption — outdoor-readable. */
export const typography = {
  brand: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: colors.primary,
  } satisfies TextStyle,
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
  } satisfies TextStyle,
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: colors.text,
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: colors.textSecondary,
  } satisfies TextStyle,
  bodyStrong: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.text,
  } satisfies TextStyle,
  helper: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    color: colors.muted,
  } satisfies TextStyle,
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.muted,
  } satisfies TextStyle,
  button: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0,
  } satisfies TextStyle,
  tab: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.15,
  } satisfies TextStyle,
};
