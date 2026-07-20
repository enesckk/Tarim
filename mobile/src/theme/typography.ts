import { TextStyle } from 'react-native';
import { colors } from './colors';

/** Large, outdoor-readable type for low digital literacy. */
export const typography = {
  brand: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.primary,
  } satisfies TextStyle,
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
  } satisfies TextStyle,
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  } satisfies TextStyle,
  body: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400',
    color: colors.textSecondary,
  } satisfies TextStyle,
  bodyStrong: {
    fontSize: 17,
    lineHeight: 24,
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
    fontSize: 15,
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
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.1,
  } satisfies TextStyle,
  tab: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  } satisfies TextStyle,
};
