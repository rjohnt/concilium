/* ====================================================================
   Concilium council-table scene (shared across reel variants)
   --------------------------------------------------------------------
   Deterministic Three.js scene driven by HyperFrames `hf-seek` time.
   Each variant defines `window.COUNCIL_CONFIG` BEFORE this script:

   window.COUNCIL_CONFIG = {
     palette: "dark" | "light",
     duration: 31,
     beats: {
       reveal:    [0, 4.5],          // table/camera settle
       seats:     { start: 4.7, stagger: 0.85 },  // figures take chairs
       focus:     [15.3, 20.6],      // "your seat" pulse on seat 0 (or null)
       consensus: [20.5, 24.0],      // ring fills coral, beam rises
       fadeOut:   [24.8, 26.4],      // dim for the lockup (or null)
     },
     camera: {
       orbitSpeed: 0.10, orbitOffset: -0.5,
       rFrom: 7.6, rTo: 5.7, hFrom: 4.8, hTo: 2.6,
       push: 1.1, pushDrop: 0.3, lookY: 0.42,
     },
     motes: true,   // drifting light dust (dark palettes)
     beam: true,    // consensus light beam
   };

   Wrapped in an IIFE — classic scripts share one global lexical scope.
   ==================================================================== */
(function () {
  // Config comes from a JSON <script id="council-config"> tag — the render
  // compiler defers inline JS, so a window.* handoff is NOT order-safe here.
  const cfgEl = document.getElementById("council-config");
  const C = window.COUNCIL_CONFIG || (cfgEl ? JSON.parse(cfgEl.textContent) : null);
  if (!C) { console.error("council-scene: no config found"); return; }
  const B = C.beats;
  const dark = C.palette !== "light";

  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  // Native frame size — MSAA handles the edges. (A supersampled canvas
  // blanks out / stalls the headless capture pipeline; don't go above 1x.)
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dark ? 0.95 : 1.0;

  const scene = new THREE.Scene();
  const CIN = C.cinema || null;   // optional cinematic pass (bloom/env/tour)
  if (CIN && CIN.bg) {
    // post path composites opaque — paint the gradient into the scene
    const cv = document.createElement("canvas"); cv.width = 16; cv.height = 512;
    const g2d = cv.getContext("2d");
    const gr = g2d.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, CIN.bg[0]); gr.addColorStop(0.45, CIN.bg[1]); gr.addColorStop(1, CIN.bg[2]);
    g2d.fillStyle = gr; g2d.fillRect(0, 0, 16, 512);
    scene.background = new THREE.CanvasTexture(cv);
  }
  if (CIN && CIN.env && window.CPOST) {
    scene.environment = CPOST.createEnvironment(renderer, CIN.env);
  }
  // fog gives cheap depth falloff matched to the CSS ground
  scene.fog = new THREE.Fog(dark ? 0x1b130d : 0xf6ecdd, 7.5, 16);

  const camera = new THREE.PerspectiveCamera(33, 1920 / 1080, 0.1, 100);

  const SEATCOLORS = [0x1e9c86, 0x7a57d1, 0xd9962a, 0x2f82c7];
  const CORAL = 0xe85d34;

  // deterministic PRNG for mote placement (NEVER Math.random in renders)
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // soft round contact-shadow texture, drawn once
  function shadowTexture() {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    const g = cv.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    grad.addColorStop(0, "rgba(0,0,0,0.42)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tx = new THREE.CanvasTexture(cv);
    return tx;
  }
  const shadowTex = shadowTexture();
  function contactShadow(radius, opacity) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2, radius * 2),
      new THREE.MeshBasicMaterial({
        map: shadowTex, transparent: true, opacity, depthWrite: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    return m;
  }

  /* ---------------- The table: plinth, column, slab, rim ----------- */
  // Opaque materials — a transparent slab shows the column through the
  // tabletop during the rise, which reads as a glitch.
  const MatClass = (CIN && CIN.gloss) ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const glossExtra = (CIN && CIN.gloss) ? { clearcoat: 0.5, clearcoatRoughness: 0.35, envMapIntensity: 0.55 } : {};
  const woodMat = new MatClass(Object.assign({
    color: dark ? 0x33251a : 0xe9ddc8,
    roughness: dark ? 0.42 : 0.6,
    metalness: dark ? 0.3 : 0.06,
  }, glossExtra));
  const tableGroup = new THREE.Group();
  scene.add(tableGroup);

  const slab = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.11, 0.17, 120), woodMat);
  slab.position.y = -0.1;
  tableGroup.add(slab);
  // beveled-feel rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.08, 0.05, 18, 140),
    new THREE.MeshStandardMaterial({
      color: dark ? 0x463422 : 0xd8c8ac,
      roughness: 0.42, metalness: dark ? 0.38 : 0.1,
    }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.06;
  tableGroup.add(rim);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.52, 0.9, 48), woodMat);
  column.position.y = -0.65;
  tableGroup.add(column);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.15, 64), woodMat);
  plinth.position.y = -1.12;
  tableGroup.add(plinth);
  const tableShadow = contactShadow(2.9, dark ? 0.55 : 0.3);
  tableShadow.position.y = -1.19;
  scene.add(tableShadow);

  /* --------------- Consensus ring + additive glow ------------------ */
  const RING_R = 1.5;
  const consensusMat = new THREE.MeshStandardMaterial({
    color: dark ? 0x3a2a20 : 0xd9c9b2,
    emissive: CORAL,
    emissiveIntensity: dark ? 0.05 : 0.18,
    roughness: 0.35, metalness: 0.25,
  });
  const consensusRing = new THREE.Mesh(
    new THREE.TorusGeometry(RING_R, 0.045, 24, 180), consensusMat);
  consensusRing.rotation.x = -Math.PI / 2;
  consensusRing.position.y = 0.005;
  tableGroup.add(consensusRing);
  // soft additive halo that blooms at consensus
  const glowMat = new THREE.MeshBasicMaterial({
    color: CORAL, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glowRing = new THREE.Mesh(
    new THREE.RingGeometry(RING_R - 0.28, RING_R + 0.28, 120), glowMat);
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.y = 0.02;
  tableGroup.add(glowRing);

  /* --------------- Consensus beam (additive cone) ------------------ */
  let beam = null;
  if (C.beam) {
    beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.96, 5.4, 48, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffb38f, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    beam.position.y = 2.7;
    tableGroup.add(beam);
  }

  /* --------------- Chairs + seated persona figures ----------------- */
  const CHAIR_R = 2.62;
  const chairMat = new THREE.MeshStandardMaterial({
    color: dark ? 0x4a3826 : 0xddd0ba,
    roughness: 0.55, metalness: dark ? 0.18 : 0.05,
  });
  const seats = [];
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    const x = Math.cos(a) * CHAIR_R;
    const z = Math.sin(a) * CHAIR_R;

    const place = new THREE.Group();
    place.position.set(x, 0, z);
    place.rotation.y = Math.PI / 2 - a;
    scene.add(place);

    // pedestal chair: base column + cushion + gently curved backrest
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.86, 20), chairMat);
    base.position.y = -0.76;
    place.add(base);
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.12, 36), chairMat);
    cushion.position.y = -0.3;
    place.add(cushion);
    const backrest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.78, 28, 1, true, -Math.PI / 3.1, (Math.PI * 2) / 3.1),
      new THREE.MeshStandardMaterial({
        color: chairMat.color, roughness: 0.58,
        metalness: chairMat.metalness, side: THREE.DoubleSide,
      }),
    );
    backrest.position.y = 0.12;
    backrest.rotation.y = 0; // arc wall sits at local +z = outward (chair back behind the persona)
    place.add(backrest);

    const chairShadow = contactShadow(0.85, dark ? 0.5 : 0.28);
    chairShadow.position.y = -1.19;
    place.add(chairShadow);

    // glow disc under the figure, lights when the seat fills
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 40),
      new THREE.MeshBasicMaterial({
        color: SEATCOLORS[i], transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.22;
    place.add(halo);

    // the persona: pebble body + head, slightly leaned toward the table
    const figure = new THREE.Group();
    const mat = new MatClass(Object.assign({
      color: SEATCOLORS[i], emissive: SEATCOLORS[i],
      emissiveIntensity: dark ? 0.3 : 0.12,
      roughness: 0.34, metalness: 0.05,
    }, glossExtra));
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.235, 0.32, 8, 24), mat);
    body.position.set(0, 0.16, -0.03);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 30, 30), mat);
    head.position.set(0, 0.62, -0.06);
    figure.add(body, head);
    figure.rotation.x = -0.07; // lean in
    figure.scale.setScalar(0.001);
    place.add(figure);

    seats.push({ figure, mat, halo });
  }

  /* --------------- Drifting light motes ----------------------------- */
  let motes = null;
  let moteSeeds = null;
  if (C.motes) {
    const rand = mulberry32(20260611);
    const COUNT = 110;
    const pos = new Float32Array(COUNT * 3);
    moteSeeds = [];
    for (let i = 0; i < COUNT; i++) {
      const r = 1.2 + rand() * 3.4;
      const th = rand() * Math.PI * 2;
      pos[i * 3] = Math.cos(th) * r;
      pos[i * 3 + 1] = -0.6 + rand() * 3.0;
      pos[i * 3 + 2] = Math.sin(th) * r;
      moteSeeds.push({ r, th, h: pos[i * 3 + 1], sp: 0.05 + rand() * 0.1, ph: rand() * Math.PI * 2 });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    motes = new THREE.Points(geo, new THREE.PointsMaterial({
      color: dark ? 0xffd9b8 : 0xe8a07a, size: 0.035, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    scene.add(motes);
  }

  /* --------------- Lighting ----------------------------------------- */
  if (dark) {
    scene.add(new THREE.HemisphereLight(0xffe6cf, 0x120c08, 0.34));
    const key = new THREE.SpotLight(0xfff0dd, 8.5, 28, 0.78, 0.55, 1.1);
    key.position.set(0, 9.5, 2.6);
    key.target.position.set(0, 0, 0);
    scene.add(key, key.target);
    const rimL = new THREE.DirectionalLight(0xf2b08a, 0.5);
    rimL.position.set(-5, 2.2, -4);
    scene.add(rimL);
  } else {
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe6d9c2, 1.0));
    const dir = new THREE.DirectionalLight(0xfff3e4, 1.15);
    dir.position.set(3, 6, 4);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xf6e8d8, 0.4);
    fill.position.set(-4, 3, -3);
    scene.add(fill);
  }
  const coralFill = new THREE.PointLight(CORAL, 0, 18);
  coralFill.position.set(0, 1.6, 0);
  scene.add(coralFill);

  /* --------------- time helpers ------------------------------------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  const smooth = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const span = (pair, x) => (pair ? smooth(pair[0], pair[1], x) : 0);

  /* --------------- renderAt ------------------------------------------ */
  const TOUR = C.personaTour || null;
  function tourIndex(t) {
    if (!TOUR) return -1;
    const i = Math.floor((t - TOUR.start) / TOUR.per);
    return (t >= TOUR.start && i < 4) ? i : -1;
  }

  function renderAt(t) {
    const cam = C.camera;
    const reveal = span(B.reveal, t);
    const push = span(B.consensus, t);
    const ti = tourIndex(t);
    if (ti >= 0) {
      // persona close-up tour: a hero shot per seat, hard cuts between
      const u = (t - TOUR.start) / TOUR.per - ti;
      const a = -Math.PI / 2 + (ti * Math.PI) / 2;
      const drift = (u - 0.5) * 0.22;
      const cr = TOUR.radius || 4.7;
      camera.position.set(
        Math.cos(a + drift) * cr,
        (TOUR.height || 1.5) + Math.sin(u * Math.PI) * 0.12,
        Math.sin(a + drift) * cr);
      camera.lookAt(Math.cos(a) * CHAIR_R, (TOUR.lookY || 0.45), Math.sin(a) * CHAIR_R);
    } else {
      const orbit = cam.orbitSpeed * t + cam.orbitOffset;
      const radius = lerp(cam.rFrom, cam.rTo, reveal) - push * cam.push;
      const height = lerp(cam.hFrom, cam.hTo, reveal) - push * cam.pushDrop;
      camera.position.set(Math.cos(orbit) * radius, height, Math.sin(orbit) * radius);
      camera.lookAt(0, cam.lookY, 0);
    }

    // table settles up into place
    const rise = smooth(B.reveal[0] + 0.2, B.reveal[1] - 1.0, t);
    tableGroup.position.y = lerp(-0.55, 0, rise);
    tableGroup.scale.setScalar(lerp(0.92, 1, rise));
    tableShadow.material.opacity = rise * (dark ? 0.55 : 0.3);

    // personas take their chairs
    for (let i = 0; i < 4; i++) {
      const start = B.seats.start + i * B.seats.stagger;
      const f = smooth(start, start + 0.7, t);
      let pulse = 1, lift = 0, haloBoost = 1;
      if (B.focus && t > B.focus[0] && t < B.focus[1]) {
        const p = Math.sin((t - B.focus[0]) * 3.2) * 0.5 + 0.5;
        pulse = i === 0 ? 1 + p * 0.9 : 0.5;
        lift = i === 0 ? 0.04 + p * 0.05 : 0;
        haloBoost = i === 0 ? 1.5 : 0.7;
      }
      const bob = Math.sin(t * 1.25 + i * 1.7) * 0.018 * f;
      const settle = 1 + Math.sin(f * Math.PI) * 0.09;
      seats[i].figure.scale.setScalar(0.001 + f * settle);
      seats[i].figure.position.y = lift + bob;
      let tourBoost = 1;
      const tIdx = tourIndex(t);
      if (tIdx >= 0) tourBoost = (i === tIdx) ? 1.1 : 0.45;
      const emScale = CIN ? 0.72 : 1;   // env+bloom already lift the figures
      seats[i].mat.emissiveIntensity =
        ((dark ? 0.3 : 0.12) + f * (dark ? 0.8 : 0.3)) * pulse * (1 + push * 0.7) * tourBoost * emScale;
      // pre-seat glow: during a focus window the empty chair 0 breathes,
      // even before its figure arrives (the "seat held for you" beat)
      let preGlow = 0;
      if (B.focus && i === 0 && t > B.focus[0] && t < B.focus[1]) {
        preGlow = (Math.sin((t - B.focus[0]) * 2.6) * 0.5 + 0.5) * 0.55;
      }
      seats[i].halo.material.opacity = Math.max(
        f * (dark ? 0.34 : 0.2) * haloBoost + push * 0.22 * f, preGlow);
      seats[i].halo.scale.setScalar(
        Math.max(1 + f * 0.12 + push * 0.3, 1 + preGlow * 0.45));
    }

    // consensus: ring fills, halo blooms, beam rises, coral light breathes
    const allSeated = smooth(
      B.seats.start, B.seats.start + B.seats.stagger * 3 + 0.7, t);
    consensusMat.emissiveIntensity =
      (dark ? 0.05 : 0.18) + allSeated * 0.3 + push * 2.6;
    glowMat.opacity = push * 0.34 + allSeated * 0.05;
    consensusRing.scale.setScalar(1 + push * 0.04 + (push > 0 ? Math.sin(t * 6) * 0.01 : 0));
    coralFill.intensity = push * (dark ? 3.6 : 1.6);
    if (beam) {
      const bs = span(C.beats.beam || B.consensus, t);
      beam.material.opacity = bs * 0.16 * (1 + Math.sin(t * 4.2) * 0.12);
      beam.scale.set(1 + bs * 0.15, bs, 1 + bs * 0.15);
    }

    // motes drift slowly, fade in with the reveal, surge softly at consensus
    if (motes) {
      motes.material.opacity = reveal * (dark ? 0.5 : 0.3) * (1 + push * 0.5);
      const p = motes.geometry.attributes.position;
      for (let i = 0; i < moteSeeds.length; i++) {
        const s = moteSeeds[i];
        const th = s.th + t * s.sp;
        p.array[i * 3] = Math.cos(th) * s.r;
        p.array[i * 3 + 1] = s.h + Math.sin(t * 0.4 + s.ph) * 0.18 + push * 0.3;
        p.array[i * 3 + 2] = Math.sin(th) * s.r;
      }
      p.needsUpdate = true;
    }

    // optional fade for the lockup
    const fade = B.fadeOut ? span(B.fadeOut, t) : 0;
    renderer.toneMappingExposure =
      (dark ? lerp(0.95, 1.14, push) : lerp(1.0, 1.08, push)) * lerp(1, 0.18, fade);

    if (post) post.render(t); else renderer.render(scene, camera);
  }

  const post = (CIN && CIN.post && window.CPOST)
    ? CPOST.create(renderer, scene, camera, CIN.post) : null;

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
