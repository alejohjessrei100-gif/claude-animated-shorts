import React from "react";
import { Composition } from "remotion";
import { FryShort, FRY_FRAMES } from "./fry/Fry";
export const RemotionRoot: React.FC = () => (
  <Composition id="FryShort" component={FryShort} durationInFrames={FRY_FRAMES} fps={30} width={1080} height={1920} />
);
