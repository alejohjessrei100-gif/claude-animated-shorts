// One video: a low-resolution WebGL canvas, a low-resolution caption canvas and the mixed audio.
// Both canvases are scaled up with nearest neighbour, which is what makes the pixels hard.
import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {renderFrame} from './three/renderer.js';
import {Captions} from './Captions.jsx';

export const timelines = require.context('./videos', true, /timeline\.json$/);
const sceneFiles = require.context('./videos', true, /scenes\.js$/);

export const VideoComp = ({slug}) => {
  const frame = useCurrentFrame();
  const timeline = timelines(`./${slug}/timeline.json`);
  const {scenes} = sceneFiles(`./${slug}/scenes.js`);
  const canvas = useRef(null);

  useLayoutEffect(() => {
    renderFrame(canvas.current, timeline, scenes, frame);
  }, [frame, timeline, scenes]);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <canvas
        ref={canvas}
        width={timeline.width}
        height={timeline.height}
        style={{width: '100%', height: '100%', imageRendering: 'pixelated'}}
      />
      <Captions timeline={timeline} frame={frame} />
      <Audio src={staticFile(`audio/${slug}.wav`)} />
    </AbsoluteFill>
  );
};
