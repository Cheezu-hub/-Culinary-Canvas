import * as THREE from 'three';

/**
 * Initializes a 3D animated particle background using Three.js.
 * Includes mouse tracking and wavy animation.
 */
export function initThreeJSBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  // Very dark background matching --primary-bg-dark
  scene.background = new THREE.Color('#1a1a1a');

  // Add subtle fog to blend points into the distance
  scene.fog = new THREE.FogExp2('#1a1a1a', 0.0015);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.z = 400;
  camera.position.y = 150;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Create particles
  const particleCount = 2000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const colorOrange = new THREE.Color('#e76f51');
  const colorGold = new THREE.Color('#ffc107');

  for (let i = 0; i < particleCount; i++) {
    // Spread widely
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 500;
    const z = (Math.random() - 0.5) * 2000;
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Mix orange and gold
    const mixedColor = colorOrange.clone().lerp(colorGold, Math.random());
    colors[i * 3] = mixedColor.r;
    colors[i * 3 + 1] = mixedColor.g;
    colors[i * 3 + 2] = mixedColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Load a simple circular texture programmatically
  const createCircleTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.beginPath();
    context.arc(32, 32, 28, 0, Math.PI * 2, false);
    context.fillStyle = 'white';
    context.fill();
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  const material = new THREE.PointsMaterial({
    size: 6,
    vertexColors: true,
    map: createCircleTexture(),
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // Mouse interaction
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  const windowHalfX = window.innerWidth / 2;
  const windowHalfY = window.innerHeight / 2;

  document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
  });

  // Animation Loop
  let time = 0;
  function animate() {
    requestAnimationFrame(animate);

    time += 0.001;

    // Smooth camera movement towards mouse
    targetX = mouseX * 0.5;
    targetY = mouseY * 0.5;
    
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (-targetY + 150 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    // Wavy motion for particles
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        // Apply a sine wave based on x and z position
        const x = positions[i3];
        const z = positions[i3 + 2];
        positions[i3 + 1] += Math.sin(time * 2 + x * 0.005) * 0.5;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    // Rotate the whole system slowly
    particles.rotation.y += 0.001;

    renderer.render(scene, camera);
  }

  animate();

  // Handle Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
