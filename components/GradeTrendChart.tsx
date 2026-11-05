import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Line, Circle, Path, Text as SvgText } from "react-native-svg";
import { useTheme, useFontScale } from "@/themes/ThemeContext";
import { TrendPoint } from "@/services/grades";

const CHART_HEIGHT = 220;
const PAD_LEFT = 42;
const PAD_RIGHT = 18;
const PAD_TOP = 18;
const PAD_BOTTOM = 42;

interface Props {
  points: TrendPoint[];
  threshold?: number;
}

export default function GradeTrendChart({ points, threshold }: Props) {
  const { theme } = useTheme();
  const scale = useFontScale();
  const scaled = (n: number) => n * scale;

  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== width) setWidth(w);
  };

  const plot = useMemo(() => {
    const w = Math.max(width, 0);
    const plotWidth = Math.max(w - PAD_LEFT - PAD_RIGHT, 1);
    const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

    const x = (i: number) => {
      if (points.length <= 1) return PAD_LEFT + plotWidth / 2;
      return PAD_LEFT + (i * plotWidth) / (points.length - 1);
    };
    const y = (v: number) => PAD_TOP + ((20 - v) / 20) * plotHeight;

    return { plotWidth, plotHeight, x, y };
  }, [width, points.length]);

  if (points.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.muted }]}>
          Aucune donnée historique disponible.
        </Text>
      </View>
    );
  }

  const gridValues = [0, 5, 10, 15, 20];
  const hasData = points.some((p) => p.value !== null);

  // Build the trend line path, skipping unavailable points.
  const linePoints = points
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.value !== null);

  let path = "";
  if (linePoints.length > 0) {
    path = linePoints
      .map((p, idx) => {
        const px = plot.x(p.i);
        const py = plot.y(p.value as number);
        return `${idx === 0 ? "M" : "L"} ${px} ${py}`;
      })
      .join(" ");
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]} onLayout={onLayout}>
      <Svg width={width} height={CHART_HEIGHT}>
        {/* Horizontal grid lines + Y labels */}
        {gridValues.map((v) => {
          const gy = plot.y(v);
          const isThreshold = threshold !== undefined && Math.abs(v - threshold) < 0.01;
          return (
            <React.Fragment key={v}>
              <Line
                x1={PAD_LEFT}
                y1={gy}
                x2={width - PAD_RIGHT}
                y2={gy}
                stroke={isThreshold ? theme.accent : theme.background}
                strokeWidth={isThreshold ? 1.5 : 1}
                strokeDasharray={isThreshold ? "4 4" : undefined}
                opacity={isThreshold ? 0.8 : 1}
              />
              <SvgText
                x={PAD_LEFT - 8}
                y={gy + 4}
                fontSize={scaled(10)}
                fill={theme.muted}
                textAnchor="end"
              >
                {v}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Trend line */}
        {path.length > 0 && (
          <Path d={path} stroke={theme.accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Data points + X labels */}
        {points.map((p, i) => {
          const px = plot.x(i);
          const py = p.value !== null ? plot.y(p.value) : plot.y(0);
          return (
            <React.Fragment key={`${p.label}-${p.au}-${i}`}>
              {p.value !== null && (
                <>
                  <Circle cx={px} cy={py} r={4.5} fill={theme.accent} stroke={theme.surface} strokeWidth={2} />
                  <SvgText
                    x={px}
                    y={py - 10}
                    fontSize={scaled(10)}
                    fontWeight="700"
                    fill={theme.text}
                    textAnchor="middle"
                  >
                    {p.value.toFixed(1)}
                  </SvgText>
                </>
              )}
              <SvgText
                x={px}
                y={CHART_HEIGHT - 12}
                fontSize={scaled(10)}
                fontWeight="600"
                fill={theme.muted}
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
              {p.au && (
                <SvgText
                  x={px}
                  y={CHART_HEIGHT - 2}
                  fontSize={scaled(8)}
                  fill={theme.muted}
                  textAnchor="middle"
                  opacity={0.7}
                >
                  {p.au}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>

      {!hasData && (
        <View style={styles.noDataOverlay}>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            Moyennes non publiées
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    paddingVertical: 8,
    elevation: 1,
    overflow: "hidden",
  },
  emptyContainer: {
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  noDataOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
