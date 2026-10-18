/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#0B1220',
    tint: '#14B8A6',
    background: '#F3F6FA',
    foreground: '#111827',
    card: '#FFFFFF',
    cardForeground: '#111827',
    primary: '#14B8A6',
    primaryForeground: '#0B1220',
    secondary: '#E8EEF2',
    secondaryForeground: '#1F2937',
    muted: '#E8EEF2',
    mutedForeground: '#64748B',
    accent: '#D8F6F1',
    accentForeground: '#0B1220',
    destructive: '#DC2626',
    destructiveForeground: '#FFFFFF',
    border: '#D8E0E8',
    input: '#D8E0E8',
    mapBackground: '#E8EEF2',
    mapRoad: '#FFFFFF',
    mapMajorRoad: '#D4DCE3',
    mapPark: '#D8E8D8',
    mapWater: '#D1E5EB',
    mapRoute: '#14B8A6',
    mapLabel: '#FFFFFF',
    copilot: '#111827',
    copilotSecondary: '#1F2937',
    copilotText: '#F8FAFC',
    copilotMuted: '#CBD5E1',
  },
  dark: {
    text: '#F3F6FA',
    tint: '#2DD4BF',
    background: '#0B1220',
    foreground: '#F3F6FA',
    card: '#111827',
    cardForeground: '#F3F6FA',
    primary: '#2DD4BF',
    primaryForeground: '#0B1220',
    secondary: '#1F2937',
    secondaryForeground: '#F3F6FA',
    muted: '#1F2937',
    mutedForeground: '#AAB6C5',
    accent: '#173B3A',
    accentForeground: '#CCFBF1',
    destructive: '#F87171',
    destructiveForeground: '#0B1220',
    border: '#334155',
    input: '#334155',
    mapBackground: '#E8EEF2',
    mapRoad: '#FFFFFF',
    mapMajorRoad: '#D4DCE3',
    mapPark: '#D8E8D8',
    mapWater: '#D1E5EB',
    mapRoute: '#14B8A6',
    mapLabel: '#FFFFFF',
    copilot: '#111827',
    copilotSecondary: '#1F2937',
    copilotText: '#F8FAFC',
    copilotMuted: '#CBD5E1',
  },
  radius: 8,
};

export default colors;
