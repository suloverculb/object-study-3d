import * as THREE from 'three';

const TAU = Math.PI * 2;
const RINGS = 150;
const SEGMENTS = 300;
const LENGTH = 4.9;

const fract = (x) => x - Math.floor(x);
const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = fract(x), fy = fract(y);
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), u), THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
}

// Round the ten corners of a five-pointed star, retaining the thin fins.
export function starOutline(scale = 1) {
  const corners = Array.from({ length: 10 }, (_, i) => {
    const angle = i * Math.PI / 5 + Math.PI / 2;
    const radius = (i % 2 === 0 ? 1.35 : 0.68) * scale * (1 + 0.022 * Math.sin(i * 2.71));
    return new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
  });
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const point = corners[i], before = corners[(i + 9) % 10], after = corners[(i + 1) % 10];
    const rounding = i % 2 === 0 ? 0.07 : 0.19;
    const entry = point.clone().lerp(before, rounding);
    const exit = point.clone().lerp(after, rounding);
    if (i === 0) shape.moveTo(entry.x, entry.y);
    else {
      const previous = shape.currentPoint;
      shape.quadraticCurveTo((previous.x + entry.x) * 0.53, (previous.y + entry.y) * 0.53, entry.x, entry.y);
    }
    shape.quadraticCurveTo(point.x, point.y, exit.x, exit.y);
  }
  shape.closePath();
  return shape;
}

function sliceOutline(scale = 1) {
  const angles = [0.035, -0.035, 0.02, -0.025, 0.018].map((offset, i) => Math.PI / 2 + i * TAU / 5 + offset);
  const lengths = [1.36, 1.25, 1.39, 1.3, 1.34];
  const depths = [0.69, 0.67, 0.65, 0.71, 0.66];
  const capWidths = [0.068, 0.095, 0.075, 0.085, 0.065];
  const bends = [0.06, -0.055, 0.035, 0.085, -0.04];
  const valleyAngles = angles.map((angle, i) => (angle + (i === 4 ? angles[0] + TAU : angles[i + 1])) / 2);
  const valleys = valleyAngles.map((angle, i) => new THREE.Vector2(Math.cos(angle), Math.sin(angle)).multiplyScalar(depths[i]));
  const tangentAt = (angle) => new THREE.Vector2(-Math.sin(angle), Math.cos(angle));
  const profile = new THREE.Shape();
  profile.moveTo(valleys[4].x, valleys[4].y);
  for (let i = 0; i < 5; i++) {
    const direction = new THREE.Vector2(Math.cos(angles[i]), Math.sin(angles[i]));
    const tangent = tangentAt(angles[i]);
    const tip = direction.clone().multiplyScalar(lengths[i]).addScaledVector(tangent, bends[i]);
    const entry = tip.clone().addScaledVector(direction, -0.085).addScaledVector(tangent, -capWidths[i]);
    const exit = tip.clone().addScaledVector(direction, -0.085).addScaledVector(tangent, capWidths[i]);
    const previous = (i + 4) % 5;
    let first = valleys[previous].clone().addScaledVector(tangentAt(valleyAngles[previous]), 0.14);
    let second = entry.clone().addScaledVector(direction, -0.25).addScaledVector(tangent, -0.085);
    profile.bezierCurveTo(first.x, first.y, second.x, second.y, entry.x, entry.y);
    first = entry.clone().addScaledVector(direction, 0.145);
    second = exit.clone().addScaledVector(direction, 0.145);
    profile.bezierCurveTo(first.x, first.y, second.x, second.y, exit.x, exit.y);
    first = exit.clone().addScaledVector(direction, -0.29).addScaledVector(tangent, 0.1);
    second = valleys[i].clone().addScaledVector(tangentAt(valleyAngles[i]), -0.14);
    profile.bezierCurveTo(first.x, first.y, second.x, second.y, valleys[i].x, valleys[i].y);
  }
  profile.closePath();
  // Low-amplitude scalloping changes the silhouette, including the rind.
  const points = profile.getSpacedPoints(720).slice(0, -1).map((point, i) => {
    const arc = i / 720 * TAU;
    const ripple = 1 + 0.006 * Math.sin(arc * 19) + 0.004 * Math.sin(arc * 31 + 0.8) + 0.003 * Math.sin(arc * 47 - 0.9);
    return point.multiplyScalar(scale * ripple);
  });
  const shape = new THREE.Shape(points);
  shape.closePath();
  return shape;
}

