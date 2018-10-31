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
var cone;

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
				body.update( updates[b], 0.01 );
				body.mesh.quaternion._x = body.q.x;
				body.mesh.quaternion._y = body.q.y;
				body.mesh.quaternion._z = body.q.z;
				body.mesh.quaternion._w = body.q.w;
				body.mesh.position.set(body.position.x, body.position.y, body.position.z);
				body.mesh.updateMatrixWorld(true);
			}
			connection_map.updateConnections(0.01);

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
	var axes = new THREE.AxesHelper( 500 );
	scene.add( axes );

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
	var geometry = new THREE.ConeGeometry( 2, 5, 4 );
	var material = new THREE.MeshBasicMaterial( {color: "blue"} );
	var translation = new THREE.Matrix4().makeTranslation(20,40,20);
	var rotation = new THREE.Matrix4().makeRotationX(PI);
	cone = new THREE.Mesh( geometry, material );
	cone.applyMatrix(rotation); 
	cone.applyMatrix(translation);
	cone.updateMatrixWorld(true);
	scene.add( cone );

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

	var translation = new THREE.Matrix4().makeTranslation(20,40,20);
	var rotation = new THREE.Matrix4().makeRotationX(PI);
	// Create first link
	var connection1 = cone.localToWorld(cone.geometry.vertices[0].clone());
	var body1_geometry = new THREE.BoxGeometry( 2, 4, 6 );
	translation = new THREE.Vector3().subVectors(connection1, body1_geometry.vertices[0]);
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
	connection_map = new ConnectionMap();
	connection_map.addConnection(body1, connection1);
	// Create second link
	var connection2 = body1.mesh.localToWorld(body1.mesh.geometry.vertices[6].clone());
	var body2_geometry = new THREE.BoxGeometry( 2, 4, 6 );
	var body2 = new Body();
	body2.setGeometry(body2_geometry);
	body2.setMaterial();
	var body2_mesh = new THREE.Mesh( body2.geometry, body2.material );
	translation = new THREE.Vector3().subVectors(connection2, body2_geometry.vertices[0]);
	translation = new THREE.Matrix4().makeTranslation(translation.x, translation.y, translation.z);
	body2_mesh.applyMatrix(translation); 
	body2_mesh.updateMatrixWorld(true);
	body2.position = body2_mesh.position;
	body2.mesh = body2_mesh;
	scene.add( body2.mesh );
	// Add second link
	connection_map.addConnection(body1, body2, connection2);
	// Create third link
	var connection3 = body2.mesh.localToWorld(body2.mesh.geometry.vertices[6].clone());
	var body3_geometry = new THREE.BoxGeometry( 2, 4, 6 );
	var body3 = new Body();
	body3.setGeometry(body3_geometry);
	body3.setMaterial();
	var body3_mesh = new THREE.Mesh( body3.geometry, body3.material );
	translation = new THREE.Vector3().subVectors(connection3, body3_geometry.vertices[0]);
	translation = new THREE.Matrix4().makeTranslation(translation.x, translation.y, translation.z);
	body3_mesh.applyMatrix(translation); 
	body3_mesh.updateMatrixWorld(true);
	body3.position = body3_mesh.position;
	body3.mesh = body3_mesh;
	scene.add( body3.mesh );
	// Add third link
	connection_map.addConnection(body2, body3, connection3);

	console.log(connection_map.constructMatrixA());
	//console.log(connection_map.constructVectorb());
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