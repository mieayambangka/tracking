/**
 * =============================================
 * GESTURE DETECTOR — Main Application
 * =============================================
 * Handles the user-triggered webcam, MediaPipe
 * Hands, gesture recognition loop, and effects.
 */

(function () {
  'use strict';

  // ============================================
  // DOM Elements
  // ============================================
  const videoEl = document.getElementById('webcam');
  const canvasEl = document.getElementById('overlay-canvas');
  const canvasCtx = canvasEl.getContext('2d');
  const cameraSection = document.querySelector('.camera-section');
  const cameraPlaceholder = document.getElementById('camera-placeholder');
  const cameraPlaceholderTitle = document.getElementById('camera-placeholder-title');
  const cameraPlaceholderCopy = document.getElementById('camera-placeholder-copy');
  const cameraStartButtons = document.querySelectorAll('[data-start-camera]');

  const gestureLabel = document.getElementById('gesture-label');
  const gestureIconEl = document.getElementById('gesture-icon');
  const gestureName = document.getElementById('gesture-name');

  const effectOverlay = document.getElementById('effect-overlay');
  const effectImage = document.getElementById('effect-image');
  const effectTenor = document.getElementById('effect-tenor');
  const effectTitle = document.getElementById('effect-title');

  const statusDot = document.querySelector('.status-dot');
  const statusText = document.getElementById('status-text');
  const statusIndicator = document.getElementById('status-indicator');
  const gestureListEl = document.getElementById('gesture-list');

  // ============================================
  // State
  // ============================================
  let currentGesture = null;
  let gestureStartTime = 0;
  let effectShowing = false;
  let lastDetectedGesture = null;
  let cameraStarted = false;
  let cameraStarting = false;

  const HOLD_DURATION = 800;     // ms to hold gesture before triggering
  const EFFECT_DURATION = 5000;  // ms to show gesture reactions
  const COOLDOWN = 1500;         // ms cooldown after effect dismisses

  let cooldownActive = false;
  let tenorEmbedLoad = null;

  const gestureIconPaths = {
    'Thumbs Up': '<path d="M19 22v-6l6-8a3 3 0 0 1 5 3l-1 6h6a4 4 0 0 1 4 5l-3 11a5 5 0 0 1-5 4H20a4 4 0 0 1-4-4v-7a4 4 0 0 1 3-4Z"/><path d="M16 22h-6v15h6"/>',
    Peace: '<path d="M16 23V10a3 3 0 0 1 6 0v11V7a3 3 0 0 1 6 0v14V12a3 3 0 0 1 6 0v13l3-3a3 3 0 0 1 5 3l-5 12a8 8 0 0 1-7 5h-3a10 10 0 0 1-8-4l-6-8a3 3 0 0 1 5-4Z"/>',
    'Open Palm': '<path d="M12 23V12a3 3 0 0 1 6 0v9V7a3 3 0 0 1 6 0v14V5a3 3 0 0 1 6 0v16V9a3 3 0 0 1 6 0v16l2-4a3 3 0 0 1 6 2l-4 12a9 9 0 0 1-9 6h-3a11 11 0 0 1-9-5l-7-8a3 3 0 0 1 5-4l3 3Z"/>',
    'Middle Finger': '<path d="M13 25v-7a3 3 0 0 1 5-2l1 1V5a3 3 0 0 1 6 0v15l1-2a3 3 0 0 1 5 1l2-1a3 3 0 0 1 4 3l-2 10a8 8 0 0 1-8 7h-5a8 8 0 0 1-7-4l-4-7a3 3 0 0 1 5-3l2 2"/>',
  };

  function getGestureIcon(name) {
    const paths = gestureIconPaths[name] || gestureIconPaths['Open Palm'];
    return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
  }

  function scrollToCamera() {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
    cameraSection.scrollIntoView({ behavior, block: 'center' });
  }

  // ============================================
  // Build gesture guide sidebar
  // ============================================
  function buildGestureGuide() {
    GESTURES.forEach((gesture, index) => {
      const card = document.createElement('div');
      card.className = 'gesture-card';
      card.id = `gesture-card-${index}`;
      card.innerHTML = `
        <div class="gesture-card-icon">${getGestureIcon(gesture.name)}</div>
        <div class="gesture-card-info">
          <div class="gesture-card-name">${gesture.name}</div>
          <div class="gesture-card-desc">${gesture.description}</div>
        </div>
      `;
      gestureListEl.appendChild(card);
    });
  }

  // ============================================
  // Effect display
  // ============================================
  function loadTenorEmbed() {
    if (tenorEmbedLoad) return tenorEmbedLoad;

    tenorEmbedLoad = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://tenor.com/embed.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        tenorEmbedLoad = null;
        reject(new Error('Failed to load the Tenor embed script.'));
      };
      document.body.appendChild(script);
    });

    return tenorEmbedLoad;
  }

  function showEffect(gesture) {
    if (effectShowing || cooldownActive) return;

    effectShowing = true;
    const isThumbsUp = gesture.name === 'Thumbs Up';
    effectImage.src = gesture.image;
    effectImage.alt = `${gesture.name} visual effect`;
    effectImage.classList.toggle('hidden', isThumbsUp);
    effectTenor.classList.toggle('hidden', !isThumbsUp);
    effectTitle.textContent = gesture.name;
    effectOverlay.classList.remove('hidden', 'fade-out');
    document.body.classList.add('effect-active');

    if (isThumbsUp) {
      loadTenorEmbed().catch((err) => {
        console.error('Failed to initialize the Tenor reaction:', err);
        if (effectShowing && effectTitle.textContent === gesture.name) {
          effectTenor.classList.add('hidden');
          effectImage.classList.remove('hidden');
        }
      });
    }

    // Auto-dismiss after duration
    setTimeout(() => {
      dismissEffect();
    }, EFFECT_DURATION);
  }

  function dismissEffect() {
    effectOverlay.classList.add('fade-out');
    document.body.classList.remove('effect-active');

    setTimeout(() => {
      effectOverlay.classList.add('hidden');
      effectShowing = false;

      // Start cooldown
      cooldownActive = true;
      setTimeout(() => {
        cooldownActive = false;
      }, COOLDOWN);
    }, 400);
  }

  // ============================================
  // Gesture recognition logic
  // ============================================
  function processGesture(landmarks) {
    if (effectShowing || cooldownActive) return;

    let detectedGesture = null;

    for (let i = 0; i < GESTURES.length; i++) {
      if (GESTURES[i].detect(landmarks)) {
        detectedGesture = GESTURES[i];
        // Highlight card
        highlightCard(i);
        break;
      }
    }

    if (detectedGesture) {
      if (detectedGesture.name !== lastDetectedGesture) {
        // New gesture detected, start timer
        lastDetectedGesture = detectedGesture.name;
        gestureStartTime = performance.now();
      }

      // Show label
      gestureLabel.classList.remove('hidden');
      gestureIconEl.innerHTML = getGestureIcon(detectedGesture.name);

      const elapsed = performance.now() - gestureStartTime;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);

      if (progress < 1) {
        gestureName.textContent = `${detectedGesture.name} — ${Math.round(progress * 100)}%`;
      } else {
        gestureName.textContent = detectedGesture.name;
        showEffect(detectedGesture);
      }
    } else {
      // No gesture detected
      lastDetectedGesture = null;
      gestureStartTime = 0;
      gestureLabel.classList.add('hidden');
      clearHighlights();
    }
  }

  function highlightCard(index) {
    // Remove all active states first
    document.querySelectorAll('.gesture-card').forEach((card) => {
      card.classList.remove('active');
    });
    const card = document.getElementById(`gesture-card-${index}`);
    if (card) card.classList.add('active');
  }

  function clearHighlights() {
    document.querySelectorAll('.gesture-card').forEach((card) => {
      card.classList.remove('active');
    });
  }

  // ============================================
  // MediaPipe Hands setup
  // ============================================
  function initHands() {
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6,
    });

    hands.onResults(onResults);

    return hands;
  }

  function onResults(results) {
    // Sync canvas size
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    // Mirror the canvas to match the mirrored video
    canvasCtx.translate(canvasEl.width, 0);
    canvasCtx.scale(-1, 1);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Draw hand connections
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: 'rgba(166, 47, 93, 0.78)',
        lineWidth: 2,
      });

      // Draw landmarks
      drawLandmarks(canvasCtx, landmarks, {
        color: 'rgba(217, 79, 130, 0.95)',
        lineWidth: 1,
        radius: 3,
      });

      canvasCtx.restore();

      // Process gesture
      processGesture(landmarks);
    } else {
      canvasCtx.restore();

      // No hand detected
      lastDetectedGesture = null;
      gestureStartTime = 0;
      gestureLabel.classList.add('hidden');
      clearHighlights();
    }
  }

  // ============================================
  // Camera initialization
  // ============================================
  async function startCamera(hands) {
    const camera = new Camera(videoEl, {
      onFrame: async () => {
        await hands.send({ image: videoEl });
      },
      width: 1280,
      height: 960,
    });

    await camera.start();
  }

  async function startDemo() {
    if (cameraStarted) {
      scrollToCamera();
      return;
    }

    if (cameraStarting) return;

    scrollToCamera();
    cameraStarting = true;
    cameraStartButtons.forEach((button) => {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
    });
    statusText.textContent = 'Waiting for camera';
    statusIndicator.classList.add('is-loading');
    cameraPlaceholder.classList.add('is-loading');
    cameraPlaceholderTitle.textContent = 'Getting your mirror ready';
    cameraPlaceholderCopy.textContent = 'Please allow camera access in your browser when prompted.';

    try {
      const hands = initHands();
      await startCamera(hands);

      cameraStarted = true;
      cameraPlaceholder.classList.add('hidden');
      statusDot.classList.add('active');
      statusText.textContent = 'Camera ready';
      cameraStartButtons.forEach((button) => {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.textContent = 'Camera is on — show a gesture';
      });
    } catch (err) {
      console.error('Failed to initialize camera:', err);
      cameraPlaceholder.classList.remove('is-loading');
      cameraPlaceholderTitle.textContent = 'Your camera did not open';
      cameraPlaceholderCopy.textContent =
        'Check your browser camera permission, then choose try again.';
      statusText.textContent = 'Camera unavailable';
      cameraStartButtons.forEach((button) => {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.textContent = 'Try camera again';
      });
    } finally {
      cameraStarting = false;
      statusIndicator.classList.remove('is-loading');
    }
  }

  // ============================================
  // Boot sequence
  // ============================================
  function init() {
    buildGestureGuide();
    cameraStartButtons.forEach((button) => {
      button.addEventListener('click', startDemo);
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
