

// Import Three.js modules
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// DOM elements
const recordButton = document.getElementById("recordButton");
const status = document.getElementById("status");
const transcript = document.getElementById("transcript");
const loading = document.getElementById("loading");
const signLabel = document.getElementById("signLabel");

let mediaRecorder;
let audioChunks = [];
let avatar = null;
let mixer = null;
let currentAction = null;
let bodyParts = {};

// Three.js scene setup
const container = document.getElementById("avatar-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a5298);

const camera = new THREE.PerspectiveCamera(
  50,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
camera.position.set(0, 1.5, 4);
camera.lookAt(0, 1.2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// Enhanced Lighting for better visibility
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(3, 5, 3);
directionalLight.castShadow = true;
scene.add(directionalLight);

const frontLight = new THREE.DirectionalLight(0xffffff, 0.6);
frontLight.position.set(0, 2, 5);
scene.add(frontLight);

const backLight = new THREE.DirectionalLight(0x8899ff, 0.4);
backLight.position.set(0, 2, -3);
scene.add(backLight);

// Create improved 3D avatar with visible arms and hands
function createImprovedAvatar() {
  const avatarGroup = new THREE.Group();
  
  // Materials
  const skinMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xffdbac,
    shininess: 20,
    flatShading: false
  });
  
  const shirtMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x4a90e2,
    shininess: 30
  });
  
  const pantsMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x2c3e50,
    shininess: 20
  });
  
  // HEAD - Larger and more visible
  const headGeometry = new THREE.SphereGeometry(0.35, 32, 32);
  const head = new THREE.Mesh(headGeometry, skinMaterial);
  head.position.set(0, 1.65, 0);
  head.castShadow = true;
  avatarGroup.add(head);
  bodyParts.head = head;
  
  // EYES - More prominent
  const eyeGeometry = new THREE.SphereGeometry(0.06, 16, 16);
  const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
  
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.12, 1.7, 0.28);
  avatarGroup.add(leftEye);
  
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.12, 1.7, 0.28);
  avatarGroup.add(rightEye);
  
  // SMILE - Visible
  const smileCurve = new THREE.EllipseCurve(0, 0, 0.12, 0.08, 0, Math.PI, false);
  const smilePoints = smileCurve.getPoints(20);
  const smileGeometry = new THREE.BufferGeometry().setFromPoints(smilePoints);
  const smileMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
  const smile = new THREE.Line(smileGeometry, smileMaterial);
  smile.position.set(0, 1.55, 0.32);
  avatarGroup.add(smile);
  
  // NECK
  const neckGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.2, 16);
  const neck = new THREE.Mesh(neckGeometry, skinMaterial);
  neck.position.set(0, 1.35, 0);
  avatarGroup.add(neck);
  
  // TORSO - Upper body
  const torsoGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.6, 16);
  const torso = new THREE.Mesh(torsoGeometry, shirtMaterial);
  torso.position.set(0, 1.0, 0);
  torso.castShadow = true;
  avatarGroup.add(torso);
  bodyParts.body = torso;
  
  // WAIST
  const waistGeometry = new THREE.CylinderGeometry(0.3, 0.28, 0.3, 16);
  const waist = new THREE.Mesh(waistGeometry, pantsMaterial);
  waist.position.set(0, 0.55, 0);
  avatarGroup.add(waist);
  
  // LEGS - Simple
  const legGeometry = new THREE.CylinderGeometry(0.1, 0.09, 0.5, 16);
  const legMaterial = new THREE.MeshPhongMaterial({ color: 0x34495e });
  
  const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
  leftLeg.position.set(-0.15, 0.15, 0);
  avatarGroup.add(leftLeg);
  
  const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
  rightLeg.position.set(0.15, 0.15, 0);
  avatarGroup.add(rightLeg);
  
  // ===== RIGHT ARM - IMPROVED VISIBILITY =====
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.35, 1.15, 0);
  avatarGroup.add(rightShoulder);
  bodyParts.rightShoulder = rightShoulder;
  
  // Upper Right Arm
  const upperArmGeometry = new THREE.CylinderGeometry(0.09, 0.08, 0.45, 16);
  const rightUpperArm = new THREE.Mesh(upperArmGeometry, skinMaterial);
  rightUpperArm.position.set(0, -0.225, 0);
  rightUpperArm.rotation.z = 0.2;
  rightUpperArm.castShadow = true;
  rightShoulder.add(rightUpperArm);
  bodyParts.rightUpperArm = rightUpperArm;
  
  // Right Elbow (joint)
  const elbowGeometry = new THREE.SphereGeometry(0.09, 16, 16);
  const rightElbow = new THREE.Mesh(elbowGeometry, skinMaterial);
  rightElbow.position.set(0, -0.45, 0);
  rightShoulder.add(rightElbow);
  
  // Lower Right Arm Group
  const rightForearmGroup = new THREE.Group();
  rightForearmGroup.position.set(0, -0.45, 0);
  rightShoulder.add(rightForearmGroup);
  bodyParts.rightForearmGroup = rightForearmGroup;
  
  // Lower Right Arm
  const lowerArmGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.4, 16);
  const rightForearm = new THREE.Mesh(lowerArmGeometry, skinMaterial);
  rightForearm.position.set(0, -0.2, 0);
  rightForearm.castShadow = true;
  rightForearmGroup.add(rightForearm);
  bodyParts.rightForearm = rightForearm;
  
  // RIGHT HAND - Large and visible
  const rightHandGroup = new THREE.Group();
  rightHandGroup.position.set(0, -0.4, 0);
  rightForearmGroup.add(rightHandGroup);
  bodyParts.rightHand = rightHandGroup;
  
  // Hand palm
  const handGeometry = new THREE.BoxGeometry(0.15, 0.18, 0.08);
  const rightHandPalm = new THREE.Mesh(handGeometry, skinMaterial);
  rightHandPalm.castShadow = true;
  rightHandGroup.add(rightHandPalm);
  
  // Fingers
  const fingerGeometry = new THREE.CylinderGeometry(0.02, 0.015, 0.12, 8);
  const fingerPositions = [
    [-0.05, 0.12, 0.02],  // Index
    [-0.02, 0.14, 0.02],  // Middle
    [0.02, 0.13, 0.02],   // Ring
    [0.05, 0.11, 0.02],   // Pinky
    [-0.06, 0.02, 0.03]   // Thumb
  ];
  
  fingerPositions.forEach(pos => {
    const finger = new THREE.Mesh(fingerGeometry, skinMaterial);
    finger.position.set(pos[0], pos[1], pos[2]);
    finger.rotation.z = pos[0] * 0.3;
    rightHandGroup.add(finger);
  });
  
  // ===== LEFT ARM - IMPROVED VISIBILITY =====
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.35, 1.15, 0);
  avatarGroup.add(leftShoulder);
  bodyParts.leftShoulder = leftShoulder;
  
  // Upper Left Arm
  const leftUpperArm = new THREE.Mesh(upperArmGeometry, skinMaterial);
  leftUpperArm.position.set(0, -0.225, 0);
  leftUpperArm.rotation.z = -0.2;
  leftUpperArm.castShadow = true;
  leftShoulder.add(leftUpperArm);
  bodyParts.leftUpperArm = leftUpperArm;
  
  // Left Elbow
  const leftElbow = new THREE.Mesh(elbowGeometry, skinMaterial);
  leftElbow.position.set(0, -0.45, 0);
  leftShoulder.add(leftElbow);
  
  // Lower Left Arm Group
  const leftForearmGroup = new THREE.Group();
  leftForearmGroup.position.set(0, -0.45, 0);
  leftShoulder.add(leftForearmGroup);
  bodyParts.leftForearmGroup = leftForearmGroup;
  
  // Lower Left Arm
  const leftForearm = new THREE.Mesh(lowerArmGeometry, skinMaterial);
  leftForearm.position.set(0, -0.2, 0);
  leftForearm.castShadow = true;
  leftForearmGroup.add(leftForearm);
  bodyParts.leftForearm = leftForearm;
  
  // LEFT HAND - Large and visible
  const leftHandGroup = new THREE.Group();
  leftHandGroup.position.set(0, -0.4, 0);
  leftForearmGroup.add(leftHandGroup);
  bodyParts.leftHand = leftHandGroup;
  
  // Hand palm
  const leftHandPalm = new THREE.Mesh(handGeometry, skinMaterial);
  leftHandPalm.castShadow = true;
  leftHandGroup.add(leftHandPalm);
  
  // Fingers
  fingerPositions.forEach(pos => {
    const finger = new THREE.Mesh(fingerGeometry, skinMaterial);
    finger.position.set(-pos[0], pos[1], pos[2]);
    finger.rotation.z = -pos[0] * 0.3;
    leftHandGroup.add(finger);
  });
  
  // Position avatar
  avatarGroup.position.set(0, 0, 0);
  scene.add(avatarGroup);
  avatar = avatarGroup;
  
  console.log("✅ Improved avatar with visible arms and hands created!");
  return avatarGroup;
}

