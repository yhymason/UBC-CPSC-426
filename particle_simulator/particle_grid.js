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

var Kd = 0.1;
var Kp = 1 - Kd;
var MASS = 0.01;
var eps = Number.EPSILON;

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
	this.test_object;
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
		pin.setPosition(particle.position.clone().add(new THREE.Vector3(0, this.segmentLength/20, 0)));
		pin.setRadius(0.5);
		this.pins.push(pin);
		this.constraints.push( [
			pin,
			particle,
			this.segmentLength/20 // 0 rest length because pined particles should stay fixed
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

	if(this.horizontal_segs == 0){
		var material = new THREE.LineBasicMaterial({
			color: 0x0000ff
		});

		var geometry = new THREE.Geometry();
		geometry.vertices.push( this.particles[ this.particle_index( 0, 0 ) ].position,
								this.particles[ this.particle_index( 1, 0 ) ].position);
		this.test_object = new THREE.Line( geometry, material );
	}
	else{
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

	// Builds a Jacobian 6*6 matrix for a given particle 
	// updates the jacobians if already exists
	this.buildJacobian = function( constraint ){
		// extract data from constraint object
		var pa = constraint[0];
		var pb = constraint[1];
		var l0 = constraint[2]; // rest length

		// computes all the values needed for jacobian
		var identity = math.identity(3);
		// d_ij and d_ij transpose in the Jvx formula
		var d_ab = new THREE.Vector3().subVectors(pb.position, pa.position);
		d_ab = math.matrix(d_ab.toArray()); // convert to math.js vector
		var d_ab_tr = new THREE.Vector3().subVectors(pb.position, pa.position);
		d_ab_tr = math.matrix([[d_ab_tr.x],[d_ab_tr.y],[d_ab_tr.z]]); // convert to math.js vector then transpose
		// compute the right 3*3 half of Jvx formula  
		var Jvx_right = columnMultiplyRow(d_ab_tr, d_ab);
		Jvx_right = math.multiply(Jvx_right, 1/(math.multiply(d_ab, d_ab_tr)._data[0]));
		var d_ab_norm = math.norm(d_ab);
		var l_div_d = l0/(d_ab_norm);
		Jvx_right = math.multiply(Jvx_right, l_div_d);
		// compute the left 3*3 half of Jvx formula
		var Jvx_left = math.identity(3);
		Jvx_left = math.multiply(Jvx_left, (1 - l_div_d));
		// merge right and left
		// console.table(Jvx_left._data);
		var Jvx = math.add(Jvx_left, Jvx_right);
		Jvx = math.multiply(Jvx, -1*Kp/pa.mass);

		// construct 3*3 Jvv
		var Jvv = math.identity(3);
		Jvv = math.multiply(Jvv, -1*Kd/pa.mass);
		// console.table(Jvv._data);
		// sum up the jacobians for each particle from each constraint
		addMatrix( pa.jacobian, Jvx, [3,0] );
		addMatrix( pa.jacobian, Jvv, [3,3] );
		addMatrix( pb.jacobian, math.multiply(Jvx, -1), [3,0] );
		addMatrix( pb.jacobian, math.multiply(Jvv, -1), [3,3] );
	
	};

	// Combines all jacobians from each particle into one global jacobian
	// Called by implicit Euler function
	this.buildGlobalJacobian = function(){
		var global_jacobian = math.zeros(this.num_particles * 6, this.num_particles * 6);
		for(var i = 0; i < this.num_particles; i++){
			//console.table(this.particles[i].jacobian._data);
			// add all Jxv to the global jacobian
			var identity = math.identity(3);
			var Jxv_index = [i*6, 3 + i*6];
			insertMatrix(global_jacobian, identity, Jxv_index);
			// add all Jvx to the global jacobian
			var Jvx = math.subset(this.particles[i].jacobian, math.index([3, 4, 5], [0, 1, 2]));
			var Jvx_index = [3 + i*6, i*6];
			insertMatrix(global_jacobian, Jvx, Jvx_index);
			// add all Jvv to the global jacobian
			var Jvv = math.subset(this.particles[i].jacobian, math.index([3, 4, 5], [3, 4, 5]));
			var Jvv_index = [3 + i*6, 3 + i*6];
			insertMatrix(global_jacobian, Jvv, Jvv_index);
		}
		//console.table(global_jacobian._data);
		return global_jacobian;
	};

	// Integrates the particles using time step h
	this.update = function( h, if_implicit ){
		this.system.particles = this.particles; // make sure system has the same particles
		if(if_implicit)
		{
			this.system.stepImplicit( this.buildGlobalJacobian(), h );
		}
		else{
			this.system.stepMidpoint( h );
		}
		
		this.particles = this.system.particles; // make sure particles are the same as the system's
		// updates geometries 
		if(this.horizontal_segs == 0){
			var line_geometry = this.test_object.geometry;
			line_geometry.vertices[0].copy(this.particles[ this.particle_index( 0, 0 ) ].position);
			line_geometry.vertices[1].copy(this.particles[ this.particle_index( 1, 0 ) ].position);
			line_geometry.verticesNeedUpdate = true;
		}
		else{
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
		}
		
	};
}

// Inserts a 3*3 MATH JS matrix into a parent MATH JS matrix given the starting index
function insertMatrix( parent_matrix, matrix, index /*[row column]*/ ){
	var row = index[0];
	var column = index[1];
	var parent_size = math.size(parent_matrix);
	if(parent_size[0] < 3 || parent_size[1] < 3)
	{
		console.log("parent_matrix smaller than 3*3");
		return;
	}
	else if(row+3 > parent_size[0] || column+3 > parent_size[1])
	{
		console.log("insertion out of parent matrix bound");
		return;
	}
	else
	{
		parent_matrix = parent_matrix._data;
		matrix = matrix._data;
		for(var i = row; i < row + 3; i++)
		{
			for(var j = column; j < column + 3; j++)
			{	
				parent_matrix[i][j] = matrix[i%3][j%3];
			}
		}
		parent_matrix = math.matrix(parent_matrix);
		matrix = math.matrix(matrix);
	}
}


// Adds the values from a 3*3 MATH JS matrix to the subset of a parent MATH JS matrix given the starting index
function addMatrix( parent_matrix, matrix, index /*[row column]*/ ){
	var row = index[0];
	var column = index[1];
	parent_matrix = parent_matrix._data;
	matrix = matrix._data;
	for(var i = row; i < row + 3; i++)
	{
		for(var j = column; j < column + 3; j++)
		{
			parent_matrix[i][j] += matrix[i%3][j%3];
		}
	}
	parent_matrix = math.matrix(parent_matrix);
	matrix = math.matrix(matrix);
}  

// Multiplies a column vector with a row vector(MATH JS)
// two input vectors are transpose of each other
function columnMultiplyRow( column_vec, row_vec ){
	column_vec = column_vec._data;
	row_vec = row_vec._data;
	length = column_vec.length;
	output = math.zeros(length,length)._data;
	for(var i = 0; i < length; i++){
		var column = math.multiply(column_vec, row_vec[i]);
		column = math.flatten(column);
		for(var j = 0; j < length; j++)
		{
			output[i][j] = column[j];
		}
	}
	output = math.matrix(output);
	column_vec = math.matrix(column_vec);
	row_vec = math.matrix(row_vec);
	return output;
}