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
} from 'three';

import { ViewportGizmo } from "three-viewport-gizmo";
import CameraControls from 'camera-controls';

const THREE = {
	Vector2   : Vector2,
	Vector3   : Vector3,
  Vector4   : Vector4,
	Raycaster : Raycaster,
  WebGLRenderer : WebGLRenderer,
  Clock : Clock,
  Scene : Scene,
  Color : Color,
  OrthographicCamera : OrthographicCamera,
  GridHelper : GridHelper,
  Path : Path,
  Line : Line,
  LineBasicMaterial : LineBasicMaterial,
  BufferGeometry : BufferGeometry,
  Float32BufferAttribute : Float32BufferAttribute,
  Points : Points,
  PointsMaterial : PointsMaterial,
  Quaternion : Quaternion,
  Matrix4 : Matrix4,
  Spherical : Spherical,
  Box3 : Box3,
  Sphere : Sphere,
  SphereGeometry : SphereGeometry,
  MeshBasicMaterial : MeshBasicMaterial,
  Mesh : Mesh,
};

CameraControls.install( { THREE: THREE } );

class GcodeRenderer {
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  cursorPositionContainer = document.getElementById('cursor_position');
  cursorPositionText = document.getElementById('cursor_position__text');

  enableCylindricalTransform = false;   // Whether to enable cylindrical transformation
  diameter = 3;                   // Diameter of the cylindrical scaffold, if enabled cylindrical transform
  initialCylindricalHeight = 1.5;  // Initial height offset for cylindrical scaffold if enabled cylindrical transform
  cylindricalMainAxis = 'x';      // Main axis for cylindrical scaffold: 'x', 'y', or 'z'
  curveStep = 0.5;        // Step size used to sample curve segments when drawing cylindrical scaffold
  highlightedPointIndex = -1;    // Index of the currently highlighted point (-1 means no highlight)
  currentPointSize = 5;           // Current point size from GUI
  highlightedPointMesh = null;    // Mesh for the highlighted point
  gridVisible = true;             // Whether the grid is currently visible

  constructor() {
    this.document = document;
    this.window = window;
    this.style = document.body.style;
    this.renderer = new THREE.WebGLRenderer({antialias: false});
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.shadowMap.enabled = true;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setAnimationLoop(this.animate.bind(this));
    document.body.appendChild(this.renderer.domElement);
    this.raycaster.params.Points.threshold = 0.1;
    this.initialize_scene();
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener( 'click', this.onPointerClick.bind(this) );
  }

