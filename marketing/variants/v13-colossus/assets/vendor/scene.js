/* v13 "Colossus" — the council mark as a colossal monument rising from the
   dunes; four small personas walk toward it. Scale is the message. */
(function () {
  const K = window.CKIT;
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2c1d14, 16, 52);
  const camera = new THREE.PerspectiveCamera(40, 1920 / 1080, 0.1, 160);
  const { clamp, lerp, smooth, mulberry32, SEATCOLORS, CORAL } = K;
  const rand = mulberry32(1306111);

  /* ---- desert floor + dunes -------------------------------------------- */
  const sand = new THREE.MeshStandardMaterial({ color: 0xc8a376, roughness: 0.95, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 80), sand);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  for (let i = 0; i < 9; i++) {
    const dune = new THREE.Mesh(new THREE.SphereGeometry(4 + rand() * 7, 26, 18), sand);
    const a = rand() * Math.PI * 2, r = 16 + rand() * 26;
    dune.position.set(Math.cos(a) * r, -3.4 - rand() * 1.5, Math.sin(a) * r);
    dune.scale.y = 0.45;
    scene.add(dune);
  }

  /* ---- the colossus: the council mark at monument scale ------------------
     pebbles arranged vertically like the logo, facing the camera approach  */
  const mark = K.makeMark3D(2.7, 0x231a12, 0.22);
  mark.group.position.set(0, 6.0, -14);
  scene.add(mark.group);
  const homePos = mark.pebbles.map((p) => p.position.clone());
  // monument base plinth + glow ring around it
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 6.2, 1.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x8f6f4c, roughness: 0.75, metalness: 0.1, flatShading: true }));
  plinth.position.set(0, 0.7, -14);
  scene.add(plinth);
  const baseRingMat = new THREE.MeshStandardMaterial({
    color: 0x4a3322, emissive: CORAL, emissiveIntensity: 0.15, roughness: 0.35, metalness: 0.3 });
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(7.0, 0.14, 20, 120), baseRingMat);
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.set(0, 0.06, -14);
  scene.add(baseRing);
  const mShadow = K.contactShadow(9, 0.4);
  mShadow.position.set(0, 0.03, -14);
  scene.add(mShadow);

  /* ---- four small walking personas ---------------------------------------
     they glide from the foreground toward the monument, swaying as they go */
  const walkers = [];
  for (let i = 0; i < 4; i++) {
    const fig = K.makeFigureFaceted(SEATCOLORS[i], 0.5);
    fig.group.scale.setScalar(0.85);
    scene.add(fig.group);
    const sh = K.contactShadow(0.7, 0.3);
    scene.add(sh);
    walkers.push({
      fig, sh,
      x0: -3.2 + i * 2.1, z0: 7.5 + (i % 2) * 1.6,
      x1: -2.6 + i * 1.75, z1: -6.4,
    });
  }

  /* ---- drifting sand motes ------------------------------------------------ */
  const COUNT = 130;
  const pos = new Float32Array(COUNT * 3);
  const seeds = [];
  for (let i = 0; i < COUNT; i++) {
    const a = rand() * Math.PI * 2, r = 3 + rand() * 16;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 0.2 + rand() * 6; pos[i * 3 + 2] = Math.sin(a) * r - 6;
    seeds.push({ r, a, h: pos[i * 3 + 1], sp: 0.05 + rand() * 0.08, ph: rand() * 6.28 });
  }
  const mgeo = new THREE.BufferGeometry();
  mgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(mgeo, new THREE.PointsMaterial({
    color: 0xf2d2a0, size: 0.06, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false })));

  /* ---- late-day light ------------------------------------------------------ */
  scene.add(new THREE.HemisphereLight(0xffd9ae, 0x2a1c10, 0.55));
  const sun = new THREE.DirectionalLight(0xffb37a, 1.5);
  sun.position.set(-10, 5, 6);
  scene.add(sun);
  const coralFill = new THREE.PointLight(CORAL, 0, 30);
  coralFill.position.set(0, 2.5, -14);
  scene.add(coralFill);

  /* ---- camera: pilgrimage ---------------------------------------------------
     S1 [0–7]    low behind the walkers, monument looming far ahead
     S2 [7–14]   sweeping fly-by along the monument's flank (scale!)
     S3 [14–19]  wide reveal: walkers arrive, base ring ignites
     S4 [19–24]  rise + pull for the lockup, colossus against the sky      */
  function camAt(t) {
    if (t < 7) {
      const k = smooth(0, 7, t);
      camera.position.set(lerp(0.4, 1.6, k), lerp(0.9, 1.6, k), lerp(11.5, 6.5, k));
      camera.lookAt(0, lerp(2.0, 5.0, k), -14);
    } else if (t < 14) {
      // reverse dolly: glide past the flank, ending high and wide
      const u = smooth(7, 14, t);
      camera.position.set(lerp(4.0, -10.5, u), lerp(2.4, 11.0, u), lerp(-2.5, 9.0, u));
      camera.lookAt(0, lerp(4.6, 5.4, u), -14);
    } else if (t < 19) {
      const k = smooth(14, 16, t);
      const a = -1.85 + (t - 14) * 0.07;
      camera.position.set(Math.cos(a) * lerp(20, 20, k), lerp(11.0, 3.4, k), -14 + Math.sin(a) * 20);
      camera.lookAt(0, lerp(6.4, 4.6, k), -14);
    } else {
      const k = smooth(19, 24, t);
      const a = -1.5 + (t - 19) * 0.045;
      camera.position.set(Math.cos(a) * 20, lerp(3.4, 6.6, k), -14 + Math.sin(a) * 20);
      camera.lookAt(0, lerp(4.6, 5.4, k), -14);
    }
  }

  function renderAt(t) {
    camAt(t);

    // the pebbles of the colossus rise from the dunes (1.5–8), dot last
    for (let i = 0; i < 3; i++) {
      const k = smooth(1.5 + i * 1.4, 4.2 + i * 1.4, t);
      const from = homePos[i].clone(); from.y = -3.4;
      mark.pebbles[i].position.lerpVectors(from, homePos[i], k);
    }
    const dk = smooth(7.4, 8.6, t);
    mark.pebbles[3].scale.setScalar(0.001 + dk * (1 + Math.sin(dk * Math.PI) * 0.2));

    // walkers glide toward the monument (2–15), bobbing like footsteps
    walkers.forEach((w, i) => {
      const u = smooth(2 + i * 0.4, 15, t);
      const x = lerp(w.x0, w.x1, u);
      const z = lerp(w.z0, w.z1, u);
      const bob = Math.abs(Math.sin(t * 3.1 + i * 1.9)) * 0.07 * (u < 0.98 ? 1 : 0.2);
      w.fig.group.position.set(x, bob, z);
      w.fig.group.rotation.y = Math.PI; // facing the monument
      w.fig.group.rotation.z = Math.sin(t * 3.1 + i * 1.9) * 0.04 * (u < 0.98 ? 1 : 0);
      w.sh.position.set(x, 0.02, z);
    });

    // arrival: the base ring ignites, monument warms (the consensus beat)
    const verdict = smooth(15.5, 18, t);
    baseRingMat.emissiveIntensity = 0.15 + verdict * 2.6;
    coralFill.intensity = verdict * 9;
    mark.pebbles.forEach((p, i) => {
      if (p.material && p.material.emissiveIntensity != null) {
        p.material.emissiveIntensity = (i < 3 ? 0.22 : 0.18) + verdict * 0.5;
      }
    });

    // sand motes
    const mp = mgeo.attributes.position;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i], a2 = s.a + t * s.sp;
      mp.array[i * 3] = Math.cos(a2) * s.r;
      mp.array[i * 3 + 1] = s.h + Math.sin(t * 0.4 + s.ph) * 0.3;
      mp.array[i * 3 + 2] = Math.sin(a2) * s.r - 6;
    }
    mp.needsUpdate = true;

    const fade = smooth(19.4, 21.0, t);
    renderer.toneMappingExposure = (0.98 + verdict * 0.1) * lerp(1, 0.38, fade);

    renderer.render(scene, camera);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
