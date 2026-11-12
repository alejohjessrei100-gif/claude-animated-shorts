import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('png'); // JPEG frames would smear the hard pixels
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setConcurrency(1); // several WebGL pages at once can lose their contexts
Config.setChromiumOpenGlRenderer('angle'); // on a machine with no GPU pass --gl=swangle
Config.setDelayRenderTimeoutInMilliseconds(120000);
Config.setOverwriteOutput(true);

// No-GPU cloud container: use the pre-installed headless shell (Remotion cannot download its own) and software WebGL.
import {existsSync} from 'node:fs';
const LOCAL_SHELL = process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
if (existsSync(LOCAL_SHELL)) { Config.setBrowserExecutable(LOCAL_SHELL); Config.setChromiumOpenGlRenderer('swangle'); }
