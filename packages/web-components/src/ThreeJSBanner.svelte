<svelte:options customElement="ad-banner-3d" />

<script>
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';

  // Props
  export let brandName = 'Your Brand';
  export let ctaText = 'Learn More';
  export let ctaUrl = '#';
  export let modelType = 'cube';
  export let particleCount = 150;

  let container;
  let canvas;
  let scene, camera, renderer;
  let particles, model, logoText, decorativeRings;
  let animationId;
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let scrollY = 0;

  onMount(() => {
    initThreeJS();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
  });

  onDestroy(() => {
    cleanup();
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleResize);
  });

  function initThreeJS() {
    const width = container.clientWidth;
    const height = 320;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvas.appendChild(renderer.domElement);

    // Enhanced Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x6366f1, 2, 10);
    pointLight1.position.set(-3, 2, 3);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x8b5cf6, 2, 10);
    pointLight2.position.set(3, -2, 3);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x06b6d4, 1.5, 10);
    pointLight3.position.set(0, 0, 5);
    scene.add(pointLight3);

    // Create particles
    createParticles();

    // Create 3D model
    createModel();

    // Create 3D logo branding
    createLogo();

    // Create decorative rings
    createDecorativeRings();

    // Add event listeners
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
    renderer.domElement.addEventListener('click', onModelClick);

    // Start animation
    animate();
  }

  function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      colors[i * 3] = Math.random() * 0.5 + 0.5;
      colors[i * 3 + 1] = Math.random() * 0.5 + 0.5;
      colors[i * 3 + 2] = Math.random() * 0.5 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
  }

  function createModel() {
    let geometry;
    
    switch (modelType) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(1, 32, 32);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(0.8, 0.3, 16, 100);
        break;
      case 'cube':
      default:
        geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    }

    const material = new THREE.MeshPhongMaterial({
      color: 0x6366f1,
      shininess: 100,
      specular: 0x444444,
      emissive: 0x1a1a3e,
      emissiveIntensity: 0.2
    });

    model = new THREE.Mesh(geometry, material);
    scene.add(model);
  }

  function createLogo() {
    // Create 3D text logo using geometry shapes (since we don't have font loader)
    const logoGroup = new THREE.Group();

    // Create "3D" text using boxes
    const textMaterial = new THREE.MeshPhongMaterial({
      color: 0x06b6d4,
      shininess: 150,
      specular: 0xffffff,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.3
    });

    // "3" shape
    const threeGroup = new THREE.Group();
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.15), textMaterial);
    bar1.position.set(-0.3, 0.2, 0);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.15), textMaterial);
    bar2.position.set(0, 0.5, 0);
    const bar3 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.15), textMaterial);
    bar3.position.set(0, -0.1, 0);
    threeGroup.add(bar1, bar2, bar3);

    // "D" shape
    const dGroup = new THREE.Group();
    const dVertical = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.15), textMaterial);
    dVertical.position.set(0.4, 0, 0);
    const dTop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.15), textMaterial);
    dTop.position.set(0.65, 0.35, 0);
    const dBottom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.15), textMaterial);
    dBottom.position.set(0.65, -0.35, 0);
    const dRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.15), textMaterial);
    dRight.position.set(0.9, 0, 0);
    dGroup.add(dVertical, dTop, dBottom, dRight);

    threeGroup.position.set(-1.5, 0, 0);
    dGroup.position.set(0.5, 0, 0);

    logoGroup.add(threeGroup, dGroup);
    logoGroup.position.set(0, 1.8, -2);
    logoGroup.scale.set(0.5, 0.5, 0.5);

    logoText = logoGroup;
    scene.add(logoText);
  }

  function createDecorativeRings() {
    decorativeRings = new THREE.Group();

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });

    // Create multiple rings
    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.TorusGeometry(2 + i * 0.5, 0.05, 8, 64);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.userData = { rotationSpeed: 0.002 * (i + 1) };
      decorativeRings.add(ring);
    }

    scene.add(decorativeRings);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    // Rotate particles slowly
    if (particles) {
      particles.rotation.y += 0.001;
      particles.rotation.x += 0.0005;
    }

    // Idle rotation for model
    if (model && !isDragging) {
      model.rotation.y += 0.005;
      model.rotation.x += 0.002;
    }

    // Animate logo
    if (logoText) {
      logoText.rotation.y += 0.01;
      logoText.position.y = 1.8 + Math.sin(Date.now() * 0.002) * 0.1;
    }

    // Animate decorative rings
    if (decorativeRings) {
      decorativeRings.children.forEach((ring, index) => {
        ring.rotation.z += ring.userData.rotationSpeed;
        ring.rotation.x = Math.PI / 2 + Math.sin(Date.now() * 0.001 + index) * 0.2;
      });
    }

    // Scroll effect
    camera.position.y = scrollY * 0.001;

    renderer.render(scene, camera);
  }

  function handleScroll() {
    scrollY = window.scrollY;
  }

  function handleResize() {
    if (!container || !camera || !renderer) return;
    
    const width = container.clientWidth;
    const height = 320;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function onMouseDown(event) {
    isDragging = true;
    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }

  function onMouseMove(event) {
    // Particle interaction with mouse
    if (particles) {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      particles.rotation.x += mouseY * 0.01;
      particles.rotation.y += mouseX * 0.01;
    }

    // Drag rotation for model
    if (isDragging && model) {
      const deltaX = event.clientX - previousMousePosition.x;
      const deltaY = event.clientY - previousMousePosition.y;

      model.rotation.y += deltaX * 0.01;
      model.rotation.x += deltaY * 0.01;

      previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    }
  }

  function onMouseUp() {
    isDragging = false;
  }

  function onModelClick() {
    if (model) {
      // Scale animation on click
      const originalScale = model.scale.x;
      model.scale.set(originalScale * 1.2, originalScale * 1.2, originalScale * 1.2);
      
      setTimeout(() => {
        model.scale.set(originalScale, originalScale, originalScale);
      }, 200);
    }
  }

  function cleanup() {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    
    if (renderer) {
      renderer.dispose();
    }
    
    if (particles) {
      particles.geometry.dispose();
      particles.material.dispose();
    }
    
    if (model) {
      model.geometry.dispose();
      model.material.dispose();
    }

    if (logoText) {
      logoText.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material) {
            child.material.dispose();
          }
        }
      });
    }

    if (decorativeRings) {
      decorativeRings.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material) {
            child.material.dispose();
          }
        }
      });
    }
  }
</script>

<div class="ad-banner-3d-container" bind:this={container}>
  <div class="canvas-container" bind:this={canvas}></div>
  <div class="overlay">
    <h2 class="brand-name">{brandName}</h2>
    <a href={ctaUrl} class="cta-button" target="_blank" rel="noopener noreferrer">
      {ctaText}
    </a>
  </div>
</div>

<style>
  .ad-banner-3d-container {
    position: relative;
    width: 100%;
    height: 320px;
    border-radius: 12px;
    overflow: hidden;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .canvas-container {
    width: 100%;
    height: 100%;
  }

  .canvas-container :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
    cursor: grab;
  }

  .canvas-container :global(canvas):active {
    cursor: grabbing;
  }

  .overlay {
    position: absolute;
    bottom: 20px;
    left: 20px;
    right: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    pointer-events: none;
  }

  .brand-name {
    font-size: 24px;
    font-weight: bold;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    margin: 0;
  }

  .cta-button {
    pointer-events: auto;
    padding: 10px 24px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }

  .cta-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.6);
  }

  .cta-button:active {
    transform: translateY(0);
  }
</style>
