import { Landmark, FingerState, HandLandmarksResult } from '../types';

// Helper for Euclidean distance in 2D/3D
export function distance2D(p1: Landmark, p2: Landmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// MediaPipe Hand Landmark Connections
export const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm connections
  [5, 9], [9, 13], [13, 17]
];

export function analyzeFingers(landmarks: Landmark[], handedness: 'Left' | 'Right' = 'Right'): FingerState {
  if (!landmarks || landmarks.length < 21) {
    return { thumb: false, index: false, middle: false, ring: false, pinky: false, count: 0 };
  }

  const wrist = landmarks[0];

  // 1. Index Finger (5: MCP, 6: PIP, 8: TIP)
  const indexDistTip = distance2D(wrist, landmarks[8]);
  const indexDistPip = distance2D(wrist, landmarks[6]);
  const indexOpen = indexDistTip > indexDistPip * 1.15 || landmarks[8].y < landmarks[6].y;

  // 2. Middle Finger (9: MCP, 10: PIP, 12: TIP)
  const middleDistTip = distance2D(wrist, landmarks[12]);
  const middleDistPip = distance2D(wrist, landmarks[10]);
  const middleOpen = middleDistTip > middleDistPip * 1.15 || landmarks[12].y < landmarks[10].y;

  // 3. Ring Finger (13: MCP, 14: PIP, 16: TIP)
  const ringDistTip = distance2D(wrist, landmarks[16]);
  const ringDistPip = distance2D(wrist, landmarks[14]);
  const ringOpen = ringDistTip > ringDistPip * 1.15 || landmarks[16].y < landmarks[14].y;

  // 4. Pinky Finger (17: MCP, 18: PIP, 20: TIP)
  const pinkyDistTip = distance2D(wrist, landmarks[20]);
  const pinkyDistPip = distance2D(wrist, landmarks[18]);
  const pinkyOpen = pinkyDistTip > pinkyDistPip * 1.15 || landmarks[20].y < landmarks[18].y;

  // 5. Thumb Finger (1: CMC, 2: MCP, 3: IP, 4: TIP)
  // Compare distance from Thumb Tip to Pinky MCP (17) vs Thumb IP (3) to Pinky MCP (17)
  const thumbTipPinkyMcp = distance2D(landmarks[4], landmarks[17]);
  const thumbIpPinkyMcp = distance2D(landmarks[3], landmarks[17]);
  
  // Handedness check: for Right hand, extended thumb moves left (-x); for Left hand, moves right (+x)
  let thumbOpen = false;
  const isRightHand = handedness === 'Right';
  
  if (isRightHand) {
    thumbOpen = landmarks[4].x < landmarks[3].x || thumbTipPinkyMcp > thumbIpPinkyMcp * 1.12;
  } else {
    thumbOpen = landmarks[4].x > landmarks[3].x || thumbTipPinkyMcp > thumbIpPinkyMcp * 1.12;
  }

  // Double check thumb distance from index MCP
  const thumbIndexDist = distance2D(landmarks[4], landmarks[5]);
  if (thumbIndexDist > 0.18) {
    thumbOpen = true;
  }

  let count = 0;
  if (thumbOpen) count++;
  if (indexOpen) count++;
  if (middleOpen) count++;
  if (ringOpen) count++;
  if (pinkyOpen) count++;

  return {
    thumb: thumbOpen,
    index: indexOpen,
    middle: middleOpen,
    ring: ringOpen,
    pinky: pinkyOpen,
    count
  };
}

