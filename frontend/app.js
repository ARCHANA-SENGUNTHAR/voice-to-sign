

// Import Three.js modules (ES6 modules)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// DOM elements
const recordButton = document.getElementById("recordButton");
const status = document.getElementById("status");
const transcript = document.getElementById("transcript");
const loading = document.getElementById("loading");

let mediaRecorder;
let audioChunks = [];
let avatar = null;
let mixer = null;
let currentAction = null;

// Three.js scene setup
const container = document.getElementById("avatar-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e3c72);

const camera = new THREE.PerspectiveCamera(
  75,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
camera.position.set(0, 1.6, 3);
camera.lookAt(0, 1, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0x667eea, 1, 100);
pointLight.position.set(-5, 5, 5);
scene.add(pointLight);

// Load avatar with better error handling
const loader = new GLTFLoader();

// Check if avatar file exists first
fetch("./avatar.glb", { method: 'HEAD' })
  .then(response => {
    if (response.ok) {
      // File exists, try to load it
      loader.load(
        "./avatar.glb",
        (gltf) => {
          avatar = gltf.scene;
          avatar.position.set(0, 0, 0);
          avatar.scale.set(1, 1, 1);
          scene.add(avatar);
          
          // Setup animation mixer if animations exist
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(avatar);
            console.log("Animations found:", gltf.animations.length);
          }
          
          status.textContent = "Avatar loaded! Ready to record.";
          console.log("Avatar loaded successfully");
        },
        (progress) => {
          const percent = (progress.loaded / progress.total * 100).toFixed(0);
          status.textContent = `Loading avatar... ${percent}%`;
        },
        (error) => {
          console.error("Error loading avatar:", error);
          console.warn("Avatar file might be in wrong format (needs .glb, not .fbx)");
          status.textContent = "Using simple avatar (GLB file format issue).";
          createFallbackAvatar();
        }
      );
    } else {
      throw new Error("Avatar file not found");
    }
  })
  .catch(error => {
    console.warn("Avatar file not found or inaccessible, using fallback");
    status.textContent = "Using simple avatar (no GLB file found).";
    createFallbackAvatar();
  });

// Create fallback avatar if GLB fails to load
function createFallbackAvatar() {
  const geometry = new THREE.BoxGeometry(0.5, 0.8, 0.3);
  const material = new THREE.MeshPhongMaterial({ color: 0x4a90e2 });
  avatar = new THREE.Mesh(geometry, material);
  avatar.position.set(0, 1, 0);
  scene.add(avatar);
  
  // Add a head
  const headGeometry = new THREE.SphereGeometry(0.25, 32, 32);
  const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffdbac });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.set(0, 0.65, 0);
  avatar.add(head);
  
  console.log("Fallback avatar created");
}

// Animation loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  if (mixer) {
    mixer.update(delta);
  }
  
  // Gentle idle rotation
  if (avatar && !currentAction) {
    avatar.rotation.y += 0.002;
  }
  
  renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// Recording functionality
recordButton.addEventListener("click", async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    // Stop recording
    mediaRecorder.stop();
    recordButton.textContent = "🎙️ Start Recording";
    recordButton.classList.remove("recording");
  } else {
    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.start();
      recordButton.textContent = "⏹️ Stop Recording";
      recordButton.classList.add("recording");
      status.textContent = "Listening... Speak now!";
      status.classList.remove("error", "success");
      transcript.textContent = "";
      loading.classList.remove("active");

      mediaRecorder.addEventListener("dataavailable", (e) => {
        audioChunks.push(e.data);
      });

      mediaRecorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        await sendAudioToBackend(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      });

    } catch (err) {
      console.error("Microphone error:", err);
      status.textContent = "Error: Cannot access microphone. Please allow microphone access.";
      status.classList.add("error");
      recordButton.classList.remove("recording");
    }
  }
});

