// #region Imports

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { IOrbitCamera } from './IOrbitCamera';
import type { IOrbitNode } from './IOrbitNode';
import type { IOrbitScene } from './IOrbitScene';
import type { IOrbitRendererOptions } from './IOrbitRendererOptions';
import type { IOrbitPalette } from './IOrbitPalette';
import type { IOrbitProjectedNode } from './IOrbitProjectedNode';
import type { IOrbitCrewMember } from './IOrbitCrewMember';
import type { IOrbitFlybyLabel } from './IOrbitFlybyLabel';
import type { IOrbitLabel } from './IOrbitLabel';
import { OrbitFlybyFleet } from './OrbitFlybyFleet';
import { createOrbitPlanet } from './createOrbitPlanet';
import { fitOrbitCamera } from './fitOrbitCamera';
import { orbitNodeVariant } from './orbitNodeVariant';
import { projectOrbitLabels } from './projectOrbitLabels';

// #endregion

/** Lazy WebGL world with demand rendering and bounded, optional project shuttle flights. @public */
export class OrbitCanvasRenderer {
  // #region Fields

  private readonly _renderer: THREE.WebGLRenderer;
  private readonly _camera = new THREE.PerspectiveCamera(46, 1, 0.08, 4000);
  private readonly _world = new THREE.Scene();
  private readonly _controls: OrbitControls;
  private readonly _raycaster = new THREE.Raycaster();
  private readonly _pointer = new THREE.Vector2();
  private readonly _size = new THREE.Vector2(320, 480);
  private readonly _bodies = new Map<string, THREE.Object3D>();
  private readonly _radii = new Map<string, number>();
  private readonly _nodes = new Map<string, IOrbitNode>();
  private readonly _ticketIds: string[] = [];
  private readonly _pickables: THREE.Object3D[] = [];
  private readonly _listeners = new AbortController();
  private readonly _ambient = new THREE.AmbientLight(undefined, 1.35);
  private readonly _key = new THREE.DirectionalLight(undefined, 2.2);
  private readonly _sunlight = new THREE.PointLight(undefined, 350, 0, 1.55);
  private readonly _textures = new Map<string, THREE.Texture>();
  private readonly _pendingTextures = new Set<string>();
  private readonly _failedTextures = new Set<string>();
  private readonly _flybys: OrbitFlybyFleet;
  private _flybyLabels: readonly IOrbitFlybyLabel[] = [];
  private _flybyWake = 0;
  private _lastFlybyFrame = 0;
  private _labelScene?: IOrbitScene;
  private _labelKey = '';
  private _labels: readonly IOrbitLabel[] = [];
  private _palette: IOrbitPalette;
  private _geometry = new THREE.Group();
  private _connections = new THREE.Group();
  private _selection = new THREE.Group();
  private _scene: IOrbitScene = { nodes: [], rings: [], edges: [], ticketCount: 0 };
  private _sceneKey = '';
  private _selectedId?: string;
  private _pinnedId?: string;
  private _frameId = 0;
  private _disposed = false;
  private _contextLost = false;
  private _visible = true;
  private _hasRendered = false;
  private _fitted = true;
  private _fitDistance = 0;
  private _reducedMotion: boolean;
  private _down?: { id: number; x: number; y: number; moved: boolean };
  private readonly _pointers = new Set<number>();
  private _lastDrag = false;
  private _lastClick?: { id: string; x: number; y: number; time: number };
  private _transition?: {
    from: IOrbitCamera;
    to: IOrbitCamera;
    started: number;
  };

  // #endregion

  // #region Ctor

