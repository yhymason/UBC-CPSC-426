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
var g = new THREE.Vector3(0, G, 0);

/*
	Basic particle definition
*/
function Particle(){
	this.position = new THREE.Vector3();
	this.velocity = new THREE.Vector3();
	this.radius = 1;
	this.colour = 0x888888;
	this.mesh;

	// Sets the position of this particle, input is a Vector3
	this.setPosition = function( vec3 ){
		this.position.set(vec3.x, vec3.y, vec3.z);
	};

	// Sets the velocity of this particle, input is a Vector3
	this.setVelocity = function( vec3 ){
		this.velocity.set(vec3.x, vec3.y, vec3.z);
	};

	// Sets the color of this particle, input is a Hex
	// Updates the mesh material color if mesh is already set
	this.setColor = function( hex ){
		this.colour = hex;
		if(mesh != undefined)
		{
			var c = {color: hex};
			this.mesh.material.setValues(c);
		}
	};

	// Sets the radius of this particle, input is a number
	// Updates the mesh material size if mesh is already set
	// Initializes the mesh if mesh is not set
	this.setRadius = function( r ){
		this.radius = r;
		if(mesh != undefined)
		{
			var size = {size: this.radius};
			this.mesh.material.setValues(size);
		}
		else
		{
			var geometry = new THREE.Geometry();
			var material = new THREE.PointsMaterial( { color: this.colour , size: this.radius} );
	 		this.mesh = new THREE.Mesh( geometry, material );
		}
		
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
			this.particles.push[particle];
		}
	};

	this.getParticles = function(){
		return this.particles;
	};

	// Take steps using explicit euler method
	this.stepExplicitEuler = function( h ){

	};

	// Take steps using midpoint method (2nd order Runge-Kutta)
	this.stepMidpoint = function( h ){

	};

	// Take steps using trapezoid method
	this.stepTrapezoid = function( h ){

	};


}