"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const COUNT = 950;
const FIELD_X = 28;
const FIELD_Y = 20;
const FIELD_Z = 11;

// Directional flow — particles drift up and slightly right, suggesting
// "shipping" code outward. Each particle has a velocity-aligned trail.
function Stream() {
  const lineRef = useRef<THREE.LineSegments>(null);
  const pointRef = useRef<THREE.Points>(null);

  const data = useMemo(() => {
    const linePositions = new Float32Array(COUNT * 6);
    const lineColors = new Float32Array(COUNT * 6);
    const headPositions = new Float32Array(COUNT * 3);
    const headColors = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    const trails = new Float32Array(COUNT);

    // Heavily weighted toward white — emerald/violet are accents
    const palette = [
      new THREE.Color("#FFFFFF"),
      new THREE.Color("#FFFFFF"),
      new THREE.Color("#FFFFFF"),
      new THREE.Color("#FFFFFF"),
      new THREE.Color("#10B981"),
      new THREE.Color("#34D399"),
      new THREE.Color("#A78BFA"),
    ];

    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * FIELD_X;
      const y = (Math.random() - 0.5) * FIELD_Y;
      const z = (Math.random() - 0.5) * FIELD_Z;

      const speed = 0.28 + Math.random() * 1.0;
      const vx = (0.15 + Math.random() * 0.2) * speed;
      const vy = (0.38 + Math.random() * 0.55) * speed;
      const vz = (Math.random() - 0.5) * 0.07 * speed;
      const trail = 0.16 + Math.random() * 0.24 + speed * 0.12;

      velocities[i * 3 + 0] = vx;
      velocities[i * 3 + 1] = vy;
      velocities[i * 3 + 2] = vz;
      trails[i] = trail;

      const c = palette[(Math.random() * palette.length) | 0];
      const brightness = 0.26 + Math.random() * 0.5;
      const r = c.r * brightness;
      const g = c.g * brightness;
      const b = c.b * brightness;

      headPositions[i * 3 + 0] = x;
      headPositions[i * 3 + 1] = y;
      headPositions[i * 3 + 2] = z;
      headColors[i * 3 + 0] = r;
      headColors[i * 3 + 1] = g;
      headColors[i * 3 + 2] = b;

      // Line: bright head, dark tail (fades into bg)
      linePositions[i * 6 + 0] = x;
      linePositions[i * 6 + 1] = y;
      linePositions[i * 6 + 2] = z;
      linePositions[i * 6 + 3] = x - vx * trail;
      linePositions[i * 6 + 4] = y - vy * trail;
      linePositions[i * 6 + 5] = z - vz * trail;

      lineColors[i * 6 + 0] = r;
      lineColors[i * 6 + 1] = g;
      lineColors[i * 6 + 2] = b;
      lineColors[i * 6 + 3] = 0;
      lineColors[i * 6 + 4] = 0;
      lineColors[i * 6 + 5] = 0;
    }

    return {
      linePositions,
      lineColors,
      headPositions,
      headColors,
      velocities,
      trails,
    };
  }, []);

  useFrame((_, delta) => {
    const lineSeg = lineRef.current;
    const points = pointRef.current;
    if (!lineSeg || !points) return;

    const linePos = (lineSeg.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const headPos = (points.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;

    const dt = Math.min(delta, 0.05);
    const xMax = FIELD_X * 0.55;
    const yMax = FIELD_Y * 0.55;
    const xMin = -xMax;
    const yMin = -yMax;
    const zHalf = FIELD_Z * 0.5;

    for (let i = 0; i < COUNT; i++) {
      const vx = data.velocities[i * 3 + 0];
      const vy = data.velocities[i * 3 + 1];
      const vz = data.velocities[i * 3 + 2];
      const trail = data.trails[i];

      let x = headPos[i * 3 + 0] + vx * dt;
      let y = headPos[i * 3 + 1] + vy * dt;
      let z = headPos[i * 3 + 2] + vz * dt;

      // Wrap when leaving the field along the dominant axes (up/right).
      // Re-emit from the bottom-left edge so the stream feels endless.
      if (y > yMax || x > xMax) {
        const fromBottom = Math.random() < 0.65;
        if (fromBottom) {
          x = xMin + Math.random() * (xMax - xMin) * 0.9;
          y = yMin + (Math.random() - 0.5) * 1.5;
        } else {
          x = xMin - Math.random() * 1.5;
          y = yMin + Math.random() * (yMax - yMin) * 0.9;
        }
        z = (Math.random() - 0.5) * zHalf * 2;
      }

      headPos[i * 3 + 0] = x;
      headPos[i * 3 + 1] = y;
      headPos[i * 3 + 2] = z;

      linePos[i * 6 + 0] = x;
      linePos[i * 6 + 1] = y;
      linePos[i * 6 + 2] = z;
      linePos[i * 6 + 3] = x - vx * trail;
      linePos[i * 6 + 4] = y - vy * trail;
      linePos[i * 6 + 5] = z - vz * trail;
    }

    (lineSeg.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <>
      <lineSegments ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.linePositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[data.lineColors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.42}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
      <points ref={pointRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.headPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[data.headColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.78}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}

function CameraTilt() {
  const { camera, size } = useThree();
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      target.current.x = (e.clientX / size.width - 0.5) * 0.6;
      target.current.y = (e.clientY / size.height - 0.5) * 0.4;
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      target.current.x = THREE.MathUtils.clamp(e.gamma / 45, -1, 1) * 0.5;
      target.current.y = THREE.MathUtils.clamp((e.beta - 30) / 45, -1, 1) * 0.35;
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("deviceorientation", onOrient);
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, [size.width, size.height]);

  useFrame(() => {
    current.current.x += (target.current.x - current.current.x) * 0.05;
    current.current.y += (target.current.y - current.current.y) * 0.05;
    camera.position.x = current.current.x * 1.2;
    camera.position.y = -current.current.y * 1.2;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function Nebula3DCanvas() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0, 9], fov: 55 }}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      }}
      style={{ pointerEvents: "none" }}
    >
      <Suspense fallback={null}>
        <Stream />
        <CameraTilt />
      </Suspense>
    </Canvas>
  );
}