// Initialize avatar
createImprovedAvatar();

// Animation loop with idle animation
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();
  
  if (mixer) {
    mixer.update(delta);
  }
  
  // Idle animation - gentle breathing and subtle movements
  if (avatar && !currentAction) {
    if (bodyParts.body) {
      bodyParts.body.scale.y = 1 + Math.sin(time * 1.5) * 0.02;
    }
    
    // Subtle head movement
    if (bodyParts.head) {
      bodyParts.head.rotation.y = Math.sin(time * 0.5) * 0.05;
      bodyParts.head.rotation.x = Math.sin(time * 0.3) * 0.02;
    }
    
    // Gentle arm sway
    if (bodyParts.rightShoulder) {
      bodyParts.rightShoulder.rotation.z = 0.2 + Math.sin(time * 0.8) * 0.03;
    }
    if (bodyParts.leftShoulder) {
      bodyParts.leftShoulder.rotation.z = -0.2 + Math.sin(time * 0.8 + Math.PI) * 0.03;
    }
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
    mediaRecorder.stop();
    recordButton.textContent = "🎙️ Start Recording";
    recordButton.classList.remove("recording");
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.start();
      recordButton.textContent = "⏹️ Stop Recording";
      recordButton.classList.add("recording");
      status.textContent = "🎤 Listening... Speak now!";
      status.classList.remove("error", "success");
      transcript.textContent = "";
      loading.classList.remove("active");
      signLabel.classList.remove("active");

      mediaRecorder.addEventListener("dataavailable", (e) => {
        audioChunks.push(e.data);
      });

      mediaRecorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        await sendAudioToBackend(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      });

    } catch (err) {
      console.error("Microphone error:", err);
      status.textContent = "❌ Error: Cannot access microphone. Please allow microphone access.";
      status.classList.add("error");
      recordButton.classList.remove("recording");
    }
  }
});

