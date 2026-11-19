import React from 'react';
import Svg, { Rect, Circle, Path, Ellipse, G } from 'react-native-svg';

/** Decorative delivery illustration (truck, destination pin, buildings). Purely visual; no data. */
export default function DeliveryIllustration({ width = 150, height = 112 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 150 112" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* soft ground */}
      <Ellipse cx="75" cy="100" rx="70" ry="8" fill="#FDE7C7" />
      {/* buildings */}
      <G>
        <Rect x="14" y="40" width="30" height="56" rx="3" fill="#FCE3C0" />
        <Rect x="20" y="48" width="6" height="6" rx="1" fill="#FFF7EA" />
        <Rect x="32" y="48" width="6" height="6" rx="1" fill="#FFF7EA" />
        <Rect x="20" y="60" width="6" height="6" rx="1" fill="#FFF7EA" />
        <Rect x="32" y="60" width="6" height="6" rx="1" fill="#FFF7EA" />
        <Rect x="118" y="52" width="22" height="44" rx="3" fill="#FCE3C0" />
        <Rect x="123" y="59" width="5" height="5" rx="1" fill="#FFF7EA" />
        <Rect x="131" y="59" width="5" height="5" rx="1" fill="#FFF7EA" />
        <Rect x="123" y="70" width="5" height="5" rx="1" fill="#FFF7EA" />
        <Rect x="131" y="70" width="5" height="5" rx="1" fill="#FFF7EA" />
      </G>
      {/* bushes */}
      <Circle cx="10" cy="92" r="7" fill="#7CB342" />
      <Circle cx="20" cy="94" r="6" fill="#8BC34A" />
      <Circle cx="132" cy="94" r="6" fill="#8BC34A" />
      <Circle cx="142" cy="92" r="7" fill="#7CB342" />
      {/* truck */}
      <Rect x="34" y="58" width="56" height="32" rx="4" fill="#FFB020" />
      <Rect x="34" y="82" width="56" height="8" fill="#C77A12" />
      <Path d="M90 66 h16 l10 12 v12 h-26 z" fill="#F26B0F" />
      <Path d="M96 70 h8 l6 8 h-14 z" fill="#FFE9C8" />
      <Circle cx="52" cy="92" r="9" fill="#3E2C1E" />
      <Circle cx="52" cy="92" r="3.5" fill="#E0E0E0" />
      <Circle cx="104" cy="92" r="9" fill="#3E2C1E" />
      <Circle cx="104" cy="92" r="3.5" fill="#E0E0E0" />
      {/* destination pin */}
      <Path d="M76 6 a16 16 0 0 1 16 16 c0 12 -16 28 -16 28 s-16 -16 -16 -28 a16 16 0 0 1 16 -16 z" fill="#F26B0F" />
      <Circle cx="76" cy="22" r="6" fill="#FFFFFF" />
    </Svg>
  );
}
