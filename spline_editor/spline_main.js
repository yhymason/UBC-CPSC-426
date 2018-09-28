/*
	CPSC 426 - Computer Animation
	University of British Columbia, Vancouver, BC, Canada
	Spline editor main function : GUI, objects management and rendering
	Created by:
		- Mason Yang : yhymason@gmail.com
		- Michiel van de Panne : van@cs.ubc.ca
	2018-09-20
*/

var container;
var camera, scene, renderer, spotlight;
var splineHelperObjects = [];
var control_points = [];
var point = new THREE.Vector3();
var options;

var geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
var transformControl;
var keyboard = new THREEx.KeyboardState();

var SEGMENTS = 200; // number of points used to represent curves
var t = 0; // param t for parametric curves
var t_index = 0; // corresponding index of t among the point array of plots 

var splines = {}; // Global structure storing all the spline curves
var plots = {}; // Global structure storing all the plots
var control_polygon = {}; // Global structure storing all the control polygon meshes
var texts = {};  // Global structure storing all the plot axes labels
var oracles = {};  // Global structure storing all the sweeping points

// Params for control interface
var params = {
	cubicBezier: false,
	bSpline: false,
	cubicHermite: false
};

var loader = new THREE.FontLoader();
loader.load( './helvetiker_regular.typeface.json', function ( font ) {

	init( font );
	animate();

} );

