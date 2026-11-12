// Every folder in src/videos that has a timeline.json becomes a Remotion composition named after the folder.
import React from 'react';
import {Composition} from 'remotion';
import {VideoComp, timelines} from './VideoComp.jsx';

export const Root = () => (
  <>
    {timelines.keys().map((key) => {
      const slug = key.split('/')[1];
      const t = timelines(key);
      return (
        <Composition
          key={slug}
          id={slug}
          component={VideoComp}
          durationInFrames={t.frames}
          fps={t.fps}
          width={t.width * t.scale}
          height={t.height * t.scale}
          defaultProps={{slug}}
        />
      );
    })}
  </>
);
