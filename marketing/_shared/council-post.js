/* council-post — cinematic layer for the reel scenes (core-three only, r149 UMD).
   Exposes window.CPOST:
     createEnvironment(renderer, "warm"|"night"|"day") → PMREM env texture for
       scene.environment (real PBR reflections/ambient, RoomEnvironment-style)
     create(renderer, scene, camera, opts) → { render(t) } — replaces
       renderer.render with: scene→RT, threshold bright-pass, two-level
       gaussian bloom (½ + ¼ res), then a composite with bloom + chromatic
       aberration + vignette + deterministic film grain (time-seeded).
   Everything is driven by the hf-seek time — fully deterministic. */
(function () {
  /* ---------- procedural studio environment → PMREM ------------------- */
  function createEnvironment(renderer, mode) {
    const envScene = new THREE.Scene();
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(20, 14, 20),
      new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: mode === "day" ? 0x9a8e7a : 0x17100b }));
    envScene.add(room);
    function panel(color, intensity, w, h, x, y, z, ry, rx) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) }));
      m.position.set(x, y, z);
      if (ry) m.rotation.y = ry;
      if (rx) m.rotation.x = rx;
      envScene.add(m);
    }
    if (mode === "day") {
      panel(0xfff6e6, 5.5, 9, 5, 0, 6.8, 0, 0, Math.PI / 2);   // big warm skylight
      panel(0xffe9c8, 2.2, 5, 7, -9.5, 1, 0, Math.PI / 2);     // warm left
      panel(0xdfe8f2, 1.6, 5, 7, 9.5, 1, 0, -Math.PI / 2);     // cool right
      panel(0xffd9b0, 1.2, 8, 4, 0, 1, -9.5, 0);               // back fill
    } else if (mode === "night") {
      panel(0xbcd0f5, 1.1, 7, 4, 0, 6.8, 0, 0, Math.PI / 2);   // cool moon top
      panel(0x8fb4e8, 0.55, 4, 6, -9.5, 1, 0, Math.PI / 2);    // cool left
      panel(0xffb37a, 0.8, 4, 6, 9.5, 1, 0, -Math.PI / 2);     // warm rim right
      panel(0x6a55c2, 0.35, 8, 3, 0, 2, -9.5, 0);              // violet back
    } else { // warm chamber
      panel(0xffe2bd, 3.4, 8, 4.5, 0, 6.8, 0, 0, Math.PI / 2); // ceremonial top
      panel(0xffc99a, 1.5, 4, 6, -9.5, 1, 0, Math.PI / 2);     // amber left
      panel(0xf2b08a, 1.2, 4, 6, 9.5, 1, 0, -Math.PI / 2);     // coral right
      panel(0x3a2a1c, 0.8, 8, 3, 0, 1, 9.5, Math.PI);          // dim front
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
    return env;
  }

  /* ---------- fullscreen pass plumbing -------------------------------- */
  const QUAD_VS = `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  const BRIGHT_FS = `
    uniform sampler2D tInput; uniform float uThreshold; uniform float uKnee;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tInput, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float w = smoothstep(uThreshold, uThreshold + uKnee, l);
      gl_FragColor = vec4(c * w, 1.0);
    }`;

  const BLUR_FS = `
    uniform sampler2D tInput; uniform vec2 uDir; uniform vec2 uTexel;
    varying vec2 vUv;
    void main() {
      vec2 o = uDir * uTexel;
      vec3 s = texture2D(tInput, vUv).rgb * 0.227027;
      s += (texture2D(tInput, vUv + o * 1.3846).rgb + texture2D(tInput, vUv - o * 1.3846).rgb) * 0.3162162;
      s += (texture2D(tInput, vUv + o * 3.2307).rgb + texture2D(tInput, vUv - o * 3.2307).rgb) * 0.0702703;
      gl_FragColor = vec4(s, 1.0);
    }`;

  const COMP_FS = `
    uniform sampler2D tBase; uniform sampler2D tBloomH; uniform sampler2D tBloomQ;
    uniform float uStrengthH; uniform float uStrengthQ;
    uniform float uVignette; uniform float uGrain; uniform float uCA; uniform float uTime;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      // chromatic aberration: radial RGB split on the base plate
      vec2 caOff = c * r2 * uCA;
      vec3 base = vec3(
        texture2D(tBase, vUv + caOff).r,
        texture2D(tBase, vUv).g,
        texture2D(tBase, vUv - caOff).b);
      vec3 col = base
        + texture2D(tBloomH, vUv).rgb * uStrengthH
        + texture2D(tBloomQ, vUv).rgb * uStrengthQ;
      // gentle filmic vignette
      col *= 1.0 - uVignette * smoothstep(0.18, 0.62, r2);
      // deterministic fine grain, time-seeded from the composition clock
      float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime * 13.7) * 71.3) - 0.5;
      col += g * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`;

  function fsQuad(material) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
      -1, -1, 0,  3, -1, 0,  -1, 3, 0]), 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([
      0, 0,  2, 0,  0, 2]), 2));
    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    const scn = new THREE.Scene();
    scn.add(mesh);
    return { scene: scn, mesh };
  }

  function create(renderer, scene, camera, opts) {
    const o = Object.assign({
      threshold: 0.62, knee: 0.25,
      strengthH: 0.85, strengthQ: 0.65,
      vignette: 0.34, grain: 0.035, ca: 0.35,
    }, opts || {});

    const W = 1920, H = 1080;
    const mk = (w, h, samples) => new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, samples: samples || 0,
    });
    const rtBase = mk(W, H, 4);          // MSAA so the RT path keeps edges clean
    const rtH1 = mk(W / 2, H / 2), rtH2 = mk(W / 2, H / 2);
    const rtQ1 = mk(W / 4, H / 4), rtQ2 = mk(W / 4, H / 4);

    const brightMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VS, fragmentShader: BRIGHT_FS, depthTest: false, depthWrite: false,
      uniforms: { tInput: { value: null }, uThreshold: { value: o.threshold }, uKnee: { value: o.knee } },
    });
    const blurMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VS, fragmentShader: BLUR_FS, depthTest: false, depthWrite: false,
      uniforms: { tInput: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uTexel: { value: new THREE.Vector2(2 / W, 2 / H) } },
    });
    const compMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VS, fragmentShader: COMP_FS, depthTest: false, depthWrite: false,
      uniforms: {
        tBase: { value: null }, tBloomH: { value: null }, tBloomQ: { value: null },
        uStrengthH: { value: o.strengthH }, uStrengthQ: { value: o.strengthQ },
        uVignette: { value: o.vignette }, uGrain: { value: o.grain },
        uCA: { value: o.ca }, uTime: { value: 0 },
      },
    });
    const quad = fsQuad(brightMat);

    const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    function run(mat, input, target, texelW, texelH, dirX, dirY) {
      quad.mesh.material = mat;
      if (mat === blurMat) {
        blurMat.uniforms.uDir.value.set(dirX, dirY);
        blurMat.uniforms.uTexel.value.set(1 / texelW, 1 / texelH);
      }
      if (mat.uniforms.tInput) mat.uniforms.tInput.value = input;
      renderer.setRenderTarget(target);
      renderer.render(quad.scene, orthoCam);
    }

    return {
      uniforms: compMat.uniforms,
      bright: brightMat.uniforms,
      render(t) {
        // 1 · scene → base plate
        renderer.setRenderTarget(rtBase);
        renderer.render(scene, camera);
        // 2 · bright pass → half res
        run(brightMat, rtBase.texture, rtH1);
        // 3 · half-res gaussian (tight glow)
        run(blurMat, rtH1.texture, rtH2, W / 2, H / 2, 1, 0);
        run(blurMat, rtH2.texture, rtH1, W / 2, H / 2, 0, 1);
        // 4 · quarter-res gaussian (wide halo)
        run(blurMat, rtH1.texture, rtQ1, W / 4, H / 4, 1, 0);
        run(blurMat, rtQ1.texture, rtQ2, W / 4, H / 4, 0, 1);
        run(blurMat, rtQ2.texture, rtQ1, W / 4, H / 4, 1, 0);
        run(blurMat, rtQ1.texture, rtQ2, W / 4, H / 4, 0, 1);
        // 5 · composite to screen
        compMat.uniforms.tBase.value = rtBase.texture;
        compMat.uniforms.tBloomH.value = rtH1.texture;
        compMat.uniforms.tBloomQ.value = rtQ2.texture;
        compMat.uniforms.uTime.value = t || 0;
        quad.mesh.material = compMat;
        renderer.setRenderTarget(null);
        renderer.render(quad.scene, orthoCam);
      },
    };
  }

  window.CPOST = { createEnvironment, create };
})();
