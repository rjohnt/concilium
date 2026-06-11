/* v15 "Procession" — the four crafts-folk carry their instruments down a
   torchlit columned hall to take their seats. Ceremony, then consensus. */
(function () {
  const K = window.CKIT;
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x190f08, 9, 30);
  const camera = new THREE.PerspectiveCamera(38, 1920 / 1080, 0.1, 120);
  const { clamp, lerp, smooth, mulberry32, SEATCOLORS, CORAL } = K;
  const rand = mulberry32(1506111);

  /* ---- hall: floor, carpet, columns, banners ------------------------------ */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 46),
    new THREE.MeshStandardMaterial({ color: 0x2c2014, roughness: 0.8, metalness: 0.08 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -1.2, 6);
  scene.add(floor);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 30),
    new THREE.MeshStandardMaterial({ color: 0x77301c, roughness: 0.9, metalness: 0 }));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, -1.19, 9);
  scene.add(carpet);

  const colMat = new THREE.MeshStandardMaterial({ color: 0x4a3a26, roughness: 0.7, metalness: 0.1 });
  const torches = [];
  for (let i = 0; i < 5; i++) {
    [-4.4, 4.4].forEach((x) => {
      const z = 1.5 + i * 4.6;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 6.4, 18), colMat);
      col.position.set(x, 2.0, z);
      scene.add(col);
      // banner: persona-colored hanging cloth
      const bc = SEATCOLORS[(i * 2 + (x > 0 ? 1 : 0)) % 4];
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.2),
        new THREE.MeshStandardMaterial({ color: bc, emissive: bc, emissiveIntensity: 0.12, roughness: 0.8, side: THREE.DoubleSide }));
      banner.position.set(x * 0.82, 2.6, z);
      banner.rotation.y = Math.PI / 2 * (x > 0 ? -1 : 1);
      scene.add(banner);
      // torch flame: emissive blob + flickering light
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffb36a, emissive: 0xff9a4a, emissiveIntensity: 2.4, roughness: 0.3 }));
      flame.position.set(x * 0.86, 3.0, z);
      scene.add(flame);
      const lt = new THREE.PointLight(0xff9a4a, 0.9, 7);
      lt.position.copy(flame.position);
      scene.add(lt);
      torches.push({ lt, flame, ph: rand() * 6.28 });
    });
  }

  /* ---- the table at the head of the hall ----------------------------------- */
  const table = K.makeTable({ wood: 0x33251a, rim: 0x463422 });
  table.group.position.set(0, 0, -3.4);
  scene.add(table.group);
  const tShadow = K.contactShadow(2.9, 0.5);
  tShadow.position.set(0, -1.19, -3.4);
  scene.add(tShadow);

  /* ---- the procession: crafts-folk with instruments ------------------------- */
  // each walks the carpet, then peels off to their chair around the table
  const SEAT_AT = [
    [0, -3.4 - 2.62],   // far (engineer)
    [2.62, -3.4],       // right (designer)
    [0, -3.4 + 2.62],   // near (product)
    [-2.62, -3.4],      // left (qa)
  ];
  const SEAT_RY = [Math.PI, -Math.PI / 2, 0, Math.PI / 2]; // face the table
  const walkers = [];
  for (let i = 0; i < 4; i++) {
    const chair = K.makeChair(0x4a3826);
    chair.position.set(SEAT_AT[i][0], -0.3, SEAT_AT[i][1]);
    chair.rotation.y = SEAT_RY[i] + Math.PI; // backrest outward
    scene.add(chair);
    const fig = K.makeFigureCrafts(SEATCOLORS[i], 0.45);
    scene.add(fig.group);
    const prop = K.PROPS[i]();
    prop.scale.setScalar(1.25);
    prop.rotation.z = -0.4;
    fig.handR.add(prop);
    const sh = K.contactShadow(0.7, 0.4);
    scene.add(sh);
    walkers.push({ fig, sh, lane: -0.7 + (i % 2) * 1.4, startZ: 12 + i * 1.8 });
  }

  /* ---- candles floating above the table (ceremonial) ------------------------ */
  const candles = [];
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffc98e, emissiveIntensity: 1.8, roughness: 0.3 }));
    scene.add(c);
    candles.push({ c, a: rand() * 6.28, r: 0.8 + rand() * 1.6, h: 1.7 + rand() * 0.9, sp: 0.15 + rand() * 0.2 });
  }

  scene.add(new THREE.HemisphereLight(0xffd9b0, 0x120c06, 0.3));
  const key = new THREE.SpotLight(0xffe2c2, 6, 30, 0.7, 0.6, 1.1);
  key.position.set(0, 9, -1);
  key.target.position.set(0, 0, -3.4);
  scene.add(key, key.target);
  const coralFill = new THREE.PointLight(CORAL, 0, 13);
  coralFill.position.set(0, 1.2, -3.4);
  scene.add(coralFill);

  /* ---- camera: ceremony -------------------------------------------------------
     S1 [0–7]   low tracking shot following the procession up the carpet
     S2 [7–13]  side dolly as they peel to their seats
     S3 [13–18] settle on the council, ring ignites
     S4 [18–24] slow rise for the lockup                                       */
  function camAt(t) {
    if (t < 7) {
      const k = smooth(0, 7, t);
      camera.position.set(lerp(0.2, 1.8, k), lerp(0.9, 1.5, k), lerp(17.0, 7.0, k));
      camera.lookAt(0, 0.5, lerp(8, -2, k));
    } else if (t < 13) {
      const u = smooth(7, 8.2, t);
      const a = 0.45 + (t - 7) * 0.1;
      camera.position.set(Math.sin(a) * 7.2, lerp(1.4, 2.1, u), -3.4 + Math.cos(a) * 7.2);
      camera.lookAt(0, 0.3, -3.4);
    } else if (t < 18) {
      const k = smooth(13, 15, t);
      const a = 1.05 + (t - 13) * 0.055;
      camera.position.set(Math.sin(a) * lerp(7.2, 6.4, k), lerp(2.1, 2.5, k), -3.4 + Math.cos(a) * lerp(7.2, 6.4, k));
      camera.lookAt(0, 0.25, -3.4);
    } else {
      const k = smooth(18, 23, t);
      const a = 1.33 + (t - 18) * 0.04;
      camera.position.set(Math.sin(a) * lerp(6.4, 7.8, k), lerp(2.5, 3.6, k), -3.4 + Math.cos(a) * lerp(6.4, 7.8, k));
      camera.lookAt(0, lerp(0.25, 0.1, k), -3.4);
    }
  }

  function renderAt(t) {
    camAt(t);

    walkers.forEach((w, i) => {
      // phase 1: march down the carpet (staggered) — phase 2: peel to the seat
      const march = smooth(0.5 + i * 0.5, 8.5 + i * 0.5, t);
      const peel = smooth(9.5 + i * 0.55, 12.5 + i * 0.55, t);
      const seat = smooth(12.4 + i * 0.55, 13.2 + i * 0.55, t);

      const carpetX = w.lane * (1 - peel);
      const carpetZ = lerp(w.startZ, 0.6, march);
      const x = lerp(carpetX, SEAT_AT[i][0], peel);
      const z = lerp(carpetZ, SEAT_AT[i][1], peel);
      const walking = march < 0.995 || (peel > 0.01 && peel < 0.99);
      const bob = walking ? Math.abs(Math.sin(t * 3.4 + i * 1.7)) * 0.06 : 0;
      const sink = seat * 0.16; // settle into the chair

      w.fig.group.position.set(x, bob - sink, z);
      const facing = peel < 0.5 ? Math.PI : SEAT_RY[i];
      w.fig.group.rotation.y = facing;
      w.fig.group.rotation.z = walking ? Math.sin(t * 3.4 + i * 1.7) * 0.045 : 0;
      // props raise in salute at the verdict
      const salute = smooth(15.5, 16.5, t) * (1 - smooth(18, 19, t) * 0.4);
      w.fig.handR.rotation.x = -salute * 0.9;
      w.fig.mats[0].emissiveIntensity = 0.45 + smooth(15.5, 17.5, t) * 0.55;
      w.sh.position.set(x, -1.18, z);
    });

    // verdict at the table
    const verdict = smooth(15.5, 17.5, t);
    table.ringMat.emissiveIntensity = 0.12 + verdict * 2.7;
    coralFill.intensity = verdict * 4.0;

    // torch flicker (deterministic)
    torches.forEach((tor, i) => {
      const f = 0.9 + Math.sin(t * 9 + tor.ph) * 0.18 + Math.sin(t * 23 + tor.ph * 3) * 0.08;
      tor.lt.intensity = f;
      tor.flame.scale.setScalar(1 + Math.sin(t * 11 + tor.ph) * 0.16);
    });

    // candles orbit lazily above the table
    candles.forEach((cd) => {
      const a = cd.a + t * cd.sp;
      cd.c.position.set(Math.cos(a) * cd.r, cd.h + Math.sin(t * 0.8 + cd.a) * 0.1, -3.4 + Math.sin(a) * cd.r);
    });

    const fade = smooth(18.6, 20.4, t);
    renderer.toneMappingExposure = (0.95 + verdict * 0.12) * lerp(1, 0.34, fade);

    renderer.render(scene, camera);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
