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
	constantWind: false,
	implicitEuler: false,
	simulation_control: false 
};


var button_obj = { 
	Launch:function(){
		params.simulation_control = true;
	},
	Reset:function(){
		params.simulation_control = false;
		for(var p in garment.planes)
		{
			scene.remove(garment.planes[p]); // add pieces of cloth into the scene
		}
		//scene.remove(garment.test_object);
		initCloth( scene );
	}
};
init();
animate();

function init(){

	container = document.getElementById( 'container' );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xf0f0f0 );

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
	camera.position.set( 30, 30, 30 );
	camera.lookAt( 0, 10, 0 );
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
	var wind = gui.add( params, 'constantWind').listen();
	//var implicit = gui.add( params, 'implicitEuler').listen();
	gui.add( button_obj, 'Launch');
	gui.add( button_obj, 'Reset');
	initCloth( scene );
	//simulate();
}

// Updates particle properties upon GUI change
function initCloth( scene ){
	// cloth initialization
	garment = new Cloth(40,30,5);

	var num_pins = garment.w/garment.segmentLength;
	while(num_pins >= 0){
		garment.addPin(num_pins,0);
		num_pins--;
	}

	garment.translate(0, 50, 0);
	for(var p in garment.planes)
	{
		scene.add(garment.planes[p]); // add pieces of cloth into the scene
	}
	//scene.add(garment.test_object);
	// visualize pins
	for(var i in garment.pins)
	{
		var pin = garment.pins[i];
		var geometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 );
		var material = new THREE.MeshBasicMaterial( {color: 0x888888} );
		var cube = new THREE.Mesh( geometry, material );
		cube.position.copy(pin.position);
		scene.add( cube );
	}
}

// Simulates Cloth and updates geometry 
function simulate(){
	var external_force;
	if (params.constantWind == true){
		external_force = new THREE.Vector3(0,0,0.1);
	}
	else{
		external_force = new THREE.Vector3();
	}

	if( !params.implicitEuler ){
		garment.solveConstraints(); // computes the between-particle forces
	}

	for(var i in garment.particles){ // apply wind forces defined on GUI
		garment.particles[i].applyForce(external_force);
	}

	if( params.implicitEuler ){
		for(var c in garment.constraints){ // updates jacobians
			garment.buildJacobian(garment.constraints[c]);	
		}
	}
	garment.update(0.01, params.implicitEuler );
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

	if(params.simulation_control){
		simulate(); 
	}
	// on each frame change, integrate
	renderer.render( scene, camera );

}