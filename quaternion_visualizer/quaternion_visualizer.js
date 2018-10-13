/* 
	CPSC 426 - Computer Animation
	University of British Columbia, Vancouver, BC, Canada
	Quaternion Visualizer Main : object management, UI and rendering
	Created by:
		- Mason Yang : yhymason@gmail.com
		- Michiel van de Panne : van@cs.ubc.ca
	2018-10-03
*/
const PI = 3.141592653589793;
var container;
var camera, scene, renderer, spotlight;
var timer;

var cube_geometry = new THREE.BoxGeometry( 20, 20, 20 );
var cube_materials = [
    new THREE.MeshBasicMaterial( {color: 'red', opacity: 0.5, transparent: true} ),        // Left side
    new THREE.MeshBasicMaterial( {color: 'red', opacity: 0.5, transparent: true} ),       // Right side
    new THREE.MeshBasicMaterial( {color: 'green', opacity: 0.5, transparent: true} ),         // Top side
    new THREE.MeshBasicMaterial( {color: 'green', opacity: 0.5, transparent: true} ),      // Bottom side
    new THREE.MeshBasicMaterial( {color: 'blue', opacity: 0.5, transparent: true} ),       // Front side
    new THREE.MeshBasicMaterial( {color: 'blue', opacity: 0.5, transparent: true} )         // Back side
];
var transformControl;
var keyboard = new THREEx.KeyboardState();

// Object to be rotated
var cube;
var arrowHelper;
// Rotation math variables
var euler;
var simple_quaternion;
var axis_angle;
var rotation_matrix;
var rotation_count;
// function for excuting rotations
var button_obj = { 
	Reset:function(){
		cube.quaternion._x = 0;
		cube.quaternion._y = 0;
		cube.quaternion._z = 0;
		cube.quaternion._w = 1;
		euler = new THREE.Euler().setFromQuaternion(cube.quaternion);
		simple_quaternion = new SimpleQuaternion();
		axis_angle = fromQuaternionToAxisAngle( simple_quaternion );
		rotation_matrix = fromQuaternionToRotationMatrix( simple_quaternion );
		inputUpdate();
	},
	Animate:function(){
		var axis = axis_angle.k.clone();
		var angle = axis_angle.theta;
		timer = setInterval(function(){ // outer function for sweeping back
			angle -= 0.05;
			if(angle < 0)
			{
				angle = 0;
				cube.setRotationFromAxisAngle(axis, angle);
				clearInterval(timer); // stop outer timer
				timer = setInterval(function(){ // inner function for sweeping forth
					angle += 0.05;
					if(angle > axis_angle.theta)
					{
						angle = axis_angle.theta;
						cube.setRotationFromAxisAngle(axis, angle);
						clearInterval(timer); // stop inner timer
						console.log("stop");
					}
				  	cube.setRotationFromAxisAngle(axis, angle);
				}, 100);
			}
		  	cube.setRotationFromAxisAngle(axis, angle);
		}, 100);
	}
};

var rotation_params = {
	RotateX: 0.0,
	RotateY: 0.0,
	RotateZ: 0.0
};

var folder_1_text = {
	row1: " ",
	row2: " ",
	row3: " "
};

var folder_2_text = {
	w: " ",
	x: " ",
	y: " ",
	z: " "
};

var folder_3_text = {
	k: " ",
	angle: " "
};

init();
animate();

