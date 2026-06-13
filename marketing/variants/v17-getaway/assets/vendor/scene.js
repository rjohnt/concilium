/* v17 "The Getaway" — night street, the council van. Crew intros walking out
   of the fog, the load-up through the rear doors, then the light-trail exit.
   In. Out. Shipped. */
(function () {
  const K = window.CKIT;
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  (function () { // wet night street gradient
    const cv = document.createElement("canvas"); cv.width = 16; cv.height = 512;
    const g = cv.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, "#141019"); gr.addColorStop(0.5, "#0e0b10"); gr.addColorStop(1, "#070508");
    g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
    scene.background = new THREE.CanvasTexture(cv);
  })();
  scene.fog = new THREE.Fog(0x0b0810, 9, 34);
  const camera = new THREE.PerspectiveCamera(38, 1920 / 1080, 0.1, 120);
  const { clamp, lerp, smooth, SEATCOLORS, CORAL } = K;

  scene.environment = CPOST.createEnvironment(renderer, "night");
  scene.add(new THREE.HemisphereLight(0xffd9b0, 0x0a0708, 0.3));
  // follow key for the crew intros
  const introSpot = new THREE.SpotLight(0xffeacd, 0, 20, 0.5, 0.5, 1.2);
  scene.add(introSpot, introSpot.target);
  const introRim = new THREE.PointLight(0xffffff, 0, 7);
  scene.add(introRim);
  // warm key over the loading zone
  const loadKey = new THREE.SpotLight(0xffd9b0, 4.2, 18, 0.5, 0.55, 1.3);
  loadKey.position.set(3.6, 6.5, 6.4);
  loadKey.target.position.set(0, 1, 2.2);
  scene.add(loadKey, loadKey.target);

  /* ---- the street ------------------------------------------------------ */
  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(26, 70),
    new THREE.MeshPhysicalMaterial({
      color: 0x121015, roughness: 0.32, metalness: 0.25,
      clearcoat: 0.7, clearcoatRoughness: 0.3, envMapIntensity: 0.6 }));
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.z = -10;
  scene.add(asphalt);
  // lane dashes
  for (let i = 0; i < 12; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x9a8f7a, roughness: 0.8 }));
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(-3.4, 0.012, 8 - i * 4.2);
    scene.add(dash);
  }
  // streetlights with visible cones
  const lampCones = [];
  [[-6.2, -2], [6.2, -10], [-6.2, -20], [6.2, 4]].forEach(([x, z], i) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5.6, 10),
      new THREE.MeshStandardMaterial({ color: 0x241f1a, roughness: 0.7, metalness: 0.3 }));
    pole.position.set(x, 2.8, z);
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffc98e, emissiveIntensity: 1.8 }));
    head.position.set(x * 0.86, 5.5, z);
    scene.add(head);
    const lt = new THREE.SpotLight(0xffd2a0, 3.2, 14, 0.55, 0.6, 1.4);
    lt.position.set(x * 0.86, 5.5, z);
    lt.target.position.set(x * 0.6, 0, z);
    scene.add(lt, lt.target);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 2.1, 5.4, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd2a0, transparent: true, opacity: 0.05,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.set(x * 0.86, 2.9, z);
    scene.add(cone);
    lampCones.push(cone);
  });

  /* ---- the council van -------------------------------------------------- */
  const van = new THREE.Group();
  const vanBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x2b2836, roughness: 0.28, metalness: 0.5, clearcoat: 0.9, clearcoatRoughness: 0.16, envMapIntensity: 1.25 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.7, 4.8), vanBodyMat);
  body.position.y = 1.25;
  van.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.78, 1.1), vanBodyMat);
  hood.position.set(0, 0.79, -2.85);
  van.add(hood);
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.85),
    new THREE.MeshPhysicalMaterial({ color: 0x0c1018, roughness: 0.08, metalness: 0.6, clearcoat: 1, envMapIntensity: 1.3 }));
  windshield.position.set(0, 1.55, -2.39);
  windshield.rotation.x = -0.42;
  van.add(windshield);
  // wheels
  [[-1.05, -1.7], [1.05, -1.7], [-1.05, 1.6], [1.05, 1.6]].forEach(([x, z]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 24),
      new THREE.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 0.85 }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.45, z);
    van.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.32, 16),
      new THREE.MeshStandardMaterial({ color: 0x6a6258, roughness: 0.3, metalness: 0.8 }));
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x, 0.45, z);
    van.add(hub);
  });
  // headlights + beams (front faces -z)
  [[-0.75], [0.75]].forEach(([x]) => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff2da, emissive: 0xfff2da, emissiveIntensity: 2.4 }));
    lamp.position.set(x, 0.95, -3.42);
    van.add(lamp);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.85, 6.5, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff0d2, transparent: true, opacity: 0.06,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.rotation.x = Math.PI / 2;
    beam.position.set(x, 0.95, -6.7);
    van.add(beam);
  });
  // taillight strips (rear, +z)
  const tailMats = [];
  [[-0.85], [0.85]].forEach(([x]) => {
    const tm = new THREE.MeshStandardMaterial({ color: 0xff2e3c, emissive: 0xff2e3c, emissiveIntensity: 1.2 });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.05), tm);
    tail.position.set(x, 1.55, 2.42);
    van.add(tail);
    tailMats.push(tm);
  });
  // rear doors (hinged at outer edges)
  const doorMat = vanBodyMat.clone();
  const doors = [];
  [[-1, 1], [1, -1]].forEach(([sideX, openSign]) => {
    const hinge = new THREE.Group();
    hinge.position.set(sideX * 1.15, 1.25, 2.4);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.62, 0.06), doorMat);
    panel.position.x = -sideX * 0.55;
    hinge.add(panel);
    van.add(hinge);
    doors.push({ hinge, openSign });
  });
  // the quad mark on the van side (drawn, redrawn when fonts arrive)
  const sideCv = document.createElement("canvas"); sideCv.width = 512; sideCv.height = 256;
  function drawSide() {
    const g = sideCv.getContext("2d");
    g.clearRect(0, 0, 512, 256);
    g.save(); g.translate(96, 128); g.rotate(Math.PI / 4);
    const R = 38;
    [["#7A57D1", -27, -27], ["#D9962A", 27, -27], ["#2F82C7", -27, 27], ["#1E9C86", 27, 27]].forEach(([c, x, y]) => {
      g.fillStyle = c; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
    });
    g.restore();
    g.fillStyle = "#FCFAF6"; g.beginPath(); g.arc(96, 128, 22, 0, 7); g.fill();
    g.fillStyle = "#FCFAF6"; g.font = "700 56px Bricolage Grotesque, sans-serif";
    g.fillText("Concilium", 170, 148);
  }
  drawSide();
  const sideTex = new THREE.CanvasTexture(sideCv);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawSide(); sideTex.needsUpdate = true; });
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.15),
    new THREE.MeshBasicMaterial({ map: sideTex, transparent: true }));
  decal.position.set(1.16, 1.3, 0.1);
  decal.rotation.y = Math.PI / 2;
  van.add(decal);
  // faked rear opening: dark doorway + warm interior glow, just outside the body shell
  const doorway = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 1.5),
    new THREE.MeshBasicMaterial({ color: 0x070504 }));
  doorway.position.set(0, 1.2, 2.401);
  van.add(doorway);
  const cabinGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.25),
    new THREE.MeshBasicMaterial({ color: 0xb35c20, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  cabinGlow.position.set(0, 1.2, 2.402);
  van.add(cabinGlow);
  const vanShadow = K.contactShadow(3.4, 0.5);
  vanShadow.position.y = 0.02;
  van.add(vanShadow);
  scene.add(van);

  // getaway light trails (revealed during the exit)
  const trails = [];
  [[-0.85, 1.55], [0.85, 1.55], [-1.05, 0.4], [1.05, 0.4]].forEach(([x, y], i) => {
    const tr = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 9),
      new THREE.MeshBasicMaterial({ color: i < 2 ? 0xff2e3c : 0xffb37a, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    tr.rotation.x = Math.PI / 2;
    tr.position.set(x, y, 7.0);
    van.add(tr);
    trails.push(tr);
  });

  /* ---- the crew --------------------------------------------------------- */
  // each walks out of the fog (+z) toward the van rear during their intro
  const CREW = [
    { color: SEATCOLORS[2], prop: 2, lane: -1.3 },  // Pam
    { color: SEATCOLORS[0], prop: 0, lane: 0.6 },   // Ada
    { color: SEATCOLORS[1], prop: 1, lane: -0.4 },  // Iris
    { color: SEATCOLORS[3], prop: 3, lane: 1.4 },   // Ray
  ];
  const crew = CREW.map((c, i) => {
    const fig = K.makeFigureCrafts(c.color, 0.5);
    const prop = K.PROPS[c.prop]();
    prop.scale.setScalar(1.3);
    prop.rotation.z = -0.4;
    fig.handR.add(prop);
    fig.group.position.set(c.lane, 0, 14 + i * 1.5);
    fig.group.rotation.y = 0;   // front (-z) toward the van
    scene.add(fig.group);
    const sh = K.contactShadow(0.7, 0.4);
    scene.add(sh);
    return { ...c, fig, sh };
  });

  /* ---- timeline ----------------------------------------------------------- */
  const INTRO0 = 3.2, PER = 2.3;          // intros 3.2–12.4
  const LOAD0 = 12.4, HOP = 1.45;          // hop-ins at 12.7/14.15/15.6/17.05
  const DOORS = 17.9, GO = 18.9;           // doors shut, van leaves

  function introIndex(t) {
    if (t < INTRO0 || t >= INTRO0 + PER * 4) return -1;
    return Math.floor((t - INTRO0) / PER);
  }

  /* ---- camera ------------------------------------------------------------- */
  function camAt(t) {
    const ii = introIndex(t);
    if (t < INTRO0) {
      // title: low front push, headlight flare
      const k = smooth(0, INTRO0, t);
      camera.position.set(lerp(-2.2, -1.2, k), 0.85, lerp(-8.5, -6.4, k));
      camera.fov = 40; camera.updateProjectionMatrix();
      camera.lookAt(0, 1.1, 0);
    } else if (ii >= 0) {
      // street-level intro: the figure walks at us out of the fog
      const c = crew[ii];
      const u = (t - INTRO0 - ii * PER) / PER;
      const fz = c.fig.group.position.z;
      camera.position.set(c.lane + (ii % 2 ? -1.5 : 1.5), 0.95, fz - 3.4);
      camera.fov = 34; camera.updateProjectionMatrix();
      camera.lookAt(c.lane, 0.62, fz);
    } else if (t < GO) {
      // load-up: rear three-quarter wide
      const k = smooth(LOAD0, DOORS, t);
      camera.position.set(lerp(5.6, 4.8, k), lerp(1.8, 2.1, k), lerp(8.8, 7.8, k));
      camera.fov = 36; camera.updateProjectionMatrix();
      camera.lookAt(0, 1.05, 2.2);
    } else {
      // getaway: hold the street as the van tears off, slow crane up
      const k = smooth(GO, 24, t);
      camera.position.set(lerp(3.6, 2.6, k), lerp(1.9, 3.4, k), lerp(6.2, 7.6, k));
      camera.fov = 36 + k * 2; camera.updateProjectionMatrix();
      camera.lookAt(0, 1.0, lerp(1.6, -14, k));
    }
  }

  /* ---- post ---------------------------------------------------------------- */
  const post = CPOST.create(renderer, scene, camera, {
    threshold: 0.56, knee: 0.3, strengthH: 0.78, strengthQ: 0.72,
    vignette: 0.44, grain: 0.034, ca: 0.12,
  });

  function renderAt(t) {
    camAt(t);
    const ii = introIndex(t);

    // intro follow light
    if (ii >= 0) {
      const c0 = crew[ii];
      introSpot.intensity = 6.5;
      introSpot.position.set(c0.fig.group.position.x + 1.6, 6.4, c0.fig.group.position.z + 2.2);
      introSpot.target.position.copy(c0.fig.group.position);
      introRim.intensity = 1.9;
      introRim.color.setHex(c0.color);
      introRim.position.set(c0.fig.group.position.x - 1.2, 1.4, c0.fig.group.position.z - 1.4);
    } else {
      introSpot.intensity = 0;
      introRim.intensity = 0;
    }

    crew.forEach((c, i) => {
      // walk in during own intro, then queue toward the doors, then hop in
      const introStart = INTRO0 + i * PER;
      const walk = smooth(introStart - 1.2, introStart + PER, t);     // approach
      const queue = smooth(INTRO0 + 4 * PER - 1, LOAD0 + i * HOP, t); // close distance
      const hopT = LOAD0 + 0.3 + i * HOP;
      const hop = smooth(hopT, hopT + 0.55, t);

      const zStart = 14 + i * 1.5;
      let z = lerp(zStart, 6.2 + i * 1.1, walk);
      z = lerp(z, 3.6, queue);
      z = lerp(z, 1.9, hop);
      const x = lerp(c.lane, c.lane * 0.4, queue) * (1 - hop * 0.85);
      const walking = (walk > 0.01 && walk < 0.99) || (queue > 0.01 && queue < 0.99);
      const bob = walking ? Math.abs(Math.sin(t * 3.6 + i * 1.7)) * 0.055 : 0;
      const y = bob + hop * 0.55 * Math.sin(Math.min(1, hop) * Math.PI * 0.85);

      c.fig.group.position.set(x, y, z);
      c.fig.group.rotation.z = walking ? Math.sin(t * 3.6 + i * 1.7) * 0.04 : 0;
      c.fig.group.visible = hop < 0.7;      // crosses the doorway threshold
      c.sh.position.set(x, 0.02, z);
      c.sh.material.opacity = 0.4 * (1 - hop);
      const hot = i === ii;
      c.fig.mats[0].emissiveIntensity = (hot ? 0.85 : 0.4) + Math.sin(t * 1.6 + i) * 0.05;
      c.fig.handR.rotation.x = hot ? -0.5 : 0;
    });

    // doors: open through the load, slam shut at DOORS
    const shut = smooth(DOORS, DOORS + 0.45, t);
    doors.forEach((d) => {
      d.hinge.rotation.y = d.openSign * lerp(1.85, 0, shut);
    });
    cabinGlow.material.opacity = smooth(LOAD0 - 0.6, LOAD0 + 0.4, t) * 0.3 * (1 - shut);
    doorway.visible = shut < 0.9;

    // the getaway
    const go = smooth(GO, 23.2, t);
    van.position.z = -go * go * 26;          // eased-in acceleration
    van.position.x = Math.sin(go * 2.2) * 0.35 * go;
    const brake = smooth(DOORS + 0.3, DOORS + 0.65, t) * (1 - smooth(GO + 0.4, GO + 1.0, t));
    tailMats.forEach((m) => { m.emissiveIntensity = 1.2 + shut * 1.0 + brake * 2.6 + go * 1.6; });
    trails.forEach((tr, i) => {
      tr.material.opacity = go > 0.02 ? Math.min(0.7, go * 1.8) * (i < 2 ? 0.6 : 0.36) : 0;
      tr.scale.y = 1 + go * 2.4;
      tr.position.z = 7.0 + go * 6;
    });
    // lamp cones flicker faintly
    lampCones.forEach((cn, i) => { cn.material.opacity = 0.05 + Math.sin(t * 7 + i * 2.1) * 0.012; });

    const fade = smooth(22.4, 23.8, t);
    renderer.toneMappingExposure = 0.95 * lerp(1, 0.3, fade);

    post.render(t);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
