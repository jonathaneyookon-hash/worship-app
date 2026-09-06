// NDI output bridge. Requires the native `grandiose` package and NDI Runtime.
let grandiose = null;
try { grandiose = require('grandiose'); } catch (_) { grandiose = null; }

let sender = null;
let captureTimer = null;
let starting = false;
let lastError = null;

function status() {
  return {
    available: !!grandiose,
    running: !!sender,
    starting,
    error: lastError,
    sourceName: 'Scripture Presenter',
  };
}

async function start(liveWindow, sourceName = 'Scripture Presenter') {
  if (!grandiose) throw new Error('NDI is unavailable. Install the NDI Runtime and run npm install grandiose.');
  if (!liveWindow || liveWindow.isDestroyed()) throw new Error('Open the Live Display window before starting NDI.');
  if (sender || starting) return status();

  starting = true;
  lastError = null;
  try {
    sender = await grandiose.send({ name: sourceName, clockVideo: true, clockAudio: false });
    const FPS = 30;
    captureTimer = setInterval(async () => {
      if (!sender || !liveWindow || liveWindow.isDestroyed()) return;
      try {
        const image = await liveWindow.webContents.capturePage();
        const { width, height } = image.getSize();
        if (!width || !height) return;
        const bitmap = image.getBitmap();
        await sender.video({
          xres: width,
          yres: height,
          frameRateN: FPS,
          frameRateD: 1,
          pictureAspectRatio: width / height,
          frameFormatType: grandiose.FORMAT_TYPE_PROGRESSIVE,
          timecode: grandiose.TIMECODE_UNDEFINED,
          lineStrideBytes: width * 4,
          fourCC: grandiose.FOURCC_BGRA,
          data: bitmap,
        });
      } catch (e) { lastError = e.message; }
    }, Math.round(1000 / FPS));
    return status();
  } catch (e) {
    sender = null;
    lastError = e.message;
    throw e;
  } finally { starting = false; }
}

function stop() {
  if (captureTimer) { clearInterval(captureTimer); captureTimer = null; }
  sender = null;
  starting = false;
}

module.exports = { status, start, stop, isAvailable: () => !!grandiose };
