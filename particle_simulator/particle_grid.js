/*
	CPSC 426 - Computer Animation
	University of British Columbia, Vancouver, BC, Canada
	Particle Grid utility function : object definitions and helper functions
	Created by:
		- Mason Yang : yhymason@gmail.com
		- Michiel van de Panne : van@cs.ubc.ca
	2018-11-20
*/

/**
	A piece of rectangular cloth represented by 
	particles and constraints
*/

var Kd = 0.10;
var Kp = 1 - Kd;
var MASS = 0.01;

function Cloth( width, height, segmentLength ){
	this.w = width;
	this.h = height;
	this.segmentLength = segmentLength; // also acts as rest length between particle pairs
	this.pins = []; // pins used to fix the cloth
	this.particles = [];
	this.constraints = [];
	this.horizontal_segs = (this.w/this.segmentLength);
	this.vertical_segs = (this.h/this.segmentLength);
	this.num_particles = (this.horizontal_segs+1) * (this.vertical_segs+1);
	this.planes = []; // storing all the meshes

	// create a particle system for this Cloth
	this.system = new ParticleSystem();

	// converts 2d indexing to 1d array indexing for particles
	this.particle_index = function( j, i ){
		var index = j + i * ( this.horizontal_segs + 1 );
		return index;
	};

	// Adds a pin at the position of one of the particles
	// j, i: indices refering a particle on the grid
	this.addPin = function( j, i ){
		var pin = new Particle();
		var particle = this.particles[this.particle_index( j, i )];
		pin.setMass(MASS);
		pin.setPosition(particle.position);
		pin.setRadius(0.5);
		this.pins.push(pin);
		this.constraints.push( [
			pin,
			particle,
			0 // 0 rest length because pined particles should stay fixed
		] );
	};

	// spawn particles and their positions
	for(var i = 0; i <= this.vertical_segs; i++){
		for(var j = 0; j <= this.horizontal_segs; j++){
			var particle = new Particle();
			particle.setMass(MASS);
			var pos = new THREE.Vector3(j*this.segmentLength, -1*i*this.segmentLength,0);
			particle.setPosition(pos);
			particle.setRadius(0.5);
			this.particles.push(particle);
		}
	}

	// construct planes using points from each 2*2 block
	for(var i = 0; i < this.vertical_segs; i++){
		for(var j = 0; j < this.horizontal_segs; j++){
			var plane_geometry = new THREE.Geometry();
			plane_geometry.vertices.push(
				this.particles[ this.particle_index( j, i ) ].position,
				this.particles[ this.particle_index( j+1, i ) ].position,
				this.particles[ this.particle_index( j+1, i+1 ) ].position,
				this.particles[ this.particle_index( j, i+1 ) ].position,
				this.particles[ this.particle_index( j, i ) ].position,
			);
			plane_geometry.faces.push(
				new THREE.Face3( 0, 1, 2 ),
				new THREE.Face3( 1, 2, 3 ),
				new THREE.Face3( 2, 3, 4 ),
			);
			var plane_material = new THREE.MeshLambertMaterial( {color: Math.random() * 0xffffff, side: THREE.DoubleSide } );
			var plane = new THREE.Mesh( plane_geometry, plane_material );
			this.planes.push(plane);
		}
	}

	this.system.particles = this.particles; // push the particles to the system;

	var i, j;
	// establish constraints
	// add cases like:
	// 	——
	// |
	for ( i = 0; i < this.vertical_segs; i++ ) {
		for ( j = 0; j < this.horizontal_segs; j++ ) {
			this.constraints.push( [
				this.particles[ this.particle_index( j, i ) ],
				this.particles[ this.particle_index( j, i + 1 ) ],
				this.segmentLength
			] );
			this.constraints.push( [
				this.particles[ this.particle_index( j, i ) ],
				this.particles[ this.particle_index( j + 1, i ) ],
				this.segmentLength
			] );
		}
	}

	// add cases for the rightmost vertical segments
	for ( j = this.horizontal_segs, i = 0; i < this.vertical_segs; i++ ) {
		this.constraints.push( [
			this.particles[ this.particle_index( j, i ) ],
			this.particles[ this.particle_index( j, i + 1 ) ],
			this.segmentLength
		] );
	}
	// add cases for the bottom horizontal segments
	for ( i = this.vertical_segs, j = 0; j < this.horizontal_segs; j++ ) {
		this.constraints.push( [
			this.particles[ this.particle_index( j, i ) ],
			this.particles[ this.particle_index( j + 1, i ) ],
			this.segmentLength
		] );
	}

	// add diagonal constraints
	for ( i = 0; i < this.vertical_segs; i++ ) {
		for ( j = 0; j < this.horizontal_segs; j++ ) {
			this.constraints.push( [
				this.particles[ this.particle_index( j, i ) ],
				this.particles[ this.particle_index( j + 1, i + 1 ) ],
				this.segmentLength * Math.sqrt(2)
			] );
			this.constraints.push( [
				this.particles[ this.particle_index( j + 1, i ) ],
				this.particles[ this.particle_index( j, i + 1) ],
				this.segmentLength * Math.sqrt(2)
			] );
		}
	}


	// Translates the Cloth by given x,y,z values
	this.translate = function( x, y, z ){
		var translation = new THREE.Vector3(x,y,z);
		for(var i in this.particles){
			var particle = this.particles[i];
			particle.position.addVectors(particle.position, translation);
		}
		for(var i in this.pins){
			var pin = this.pins[i];
			pin.position.addVectors(pin.position, translation);
		}
		this.system.particles = this.particles;
	}

	// Solves each constraint and apply forces to each particle
	this.solveConstraints = function(){
		// first set the external forces of each particle to empty
		for(var i in this.particles){
			var particle = this.particles[i];
			particle.forces = [];
		}

		// now for each constraint, solve for the pair of forces on each particle
		for(var i in this.constraints){
			var constraint = this.constraints[i];
			var pa = constraint[0];
			var pb = constraint[1];
			var l0 = constraint[2]; // rest length

			var l_hat = new THREE.Vector3().subVectors(pb.position, pa.position);
			var l_length = l_hat.length();
			l_hat = l_hat.divideScalar(l_length);
			if(l_length == 0){
				l_hat = new THREE.Vector3();
			}
			var l_dot = new THREE.Vector3().subVectors(pb.velocity, pa.velocity);
			l_dot = l_dot.multiply(l_hat);
			var Fb_spring = l_hat.clone().multiplyScalar(-1*Kp*(l_length - l0));
			var Fb_damp = new THREE.Vector3().multiplyVectors(l_dot, l_hat);
			Fb_damp.multiplyScalar(-1*Kd);
			var Fb_net = new THREE.Vector3().addVectors(Fb_spring, Fb_damp);
			pa.applyForce(Fb_net.clone().multiplyScalar(-1));
			pb.applyForce(Fb_net.clone());
		}
		this.system.particles = this.particles; // make sure system has the same particles
	};

	// Integrates the particles using time step h
	this.update = function( h ){
		this.system.particles = this.particles; // make sure system has the same particles
		this.system.stepMidpoint( h );
		this.particles = this.system.particles; // make sure particles are the same as the system's
		// updates geometries 
		for(var i = 0; i < this.vertical_segs; i++){
			for(var j = 0; j < this.horizontal_segs; j++){
				var plane_geometry = this.planes[j + i * ( this.horizontal_segs )].geometry;
				plane_geometry.vertices[0].copy(this.particles[ this.particle_index( j, i ) ].position);
				plane_geometry.vertices[1].copy(this.particles[ this.particle_index( j+1, i ) ].position);
				plane_geometry.vertices[2].copy(this.particles[ this.particle_index( j+1, i+1 ) ].position);
				plane_geometry.vertices[3].copy(this.particles[ this.particle_index( j, i+1 ) ].position);
				plane_geometry.vertices[4].copy(this.particles[ this.particle_index( j, i ) ].position);
				plane_geometry.verticesNeedUpdate = true;
			}
		}
	};
}