function sliceWarp(x, y) {
  const radius = Math.hypot(x, y), angle = Math.atan2(y, x);
  return radius * radius * (0.045 * Math.sin(angle * 3 + 0.7) + 0.018 * Math.cos(angle * 5 - 0.2));
}

function skinTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 1024;
  const context = canvas.getContext('2d');
  const image = context.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const coarse = noise(x / 12, y / 20);
      const fine = noise(x / 3.3, y / 5.3);
      const wrinkle = Math.sin(y * 0.15 + noise(x / 19, y / 22) * 13) * 0.008;
      const value = Math.round((0.35 + coarse * 0.13 + fine * 0.24 + hash(x, y) * 0.16 + wrinkle) * 255);
      const offset = (y * canvas.width + x) * 4;
      image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function addPigment(material, flesh = false) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFruitPosition;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFruitPosition = position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vFruitPosition;
      float fruitHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float fruitNoise(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(fruitHash(i), fruitHash(i + vec3(1,0,0)), f.x), mix(fruitHash(i + vec3(0,1,0)), fruitHash(i + vec3(1,1,0)), f.x), f.y), mix(mix(fruitHash(i + vec3(0,0,1)), fruitHash(i + vec3(1,0,1)), f.x), mix(fruitHash(i + vec3(0,1,1)), fruitHash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float pigment = fruitNoise(vFruitPosition * vec3(11.0, 6.0, 11.0));
      float tinyPigment = fruitNoise(vFruitPosition * 70.0);
      diffuseColor.rgb *= ${flesh ? '0.96 + 0.06 * pigment + 0.01 * tinyPigment' : '0.88 + 0.19 * pigment + 0.045 * tinyPigment'};
      ${flesh ? `
        vec2 pulp = vFruitPosition.xy;
        float radius = length(pulp);
        float angle = atan(pulp.y, pulp.x) - 1.5707963;
        float angleToLobe = abs(atan(sin(angle * 5.0), cos(angle * 5.0))) / 5.0;
        float fiberNoise = fruitNoise(vec3(pulp * 19.0, 2.7));
        float acrossFiber = radius * sin(angleToLobe) + (fiberNoise - 0.5) * 0.024 * smoothstep(0.04, 0.25, radius);
        float fiberWidth = (0.022 + 0.052 * exp(-radius * 2.7)) * (0.38 + fiberNoise * 1.2);
        float fibers = exp(-pow(acrossFiber / fiberWidth, 2.0)) * exp(-radius * 1.25);
        fibers *= 0.55 + 0.45 * fruitNoise(vec3(pulp * 38.0, 5.2));
        float whiteCore = exp(-radius * 16.0);
        float paleLobes = exp(-pow(angleToLobe / 0.23, 2.0)) * exp(-radius * 1.8);
        float whitening = clamp(whiteCore * 0.78 + fibers * 0.50 + paleLobes * 0.22, 0.0, 0.95);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.98, 0.95, 0.79), whitening);
      ` : ''}
    `);
    if (flesh) {
      // The dense central fibers scatter more light than the juicy lobes.
      shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_fragment>', THREE.ShaderChunk.transmission_fragment.replace(
        'material.transmission = transmission;',
        'material.transmission = transmission * (1.0 - whitening * 0.65);',
      ));
    }
  };
  material.customProgramCacheKey = () => flesh ? 'starfruit-flesh-v4' : 'starfruit-skin-v1';
}

function pulpTextures() {
  const size = 1024;
  const colorData = new Uint8Array(size * size * 4);
  const surfaceData = new Uint8Array(size * size * 4);
  const wetnessData = new Uint8Array(size * size * 4);
  const normalData = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);
  const grid = 156;
  const seeds = new Float32Array(grid * grid * 3);
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const offset = (y * grid + x) * 3;
      seeds[offset] = x + 0.12 + hash(x, y) * 0.76;
      seeds[offset + 1] = y + 0.12 + hash(x + 31, y + 17) * 0.76;
      seeds[offset + 2] = hash(x + 13, y - 29);
    }
  }
  // Cell boundaries shape the juice menisci. Keep pigment subtle: most of the
  // texture comes from light reflecting off moist, differently tilted cells.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = 2 + x / (size - 1) * 130 + noise(x / 90, y / 90) * 0.6;
      const v = 2 + y / (size - 1) * 146 + noise(x / 90 + 19, y / 90 + 7) * 0.6;
      const gx = Math.floor(u), gy = Math.floor(v);
      let first = Infinity, second = Infinity, tint = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const seed = ((gy + dy) * grid + gx + dx) * 3;
          const distance = (u - seeds[seed]) ** 2 + (v - seeds[seed + 1]) ** 2;
          if (distance < first) {
            second = first; first = distance; tint = seeds[seed + 2];
          } else if (distance < second) second = distance;
        }
      }
      const edge = 1 - THREE.MathUtils.smoothstep(Math.sqrt(second) - Math.sqrt(first), 0.015, 0.1);
      const grain = noise(x * 0.24, y * 0.24);
      const cloud = noise(x / 70, y / 70);
      const shade = Math.min(1, 0.94 + tint * 0.028 + edge * 0.012 + (cloud - 0.5) * 0.025);
      const height = 0.35 + tint * 0.055 + Math.exp(-first * 2.7) * 0.19 - edge * 0.06 + grain * 0.035;
      const roughness = 0.65 + tint * 0.25 - edge * 0.08 + cloud * 0.05;
      const wetness = 0.74 + tint * 0.16 + edge * 0.06;
      const offset = (y * size + x) * 4;
      heights[y * size + x] = height;
      colorData[offset] = Math.round(shade * 255);
      colorData[offset + 1] = Math.round(shade * (0.99 + cloud * 0.01) * 255);
      colorData[offset + 2] = Math.round(shade * (0.96 + cloud * 0.025) * 255);
      colorData[offset + 3] = 255;
      // Red is film coverage; green is the underlying pulp roughness.
      surfaceData[offset] = Math.round((0.28 + THREE.MathUtils.smoothstep(tint * 0.6 + cloud * 0.4, 0.3, 0.75) * 0.66) * 255);
      surfaceData[offset + 1] = Math.round(roughness * 255);
      surfaceData[offset + 3] = 255;
      // Red controls translucency; green controls the juice film's
      // local gloss. These highlights respond to lighting, never painted dots.
      wetnessData[offset] = Math.round(wetness * 255);
      wetnessData[offset + 1] = Math.round((0.5 + tint * 0.34 + grain * 0.12) * 255);
      wetnessData[offset + 3] = 255;
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const left = heights[y * size + Math.max(0, x - 1)];
      const right = heights[y * size + Math.min(size - 1, x + 1)];
      const below = heights[Math.max(0, y - 1) * size + x];
      const above = heights[Math.min(size - 1, y + 1) * size + x];
      const nx = (left - right) * 6, ny = (below - above) * 6;
      const inverseLength = 1 / Math.hypot(nx, ny, 1);
      const offset = (y * size + x) * 4;
      normalData[offset] = Math.round((nx * inverseLength * 0.5 + 0.5) * 255);
      normalData[offset + 1] = Math.round((ny * inverseLength * 0.5 + 0.5) * 255);
      normalData[offset + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255);
      normalData[offset + 3] = 255;
    }
  }
  const makeTexture = (data, colorSpace = THREE.NoColorSpace) => {
    const texture = new THREE.DataTexture(data, size, size);
    texture.colorSpace = colorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  };
  return {
    color: makeTexture(colorData, THREE.SRGBColorSpace),
    surface: makeTexture(surfaceData),
    wetness: makeTexture(wetnessData),
    normal: makeTexture(normalData),
  };
}

function createFleshGeometry() {
  const segments = 300, rings = 64;
  const outline = sliceOutline(0.978).getSpacedPoints(segments);
  const positions = [], uvs = [], indices = [];
  const outerRings = [];
  for (const side of [1, -1]) {
    const center = positions.length / 3;
    positions.push(0, 0, side * 0.185);
    uvs.push(0.5, 0.5);
    const firstRing = center + 1;
    const triangle = (a, b, c) => side === 1 ? indices.push(a, b, c) : indices.push(a, c, b);
    for (let ring = 1; ring <= rings; ring++) {
      const fraction = ring / rings;
      for (let i = 0; i < segments; i++) {
        const x = outline[i].x * fraction, y = outline[i].y * fraction;
        const taper = 1 - THREE.MathUtils.smoothstep(fraction, 0.82, 1);
        let relief = (noise(x * 11 + 9, y * 11 + 23) - 0.5) * 0.01;
        relief += (noise(x * 29 + 31, y * 29 + 5) - 0.5) * 0.003;
        relief += 0.004 * (1 - fraction);
        for (let k = 0; k < 5; k++) {
          const angle = k * TAU / 5 + Math.PI / 2;
          const along = x * Math.cos(angle) + y * Math.sin(angle) - 0.22;
          const across = -x * Math.sin(angle) + y * Math.cos(angle);
          relief -= 0.009 * Math.exp(-(along * along / 0.018 + across * across / 0.002));
        }
        positions.push(x, y, side * (0.182 + relief * taper) + sliceWarp(x, y));
        // Explicit planar UVs keep the flesh cells at the intended visible size.
        uvs.push(x / 2.7 + 0.5, y / 2.7 + 0.5);
        const current = firstRing + (ring - 1) * segments + i;
        const next = firstRing + (ring - 1) * segments + (i + 1) % segments;
        if (ring === 1) triangle(center, current, next);
        else {
          const inner = current - segments, innerNext = next - segments;
          triangle(inner, current, next);
          triangle(inner, next, innerNext);
        }
      }
    }
    outerRings.push(firstRing + (rings - 1) * segments);
  }
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const front = outerRings[0] + i, frontNext = outerRings[0] + next;
    const back = outerRings[1] + i, backNext = outerRings[1] + next;
    indices.push(front, back, frontNext, frontNext, back, backNext);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createWholeGeometry() {
  const contour = starOutline().getSpacedPoints(SEGMENTS);
  const positions = [], uvs = [], indices = [], metadata = [];
  for (let j = 0; j <= RINGS; j++) {
    const t = j / RINGS;
    const profile = Math.pow(Math.sin(Math.PI * t), 0.57) * (1 + 0.055 * Math.sin(Math.PI * t * 2));
    const y = (t - 0.5) * LENGTH;
    const bend = Math.sin(Math.PI * t) * 0.065;
    for (let i = 0; i <= SEGMENTS; i++) {
      const point = contour[i];
      const angle = Math.atan2(point.y, point.x);
      const ridge = THREE.MathUtils.smoothstep(point.length(), 1.08, 1.32);
      const organic = 1 + 0.009 * Math.sin(t * 47 + angle * 3) + 0.005 * Math.sin(t * 117 + angle * 9);
      // Both poles share a single location so the loft closes cleanly.
      const radiusScale = j === 0 || j === RINGS ? 0 : profile * organic;
      positions.push(point.x * radiusScale + bend, y, point.y * radiusScale);
      uvs.push(i / SEGMENTS, t);
      metadata.push(ridge, t, noise(point.x * 5 + 10, t * 13));
      if (j < RINGS && i < SEGMENTS) {
        const a = j * (SEGMENTS + 1) + i, b = a + SEGMENTS + 1;
        // The contour is counterclockwise when viewed along the fruit axis.
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Average the duplicated UV seam normals to remove a visible lighting seam.
  const normals = geometry.attributes.normal;
  for (let j = 1; j < RINGS; j++) {
    const first = j * (SEGMENTS + 1), last = first + SEGMENTS;
    const normal = new THREE.Vector3().fromBufferAttribute(normals, first).add(new THREE.Vector3().fromBufferAttribute(normals, last)).normalize();
    normals.setXYZ(first, normal.x, normal.y, normal.z);
    normals.setXYZ(last, normal.x, normal.y, normal.z);
  }
  geometry.userData.pigment = metadata;
  return geometry;
}

export function createStarfruit() {
  const whole = new THREE.Group();
  const skin = skinTexture();
  const material = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, metalness: 0, clearcoat: 0.65, clearcoatRoughness: 0.32, bumpMap: skin, bumpScale: 0.012, ior: 1.42 });
  addPigment(material);
  const geometry = createWholeGeometry();
  const fruit = new THREE.Mesh(geometry, material);
  fruit.castShadow = true;
  whole.add(fruit);

  const stemPath = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 2.4, 0), new THREE.Vector3(0.015, 2.51, 0.005), new THREE.Vector3(0.05, 2.58, -0.015)]);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(stemPath, 12, 0.043, 8, false), new THREE.MeshStandardMaterial({ color: '#68713b', roughness: 0.92 }));
  stem.castShadow = true;
  whole.add(stem);
  const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), new THREE.MeshStandardMaterial({ color: '#775025', roughness: 0.9 }));
  blossom.position.y = -LENGTH / 2 + 0.015;
  blossom.scale.set(1, 0.6, 1);
  whole.add(blossom);
  whole.rotation.set(0.16, 0.12, 0.78);
  whole.rotateY(0.48);

  const slice = new THREE.Group();
  const rindOutline = sliceOutline();
  const rindHole = new THREE.Path(sliceOutline(0.96).getPoints(24).reverse());
  rindHole.closePath();
  rindOutline.holes.push(rindHole);
  // A hollow rind avoids burying the irregular flesh under a flat peel cap.
  const peelGeometry = new THREE.ExtrudeGeometry(rindOutline, { depth: 0.33, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.008, bevelThickness: 0.012, curveSegments: 12 });
  peelGeometry.translate(0, 0, -0.165);
  const rindPositions = peelGeometry.attributes.position;
  for (let i = 0; i < rindPositions.count; i++) {
    rindPositions.setZ(i, rindPositions.getZ(i) + sliceWarp(rindPositions.getX(i), rindPositions.getY(i)));
  }
  peelGeometry.computeVertexNormals();
  const peelMaterial = new THREE.MeshPhysicalMaterial({ color: '#a2ad3e', roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4, bumpMap: skin, bumpScale: 0.006 });
  const peel = new THREE.Mesh(peelGeometry, peelMaterial);
  peel.castShadow = true;
  slice.add(peel);
  const pulp = pulpTextures();
  const fleshMaterial = new THREE.MeshPhysicalMaterial({
    color: '#f5d660', map: pulp.color,
    roughness: 0.4, roughnessMap: pulp.surface,
    normalMap: pulp.normal, normalScale: new THREE.Vector2(0.48, 0.48),
    clearcoat: 0.7, clearcoatMap: pulp.surface,
    clearcoatRoughness: 0.22, clearcoatRoughnessMap: pulp.wetness,
    clearcoatNormalMap: pulp.normal, clearcoatNormalScale: new THREE.Vector2(0.9, 0.9),
    specularIntensity: 1, transmission: 0.48, transmissionMap: pulp.wetness,
    thickness: 0.4, attenuationColor: '#ffe091', attenuationDistance: 0.9,
    ior: 1.34,
  });
  addPigment(fleshMaterial, true);
  const fleshGeometry = createFleshGeometry();
  const flesh = new THREE.Mesh(fleshGeometry, fleshMaterial);
  slice.add(flesh);
  const chamberMaterial = new THREE.MeshPhysicalMaterial({ color: '#dba946', transparent: true, opacity: 0.26, roughness: 0.4, depthWrite: false });
  const seedMaterial = new THREE.MeshPhysicalMaterial({ color: '#66331b', roughness: 0.45, clearcoat: 0.45 });
  for (const side of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const angle = k * TAU / 5 + Math.PI / 2;
      const chamber = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), chamberMaterial);
      chamber.scale.set(0.037, 0.127, 0.005);
      chamber.position.set(Math.cos(angle) * 0.22, Math.sin(angle) * 0.22, side * 0.198);
      chamber.position.z += sliceWarp(chamber.position.x, chamber.position.y);
      chamber.rotation.z = angle - Math.PI / 2;
      slice.add(chamber);
      // A real cut rarely exposes a complete, perfectly regular ring of seeds.
      if (k === 3) {
        const seed = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), seedMaterial);
        seed.scale.set(0.033, 0.085, 0.012);
        seed.position.set(Math.cos(angle) * 0.27, Math.sin(angle) * 0.27, side * 0.205);
        seed.position.z += sliceWarp(seed.position.x, seed.position.y);
        seed.rotation.z = angle - Math.PI / 2 + 0.13;
        slice.add(seed);
      }
    }
  }
  slice.scale.setScalar(1.72);
  slice.rotation.set(-0.16, 0.08, -0.1);
  slice.visible = false;

  const green = new THREE.Color('#a6bd35'), ripe = new THREE.Color('#ec9100');
  const greenRidge = new THREE.Color('#60852c'), ripeRidge = new THREE.Color('#7e912b');
  const tip = new THREE.Color('#83913a');
  function setRipeness(value) {
    const base = green.clone().lerp(ripe, value);
    const ridgeColor = greenRidge.clone().lerp(ripeRidge, value);
    const colors = geometry.attributes.color;
    const data = geometry.userData.pigment;
    const color = new THREE.Color();
    for (let i = 0; i < colors.count; i++) {
      const ridge = data[i * 3], t = data[i * 3 + 1], n = data[i * 3 + 2];
      const end = Math.pow(Math.abs(t * 2 - 1), 12) * 0.55;
      color.copy(base).multiplyScalar(0.94 + n * 0.12).lerp(ridgeColor, ridge * 0.94).lerp(tip, end);
      colors.setXYZ(i, color.r, color.g, color.b);
    }
    colors.needsUpdate = true;
    peelMaterial.color.copy(ridgeColor).lerp(base, 0.56);
    fleshMaterial.color.set('#dce19b').lerp(new THREE.Color('#f2c243'), value);
  }
  setRipeness(0.72);
  return { whole, slice, setRipeness };
}
