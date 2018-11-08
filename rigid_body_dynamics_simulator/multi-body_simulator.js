/* 
	CPSC 426 - Computer Animation
	University of British Columbia, Vancouver, BC, Canada
	Multiple Rigid Body Simulator Main : object management, UI and rendering
	Created by:
		- Mason Yang : yhymason@gmail.com
		- Michiel van de Panne : van@cs.ubc.ca
	2018-10-15
*/
const PI = 3.141592653589793;
var container;
var camera, scene, renderer, spotlight;
var timer;

// Objects of interest
var connection_map;
var point;

var button_obj = { 
	Reset:function(){
		initObjects( scene );
		clearInterval(timer);
	},
	Start:function(){

		clearInterval(timer);
		timer = setInterval(function(){ 
			var bodies = connection_map.getBodies();
			var updates = solveBodies( connection_map );
			//console.log(updates);
			for(var b in bodies){
				var body = bodies[b];
				//console.log(updates[b]);
				body.update( updates[b], 0.01 );
				body.mesh.quaternion._x = body.q.x;
				body.mesh.quaternion._y = body.q.y;
				body.mesh.quaternion._z = body.q.z;
				body.mesh.quaternion._w = body.q.w;
				body.mesh.position.set(body.position.x, body.position.y, body.position.z);
				body.mesh.updateMatrixWorld(true);
				connection_map.updateConnections();
			}
			//connection_map.updateConnections();
		}, 10);
	}
};

init();
animate();

function init() {

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

	// main axes
	//var axes = new THREE.AxesHelper( 500 );
	//scene.add( axes );

	// renderer code
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	container.appendChild( renderer.domElement );
	// Orbit Control
	var controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.damping = 0.2;

	// GUI
	var gui = new dat.GUI();
	gui.add( button_obj, 'Start');
	gui.add( button_obj, 'Reset');

	// Create static object as the docking place
	var geometry = new THREE.Geometry();
	var material = new THREE.PointsMaterial( { color: "blue", size: 2 } );
	var vertex = new THREE.Vector3(30,30,30);
	geometry.vertices.push( vertex );
	point = new THREE.Points( geometry, material );
	point.updateMatrixWorld(true);
	scene.add( point );

	initObjects( scene );
}

// Initialize all the bodies and meshes

function initObjects( scene ){
	if(connection_map !== undefined)
	{
		var bodies = connection_map.getBodies();
		for(var b in bodies){
			scene.remove(bodies[b].mesh);
		}
	}

	// Create first link
	var connection1 = point.localToWorld(point.geometry.vertices[0].clone());
	var body1_geometry = new THREE.BoxGeometry( 2, 4, 6 );
	var translation = new THREE.Vector3().subVectors(connection1, new THREE.Vector3(0,0,3));
	translation = new THREE.Matrix4().makeTranslation(translation.x, translation.y, translation.z);
	var body1 = new Body();
	body1.setGeometry(body1_geometry);
	body1.setMaterial();
	var body1_mesh = new THREE.Mesh( body1.geometry, body1.material );
	body1_mesh.applyMatrix(translation); 
	body1_mesh.updateMatrixWorld(true);
	body1.position = body1_mesh.position;
	body1.mesh = body1_mesh;
	scene.add( body1.mesh );
	// Add first link
	connection_map = new ConnectionMap( connection1 ); // sets the static point of this connection map
	connection_map.addConnection(body1, connection1); // adds the base link
	
	attachBody(connection_map.getBodies()[connection_map.getBodies().length-1], scene);
	attachBody(connection_map.getBodies()[connection_map.getBodies().length-1], scene);
}

/* 
	Attaches a new body to a given body
	Default contact point is the centre of cube's top side 
*/
function attachBody( first_body, scene ){
	// Create a link
	var connection = first_body.mesh.localToWorld(new THREE.Vector3(0,0,-3));
	var body_geometry = new THREE.BoxGeometry( 2, 4, 6 );
	var body = new Body();
	body.setGeometry(body_geometry);
	body.setMaterial();
	var body_mesh = new THREE.Mesh( body.geometry, body.material );
	var translation = new THREE.Vector3().subVectors(connection, new THREE.Vector3(0,0,3));
	translation = new THREE.Matrix4().makeTranslation(translation.x, translation.y, translation.z);
	body_mesh.applyMatrix(translation); 
	body_mesh.updateMatrixWorld(true);
	body.position = body_mesh.position;
	body.mesh = body_mesh;
	scene.add( body.mesh );
	// Add this link
	connection_map.addConnection(first_body, body, connection);
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

	renderer.render( scene, camera );
}