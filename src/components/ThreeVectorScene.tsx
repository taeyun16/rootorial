import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type {
  BufferAttribute,
  Line,
  Material,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";

export type ConceptVector = {
  x: number;
  y: number;
};

type ThreeVectorSceneProps = {
  value: ConceptVector;
  playing: boolean;
  locale: "ko" | "en";
  onChange: (value: ConceptVector) => void;
  onUserInteraction: () => void;
  onSceneStatusChange: (status: { motionAvailable: boolean; interactive: boolean }) => void;
};

type SceneController = {
  update: (value: ConceptVector) => void;
  render: () => void;
  start: () => void;
  stop: () => void;
};

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

const LIMIT = 2.5;

function clamp(value: number) {
  return Math.max(-LIMIT, Math.min(LIMIT, value));
}

function disposeScene(scene: Scene, renderer: WebGLRenderer) {
  scene.traverse((object: Object3D) => {
    const resource = object as Object3D & {
      geometry?: { dispose: () => void };
      material?: { dispose: () => void } | Array<{ dispose: () => void }>;
    };

    resource.geometry?.dispose();
    if (Array.isArray(resource.material)) {
      resource.material.forEach((material) => material.dispose());
    } else {
      resource.material?.dispose();
    }
  });
  renderer.dispose();
  renderer.forceContextLoss();
}

export function ThreeVectorScene({
  value,
  playing,
  locale,
  onChange,
  onUserInteraction,
  onSceneStatusChange,
}: ThreeVectorSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<SceneController | null>(null);
  const valueRef = useRef(value);
  const playingRef = useRef(playing);
  const onChangeRef = useRef(onChange);
  const onUserInteractionRef = useRef(onUserInteraction);
  const onSceneStatusChangeRef = useRef(onSceneStatusChange);
  const localeRef = useRef(locale);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState<"save-data" | "unavailable" | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const instructionsId = useId();

  useEffect(() => {
    valueRef.current = value;
    controllerRef.current?.update(value);
    controllerRef.current?.render();
  }, [value]);

  useEffect(() => {
    playingRef.current = playing;
    if (playing) controllerRef.current?.start();
    else controllerRef.current?.stop();
    controllerRef.current?.render();
  }, [playing]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onUserInteractionRef.current = onUserInteraction;
  }, [onUserInteraction]);

  useEffect(() => {
    onSceneStatusChangeRef.current = onSceneStatusChange;
  }, [onSceneStatusChange]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const connection = (navigator as NavigatorWithConnection).connection;
    if (connection?.saveData) {
      setFallback("save-data");
      onSceneStatusChangeRef.current({ motionAvailable: false, interactive: false });
      return;
    }

    let cancelled = false;
    let frameId = 0;
    let renderer: WebGLRenderer | null = null;
    let scene: Scene | null = null;
    let camera: PerspectiveCamera | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let visible = true;
    let documentVisible = !document.hidden;
    let dragging = false;
    let lastUiUpdate = 0;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    void import("three")
      .then((THREE) => {
        if (cancelled) return;

        try {
          renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
          });
        } catch {
          setFallback("unavailable");
          onSceneStatusChangeRef.current({ motionAvailable: false, interactive: false });
          return;
        }

        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
        camera.position.set(3.4, 2.7, 7.2);
        camera.lookAt(0, 0, 0);

        const ambient = new THREE.AmbientLight(0xcfe8dc, 1.45);
        const key = new THREE.DirectionalLight(0xfaf7ef, 2.2);
        key.position.set(3, 5, 6);
        const point = new THREE.PointLight(0x9fcbb7, 4.2, 8, 2);
        point.position.set(1.6, 1.4, 2.4);
        scene.add(ambient, key, point);

        const grid = new THREE.GridHelper(7, 14, 0x739783, 0x31443a);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = -0.08;
        const gridMaterial = grid.material as Material & { opacity: number; transparent: boolean };
        gridMaterial.opacity = 0.38;
        gridMaterial.transparent = true;
        scene.add(grid);

        const layerGeometry = new THREE.PlaneGeometry(6.8, 5.2);
        const layerMaterial = new THREE.MeshBasicMaterial({
          color: 0x16201b,
          opacity: 0.18,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const backLayer = new THREE.Mesh(layerGeometry, layerMaterial);
        backLayer.position.z = -0.16;
        scene.add(backLayer);

        const axisMaterial = new THREE.LineBasicMaterial({
          color: 0xd8ded9,
          opacity: 0.72,
          transparent: true,
        });
        const xAxis = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-3.25, 0, 0.02),
            new THREE.Vector3(3.25, 0, 0.02),
          ]),
          axisMaterial,
        );
        const yAxis = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -2.45, 0.02),
            new THREE.Vector3(0, 2.45, 0.02),
          ]),
          axisMaterial,
        );
        scene.add(xAxis, yAxis);

        const arrow = new THREE.ArrowHelper(
          new THREE.Vector3(1, 1, 0).normalize(),
          new THREE.Vector3(0, 0, 0.08),
          2,
          0x9fe0b8,
          0.26,
          0.16,
        );
        const arrowLineMaterial = arrow.line.material as Material & {
          transparent: boolean;
          opacity: number;
        };
        const arrowConeMaterial = arrow.cone.material as Material & {
          transparent: boolean;
          opacity: number;
        };
        arrowLineMaterial.transparent = true;
        arrowLineMaterial.opacity = 0.96;
        arrowConeMaterial.transparent = true;
        arrowConeMaterial.opacity = 0.98;
        scene.add(arrow);

        const endpoint = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 28, 20),
          new THREE.MeshStandardMaterial({
            color: 0xf5fbf7,
            emissive: 0x8fd7ac,
            emissiveIntensity: 1.8,
            roughness: 0.24,
            metalness: 0.08,
          }),
        );
        endpoint.position.z = 0.12;
        scene.add(endpoint);

        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.22, 0.018, 10, 42),
          new THREE.MeshBasicMaterial({
            color: 0xb7f0ca,
            opacity: 0.72,
            transparent: true,
            depthWrite: false,
          }),
        );
        halo.position.z = 0.13;
        scene.add(halo);

        const trail = Array.from({ length: 5 }, (_, index) => {
          const node = new THREE.Mesh(
            new THREE.SphereGeometry(0.1 - index * 0.008, 18, 12),
            new THREE.MeshBasicMaterial({
              color: 0x8ac6a3,
              opacity: 0.3 - index * 0.04,
              transparent: true,
              depthWrite: false,
            }),
          );
          scene?.add(node);
          return node;
        });

        function guideLine() {
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
          const material = new THREE.LineDashedMaterial({
            color: 0x9fcbb7,
            dashSize: 0.09,
            gapSize: 0.07,
            opacity: 0.5,
            transparent: true,
          });
          const line = new THREE.Line(geometry, material);
          line.computeLineDistances();
          scene?.add(line);
          return line;
        }

        const xGuide = guideLine();
        const yGuide = guideLine();

        function setLine(line: Line, start: [number, number], end: [number, number]) {
          const position = line.geometry.getAttribute("position") as BufferAttribute;
          position.setXYZ(0, start[0], start[1], 0.035);
          position.setXYZ(1, end[0], end[1], 0.035);
          position.needsUpdate = true;
          line.computeLineDistances();
        }

        function update(next: ConceptVector) {
          const safe = { x: clamp(next.x), y: clamp(next.y) };
          const direction = new THREE.Vector3(safe.x, safe.y, 0);
          const length = Math.max(0.001, direction.length());
          arrow.setDirection(direction.normalize());
          arrow.setLength(length, Math.min(0.28, length * 0.16), Math.min(0.18, length * 0.1));
          endpoint.position.set(safe.x, safe.y, 0.12);
          halo.position.set(safe.x, safe.y, 0.13);
          setLine(xGuide, [safe.x, 0], [safe.x, safe.y]);
          setLine(yGuide, [0, safe.y], [safe.x, safe.y]);

          trail.forEach((node: Mesh, index) => {
            const offset = index + 1;
            node.position.set(
              safe.x + offset * 0.16,
              safe.y - offset * 0.045 - offset * offset * 0.025,
              0.06 - offset * 0.035,
            );
          });
        }

        function render() {
          if (!renderer || !scene || !camera) return;
          renderer.render(scene, camera);
        }

        update(valueRef.current);

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const hit = new THREE.Vector3();

        function updateFromPointer(event: PointerEvent) {
          if (!camera) return;
          const bounds = canvas!.getBoundingClientRect();
          pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
          pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          if (!raycaster.ray.intersectPlane(dragPlane, hit)) return;

          const next = { x: clamp(hit.x), y: clamp(hit.y) };
          valueRef.current = next;
          update(next);
          render();
          onChangeRef.current(next);
        }

        const handlePointerDown = (event: PointerEvent) => {
          dragging = true;
          canvas.setPointerCapture(event.pointerId);
          onUserInteractionRef.current();
          updateFromPointer(event);
        };
        const handlePointerMove = (event: PointerEvent) => {
          if (dragging) updateFromPointer(event);
        };
        const handlePointerUp = (event: PointerEvent) => {
          dragging = false;
          if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }
          const current = valueRef.current;
          setAnnouncement(
            localeRef.current === "ko"
              ? `벡터 좌표 x ${current.x.toFixed(2)}, y ${current.y.toFixed(2)}`
              : `Vector coordinates x ${current.x.toFixed(2)}, y ${current.y.toFixed(2)}`,
          );
        };

        canvas.addEventListener("pointerdown", handlePointerDown);
        canvas.addEventListener("pointermove", handlePointerMove);
        canvas.addEventListener("pointerup", handlePointerUp);
        canvas.addEventListener("pointercancel", handlePointerUp);

        const resize = () => {
          if (!renderer || !camera) return;
          const { width, height } = canvas.getBoundingClientRect();
          if (width === 0 || height === 0) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          render();
        };

        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);

        if (typeof IntersectionObserver !== "undefined") {
          intersectionObserver = new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? true;
            if (visible) scheduleLoop();
            else stopLoop();
          }, { rootMargin: "120px" });
          intersectionObserver.observe(canvas);
        }

        const handleVisibility = () => {
          documentVisible = !document.hidden;
          if (documentVisible) scheduleLoop();
          else stopLoop();
        };
        document.addEventListener("visibilitychange", handleVisibility);

        const startedAt = performance.now();
        function stopLoop() {
          if (!frameId) return;
          window.cancelAnimationFrame(frameId);
          frameId = 0;
        }

        function scheduleLoop() {
          if (
            frameId
            || cancelled
            || !playingRef.current
            || reducedMotion.matches
            || !visible
            || !documentVisible
          ) return;
          frameId = window.requestAnimationFrame(tick);
        }

        function tick(time: number) {
          frameId = 0;
          if (
            !renderer
            || !scene
            || !camera
            || !playingRef.current
            || reducedMotion.matches
            || !visible
            || !documentVisible
          ) return;

          if (!dragging) {
            const elapsed = (time - startedAt) / 1000;
            const next = {
              x: 1.63 + Math.cos(elapsed * 0.62) * 0.42,
              y: 1.15 + Math.sin(elapsed * 0.74) * 0.28,
            };
            valueRef.current = next;
            update(next);
            if (time - lastUiUpdate > 90) {
              lastUiUpdate = time;
              onChangeRef.current(next);
            }
          }

          halo.rotation.z += 0.006;
          render();
          scheduleLoop();
        }

        controllerRef.current = { update, render, start: scheduleLoop, stop: stopLoop };
        resize();
        setReady(true);
        render();
        onSceneStatusChangeRef.current({
          motionAvailable: !reducedMotion.matches,
          interactive: true,
        });
        scheduleLoop();

        const handleReducedMotion = () => {
          if (reducedMotion.matches) {
            stopLoop();
            render();
            onSceneStatusChangeRef.current({ motionAvailable: false, interactive: true });
          } else {
            onSceneStatusChangeRef.current({ motionAvailable: true, interactive: true });
            scheduleLoop();
          }
        };
        reducedMotion.addEventListener("change", handleReducedMotion);

        const cleanup = () => {
          canvas.removeEventListener("pointerdown", handlePointerDown);
          canvas.removeEventListener("pointermove", handlePointerMove);
          canvas.removeEventListener("pointerup", handlePointerUp);
          canvas.removeEventListener("pointercancel", handlePointerUp);
          document.removeEventListener("visibilitychange", handleVisibility);
          reducedMotion.removeEventListener("change", handleReducedMotion);
        };

        Object.assign(canvas, { __rootorialThreeCleanup: cleanup });
      })
      .catch(() => {
        if (!cancelled) {
          setFallback("unavailable");
          onSceneStatusChangeRef.current({ motionAvailable: false, interactive: false });
        }
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      const canvasWithCleanup = canvas as HTMLCanvasElement & {
        __rootorialThreeCleanup?: () => void;
      };
      canvasWithCleanup.__rootorialThreeCleanup?.();
      delete canvasWithCleanup.__rootorialThreeCleanup;
      controllerRef.current = null;
      if (scene && renderer) disposeScene(scene, renderer);
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    const step = event.shiftKey ? 0.5 : 0.1;
    let next = value;
    if (event.key === "ArrowLeft") next = { ...value, x: clamp(value.x - step) };
    else if (event.key === "ArrowRight") next = { ...value, x: clamp(value.x + step) };
    else if (event.key === "ArrowDown") next = { ...value, y: clamp(value.y - step) };
    else if (event.key === "ArrowUp") next = { ...value, y: clamp(value.y + step) };
    else return;

    event.preventDefault();
    onUserInteraction();
    onChange(next);
    setAnnouncement(
      locale === "ko"
        ? `벡터 좌표 x ${next.x.toFixed(2)}, y ${next.y.toFixed(2)}`
        : `Vector coordinates x ${next.x.toFixed(2)}, y ${next.y.toFixed(2)}`,
    );
  }

  if (fallback) {
    return (
      <div className="three-vector-fallback" role="img" tabIndex={-1} aria-label={
        locale === "ko"
          ? `벡터 좌표 x ${value.x.toFixed(2)}, y ${value.y.toFixed(2)}`
          : `Vector coordinates x ${value.x.toFixed(2)}, y ${value.y.toFixed(2)}`
      }>
        <strong>v = [{value.x.toFixed(2)}, {value.y.toFixed(2)}]</strong>
        <span>
          {fallback === "save-data"
            ? (locale === "ko" ? "데이터 절약 모드에서는 정적 값으로 표시합니다." : "A static value is shown while data saver is enabled.")
            : (locale === "ko" ? "이 환경에서는 3D 장면을 표시할 수 없습니다." : "The 3D scene is unavailable in this environment.")}
        </span>
      </div>
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="three-vector-canvas"
        data-ready={ready ? "true" : "false"}
        tabIndex={0}
        role="application"
        aria-describedby={instructionsId}
        aria-label={
          locale === "ko"
            ? "키보드로 조작하는 3차원 벡터 좌표 평면"
            : "Keyboard-controlled three-dimensional vector plane"
        }
        onKeyDown={handleKeyDown}
      />
      <span className="sr-only" id={instructionsId} aria-live="polite">
        {announcement || (locale === "ko"
          ? "끝점을 드래그하거나 방향키로 움직일 수 있습니다. Shift와 방향키를 함께 누르면 더 크게 이동합니다."
          : "Drag the endpoint or use the arrow keys. Hold Shift with an arrow key for a larger step.")}
      </span>
    </>
  );
}
