/* v12 "Summit" — the council convenes on a hexagonal platform high above the
   clouds: starfield, aurora ribbons, a camera that climbs the cliff face. */
(function () {
  const K = window.CKIT;
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x131c2a, 14, 42);
  const camera = new THREE.PerspectiveCamera(38, 1920 / 1080, 0.1, 140);
  const { clamp, lerp, smooth, mulberry32, SEATCOLORS, CORAL } = K;
  const rand = mulberry32(1206111);

  /* ---- summit platform + cliff ---------------------------------------- */
  const stone = new THREE.MeshStandardMaterial({ color: 0x4c5668, roughness: 0.7, metalness: 0.12, flatShading: true });
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.7, 0.55, 6), stone);
  platform.position.y = -0.55;
  scene.add(platform);
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(4.45, 4.45, 0.1, 6),
    new THREE.MeshStandardMaterial({ color: 0x8d97ad, roughness: 0.4, metalness: 0.5, flatShading: true }));
  trim.position.y = -0.3;
  scene.add(trim);
  const cliff = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 5.2, 16, 7), stone);
  cliff.position.y = -8.8;
  scene.add(cliff);

  /* ---- table + faceted council ----------------------------------------- */
  const table = K.makeTable({ wood: 0x2c3547, rim: 0x55617a, metal: 0.4 });
  scene.add(table.group);
  const figures = [];
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    const place = new THREE.Group();
    place.position.set(Math.cos(a) * 2.62, -0.38, Math.sin(a) * 2.62);
    place.rotation.y = Math.PI / 2 - a;
    const chair = K.makeChair(0x3b465c);
    chair.position.y = 0.1;
    place.add(chair);
    const fig = K.makeFigureFaceted(SEATCOLORS[i], 0.4);
    fig.group.position.y = -0.12;
    fig.group.scale.setScalar(0.001);
    place.add(fig.group);
    scene.add(place);
    figures.push({ fig });
  }

  /* ---- clouds: soft billboarded planes below the platform --------------- */
  function cloudTexture() {
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 128;
    const g = cv.getContext("2d");
    for (let i = 0; i < 7; i++) {
      const x = 30 + Math.abs(Math.sin(i * 3.7)) * 190;
      const y = 40 + Math.abs(Math.sin(i * 5.1)) * 50;
      const r = 28 + Math.abs(Math.sin(i * 2.3)) * 34;
      const gr = g.createRadialGradient(x, y, 4, x, y, r);
      gr.addColorStop(0, "rgba(225,228,240,0.5)");
      gr.addColorStop(1, "rgba(225,228,240,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 128);
    }
    return new THREE.CanvasTexture(cv);
  }
  const cloudTex = cloudTexture();
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(13 + rand() * 8, 4.2 + rand() * 1.6),
      new THREE.MeshBasicMaterial({
        map: cloudTex, transparent: true, opacity: 0.5 + rand() * 0.2,
        depthWrite: false, side: THREE.DoubleSide }));
    const a = rand() * Math.PI * 2;
    const r = 6.5 + rand() * 10;
    m.position.set(Math.cos(a) * r, -3.2 - rand() * 2.4, Math.sin(a) * r);
    m.rotation.y = a + Math.PI / 2;
    scene.add(m);
    clouds.push({ m, sp: 0.012 + rand() * 0.02, base: m.position.clone() });
  }

  /* ---- starfield + aurora ribbons --------------------------------------- */
  const STARS = 420;
  const spos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    const a = rand() * Math.PI * 2, r = 18 + rand() * 30;
    spos[i * 3] = Math.cos(a) * r;
    spos[i * 3 + 1] = 4 + rand() * 26;
    spos[i * 3 + 2] = Math.sin(a) * r;
  }
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute("position", new THREE.BufferAttribute(spos, 3));
  scene.add(new THREE.Points(sgeo, new THREE.PointsMaterial({
    color: 0xdfe8ff, size: 0.07, transparent: true, opacity: 0.85,
    depthWrite: false, sizeAttenuation: true })));

  // aurora: pre-bent plane strips, additive, slow drift
  const auroras = [];
  [0x1e9c86, 0x7a57d1, 0x2f82c7].forEach((c, i) => {
    const geo = new THREE.PlaneGeometry(36, 3.2 + i * 0.8, 48, 1);
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v);
      pos.setZ(v, Math.sin(x * 0.22 + i * 2.1) * 2.6);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: c, transparent: true, opacity: 0.1,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(0, 11 + i * 2.6, -16 - i * 3);
    m.rotation.x = 0.4;
    scene.add(m);
    auroras.push({ m, ph: i * 2.0 });
  });

  /* ---- light ------------------------------------------------------------- */
  scene.add(new THREE.HemisphereLight(0xbcc8e8, 0x10141f, 0.5));
  const moon = new THREE.DirectionalLight(0xcfd9f5, 0.95);
  moon.position.set(-6, 8, 4);
  scene.add(moon);
  const warm = new THREE.PointLight(0xffc89a, 0.7, 12);
  warm.position.set(0, 1.4, 0);
  scene.add(warm);
  const coralFill = new THREE.PointLight(CORAL, 0, 13);
  coralFill.position.set(0, 1.1, 0);
  scene.add(coralFill);

  /* ---- camera: the climb ---------------------------------------------------
     S1 [0–8]    rise up the cliff face — platform silhouette overhead
     S2 [8–15]   crest the rim: slow majestic half-arc around the council
     S3 [15–21]  push-in as the ring ignites against the aurora
     S4 [21–28]  pull up + back for the lockup, summit below              */
  function camAt(t) {
    if (t < 8) {
      const k = smooth(0, 8, t);
      const a = -1.9 + k * 0.5;
      camera.position.set(Math.cos(a) * 8.4, lerp(-6.5, 1.6, k), Math.sin(a) * 8.4);
      camera.lookAt(0, lerp(2.2, 0.4, k), 0);
    } else if (t < 15) {
      const a = -1.4 + (t - 8) * 0.115;
      camera.position.set(Math.cos(a) * 8.0, 2.4, Math.sin(a) * 8.0);
      camera.lookAt(0, 0.35, 0);
    } else if (t < 21) {
      const k = smooth(15, 19.5, t);
      const a = -0.595 + (t - 15) * 0.06;
      camera.position.set(
        Math.cos(a) * lerp(8.0, 6.2, k),
        lerp(2.4, 1.9, k),
        Math.sin(a) * lerp(8.0, 6.2, k));
      camera.lookAt(0, 0.4, 0);
    } else {
      const k = smooth(21, 26, t);
      const a = -0.235 + (t - 21) * 0.05;
      camera.position.set(
        Math.cos(a) * lerp(6.2, 10.6, k),
        lerp(1.9, 5.6, k),
        Math.sin(a) * lerp(6.2, 10.6, k));
      camera.lookAt(0, lerp(0.4, -0.2, k), 0);
    }
  }

  function renderAt(t) {
    camAt(t);

    // the council materialises as the camera crests (7.5–11)
    for (let i = 0; i < 4; i++) {
      const f = smooth(7.5 + i * 0.8, 8.4 + i * 0.8, t);
      figures[i].fig.group.scale.setScalar(0.001 + f * (1 + Math.sin(f * Math.PI) * 0.08));
      figures[i].fig.mats[0].emissiveIntensity =
        0.4 * f + smooth(17, 19, t) * 0.65 + Math.sin(t * 1.6 + i) * 0.05 * f;
    }

    // verdict: ring + warm light vs the cold night
    const verdict = smooth(17, 19.5, t);
    table.ringMat.emissiveIntensity = 0.12 + verdict * 2.8;
    coralFill.intensity = verdict * 4.2;
    warm.intensity = 0.7 + verdict * 1.0;

    // aurora breathes; brightens at the verdict
    auroras.forEach((a, i) => {
      a.m.material.opacity = 0.1 + Math.sin(t * 0.4 + a.ph) * 0.035 + verdict * 0.07;
      a.m.position.x = Math.sin(t * 0.05 + a.ph) * 3;
    });

    // clouds drift around the peak
    clouds.forEach((c) => {
      c.m.position.x = c.base.x + Math.sin(t * c.sp * 6) * 1.4;
      c.m.position.y = c.base.y + Math.sin(t * 0.2 + c.base.z) * 0.12;
    });

    const fade = smooth(21.4, 23.2, t);
    renderer.toneMappingExposure = (0.96 + verdict * 0.12) * lerp(1, 0.4, fade);

    renderer.render(scene, camera);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