// Send audio to backend with better error handling
async function sendAudioToBackend(audioBlob) {
  status.textContent = "Processing your speech...";
  loading.classList.add("active");
  
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.wav");

  try {
    const response = await fetch("http://127.0.0.1:5000/speech-to-sign", {
      method: "POST",
      body: formData,
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Backend response:", data);
    
    loading.classList.remove("active");
    
    if (data.transcript) {
      status.textContent = "Translation complete!";
      status.classList.add("success");
      transcript.textContent = `You said: "${data.transcript}"`;
      
      // Play sign animation
      playSignAnimation(data.gloss);
    } else {
      status.textContent = "No speech detected. Please try again.";
      status.classList.add("error");
    }

  } catch (err) {
    console.error("Backend error:", err);
    loading.classList.remove("active");
    
    // More specific error messages
    if (err.message.includes('Failed to fetch')) {
      status.textContent = "❌ Cannot connect to backend. Is Flask running on port 5000?";
      transcript.textContent = "Start backend with: cd backend && python app.py";
    } else if (err.message.includes('NetworkError')) {
      status.textContent = "❌ Network error. Check if Flask server is running.";
      transcript.textContent = "Run: cd backend && python app.py";
    } else {
      status.textContent = `❌ Error: ${err.message}`;
      transcript.textContent = "Check console (F12) for details";
    }
    
    status.classList.add("error");
  }
}

// Sign language animation definitions
const SIGN_ANIMATIONS = {
  'HELLO': {
    name: 'Hello',
    duration: 2000,
    movements: [
      { joint: 'rightArm', axis: 'y', angle: Math.PI / 3, time: 0 },
      { joint: 'rightHand', axis: 'z', angle: Math.PI / 4, time: 500 },
      { joint: 'rightHand', axis: 'z', angle: -Math.PI / 4, time: 1000 },
      { joint: 'rightHand', axis: 'z', angle: 0, time: 1500 }
    ]
  },
  'THANK-YOU': {
    name: 'Thank You',
    duration: 2500,
    movements: [
      { joint: 'rightArm', axis: 'x', angle: -Math.PI / 4, time: 0 },
      { joint: 'head', axis: 'x', angle: Math.PI / 6, time: 500 },
      { joint: 'rightArm', axis: 'y', angle: Math.PI / 6, time: 1000 },
      { joint: 'head', axis: 'x', angle: 0, time: 2000 }
    ]
  },
  'PLEASE': {
    name: 'Please',
    duration: 2000,
    movements: [
      { joint: 'rightArm', axis: 'x', angle: -Math.PI / 3, time: 0 },
      { joint: 'body', axis: 'x', angle: Math.PI / 12, time: 500 },
      { joint: 'body', axis: 'x', angle: -Math.PI / 12, time: 1000 },
      { joint: 'body', axis: 'x', angle: 0, time: 1500 }
    ]
  },
  'YES': {
    name: 'Yes',
    duration: 1500,
    movements: [
      { joint: 'head', axis: 'x', angle: Math.PI / 4, time: 0 },
      { joint: 'head', axis: 'x', angle: -Math.PI / 6, time: 500 },
      { joint: 'head', axis: 'x', angle: 0, time: 1000 }
    ]
  },
  'NO': {
    name: 'No',
    duration: 1500,
    movements: [
      { joint: 'head', axis: 'y', angle: Math.PI / 4, time: 0 },
      { joint: 'head', axis: 'y', angle: -Math.PI / 4, time: 500 },
      { joint: 'head', axis: 'y', angle: 0, time: 1000 }
    ]
  },
  'HOW': {
    name: 'How',
    duration: 2000,
    movements: [
      { joint: 'rightArm', axis: 'z', angle: Math.PI / 3, time: 0 },
      { joint: 'leftArm', axis: 'z', angle: -Math.PI / 3, time: 0 },
      { joint: 'rightHand', axis: 'y', angle: Math.PI / 6, time: 500 }
    ]
  }
};

// Play sign animation
function playSignAnimation(gloss) {
  if (!avatar) {
    console.warn("Avatar not loaded yet!");
    return;
  }

  console.log("Playing sign animation for:", gloss);
  
  // Stop any current animation
  if (currentAction) {
    currentAction.stop();
    currentAction = null;
  }

  // If avatar has pre-recorded animations from GLB
  if (mixer && mixer._actions && mixer._actions.length > 0) {
    const action = mixer._actions.find(a => 
      a._clip.name.toLowerCase().includes(gloss.toLowerCase())
    );
    
    if (action) {
      currentAction = action;
      action.reset();
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      action.play();
      
      setTimeout(() => {
        currentAction = null;
      }, action._clip.duration * 1000);
      
      return;
    }
  }

  // Use procedural sign animation
  const signAnim = SIGN_ANIMATIONS[gloss];
  
  if (signAnim) {
    performSignAnimation(signAnim);
  } else {
    // Fallback: Generic wave animation
    performGenericAnimation(gloss);
  }
}

// Perform procedural sign language animation
function performSignAnimation(animData) {
  console.log(`🤟 Performing sign: ${animData.name}`);
  
  const startTime = Date.now();
  const duration = animData.duration;
  
  // Store original rotations
  const originalRotations = {};
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    if (progress < 1) {
      // Apply each movement
      animData.movements.forEach(movement => {
        const moveProgress = Math.max(0, Math.min(1, (elapsed - movement.time) / 500));
        if (moveProgress > 0 && moveProgress < 1) {
          applyMovement(movement, moveProgress);
        }
      });
      
      requestAnimationFrame(animate);
    } else {
      // Reset to original position
      resetAvatar();
    }
  }
  
  animate();
}

// Apply movement to avatar part
function applyMovement(movement, progress) {
  if (!avatar) return;
  
  // Ease in-out
  const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  
  // Find the part to move (simplified for basic avatar)
  let part = avatar;
  
  // Try to find specific body parts if they exist
  avatar.traverse((child) => {
    if (child.name && child.name.toLowerCase().includes(movement.joint.toLowerCase())) {
      part = child;
    }
  });
  
  // Apply rotation
  if (movement.axis === 'x') {
    part.rotation.x = movement.angle * eased;
  } else if (movement.axis === 'y') {
    part.rotation.y = movement.angle * eased;
  } else if (movement.axis === 'z') {
    part.rotation.z = movement.angle * eased;
  }
}

// Reset avatar to neutral position
function resetAvatar() {
  if (!avatar) return;
  
  const duration = 500;
  const startTime = Date.now();
  
  function reset() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    avatar.traverse((child) => {
      if (child.rotation) {
        child.rotation.x *= (1 - progress);
        child.rotation.y *= (1 - progress);
        child.rotation.z *= (1 - progress);
      }
    });
    
    if (progress < 1) {
      requestAnimationFrame(reset);
    }
  }
  
  reset();
}

// Generic animation for unknown signs
function performGenericAnimation(gloss) {
  console.log(`🤷 Using generic animation for: ${gloss}`);
  
  const duration = 2000;
  const startTime = Date.now();
  const startRotation = avatar.rotation.y;
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    if (progress < 1) {
      // Wave motion
      avatar.rotation.y = startRotation + Math.sin(progress * Math.PI * 3) * 0.3;
      avatar.rotation.x = Math.sin(progress * Math.PI * 2) * 0.1;
      requestAnimationFrame(animate);
    } else {
      avatar.rotation.y = startRotation;
      avatar.rotation.x = 0;
    }
  }
  
  animate();
}

// Add visual feedback for supported words
console.log("Voice to Sign Translator loaded!");
console.log("Supported words: hello, thank you, please, yes, no, how, are, I, am, fine");