  /** Creates native WebGL and controls without starting an autonomous animation. @public */
  public constructor(
    private readonly _canvas: HTMLCanvasElement,
    private readonly _options: IOrbitRendererOptions,
  ) {
    this._palette = _options.palette;
    this._reducedMotion = _options.reducedMotion;
    this._flybys = new OrbitFlybyFleet(this._palette, (source) => this.texture(source, ''));
    this._renderer = new THREE.WebGLRenderer({
      canvas: _canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this._renderer.setClearColor(new THREE.Color(this._palette.background), 0);
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.15;
    this._controls = new OrbitControls(this._camera, _canvas);
    this._controls.enableDamping = false;
    this._controls.enablePan = true;
    this._controls.screenSpacePanning = true;
    this._controls.rotateSpeed = 0.62;
    this._controls.zoomSpeed = 0.85;
    this._controls.minDistance = 2.8;
    this._controls.maxDistance = 2000;
    this._controls.maxPolarAngle = Math.PI - 0.04;
    this._controls.addEventListener('start', this._onControlsStart);
    this._controls.addEventListener('change', this._onControlsChange);
    this._controls.addEventListener('end', this._onControlsEnd);
    this._ambient.color.copy(this.illumination());
    this._key.color.copy(this.illumination());
    this._key.position.set(16, 24, 30);
    this._sunlight.color.set(this._palette.warning);
    this._world.add(this._ambient, this._key, this._sunlight);
    this._world.add(this._geometry, this._connections, this._selection, this._flybys.root);
    const eventOptions = { signal: this._listeners.signal };
    _canvas.addEventListener('pointerdown', this._onPointerDown, eventOptions);
    _canvas.addEventListener('pointermove', this._onPointerMove, eventOptions);
    _canvas.addEventListener('pointerup', this._onPointerUp, eventOptions);
    _canvas.addEventListener('pointercancel', this._onPointerCancel, eventOptions);
    _canvas.addEventListener('dblclick', this._onDoubleClick, eventOptions);
    // Cmd-wheel remains a browser action. Trackpad pinch (Ctrl-wheel) belongs to OrbitControls.
    _canvas.addEventListener('wheel', this._onBrowserWheel, {
      ...eventOptions,
      capture: true,
      passive: true,
    });
    _canvas.addEventListener('webglcontextlost', this._onContextLost, eventOptions);
    _canvas.addEventListener('webglcontextrestored', this._onContextRestored, eventOptions);
  }

  // #endregion

  // #region Methods

  /** Updates immutable data without resetting a user's camera or selection on polling. @public */
  public setScene(scene: IOrbitScene): void {
    const key = JSON.stringify(scene);
    if (key === this._sceneKey) return;
    this._sceneKey = key;
    this._scene = scene;
    this.rebuildScene();
    this.measureFit();
    if (this._fitted) this.fit(false);
    this.invalidate();
  }

  /** Saved project profiles decorate the scene without entering picking, fitting or ticket geometry. @public */
  public setCrew(crew: readonly IOrbitCrewMember[]): void {
    this._flybys.setCrew(crew, performance.now());
    this.syncFlybys();
    this.invalidate();
  }

  /** Repaints public theme colours without resetting camera, selection or native controls. @public */
  public setPalette(palette: IOrbitPalette): void {
    if (JSON.stringify(palette) === JSON.stringify(this._palette)) return;
    this._palette = palette;
    this._renderer.setClearColor(new THREE.Color(palette.background), 0);
    this._ambient.color.copy(this.illumination());
    this._key.color.copy(this.illumination());
    this._sunlight.color.set(palette.warning);
    this._flybys.setPalette(palette);
    this.rebuildScene();
    this.invalidate();
  }

  /** Keeps a stable selected world ID, even while its DOM label is outside the viewport. @public */
  public setSelected(id?: string): void {
    if (id === this._selectedId) return;
    this._selectedId = id;
    this.updateSelection();
    this.invalidate();
  }

  /** Prioritises the same DOM object while it owns keyboard focus. @public */
  public setPinned(id?: string): void {
    if (id === this._pinnedId) return;
    this._pinnedId = id;
    this.invalidate();
  }

  /** Fits the complete scene, including all asteroids and orbital paths. @public */
  public fit(animate = true): void {
    this._fitted = true;
    const camera = fitOrbitCamera(this._scene, this._size.x, this._size.y);
    this.moveTo(camera, animate);
  }

  /**
   * Moves the camera to a distance relative to the fitted view without changing its direction or
   * target: 1 is the fitted 100 %, 2 is twice as close. A zoom never changes selection.
   *
   * @public
   */
  public zoomTo(scale: number): void {
    if (!Number.isFinite(scale) || scale <= 0 || this._fitDistance <= 0) return;
    const current = this._camera.position.distanceTo(this._controls.target);
    if (current <= 0) return;
    this.zoomBy(current / (this._fitDistance / scale));
  }

  /** Positive values above one move closer; a zoom never changes selection. @public */
  public zoomBy(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) return;
    this._transition = undefined;
    this._fitted = false;
    const offset = this._camera.position.clone().sub(this._controls.target);
    const distance = THREE.MathUtils.clamp(
      offset.length() / factor,
      this._controls.minDistance,
      this._controls.maxDistance,
    );
    offset.setLength(distance);
    this._camera.position.copy(this._controls.target).add(offset);
    this._controls.update();
    this.invalidate();
    this._options.cameraChanged(this.cameraValue());
  }

  /** Moves into the actual world anchor; group membership determines the useful close-up extent. @public */
  public focusNode(id: string): void {
    const node = this._nodes.get(id);
    if (!node) return;
    this._fitted = false;
    const target = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
    let distance =
      node.kind === 'ticket'
        ? 12
        : node.kind === 'production'
          ? 19
          : node.kind === 'target'
            ? 11
            : 22;
    if (node.kind === 'group' && node.memberIds?.length) {
      const members = node.memberIds
        .map((member) => this._nodes.get(member) ?? this._nodes.get(`ticket:${member}`))
        .filter((member): member is IOrbitNode => !!member);
      const nearby = members
        .map((member) =>
          Math.hypot(
            member.position.x - target.x,
            member.position.y - target.y,
            member.position.z - target.z,
          ),
        )
        .sort((a, b) => a - b);
      distance = Math.max(14, Math.min(36, (nearby[Math.min(8, nearby.length - 1)] ?? 7) * 2.5));
    }
    const direction = this._camera.position.clone().sub(this._controls.target).normalize();
    const cameraPosition = target.clone().addScaledVector(direction, distance);
    this.moveTo(
      {
        position: { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z },
        target: { x: target.x, y: target.y, z: target.z },
      },
      true,
    );
  }

  /** Restores only finite camera values; Angular camera feedback never restarts a transition. @public */
  public restoreCamera(camera: IOrbitCamera): void {
    const values = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
      camera.target.x,
      camera.target.y,
      camera.target.z,
    ];
    if (!values.every(Number.isFinite)) return;
    if (
      Math.hypot(
        camera.position.x - camera.target.x,
        camera.position.y - camera.target.y,
        camera.position.z - camera.target.z,
      ) < 0.1
    )
      return;
    const current = this.cameraValue();
    if (JSON.stringify(current) === JSON.stringify(camera)) return;
    this._fitted = false;
    this.moveTo(camera, false);
  }

