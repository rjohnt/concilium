/* v11 "Concord" — upbeat launch plaza: confetti, rising lantern orbs, and the
   council mark assembling as giant 3D spheres above the table. */
(function () {
  const K = window.CKIT;
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf2e4cf, 11, 30);
  const camera = new THREE.PerspectiveCamera(36, 1920 / 1080, 0.1, 100);
  const { clamp, lerp, smooth, mulberry32, SEATCOLORS, CORAL } = K;
  const rand = mulberry32(1106111);

  /* ---- plaza ground -------------------------------------------------- */
  const ground = new THREE.Mesh(new THREE.CircleGeometry(20, 72),
    new THREE.MeshStandardMaterial({ color: 0xf0e2cb, roughness: 0.9, metalness: 0.02 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.2;
  scene.add(ground);
  // plaza inlay rings
  [[3.4, 0xe5d2b4], [6.2, 0xe9d8bd]].forEach(([r, c]) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.22, 80),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -1.19;
    scene.add(ring);
  });

  /* ---- table + lantern-figure council -------------------------------- */
  const table = K.makeTable({ wood: 0xe2d0b4, rim: 0xd0bb98, metal: 0.08 });
  table.group.position.y = -0.04;
  scene.add(table.group);
  const tShadow = K.contactShadow(2.9, 0.28);
  tShadow.position.y = -1.19;
  scene.add(tShadow);

  const figures = [];
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    const place = new THREE.Group();
    place.position.set(Math.cos(a) * 2.62, -0.42, Math.sin(a) * 2.62);
    place.rotation.y = Math.PI / 2 - a;
    const chair = K.makeChair(0xddc9a8);
    chair.position.y = 0.12;
    place.add(chair);
    const fig = K.makeFigureLantern(SEATCOLORS[i], 0.42);
    fig.group.position.y = -0.06;
    fig.group.scale.setScalar(0.001);
    place.add(fig.group);
    const sh = K.contactShadow(0.8, 0.24);
    sh.position.y = -0.77;
    place.add(sh);
    scene.add(place);
    figures.push({ fig, place });
  }

  /* ---- the giant 3D council mark assembling overhead ------------------ */
  const mark = K.makeMark3D(1.35, 0x2b221c, 0.38);
  mark.group.position.set(0, 3.9, -1.2);
  scene.add(mark.group);
  // fly-in offsets for the three pebbles + dot pop
  const flyFrom = [
    new THREE.Vector3(-9, 4, -4), new THREE.Vector3(8, 7, -6), new THREE.Vector3(0, 10, 4),
    new THREE.Vector3(0, 0, 0),
  ];
  const homePos = mark.pebbles.map((p) => p.position.clone());

  /* ---- confetti (falling) + lantern orbs (rising) --------------------- */
  const CONF = 1400;
  const cpos = new Float32Array(CONF * 3);
  const ccol = new Float32Array(CONF * 3);
  const cseed = [];
  const cTmp = new THREE.Color();
  for (let i = 0; i < CONF; i++) {
    const r = 1 + rand() * 11, th = rand() * Math.PI * 2;
    cseed.push({ x: Math.cos(th) * r, z: Math.sin(th) * r, h0: rand() * 14, sp: 0.55 + rand() * 0.8, sway: rand() * 6.28 });
    cTmp.setHex(SEATCOLORS[i % 4]).multiplyScalar(0.95 + rand() * 0.4);
    ccol[i * 3] = cTmp.r; ccol[i * 3 + 1] = cTmp.g; ccol[i * 3 + 2] = cTmp.b;
  }
  const cgeo = new THREE.BufferGeometry();
  cgeo.setAttribute("position", new THREE.BufferAttribute(cpos, 3));
  cgeo.setAttribute("color", new THREE.BufferAttribute(ccol, 3));
  const confetti = new THREE.Points(cgeo, new THREE.PointsMaterial({
    size: 0.075, vertexColors: true, transparent: true, opacity: 0.0, depthWrite: false }));
  scene.add(confetti);

  const lanterns = [];
  for (let i = 0; i < 10; i++) {
    const c = SEATCOLORS[i % 4];
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 18),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, roughness: 0.3 }));
    scene.add(o);
    lanterns.push({ o, x: -7 + rand() * 14, z: -5 + rand() * 9, ph: rand() * 6.28, sp: 0.32 + rand() * 0.3 });
  }

  /* ---- light: bright golden afternoon --------------------------------- */
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0xe0cdb0, 1.05));
  const sun = new THREE.DirectionalLight(0xffeecd, 1.2);
  sun.position.set(5, 9, 4);
  scene.add(sun);
  const coralFill = new THREE.PointLight(CORAL, 0, 14);
  coralFill.position.set(0, 1.2, 0);
  scene.add(coralFill);

  /* ---- camera: energetic — 4 cuts --------------------------------------
     S1 [0–4.5]  fast low sweep across the plaza toward the table
     S2 [4.5–9]  tilt-up under the assembling giant mark
     S3 [9–14.5] wide orbital swing around table + mark together
     S4 [14.5–22] settle hero + slow push for consensus + lockup        */
  function camAt(t) {
    if (t < 4.5) {
      const k = smooth(0, 4.5, t);
      camera.position.set(lerp(-10, -4.6, k), lerp(0.4, 1.6, k), lerp(8.5, 6.4, k));
      camera.lookAt(lerp(-2, 0, k), 0.4, 0);
    } else if (t < 9) {
      const k = smooth(4.5, 5.4, t);
      const a = -0.62 + (t - 4.5) * 0.09;
      camera.position.set(Math.cos(a) * 9.8, lerp(1.6, 1.5, k), Math.sin(a) * 9.8);
      camera.lookAt(0, lerp(0.4, 3.0, smooth(4.7, 6.4, t)), -0.8);
    } else if (t < 14.5) {
      const a = -0.22 + (t - 9) * 0.14;
      camera.position.set(Math.cos(a) * 10.5, 3.4, Math.sin(a) * 10.5);
      camera.lookAt(0, 1.9, -0.7);
    } else {
      const k = smooth(14.5, 17.5, t);
      const a = 0.55 + (t - 14.5) * 0.045;
      camera.position.set(
        Math.cos(a) * lerp(10.5, 8.6, k),
        lerp(3.4, 2.6, k),
        Math.sin(a) * lerp(10.5, 8.6, k));
      camera.lookAt(0, lerp(2.2, 1.4, k), lerp(-0.7, -0.5, k));
    }
  }

  function renderAt(t) {
    camAt(t);

    // figures pop in on the beat (≈0.536s apart)
    for (let i = 0; i < 4; i++) {
      const f = smooth(1.0 + i * 0.54, 1.5 + i * 0.54, t);
      const settle = 1 + Math.sin(f * Math.PI) * 0.16;
      figures[i].fig.group.scale.setScalar(0.001 + f * settle);
      const bounce = Math.abs(Math.sin(t * 2.4 + i * 1.3)) * 0.05 * f;
      figures[i].fig.group.position.y = -0.06 + bounce;
      figures[i].fig.mats[0].emissiveIntensity = 0.42 + smooth(14, 16, t) * 0.5;
    }

    // giant mark pebbles fly home (3.2–6.4), dot pops last
    for (let i = 0; i < 3; i++) {
      const k = smooth(3.2 + i * 0.6, 4.5 + i * 0.6, t);
      mark.pebbles[i].position.lerpVectors(
        homePos[i].clone().add(flyFrom[i]), homePos[i], k);
      mark.pebbles[i].scale.setScalar(0.3 + k * 0.7);
    }
    const dk = smooth(6.2, 6.9, t);
    mark.pebbles[3].scale.setScalar(0.001 + dk * (1 + Math.sin(dk * Math.PI) * 0.35));
    // the mark floats and billboards toward the camera so it always reads
    mark.group.position.y = 3.9 + Math.sin(t * 0.8) * 0.18;
    mark.group.rotation.y = Math.atan2(
      camera.position.x - mark.group.position.x,
      camera.position.z - mark.group.position.z);

    // confetti rains once the mark is assembled
    confetti.material.opacity = smooth(6.6, 7.6, t) * 0.9;
    const cp = cgeo.attributes.position;
    for (let i = 0; i < CONF; i++) {
      const s = cseed[i];
      const fall = (s.h0 - t * s.sp) % 14;
      const y = (fall + 14) % 14 - 1.1;
      cp.array[i * 3] = s.x + Math.sin(t * 1.4 + s.sway) * 0.3;
      cp.array[i * 3 + 1] = y;
      cp.array[i * 3 + 2] = s.z;
    }
    cp.needsUpdate = true;

    // lantern orbs rise on loop
    lanterns.forEach((l, i) => {
      const y = ((l.ph * 2 + t * l.sp) % 9) - 1.0;
      l.o.position.set(l.x + Math.sin(t * 0.5 + l.ph) * 0.4, y, l.z);
      l.o.material.emissiveIntensity = 1.6 + Math.sin(t * 2 + i) * 0.4;
    });

    // consensus pulse
    const verdict = smooth(14, 16, t);
    table.ringMat.emissiveIntensity = 0.12 + verdict * 2.4;
    coralFill.intensity = verdict * 2.6;

    const fade = smooth(17.6, 19.0, t);
    renderer.toneMappingExposure = (1.02 + verdict * 0.06) * lerp(1, 0.42, fade);

    renderer.render(scene, camera);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
