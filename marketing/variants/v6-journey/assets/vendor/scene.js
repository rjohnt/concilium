/* v6 "Journey" — a living ticket travels the chamber: stamped by every seat,
   then through the build portal. Deterministic; driven by hf-seek. */
(function () {
  const canvas = document.getElementById("three-layer");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1b130d, 8, 22);
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

  /* ---- council table + seated figures (compact rebuild) ---------- */
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x33251a, roughness: 0.5, metalness: 0.3 });
  const table = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.11, 0.17, 96), woodMat);
  slab.position.y = -0.1; table.add(slab);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.05, 16, 120),
    new THREE.MeshStandardMaterial({ color: 0x463422, roughness: 0.42, metalness: 0.38 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = -0.06; table.add(rim);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.52, 0.9, 40), woodMat);
  column.position.y = -0.65; table.add(column);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.15, 48), woodMat);
  plinth.position.y = -1.12; table.add(plinth);
  scene.add(table);

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x3a2a20, emissive: CORAL, emissiveIntensity: 0.12, roughness: 0.35, metalness: 0.25 });
  const cring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.045, 20, 140), ringMat);
  cring.rotation.x = -Math.PI / 2; cring.position.y = 0.005; table.add(cring);

  const chairMat = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.55, metalness: 0.18 });
  const figures = [];
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    const place = new THREE.Group();
    place.position.set(Math.cos(a) * 2.62, 0, Math.sin(a) * 2.62);
    place.rotation.y = Math.PI / 2 - a;
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.12, 28), chairMat);
    cushion.position.y = -0.3; place.add(cushion);
    const back = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.78, 24, 1, true, -Math.PI / 3.1, (Math.PI * 2) / 3.1),
      new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.58, metalness: 0.18, side: THREE.DoubleSide }));
    back.position.y = 0.12; back.rotation.y = 0; // arc wall sits at local +z = outward (chair back behind the persona)
    place.add(back);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.86, 16), chairMat);
    base.position.y = -0.76; place.add(base);
    const mat = new THREE.MeshStandardMaterial({
      color: SEATCOLORS[i], emissive: SEATCOLORS[i], emissiveIntensity: 0.5, roughness: 0.38, metalness: 0.05 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.235, 0.32, 8, 20), mat);
    body.position.set(0, 0.16, -0.03);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), mat);
    head.position.set(0, 0.62, -0.06);
    place.add(body, head);
    scene.add(place);
    figures.push({ mat });
  }

  /* ---- the hero ticket card (canvas texture) ---------------------- */
  const ticketCanvas = document.createElement("canvas");
  ticketCanvas.width = 768; ticketCanvas.height = 480;
  function drawTicket() {
    const cv = ticketCanvas;
    const g = cv.getContext("2d");
    g.clearRect(0, 0, cv.width, cv.height);
    function rr(x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    rr(6, 6, 756, 468, 38); g.fillStyle = "#fcfaf6"; g.fill();
    g.strokeStyle = "rgba(43,34,28,0.16)"; g.lineWidth = 3; g.stroke();
    // header
    g.fillStyle = "#2b221c"; g.font = "700 52px Bricolage Grotesque, sans-serif";
    g.fillText("TKT-128", 52, 96);
    g.fillStyle = "#cf4a28"; g.font = "600 30px Hanken Grotesk, sans-serif";
    g.fillText("living ticket", 52, 142);
    // mark pebbles top-right
    g.fillStyle = "#e85d34"; g.beginPath(); g.arc(652, 78, 22, 0, 7); g.fill();
    g.fillStyle = "#7a57d1"; g.beginPath(); g.arc(631, 114, 22, 0, 7); g.fill();
    g.fillStyle = "#1e9c86"; g.beginPath(); g.arc(673, 114, 22, 0, 7); g.fill();
    g.fillStyle = "#2b221c"; g.beginPath(); g.arc(652, 102, 11, 0, 7); g.fill();
    // body lines
    g.fillStyle = "rgba(43,34,28,0.5)";
    [[52, 208, 540], [52, 252, 620], [52, 296, 480], [52, 366, 580], [52, 410, 380]].forEach(([x, y, w]) => {
      rr(x, y, w, 22, 11); g.fill();
    });
  }
  drawTicket();
  const ticketTex = new THREE.CanvasTexture(ticketCanvas);
  ticketTex.anisotropy = 4;
  // canvas type renders in a fallback font until the woff2s load — redraw then
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { drawTicket(); ticketTex.needsUpdate = true; });
  }
  const ticket = new THREE.Group();
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 0.97),
    new THREE.MeshStandardMaterial({
      map: ticketTex, roughness: 0.5, metalness: 0,
      emissive: 0xfff4e2, emissiveMap: ticketTex, emissiveIntensity: 0.32,
      side: THREE.DoubleSide,
    }),
  );
  ticket.add(card);
  // soft glow sprite behind the card
  const glowTex = (() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 128;
    const g = cv.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,214,170,0.85)"); gr.addColorStop(1, "rgba(255,214,170,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffc89a, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(2.6); glow.position.z = -0.06;
  ticket.add(glow);
  // four stamp discs (hidden until earned)
  const stamps = [];
  for (let i = 0; i < 4; i++) {
    const d = new THREE.Mesh(
      new THREE.CircleGeometry(0.085, 28),
      new THREE.MeshBasicMaterial({ color: SEATCOLORS[i] }));
    d.position.set(-0.52 + i * 0.34, -0.3, 0.012);
    d.scale.setScalar(0.001);
    ticket.add(d);
    stamps.push(d);
  }
  scene.add(ticket);

  /* ---- the build portal ------------------------------------------- */
  const portal = new THREE.Group();
  portal.position.set(0, 1.7, -10.5);
  const pring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.09, 24, 120),
    new THREE.MeshStandardMaterial({ color: 0x3a2a20, emissive: CORAL, emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.3 }));
  portal.add(pring);
  const pglow = new THREE.Mesh(new THREE.CircleGeometry(1.42, 64),
    new THREE.MeshBasicMaterial({ color: 0xffb38f, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  portal.add(pglow);
  scene.add(portal);

  /* ---- motes + lights ---------------------------------------------- */
  const rand = mulberry32(660611);
  const COUNT = 130;
  const pos = new Float32Array(COUNT * 3);
  const seeds = [];
  for (let i = 0; i < COUNT; i++) {
    const r = 1.5 + rand() * 5.5, th = rand() * Math.PI * 2;
    pos[i * 3] = Math.cos(th) * r; pos[i * 3 + 1] = -0.5 + rand() * 3.4; pos[i * 3 + 2] = Math.sin(th) * r - 2;
    seeds.push({ r, th, h: pos[i * 3 + 1], sp: 0.05 + rand() * 0.09, ph: rand() * 6.28 });
  }
  const mgeo = new THREE.BufferGeometry();
  mgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(mgeo, new THREE.PointsMaterial({
    color: 0xffd9b8, size: 0.035, transparent: true, opacity: 0.45,
    blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(motes);

  scene.add(new THREE.HemisphereLight(0xffe6cf, 0x120c08, 0.4));
  const key = new THREE.SpotLight(0xfff0dd, 8, 30, 0.8, 0.55, 1.1);
  key.position.set(0, 9.5, 3); key.target.position.set(0, 0, 0);
  scene.add(key, key.target);
  const cardLight = new THREE.PointLight(0xffc89a, 1.6, 6);
  scene.add(cardLight);
  const portalLight = new THREE.PointLight(CORAL, 0, 14);
  portalLight.position.copy(portal.position);
  scene.add(portalLight);

  /* ---- the ticket's flight path ------------------------------------ */
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(6.2, 3.1, 7.5),
    new THREE.Vector3(3.2, 1.9, 3.6),
    new THREE.Vector3(0, 1.35, 1.2),
    new THREE.Vector3(1.7, 1.0, 0.2),    // seat 1 side (right)
    new THREE.Vector3(0.2, 0.95, 1.75),  // seat 2 (front)
    new THREE.Vector3(-1.7, 1.0, 0.2),   // seat 3 (left)
    new THREE.Vector3(-0.2, 1.05, -1.75),// seat 0 (back)
    new THREE.Vector3(0, 1.35, -3.6),
    new THREE.Vector3(0, 1.7, -10.5),    // portal
  ]);
  // time → path progress (eased per leg)
  function progress(t) {
    if (t < 5) return lerp(0, 0.30, smooth(0.2, 5, t));            // arrive
    if (t < 15.2) return lerp(0.30, 0.78, (t - 5) / 10.2);         // circle seats (linear, calm)
    return lerp(0.78, 1.0, smooth(15.2, 19.6, t));                 // accelerate to portal
  }
  const STAMP_T = [7.4, 9.9, 12.4, 14.8]; // pass each seat

  /* ---- camera shots -------------------------------------------------
     S1 chase  [0–5]    behind-right of card, descending with it
     S2 floor  [5–15.2] low fixed-ish arc by the table, watching card
     S3 chase2 [15.2–20] behind card racing to the portal
     S4 hold   [20–26]  drift near portal afterglow (under CSS wash)   */
  function camAt(t) {
    const p = progress(t);
    const cp = path.getPointAt(clamp(p, 0, 1));
    if (t < 5) {
      const back = path.getPointAt(clamp(p - 0.045, 0, 1));
      camera.position.set(back.x + 1.3, back.y + 0.75, back.z + 1.6);
      camera.lookAt(cp.x, cp.y, cp.z);
    } else if (t < 15.2) {
      const a = -0.35 + (t - 5) * 0.052;
      camera.position.set(Math.cos(a) * 6.6, 2.45, Math.sin(a) * 6.6);
      const blend = smooth(5, 6.2, t);
      camera.lookAt(lerp(cp.x, cp.x * 0.4, blend), lerp(cp.y, 0.7, blend), lerp(cp.z, cp.z * 0.4, blend));
    } else if (t < 20.2) {
      const back = path.getPointAt(clamp(p - 0.035, 0, 1));
      const k = smooth(15.2, 16.4, t);
      camera.position.set(
        lerp(Math.cos(0.18) * 6.6, back.x + 0.9, k),
        lerp(2.45, back.y + 0.45, k),
        lerp(Math.sin(0.18) * 6.6, back.z + 1.4, k));
      camera.lookAt(portal.position.x, portal.position.y, portal.position.z);
    } else {
      const d = (t - 20.2) * 0.08;
      camera.position.set(0.6 - d, 2.0, -6.2 - d * 2);
      camera.lookAt(0, 1.5, -10.5);
    }
  }

  function renderAt(t) {
    camAt(t);

    // ticket along the path, facing its travel direction, gentle wobble
    const p = clamp(progress(t), 0, 1);
    const cp = path.getPointAt(p);
    const ahead = path.getPointAt(clamp(p + 0.012, 0, 1));
    ticket.position.copy(cp);
    ticket.lookAt(ahead.x, ahead.y, ahead.z);
    ticket.rotateY(Math.PI);                          // face the camera side
    ticket.rotation.z += Math.sin(t * 1.7) * 0.05;    // float wobble
    ticket.position.y += Math.sin(t * 2.1) * 0.04;
    cardLight.position.copy(ticket.position);

    // shrink/vanish as it enters the portal
    const enter = smooth(19.3, 20.0, t);
    ticket.scale.setScalar((1 - enter) * lerp(1, 0.55, smooth(18.2, 19.8, t)) + 0.001);

    // stamps pop as it passes each seat; that seat flares
    for (let i = 0; i < 4; i++) {
      const s = smooth(STAMP_T[i], STAMP_T[i] + 0.45, t);
      const overshoot = 1 + Math.sin(s * Math.PI) * 0.5;
      stamps[i].scale.setScalar(0.001 + s * overshoot);
      figures[i].mat.emissiveIntensity =
        0.5 + smooth(STAMP_T[i] - 0.5, STAMP_T[i], t) * (1 - smooth(STAMP_T[i] + 0.7, STAMP_T[i] + 1.6, t)) * 1.5;
    }

    // consensus ring warms with each stamp, portal blooms for arrival
    const stamped = smooth(STAMP_T[0], STAMP_T[3] + 0.5, t);
    ringMat.emissiveIntensity = 0.12 + stamped * 0.8;
    const arrive = smooth(17.5, 20.0, t);
    pring.material.emissiveIntensity = 1.4 + arrive * 3.2;
    pglow.material.opacity = 0.16 + arrive * 0.5;
    pglow.scale.setScalar(1 + arrive * 0.25 + Math.sin(t * 5) * 0.02);
    portalLight.intensity = 1.2 + arrive * 7;
    portal.rotation.z = t * 0.22;

    // motes drift
    const mp = mgeo.attributes.position;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i], th = s.th + t * s.sp;
      mp.array[i * 3] = Math.cos(th) * s.r;
      mp.array[i * 3 + 1] = s.h + Math.sin(t * 0.4 + s.ph) * 0.16;
      mp.array[i * 3 + 2] = Math.sin(th) * s.r - 2;
    }
    mp.needsUpdate = true;

    // dim for lockup (CSS wash carries from ~20.4)
    const fade = smooth(20.2, 21.6, t);
    renderer.toneMappingExposure = 0.98 * lerp(1, 0.16, fade) + arrive * 0.25 * (1 - fade);

    renderer.render(scene, camera);
  }

  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
})();