// Send audio to backend
async function sendAudioToBackend(audioBlob) {
  status.textContent = "⏳ Processing your speech...";
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
    console.log("✅ Backend response:", data);
    
    loading.classList.remove("active");
    
    if (data.transcript) {
      status.textContent = "✅ Translation complete!";
      status.classList.add("success");
      transcript.textContent = `You said: "${data.transcript}"`;
      
      // Show sign label
      signLabel.textContent = `🤟 ${data.gloss}`;
      signLabel.classList.add("active");
      
      // Play sign animation
      playSignAnimation(data.gloss);
      
      // Hide label after animation
      setTimeout(() => {
        signLabel.classList.remove("active");
      }, 3500);
    } else {
      status.textContent = "⚠️ No speech detected. Please try again.";
      status.classList.add("error");
    }

  } catch (err) {
    console.error("❌ Backend error:", err);
    loading.classList.remove("active");
    
    if (err.message.includes('Failed to fetch')) {
      status.textContent = "❌ Cannot connect to backend. Is Flask running?";
      transcript.textContent = "Start backend: cd backend && python app.py";
    } else {
      status.textContent = `❌ Error: ${err.message}`;
      transcript.textContent = "Check console (F12) for details";
    }
    
    status.classList.add("error");
  }
}

// Enhanced sign language animations with visible movements
const SIGN_ANIMATIONS = {
  'HELLO': {
    name: 'Hello',
    duration: 2200,
    animate: (progress) => {
      const wave = Math.sin(progress * Math.PI * 4) * 0.4;
      
      bodyParts.rightShoulder.rotation.z = -1.2;
      bodyParts.rightShoulder.rotation.x = 0.3;
      bodyParts.rightForearmGroup.rotation.z = -0.5 + wave;
      bodyParts.rightHand.rotation.z = wave * 0.5;
      bodyParts.head.rotation.y = Math.sin(progress * Math.PI * 2) * 0.15;
    }
  },
  'THANK-YOU': {
    name: 'Thank You',
    duration: 2500,
    animate: (progress) => {
      const phase = progress * Math.PI;
      
      bodyParts.rightShoulder.rotation.z = -1.0;
      bodyParts.rightShoulder.rotation.x = -0.5 + Math.sin(phase) * 0.4;
      bodyParts.rightForearmGroup.rotation.z = -0.3;
      bodyParts.rightHand.position.z = Math.max(0, (progress - 0.3) * 0.8);
      bodyParts.head.rotation.x = Math.sin(phase) * 0.25;
      bodyParts.body.rotation.x = Math.sin(phase) * 0.1;
    }
  },
  'PLEASE': {
    name: 'Please',
    duration: 2000,
    animate: (progress) => {
      const rub = Math.sin(progress * Math.PI * 3) * 0.2;
      
      bodyParts.rightShoulder.rotation.z = -0.8;
      bodyParts.rightShoulder.rotation.x = -0.4;
      bodyParts.rightHand.position.x = rub;
      bodyParts.body.rotation.x = rub * 0.5;
    }
  },
  'YES': {
    name: 'Yes',
    duration: 1600,
    animate: (progress) => {
      const nod = Math.sin(progress * Math.PI * 3) * 0.4;
      bodyParts.head.rotation.x = nod;
      bodyParts.rightShoulder.rotation.z = -0.6 + Math.abs(nod) * 0.2;
      bodyParts.rightHand.rotation.x = nod * 0.5;
    }
  },
  'NO': {
    name: 'No',
    duration: 1600,
    animate: (progress) => {
      const shake = Math.sin(progress * Math.PI * 3) * 0.5;
      bodyParts.head.rotation.y = shake;
      bodyParts.rightShoulder.rotation.z = -0.6;
      bodyParts.rightHand.rotation.y = shake * 0.3;
    }
  },
  'HOW': {
    name: 'How',
    duration: 2000,
    animate: (progress) => {
      const twist = Math.sin(progress * Math.PI) * 0.4;
      
      bodyParts.rightShoulder.rotation.z = -1.0;
      bodyParts.leftShoulder.rotation.z = 1.0;
      bodyParts.rightForearmGroup.rotation.x = twist;
      bodyParts.leftForearmGroup.rotation.x = -twist;
      bodyParts.rightHand.rotation.y = twist;
      bodyParts.leftHand.rotation.y = -twist;
    }
  },
  'GOOD': {
    name: 'Good',
    duration: 2000,
    animate: (progress) => {
      const thumbsUp = Math.min(progress * 2, 1);
      
      bodyParts.rightShoulder.rotation.z = -1.2 * thumbsUp;
      bodyParts.rightShoulder.rotation.x = -0.3 * thumbsUp;
      bodyParts.rightForearmGroup.rotation.z = -0.4 * thumbsUp;
      bodyParts.rightHand.rotation.x = 0.5 * thumbsUp;
      bodyParts.head.rotation.y = -0.2 * thumbsUp;
    }
  },
  'SORRY': {
    name: 'Sorry',
    duration: 2200,
    animate: (progress) => {
      const circular = Math.sin(progress * Math.PI * 2) * 0.3;
      
      bodyParts.rightShoulder.rotation.z = -0.8;
      bodyParts.rightShoulder.rotation.x = -0.5;
      bodyParts.rightHand.position.x = circular;
      bodyParts.rightHand.position.y = -0.4 + Math.abs(circular) * 0.2;
      bodyParts.head.rotation.x = 0.3;
      bodyParts.body.rotation.x = 0.15;
    }
  }
};

