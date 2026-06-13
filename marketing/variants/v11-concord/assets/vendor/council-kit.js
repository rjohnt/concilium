/* council-kit — shared builders for the v11+ reel scenes.
   Exposes window.CKIT. Persona model sets:
     lantern  — soft lathe-profile figures (upbeat cuts)
     faceted  — low-poly crystalline figures (epic cuts)
     crafts   — figures with arms that hold role props (wrench, brush, scroll, lens)
   Plus makeMark3D — the council logo (public/brand/logo-mark.svg) as 3D spheres. */
(function () {
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

  let shadowTex = null;
  function contactShadow(radius, opacity) {
    if (!shadowTex) {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 128;
      const g = cv.getContext("2d");
      const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
      grad.addColorStop(0, "rgba(0,0,0,0.42)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      shadowTex = new THREE.CanvasTexture(cv);
    }
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2, radius * 2),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
  }

  function stdMat(color, emissive, ei, rough, flat) {
    return new THREE.MeshStandardMaterial({
      color, emissive: emissive != null ? emissive : color,
      emissiveIntensity: ei, roughness: rough, metalness: 0.05,
      flatShading: !!flat,
    });
  }

  /* -------- persona model sets ------------------------------------- */
  // soft "lantern" figure — lathe vase body + head
  function makeFigureLantern(color, ei) {
    const g = new THREE.Group();
    const pts = [
      new THREE.Vector2(0.05, 0), new THREE.Vector2(0.23, 0.06),
      new THREE.Vector2(0.295, 0.26), new THREE.Vector2(0.21, 0.5),
      new THREE.Vector2(0.09, 0.6), new THREE.Vector2(0.02, 0.63),
    ];
    const mat = stdMat(color, color, ei == null ? 0.4 : ei, 0.42);
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mat);
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 26, 26), mat);
    head.position.y = 0.8;
    g.add(head);
    return { group: g, mats: [mat] };
  }

  // low-poly "faceted" figure — hex prism body + octahedron head
  function makeFigureFaceted(color, ei) {
    const g = new THREE.Group();
    const mat = stdMat(color, color, ei == null ? 0.35 : ei, 0.5, true);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.3, 0.6, 6), mat);
    body.position.y = 0.3;
    g.add(body);
    const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), mat);
    head.position.y = 0.82;
    head.rotation.y = Math.PI / 7;
    g.add(head);
    return { group: g, mats: [mat] };
  }

  // "crafts" figure — pawn body + head + two forward arms with hand anchors
  function makeFigureCrafts(color, ei) {
    const g = new THREE.Group();
    const mat = stdMat(color, color, ei == null ? 0.4 : ei, 0.42);
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.295, 0.66, 26), mat);
    body.position.y = 0.33;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.185, 26, 26), mat);
    head.position.y = 0.78;
    g.add(head);
    const handL = new THREE.Group();
    const handR = new THREE.Group();
    const armGeo = new THREE.CapsuleGeometry(0.05, 0.2, 6, 12);
    const armL = new THREE.Mesh(armGeo, mat);
    armL.position.set(-0.21, 0.5, -0.14);
    armL.rotation.set(-0.9, 0, 0.5);
    g.add(armL);
    const armR = new THREE.Mesh(armGeo, mat);
    armR.position.set(0.21, 0.5, -0.14);
    armR.rotation.set(-0.9, 0, -0.5);
    g.add(armR);
    handL.position.set(-0.24, 0.42, -0.3);
    handR.position.set(0.24, 0.42, -0.3);
    g.add(handL, handR);
    return { group: g, mats: [mat], handL, handR };
  }

  /* -------- role props ---------------------------------------------- */
  const toolMat = () => new THREE.MeshStandardMaterial({
    color: 0xd9cab2, roughness: 0.35, metalness: 0.65 });

  // open-end wrench (Engineer)
  function makeWrench() {
    const g = new THREE.Group();
    const m = toolMat();
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.34, 0.028), m);
    g.add(handle);
    const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.03, 12, 28, 4.4), m);
    jaw.position.y = 0.22;
    jaw.rotation.z = Math.PI / 2 + 0.9;
    g.add(jaw);
    return g;
  }
  // paintbrush (Designer)
  function makeBrush() {
    const g = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.3, 14),
      new THREE.MeshStandardMaterial({ color: 0xe6d6bd, roughness: 0.55, metalness: 0.05 }));
    g.add(handle);
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 0.06, 14), toolMat());
    ferrule.position.y = 0.18;
    g.add(ferrule);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.1, 14),
      stdMat(0x7a57d1, 0x7a57d1, 0.55, 0.4));
    tip.position.y = 0.26;
    g.add(tip);
    return g;
  }
  // spec scroll (Product Owner)
  function makeScroll() {
    const g = new THREE.Group();
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.4, 16),
      new THREE.MeshStandardMaterial({ color: 0xfcf6ea, roughness: 0.7, metalness: 0 }));
    paper.rotation.z = Math.PI / 2;
    g.add(paper);
    [-0.21, 0.21].forEach((x) => {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.067, 0.067, 0.035, 16),
        stdMat(0xd9962a, 0xd9962a, 0.4, 0.4));
      knob.rotation.z = Math.PI / 2;
      knob.position.x = x;
      g.add(knob);
    });
    return g;
  }
  // magnifying lens (QA)
  function makeLens() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.022, 14, 36), toolMat());
    g.add(ring);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.095, 30),
      new THREE.MeshStandardMaterial({
        color: 0xbfe0f2, roughness: 0.1, metalness: 0.1,
        transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
    g.add(glass);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.2, 12), toolMat());
    handle.position.y = -0.2;
    g.add(handle);
    return g;
  }
  const PROPS = [makeWrench, makeBrush, makeScroll, makeLens]; // by seat index

  /* -------- the council mark in 3D (public/brand/logo-mark.svg, rotated quad) --
     after the 45° rotation the four role circles sit at compass points:
     purple N · gold E · teal S · blue W, ink dot upright at center.        */
  function makeMark3D(scale, dotColor, ei) {
    const g = new THREE.Group();
    const unit = scale; // 1 unit = one circle radius (24 svg px); offset 22.63/24
    const OFF = 0.943;
    const defs = [
      { c: 0x7a57d1, x: 0, y: OFF },    // N
      { c: 0xd9962a, x: OFF, y: 0 },    // E
      { c: 0x1e9c86, x: 0, y: -OFF },   // S
      { c: 0x2f82c7, x: -OFF, y: 0 },   // W
    ];
    const pebbles = [];
    defs.forEach((d) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(unit, 40, 40),
        stdMat(d.c, d.c, ei == null ? 0.32 : ei, 0.42));
      m.position.set(d.x * unit, d.y * unit, 0);
      g.add(m);
      pebbles.push(m);
    });
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.583 * unit, 32, 32),
      stdMat(dotColor == null ? 0x2b221c : dotColor, dotColor == null ? 0x2b221c : dotColor, 0.18, 0.5));
    dot.position.set(0, 0, 0.62 * unit);
    g.add(dot);
    pebbles.push(dot); // index 4 = the dot
    return { group: g, pebbles };
  }

  /* -------- compact table + chair ------------------------------------ */
  function makeTable(opts) {
    const o = opts || {};
    const wood = new THREE.MeshStandardMaterial({
      color: o.wood || 0x33251a, roughness: 0.5, metalness: o.metal == null ? 0.3 : o.metal });
    const t = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.11, 0.17, 96), wood);
    slab.position.y = -0.1; t.add(slab);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.05, 16, 120),
      new THREE.MeshStandardMaterial({ color: o.rim || 0x463422, roughness: 0.42, metalness: 0.38 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = -0.06; t.add(rim);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.52, 0.9, 40), wood);
    col.position.y = -0.65; t.add(col);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.15, 48), wood);
    plinth.position.y = -1.12; t.add(plinth);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a20, emissive: CORAL, emissiveIntensity: 0.12, roughness: 0.35, metalness: 0.25 });
    const cring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.045, 20, 140), ringMat);
    cring.rotation.x = -Math.PI / 2; cring.position.y = 0.005; t.add(cring);
    return { group: t, ringMat };
  }
  function makeChair(color) {
    const mat = new THREE.MeshStandardMaterial({
      color: color || 0x4a3826, roughness: 0.55, metalness: 0.18 });
    const c = new THREE.Group();
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.12, 28), mat);
    cushion.position.y = -0.3; c.add(cushion);
    const back = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.78, 24, 1, true, -Math.PI / 3.1, (Math.PI * 2) / 3.1),
      new THREE.MeshStandardMaterial({ color: color || 0x4a3826, roughness: 0.58, metalness: 0.18, side: THREE.DoubleSide }));
    back.position.y = 0.12; back.rotation.y = 0 /* back wall outward */; c.add(back);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.86, 16), mat);
    base.position.y = -0.76; c.add(base);
    return c;
  }

  window.CKIT = {
    SEATCOLORS, CORAL, clamp, lerp, smooth, mulberry32, contactShadow,
    makeFigureLantern, makeFigureFaceted, makeFigureCrafts,
    makeWrench, makeBrush, makeScroll, makeLens, PROPS,
    makeMark3D, makeTable, makeChair,
  };
})();