function init( font ) {

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

	// main plane
	var planeGeometry = new THREE.PlaneBufferGeometry( 100, 100 );
	planeGeometry.rotateX( - Math.PI / 2 );
	planeGeometry.translate( 0, 0, 50 );
	var planeMaterial = new THREE.ShadowMaterial( { opacity: 0.3 } );

	var plane = new THREE.Mesh( planeGeometry, planeMaterial );
	plane.receiveShadow = false;
	scene.add( plane );

	var helper = new THREE.GridHelper( 100, 100 );
	helper.position.z = 50;
	helper.material.opacity = 0.25;
	helper.material.transparent = true;
	scene.add( helper );

	// main axes
	var axes = new THREE.AxesHelper( 100 );
	scene.add( axes );


	// vertical plane + axes + grid for plots
	var plot_planeGeometry = new THREE.PlaneGeometry( 100, 100 );
	var plot_planeMaterial = new THREE.MeshBasicMaterial({color: "white"});
	var plot_plane = new THREE.Mesh( plot_planeGeometry, plot_planeMaterial );
	plot_plane.receiveShadow = false;
	scene.add( plot_plane );

	var vertical_helper = new THREE.GridHelper( 100, 100 );
	vertical_helper.rotateX( - Math.PI / 2 );
	vertical_helper.material.opacity = 0.25;
	vertical_helper.material.transparent = true;
	scene.add( vertical_helper );


	// renderer code
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	container.appendChild( renderer.domElement );

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

	transformControl.addEventListener( 'objectChange', function( e ) {

		updateSplineOutline();

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
	// Start of Curvature codes
	// Curves Initialization
	// Set control points, keep "y=0" for 2D visualization
	control_points = [ new THREE.Vector3( 0, 0, 0 ), //p0
			new THREE.Vector3( 10, 0, 10 ), //p1
			new THREE.Vector3( 10, 0, 20 ), //p2
			new THREE.Vector3( 0, 0, 30 ) ]; //p3

	// Draw control points and add them to draggable object array
	var points_geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
	for ( var i = 0; i < control_points.length; i++ ) {
		var point_object = new THREE.Mesh( points_geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
		point_object.position.copy( control_points[i] )
		scene.add( point_object );
		splineHelperObjects.push( point_object ); // Enable drag control for control points
	}

	// Draw control polygon
	var vertices = [];
	for (var k in splineHelperObjects)
	{
		vertices.push( splineHelperObjects[k].position );
	}
	control_polygon = new ControlPolygon( vertices );
	scene.add( control_polygon.obj.mesh );

	// Create Cubic Bezier curve
	var cubicBezier = new CubicBezierCurve( splineHelperObjects[0].position, 
		splineHelperObjects[1].position, 
		splineHelperObjects[2].position, 
		splineHelperObjects[3].position );
	var points = cubicBezier.getPoints( SEGMENTS );
	var bezier_geometry = new THREE.Geometry().setFromPoints( points );
	var bezier_material = new THREE.LineBasicMaterial( { color : 'skyblue' } );
	cubicBezier.mesh = new THREE.Line( bezier_geometry, bezier_material );

	// Create the final object to add to the scene
	splines.bezierCurveObject = cubicBezier;
	scene.add( splines.bezierCurveObject.mesh );

	// Create plots for Bezier curve
	var origin = new THREE.Vector3( 10, 10, 0 );
	var horizontal_end = new THREE.Vector3( 20, 10, 0 );
	var vertical_end = new THREE.Vector3( 10, 20, 0 );
	var tvals = [];
	var zvals = [];
	var xvals = [];
	var yvals = [];
	for(var j = 0; j < points.length; j++){
		tvals.push(j / SEGMENTS);
		xvals.push(points[j].x);
		yvals.push(points[j].y);
		zvals.push(points[j].z);
	}

	// Construct plot objects and fill it with data
	// Bezier ----------------------------------
	// Bezier t v.s z
	var plot_btz = new Plot(origin, horizontal_end, vertical_end);
	plot_btz.setData( tvals, zvals );
	plot_btz.setLabels( "t", "z" );
	plot_btz.plotObject();
	plots.p1 = plot_btz;

	// Bezier t v.s x
	origin = new THREE.Vector3( 10, 25, 0 );
	horizontal_end = new THREE.Vector3( 20, 25, 0);
	vertical_end = new THREE.Vector3( 10, 35, 0 );
	var plot_btx = new Plot(origin, horizontal_end, vertical_end);
	plot_btx.setData( tvals, xvals );
	plot_btx.setLabels( "t", "x" );
	plot_btx.plotObject();
	plots.p2 = plot_btx;

	// Bezier t v.s y
	origin = new THREE.Vector3( 25, 10, 0 );
	horizontal_end = new THREE.Vector3( 35, 10, 0);
	vertical_end = new THREE.Vector3( 25, 20, 0 );
	var plot_bty = new Plot(origin, horizontal_end, vertical_end);
	plot_bty.setData( tvals, yvals );
	plot_bty.setLabels( "t", "y" );
	plot_bty.plotObject();
	plots.p3 = plot_bty;

	// Add plots and their meshes to the scene
	for(var p in plots){
		var plot = plots[p];
		for(var m in plot.obj)
		{
			var mesh = plot.obj[m];
			scene.add( mesh );
		}
	}

	// Labels
	// Create labels for each plot
	var text_param = {
					font: font,
					size: 0.5,
					height: 0.1,
					curveSegments: 1
				};
	var text_material = new THREE.MeshBasicMaterial( { color: "orange", overdraw: 0.5 } );

	// Loop for label geometry for each plot
	for(var n in plots)
	{
		var string = n + "horizontal";
		var horizontal_text = plots[n].xtext;
		var vertical_text = plots[n].ytext;
		var text_geometry = new THREE.TextGeometry( horizontal_text, text_param );
		var text_mesh = new THREE.Mesh( text_geometry, text_material );
		text_mesh.position.copy(plots[n].xtextpos);
		texts[string] = text_mesh;
		scene.add(text_mesh);
		string = n + "vertical"
		text_geometry = new THREE.TextGeometry( vertical_text, text_param );
		text_mesh = new THREE.Mesh( text_geometry, text_material );
		text_mesh.position.copy(plots[n].ytextpos);
		texts[string] = text_mesh;
		scene.add(text_mesh);
	}

	// -----------------------------------------

	initSweeping( scene );

}

// Initialize points that moves along each curve
function initSweeping( scene ) {
	var oracle_geometry = new THREE.BoxBufferGeometry( 0.5, 0.5, 0.5 );
	for(var curve in splines){
		var obj = splines[curve];
		var point = obj.getPoint(t);
		var oracle_object = new THREE.Mesh( oracle_geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
		oracle_object.position.copy(point);
		scene.add(oracle_object);
		oracles[curve] = oracle_object;
	}
	for(var plot in plots){
		var obj = plots[plot];
		var point = obj.getPoint(t_index);
		var oracle_object = new THREE.Mesh( oracle_geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
		oracle_object.position.copy(point);
		scene.add(oracle_object);
		oracles[plot] = oracle_object;
	}
}

// Update points and curves in the world upon change of control points
function updateSplineOutline() {

	// update control polygon upon change
	var polygon = control_polygon;
	var vertices = [];
	for (var k in splineHelperObjects)
	{
		vertices.push( splineHelperObjects[k].position );
	}
	control_polygon.updatePoints( vertices );

	// update bezier curve upon change
	var spline = splines.bezierCurveObject;
	spline.v0 = splineHelperObjects[0].position;
	spline.v1 = splineHelperObjects[1].position;
	spline.v2 = splineHelperObjects[2].position;
	spline.v3 = splineHelperObjects[3].position;
	var points = spline.getPoints( SEGMENTS );
	spline.mesh.geometry.vertices = points;
	spline.mesh.geometry.verticesNeedUpdate = true;

	// update plots upon change
	var plot = plots.p1;
	var tvals = [];
	var zvals = [];
	var xvals = [];
	var yvals = [];
	for(var j = 0; j < points.length; j++){
		tvals.push(j / SEGMENTS);
		xvals.push(points[j].x);
		yvals.push(points[j].y);
		zvals.push(points[j].z);
	}
	plot.updatePlot( tvals, zvals );
	plot = plots.p2;
	plot.updatePlot( tvals, xvals );
	plot = plots.p3;
	plot.updatePlot( tvals, yvals );

	updateOracles();
}

// Update oracles points upon change
function updateOracles() {
	for(var o in oracles){
		var oracle = oracles[o];
		var curve_obj;
		var point;
		if (typeof plots[o] !== "undefined") {
			curve_obj = plots[o];
			point = curve_obj.getPoint(t_index);
		}
		else{
			curve_obj = splines[o];
			point = curve_obj.getPoint(t);
		}
		oracle.position.copy(point);
	}
}

/*
	Keyboard input updater
*/
function inputUpdate() {

	// Press P to look at plots
	if ( keyboard.pressed("P") ) 
	{
		camera.position.set( 25, 25, 25 );
		camera.lookAt( 25, 25, 0 );
	}

	// Press C to reset camera
	if ( keyboard.pressed("C") ) 
	{
		camera.position.set( 0, 100, 50 );
		camera.lookAt( 50, 0, 50 );
	}

	// Press W to increase t value to move sweeping points
	if ( keyboard.pressed("W") )
	{
		t = t + (1 / SEGMENTS);
		t_index = t_index + 1;
		t = Math.min(t, 1);
		t_index = Math.min(t_index, SEGMENTS);
		updateOracles();
	}

	// Press S to decrease t value to move sweeping points
	if ( keyboard.pressed("S") )
	{
		t = t - (1 / SEGMENTS);
		t_index = t_index - 1;
		t = Math.max(t, 0);
		t_index = Math.max(t_index, 0);
		updateOracles();
	}
}
/*
	Standard animate and render code
	Do not change/modify
*/
function animate() {

	requestAnimationFrame( animate );
	render();
	inputUpdate();
}

function render() {

	// Set curve visibility using control UI
	splines.bezierCurveObject.mesh.visible = params.cubicBezier;
	//bSpline.mesh.visible = params.bSpline;
	//cubicHermite.chordal.mesh.visible = params.cubicHermite;
	// Set corresponding plots visibility using control UI
	for(var k in plots){
		var plot = plots[k];
		for(var m in plot.obj)
		{
			var mesh = plot.obj[m];
			mesh.visible = params.cubicBezier;
		}
	}

	// Set plot label visibility using control UI
	for(var t in texts){
		var text = texts[t];
		text.visible = params.cubicBezier || params.bSpline || params.cubicHermite;
	}

	// Set sweeping points visibility using control UI
	for(var o in oracles){
		var oracle = oracles[o];
		oracle.visible = params.cubicBezier || params.bSpline || params.cubicHermite;
	}
	
	renderer.render( scene, camera );

}
