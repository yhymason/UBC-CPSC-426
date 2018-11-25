/*
	CPSC 426 - Computer Animation
	University of British Columbia, Vancouver, BC, Canada
	Simple Cloth Simulation main function : object management, UI and rendering
	Created by:
		- Mason Yang : yhymason@gmail.com
		- Michiel van de Panne : van@cs.ubc.ca
	2018-11-20
*/

var container;
var camera, scene, renderer, spotlight;
var timer;

// cloth object
var garment;

// slider contents
var params = {
	external_force_x: 0.0,
	external_force_y: 0.0,
	external_force_z: 0.0
};

init();
animate();

function init(){

	container = document.getElementById( 'container' );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xf0f0f0 );

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
	camera.position.set( 50, 50, 50 );
	camera.lookAt( 0, 0, 0 );
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

	// renderer code
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	container.appendChild( renderer.domElement );
	// Orbit Control
	var controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.damping = 0.2;

	// ground plane
	var plane = new THREE.Plane( new THREE.Vector3(0,1,0) );
	var helper = new THREE.PlaneHelper( plane, 100 );
	scene.add( helper );

	// add GUI controls
	var gui = new dat.GUI();
	var ex = gui.add( params, 'external_force_x', -5.0, 5.0).step(0.1).listen();
	var ey = gui.add( params, 'external_force_y', -5.0, 5.0).step(0.1).listen();
	var ez = gui.add( params, 'external_force_z', -5.0, 5.0).step(0.1).listen();
	initCloth( scene );
	// 
}

// Updates particle properties upon GUI change
function initCloth( scene ){
	// cloth initialization
	garment = new Cloth(40,30,5);
	var num_pins = 8
	while(num_pins >= 0){ // add 8 pins on top
		garment.addPin(num_pins,0);
		num_pins--;
	}
	garment.translate(0, 50, 0);
	for(var p in garment.planes)
	{
		scene.add(garment.planes[p]); // add pieces of cloth into the scene
	}
	// visualize pins
	for(var i in garment.pins)
	{
		var pin = garment.pins[i];
		var geometry = new THREE.BoxGeometry( 1, 1, 1 );
		var material = new THREE.MeshBasicMaterial( {color: 0x888888} );
		var cube = new THREE.Mesh( geometry, material );
		cube.position.copy(pin.position);
		scene.add( cube );
	}
}

// Simulates Cloth and updates geometry 
function simulate(){
	var external_force = new THREE.Vector3(
		params.external_force_x,
		params.external_force_y,
		params.external_force_z
	);
	garment.solveConstraints(); // computes the between-particle forces
	for(var i in garment.particles){ // apply external forces defined on GUI
		garment.particles[i].applyForce(external_force);
	}
	garment.update(0.01);
}


/*
	Standard animate and render code
	Do not change/modify
*/
function animate() {

	requestAnimationFrame( animate );
	render();

}

function render() {

	simulate(); // on each frame change, integrate
	renderer.render( scene, camera );

}