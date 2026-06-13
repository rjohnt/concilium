/* v14 "Workshop" — the council as crafts-folk: Engineer with a wrench,
   Designer with a brush, PO with the spec scroll, QA with a magnifier —
   building a small product together at the center of the table. */
(function () {
  const K = window.CKIT;
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x352718, 10, 26);
  const camera = new THREE.PerspectiveCamera(36, 1920 / 1080, 0.1, 100);
  const { clamp, lerp, smooth, mulberry32, SEATCOLORS, CORAL } = K;
  const rand = mulberry32(1406111);

  /* ---- warm workshop ground --------------------------------------------- */
  const ground = new THREE.Mesh(new THREE.CircleGeometry(18, 72),
    new THREE.MeshStandardMaterial({ color: 0x4a3a26, roughness: 0.85, metalness: 0.04 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.2;
  scene.add(ground);

  /* ---- table + crafts-folk with props ------------------------------------ */
  const table = K.makeTable({ wood: 0x6b4f2e, rim: 0x8a6a3e, metal: 0.18 });
  scene.add(table.group);
  const tShadow = K.contactShadow(2.9, 0.4);
  tShadow.position.y = -1.19;
  scene.add(tShadow);

  const figures = [];
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    const place = new THREE.Group();
    place.position.set(Math.cos(a) * 2.62, -0.42, Math.sin(a) * 2.62);
    place.rotation.y = Math.PI / 2 - a;
    const chair = K.makeChair(0x5d4527);
    chair.position.y = 0.12;
    place.add(chair);
    const fig = K.makeFigureCrafts(SEATCOLORS[i], 0.42);
    fig.group.position.y = -0.18;
    fig.group.scale.setScalar(0.001);
    place.add(fig.group);
    // the role prop, held in the right hand
    const prop = K.PROPS[i]();
    prop.scale.setScalar(1.5);
    prop.rotation.z = -0.5;
    fig.handR.add(prop);
    const sh = K.contactShadow(0.8, 0.32);
    sh.position.y = -0.78;
    place.add(sh);
    scene.add(place);
    figures.push({ fig, prop, place });
  }

  /* ---- the mini product assembling at table center ------------------------ */
  const PRODUCT = [];
  const prodGroup = new THREE.Group();
  prodGroup.position.y = 0.02;
  scene.add(prodGroup);
  const pal = [0xe6d6bd, 0xe6d6bd, SEATCOLORS[0], 0xe6d6bd, SEATCOLORS[2], 0xe6d6bd, SEATCOLORS[1], 0xe6d6bd, SEATCOLORS[3]];
  let bi = 0;
  for (let ly = 0; ly < 3; ly++) {
    const fp = 3 - ly;
    for (let ix = 0; ix < fp; ix++) {
      for (let iz = 0; iz < fp; iz++) {
        const c = pal[bi % pal.length];
        const glow = c !== 0xe6d6bd;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3),
          new THREE.MeshStandardMaterial({
            color: c, emissive: glow ? c : 0x000000,
            emissiveIntensity: glow ? 0.7 : 0, roughness: 0.55, metalness: 0.08 }));
        const off = ((fp - 1) * 0.34) / 2;
        PRODUCT.push({ m, x: ix * 0.34 - off, y: ly * 0.34 + 0.17, z: iz * 0.34 - off, d: bi * 0.42 + rand() * 0.3 });
        prodGroup.add(m);
        bi++;
      }
    }
  }

  /* ---- warm hanging lamps -------------------------------------------------- */
  const lamps = [];
  [[-3.4, 2.8, -1.6], [3.4, 2.8, -1.2], [0, 3.3, 3.2]].forEach(([x, y, z], i) => {
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x3a2c1a, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }));
    shade.position.set(x, y, z);
    scene.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffc98e, emissiveIntensity: 1.3, roughness: 0.3 }));
    bulb.position.set(x, y - 0.14, z);
    scene.add(bulb);
    const lt = new THREE.PointLight(0xffc98e, 1.1, 9);
    lt.position.set(x, y - 0.3, z);
    scene.add(lt);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.2, 8),
      new THREE.MeshBasicMaterial({ color: 0x241a10 }));
    cord.position.set(x, y + 1.8, z);
    scene.add(cord);
    lamps.push(lt);
  });

  /* ---- dust in the lamplight ------------------------------------------------ */
  const COUNT = 110;
  const pos = new Float32Array(COUNT * 3);
  const seeds = [];
  for (let i = 0; i < COUNT; i++) {
    const a = rand() * Math.PI * 2, r = 1 + rand() * 5.5;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = -0.6 + rand() * 3.6; pos[i * 3 + 2] = Math.sin(a) * r;
    seeds.push({ r, a, h: pos[i * 3 + 1], sp: 0.04 + rand() * 0.08, ph: rand() * 6.28 });
  }
  const mgeo = new THREE.BufferGeometry();
  mgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(mgeo, new THREE.PointsMaterial({
    color: 0xffd9ad, size: 0.035, transparent: true, opacity: 0.45,
    blending: THREE.AdditiveBlending, depthWrite: false })));

  scene.add(new THREE.HemisphereLight(0xffe2c2, 0x241a10, 0.5));
  const key = new THREE.SpotLight(0xffeacd, 6.5, 26, 0.85, 0.55, 1.1);
  key.position.set(0, 8.5, 3);
  key.target.position.set(0, 0, 0);
  scene.add(key, key.target);
  const coralFill = new THREE.PointLight(CORAL, 0, 12);
  coralFill.position.set(0, 1.2, 0);
  scene.add(coralFill);

  /* ---- camera: workshop energy ------------------------------------------------
     S1 [0–4]    swing in from the door, table ahead
     S2 [4–9.5]  CLOSE-UP arc past the engineer's wrench and the QA lens
     S3 [9.5–15] mid orbit while the product assembles
     S4 [15–22]  settle to hero + push at consensus (lockup overlays)         */
  function camAt(t) {
    if (t < 4) {
      const k = smooth(0, 4, t);
      camera.position.set(lerp(-8.5, -5.4, k), lerp(1.0, 1.9, k), lerp(6.5, 4.9, k));
      camera.lookAt(0, 0.3, 0);
    } else if (t < 9.5) {
      // across-the-table close-up: shoot over the assembling blocks at the
      // seated figure opposite — high enough to clear the mini product
      const u = (t - 4) / 5.5;
      const a = 2.6 + u * 1.5;
      camera.position.set(Math.cos(a + Math.PI) * 1.35, 1.9 + Math.sin(u * Math.PI) * 0.1, Math.sin(a + Math.PI) * 1.35);
      camera.lookAt(Math.cos(a) * 2.75, 0.0, Math.sin(a) * 2.75);
    } else if (t < 15) {
      const k = smooth(9.5, 10.6, t);
      const a = 4.1 + (t - 9.5) * 0.1;
      camera.position.set(Math.cos(a) * lerp(4.4, 7.2, k), lerp(0.85, 2.6, k), Math.sin(a) * lerp(4.4, 7.2, k));
      camera.lookAt(0, lerp(0.35, 0.3, k), 0);
    } else {
      const k = smooth(15, 18, t);
      const a = 4.65 + (t - 15) * 0.05;
      camera.position.set(
        Math.cos(a) * lerp(7.2, 8.2, k),
        lerp(2.6, 3.0, k),
        Math.sin(a) * lerp(7.2, 8.2, k));
      camera.lookAt(0, 0.25, 0);
    }
  }

  function renderAt(t) {
    camAt(t);

    // crafts-folk pop in early, then "work": props bob rhythmically
    for (let i = 0; i < 4; i++) {
      const f = smooth(0.8 + i * 0.5, 1.35 + i * 0.5, t);
      figures[i].fig.group.scale.setScalar(0.001 + f * (1 + Math.sin(f * Math.PI) * 0.12));
      const working = smooth(3.5, 4.5, t) * (1 - smooth(14.5, 15.5, t));
      figures[i].prop.rotation.z = -0.5 + Math.sin(t * 3.4 + i * 1.5) * 0.35 * working;
      figures[i].fig.group.position.y = -0.18 + Math.abs(Math.sin(t * 1.7 + i)) * 0.025 * working;
      figures[i].fig.mats[0].emissiveIntensity = 0.42 + smooth(15, 17, t) * 0.5;
    }

    // the product assembles block by block (4.5–14)
    PRODUCT.forEach((b) => {
      const k = smooth(4.5 + b.d, 5.3 + b.d, t);
      if (k <= 0) { b.m.position.set(b.x, -40, b.z); b.m.scale.setScalar(0.001); return; }
      const over = 1 + Math.sin(k * Math.PI) * 0.18;
      b.m.position.set(b.x, lerp(b.y + 1.6, b.y, k), b.z);
      b.m.scale.setScalar(k * over);
    });
    prodGroup.rotation.y = t * 0.12;

    // consensus: tools rest, ring glows, lamps flare warm
    const verdict = smooth(15, 17, t);
    table.ringMat.emissiveIntensity = 0.12 + verdict * 2.4;
    coralFill.intensity = verdict * 3.2;
    lamps.forEach((l, i) => { l.intensity = 1.1 + Math.sin(t * 1.1 + i * 2) * 0.1 + verdict * 0.5; });

    const mp = mgeo.attributes.position;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i], a2 = s.a + t * s.sp;
      mp.array[i * 3] = Math.cos(a2) * s.r;
      mp.array[i * 3 + 1] = s.h + Math.sin(t * 0.4 + s.ph) * 0.18;
      mp.array[i * 3 + 2] = Math.sin(a2) * s.r;
    }
    mp.needsUpdate = true;

    const fade = smooth(17.6, 19.2, t);
    renderer.toneMappingExposure = (1.0 + verdict * 0.08) * lerp(1, 0.36, fade);

    renderer.render(scene, camera);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