// Play sign animation
function playSignAnimation(gloss) {
  if (!avatar || !bodyParts) {
    console.warn("⚠️ Avatar not ready");
    return;
  }

  const signAnim = SIGN_ANIMATIONS[gloss] || SIGN_ANIMATIONS['HELLO'];
  console.log(`🤟 Performing sign: ${signAnim.name}`);
  
  // Store original poses
  const originalPoses = {};
  Object.keys(bodyParts).forEach(key => {
    const part = bodyParts[key];
    originalPoses[key] = {
      rotation: part.rotation.clone(),
      position: part.position.clone()
    };
  });
  
  const startTime = Date.now();
  currentAction = true;
  
  function animateSign() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / signAnim.duration, 1);
    const eased = easeInOutCubic(progress);
    
    if (progress < 1) {
      signAnim.animate(eased);
      requestAnimationFrame(animateSign);
    } else {
      resetToIdle(originalPoses);
    }
  }
  
  animateSign();
}

// Reset to idle pose
function resetToIdle(originalPoses) {
  const duration = 600;
  const startTime = Date.now();
  
  function reset() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);
    
    Object.keys(originalPoses).forEach(key => {
      const part = bodyParts[key];
      const original = originalPoses[key];
      
      part.rotation.x = lerp(part.rotation.x, original.rotation.x, eased);
      part.rotation.y = lerp(part.rotation.y, original.rotation.y, eased);
      part.rotation.z = lerp(part.rotation.z, original.rotation.z, eased);
      
      part.position.x = lerp(part.position.x, original.position.x, eased);
      part.position.y = lerp(part.position.y, original.position.y, eased);
      part.position.z = lerp(part.position.z, original.position.z, eased);
    });
    
    if (progress < 1) {
      requestAnimationFrame(reset);
    } else {
      currentAction = null;
      console.log("✅ Animation complete - back to idle");
    }
  }
  
  reset();
}

// Utility functions
function lerp(start, end, t) {
  return start + (end - start) * t;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

console.log("✅ Voice to Sign Translator loaded!");
console.log("🤟 Supported signs:", Object.keys(SIGN_ANIMATIONS).join(", "));
console.log("👋 Avatar ready with visible arms and hands!");