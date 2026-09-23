import { useEffect, useRef } from "react";

/* Babylon은 크기가 커서 HUD가 먼저 뜨도록 동적으로 불러온다. */
export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const [{ Engine }, { createGameScene }] = await Promise.all([import("@babylonjs/core/Engines/engine"), import("@/game/scene")]);
      if (cancelled) return;
      const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
      const handle = await createGameScene(engine, canvas);
      if (cancelled) {
        handle.dispose();
        engine.dispose();
        return;
      }
      engine.runRenderLoop(() => handle.scene.render());
      const onResize = () => engine.resize();
      window.addEventListener("resize", onResize);
      cleanup = () => {
        window.removeEventListener("resize", onResize);
        handle.dispose();
        engine.dispose();
      };
    })().catch((err) => console.warn("정원 장면을 불러오지 못했습니다", err));

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return <canvas ref={canvasRef} className="game-canvas" style={{ touchAction: "none" }} aria-hidden="true" />;
}
