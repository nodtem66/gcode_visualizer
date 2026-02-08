import {
  Vector2,
  Vector3,
  Raycaster,
  WebGLRenderer,
  Clock,
  Scene,
  Color,
  OrthographicCamera,
  GridHelper,
  Path,
  Line,
  LineBasicMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Vector4,
  Quaternion,
  Matrix4,
  Spherical,
  Box3,
  Sphere,
  SphereGeometry,
  MeshBasicMaterial,
  Mesh,
  Curve,
  LineCurve3,
} from 'three';

import { ViewportGizmo } from "three-viewport-gizmo";
import CameraControls from 'camera-controls';

const THREE = {
  Vector2: Vector2,
  Vector3: Vector3,
  Vector4: Vector4,
  Raycaster: Raycaster,
  WebGLRenderer: WebGLRenderer,
  Clock: Clock,
  Scene: Scene,
  Color: Color,
  OrthographicCamera: OrthographicCamera,
  GridHelper: GridHelper,
  Path: Path,
  Line: Line,
  LineBasicMaterial: LineBasicMaterial,
  BufferGeometry: BufferGeometry,
  Float32BufferAttribute: Float32BufferAttribute,
  Points: Points,
  PointsMaterial: PointsMaterial,
  Quaternion: Quaternion,
  Matrix4: Matrix4,
  Spherical: Spherical,
  Box3: Box3,
  Sphere: Sphere,
  SphereGeometry: SphereGeometry,
  MeshBasicMaterial: MeshBasicMaterial,
  Mesh: Mesh,
  Curve: Curve,
  LineCurve3: LineCurve3,
};

CameraControls.install({ THREE: THREE });

class GcodeRenderer {
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  cursorPositionContainer = document.getElementById('cursor_position');
  cursorPositionText = document.getElementById('cursor_position__text');

  enableCylindricalTransform = false;   // Whether to enable cylindrical transformation
  diameter = 3;                         // Diameter of the cylindrical scaffold, if enabled cylindrical transform
  initialCylindricalHeight = 1.5;       // Initial height offset for cylindrical scaffold if enabled cylindrical transform
  cylindricalMainAxis = 'x';            // Main axis for cylindrical scaffold: 'x', 'y', or 'z'
  highlightedPointIndex = -1;           // Index of the currently highlighted point (-1 means no highlight)
  currentPointSize = 5;                 // Current point size from GUI
  currentPointColor = '#000000';        // Current point color from GUI
  currentLineColor = '#0000ff';         // Current line color from GUI
  currentLineSize = 1;                  // Current line size from GUI
  currentBackgroundColor = '#ffffff';   // Current background color from GUI
  highlightedPointMesh = null;          // Mesh for the highlighted point
  gridVisible = true;                   // Whether the grid is currently visible
  lineSegments = [];                    // Track line segments for style updates

  constructor() {
    this.document = document;
    this.window = window;
    this.style = document.body.style;
    this.pointBaseColor = new THREE.Color(this.currentPointColor);
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setAnimationLoop(this.animate.bind(this));
    document.body.appendChild(this.renderer.domElement);
    this.raycaster.params.Points.threshold = 0.1;
    this.initialize_scene();
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('click', this.onPointerClick.bind(this));
  }