export function drawHandOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  fingerState: FingerState,
  width: number,
  height: number,
  showLabels: boolean = true
) {
  ctx.clearRect(0, 0, width, height);

  if (!landmarks || landmarks.length < 21) return;

  // Draw Connections
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#3b82f6'; // Bright blue
  ctx.shadowColor = '#60a5fa';
  ctx.shadowBlur = 8;

  HAND_CONNECTIONS.forEach(([i, j]) => {
    const p1 = landmarks[i];
    const p2 = landmarks[j];
    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  });

  ctx.shadowBlur = 0;

  // Draw Joints and Tip Indicators
  landmarks.forEach((lm, idx) => {
    const x = lm.x * width;
    const y = lm.y * height;

    const isTip = idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20;
    let isOpen = false;
    if (idx === 4) isOpen = fingerState.thumb;
    if (idx === 8) isOpen = fingerState.index;
    if (idx === 12) isOpen = fingerState.middle;
    if (idx === 16) isOpen = fingerState.ring;
    if (idx === 20) isOpen = fingerState.pinky;

    ctx.beginPath();
    ctx.arc(x, y, isTip ? 8 : 4, 0, 2 * Math.PI);

    if (isTip) {
      ctx.fillStyle = isOpen ? '#10b981' : '#ef4444'; // Green if open, red if closed
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#6366f1'; // Purple joint
    }

    ctx.fill();

    // Finger Tip Labels
    if (showLabels && isTip) {
      let label = '';
      if (idx === 4) label = `Thumb (${fingerState.thumb ? 'OPEN' : 'CLOSED'})`;
      if (idx === 8) label = `Index (${fingerState.index ? 'OPEN' : 'CLOSED'})`;
      if (idx === 12) label = `Middle (${fingerState.middle ? 'OPEN' : 'CLOSED'})`;
      if (idx === 16) label = `Ring (${fingerState.ring ? 'OPEN' : 'CLOSED'})`;
      if (idx === 20) label = `Pinky (${fingerState.pinky ? 'OPEN' : 'CLOSED'})`;

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = isOpen ? '#065f46' : '#991b1b';
      
      // Background pill for label
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = isOpen ? 'rgba(209, 250, 229, 0.9)' : 'rgba(254, 226, 226, 0.9)';
      ctx.beginPath();
      ctx.roundRect(x - textWidth / 2 - 4, y - 24, textWidth + 8, 16, 4);
      ctx.fill();

      ctx.fillStyle = isOpen ? '#047857' : '#b91c1c';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 12);
    }
  });
}

// Generate Simulated Hand Landmarks for fallback/testing mode
export function getSimulatedLandmarks(fingerCount: number): Landmark[] {
  const baseLandmarks: Landmark[] = [
    { x: 0.5, y: 0.8, z: 0 }, // 0: Wrist
    // Thumb
    { x: 0.45, y: 0.75, z: 0 }, { x: 0.42, y: 0.7, z: 0 }, { x: 0.38, y: 0.65, z: 0 },
    { x: fingerCount >= 1 ? 0.32 : 0.42, y: fingerCount >= 1 ? 0.58 : 0.68, z: 0 }, // 4: Thumb Tip
    // Index
    { x: 0.46, y: 0.6, z: 0 }, { x: 0.45, y: 0.52, z: 0 }, { x: 0.44, y: 0.44, z: 0 },
    { x: 0.43, y: fingerCount >= 2 ? 0.32 : 0.58, z: 0 }, // 8: Index Tip
    // Middle
    { x: 0.5, y: 0.6, z: 0 }, { x: 0.5, y: 0.5, z: 0 }, { x: 0.5, y: 0.42, z: 0 },
    { x: 0.5, y: fingerCount >= 3 ? 0.28 : 0.58, z: 0 }, // 12: Middle Tip
    // Ring
    { x: 0.54, y: 0.6, z: 0 }, { x: 0.55, y: 0.52, z: 0 }, { x: 0.56, y: 0.44, z: 0 },
    { x: 0.57, y: fingerCount >= 4 ? 0.32 : 0.58, z: 0 }, // 16: Ring Tip
    // Pinky
    { x: 0.58, y: 0.62, z: 0 }, { x: 0.6, y: 0.56, z: 0 }, { x: 0.61, y: 0.5, z: 0 },
    { x: 0.62, y: fingerCount >= 5 ? 0.38 : 0.62, z: 0 }, // 20: Pinky Tip
  ];
  return baseLandmarks;
}
