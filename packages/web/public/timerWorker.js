// Background Timer Web Worker for Jus Breathe
// Avoids mobile browser throttles when running in background

let intervalId = null;

self.onmessage = (e) => {
  const { action, interval } = e.data;

  if (action === 'start') {
    if (intervalId) {
      clearInterval(intervalId);
    }
    intervalId = setInterval(() => {
      self.postMessage({ type: 'TICK' });
    }, interval || 1000);
  } else if (action === 'stop') {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};
