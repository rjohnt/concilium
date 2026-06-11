"use client";

/* ------------------------------------------------------------------ *
 * CouncilChamber3D — a live, interactive Three.js "council ring" for   *
 * the marketing page. The consensus ring + four seat nodes are the     *
 * same shape as the logo mark ("the mark is the UI"). Drag to rotate;  *
 * hover or tap a seat to meet the stand-in holding it.                 *
 *                                                                      *
 * Three.js is dynamically imported the first time the band scrolls     *
 * into view, so it stays out of the initial page bundle.               *
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./welcome.module.css";

type Seat = {
  key: string;
  name: string;
  role: string;
  hex: number; // three.js needs a numeric color
  css: string; // matching brand token for the DOM chips
  holds: string;
};

// Order around the ring: top, right, bottom, left — mirrors the logo mark
// and the sizzle reel. Colors mirror the persona tokens in globals.css.
const SEATS: Seat[] = [
  { key: "eng", name: "Ada", role: "Engineer", hex: 0x1e9c86, css: "var(--persona-eng-500)", holds: "scaffolds the services and opens the PR" },
  { key: "des", name: "Iris", role: "Designer", hex: 0x7a57d1, css: "var(--persona-des-500)", holds: "shapes the surface and keeps it warm" },
  { key: "prod", name: "Pam", role: "Product Owner", hex: 0xd9962a, css: "var(--persona-prod-500)", holds: "holds the thread and writes the spec" },
  { key: "qa", name: "Ray", role: "QA", hex: 0x2f82c7, css: "var(--persona-res-500)", holds: "checks the edge cases and validates" },
];

export default function CouncilChamber3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  // active seat index, kept in a ref for the rAF loop + mirrored to state
  const activeRef = useRef<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const setActiveSeat = (i: number | null) => {
    activeRef.current = i;
    setActive(i);
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;
    let started = false;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    async function start() {
      if (started || disposed) return;
      started = true;
      try {
      const THREE = await import("three");
      if (disposed || !mount) return;

      const width = mount.clientWidth;
      const height = mount.clientHeight;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.touchAction = "pan-y";
      renderer.domElement.style.cursor = "grab";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
      camera.position.set(0, 2.5, 6.7);
      camera.lookAt(0, 0.55, 0);

      // group we rotate (drag + idle spin)
      const group = new THREE.Group();
      group.rotation.x = 0.32; // gentle table tilt — enough to read seated figures
      scene.add(group);

      const CHAIR_R = 1.95;

      // faint warm disc to ground the room on the cream section
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(2.7, 64),
        new THREE.MeshStandardMaterial({
          color: 0xf1e9dc,
          roughness: 0.95,
          metalness: 0,
          transparent: true,
          opacity: 0.5,
        }),
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = -0.01;
      group.add(disc);

      // the round council table
      const table = new THREE.Mesh(
        new THREE.CylinderGeometry(1.3, 1.36, 0.16, 56),
        new THREE.MeshStandardMaterial({
          color: 0xe7dcc9,
          roughness: 0.72,
          metalness: 0.04,
        }),
      );
      table.position.y = 0.34;
      group.add(table);

      // the consensus ring inlaid on the table top (the logo-mark shape)
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xe85d34,
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0xe85d34,
        emissiveIntensity: 0.3,
      });
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.96, 0.04, 20, 140),
        ringMat,
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.43;
      group.add(ring);

      // four council chairs, each holding a seated persona "pebble"
      const chairMat = new THREE.MeshStandardMaterial({
        color: 0xe3d7c4,
        roughness: 0.8,
        metalness: 0.02,
      });
      type PersonaObj = {
        pivot: InstanceType<typeof THREE.Group>;
        figure: InstanceType<typeof THREE.Group>;
        mats: InstanceType<typeof THREE.MeshStandardMaterial>[];
        index: number;
      };
      const personaObjs: PersonaObj[] = [];
      const personaHitMeshes: InstanceType<typeof THREE.Mesh>[] = [];

      SEATS.forEach((seat, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 2;
        const x = Math.cos(a) * CHAIR_R;
        const z = Math.sin(a) * CHAIR_R;

        // a place at the table: chair (local +z faces outward) + figure
        const place = new THREE.Group();
        place.position.set(x, 0, z);
        place.rotation.y = Math.PI / 2 - a;
        group.add(place);

        // pedestal + seat slab + backrest
        const pedestal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.1, 0.34, 16),
          chairMat,
        );
        pedestal.position.set(0, 0.17, 0);
        place.add(pedestal);
        const seatSlab = new THREE.Mesh(
          new THREE.BoxGeometry(0.46, 0.07, 0.44),
          chairMat,
        );
        seatSlab.position.set(0, 0.36, 0);
        place.add(seatSlab);
        const back = new THREE.Mesh(
          new THREE.BoxGeometry(0.46, 0.5, 0.07),
          chairMat,
        );
        back.position.set(0, 0.63, 0.2);
        place.add(back);

        // the seated persona figure (body + head), in the seat color
        const figure = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({
          color: seat.hex,
          emissive: seat.hex,
          emissiveIntensity: 0.32,
          roughness: 0.45,
          metalness: 0.04,
        });
        const headMat = new THREE.MeshStandardMaterial({
          color: seat.hex,
          emissive: seat.hex,
          emissiveIntensity: 0.32,
          roughness: 0.4,
          metalness: 0.04,
        });
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.16, 0.2, 8, 20),
          bodyMat,
        );
        body.position.set(0, 0.62, -0.02);
        body.userData.index = i;
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.155, 28, 28),
          headMat,
        );
        head.position.set(0, 0.96, 0.0);
        head.userData.index = i;
        figure.add(body, head);
        place.add(figure);

        personaHitMeshes.push(body, head);
        personaObjs.push({ pivot: place, figure, mats: [bodyMat, headMat], index: i });
      });

      // lighting — bright enough for a light page
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe8dccb, 1.15));
      const dir = new THREE.DirectionalLight(0xfff3e8, 1.1);
      dir.position.set(2, 5, 3);
      scene.add(dir);

      // ---- interaction: drag to rotate + hover/click a seat ----------
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let dragging = false;
      let lastX = 0;
      let velocity = 0;
      let pointerInside = false;

      function pickSeat(clientX: number, clientY: number): number | null {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(personaHitMeshes, false);
        return hits.length ? (hits[0].object.userData.index as number) : null;
      }

      const onDown = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
        velocity = 0;
        renderer.domElement.style.cursor = "grabbing";
        renderer.domElement.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        pointerInside = true;
        if (dragging) {
          const dx = e.clientX - lastX;
          lastX = e.clientX;
          velocity = dx * 0.005;
          group.rotation.y += velocity;
        } else {
          const idx = pickSeat(e.clientX, e.clientY);
          setActiveSeat(idx);
          renderer.domElement.style.cursor = idx != null ? "pointer" : "grab";
        }
      };
      const onUp = (e: PointerEvent) => {
        if (dragging && Math.abs(velocity) < 0.002) {
          // treat as a tap → select the seat under the pointer
          const idx = pickSeat(e.clientX, e.clientY);
          if (idx != null) setActiveSeat(idx);
        }
        dragging = false;
        renderer.domElement.style.cursor = "grab";
      };
      const onLeave = () => {
        pointerInside = false;
        if (!dragging) setActiveSeat(null);
      };

      const el = renderer.domElement;
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointerleave", onLeave);

      // ---- resize ----------------------------------------------------
      const onResize = () => {
        if (!mount) return;
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(mount);

      // ---- render loop ----------------------------------------------
      let raf = 0;
      let t = 0;
      const render = () => {
        t += 0.016;
        if (!dragging) {
          if (!reduceMotion && !pointerInside) group.rotation.y += 0.0024;
          group.rotation.y += velocity;
          velocity *= 0.94;
        }
        const sel = activeRef.current;
        personaObjs.forEach((p) => {
          const isActive = p.index === sel;
          // lift + lean the active persona toward the table; others settle back
          const targetScale = isActive ? 1.14 : 1;
          p.figure.scale.lerp(
            new THREE.Vector3(targetScale, targetScale, targetScale),
            0.18,
          );
          const bob = reduceMotion ? 0 : Math.sin(t * 1.3 + p.index) * 0.022;
          const targetY = (isActive ? 0.06 : 0) + bob;
          p.figure.position.y += (targetY - p.figure.position.y) * 0.2;
          p.mats.forEach((m) => {
            m.emissiveIntensity +=
              ((isActive ? 0.95 : 0.32) - m.emissiveIntensity) * 0.18;
          });
        });
        // the consensus ring warms when a seat is in focus
        ringMat.emissiveIntensity +=
          ((sel == null ? 0.3 : 0.62) - ringMat.emissiveIntensity) * 0.12;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(render);
      };
      render();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointerleave", onLeave);
        renderer.dispose();
        scene.traverse((obj) => {
          const m = obj as InstanceType<typeof THREE.Mesh>;
          if (m.geometry) m.geometry.dispose();
          const mat = m.material as
            | InstanceType<typeof THREE.Material>
            | InstanceType<typeof THREE.Material>[]
            | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else if (mat) mat.dispose();
        });
        if (el.parentNode) el.parentNode.removeChild(el);
      };
      } catch (err) {
        console.error("[CouncilChamber3D] init failed:", err);
      }
    }

    // only spin up Three.js once the band is in view
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          start();
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(mount);

    return () => {
      disposed = true;
      io.disconnect();
      if (cleanup) cleanup();
    };
  }, []);

  const seat = active != null ? SEATS[active] : null;

  return (
    <div className={`${styles.sec} ${styles.chamber}`} id="chamber">
      <div className={styles.wrap}>
        <div className={styles.secHead}>
          <div className={styles.eyebrowC}>The mark is the room</div>
          <h2>Step into the chamber</h2>
          <p>
            Four seats around one table. Drag to turn the room; hover a seat to
            meet the stand-in holding it until you do.
          </p>
        </div>

        <div className={styles.chamberStage}>
          <div className={styles.chamberCanvas} ref={mountRef} aria-hidden="true" />

          <div
            className={styles.chamberCaption}
            aria-live="polite"
            data-active={seat ? "true" : "false"}
          >
            {seat ? (
              <>
                <div
                  className={styles.chamberSeatRole}
                  style={{ color: seat.css }}
                >
                  {seat.role}
                </div>
                <div className={styles.chamberSeatLine}>
                  <b>{seat.name}</b>, your {seat.role} stand-in, {seat.holds}.
                </div>
                <Link
                  href="/signup"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  style={{ marginTop: 14 }}
                >
                  Claim the {seat.role} seat
                  <span className={styles.btnIcon}>
                    <ArrowRight size={15} />
                  </span>
                </Link>
              </>
            ) : (
              <>
                <div className={styles.chamberSeatRole}>Your council</div>
                <div className={styles.chamberSeatLine}>
                  Hover or tap a seat to meet your council. An AI stand-in holds
                  each chair until a human claims it.
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.chamberChips}>
          {SEATS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={styles.chamberChip}
              data-on={active === i ? "true" : "false"}
              style={{ "--chip-color": s.css } as React.CSSProperties}
              onMouseEnter={() => setActiveSeat(i)}
              onFocusCapture={() => setActiveSeat(i)}
              onClick={() => setActiveSeat(i)}
            >
              <span className={styles.chamberChipDot} />
              {s.name} · {s.role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
