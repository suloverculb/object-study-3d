import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createStarfruit } from './fruit.js';
import './style.css';

const container = document.getElementById('scene');
const loading = document.getElementById('loading');

function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xf4f3eb, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  const homePosition = new THREE.Vector3(4.6, 2.7, 8.4);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 6.5;
  controls.maxDistance = 20;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.65;
  controls.target.set(0, 0.05, 0);
  camera.position.copy(homePosition);
  controls.update();
  controls.saveState();

  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, 0.025);
  scene.environment = environmentMap.texture;
  scene.environmentIntensity = 0.65;
  environment.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfffbe9, 0x858d64, 0.9));

  const key = new THREE.DirectionalLight(0xfff2d4, 2.5);
  key.position.set(-3.8, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xf5ffde, 1.5);
  rim.position.set(4, 3, -5);
  scene.add(rim);

  const fruit = createStarfruit();
  scene.add(fruit.whole, fruit.slice);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  const gradient = shadowContext.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(72, 68, 35, 0.19)');
  gradient.addColorStop(0.4, 'rgba(72, 68, 35, 0.10)');
  gradient.addColorStop(1, 'rgba(72, 68, 35, 0)');
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.15, -2.69, 0);
  scene.add(shadow);

  const rotateButton = document.getElementById('rotate');
  const viewCaption = document.getElementById('view-caption');
  let currentView = 'whole';
  const setAutoRotate = (enabled) => {
    controls.autoRotate = enabled;
    rotateButton.setAttribute('aria-pressed', String(enabled));
    rotateButton.setAttribute('aria-label', enabled ? '暫停自動旋轉' : '開始自動旋轉');
    rotateButton.title = enabled ? '暫停自動旋轉' : '自動旋轉';
    rotateButton.querySelector('span').textContent = enabled ? '暫停旋轉' : '自動旋轉';
  };
  rotateButton.addEventListener('click', () => setAutoRotate(!controls.autoRotate));
  controls.addEventListener('start', () => setAutoRotate(false));

  function resetView() {
    setAutoRotate(false);
    controls.reset();
    if (currentView === 'slice') {
      camera.position.set(3.8, 3.0, 9.0);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }
  document.getElementById('reset').addEventListener('click', resetView);
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      currentView = button.dataset.view;
      fruit.whole.visible = currentView === 'whole';
      fruit.slice.visible = currentView === 'slice';
      document.querySelectorAll('[data-view]').forEach((option) => {
        const selected = option === button;
        option.classList.toggle('active', selected);
        option.setAttribute('aria-pressed', String(selected));
      });
      viewCaption.innerHTML = currentView === 'whole' ? '完整果實 <span>01 / 02</span>' : '星形切面 <span>02 / 02</span>';
      container.setAttribute('aria-label', currentView === 'whole' ? '金黃色五稜立體楊桃，可拖曳旋轉及滾輪縮放' : '有果皮與種子的五角星形楊桃切片，可拖曳旋轉及滾輪縮放');
      resetView();
    });
  });

  const ripeness = document.getElementById('ripeness');
  ripeness.addEventListener('input', () => {
    const value = Number(ripeness.value) / 100;
    fruit.setRipeness(value);
    document.getElementById('ripeness-value').textContent = value < 0.33 ? '青綠' : value < 0.65 ? '青黃' : value < 0.86 ? '金黃' : '熟黃';
  });

  // Keyboard rotation and zoom offer the same interaction without a pointer.
  container.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0'].includes(event.key)) return;
    event.preventDefault();
    setAutoRotate(false);
    if (event.key === '0') { resetView(); return; }
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (event.key === 'ArrowLeft') spherical.theta -= 0.12;
    if (event.key === 'ArrowRight') spherical.theta += 0.12;
    if (event.key === 'ArrowUp') spherical.phi -= 0.12;
    if (event.key === 'ArrowDown') spherical.phi += 0.12;
    if (event.key === '+' || event.key === '=') spherical.radius *= 0.9;
    if (event.key === '-') spherical.radius *= 1.1;
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
    spherical.makeSafe();
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    controls.update();
  });

  function resize() {
    const width = container.clientWidth, height = container.clientHeight;
    camera.aspect = width / height;
    // Keep the complete specimen inside narrow portrait canvases.
    camera.fov = width / height < 0.85 ? 43 : 32;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);
    if (document.hidden || contextLost) return;
    controls.update(delta);
    renderer.render(scene, camera);
  });
  let contextLost = false;
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextLost = true;
    loading.textContent = '3D 畫面暫時中斷，正在等待恢復…';
    loading.hidden = false;
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    loading.hidden = true;
  });
  if (matchMedia('(pointer: coarse)').matches) {
    document.querySelector('#interaction-hint span').textContent = '單指旋轉 · 雙指縮放';
  }
  renderer.render(scene, camera);
  loading.hidden = true;
  container.dataset.ready = 'true';
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    renderer.setAnimationLoop(null);
    observer.disconnect();
    controls.dispose();
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of [object.material].flat().filter(Boolean)) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    environmentMap.dispose();
    renderer.dispose();
  }, { once: true });
}

try {
  init();
} catch (error) {
  console.error('Unable to initialize the starfruit viewer:', error);
  loading.hidden = false;
  loading.classList.add('error');
  loading.textContent = '無法啟動 3D 畫面。請確認瀏覽器已開啟硬體加速，並使用支援 WebGL 2 的瀏覽器。';
}