  initialize_scene() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 10;

    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.currentBackgroundColor);
    //const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.001, 10000);
    const camera = new THREE.OrthographicCamera(frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 1, 1000);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
    this.camera = camera;
    this.scene.add(camera);

    const controls = new CameraControls(this.camera, this.renderer.domElement);
    controls.dollySpeed = 1.0;
    controls.smoothTime = 0;
    controls.draggingSmoothTime = 0;
    controls.dollyToCursor = true;
    controls.infinityDolly = true;
    this.controls = controls;

    const viewportGizmo = new ViewportGizmo(this.camera, this.renderer);
    // listeners
    viewportGizmo.addEventListener("start", () => (controls.enabled = false));
    viewportGizmo.addEventListener("end", () => (controls.enabled = true));
    viewportGizmo.addEventListener("change", () => { controls.setPosition(...camera.position.toArray()); });
    controls.addEventListener("update", () => {
      // Update the the gizmo on controls update
      controls.getTarget(viewportGizmo.target);
      viewportGizmo.update();
    });
    //viewportGizmo.render();
    this.viewportGizmo = viewportGizmo;

    const helper = new THREE.GridHelper(100, 100, 0xd0d0d0, 0xf0f0f0);
    helper.rotateX(Math.PI / 2);
    //helper.position.y = - 199;
    helper.material.opacity = 0.1;
    helper.material.transparent = false;
    helper.visible = this.gridVisible;
    this.helper = helper;
    this.scene.add(helper);
    //viewportGizmo.update();

    //this.renderer.render(this.scene, this.camera);
  }

  adjustCamera(frustumSize) {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = frustumSize * aspect / - 2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = frustumSize / - 2;
    this.camera.updateProjectionMatrix();
  }

  onWindowResize() {
    const camera = this.camera;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.viewportGizmo.update();
    //this.reset();
  }

  onPointerClick(event) {

    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
    this.queryPoint();
  }


  animate(force = false) {
    const updated = this.controls.update(this.clock.getDelta());
    if (updated || force) {
      this.renderer.render(this.scene, this.camera);
      this.viewportGizmo.render();
    }
  }

  queryPoint() {
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // calculate objects intersecting the picking ray
    if (!this.pointGeometry) return;
    const intersections = this.raycaster.intersectObjects([this.pointGeometry], false);
    const nearObj = (intersections.length) > 0 ? intersections[0] : null;
    if (nearObj !== null) {
      const index = nearObj.index;
      const pointIndex = index * 3;
      const point = this.pointGeometry.geometry.attributes.position.array.slice(pointIndex, pointIndex + 3);
      this.cursorPositionText.innerText = `(${point[0].toFixed(3)}, ${point[1].toFixed(3)}, ${point[2].toFixed(3)})`;
      this.cursorPositionContainer.style.display = 'block';

      // Update highlighted point
      this.updateHighlightedPoint(index);
    }
  }

  updateHighlightedPoint(pointIndex) {
    if (!this.pointGeometry || !this.pointsData) return;

    const colors = this.pointGeometry.geometry.attributes.color.array;

    // Reset previous highlight
    if (this.highlightedPointIndex !== -1) {
      const prevIndex = this.highlightedPointIndex * 3;
      colors[prevIndex] = this.pointBaseColor.r;      // R
      colors[prevIndex + 1] = this.pointBaseColor.g;  // G
      colors[prevIndex + 2] = this.pointBaseColor.b;  // B
    }

    // Highlight new point in red
    const newIndex = pointIndex * 3;
    colors[newIndex] = 1;      // R
    colors[newIndex + 1] = 0;  // G
    colors[newIndex + 2] = 0;  // B

    this.highlightedPointIndex = pointIndex;
    this.pointGeometry.geometry.attributes.color.needsUpdate = true;

    // Update or create highlighted point sphere
    this.updateHighlightedPointSphere(pointIndex);
  }

  updateHighlightedPointSphere(pointIndex) {
    // Remove previous highlighted point mesh if it exists
    if (this.highlightedPointMesh) {
      this.scene.remove(this.highlightedPointMesh);
      this.highlightedPointMesh.geometry.dispose();
      this.highlightedPointMesh.material.dispose();
      this.highlightedPointMesh = null;
    }

    if (pointIndex === -1 || !this.pointGeometry) return;

    // Get position from the transformed geometry (which already has all transformations applied)
    const pointIndex3 = pointIndex * 3;
    const posArray = this.pointGeometry.geometry.attributes.position.array;
    const position = new THREE.Vector3(
      posArray[pointIndex3],
      posArray[pointIndex3 + 1],
      posArray[pointIndex3 + 2]
    );

    // Apply the same rotation matrix as the pointGeometry to get world position
    position.applyMatrix4(this.pointGeometry.matrixWorld);

    // Create sphere geometry for highlighted point
    const geometry = new THREE.SphereGeometry(this.currentPointSize * 0.01, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.highlightedPointMesh = new THREE.Mesh(geometry, material);
    this.highlightedPointMesh.position.copy(position);

    this.scene.add(this.highlightedPointMesh);
  }

  updatePointColor(color) {
    this.currentPointColor = color;
    this.pointBaseColor = new THREE.Color(color);

    if (!this.pointGeometry) return;
    const colors = this.pointGeometry.geometry.attributes.color.array;
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = this.pointBaseColor.r;
      colors[i + 1] = this.pointBaseColor.g;
      colors[i + 2] = this.pointBaseColor.b;
    }

    if (this.highlightedPointIndex !== -1) {
      const highlightIndex = this.highlightedPointIndex * 3;
      colors[highlightIndex] = 1;
      colors[highlightIndex + 1] = 0;
      colors[highlightIndex + 2] = 0;
    }

    this.pointGeometry.geometry.attributes.color.needsUpdate = true;
  }

  updateLineStyle(color) {
    this.currentLineColor = color;
    this.lineSegments.forEach((line) => {
      if (!line.material) return;
      line.material.color.set(color);
      line.material.linewidth = this.currentLineSize;
      line.material.needsUpdate = true;
    });
  }

  updateBackgroundColor(color) {
    this.currentBackgroundColor = color;
    if (this.scene) {
      this.scene.background = new THREE.Color(color);
    }
  }

  reset() {
    this.highlightedPointIndex = -1;
    this.lineSegments = [];
    if (this.highlightedPointMesh) {
      this.scene.remove(this.highlightedPointMesh);
      this.highlightedPointMesh.geometry.dispose();
      this.highlightedPointMesh.material.dispose();
      this.highlightedPointMesh = null;
    }
    this.initialize_scene();
  }

  draw(geometry) {
    if (geometry.length <= 1) return;

    // Draw all geometry as a continuous 3D path without grouping by Z
    this.drawPath(geometry);
  }

  /**
   * Maps 3D coordinates based on the cylindrical main axis
   * @param {Array|Object} p - Point with x, y, z properties or [x, y, z] array
   * @returns {Object} Object with mapX, mapY, mapZ properties
   */
  mapCoordinates(p) {
    const [x, y, z] = Array.isArray(p) ? p : [p.x, p.y, p.z];
    
    if (this.cylindricalMainAxis === 'x') {
      return { mapX: x, mapY: y, mapZ: z };
    } else if (this.cylindricalMainAxis === 'y') {
      return { mapX: y, mapY: x, mapZ: z };
    } else { // 'z'
      return { mapX: z, mapY: y, mapZ: x };
    }
  }

  /**
   * Transforms a point to cylindrical coordinates
   * @param {Array|Object} p - Point to transform
   * @returns {THREE.Vector3} Transformed point
   */
  transformToCylindrical(p) {
    const { mapX, mapY, mapZ } = this.mapCoordinates(p);
    
    const radius = this.diameter / 2.0;
    const height = this.initialCylindricalHeight + mapZ;
    const theta = radius > 0 ? mapY / radius : mapY / 0.001;
    const longitudinalAxis = mapX;
    
    return new THREE.Vector3().setFromCylindricalCoords(height, theta, longitudinalAxis);
  }

  /**
   * Creates a Three.js curve from a geometry object
   * @param {Object} g - Geometry object with type, start, end, and optional center/dir
   * @returns {THREE.Curve} Three.js curve object
   */
  createCurveFromGeometry(g) {
    if (g.type === 'line') {
      return new THREE.LineCurve3(
        new THREE.Vector3(g.start[0], g.start[1], g.start[2]),
        new THREE.Vector3(g.end[0], g.end[1], g.end[2])
      );
    } else if (g.type === 'arc') {
      const radius = Math.sqrt((g.start[0] - g.center[0]) ** 2 + (g.start[1] - g.center[1]) ** 2);
      const startAngle = Math.atan2(g.start[1] - g.center[1], g.start[0] - g.center[0]);
      const endAngle = Math.atan2(g.end[1] - g.center[1], g.end[0] - g.center[0]);

      let angleCalc = endAngle - startAngle;
      const isCW = g.dir === 'cw';

      if (angleCalc > 0 && isCW) {
        angleCalc = angleCalc - 2 * Math.PI;
      } else if (angleCalc < 0 && !isCW) {
        angleCalc = angleCalc + 2 * Math.PI;
      }

      if (Math.abs(angleCalc) < 1e-3) {
        angleCalc = isCW ? -2 * Math.PI : 2 * Math.PI;
      }

      const curve = new THREE.Curve();
      curve.getPoint = function (t) {
        const angle = startAngle + t * angleCalc;
        const x = g.center[0] + radius * Math.cos(angle);
        const y = g.center[1] + radius * Math.sin(angle);
        const z = g.start[2] + t * (g.end[2] - g.start[2]);
        return new THREE.Vector3(x, y, z);
      };
      return curve;
    }
  }

  /**
   * Applies rotation to an object based on the cylindrical main axis
   * @param {THREE.Object3D} obj - Object to rotate
   */
  applyCylindricalRotation(obj) {
    if (this.cylindricalMainAxis === 'x') {
      obj.rotateZ(-Math.PI / 2);
    } else if (this.cylindricalMainAxis === 'z') {
      obj.rotateX(Math.PI / 2);
    }
  }

  drawPath(geometry) {
    // Normal flat scaffold - draw 3D path using curves
    if (!this.enableCylindricalTransform) {
      const points3D = [];

      geometry.forEach((g) => {
        const curve = this.createCurveFromGeometry(g);
        const curvePoints = curve.getPoints(50);
        points3D.push(...curvePoints);
      });

      const pathGeometry = new THREE.BufferGeometry().setFromPoints(points3D);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(this.currentLineColor),
        linewidth: this.currentLineSize,
      });
      const line = new THREE.Line(pathGeometry, lineMaterial);
      this.lineSegments.push(line);
      this.scene.add(line);
    }
    // Cylindrical scaffold - use curves directly and transform
    else {
      geometry.forEach((g) => {
        const curve = this.createCurveFromGeometry(g);
        const points3DSegment = curve.getPoints(50);
        const transformedSegment = points3DSegment.map(p => this.transformToCylindrical(p));

        // Draw the transformed segment
        const segmentGeometry = new THREE.BufferGeometry().setFromPoints(transformedSegment);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: new THREE.Color(this.currentLineColor),
          linewidth: this.currentLineSize,
        });
        const line = new THREE.Line(segmentGeometry, lineMaterial);
        this.applyCylindricalRotation(line);
        this.lineSegments.push(line);
        this.scene.add(line);
      });
    }
  }

  drawPoints(points) {
    const buffer = new THREE.BufferGeometry();
    const pointCount = points.length;

    // Transform points if cylindrical mode is enabled
    if (!this.enableCylindricalTransform) {
      buffer.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    } else {
      const transformedPoints = points.map(p => {
        const v = this.transformToCylindrical(p);
        return [v.x, v.y, v.z];
      });
      buffer.setAttribute('position', new THREE.Float32BufferAttribute(transformedPoints.flat(), 3));
    }

    // Create color attribute for all points (base point color)
    const colors = new Float32Array(pointCount * 3);
    const baseColor = this.pointBaseColor || new THREE.Color(this.currentPointColor);
    for (let i = 0; i < pointCount; i++) {
      colors[i * 3] = baseColor.r;
      colors[i * 3 + 1] = baseColor.g;
      colors[i * 3 + 2] = baseColor.b;
    }
    buffer.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({ size: this.currentPointSize, sizeAttenuation: true, vertexColors: true });
    this.pointGeometry = new THREE.Points(buffer, material);

    if (this.enableCylindricalTransform) {
      this.applyCylindricalRotation(this.pointGeometry);
    }

    this.pointGeometry.geometry.computeBoundingSphere();
    this.pointGeometry.geometry.computeBoundingBox();
    this.fitCameraToGeometry(this.pointGeometry.geometry);
    this.scene.add(this.pointGeometry);

    // Update matrix world to ensure transformations are applied
    this.pointGeometry.updateMatrixWorld(true);

    // Store the points data for later use in highlighting
    this.pointsData = points;
  }

  fitCameraToGeometry(pathGeometry) {
    pathGeometry.computeBoundingBox();
    const frustumSize = Math.max(
      pathGeometry.boundingBox.max.x - pathGeometry.boundingBox.min.x,
      pathGeometry.boundingBox.max.y - pathGeometry.boundingBox.min.y,
    );
    this.adjustCamera(frustumSize * 1.5);
    this.controls.fitToBox(pathGeometry.boundingBox, false, { paddingTop: 10, paddingBottom: 10, paddingLeft: 10, paddingRight: 10 });
  }

}

export { GcodeRenderer }