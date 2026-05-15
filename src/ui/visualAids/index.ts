import type kaplay from "kaplay";
import type { MathTask, VisualAidId } from "../../types/math";
import { createHundredField } from "./HundredField";
import { createDienesBlocks } from "./DienesBlocks";
import { createStepLadder } from "./StepLadder";
import { createDotArray } from "./DotArray";
import { createPyramidBlocks } from "./PyramidBlocks";
import { createCompletionBlocks } from "./CompletionBlocks";
import { createCountTriangleBlocks } from "./CountTriangleBlocks";
import { createCountTriangleVisualization } from "./CountTriangleVisualization";

export { createHundredField } from "./HundredField";
export { createDienesBlocks } from "./DienesBlocks";
export { createStepLadder } from "./StepLadder";
export { createCoinTray } from "./CoinTray";
export { createDotArray } from "./DotArray";
export { createPyramidBlocks } from "./PyramidBlocks";
export { createCompletionBlocks } from "./CompletionBlocks";
export { createCountTriangleBlocks } from "./CountTriangleBlocks";
export { createCountTriangleVisualization } from "./CountTriangleVisualization";

export interface VisualAidHandle {
  destroy: () => void;
}

/**
 * Spawnt das passende Hilfsmittel zur Aufgabe. Position oben rechts neben den Buttons.
 * Gibt einen Handle zurück, mit dem es beim Walk-out wieder entfernt werden kann.
 */
export function spawnAidForTask(
  k: ReturnType<typeof kaplay>,
  task: MathTask,
  pos: { x: number; y: number },
  aidOverrideOrAttempt?: VisualAidId | number,
): VisualAidHandle | null {
  const aidOverride = typeof aidOverrideOrAttempt === "string" ? aidOverrideOrAttempt : undefined;
  const attemptCount = typeof aidOverrideOrAttempt === "number" ? aidOverrideOrAttempt : 0;
  const aid = aidOverride ?? task.visualAid;
  if (!aid) return null;

  switch (aid) {
    case "hundredField": {
      const meta = task.meta as { start?: number; target?: number; rows?: unknown } | undefined;
      const handle = createHundredField(k, {
        x: pos.x,
        y: pos.y,
        size: 200,
        pathFrom: meta?.start,
        pathTo: meta?.target,
      });
      return { destroy: handle.destroy };
    }
    case "dienesBlocks": {
      const meta = task.meta as { a?: number; b?: number; carry?: boolean } | undefined;
      // Beide Zahlen zeigen wenn a und b bekannt (Addition und Subtraktion)
      if (meta?.a != null && meta?.b != null) {
        return createDienesBlocks(k, { x: pos.x, y: pos.y, minuend: meta.a, subtrahend: meta.b });
      }
      // Generischer Fallback: nur eine Zahl
      const value = meta?.a ?? task.answer;
      return createDienesBlocks(k, { x: pos.x, y: pos.y, value });
    }
    case "stepLadder": {
      const meta = task.meta as { a?: number; b?: number } | undefined;
      if (meta?.a == null || meta?.b == null) return null;
      return createStepLadder(k, { x: pos.x, y: pos.y, a: meta.a, b: meta.b });
    }
    case "coinTray":
      // CoinTray wird szenenseitig spezialisiert (braucht onChange-Callback).
      return null;
    case "dotArray": {
      const meta = task.meta as { a?: number; b?: number } | undefined;
      if (meta?.a == null || meta?.b == null) return null;
      return createDotArray(k, { x: pos.x, y: pos.y, cols: meta.a, rows: meta.b });
    }
    case "pyramidBlocks": {
      type PyramidMeta = {
        pyramid: {
          base: [number | null | false, number | null | false, number | null | false];
          middle: [number | null | false, number | null | false];
          top: number | null | false;
        };
      };
      const meta = task.meta as PyramidMeta | undefined;
      if (!meta?.pyramid) return null;
      return createPyramidBlocks(k, {
        x: pos.x,
        y: pos.y,
        base: meta.pyramid.base,
        middle: meta.pyramid.middle,
        top: meta.pyramid.top,
      });
    }
    case "completionBlocks": {
      const meta = task.meta as { start?: number; target?: number } | undefined;
      if (meta?.start == null || meta?.target == null) return null;
      return createCompletionBlocks(k, {
        x: pos.x,
        y: pos.y,
        start: meta.start,
        target: meta.target,
        answer: task.answer,
        attemptCount,
      });
    }
    case "countTriangleBlocks": {
      type CountTriangleMeta = {
        triangle: { inner: [number, number, number]; outer: [number, number, number] };
        hidden: { area: "inner" | "outer"; index: number };
      };
      const meta = task.meta as CountTriangleMeta | undefined;
      if (!meta?.triangle || !meta?.hidden) return null;
      return createCountTriangleBlocks(k, {
        x: pos.x,
        y: pos.y,
        inner: meta.triangle.inner,
        outer: meta.triangle.outer,
        hiddenArea: meta.hidden.area,
        hiddenIndex: meta.hidden.index,
        attemptCount,
      });
    }
    case "countTriangleVisualization": {
      type CountTriangleMeta = {
        corners: [number, number, number];
        sides: [number, number, number];
        hiddenSideIndex: number;
        hiddenCornerIndex: number;
      };
      const meta = task.meta as CountTriangleMeta | undefined;
      if (!meta?.corners || !meta?.sides) return null;
      return createCountTriangleVisualization(k, {
        x: pos.x,
        y: pos.y,
        corners: meta.corners,
        sides: meta.sides,
        hiddenSideIndex: meta.hiddenSideIndex ?? -1,
        hiddenCornerIndex: meta.hiddenCornerIndex ?? -1,
        attemptCount,
      });
    }
  }
  return null;
}
