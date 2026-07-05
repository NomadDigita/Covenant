"use client";

import React, { useMemo } from "react";

interface RadarMetrics {
  reputation: number; // Scale: 0 - 1000
  reliability: number; // Scale: 0 - 100
  speed: number;       // Scale: 0 - 100
  accuracy: number;    // Scale: 0 - 100
  cost: number;        // Scale: 0 - 100
}

interface RadarChartProps {
  metrics: RadarMetrics;
  size?: number;
}

export function RadarChart({ metrics, size = 220 }: RadarChartProps) {
  // Trigonometric Polar Coordinates Generator
  // 5 axes: Reputation, Reliability, Speed, Accuracy, Cost
  const numAxes = 5;
  const center = 100; // SVG Viewbox Center (x, y)
  const maxRadius = 70; // Maximum boundary radius

  // Pre-calculate coordinate angles for 5 pentagon vertices
  const angles = useMemo(() => {
    const calculated = [];
    for (let i = 0; i < numAxes; i++) {
      // Offset by -PI/2 so the 1st axis (Reputation) points straight up
      calculated.push((i * 2 * Math.PI) / numAxes - Math.PI / 2);
    }
    return calculated;
  }, []);

  // Compute point coordinates helper
  const getCoordinates = (radius: number, angle: number) => {
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y };
  };

  // Convert raw metrics to scaled percentages (0.0 to 1.0)
  const scaledMetrics = useMemo(() => {
    return [
      metrics.reputation / 1000,
      metrics.reliability / 100,
      metrics.speed / 100,
      metrics.accuracy / 100,
      metrics.cost / 100,
    ];
  }, [metrics]);

  // Generate grid pentagons (Threshold rings)
  const gridRings = [0.25, 0.5, 0.75, 1.0];
  const ringPolygons = gridRings.map((scale) => {
    const radius = maxRadius * scale;
    return angles.map((angle) => {
      const { x, y } = getCoordinates(radius, angle);
      return `${x},${y}`;
    }).join(" ");
  });

  // Generate the active metrics polygon coordinates
  const valuePolygonPoints = useMemo(() => {
    return angles.map((angle, index) => {
      const radius = maxRadius * scaledMetrics[index];
      const { x, y } = getCoordinates(radius, angle);
      return { x, y };
    });
  }, [angles, scaledMetrics]);

  const valuePolygonString = valuePolygonPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Axis Labels Text Alignments and coordinates
  const labels = ["REPUTATION", "RELIABILITY", "SPEED", "ACCURACY", "COST"];
  const labelOffsets = [
    { dx: -35, dy: -12 }, // Top Center
    { dx: 6, dy: 3 },    // Top Right
    { dx: 4, dy: 10 },   // Bottom Right
    { dx: -60, dy: 10 }, // Bottom Left
    { dx: -65, dy: 3 },  // Top Left
  ];

  return (
    <div className="flex flex-col items-center justify-center font-mono select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="text-neon-secondary shrink-0"
      >
        {/* A. CONCENTRIC BACKGROUND HUD GRID PENTAGONS */}
        {ringPolygons.map((points, idx) => (
          <polygon
            key={idx}
            points={points}
            fill="none"
            stroke="rgba(0, 229, 255, 0.15)"
            strokeWidth="1"
            strokeDasharray={idx < 3 ? "2 2" : "none"}
          />
        ))}

        {/* B. RADIAL AXES LINES */}
        {angles.map((angle, idx) => {
          const outer = getCoordinates(maxRadius, angle);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(0, 229, 255, 0.12)"
              strokeWidth="1"
            />
          );
        })}

        {/* C. ACTIVE VALUES PENTAGON (The Glowing Core fill) */}
        <polygon
          points={valuePolygonString}
          fill="rgba(255, 85, 0, 0.15)"
          stroke="#FF5500"
          strokeWidth="2"
          className="animate-pulse"
        />

        {/* D. VERTEX DOTS */}
        {valuePolygonPoints.map((point, idx) => (
          <circle
            key={idx}
            cx={point.x}
            cy={point.y}
            r="3.5"
            fill="#FF5500"
            stroke="#05050A"
            strokeWidth="1"
          />
        ))}

        {/* E. PENTAGON CORNER AXIS TEXT LABELS */}
        {angles.map((angle, idx) => {
          const pos = getCoordinates(maxRadius, angle);
          const offset = labelOffsets[idx];
          return (
            <text
              key={idx}
              x={pos.x + offset.dx}
              y={pos.y + offset.dy}
              fill="#A0A0B0"
              fontSize="8"
              fontWeight="bold"
              className="tracking-tight"
            >
              {labels[idx]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default RadarChart;