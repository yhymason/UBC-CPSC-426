/* 
	CPSC 426 - Computer Animation
	University of British Columbia, Vancouver, BC, Canada
	Quaternion Visualizer Main : object management, UI and rendering
	Created by:
		- Mason Yang : yhymason@gmail.com
		- Michiel van de Panne : van@cs.ubc.ca
	2018-10-03
*/

var container;
var camera, scene, renderer, spotlight;

var geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
var transformControl;
var keyboard = new THREEx.KeyboardState();

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

	// main plane
	var planeGeometry = new THREE.PlaneBufferGeometry( 100, 100 );
	planeGeometry.rotateX( - Math.PI / 2 );
	var planeMaterial = new THREE.ShadowMaterial( { opacity: 0.3 } );

	var plane = new THREE.Mesh( planeGeometry, planeMaterial );
	plane.receiveShadow = false;
	scene.add( plane );

	var helper = new THREE.GridHelper( 100, 100 );
	helper.material.opacity = 0.25;
	helper.material.transparent = true;
	scene.add( helper );

	// main axes
	var axes = new THREE.AxesHelper( 100 );
	scene.add( axes );

	// renderer code
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	container.appendChild( renderer.domElement );

	var gui = new dat.GUI();

	var controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.damping = 0.2;
	
}

function inputUpdate() {

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

	renderer.render( scene, camera );
}