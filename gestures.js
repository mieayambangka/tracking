/**
 * =============================================
 * GESTURE DEFINITIONS — Easy to customize!
 * =============================================
 * 
 * Each gesture has:
 *   - name:        Display name
 *   - emoji:       Emoji shown in the UI
 *   - description: Short description
 *   - image:       Path to the image shown when gesture is detected
 *   - detect(landmarks): Function that returns true/false based on hand landmarks
 * 
 * MediaPipe Hand Landmarks:
 *   0  = WRIST
 *   1  = THUMB_CMC,  2 = THUMB_MCP,  3 = THUMB_IP,   4 = THUMB_TIP
 *   5  = INDEX_MCP,  6 = INDEX_PIP,  7 = INDEX_DIP,   8 = INDEX_TIP
 *   9  = MIDDLE_MCP, 10= MIDDLE_PIP, 11= MIDDLE_DIP, 12= MIDDLE_TIP
 *   13 = RING_MCP,  14= RING_PIP,   15= RING_DIP,   16= RING_TIP
 *   17 = PINKY_MCP, 18= PINKY_PIP,  19= PINKY_DIP,  20= PINKY_TIP
 * 
 * Each landmark has: { x, y, z } normalized to [0, 1]
 * 
 * Helper: isFingerExtended(landmarks, finger)
 *   finger: 'thumb', 'index', 'middle', 'ring', 'pinky'
 *   Returns true if that finger is extended (straight)
 */

// ============================================
// Helper functions for gesture detection
// ============================================

/**
 * Check if a finger is extended (tip is farther from wrist than PIP joint)
 */
function isFingerExtended(landmarks, finger) {
  const fingerMap = {
    index:  { tip: 8,  pip: 6  },
    middle: { tip: 12, pip: 10 },
    ring:   { tip: 16, pip: 14 },
    pinky:  { tip: 20, pip: 18 },
  };

  if (finger === 'thumb') {
    // Thumb: compare tip x to MCP x (works for right hand, flipped cam)
    const tipX = landmarks[4].x;
    const mcpX = landmarks[2].x;
    return Math.abs(tipX - mcpX) > 0.05;
  }

  const f = fingerMap[finger];
  if (!f) return false;

  // Finger is extended if tip.y < pip.y (higher on screen = lower y value)
  return landmarks[f.tip].y < landmarks[f.pip].y;
}

/**
 * Check if a finger is curled (tip is closer to palm than PIP joint)
 */
function isFingerCurled(landmarks, finger) {
  return !isFingerExtended(landmarks, finger);
}

/**
 * Get distance between two landmarks
 */
function landmarkDistance(a, b) {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2) +
    Math.pow(a.z - b.z, 2)
  );
}

// ============================================
// Gesture Definitions
// ============================================

const GESTURES = [
  {
    name: 'Thumbs Up',
    emoji: '👍',
    description: 'Thumb up, other fingers closed',
    image: 'images/sanz.jpg',
    detect(landmarks) {
      // Thumb extended upward, all other fingers curled
      const thumbTip = landmarks[4];
      const thumbMcp = landmarks[2];
      const thumbUp = thumbTip.y < thumbMcp.y - 0.05; // thumb tip is above MCP

      const othersCurled =
        isFingerCurled(landmarks, 'index') &&
        isFingerCurled(landmarks, 'middle') &&
        isFingerCurled(landmarks, 'ring') &&
        isFingerCurled(landmarks, 'pinky');

      return thumbUp && othersCurled;
    },
  },

  {
    name: 'Peace',
    emoji: '✌️',
    description: 'Index & middle up, others closed',
    image: 'images/images.jpg',
    detect(landmarks) {
      const indexUp = isFingerExtended(landmarks, 'index');
      const middleUp = isFingerExtended(landmarks, 'middle');
      const ringDown = isFingerCurled(landmarks, 'ring');
      const pinkyDown = isFingerCurled(landmarks, 'pinky');

      return indexUp && middleUp && ringDown && pinkyDown;
    },
  },

  {
    name: 'Open Palm',
    emoji: '🖐️',
    description: 'All five fingers extended',
    image: 'images/kera.jpeg',
    detect(landmarks) {
      return (
        isFingerExtended(landmarks, 'thumb') &&
        isFingerExtended(landmarks, 'index') &&
        isFingerExtended(landmarks, 'middle') &&
        isFingerExtended(landmarks, 'ring') &&
        isFingerExtended(landmarks, 'pinky')
      );
    },
  },

  {
    name: 'Middle Finger',
    emoji: '🖕',
    description: 'Middle finger up, other fingers closed',
    image: 'images/fist.jpg',
    detect(landmarks) {
      return (
        isFingerExtended(landmarks, 'middle') &&
        isFingerCurled(landmarks, 'index') &&
        isFingerCurled(landmarks, 'ring') &&
        isFingerCurled(landmarks, 'pinky')
      );
    },
  },

  // =============================================
  // ADD YOUR OWN GESTURES BELOW!
  // =============================================
  // Example:
  // {
  //   name: 'Rock On',
  //   emoji: '🤟',
  //   description: 'Index & pinky up, others down',
  //   image: 'images/your_image.jpg',
  //   detect(landmarks) {
  //     return (
  //       isFingerExtended(landmarks, 'index') &&
  //       isFingerCurled(landmarks, 'middle') &&
  //       isFingerCurled(landmarks, 'ring') &&
  //       isFingerExtended(landmarks, 'pinky')
  //     );
  //   },
  // },
];
