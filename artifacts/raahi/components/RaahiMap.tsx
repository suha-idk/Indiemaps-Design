import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

export interface MapStop {
  id: string;
  name: string;
}

interface RaahiMapProps {
  stops: MapStop[];
  destination: string;
  active: boolean;
  colors: {
    mapBackground: string;
    mapRoad: string;
    mapMajorRoad: string;
    mapPark: string;
    mapWater: string;
    mapRoute: string;
    mapLabel: string;
  };
}

const ORIGIN = { x: 55, y: 570 };
const DESTINATION = { x: 338, y: 138 };

function stopPoint(index: number, count: number) {
  const progress = (index + 1) / (count + 1);
  return {
    x: 78 + progress * 205,
    y: 520 - progress * 325 + (index % 2 === 0 ? -10 : 18),
  };
}

function routePath(points: { x: number; y: number }[]) {
  if (points.length < 2) return '';
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const midX = (previous.x + point.x) / 2 + 15;
    const midY = (previous.y + point.y) / 2 - 24;
    return `${path} Q ${midX} ${midY} ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

export function RaahiMap({
  stops,
  destination,
  active,
  colors,
}: RaahiMapProps) {
  const waypoints = stops.map((_, index) => stopPoint(index, stops.length));
  const route = routePath([ORIGIN, ...waypoints, DESTINATION]);

  return (
    <View style={[styles.container, { backgroundColor: colors.mapBackground }]}>
      <Svg
        accessibilityLabel="Illustrative Delhi demo map with a simulated route"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 400 700"
        preserveAspectRatio="none"
      >
        <Rect x="0" y="0" width="400" height="700" fill={colors.mapBackground} />
        <Path
          d="M-35 110 C48 74 95 123 166 82 S303 40 438 92 L438 178 C335 147 288 193 208 166 S66 201 -35 164Z"
          fill={colors.mapPark}
        />
        <Path
          d="M278 -20 C254 93 306 180 277 270 S302 426 269 720"
          stroke={colors.mapWater}
          strokeWidth="29"
          fill="none"
        />
        <Path
          d="M-30 254 C72 224 116 291 198 259 S329 230 432 274"
          stroke={colors.mapRoad}
          strokeWidth="18"
          fill="none"
        />
        <Path
          d="M-24 420 C61 388 130 445 211 415 S342 386 431 428"
          stroke={colors.mapRoad}
          strokeWidth="15"
          fill="none"
        />
        <Path
          d="M-20 602 C66 558 140 616 228 581 S343 558 426 591"
          stroke={colors.mapRoad}
          strokeWidth="17"
          fill="none"
        />
        <Path
          d="M62 -20 C94 88 47 150 83 245 S116 415 91 720"
          stroke={colors.mapRoad}
          strokeWidth="13"
          fill="none"
        />
        <Path
          d="M172 -20 C146 78 199 142 172 231 S204 403 180 721"
          stroke={colors.mapRoad}
          strokeWidth="12"
          fill="none"
        />
        <Path
          d="M365 -20 C330 86 386 155 352 246 S382 405 350 720"
          stroke={colors.mapRoad}
          strokeWidth="14"
          fill="none"
        />
        <Path
          d="M-30 331 C72 300 131 346 213 318 S345 298 429 331"
          stroke={colors.mapMajorRoad}
          strokeWidth="5"
          fill="none"
        />
        <Path
          d="M-15 493 C89 465 139 503 222 479 S342 458 423 489"
          stroke={colors.mapMajorRoad}
          strokeWidth="5"
          fill="none"
        />
        <Path
          d="M-12 94 C73 118 125 105 204 135 S319 114 416 151"
          stroke={colors.mapMajorRoad}
          strokeWidth="4"
          fill="none"
        />
        <SvgText x="21" y="224" fontSize="12" fill="#748397">
          NEW DELHI
        </SvgText>
        <SvgText x="296" y="357" fontSize="10" fill="#748397" rotation="-90">
          YAMUNA
        </SvgText>
        <SvgText x="258" y="636" fontSize="11" fill="#748397">
          RING ROAD
        </SvgText>
        <Path
          d={route}
          stroke={colors.mapLabel}
          strokeWidth={active ? 14 : 12}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d={route}
          stroke={colors.mapRoute}
          strokeWidth={active ? 8 : 7}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle
          cx={ORIGIN.x}
          cy={ORIGIN.y}
          r="17"
          fill="#FFFFFF"
          stroke="#14B8A6"
          strokeWidth="5"
        />
        <Circle cx={ORIGIN.x} cy={ORIGIN.y} r="6" fill="#0B1220" />
        <Rect
          x="16"
          y="592"
          width="112"
          height="24"
          rx="8"
          fill={colors.mapLabel}
        />
        <SvgText x="25" y="608" fontSize="11" fontWeight="600" fill="#111827">
          Connaught Place
        </SvgText>
        {waypoints.map((point, index) => {
          const stopName = stops[index]?.name ?? '';
          const labelWidth = Math.min(132, Math.max(68, stopName.length * 6.2 + 18));
          const labelX =
            point.x + labelWidth + 28 > 400 ? point.x - labelWidth - 19 : point.x + 15;
          const labelY = Math.max(24, point.y - 32);
          return (
            <React.Fragment key={stops[index]?.id ?? index}>
              <Circle cx={point.x} cy={point.y} r="16" fill="#FFFFFF" />
              <Circle cx={point.x} cy={point.y} r="12" fill="#F59E0B" />
              <SvgText
                x={point.x}
                y={point.y + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#111827"
              >
                {index + 1}
              </SvgText>
              <Rect
                x={labelX}
                y={labelY}
                width={labelWidth}
                height="25"
                rx="8"
                fill={colors.mapLabel}
              />
              <SvgText
                x={labelX + 8}
                y={labelY + 16}
                fontSize="10"
                fontWeight="600"
                fill="#111827"
              >
                {stopName.length > 18 ? `${stopName.slice(0, 17)}…` : stopName}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Circle
          cx={DESTINATION.x}
          cy={DESTINATION.y}
          r="20"
          fill="#FFFFFF"
        />
        <Circle cx={DESTINATION.x} cy={DESTINATION.y} r="14" fill="#DC2626" />
        <Circle cx={DESTINATION.x} cy={DESTINATION.y} r="4" fill="#FFFFFF" />
        <Rect x="263" y="102" width="125" height="24" rx="8" fill={colors.mapLabel} />
        <SvgText x="272" y="118" fontSize="11" fontWeight="600" fill="#111827">
          {destination.length > 17 ? `${destination.slice(0, 16)}…` : destination}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
