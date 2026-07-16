// ndi.js — optional NDI video output for the Live window.
//
// This is NOT installed by default (see README "NDI Output" section for why
// and how to add it). If the `grandiose` package isn't present, every
// function here is a safe no-op / clear error, so the rest of the app works
// normally without it.

let grandiose = null;
try {
  grandiose = require('grandiose');
} catch (e) {
  grandiose = null;
}

let sender = null;
let captureTimer = null;

function isAvailable() {
  return grandiose !== null;
}

async function start(liveWindow, sourceName = 'Scripture Presenter') {
  if (!grandiose) {
    throw new Error('NDI support is not installed. See README "NDI Output" section.');
  }
  if (!liveWindow || liveWindow.isDestroyed()) {
    throw new Error('Open the Live Display window before starting NDI.');
  }
  if (sender) return; // already running

  sender = await grandiose.send({ name: sourceName, clockVideo: true, clockAudio: false });

  const FPS = 15; // scripture slides are mostly static; 15fps keeps CPU load low
  captureTimer = setInterval(async () => {
    if (!sender || liveWindow.isDestroyed()) return;
    try {
      const image = await liveWindow.webContents.capturePage();
      const { width, height } = image.getSize();
      if (width === 0 || height === 0) return;
      const bitmap = image.getBitmap(); // BGRA buffer

      await sender.video({
        xres: width,
        yres: height,
        frameRateN: FPS * 1000,
        frameRateD: 1000,
        pictureAspectRatio: width / height,
        frameFormatType: grandiose.FORMAT_TYPE_PROGRESSIVE,
        timecode: grandiose.TIMECODE_UNDEFINED,
        lineStrideBytes: width * 4,
        fourCC: grandiose.FOURCC_BGRA,
        data: bitmap,
      });
    } catch (e) {
      // Don't crash the capture loop on an occasional dropped frame.
    }
  }, 1000 / FPS);
}

function stop() {
  if (captureTimer) {
    clearInterval(captureTimer);
    captureTimer = null;
  }
  sender = null; // grandiose releases the sender on garbage collection
}

module.exports = { isAvailable, start, stop };
