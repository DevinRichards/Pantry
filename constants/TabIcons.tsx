/**
 * SVG tab bar icons — matches the Botanical Editorial design.
 * Each icon is a simple line-art SVG at 22×22 viewBox.
 */
import Svg, {
  Rect,
  Line,
  Circle,
  Path,
  Polyline,
} from 'react-native-svg';

type IconProps = { color: string; size?: number };

export function PantryIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Rect x="3" y="4" width="16" height="15" rx="2.5" stroke={color} strokeWidth="1.5" />
      <Line x1="3" y1="10" x2="19" y2="10" stroke={color} strokeWidth="1.5" />
      <Circle cx="8" cy="7" r="1" fill={color} />
      <Line x1="7" y1="14.5" x2="15" y2="14.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function RecipesIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M11 3C8 3 5 6 5 9.5V13H17V9.5C17 6 14 3 11 3Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Rect x="5" y="13" width="12" height="3" rx="1" stroke={color} strokeWidth="1.5" />
      <Line x1="9.5" y1="13" x2="9.5" y2="16" stroke={color} strokeWidth="1.5" />
      <Line x1="12.5" y1="13" x2="12.5" y2="16" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}

export function ShoppingIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M5.5 6H17.5L15.5 15H7.5L5.5 6Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Path d="M4 4H5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="9" cy="18" r="1.5" fill={color} />
      <Circle cx="14.5" cy="18" r="1.5" fill={color} />
    </Svg>
  );
}

export function CookbookIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M5 4H17C17.6 4 18 4.4 18 5V18C18 18.6 17.6 19 17 19H5C4.4 19 4 18.6 4 18V5C4 4.4 4.4 4 5 4Z"
        stroke={color}
        strokeWidth="1.5"
      />
      <Line x1="4" y1="8" x2="18" y2="8" stroke={color} strokeWidth="1.5" />
      <Line x1="8" y1="12.5" x2="14" y2="12.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="8" y1="15.5" x2="11.5" y2="15.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function CameraIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Rect x="1" y="4" width="14" height="9" rx="2" stroke={color} strokeWidth="1.3" />
      <Circle cx="8" cy="8.5" r="2.3" stroke={color} strokeWidth="1.3" />
      <Path d="M5.5 4V3C5.5 2.4 5.9 2 6.5 2H9.5C10.1 2 10.5 2.4 10.5 3V4" stroke={color} strokeWidth="1.3" />
    </Svg>
  );
}

export function ProfileIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Circle cx="11" cy="8" r="3.5" stroke={color} strokeWidth="1.5" />
      <Path
        d="M4 19C4 15.7 7.1 13 11 13C14.9 13 18 15.7 18 19"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}
