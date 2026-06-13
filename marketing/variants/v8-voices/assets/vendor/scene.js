/* v8 "Voices" — four luminous persona vortex streams (every voice its own
   current) storm around the chamber, then resolve into the seated council.
   Cinematic pass: PMREM env lighting, clearcoat materials, two-layer sprite
   particles, per-seat verdict beams, dolly-zoom resolve, CPOST bloom/grain. */
(function () {
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  // paint the chamber gradient into the scene — the post pipeline composites
  // opaque, so the CSS background no longer shows through
  (function () {
    const cv = document.createElement("canvas"); cv.width = 16; cv.height = 512;
    const g = cv.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, "#382a20"); gr.addColorStop(0.42, "#241a12"); gr.addColorStop(1, "#0f0a06");
    g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
    const tx = new THREE.CanvasTexture(cv);
    scene.background = tx;
  })();
  scene.fog = new THREE.Fog(0x180f0a, 9, 26);
  const camera = new THREE.PerspectiveCamera(36, 1920 / 1080, 0.1, 100);

  const SEATCOLORS = [0x1e9c86, 0x7a57d1, 0xd9962a, 0x2f82c7];
  const CORAL = 0xe85d34;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(880611);

  /* ---- environment: real PBR ambient/reflections --------------------- */
  scene.environment = CPOST.createEnvironment(renderer, "night");

  /* ---- particle vortex: 4 persona streams, two sprite layers ---------- */
  const N_SHARP = 9000, N_SOFT = 2600, N = N_SHARP + N_SOFT;
  const CHAIR_R = 2.62;
  const seatAngle = (i) => -Math.PI / 2 + (i * Math.PI) / 2;

  function seatTransform(i, lx, ly, lz) {
    const a = seatAngle(i);
    const ry = Math.PI / 2 - a;
    const wx = lx * Math.cos(ry) + lz * Math.sin(ry);
    const wz = -lx * Math.sin(ry) + lz * Math.cos(ry);
    return [wx + Math.cos(a) * CHAIR_R, ly, wz + Math.sin(a) * CHAIR_R];
  }
  function sampleFigure(i) {
    const th = rand() * Math.PI * 2;
    if (rand() < 0.3) {
      const ph = Math.acos(2 * rand() - 1);
      return seatTransform(i,
        0.2 * Math.sin(ph) * Math.cos(th),
        0.62 + 0.2 * Math.cos(ph),
        -0.06 + 0.2 * Math.sin(ph) * Math.sin(th));
    }
    const v = rand();
    if (v < 0.62) {
      return seatTransform(i,
        0.235 * Math.cos(th),
        0.16 + lerp(-0.16, 0.16, rand()),
        -0.03 + 0.235 * Math.sin(th));
    }
    const top = v < 0.81 ? 1 : -1;
    const ph = Math.acos(rand()) * top;
    return seatTransform(i,
      0.235 * Math.sin(ph) * Math.cos(th),
      0.16 + top * 0.16 + 0.235 * Math.cos(ph) * top,
      -0.03 + 0.235 * Math.sin(ph) * Math.sin(th));
  }

  // four interlocked particle rings — one luminous current per persona,
  // tilted like a gyroscope and slowly precessing (echoes the quad mark)
  const STREAM = [0, 1, 2, 3].map((g) => ({
    R: 2.45 + g * 0.16,
    tilt: [0.12, 1.08, 0.6, 1.45][g],
    prec0: (g * Math.PI) / 2,
    precSp: 0.1 + g * 0.025,
    dir: g % 2 === 0 ? 1 : -1,
    speed: 0.5 + g * 0.07,
  }));

  function makeLayer(count, size, opacity, sharp) {
    const swirl = [], targets = new Float32Array(count * 3),
      colors = new Float32Array(count * 3), morphAt = new Float32Array(count),
      positions = new Float32Array(count * 3);
    const cTmp = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const g = i % 4;
      swirl.push({
        g,
        ph: rand() * Math.PI * 2,
        sp: (0.8 + rand() * 0.5) * STREAM[g].speed * STREAM[g].dir,
        tubeR: Math.pow(rand(), 1.6) * 0.3,      // dense core, wispy edge
        tubeA: rand() * Math.PI * 2,
        wob: 0.4 + rand() * 0.7,
      });
      const tp = sampleFigure(g);
      targets[i * 3] = tp[0]; targets[i * 3 + 1] = tp[1]; targets[i * 3 + 2] = tp[2];
      cTmp.setHex(SEATCOLORS[g]).multiplyScalar(sharp ? 0.9 + rand() * 0.45 : 0.7 + rand() * 0.35);
      colors[i * 3] = cTmp.r; colors[i * 3 + 1] = cTmp.g; colors[i * 3 + 2] = cTmp.b;
      morphAt[i] = 8.0 + rand() * 3.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    // round soft sprite — square points read as cheap
    const cv = document.createElement("canvas"); cv.width = cv.height = 64;
    const g2 = cv.getContext("2d");
    const grad = g2.createRadialGradient(32, 32, 1, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, sharp ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g2.fillStyle = grad; g2.fillRect(0, 0, 64, 64);
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size, map: new THREE.CanvasTexture(cv), vertexColors: true,
      transparent: true, opacity, blending: THREE.AdditiveBlending,
      depthWrite: false, sizeAttenuation: true,
    }));
    scene.add(pts);
    return { swirl, targets, morphAt, geo, pts, count, baseSize: size };
  }
  const layers = [
    makeLayer(N_SHARP, 0.105, 0.95, true),
    makeLayer(N_SOFT, 0.34, 0.3, false),   // wide soft halo layer
  ];

  /* ---- the table materialises beneath the resolved council ----------- */
  const woodMat = new THREE.MeshPhysicalMaterial({
    color: 0x33251a, roughness: 0.42, metalness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const table = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.11, 0.17, 96), woodMat);
  slab.position.y = -0.1; table.add(slab);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.05, 16, 120),
    new THREE.MeshPhysicalMaterial({ color: 0x463422, roughness: 0.3, metalness: 0.5, clearcoat: 0.5 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = -0.06; table.add(rim);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.52, 0.9, 40), woodMat);
  column.position.y = -0.65; table.add(column);
  const ringMat = new THREE.MeshPhysicalMaterial({
    color: 0x3a2a20, emissive: CORAL, emissiveIntensity: 0.08, roughness: 0.3, metalness: 0.35, clearcoat: 0.8 });
  const cring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.045, 20, 140), ringMat);
  cring.rotation.x = -Math.PI / 2; cring.position.y = 0.005; table.add(cring);
  const chairMat = new THREE.MeshPhysicalMaterial({
    color: 0x4a3826, roughness: 0.5, metalness: 0.15, clearcoat: 0.35 });
  for (let i = 0; i < 4; i++) {
    const a = seatAngle(i);
    const place = new THREE.Group();
    place.position.set(Math.cos(a) * CHAIR_R, 0, Math.sin(a) * CHAIR_R);
    place.rotation.y = Math.PI / 2 - a;
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.12, 28), chairMat);
    cushion.position.y = -0.3; place.add(cushion);
    const back = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.78, 24, 1, true, -Math.PI / 3.1, (Math.PI * 2) / 3.1),
      new THREE.MeshPhysicalMaterial({ color: 0x4a3826, roughness: 0.5, metalness: 0.15, clearcoat: 0.35, side: THREE.DoubleSide }));
    back.position.y = 0.12; back.rotation.y = 0; // back wall outward
    place.add(back);
    table.add(place);
  }
  table.position.y = -6;
  scene.add(table);

  /* ---- per-seat verdict beams: each voice ascends --------------------- */
  const beams = [];
  for (let i = 0; i < 4; i++) {
    const a = seatAngle(i);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.42, 4.2, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: SEATCOLORS[i], transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(Math.cos(a) * CHAIR_R, 2.4, Math.sin(a) * CHAIR_R);
    scene.add(beam);
    beams.push(beam);
  }

  /* ---- lights ---------------------------------------------------------- */
  scene.add(new THREE.HemisphereLight(0xffe6cf, 0x140d08, 0.3));
  const key = new THREE.SpotLight(0xfff0dd, 7, 30, 0.8, 0.55, 1.1);
  key.position.set(0, 9.5, 3); key.target.position.set(0, 0, 0);
  scene.add(key, key.target);
  const coralFill = new THREE.PointLight(CORAL, 0, 14);
  coralFill.position.set(0, 1.4, 0);
  scene.add(coralFill);

  /* ---- camera: storm interior → monotonic pull-back → dolly-zoom hero --- */
  const A0 = 7.5 * 0.5 - 1.2;
  const R0 = 6.0 + Math.sin(7.5 * 0.5) * 0.4;
  const H0 = 1.3 + Math.sin(7.5 * 0.33) * 0.6;
  function s2angle(t) {
    const u = Math.min(1, (t - 7.5) / 5.5);
    return A0 + 5.5 * (0.06 * u + (0.44 / 3) * (1 - Math.pow(1 - u, 3)));
  }
  const A1 = s2angle(13);

  function camAt(t) {
    if (t < 7.5) {
      const a = t * 0.5 - 1.2;
      const r = 6.0 + Math.sin(t * 0.5) * 0.4;
      camera.position.set(Math.cos(a) * r, 1.3 + Math.sin(t * 0.33) * 0.6, Math.sin(a) * r);
      camera.fov = 36;
      camera.lookAt(0, 1.0, 0);
    } else if (t < 13) {
      const k = smooth(7.5, 13, t);
      const a = s2angle(t);
      camera.position.set(
        Math.cos(a) * lerp(R0, 8.0, k),
        lerp(H0, 3.3, k),
        Math.sin(a) * lerp(R0, 8.0, k));
      // dolly-zoom: FOV tightens as we pull back — the vertigo resolve
      camera.fov = lerp(36, 31, k);
      camera.lookAt(0, lerp(1.0, 0.15, k), 0);
    } else {
      const a = A1 + (t - 13) * 0.06;
      const push = smooth(14, 16.5, t);
      const r = 8.0 - push * 1.2;
      camera.position.set(Math.cos(a) * r, 3.3 - push * 0.4, Math.sin(a) * r);
      camera.fov = 31 + push * 1.5;
      camera.lookAt(0, 0.15, 0);
    }
    camera.updateProjectionMatrix();
  }

  /* ---- post pipeline: bloom + grain + CA ------------------------------- */
  const post = CPOST.create(renderer, scene, camera, {
    threshold: 0.62, knee: 0.28, strengthH: 0.7, strengthQ: 0.62,
    vignette: 0.32, grain: 0.024, ca: 0.06,
  });

  function streamPos(s, t, out) {
    const S = STREAM[s.g];
    const th = s.ph + t * s.sp;
    const tr = s.tubeR * (1 + Math.sin(t * s.wob + s.ph) * 0.25);
    const ta = s.tubeA + t * 0.6 * (s.g % 2 ? 1 : -1);
    // point on the ring's torus surface, in ring-local space
    const rr = S.R + Math.cos(ta) * tr;
    let x = Math.cos(th) * rr;
    let y = Math.sin(ta) * tr;
    let z = Math.sin(th) * rr;
    // tilt the ring about X, then let the whole ring precess about Y
    const ct = Math.cos(S.tilt), st = Math.sin(S.tilt);
    let y1 = y * ct - z * st, z1 = y * st + z * ct;
    const pa = S.prec0 + t * S.precSp;
    const cp = Math.cos(pa), sp = Math.sin(pa);
    const x2 = x * cp + z1 * sp, z2 = -x * sp + z1 * cp;
    out[0] = x2; out[1] = y1 + 1.15; out[2] = z2;
  }

  const tmp = [0, 0, 0];
  function renderAt(t) {
    camAt(t);

    for (const L of layers) {
      const p = L.geo.attributes.position;
      for (let i = 0; i < L.count; i++) {
        const s = L.swirl[i];
        streamPos(s, t, tmp);
        const m = smooth(L.morphAt[i], L.morphAt[i] + 1.5, t);
        const breathe = Math.sin(t * 1.3 + s.g * 1.7) * 0.018;
        p.array[i * 3] = lerp(tmp[0], L.targets[i * 3], m);
        p.array[i * 3 + 1] = lerp(tmp[1], L.targets[i * 3 + 1] + breathe, m);
        p.array[i * 3 + 2] = lerp(tmp[2], L.targets[i * 3 + 2], m);
      }
      p.needsUpdate = true;
    }
    const resolved = smooth(8.5, 11.5, t);
    layers[0].pts.material.size = lerp(0.105, 0.038, resolved);
    layers[1].pts.material.size = lerp(0.34, 0.12, resolved);
    layers[1].pts.material.opacity = lerp(0.32, 0.16, resolved);

    table.position.y = lerp(-6, 0, smooth(9.0, 12.0, t));

    // verdict: ring ignites, coral floods, each voice sends up its beam
    const verdict = smooth(14, 16, t);
    ringMat.emissiveIntensity = 0.08 + resolved * 0.25 + verdict * 1.9;
    coralFill.intensity = verdict * 1.8;
    beams.forEach((b, i) => {
      const k = smooth(14.2 + i * 0.18, 15.2 + i * 0.18, t);
      b.material.opacity = k * 0.16 * (1 - smooth(17.0, 18.2, t));
      b.scale.set(1, 0.2 + k * 0.8, 1);
    });

    const fade = smooth(17.4, 18.8, t);
    renderer.toneMappingExposure = (1.0 + verdict * 0.15) * lerp(1, 0.12, fade);

    post.render(t);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
