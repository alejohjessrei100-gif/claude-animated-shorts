import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('png'); // JPEG frames would smear the hard pixels
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setConcurrency(1); // several WebGL pages at once can lose their contexts
Config.setChromiumOpenGlRenderer('angle'); // on a machine with no GPU pass --gl=swangle
Config.setDelayRenderTimeoutInMilliseconds(120000);
Config.setOverwriteOutput(true);
