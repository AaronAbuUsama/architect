// Spike trial: the trace waterfall in Remotion, to compare with the SVG + Playwright route. Not used by the docs.
import { Composition } from "remotion";
import { Waterfall } from "./Waterfall";

export const Root = () => <Composition id="Waterfall" component={Waterfall} durationInFrames={120} fps={30} width={960} height={540} />;
