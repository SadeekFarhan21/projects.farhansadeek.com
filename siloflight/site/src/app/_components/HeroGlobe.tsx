"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type LatLon = { lat: number; lon: number; name?: string };

const CITIES: LatLon[] = [
  { lat: 40.6413, lon: -73.7781, name: "JFK" },
  { lat: 33.9416, lon: -118.4085, name: "LAX" },
  { lat: 47.4502, lon: -122.3088, name: "SEA" },
  { lat: 51.47, lon: -0.4543, name: "LHR" },
  { lat: 49.0097, lon: 2.5479, name: "CDG" },
  { lat: 35.5494, lon: 139.7798, name: "HND" },
  { lat: 25.2532, lon: 55.3657, name: "DXB" },
  { lat: 1.3644, lon: 103.9915, name: "SIN" },
  { lat: -33.9399, lon: 151.1753, name: "SYD" },
  { lat: -22.8099, lon: -43.2505, name: "GIG" },
  { lat: 55.6181, lon: 12.6561, name: "CPH" },
  { lat: 19.4361, lon: -99.0719, name: "MEX" },
  { lat: 41.0082, lon: 28.9784, name: "IST" },
  { lat: 37.6213, lon: -122.379, name: "SFO" },
  { lat: 22.3089, lon: 113.9145, name: "HKG" },
  { lat: 28.5562, lon: 77.1, name: "DEL" },
  { lat: -1.3192, lon: 36.9278, name: "NBO" },
  { lat: 59.6519, lon: 17.9186, name: "ARN" },
];

const RADIUS = 1;

function latLonToVec3(lat: number, lon: number, r = RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function makeArcGeometry(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments = 64,
): { positions: Float32Array; length: number } {
  const angle = start.angleTo(end);
  const altitude = 0.18 + Math.sin(angle / 2) * 0.32;
  const mid = start.clone().add(end).multiplyScalar(0.5).normalize();
  const ctrl = mid.multiplyScalar(RADIUS + altitude);

  const positions = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = new THREE.Vector3().lerpVectors(start, ctrl, t);
    const b = new THREE.Vector3().lerpVectors(ctrl, end, t);
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  }
  return { positions, length: segments + 1 };
}

type Arc = {
  line: THREE.Line;
  totalPoints: number;
  drawProgress: number;
  drawSpeed: number;
  fadeProgress: number;
  fadeSpeed: number;
  state: "drawing" | "holding" | "fading";
  holdTime: number;
};