  /** Responsive canvases retain user orientation; a fitted system is re-fitted with its new margins. @public */
  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    const x = Math.max(1, Math.round(width));
    const y = Math.max(1, Math.round(height));
    if (this._size.x === x && this._size.y === y && this._hasRendered) return;
    this._size.set(x, y);
    this._renderer.setSize(x, y, false);
    this._camera.aspect = x / y;
    this._camera.updateProjectionMatrix();
    this.measureFit();
    if (this._fitted) this.fit(false);
    this.invalidate();
  }

  /** Offscreen scenes stop finite transitions; the first frame is always available to a hidden window. @public */
  public setVisible(visible: boolean): void {
    this._visible = visible;
    this.syncFlybys();
    if (!visible && this._hasRendered) {
      if (this._transition) this.applyCamera(this._transition.to);
      this._transition = undefined;
      cancelAnimationFrame(this._frameId);
      this._frameId = 0;
      this.publish('paused');
    } else this.invalidate();
  }

  /** Reduced motion completes the current camera transition immediately. @public */
  public setReducedMotion(reduced: boolean): void {
    this._reducedMotion = reduced;
    this.syncFlybys();
    if (reduced && this._transition) {
      this.applyCamera(this._transition.to);
      this._transition = undefined;
      this._options.cameraChanged(this.cameraValue());
    }
    this.invalidate();
  }

  /** Releases GPU allocations, event capture and pending animation frames. @public */
  public dispose(): void {
    this._disposed = true;
    window.clearTimeout(this._flybyWake);
    this._flybys.dispose();
    cancelAnimationFrame(this._frameId);
    this._frameId = 0;
    this._listeners.abort();
    this._controls.removeEventListener('start', this._onControlsStart);
    this._controls.removeEventListener('change', this._onControlsChange);
    this._controls.removeEventListener('end', this._onControlsEnd);
    this._controls.dispose();
    this.disposeGroup(this._geometry);
    this.disposeGroup(this._connections);
    this.disposeGroup(this._selection);
    this._world.clear();
    for (const texture of this._textures.values()) texture.dispose();
    this._textures.clear();
    this._renderer.dispose();
    this._renderer.forceContextLoss();
  }

  /** @private */
  private rebuildScene(): void {
    this.disposeGroup(this._geometry);
    this._geometry = new THREE.Group();
    this._world.add(this._geometry);
    this._bodies.clear();
    this._radii.clear();
    this._nodes.clear();
    this._ticketIds.length = 0;
    this._pickables.length = 0;
    for (const node of this._scene.nodes) this._nodes.set(node.id, node);
    if (this._options.showStars !== false) this.addStars();
    this.addRings();
    this.addBodies();
    this.addTickets();
    this.updateSelection();
  }

  /** The fitted camera distance is the 100 % reference of the zoom readout and `zoomTo`. @private */
  private measureFit(): void {
    const camera = fitOrbitCamera(this._scene, this._size.x, this._size.y);
    this._fitDistance = Math.hypot(
      camera.position.x - camera.target.x,
      camera.position.y - camera.target.y,
      camera.position.z - camera.target.z,
    );
    this._controls.maxDistance = Math.max(400, this._fitDistance * 4);
    this._camera.far = Math.max(2000, this._fitDistance * 10);
    this._camera.updateProjectionMatrix();
  }

  /** Light comes from the brighter scheme pole; light-mode text must not become black illumination. @private */
  private illumination(): THREE.Color {
    const background = new THREE.Color(this._palette.background);
    const foreground = new THREE.Color(this._palette.foreground);
    return background.r + background.g + background.b > foreground.r + foreground.g + foreground.b
      ? background
      : foreground;
  }

  /** @private */
  private colour(node: IOrbitNode): THREE.Color {
    const variant = orbitNodeVariant(node);
    const palette = this._palette;
    return new THREE.Color(
      variant === 'default' || variant === 'neutral' || variant === 'tertiary'
        ? palette.neutral
        : palette[variant],
    );
  }

  /** @private */
  private addStars(): void {
    const positions: number[] = [];
    for (let index = 0; index < 360; index += 1) {
      const angle = index * 2.399963;
      const y = 1 - (2 * (index + 0.5)) / 360;
      const radius = Math.sqrt(1 - y * y);
      positions.push(Math.cos(angle) * radius * 700, y * 700, Math.sin(angle) * radius * 700);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this._geometry.add(
      new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color: this._palette.foreground,
          size: 0.65,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
        }),
      ),
    );
  }

  /** @private */
  private addRings(): void {
    for (const ring of this._scene.rings) {
      const points: THREE.Vector3[] = [];
      for (let index = 0; index < 192; index += 1) {
        const angle = (index / 192) * Math.PI * 2;
        points.push(
          new THREE.Vector3(Math.cos(angle) * ring.radius, 0, Math.sin(angle) * ring.radius),
        );
      }
      // Quiet neutral guides, as the diagram draws them: destination orbits dashed, the work-item
      // belt solid.
      const material =
        ring.style === 'dashed'
          ? new THREE.LineDashedMaterial({
              color: this._palette.neutral,
              transparent: true,
              opacity: 0.45,
              dashSize: 0.32,
              gapSize: 0.26,
              depthWrite: false,
            })
          : new THREE.LineBasicMaterial({
              color: this._palette.neutral,
              transparent: true,
              opacity: 0.3,
              depthWrite: false,
            });
      const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material);
      if (ring.style === 'dashed') orbit.computeLineDistances();
      orbit.rotation.order = 'YXZ';
      orbit.rotation.x = ring.tilt;
      orbit.rotation.y = ring.rotation;
      this._geometry.add(orbit);
    }
  }

  /** @private */
  private addBodies(): void {
    // A planet is lit from outside; it must not illuminate itself like the original Sun.
    this._sunlight.intensity =
      (this._scene.nodes.find((node) => node.kind === 'production')?.celestialBody ?? 'sun') ===
      'sun'
        ? 350
        : 0;
    for (const node of this._scene.nodes) {
      // Tickets are instanced below; a cluster is its label, not a body of its own.
      if (node.kind === 'ticket' || node.kind === 'group') continue;
      let body: THREE.Mesh;
      const radius = node.kind === 'production' ? 3.25 : node.kind === 'target' ? 1.15 : 0.42;
      if (node.kind === 'production' && (node.celestialBody ?? 'sun') === 'sun') {
        body = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 56, 40),
          new THREE.ShaderMaterial({
            uniforms: {
              warm: { value: new THREE.Color(this._palette.warning) },
              hot: { value: this.illumination() },
            },
            vertexShader:
              'varying vec3 vPosition; varying vec3 vNormal; varying vec3 vView; void main(){vPosition=position;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
            fragmentShader:
              'varying vec3 vPosition; varying vec3 vNormal; varying vec3 vView; uniform vec3 warm; uniform vec3 hot; float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);} float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);} void main(){float n=noise(vPosition*3.4)*0.55+noise(vPosition*8.0)*0.3+noise(vPosition*19.0)*0.15;float rim=pow(max(dot(normalize(vNormal),normalize(vView)),0.0),0.35);vec3 c=mix(warm*0.8,hot*1.45,smoothstep(0.18,0.92,n))*mix(0.65,1.0,rim);gl_FragColor=vec4(c,1.0);}',
          }),
        );
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(radius * 1.16, 40, 32),
          new THREE.ShaderMaterial({
            uniforms: { glow: { value: new THREE.Color(this._palette.warning) } },
            vertexShader:
              'varying vec3 n;varying vec3 v;void main(){n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
            fragmentShader:
              'varying vec3 n;varying vec3 v;uniform vec3 glow;void main(){float a=pow(1.0-abs(dot(normalize(n),normalize(v))),2.4);gl_FragColor=vec4(glow,a*0.62);}',
            transparent: true,
            blending: THREE.NormalBlending,
            side: THREE.BackSide,
            depthWrite: false,
          }),
        );
        halo.position.set(node.position.x, node.position.y, node.position.z);
        this._geometry.add(halo);
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        if (context) {
          const glow = context.createRadialGradient(64, 64, 9, 64, 64, 64);
          const colour = new THREE.Color(this._palette.warning).getStyle();
          glow.addColorStop(0, colour);
          glow.addColorStop(0.28, colour);
          glow.addColorStop(1, 'transparent');
          context.fillStyle = glow;
          context.fillRect(0, 0, 128, 128);
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: new THREE.CanvasTexture(canvas),
              color: this._palette.warning,
              transparent: true,
              opacity: 0.23,
              blending: THREE.NormalBlending,
              depthWrite: false,
            }),
          );
          sprite.scale.set(19, 19, 1);
          sprite.position.copy(halo.position);
          this._geometry.add(sprite);
        }
      } else if (
        node.celestialBody &&
        node.celestialBody !== 'sun' &&
        (node.kind === 'production' || node.kind === 'target')
      ) {
        const name =
          node.celestialBody === 'earth'
            ? 'earth_daymap'
            : node.celestialBody === 'venus'
              ? 'venus_atmosphere'
              : node.celestialBody;
        body = createOrbitPlanet(
          node.celestialBody,
          radius,
          this.texture(`2k_${name}.jpg`),
          node.celestialBody === 'saturn' ? this.texture('2k_saturn_ring_alpha.png') : undefined,
        );
      } else {
        body = new THREE.Mesh(
          node.kind === 'target'
            ? new THREE.SphereGeometry(radius, 36, 28)
            : new THREE.IcosahedronGeometry(radius, 1),
          new THREE.MeshStandardMaterial({
            color: this.colour(node),
            roughness: 0.72,
            metalness: 0.14,
            emissive: this.colour(node),
            emissiveIntensity: node.kind === 'target' ? 0.14 : 0.35,
          }),
        );
      }
      body.position.set(node.position.x, node.position.y, node.position.z);
      body.traverse((part) => {
        part.userData['nodeId'] = node.id;
      });
      this._geometry.add(body);
      this._bodies.set(node.id, body);
      this._radii.set(node.id, radius);
      this._pickables.push(body);
    }
  }

  /** Loads only selected, packaged maps. Shared textures survive theme/scene rebuilds. @private */
  private texture(name: string, directory = 'orbit'): THREE.Texture {
    const source = directory ? `${directory}/${name}` : name;
    const cached = this._textures.get(source);
    if (cached) return cached;
    this._pendingTextures.add(source);
    const texture = new THREE.TextureLoader().load(
      new URL(source, document.baseURI).href,
      (loaded) => {
        this._pendingTextures.delete(source);
        if (this._disposed) loaded.dispose();
        else this.invalidate();
      },
      undefined,
      () => {
        this._pendingTextures.delete(source);
        this._failedTextures.add(source);
        this.invalidate();
      },
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, this._renderer.capabilities.getMaxAnisotropy());
    this._textures.set(source, texture);
    return texture;
  }

  /** @private */
  private addTickets(): void {
    const tickets = this._scene.nodes.filter((node) => node.kind === 'ticket');
    if (!tickets.length) return;
    const asteroids = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({
        roughness: 0.91,
        metalness: 0.06,
        emissive: this._palette.neutral,
        emissiveIntensity: 0.08,
      }),
      tickets.length,
    );
    const transform = new THREE.Object3D();
    tickets.forEach((node, index) => {
      let hash = 2166136261;
      for (const character of node.id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
      const size = 0.3 + (((hash >>> 0) % 101) / 100) * 0.08;
      transform.position.set(node.position.x, node.position.y, node.position.z);
      transform.rotation.set(hash % 7, hash % 11, hash % 13);
      transform.scale.setScalar(size);
      transform.updateMatrix();
      asteroids.setMatrixAt(index, transform.matrix);
      asteroids.setColorAt(index, this.colour(node));
      this._ticketIds.push(node.id);
      this._radii.set(node.id, size);
    });
    asteroids.instanceMatrix.needsUpdate = true;
    if (asteroids.instanceColor) asteroids.instanceColor.needsUpdate = true;
    asteroids.computeBoundingSphere();
    asteroids.userData['tickets'] = true;
    this._geometry.add(asteroids);
    this._pickables.push(asteroids);
  }

  /** @private */
  private updateSelection(): void {
    this.disposeGroup(this._selection);
    this._selection = new THREE.Group();
    this._world.add(this._selection);
    this.disposeGroup(this._connections);
    this._connections = new THREE.Group();
    this._world.add(this._connections);
    const node = this._selectedId ? this._nodes.get(this._selectedId) : undefined;
    // A selected cluster is marked by its label and the inspector, not by a marker in space.
    if (!node || node.kind === 'group') return;
    const celestial = node.kind === 'production' || node.kind === 'target';
    const radius = (this._radii.get(node.id) ?? 0.3) * (celestial ? 1.035 : 1.9);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(radius, celestial ? 64 : 20, celestial ? 48 : 14),
      new THREE.MeshBasicMaterial({
        color: this._palette.foreground,
        wireframe: !celestial,
        side: celestial ? THREE.BackSide : THREE.FrontSide,
        transparent: true,
        opacity: celestial ? 0.55 : 0.8,
        depthWrite: false,
      }),
    );
    marker.position.set(node.position.x, node.position.y, node.position.z);
    this._selection.add(marker);
    const related = new Set(node.relatedIds ?? []);
    for (const other of this._scene.nodes)
      if (other.relatedIds?.includes(node.id)) related.add(other.id);
    for (const edge of this._scene.edges) {
      if (edge.from === node.id) related.add(edge.to);
      if (edge.to === node.id) related.add(edge.from);
    }
    for (const id of related) {
      const target = this._nodes.get(id);
      if (!target) continue;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(node.position.x, node.position.y, node.position.z),
        new THREE.Vector3(target.position.x, target.position.y, target.position.z),
      ]);
      this._connections.add(
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color: this.colour(target),
            transparent: true,
            opacity: 0.62,
            depthWrite: false,
          }),
        ),
      );
    }
  }

  /** @private */
  private disposeGroup(group: THREE.Group): void {
    group.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.Line ||
        object instanceof THREE.Points ||
        object instanceof THREE.Sprite
      ) {
        if ('geometry' in object) object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (
            'map' in material &&
            material.map instanceof THREE.Texture &&
            ![...this._textures.values()].includes(material.map)
          )
            material.map.dispose();
          material.dispose();
        }
      }
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    group.clear();
    this._world.remove(group);
  }

  /** @private */
  private cameraValue(): IOrbitCamera {
    const p = this._camera.position;
    const t = this._controls.target;
    return { position: { x: p.x, y: p.y, z: p.z }, target: { x: t.x, y: t.y, z: t.z } };
  }

  /** @private */
  private applyCamera(value: IOrbitCamera): void {
    this._camera.position.set(value.position.x, value.position.y, value.position.z);
    this._controls.target.set(value.target.x, value.target.y, value.target.z);
    this._controls.update();
  }

  /** @private */
  private moveTo(value: IOrbitCamera, animate: boolean): void {
    if (animate && !this._reducedMotion && this._visible && this._hasRendered) {
      this._transition = { from: this.cameraValue(), to: value, started: performance.now() };
    } else {
      this._transition = undefined;
      this.applyCamera(value);
      this._options.cameraChanged(this.cameraValue());
    }
    this.invalidate();
  }

  /** @private */
  private invalidate(): void {
    if (
      this._disposed ||
      this._contextLost ||
      this._frameId ||
      (!this._visible && this._hasRendered)
    )
      return;
    this._frameId = requestAnimationFrame(this._render);
  }

  /** @private */
  private readonly _render = (time: number): void => {
    this._frameId = 0;
    if (this._disposed || this._contextLost) return;
    if (!this._transition && this._flybys.flying && time - this._lastFlybyFrame < 32) {
      this.invalidate();
      return;
    }
    this._lastFlybyFrame = time;
    const transition = this._transition;
    if (transition) {
      const progress = Math.min(1, (time - transition.started) / 560);
      const t = progress * progress * (3 - 2 * progress);
      const mix = (a: number, b: number): number => a + (b - a) * t;
      this.applyCamera({
        position: {
          x: mix(transition.from.position.x, transition.to.position.x),
          y: mix(transition.from.position.y, transition.to.position.y),
          z: mix(transition.from.position.z, transition.to.position.z),
        },
        target: {
          x: mix(transition.from.target.x, transition.to.target.x),
          y: mix(transition.from.target.y, transition.to.target.y),
          z: mix(transition.from.target.z, transition.to.target.z),
        },
      });
      if (progress === 1) {
        this._transition = undefined;
        this._options.cameraChanged(this.cameraValue());
      }
    }
    try {
      this._flybyLabels = this._flybys.update(
        time,
        this._camera,
        this._controls.target,
        this._size.x,
        this._size.y,
      );
      this._renderer.render(this._world, this._camera);
      this._hasRendered = true;
      this.publish(this._transition ? 'animating' : 'ready');
    } catch {
      this._flybys.setActive(false, time);
      window.clearTimeout(this._flybyWake);
      this._options.failed();
      return;
    }
    if (this._transition || this._flybys.flying) this.invalidate();
    else this.scheduleFlybyWake();
  };

  /** @private */
  private syncFlybys(): void {
    const active = this._visible && !this._reducedMotion && !this._contextLost && !this._disposed;
    this._flybys.setActive(active, performance.now());
    if (!active) this._flybyLabels = [];
    this.scheduleFlybyWake();
  }

  /** Idle gaps use one cancellable wake-up; no background rendering runs between passes. @private */
  private scheduleFlybyWake(): void {
    window.clearTimeout(this._flybyWake);
    this._flybyWake = 0;
    if (this._disposed || this._flybys.flying || !Number.isFinite(this._flybys.nextWakeAt)) return;
    this._flybyWake = window.setTimeout(
      () => {
        this._flybyWake = 0;
        this.invalidate();
      },
      Math.max(0, this._flybys.nextWakeAt - performance.now()),
    );
  }

  /** @private */
  private publish(state: 'ready' | 'animating' | 'paused' | 'context-lost'): void {
    this._camera.updateMatrixWorld();
    const distance = this._camera.position.distanceTo(this._controls.target);
    const zoom = distance < 18 ? 'tickets' : distance < 48 ? 'groups' : 'system';
    const key = JSON.stringify([
      this.cameraValue(),
      this._size.x,
      this._size.y,
      this._selectedId,
      this._pinnedId,
    ]);
    if (this._labelScene !== this._scene || this._labelKey !== key) {
      const projected: IOrbitProjectedNode[] = [];
      const position = new THREE.Vector3();
      for (const node of this._scene.nodes) {
        position.set(node.position.x, node.position.y, node.position.z);
        const depth = position.distanceTo(this._camera.position);
        const clip = position.clone().project(this._camera);
        if (clip.z < -1 || clip.z > 1 || Math.abs(clip.x) > 1.1 || Math.abs(clip.y) > 1.1) continue;
        // A near-side solid body hides labels on objects behind it; labels do not float through the Sun.
        const direction = position.clone().sub(this._camera.position).normalize();
        let hidden = false;
        for (const [id, body] of this._bodies) {
          if (id === node.id || (this._radii.get(id) ?? 0) < 0.8) continue;
          const offset = body.position.clone().sub(this._camera.position);
          const along = offset.dot(direction);
          if (
            along > 0 &&
            along < depth - 0.1 &&
            offset.lengthSq() - along * along < Math.pow(this._radii.get(id) ?? 0, 2)
          ) {
            hidden = true;
            break;
          }
        }
        if (hidden) continue;
        const radius =
          ((((this._radii.get(node.id) ?? 0.3) * (node.celestialBody === 'saturn' ? 2.32 : 1)) /
            Math.max(0.1, depth)) *
            this._size.y) /
          (2 * Math.tan((46 * Math.PI) / 360));
        projected.push({
          node,
          x: ((clip.x + 1) * this._size.x) / 2,
          y: ((1 - clip.y) * this._size.y) / 2,
          depth,
          radius,
        });
      }
      this._labels = projectOrbitLabels(
        projected,
        this._size.x,
        this._size.y,
        zoom,
        this._selectedId,
        this._pinnedId,
      );
      this._labelScene = this._scene;
      this._labelKey = key;
    }
    this._options.frame({
      camera: this.cameraValue(),
      labels: this._labels,
      zoomLevel: zoom,
      state,
      flybys: this._flybyLabels,
      activeFlybyCount: this._flybys.count,
      ticketCount: this._ticketIds.length,
      zoom: this._fitDistance > 0 && distance > 0 ? this._fitDistance / distance : 1,
      assetState: this._failedTextures.size
        ? 'unavailable'
        : this._pendingTextures.size
          ? 'loading'
          : 'ready',
    });
  }

  /** @private */
  private pick(x: number, y: number): string | undefined {
    const bounds = this._canvas.getBoundingClientRect();
    this._pointer.set(
      ((x - bounds.left) / bounds.width) * 2 - 1,
      (-(y - bounds.top) / bounds.height) * 2 + 1,
    );
    this._raycaster.setFromCamera(this._pointer, this._camera);
    const hit = this._raycaster.intersectObjects(this._pickables, true)[0];
    if (!hit) return undefined;
    return hit.object.userData['tickets'] && hit.instanceId !== undefined
      ? this._ticketIds[hit.instanceId]
      : (hit.object.userData['nodeId'] as string | undefined);
  }

  /** @private */
  private readonly _onControlsStart = (): void => {
    this._transition = undefined;
  };
  /** @private */
  private readonly _onControlsChange = (): void => {
    this.invalidate();
  };
  /** @private */
  private readonly _onControlsEnd = (): void => {
    this._options.cameraChanged(this.cameraValue());
  };
  /** @private */
  private readonly _onBrowserWheel = (event: WheelEvent): void => {
    if (event.metaKey) event.stopImmediatePropagation();
    else this._fitted = false;
  };
  /** @private */
  private readonly _onPointerDown = (event: PointerEvent): void => {
    this._pointers.add(event.pointerId);
    this._lastDrag = false;
    this._down = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: event.button !== 0 || this._pointers.size > 1,
    };
  };
  /** @private */
  private readonly _onPointerMove = (event: PointerEvent): void => {
    if (
      this._down &&
      (Math.hypot(event.clientX - this._down.x, event.clientY - this._down.y) > 5 ||
        this._pointers.size > 1)
    ) {
      this._down.moved = true;
      this._fitted = false;
    }
  };
  /** @private */
  private readonly _onPointerUp = (event: PointerEvent): void => {
    this._pointers.delete(event.pointerId);
    const down = this._down;
    if (down?.id !== event.pointerId) return;
    this._down = undefined;
    this._lastDrag = down.moved;
    if (down.moved) return;
    const previous = this._lastClick;
    const repeated =
      previous &&
      performance.now() - previous.time < 500 &&
      Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 6;
    const id = repeated ? previous.id : this.pick(event.clientX, event.clientY);
    if (id) {
      if (!repeated)
        this._lastClick = { id, x: event.clientX, y: event.clientY, time: performance.now() };
      this.setSelected(id);
      this._options.selected(id);
    }
  };
  /** @private */
  private readonly _onPointerCancel = (event: PointerEvent): void => {
    this._pointers.delete(event.pointerId);
    this._down = undefined;
    this._lastDrag = true;
  };
  /** @private */
  private readonly _onDoubleClick = (event: MouseEvent): void => {
    if (this._lastDrag) return;
    const previous = this._lastClick;
    const id =
      previous && performance.now() - previous.time < 600
        ? previous.id
        : this.pick(event.clientX, event.clientY);
    if (id) this.focusNode(id);
  };
  /** @private */
  private readonly _onContextLost = (event: Event): void => {
    event.preventDefault();
    this._contextLost = true;
    this.syncFlybys();
    this._transition = undefined;
    cancelAnimationFrame(this._frameId);
    this._frameId = 0;
    this.publish('context-lost');
  };
  /** @private */
  private readonly _onContextRestored = (): void => {
    this._contextLost = false;
    this.syncFlybys();
    this.invalidate();
  };

  // #endregion
}
