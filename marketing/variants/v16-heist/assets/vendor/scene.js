/* v16 "The Heist" — Ocean's-style crew reel. Four spotlit intros (hard cuts),
   then the job: a laser-guarded vault, a coral diamond on a pedestal, Ada on
   the rope. Letterboxed, bloomed, tense. The diamond is the perfect build. */
(function () {
  const K = window.CKIT;
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  (function () { // vault night gradient
    const cv = document.createElement("canvas"); cv.width = 16; cv.height = 512;
    const g = cv.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, "#1b1410"); gr.addColorStop(0.5, "#120d09"); gr.addColorStop(1, "#080604");
    g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
    scene.background = new THREE.CanvasTexture(cv);
  })();
  scene.fog = new THREE.Fog(0x0e0a07, 8, 30);
  const camera = new THREE.PerspectiveCamera(38, 1920 / 1080, 0.1, 100);
  const { clamp, lerp, smooth, SEATCOLORS, CORAL } = K;

  scene.environment = CPOST.createEnvironment(renderer, "night");

  /* ---- the vault ------------------------------------------------------ */
  const floorMat = new THREE.MeshPhysicalMaterial({
    color: 0x171210, roughness: 0.35, metalness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.5 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x241b14, roughness: 0.85, metalness: 0.1 });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), wallMat);
  backWall.position.set(0, 5, -9.5);
  scene.add(backWall);
  [-7.5, 7.5].forEach((x) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(22, 10), wallMat);
    w.position.set(x, 5, -2);
    w.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(w);
  });
  // vault door hint on the back wall
  const door = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48),
    new THREE.MeshPhysicalMaterial({ color: 0x3a2e22, roughness: 0.3, metalness: 0.75, clearcoat: 0.5 }));
  door.position.set(4.6, 2.3, -9.45);
  scene.add(door);
  const doorRing = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.09, 14, 64),
    new THREE.MeshStandardMaterial({ color: 0x5c4a33, roughness: 0.35, metalness: 0.7 }));
  doorRing.position.copy(door.position);
  scene.add(doorRing);

  /* ---- the diamond (the perfect build) -------------------------------- */
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.66, 1.25, 32),
    new THREE.MeshPhysicalMaterial({ color: 0x2c2218, roughness: 0.3, metalness: 0.6, clearcoat: 0.6 }));
  pedestal.position.set(0, 0.625, -6);
  scene.add(pedestal);
  const gemMat = new THREE.MeshPhysicalMaterial({
    color: 0xe85d34, emissive: 0xe85d34, emissiveIntensity: 0.42,
    roughness: 0.12, metalness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.08,
    flatShading: true, envMapIntensity: 1.4 });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), gemMat);
  gem.scale.set(1, 1.4, 1);
  gem.position.set(0, 1.78, -6);
  scene.add(gem);
  const gemGlow = new THREE.PointLight(CORAL, 1.4, 7);
  gemGlow.position.copy(gem.position);
  scene.add(gemGlow);

  /* ---- laser grid ------------------------------------------------------ */
  const lasers = [];
  const laserMat = () => new THREE.MeshBasicMaterial({ color: 0xff2e4d, transparent: true, opacity: 0.9 });
  [[0.55, -3.0, 0], [1.25, -4.3, 0.12], [0.85, -1.6, -0.1], [1.7, -5.2, 0.22], [0.4, -4.8, -0.18]].forEach(([y, z, tiltZ], i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 15, 8), laserMat());
    m.rotation.z = Math.PI / 2 + tiltZ;
    m.position.set(0, y, z);
    scene.add(m);
    lasers.push({ m, y0: y, ph: i * 1.7, sp: 0.5 + i * 0.13 });
  });

  /* ---- the crew (crafts figures with their instruments) ---------------- */
  // job positions; intros frame each in place with their own key light
  const CREW = [
    { name: "pam", color: SEATCOLORS[2], prop: 2, pos: [0.4, 0, 0.8], face: Math.PI },        // Mastermind, front
    { name: "ada", color: SEATCOLORS[0], prop: 0, pos: [-2.3, 0, -2.2], face: Math.PI * 0.92 }, // Safecracker
    { name: "iris", color: SEATCOLORS[1], prop: 1, pos: [-4.6, 0, -3.4], face: Math.PI / 2 },  // Artist, left wall
    { name: "ray", color: SEATCOLORS[3], prop: 3, pos: [4.5, 0, -2.6], face: -Math.PI / 2 },   // Lookout, right
  ];
  const crew = CREW.map((c) => {
    const fig = K.makeFigureCrafts(c.color, 0.4);
    fig.group.position.set(c.pos[0], 0, c.pos[2]);
    fig.group.rotation.y = c.face;
    const prop = K.PROPS[c.prop]();
    prop.scale.setScalar(1.3);
    prop.rotation.z = -0.4;
    fig.handR.add(prop);
    scene.add(fig.group);
    const sh = K.contactShadow(0.7, 0.45);
    sh.position.set(c.pos[0], 0.02, c.pos[2]);
    scene.add(sh);
    return { ...c, fig, sh };
  });

  // the rope (for Ada's descent during the job)
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a7558, roughness: 0.9 }));
  rope.visible = false;
  scene.add(rope);

  /* ---- lighting -------------------------------------------------------- */
  scene.add(new THREE.HemisphereLight(0xffd9b0, 0x0a0705, 0.16));
  // re-aimable intro key spot
  const spot = new THREE.SpotLight(0xffeacd, 0, 22, 0.5, 0.45, 1.2);
  spot.position.set(0, 8, 2);
  scene.add(spot, spot.target);
  const rim = new THREE.PointLight(0xffffff, 0, 8);
  scene.add(rim);
  // gem stage light
  const gemSpot = new THREE.SpotLight(0xffd9c2, 3, 18, 0.32, 0.5, 1.2);
  gemSpot.position.set(0, 8.5, -5.4);
  gemSpot.target.position.set(0, 1.4, -6);
  scene.add(gemSpot, gemSpot.target);
  const coralFlood = new THREE.PointLight(CORAL, 0, 22);
  coralFlood.position.set(0, 3, -5);
  scene.add(coralFlood);

  /* ---- timeline anchors ------------------------------------------------- */
  const INTRO = [
    { t0: 2.2, who: 0 },   // Pam · the Mastermind
    { t0: 4.5, who: 1 },   // Ada · the Safecracker
    { t0: 6.8, who: 2 },   // Iris · the Artist
    { t0: 9.1, who: 3 },   // Ray · the Lookout
  ];
  const PER = 2.3;
  const JOB0 = 13.2, GRAB = 18.6, AFTER = 19.4;

  function introIndex(t) {
    if (t < INTRO[0].t0 || t >= INTRO[0].t0 + PER * 4) return -1;
    return Math.floor((t - INTRO[0].t0) / PER);
  }

  /* ---- camera shots ------------------------------------------------------ */
  function camAt(t) {
    const ii = introIndex(t);
    if (t < 2.2) {
      // cold open: low push into the vault, lasers + distant gem
      const k = smooth(0, 2.2, t);
      camera.position.set(lerp(-1.2, 0.4, k), 1.05, lerp(7.5, 5.6, k));
      camera.fov = 40; camera.updateProjectionMatrix();
      camera.lookAt(0, 1.3, -6);
    } else if (ii >= 0) {
      // crew intro close-ups, slow push + drift, hard cuts between
      const c = CREW[ii];
      const u = (t - INTRO[ii].t0) / PER;
      const fx = Math.sin(c.face), fz = Math.cos(c.face);
      const d = lerp(3.0, 2.45, u);
      const side = (ii % 2 ? -1 : 1) * lerp(0.55, 0.25, u);
      camera.position.set(
        c.pos[0] + fx * d + side, 1.16 + u * 0.1, c.pos[2] + fz * d);
      camera.fov = 34; camera.updateProjectionMatrix();
      camera.lookAt(c.pos[0], 0.62, c.pos[2]);
    } else if (t < JOB0) {
      // the target: slow reveal push on the diamond through the lasers
      const k = smooth(11.4, JOB0, t);
      camera.position.set(lerp(1.6, 0.9, k), lerp(1.4, 1.15, k), lerp(0.5, -1.4, k));
      camera.fov = 36; camera.updateProjectionMatrix();
      camera.lookAt(0, 1.6, -6);
    } else if (t < AFTER) {
      // the job: rise with Ada's descent, gem in frame
      const k = smooth(JOB0, GRAB, t);
      const a = -0.35 + k * 0.5;
      camera.position.set(Math.sin(a) * 5.0, lerp(2.8, 2.3, k), -6 + Math.cos(a) * 5.0);
      camera.fov = 36; camera.updateProjectionMatrix();
      camera.lookAt(0, lerp(3.6, 2.5, k), -6);
    } else {
      // aftermath: low hero arc around the gathered crew + the prize
      const a = 0.15 + (t - AFTER) * 0.085;
      const k = smooth(AFTER, 23.5, t);
      camera.position.set(Math.sin(a) * lerp(5.2, 6.6, k), lerp(2.0, 3.1, k), -6 + Math.cos(a) * lerp(5.2, 6.6, k));
      camera.fov = 36; camera.updateProjectionMatrix();
      camera.lookAt(0, 0.9, -6);
    }
  }

  /* ---- post -------------------------------------------------------------- */
  const post = CPOST.create(renderer, scene, camera, {
    threshold: 0.56, knee: 0.3, strengthH: 0.78, strengthQ: 0.72,
    vignette: 0.44, grain: 0.034, ca: 0.12,
  });

  function renderAt(t) {
    camAt(t);
    const ii = introIndex(t);

    // intro key lighting rides the cuts
    if (ii >= 0) {
      const c = CREW[ii];
      spot.intensity = 7.5;
      spot.position.set(c.pos[0] + 1.5, 7.5, c.pos[2] + 2.5);
      spot.target.position.set(c.pos[0], 0.6, c.pos[2]);
      rim.intensity = 2.2;
      rim.color.setHex(c.color);
      rim.position.set(c.pos[0] - Math.sin(c.face) * 1.6, 1.6, c.pos[2] - Math.cos(c.face) * 1.6);
    } else {
      spot.intensity = t < 2.2 ? 2.2 : 3.4;
      spot.position.set(0, 8, 0); spot.target.position.set(0, 0, -3);
      rim.intensity = 0;
    }

    // crew idle life + intro emphasis
    crew.forEach((c, i) => {
      const hot = i === ii;
      c.fig.mats[0].emissiveIntensity = (hot ? 0.85 : 0.32) + Math.sin(t * 1.6 + i) * 0.05;
      c.fig.group.position.y = Math.abs(Math.sin(t * 1.4 + i * 1.3)) * 0.02;
      // props raise slightly during their intro
      c.fig.handR.rotation.x = hot ? -0.5 : 0;
    });

    // Ada takes the rope for the job
    const ada = crew[1];
    if (t >= JOB0 - 0.01) {
      const drop = smooth(JOB0, GRAB, t);
      const land = smooth(19.3, 20.6, t);    // she touches down with the prize
      const ax = 0, az = -6 + 0.62;
      const ay = lerp(5.4, 2.5, drop) - land * 2.48;
      ada.fig.group.position.set(ax, ay, az);
      ada.fig.group.rotation.y = Math.PI;
      ada.sh.position.set(ax, 0.02, az);
      ada.sh.material.opacity = 0.15 + drop * 0.3;
      rope.visible = t < 20.3;
      const topY = 9.5, botY = ay + 0.85;
      rope.scale.y = Math.max(0.05, topY - botY);
      rope.position.set(ax, (topY + botY) / 2, az);
    } else {
      rope.visible = false;
    }

    // the grab: gem leaves the pedestal and rides with Ada
    const grabbed = smooth(GRAB, GRAB + 0.5, t);
    if (grabbed > 0) {
      const a2 = crew[1].fig.group.position;
      gem.position.set(
        lerp(0, a2.x, grabbed),
        lerp(1.78, a2.y + 0.48, grabbed),
        lerp(-6, a2.z + 0.42, grabbed));
    } else {
      gem.position.set(0, 1.78 + Math.sin(t * 1.1) * 0.05, -6);
    }
    gem.rotation.y = t * 0.8;
    gem.scale.setScalar(1 - grabbed * 0.2).y = (1 - grabbed * 0.2) * 1.4;
    gemMat.emissiveIntensity = 0.42 + Math.sin(t * 2.4) * 0.08 + grabbed * 0.35;
    gemGlow.position.copy(gem.position);
    gemGlow.intensity = 1.4 + grabbed * 0.9;

    // lasers sweep, then die at the grab
    const cut = smooth(GRAB + 0.15, GRAB + 0.55, t);
    lasers.forEach((L) => {
      L.m.position.y = L.y0 + Math.sin(t * L.sp + L.ph) * 0.16;
      L.m.material.opacity = 0.9 * (1 - cut) * (0.8 + Math.sin(t * 7 + L.ph) * 0.2);
      L.m.visible = cut < 0.99;
    });

    // aftermath: the crew closes ranks around the prize, vault floods coral
    const gather = smooth(AFTER, 21.5, t);
    if (gather > 0) {
      const spots = [[0.95, -5.0], [0, 0], [-1.15, -5.25], [1.2, -5.5]]; // pam, (ada), iris, ray
      [0, 2, 3].forEach((idx, j) => {
        const c = crew[idx];
        const target = spots[idx === 0 ? 0 : idx];
        c.fig.group.position.x = lerp(c.pos[0], target[0], gather);
        c.fig.group.position.z = lerp(c.pos[2], target[1], gather);
        c.fig.group.position.y = Math.abs(Math.sin(t * 3.2 + idx)) * 0.05 * (gather < 0.98 ? 1 : 0.3);
        c.fig.group.rotation.y = lerp(c.face, Math.atan2(
          gem.position.x - c.fig.group.position.x, gem.position.z - c.fig.group.position.z) + Math.PI, gather);
        c.sh.position.set(c.fig.group.position.x, 0.02, c.fig.group.position.z);
      });
      coralFlood.intensity = gather * 2.0;
    }

    const fade = smooth(21.8, 23.4, t);
    renderer.toneMappingExposure = (0.95 + grabbed * 0.1) * lerp(1, 0.3, fade);

    post.render(t);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
