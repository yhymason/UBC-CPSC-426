/*
	CPSC 426 - Computer Animation
	University of British Columbia, Vancouver, BC, Canada
	Particle utility function : object definitions and helper functions
	Created by:
		- Mason Yang : yhymason@gmail.com
		- Michiel van de Panne : van@cs.ubc.ca
	2018-11-01
*/


const G = -9.81;

/*
	Basic particle definition
*/
function Particle(){
	this.position = new THREE.Vector3();
	this.velocity = new THREE.Vector3();
	this.radius = 1;
	this.colour = new THREE.Color( 0xffffff );
	this.mesh;
	this.mass = 0;
	this.forces = [];
	this.life_time = 5; // 10 seconds default life time

	// Sets the life time of this particle
	this.setLifeTime = function( lt ){
		this.life_time = lt;
	};

	// Sets the position of this particle, input is a Vector3
	this.setPosition = function( vec3 ){
		this.position.set(vec3.x, vec3.y, vec3.z);
	};

	// Sets the velocity of this particle, input is a Vector3
	this.setVelocity = function( vec3 ){
		this.velocity.set(vec3.x, vec3.y, vec3.z);
	};

	// Sets the mass of this particle, input is a number
	this.setMass = function( m ){
		this.mass = m;
	}

	// Sets the color of this particle, input is a Hex
	// Updates the mesh material color if mesh is already set
	this.setColor = function( c ){
		this.colour = c;
		if(this.mesh != undefined)
		{
			this.mesh.material.color = this.colour;
		}
	};

	// Sets the radius of this particle, input is a number
	// Updates the mesh material size if mesh is already set
	// Initializes the mesh if mesh is not set
	this.setRadius = function( r ){
		if(this.mesh == undefined)
		{
			this.radius = r;
			var geometry = new THREE.SphereGeometry( this.radius, 32, 32 );
			var material = new THREE.MeshBasicMaterial(); 
	 		this.mesh = new THREE.Mesh( geometry, material );
	 		this.setColor(this.colour);
	 		this.mesh.position.set(this.position.x, this.position.y, this.position.z);
		}
	};

	// Apply a force on this particle
	this.applyForce = function( f ){
		if(f.isVector3 == true){
			this.forces.push(f);
		}
	};

	// Computes the netforce acting on this particle
	this.computeNetForce = function(){
		var netForce = new THREE.Vector3();
		for(var i = 0; i < this.forces.length; i++){
			netForce.add(this.forces[i]);
		}
		var g = new THREE.Vector3(0, this.mass*G, 0);
		netForce.add(g);

		return netForce;
	};

}

function ParticleSystem(){
	this.particles = [];
	// Add a particle object to this particle system
	// Performs simple type check
	this.addParticle = function( particle )
	{	
		var r = particle.radius;
		if( r != undefined && r != 0)
		{
			this.particles.push(particle);
		}
	};

	this.getParticles = function(){
		return this.particles;
	};

	// Take steps using explicit euler method
	this.stepExplicitEuler = function( h ){
		for(var i = 0; i < this.particles.length; i++){
			var v = this.particles[i].velocity;
			var p = this.particles[i].position;
			var f = this.particles[i].computeNetForce();
			var m = this.particles[i].mass;
			var acceleration = f.clone().multiplyScalar(1/m);
			var new_p = p.clone().add(v.clone().multiplyScalar(h));
			var new_v = v.clone().add(acceleration.multiplyScalar(h));
			this.particles[i].setPosition(new_p);
			this.particles[i].setVelocity(new_v);
			this.particles[i].life_time -= h;  
			this.particles[i].mesh.position.set(new_p.x, new_p.y, new_p.z);
		}
	};

	// Take steps using midpoint method (2nd order Runge-Kutta)
	this.stepMidpoint = function( h ){
		this.stepExplicitEuler(0.5*h);
		this.stepExplicitEuler(h);
	};

	// Take steps using trapezoid method
	this.stepTrapezoid = function( h ){

	};


}