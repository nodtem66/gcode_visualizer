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
};

CameraControls.install( { THREE: THREE } );

class GcodeRenderer {
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  cursorPositionContainer = document.getElementById('cursor_position');
  cursorPositionText = document.getElementById('cursor_position__text');

  enableCylindicalTransform = false;
  diameter = 3;
  cylindicalMainAxis = 'x';
  curveResolution = 20;

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
    console.log('Init GcodeRenderer');
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
      for (let i=0; i < intersections.length; i++) {
        if (Math.abs(intersections[i].distance - nearObj.distance) < 0.01) {
          const index = intersections[i].index*3;
          const point = this.pointGeometry.geometry.attributes.position.array.slice(index, index+3);
          this.cursorPositionText.innerText = `(${point[0].toFixed(3)}, ${point[1].toFixed(3)}, ${point[2].toFixed(3)})`;
          }
      }
    }
  }

  reset() {
    this.initialize_scene();
  }

  draw(geometry) {
    if (geometry.length === 0) return;
    const groupedByStartZ = geometry.reduce((acc, g) => {
      const key = g.start[2];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(g);
      return acc;
    }, {});
    for (const z in groupedByStartZ) {
      this.drawPath(groupedByStartZ[z], z);
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
        path.absarc(g.center[0], g.center[1], radius, startAngle, endAngle, g.dir === 'cw');
      }
      lineCount.push(g.line);
    });
    if (path.curves.length === 0) return;
    // Normal flat scaffold
    if (!this.enableCylindicalTransform) {
      const points = path.getPoints();
      const pathGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
      if (z > 0) {
        pathGeometry.translate(0, 0, z);
      }
      const line = new THREE.Line( pathGeometry, lineMaterial );
      this.scene.add( line );
    } 
    // Cylindical scaffold
    else {
      const points = path.curves.flatMap(c => c.getSpacedPoints(this.curveResolution));
      const transformedPoints = points.map((p) => {
        let val;
        if (this.cylindicalMainAxis === 'x') val = {x: p.x, y: p.y, z};
        else if (this.cylindicalMainAxis === 'y') val = {x: p.y, y: p.x, z};
        else if (this.cylindicalMainAxis === 'z') val = {x: z, y: p.y, z: p.x};
        const radius = this.diameter/2.0;
        const theta = val.y/radius;
        const y = val.x;
        return new THREE.Vector3().setFromCylindricalCoords(radius+val.z, theta, y)
      });
      const pathGeometry = new THREE.BufferGeometry().setFromPoints(transformedPoints);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
      const line = new THREE.Line( pathGeometry, lineMaterial );
      if (this.cylindicalMainAxis === 'x') line.rotateZ(-Math.PI/2);
      else if (this.cylindicalMainAxis === 'z') line.rotateX(Math.PI/2);
      this.scene.add( line );
    }
  }

  drawPoints(points) {
    const buffer = new THREE.BufferGeometry();
    // Normal flat scaffold
    if (!this.enableCylindicalTransform) {
      buffer.setAttribute( 'position', new THREE.Float32BufferAttribute( transformedPoints.flat(), 3 ) );
    }
    // Cylindical scaffold
    else {
      const transformedPoints = points.map((p) => {
        let val;
        if (this.cylindicalMainAxis === 'x') val = {x: p[0], y: p[1], z: p[2]};
        else if (this.cylindicalMainAxis === 'y') val = {x: p[1], y: [0], z: p[2]};
        else if (this.cylindicalMainAxis === 'z') val = {x: p[2], y: p[1], z: p[0]};
        const radius = this.diameter/2.0 + val.z;
        const theta = val.y/(radius - val.z);
        const l = val.x;
        return [radius * Math.sin(theta), l, radius * Math.cos(theta)];
      });
      buffer.setAttribute( 'position', new THREE.Float32BufferAttribute( transformedPoints.flat(), 3 ) );
    }
    //buffer.setAttribute( 'color', new THREE.Float32BufferAttribute( points.map(() => [0, 0, 0]).flat(), 3 ) );
    const material = new THREE.PointsMaterial( { size: 3, sizeAttenuation:true, vertexColors: true } );
    this.pointGeometry = new THREE.Points( buffer , material );
    if (this.cylindicalMainAxis === 'x') this.pointGeometry.rotateZ(-Math.PI/2);
      else if (this.cylindicalMainAxis === 'z') this.pointGeometry.rotateX(Math.PI/2);
    this.pointGeometry.geometry.computeBoundingSphere();
    this.pointGeometry.geometry.computeBoundingBox();
    this.fitCameraToGeometry(this.pointGeometry.geometry);
    this.scene.add(this.pointGeometry);
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