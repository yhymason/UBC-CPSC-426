/*
	CPSC 426 - Computer Animation
	University of British Columbia, Vancouver, BC, Canada
	Particle Simulation main function : object management, UI and rendering
	Created by:
		- Mason Yang : yhymason@gmail.com
		- Michiel van de Panne : van@cs.ubc.ca
	2018-11-01
*/
const NUM_PARTICLES = 100;
var container;
var camera, scene, renderer, spotlight;
var timer;

var box;
var system = new ParticleSystem();
var expired_particles = [];

var button_obj = { 
	Launch:function(){
		timer = setInterval(function(){
			for(var p in system.getParticles()){
				var particle = system.getParticles()[p];
				if(particle.life_time <= 0)
				{
					scene.remove(particle.mesh); // remove expired particle from scene
					system.particles.splice(p, 1); // also remove it from the particle system
				}
			}
			if(system.getParticles().length < NUM_PARTICLES){
				var particle = new Particle();
				particle.setMass(0.1);
				particle.setPosition(box.position.clone()); // spawn from the center of box
				system.addParticle(particle);
				update(); // randomize new particle
				scene.add(particle.mesh);
			} 
			system.stepExplicitEuler(0.01);
		}, 10);
	}
};

// slider contents
var params = {
	spread: 0.1,
	color_spread: 0.1,
	life_time: 5.0,
	size: 0.5,
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
	var helper = new THREE.PlaneHelper( plane, 50 );
	scene.add( helper );

	// spawning box for particles
	var box_materials = [
	    new THREE.MeshBasicMaterial( {color: 'blue', opacity: 0.5, side: THREE.DoubleSide} ),        // Left side
	    new THREE.MeshBasicMaterial( {color: 'blue', opacity: 0.5, side: THREE.DoubleSide} ),       // Right side
	    new THREE.MeshBasicMaterial( {color: 'maroon', opacity: 0.0, transparent: true, side: THREE.DoubleSide} ),         // Top side
	    new THREE.MeshBasicMaterial( {color: 'green', opacity: 0.5, side: THREE.DoubleSide} ),      // Bottom side
	    new THREE.MeshBasicMaterial( {color: 'red', opacity: 0.5, side: THREE.DoubleSide} ),       // Front side
	    new THREE.MeshBasicMaterial( {color: 'red', opacity: 0.5, side: THREE.DoubleSide} )         // Back side
	];
	var box_geometry = new THREE.BoxGeometry( 10, 10, 10 );
	box = new THREE.Mesh( box_geometry, box_materials );
	box.position.set( 0, 5.1, 0 );
	scene.add(box); 

	// add GUI controls
	var gui = new dat.GUI();
	var s = gui.add( params, 'spread', 0.0, 1).step(0.1).listen();
	var cs = gui.add( params, 'color_spread', 0.0, 1).step(0.1).listen();
	var lt = gui.add( params, 'life_time', 0.0, 10).step(0.1).listen();
	var size = gui.add( params, 'size', 0.0, 2).step(0.1).listen();
	var ex = gui.add( params, 'external_force_x', -50.0, 50.0).step(0.1).listen();
	var ey = gui.add( params, 'external_force_y', -50.0, 50.0).step(0.1).listen();
	var ez = gui.add( params, 'external_force_z', -50.0, 50.0).step(0.1).listen();
	s.onChange(update);
	cs.onChange(update);
	lt.onChange(update);
	size.onChange(update);
	ex.onChange(update);
	ey.onChange(update);
	ez.onChange(update);
	gui.add( button_obj, 'Launch');

}

// Updates particle properties upon GUI change
function update(){
	var particles = system.getParticles();
	if(particles.length == 0){
	 	return;
	}
	else{
	 	for(var p in particles){
	 		if( particles[p].life_time == params.life_time ) // only randomize new particles
	 		{
	 			var velocity = new THREE.Vector3();
		 		velocity.setX(params.spread * math.random(-50,50));
		 		velocity.setY(params.spread * math.random(80,100));
		 		velocity.setZ(params.spread * math.random(-50,50));
		 		particles[p].setVelocity(velocity);
		 		var colour = new THREE.Color( params.color_spread * math.random(),
		 									 params.color_spread * math.random(),
		 									 params.color_spread * math.random());
		 		particles[p].setColor(colour);
		 		particles[p].setLifeTime(params.life_time);
		 		var force = new THREE.Vector3(params.external_force_x, 
									 		params.external_force_y, 
									 		params.external_force_z);
		 		var size = params.size;
		 		particles[p].setRadius(size);
		 		if(particles[p].forces.length > 0)
		 		{
		 			particles[p].forces[0] = force;
		 		}
		 		else
		 		{
		 			particles[p].applyForce(force);
		 		}
	 		}
	 	}
	}
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