export default function HeroGlobe({
  className,
}: {
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.4, 3.6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    // Globe — solid dark sphere so points/arcs feel attached to a body.
    const globeGeo = new THREE.SphereGeometry(RADIUS, 64, 64);
    const globeMat = new THREE.MeshBasicMaterial({
      color: 0x0a0d14,
      transparent: true,
      opacity: 0.85,
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // Wireframe lat/lon grid overlay.
    const wireGeo = new THREE.SphereGeometry(RADIUS * 1.001, 36, 24);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x9fc7ff,
      transparent: true,
      opacity: 0.18,
    });
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(wireGeo),
      wireMat,
    );
    scene.add(wire);

    // Glow halo using additive sprites — a soft outer ring.
    const haloGeo = new THREE.SphereGeometry(RADIUS * 1.06, 64, 64);
    const haloMat = new THREE.ShaderMaterial({
      uniforms: { c: { value: 0.6 }, p: { value: 4.5 } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float c;
        uniform float p;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
          gl_FragColor = vec4(0.62, 0.78, 1.0, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    scene.add(halo);

    // City dots — small glowing points raised slightly above the surface.
    const cityGroup = new THREE.Group();
    const dotGeo = new THREE.SphereGeometry(0.012, 12, 12);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xe6f0ff });
    const cityVecs = CITIES.map((c) => {
      const v = latLonToVec3(c.lat, c.lon, RADIUS * 1.005);
      const m = new THREE.Mesh(dotGeo, dotMat);
      m.position.copy(v);
      cityGroup.add(m);

      // Soft halo around each dot.
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x9fc7ff,
        transparent: true,
        opacity: 0.35,
      });
      const ringGeo = new THREE.SphereGeometry(0.022, 12, 12);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(v);
      cityGroup.add(ring);
      return v;
    });
    scene.add(cityGroup);

    // Arcs — preallocated pool of lines that we (re)assign new endpoints to
    // and animate from start to end via dashed-draw-on, then fade.
    const ARC_COUNT = 7;
    const arcs: Arc[] = [];
    for (let i = 0; i < ARC_COUNT; i++) {
      const positions = new Float32Array(65 * 3);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geom.setDrawRange(0, 0);
      const mat = new THREE.LineBasicMaterial({
        color: 0x9fc7ff,
        transparent: true,
        opacity: 0,
      });
      const line = new THREE.Line(geom, mat);
      scene.add(line);
      arcs.push({
        line,
        totalPoints: 65,
        drawProgress: 0,
        drawSpeed: 0,
        fadeProgress: 0,
        fadeSpeed: 0,
        state: "fading",
        holdTime: 0,
      });
    }

    function spawnArc(arc: Arc) {
      const a = cityVecs[Math.floor(Math.random() * cityVecs.length)];
      let b = cityVecs[Math.floor(Math.random() * cityVecs.length)];
      while (b === a) b = cityVecs[Math.floor(Math.random() * cityVecs.length)];
      const { positions, length } = makeArcGeometry(a, b, 64);
      const attr = arc.line.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      (attr.array as Float32Array).set(positions);
      attr.needsUpdate = true;
      arc.totalPoints = length;
      arc.line.geometry.setDrawRange(0, 0);
      arc.drawProgress = 0;
      arc.drawSpeed = 0.012 + Math.random() * 0.012;
      arc.fadeProgress = 0;
      arc.fadeSpeed = 0.008 + Math.random() * 0.008;
      arc.state = "drawing";
      arc.holdTime = 30 + Math.floor(Math.random() * 60);
      (arc.line.material as THREE.LineBasicMaterial).opacity = 0.9;
    }
    arcs.forEach(spawnArc);

    // Background star particles.
    const starCount = 360;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 6 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.018,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Tilt the whole world group so it presents at a flattering angle.
    const world = new THREE.Group();
    world.add(globe);
    world.add(wire);
    world.add(halo);
    world.add(cityGroup);
    arcs.forEach((a) => world.add(a.line));
    world.rotation.z = 0.32;
    world.rotation.x = 0.18;
    scene.add(world);

    // Resize handling.
    function resize() {
      const w = mount!.clientWidth;
      const h = mount!.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Mouse parallax.
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    function onMove(e: PointerEvent) {
      const rect = mount!.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 0.5;
      target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 0.4;
    }
    window.addEventListener("pointermove", onMove);

    // Pause when off-screen.
    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.01 },
    );
    io.observe(mount);

    let raf = 0;
    let last = performance.now();
    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(64, now - last);
      last = now;
      if (!visible) return;

      // Smooth parallax follow.
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;

      if (!reduced) {
        world.rotation.y += 0.0008 * dt;
      }
      world.rotation.x = 0.18 + current.y * 0.6;
      world.position.x = current.x * 0.15;

      // Animate arcs: draw → hold → fade → respawn.
      for (const arc of arcs) {
        const mat = arc.line.material as THREE.LineBasicMaterial;
        if (arc.state === "drawing") {
          arc.drawProgress = Math.min(1, arc.drawProgress + arc.drawSpeed);
          arc.line.geometry.setDrawRange(
            0,
            Math.floor(arc.drawProgress * arc.totalPoints),
          );
          if (arc.drawProgress >= 1) arc.state = "holding";
        } else if (arc.state === "holding") {
          arc.holdTime -= 1;
          if (arc.holdTime <= 0) arc.state = "fading";
        } else {
          arc.fadeProgress = Math.min(1, arc.fadeProgress + arc.fadeSpeed);
          mat.opacity = 0.9 * (1 - arc.fadeProgress);
          if (arc.fadeProgress >= 1) spawnArc(arc);
        }
      }

      // Pulse the city halos slightly.
      const t = now / 1000;
      cityGroup.children.forEach((child, i) => {
        if (i % 2 === 1) {
          const m = child as THREE.Mesh;
          const s = 1 + 0.18 * Math.sin(t * 2 + i);
          m.scale.setScalar(s);
        }
      });

      stars.rotation.y += 0.00005 * dt;

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      renderer.dispose();
      globeGeo.dispose();
      globeMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      arcs.forEach((a) => {
        a.line.geometry.dispose();
        (a.line.material as THREE.Material).dispose();
      });
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden />;
}