function init() {

	container = document.getElementById( 'container' );

	timer = new THREE.Clock();

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

	var helper = new THREE.GridHelper( 100, 100 );
	helper.material.opacity = 0.3;
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

	// GUI controls and display
	var gui = new dat.GUI();
	var X = gui.add( rotation_params, 'RotateX', 0.0, 2*PI).step(PI/200).listen();
	var Y = gui.add( rotation_params, 'RotateY', 0.0, PI).step(PI/100).listen();
	var Z = gui.add( rotation_params, 'RotateZ', 0.0, 2*PI).step(PI/200).listen();
	X.onChange(rotate);
	Y.onChange(rotate);
	Z.onChange(rotate);
	gui.add( button_obj, 'Reset');
	var folder_1 = gui.addFolder('Rotation Matrix');
	folder_1.add(folder_1_text, "row1").listen();
	folder_1.add(folder_1_text, "row2").listen();
	folder_1.add(folder_1_text, "row3").listen();
	var folder_2 = gui.addFolder('Quaternion');
	folder_2.add(folder_2_text, "w").listen();
	folder_2.add(folder_2_text, "x").listen();
	folder_2.add(folder_2_text, "y").listen();
	folder_2.add(folder_2_text, "z").listen();
	var folder_3 = gui.addFolder('Axis Angle');
	folder_3.add(folder_3_text, "k").listen();
	folder_3.add(folder_3_text, "angle").listen();
	folder_3.add( button_obj, 'Animate');
	var controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.damping = 0.2;

	// Start of Actual objects and rotations
	cube = new THREE.Mesh( cube_geometry, cube_materials );
	cube.position.set( 0, 0, 0 );
	scene.add(cube);

	// Arrow Helper for visualizing axis angle
	var dir = new THREE.Vector3( 1, 0, 0 );
	//normalize the direction vector (convert to vector of length 1)
	dir.normalize();
	var origin = new THREE.Vector3( 0, 0, 0 );
	var length = 1;
	var hex = 0xf442f4;
	arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
	scene.add( arrowHelper );
	
}

// Update GUI text and Helper Objects
function inputUpdate() {

	// update sliders
	rotation_params.RotateX = euler.x;
	rotation_params.RotateY = euler.y;
	rotation_params.RotateZ = euler.z;
	// update texts
	var elements = rotation_matrix.elements;
	folder_1_text.row1 = elements[0].toPrecision(4).toString() + ", " 
				+ elements[3].toPrecision(4).toString() + ", "
				+ elements[6].toPrecision(4).toString() + " ";
	folder_1_text.row2 = elements[1].toPrecision(4).toString() + ", " 
				+ elements[4].toPrecision(4).toString() + ", "
				+ elements[7].toPrecision(4).toString() + " ";
	folder_1_text.row3 = elements[2].toPrecision(4).toString() + ", " 
				+ elements[5].toPrecision(4).toString() + ", "
				+ elements[8].toPrecision(4).toString() + " ";

	folder_2_text.w = "w: " + simple_quaternion.w.toPrecision(4).toString();
	folder_2_text.x	= "x: " + simple_quaternion.x.toPrecision(4).toString();
	folder_2_text.y = "y: " + simple_quaternion.y.toPrecision(4).toString();
	folder_2_text.z = "z: " + simple_quaternion.z.toPrecision(4).toString();
	var array = axis_angle.k.toArray();
	for (var i = 0; i < array.length; i++){
		array[i] = array[i].toPrecision(4);
	}
	folder_3_text.k = "<" + array.toString() + ">";
	folder_3_text.angle = axis_angle.theta.toPrecision(4).toString(); 

	// update arrow helper
	arrowHelper.position.set(axis_angle.k.x, axis_angle.k.y, axis_angle.k.z);
	arrowHelper.setLength(40, 1, 1);
	arrowHelper.setDirection(axis_angle.k.normalize());
}

// Callback function upon slider change to rotate object
function rotate()
{ 
	euler = new THREE.Euler( rotation_params.RotateX, 
							 rotation_params.RotateY, 
							 rotation_params.RotateZ,
							 'XYZ');
	simple_quaternion = fromEulerToQuaternion( euler );
	axis_angle = fromQuaternionToAxisAngle( simple_quaternion );
	rotation_matrix = fromQuaternionToRotationMatrix( simple_quaternion );
	// Now rotate object
	cube.quaternion._x = simple_quaternion.x;
	cube.quaternion._y = simple_quaternion.y;
	cube.quaternion._z = simple_quaternion.z;
	cube.quaternion._w = simple_quaternion.w;
	inputUpdate();
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