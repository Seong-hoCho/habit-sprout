import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { GROWTH_EVENT, lastGrowth } from "./events";

export type GameHandle = { scene: Scene; dispose: () => void };

type GrowthDetail = { level: number; stage: string };

function material(scene: Scene, name: string, diffuse: string, emissive = "#000000") {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = Color3.FromHexString(diffuse);
  mat.emissiveColor = Color3.FromHexString(emissive);
  mat.specularColor = new Color3(0.08, 0.1, 0.08);
  return mat;
}

function makeLeaf(scene: Scene, parent: AbstractMesh, angle: number, scale: number, mat: StandardMaterial) {
  const leaf = MeshBuilder.CreateSphere(`leaf-${angle}`, { diameter: 0.42, segments: 8 }, scene);
  leaf.scaling = new Vector3(scale * 0.55, scale * 1.3, scale * 0.18);
  leaf.position = new Vector3(Math.cos(angle) * 0.34 * scale, 0.55 * scale, Math.sin(angle) * 0.34 * scale);
  leaf.rotation.z = -Math.cos(angle) * 0.5;
  leaf.rotation.y = angle;
  leaf.material = mat;
  leaf.parent = parent;
  return leaf;
}

export async function createGameScene(engine: Engine, _canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.13, 0.2, 0.19, 0);
  // 대상점을 위로 올려 정원이 화면 아래쪽에 놓이게 한다 — 가운데 안내 문구와 겹치지 않도록
  const CAMERA_RADIUS = 6.3;
  const camera = new ArcRotateCamera("habitat-camera", -Math.PI / 2, 1.18, CAMERA_RADIUS, new Vector3(0, 0.62, 0), scene);
  camera.fov = 0.72;
  camera.lowerRadiusLimit = camera.upperRadiusLimit = CAMERA_RADIUS;
  camera.lowerBetaLimit = camera.upperBetaLimit = 1.18;
  camera.detachControl();

  const ambient = new HemisphericLight("soft-ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.78;
  ambient.diffuse = Color3.FromHexString("#d7e9c7");
  ambient.groundColor = Color3.FromHexString("#596d59");
  const glow = new PointLight("companion-glow", new Vector3(0, 1.1, 0.5), scene);
  glow.diffuse = Color3.FromHexString("#f7cc77");
  glow.intensity = 1.7;
  glow.range = 4.5;

  const platformMat = material(scene, "warm-stone", "#b7a684", "#2a241c");
  const ringMat = material(scene, "golden-ring", "#e8b85b", "#a67127");
  const mossMat = material(scene, "moss", "#527f5a", "#112a1a");
  const bellyMat = material(scene, "cream-belly", "#f2ddad", "#433723");
  const leafMat = material(scene, "leaf", "#95bd6b", "#1a3c20");
  const flowerMat = material(scene, "flower", "#f4b078", "#542f23");
  const fireflyMat = material(scene, "firefly", "#f6d77f", "#d7a83c");

  const platform = MeshBuilder.CreateCylinder("stone-platform", { diameter: 2.65, height: 0.22, tessellation: 48 }, scene);
  platform.position.y = -0.58;
  platform.material = platformMat;

  const ring = MeshBuilder.CreateTorus("growth-ring", { diameter: 2.9, thickness: 0.035, tessellation: 64 }, scene);
  ring.position.y = -0.43;
  ring.material = ringMat;

  const root = MeshBuilder.CreateSphere("mossy-root", { diameter: 1.2, segments: 24 }, scene);
  root.position.y = 0.08;
  root.scaling = new Vector3(1, 1.08, 0.82);
  root.material = mossMat;

  const belly = MeshBuilder.CreateSphere("mossy-belly", { diameter: 0.6, segments: 18 }, scene);
  belly.position = new Vector3(0, -0.06, -0.49);
  belly.scaling = new Vector3(1, 1.15, 0.28);
  belly.material = bellyMat;
  belly.parent = root;

  const eyeMat = material(scene, "eyes", "#18231d", "#050806");
  for (const x of [-0.22, 0.22]) {
    const eye = MeshBuilder.CreateSphere(`eye-${x}`, { diameter: 0.11, segments: 12 }, scene);
    eye.position = new Vector3(x, 0.18, -0.53);
    eye.material = eyeMat;
    eye.parent = root;
  }

  const leaves = [0, 1.1, 2.2, 3.3, 4.4].map((angle) => makeLeaf(scene, root, angle, 0.84, leafMat));
  for (const x of [-0.7, 0.7]) {
    const flower = MeshBuilder.CreateSphere(`flower-${x}`, { diameter: 0.18, segments: 10 }, scene);
    flower.position = new Vector3(x, -0.4, 0.18);
    flower.material = flowerMat;
    const stem = MeshBuilder.CreateCylinder(`stem-${x}`, { diameter: 0.025, height: 0.42 }, scene);
    stem.position = new Vector3(x, -0.2, 0.18);
    stem.material = leafMat;
  }

  const fireflies = Array.from({ length: 12 }, (_, index) => {
    const orb = MeshBuilder.CreateSphere(`firefly-${index}`, { diameter: 0.045, segments: 8 }, scene);
    const angle = index * 2.4;
    orb.position = new Vector3(Math.cos(angle) * (2.0 + (index % 3) * 0.15), -0.05 + (index % 4) * 0.3, Math.sin(angle) * 1.2);
    orb.material = fireflyMat;
    return orb;
  });

  // 레벨은 대시보드 습관 기록에서 React가 계산해 보낸 값만 쓴다(자체 저장 없음)
  let level = lastGrowth()?.level ?? 1;
  const applyGrowth = (detail: GrowthDetail) => {
    level = detail.level;
    // 레벨이 올라도 플랫폼 밖으로 넘치지 않게 완만하게 키우고 상한을 둔다
    const scale = Math.min(1.14, 0.88 + level * 0.04);
    root.scaling = new Vector3(scale, scale * 1.08, scale * 0.82);
    leaves.forEach((leaf, index) => { leaf.isVisible = index < Math.min(leaves.length, level + 1); });
    glow.intensity = 1.2 + level * 0.18;
    const ringScale = 1 + Math.min(level, 8) * 0.025;
    ring.scaling = new Vector3(ringScale, ringScale, ringScale);
  };
  applyGrowth({ level, stage: "" });

  const onGrowth = (event: Event) => applyGrowth((event as CustomEvent<GrowthDetail>).detail);
  window.addEventListener(GROWTH_EVENT, onGrowth);
  let elapsed = 0;
  const beforeRender = scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    elapsed += dt;
    root.position.y = 0.08 + Math.sin(elapsed * 1.7) * 0.045;
    ring.rotation.y += dt * 0.12;
    fireflies.forEach((orb, index) => { orb.position.y += Math.sin(elapsed * 1.4 + index) * dt * 0.012; });
  });

  return {
    scene,
    dispose: () => {
      window.removeEventListener(GROWTH_EVENT, onGrowth);
      scene.onBeforeRenderObservable.remove(beforeRender);
      scene.dispose();
    },
  };
}