  initialize_scene() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 10;

    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( 0xffffff );
    //const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.001, 10000);
    const camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 1, 1000 );
    camera.position.set( 0, 0, 100);
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
    viewportGizmo.addEventListener("change", () => {controls.setPosition(...camera.position.toArray());});
    controls.addEventListener("update", () => {
      // Update the the gizmo on controls update
      controls.getTarget(viewportGizmo.target);
      viewportGizmo.update();
    });
    //viewportGizmo.render();
    this.viewportGizmo = viewportGizmo;

    const helper = new THREE.GridHelper( 1, 1, 0xfef000, 0xd0d0d0);
    helper.rotateX( Math.PI / 2);
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

    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.viewportGizmo.update();
    //this.reset();
  }

  onPointerClick( event ) {

    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components
    this.pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    this.pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
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
    this.raycaster.setFromCamera( this.pointer, this.camera );
    // calculate objects intersecting the picking ray
    if (!this.pointGeometry) return;
    const intersections = this.raycaster.intersectObjects([ this.pointGeometry ], false );
    const nearObj = ( intersections.length ) > 0 ? intersections[ 0 ] : null;
    if (nearObj !== null) {
      const index = nearObj.index;
      const pointIndex = index * 3;
      const point = this.pointGeometry.geometry.attributes.position.array.slice(pointIndex, pointIndex+3);
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
      colors[prevIndex] = 0;      // R
      colors[prevIndex + 1] = 0;  // G
      colors[prevIndex + 2] = 0;  // B
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

  reset() {
    this.highlightedPointIndex = -1;
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

    const groupedByStartZ = geometry.reduce((acc, g) => {
      const key = g.start[2];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(g);
      return acc;
    }, {});
    for (const z in groupedByStartZ) {
      this.drawPath(groupedByStartZ[z], parseFloat(z));
    }
  }

  drawPath(geometry, z=0) {
    const path = new THREE.Path();
    const lineCount = [];
    geometry.forEach((g) => {
      if (g.type === 'line') {
        path.moveTo(g.start[0], g.start[1]);
        path.lineTo(g.end[0], g.end[1]);
      } else if (g.type == 'arc') {
        const radius = Math.sqrt((g.start[0] - g.center[0]) ** 2 + (g.start[1] - g.center[1]) ** 2);
        const startAngle = Math.atan2(g.start[1] - g.center[1], g.start[0] - g.center[0]);
        const endAngle = Math.atan2(g.end[1] - g.center[1], g.end[0] - g.center[0]);
        if (Math.abs(startAngle - endAngle) > 1e-3) {
          path.absarc(g.center[0], g.center[1], radius, startAngle, endAngle, g.dir === 'cw');
        } else {
          path.absarc(g.center[0], g.center[1], radius, startAngle, startAngle+2*Math.PI, g.dir === 'cw');
          path.absarc(g.center[0], g.center[1], radius, startAngle+2*Math.PI, endAngle, g.dir === 'cw');
        }
      }
      lineCount.push(g.line);
    });
    if (path.curves.length <= 1) return;
    // Normal flat scaffold
    if (!this.enableCylindricalTransform) {
      const points = path.getPoints();
      const pathGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
      if (z > 0) {
        pathGeometry.translate(0, 0, z);
      }
      const line = new THREE.Line( pathGeometry, lineMaterial );
      this.scene.add( line );
    } 
    // Cylindrical scaffold
    else {
      const step = Math.max(this.curveStep, 1e-6); // avoid zero or negative step
      const points = path.curves.flatMap((curve) => {
        const length = curve.getLength();
        const divisions = Math.max(2, Math.ceil(length / step));
        return curve.getSpacedPoints(divisions);
      });
      const transformedPoints = points.map((p) => {
        let val;
        if (this.cylindricalMainAxis === 'x') val = {x: p.x, y: p.y, z};
        else if (this.cylindricalMainAxis === 'y') val = {x: p.y, y: p.x, z};
        else if (this.cylindricalMainAxis === 'z') val = {x: z, y: p.y, z: p.x};
        const radius = this.diameter / 2;
        const height = this.initialCylindricalHeight + val.z;
        const theta = radius > 0 ? val.y/radius : val.y/0.001;
        const y = val.x;
        return new THREE.Vector3().setFromCylindricalCoords(height, theta, y)
      });
      const pathGeometry = new THREE.BufferGeometry().setFromPoints(transformedPoints);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
      const line = new THREE.Line( pathGeometry, lineMaterial );
      if (this.cylindricalMainAxis === 'x') line.rotateZ(-Math.PI/2);
      else if (this.cylindricalMainAxis === 'z') line.rotateX(Math.PI/2);
      this.scene.add( line );
    }
  }

  drawPoints(points) {
    const buffer = new THREE.BufferGeometry();
    const pointCount = points.length;
    
    // Normal flat scaffold
    if (!this.enableCylindricalTransform) {
      buffer.setAttribute( 'position', new THREE.Float32BufferAttribute( points.flat(), 3 ) );
    }
    // Cylindrical scaffold
    else {
      const transformedPoints = points.map((p) => {
        let val;
        if (this.cylindricalMainAxis === 'x') val = {x: p[0], y: p[1], z: p[2]};
        else if (this.cylindricalMainAxis === 'y') val = {x: p[1], y: [0], z: p[2]};
        else if (this.cylindricalMainAxis === 'z') val = {x: p[2], y: p[1], z: p[0]};
        const radius = this.diameter/2.0;
        const height = this.initialCylindricalHeight + val.z;
        const theta = val.y/(radius);
        const l = val.x;
        return [height * Math.sin(theta), l, height * Math.cos(theta)];
      });
      buffer.setAttribute( 'position', new THREE.Float32BufferAttribute( transformedPoints.flat(), 3 ) );
    }
    
    // Create color attribute for all points (initially black)
    const colors = new Float32Array(pointCount * 3);
    for (let i = 0; i < pointCount; i++) {
      colors[i * 3] = 0;      // R
      colors[i * 3 + 1] = 0;  // G
      colors[i * 3 + 2] = 0;  // B
    }
    buffer.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
    
    const material = new THREE.PointsMaterial( { size: this.currentPointSize, sizeAttenuation:true, vertexColors: true } );
    this.pointGeometry = new THREE.Points( buffer , material );
    
    if (this.enableCylindricalTransform) {
      if (this.cylindricalMainAxis === 'x') this.pointGeometry.rotateZ(-Math.PI/2);
      else if (this.cylindricalMainAxis === 'z') this.pointGeometry.rotateX(Math.PI/2);
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
    this.adjustCamera(frustumSize*1.5);
    this.controls.fitToBox(pathGeometry.boundingBox, false, {paddingTop: 10, paddingBottom: 10, paddingLeft: 10, paddingRight: 10});
  }

}

export { GcodeRenderer }