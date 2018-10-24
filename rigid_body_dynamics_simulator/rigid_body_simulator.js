/* 
	CPSC 426 - Computer Animation
	University of British Columbia, Vancouver, BC, Canada
	Rigid Body Simulator Main : object management, UI and rendering
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
var cube;
var arrowHelper;
var body;

var button_obj = { 
	Reset:function(){

		// reset body parameters
		body.v = new THREE.Vector3();
		body.position = new THREE.Vector3();
		body.w = new THREE.Vector3();
		body.q = new SimpleQuaternion();
		for (var key in dynamics_params) {
		  	dynamics_params[key] = 0.0;
		}
		// reset everything used by UI
		clearInterval(timer);
		arrowUpdate();
		update();
	},
	Launch:function(){
		var v = new THREE.Vector3(dynamics_params.Linear_Vx, 
									dynamics_params.Linear_Vy, 
									dynamics_params.Linear_Vz);
		var w = new THREE.Vector3(dynamics_params.Angular_Wx, 
									dynamics_params.Angular_Wy, 
									dynamics_params.Angular_Wz);
		// set initial velocities
		body.v = v;
		body.w = w;
		timer = setInterval(function(){ 
			body.update(0.01); // 100 ms = 0.1s & update body dynamics
			update(); // update objects rendered
			if(body.position.y <= -50)
			{
				clearInterval(timer);
				console.log("stop there");
			}
		}, 10);
	}
};

// slider contents
var dynamics_params = {
	Linear_Vx: 0.0,
	Linear_Vy: 0.0,
	Linear_Vz: 0.0,
	Angular_Wx: 0.0,
	Angular_Wy: 0.0,
	Angular_Wz: 0.0
};

// text contents
var stats_text = {
	position: " ",
	linear_velocity: " ",
	angular_velocity: " "
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

	// GUI initialization
	var gui = new dat.GUI();
	var Vx = gui.add( dynamics_params, 'Linear_Vx', 0.0, 100.0).step(0.1).listen();
	var Vy = gui.add( dynamics_params, 'Linear_Vy', 0.0, 100.0).step(0.1).listen();
	var Vz = gui.add( dynamics_params, 'Linear_Vz', 0.0, 100.0).step(0.1).listen();
	var Wx = gui.add( dynamics_params, 'Angular_Wx', 0.0, 10.0).step(0.1).listen();
	var Wy = gui.add( dynamics_params, 'Angular_Wy', 0.0, 10.0).step(0.1).listen();
	var Wz = gui.add( dynamics_params, 'Angular_Wz', 0.0, 10.0).step(0.1).listen();
	Vx.onChange(arrowUpdate);
	Vy.onChange(arrowUpdate);
	Vz.onChange(arrowUpdate);
	gui.add( button_obj, 'Launch');
	gui.add( button_obj, 'Reset');
	var stats_folder = gui.addFolder('Object Stats');
	stats_folder.add(stats_text, "position").listen();
	stats_folder.add(stats_text, "linear_velocity").listen();
	stats_folder.add(stats_text, "angular_velocity").listen();

	// Arrow Helper for visualizing launching direction
	var dir = new THREE.Vector3( 1, 0, 0 );
	//normalize the direction vector (convert to vector of length 1)
	dir.normalize();
	var origin = new THREE.Vector3( 0, 0, 0 );
	var length = 20;
	var hex = 0xf442f4;
	arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex, 2, 2);
	scene.add( arrowHelper );

	// Rigid body objects initialization
	var init_pos = new THREE.Vector3();
	var init_v = new THREE.Vector3(dynamics_params.Linear_Vx, 
									dynamics_params.Linear_Vy, 
									dynamics_params.Linear_Vz);
	var init_w = new THREE.Vector3(dynamics_params.Angular_Wx, 
									dynamics_params.Angular_Wy, 
									dynamics_params.Angular_Wz);
	var init_q = new SimpleQuaternion();
	var m = 10;

	body = new Body( init_pos, init_v, init_w, init_q, m );
	body.setGeometry();
	body.setMaterial();
	cube = new THREE.Mesh( body.geometry, body.material );
	cube.position.set( 0, 0, 0 );
	scene.add(cube);

	update();
}

// updates arrow helper upon slider change
function arrowUpdate() {
	var direction = new THREE.Vector3(dynamics_params.Linear_Vx, 
									dynamics_params.Linear_Vy, 
									dynamics_params.Linear_Vz);
	arrowHelper.setDirection(direction.normalize());
}

// updates objects and displayed values
function update() {

	// update geometry
	cube.quaternion._x = body.q.x;
	cube.quaternion._y = body.q.y;
	cube.quaternion._z = body.q.z;
	cube.quaternion._w = body.q.w;
	cube.position.set(body.position.x, body.position.y, body.position.z);

	// update text
	stats_text.position = "<x: " + body.position.x + 
							", y: " + body.position.y +
							", z: " + body.position.z + ">";
	stats_text.linear_velocity = "<x: " + body.v.x + 
							", y: " + body.v.y +
							", z: " + body.v.z + ">";
	stats_text.angular_velocity = "<x: " + body.w.x + 
							", y: " + body.w.y +
							", z: " + body.w.z + ">";

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