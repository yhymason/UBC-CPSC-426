String.prototype.format = function () {

	var str = this;

	for ( var i = 0; i < arguments.length; i ++ ) {

		str = str.replace( '{' + i + '}', arguments[ i ] );

	}
	return str;

};

var container, stats;
var camera, scene, renderer, spotlight;
var splineHelperObjects = [];
var control_points = [];
var point = new THREE.Vector3();
var options;

var geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
var transformControl;

var ARC_SEGMENTS = 200;

var splines = {};

var params = {
	cubicBezier: false,
	bSpline: false,
	cubicHermite: false
};

init();
animate();

function init() {

	container = document.getElementById( 'container' );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xf0f0f0 );

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
	camera.position.set( 0, 100, 0 );
	scene.add( camera );

	scene.add( new THREE.AmbientLight( 0xf0f0f0 ) );
	var light = new THREE.SpotLight( 0xffffff, 1.5 );
	light.position.set( 0, 1500, 200 );
	light.castShadow = true;
	light.shadow = new THREE.LightShadow( new THREE.PerspectiveCamera( 70, 1, 200, 2000 ) );
	light.shadow.bias = -0.000222;
	light.shadow.mapSize.width = 1024;
	light.shadow.mapSize.height = 1024;
	scene.add( light );
	spotlight = light;

	var planeGeometry = new THREE.PlaneBufferGeometry( 100, 100 );
	planeGeometry.rotateX( - Math.PI / 2 );
	var planeMaterial = new THREE.ShadowMaterial( { opacity: 0.2 } );

	var plane = new THREE.Mesh( planeGeometry, planeMaterial );
	plane.receiveShadow = true;
	scene.add( plane );

	var helper = new THREE.GridHelper( 100, 100 );
	// helper.position.z = 0;
	helper.material.opacity = 0.25;
	helper.material.transparent = true;
	scene.add( helper );

	var axes = new THREE.AxesHelper( 100 );
	scene.add( axes );

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	container.appendChild( renderer.domElement );

	stats = new Stats();
	container.appendChild( stats.dom );

	var gui = new dat.GUI();

	gui.add( params, 'cubicBezier' );
	gui.add( params, 'bSpline' );
	gui.add( params, 'cubicHermite' );
	gui.open();

	// Controls
	var controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.damping = 0.2;
	controls.addEventListener( 'change', render );

	controls.addEventListener( 'start', function() {

		cancelHideTransorm();

	} );

	controls.addEventListener( 'end', function() {

		delayHideTransform();

	} );

	transformControl = new THREE.TransformControls( camera, renderer.domElement );
	transformControl.addEventListener( 'change', render );
	transformControl.addEventListener( 'dragging-changed', function ( event ) {
		controls.enabled = !event.value
	} );
	scene.add( transformControl );

	// Hiding transform situation is a little in a mess :()
	transformControl.addEventListener( 'change', function( e ) {

		cancelHideTransorm();

	} );

	transformControl.addEventListener( 'mouseDown', function( e ) {

		cancelHideTransorm();

	} );

	transformControl.addEventListener( 'mouseUp', function( e ) {

		delayHideTransform();

	} );

	var dragcontrols = new THREE.DragControls( splineHelperObjects, camera, renderer.domElement ); //
	dragcontrols.enabled = false;
	dragcontrols.addEventListener( 'hoveron', function ( event ) {

		transformControl.attach( event.object );
		cancelHideTransorm();

	} );

	dragcontrols.addEventListener( 'hoveroff', function ( event ) {

		delayHideTransform();

	} );

	var hiding;

	function delayHideTransform() {

		cancelHideTransorm();
		hideTransform();

	}

	function hideTransform() {

		hiding = setTimeout( function() {

			transformControl.detach( transformControl.object );

		}, 2500 )

	}

	function cancelHideTransorm() {

		if ( hiding ) clearTimeout( hiding );

	}

	// Curves Initialization
	// Set control points, keep "y=0" for 2D visualization
	control_points = [ new THREE.Vector3( 0, 0, 0 ), //p0
			new THREE.Vector3( 10, 0, 10 ), //p1
			new THREE.Vector3( 10, 0, 20 ), //p2
			new THREE.Vector3( 0, 0, 30 ) ] //p3
	// Draw control polygon
	var control_polygon_geometry = new THREE.BufferGeometry().setFromPoints( control_points );
	var control_polygon_material = new THREE.LineBasicMaterial( { color : 'black' } );
	var control_polygon_mesh = new THREE.Line( control_polygon_geometry, control_polygon_material );
	scene.add( control_polygon_mesh );
	// Create Cubic Bezier curve
	var cubicBezier = new CubicBezierCurve( control_points[0], control_points[1], control_points[2], control_points[3] );
	var points = cubicBezier.getPoints( 500 );
	var bezier_geometry = new THREE.BufferGeometry().setFromPoints( points );
	var bezier_material = new THREE.LineBasicMaterial( { color : 'skyblue' } );
	cubicBezier.mesh = new THREE.Line( bezier_geometry, bezier_material );
	cubicBezier.mesh.castShadow = true;
	// Create the final object to add to the scene
	splines.bezierCurveObject = cubicBezier;

	scene.add( splines.bezierCurveObject.mesh );

}



function animate() {

	requestAnimationFrame( animate );
	render();
	stats.update();

}

function render() {

	splines.bezierCurveObject.mesh.visible = params.cubicBezier;
	//bSpline.mesh.visible = params.bSpline;
	//cubicHermite.chordal.mesh.visible = params.cubicHermite;
	renderer.render( scene, camera );

}
