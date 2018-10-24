/*
	CPSC 426 - Computer Animation
	University of British Columbia, Vancouver, BC, Canada
	Rigid Body utility function : object definitions and helper functions
	Created by:
		- Mason Yang : yhymason@gmail.com
		- Michiel van de Panne : van@cs.ubc.ca
	2018-10-15
*/


/*
	Rigid body object
	Represent orientation with quaternion instead of matrix
	pos: position in space
	linear_vel: linear velocity
	angular_vel: angular velocity
	quaternion: simple quaternion object
	m: mass
*/

const G = -9.81;
var g = new THREE.Vector3(0, G, 0);
function Body( pos, linear_vel, angular_vel, quaternion, m )
{
	this.position = pos || new THREE.Vector3();
	this.v = linear_vel || new THREE.Vector3();
	this.w = angular_vel || new THREE.Vector3();
	this.q = quaternion || new SimpleQuaternion();
	this.m = m || 1;
	this.geometry;
	this.material;
	this.local_tensor = new THREE.Matrix3();
	this.forces = []; // forces on center of mass besides gravity 


	// Sets the geometry property of this body
	// note: the local inertia tensor is also set
	// using THREE JS Matrix3 representation
	this.setGeometry = function( geometry ){
		this.geometry = geometry || new THREE.BoxGeometry( 2, 4, 6 );
		var w = this.geometry.parameters.width;
		var d = this.geometry.parameters.depth;
		var h = this.geometry.parameters.height;
		var I_xx = this.m * (h*h + d*d) / 12;
		var I_yy = this.m * (w*w + d*d) / 12;
		var I_zz = this.m * (w*w + h*h) / 12;
		this.local_tensor.set(I_xx,0,0,
								0,I_yy,0,
								0,0,I_zz);
	};

	// Sets the material property of this body
	this.setMaterial = function( materials ){
		var cube_materials = [
		    new THREE.MeshBasicMaterial( {color: 'red', opacity: 0.5, transparent: true} ),        // Left side
		    new THREE.MeshBasicMaterial( {color: 'red', opacity: 0.5, transparent: true} ),       // Right side
		    new THREE.MeshBasicMaterial( {color: 'green', opacity: 0.5, transparent: true} ),         // Top side
		    new THREE.MeshBasicMaterial( {color: 'green', opacity: 0.5, transparent: true} ),      // Bottom side
		    new THREE.MeshBasicMaterial( {color: 'blue', opacity: 0.5, transparent: true} ),       // Front side
		    new THREE.MeshBasicMaterial( {color: 'blue', opacity: 0.5, transparent: true} )         // Back side
		];
		this.material = materials || cube_materials;
	};

	// Calculates the inertia tensor of this body
	// returns inertia tensor in the world frame
	// computation here uses THREE JS Matrix arithmetic
	this.getInertiaTensor = function(){
		var R = fromQuaternionToRotationMatrix( this.q );
		var R_inv = new THREE.Matrix3().getInverse(R);
		var inertia_tensor = this.local_tensor.clone();
		inertia_tensor.premultiply(R);
		inertia_tensor.multiply(R_inv);
		return inertia_tensor;
	};

	// Applies extra forces to this body
	// each element in the input array should be a Vec3
	this.applyForces = function( array_of_forces ){
		this.forces = array_of_forces;
	}

	// Computes the net force acting on this body
	// forces: array of forces besides gravity
	this.computeNetForce = function(){
		var gravity = g.clone().multiplyScalar(m);
		var net_force = new THREE.Vector3();
		for(var i = 0; i < this.forces.length; i++){
			net_force.add(this.forces[i]);
		}
		net_force.add(gravity);
		return net_force;
	};

	// Compute the net force acting on this body
	// angular_acc: angular acceleration
	this.computeNetTorque = function(){
		return new THREE.Vector3();
	};

	// Solve equations of motion
	// Only called upon single body case without constrain forces
	this.solveSystem = function(){
		//initialize return object
		var ans = {};
		ans.linear = new THREE.Vector3();
		ans.angular = new THREE.Vector3();
		//construct the linear system
		var inertia_tensor = this.getInertiaTensor();
		var inertia_elements = inertia_tensor.toArray(); // inertia_elements are in column-major
		var matrix_A = math.diag([this.m, this.m, this.m, this.m, this.m, this.m]);
		for(var i = 3; i < math.size(matrix_A)[0]; i++){
			for(var j = 3; j < math.size(matrix_A)[1]; j++){
				matrix_A[i][j] = inertia_elements[(i-3)+3*(j-3)]; // e.g. elements[1] is the 1st element of row 2
			}   
		}
		var net_force = this.computeNetForce(); 
		// data type conversion and computation for net_torque
		var net_torque = this.computeNetTorque(); // torque free case <0,0,0>
		var w_cross_I = vectorToPreliminary(this.w).multiply(inertia_tensor);
		w_cross_I = convertMatrix(w_cross_I); // to math js matrix
		var w_cross_I_dot_w = math.multiply(w_cross_I, math.matrix(this.w.toArray())); // math js vector
		w_cross_I_dot_w = new THREE.Vector3().fromArray(w_cross_I_dot_w._data); // back to three js vector
		net_torque.sub(w_cross_I_dot_w); // net torque minus (w cross I dot w)
		//column vector that contains known net force and torque
		var matrix_b = math.matrix([net_force.x, net_force.y, net_force.z,
						net_torque.x, net_torque.y, net_torque.z]);
		// now solve linear system
		var lu = math.lup(matrix_A); // LU decomposition of A
		var x = math.lusolve(lu, matrix_b); // solve A*x = b
		var results = x._data;
		// x is a 1*6 vector
		ans.linear.set(results[0],results[1],results[2]);
		ans.angular.set(results[3],results[4],results[5]);
		return ans;
	};

	// Updates parameters after solving linear systems
	this.update = function( d_t ) {
   		var change = this.solveSystem();
   		var dv = change.linear;
   		var dw = change.angular;
   		//console.log(dv);
   		//update position
   		this.position.add(this.v.clone().multiplyScalar(d_t));
   		//update linear velocity
   		this.v.add(dv.multiplyScalar(d_t));
   		//console.log(this.v);
   		//update quaternion
   		var w_hat = this.w.clone().multiplyScalar(0.5);
   		w_hat = new SimpleQuaternion(w_hat.x, w_hat.y, w_hat.z, 0);
   		var dq = w_hat.multiply(this.q);
   		dq.x *= d_t;
   		dq.y *= d_t;
   		dq.z *= d_t;
   		dq.w *= d_t;
   		this.q.add(dq);
   		//update angular velocity
   		this.w.add(dw.multiplyScalar(d_t));
	};

}

// Converts a vector3 to preliminary
function vectorToPreliminary( vec3 )
{
	var m = new THREE.Matrix3();
	var x = vec3.x;
	var y = vec3.y;
	var z = vec3.z;
	m.set(0,-1*z,y,
		  z,0,-1*x,
		  -1*y,x,0);
	return m;
}

// Converts a THREE JS matrix 3 to Math JS matrix
function convertMatrix( m )
{
	var elements = m.toArray();
	var row1 = [elements[0], elements[3], elements[6]];
	var row2 = [elements[1], elements[4], elements[7]];
	var row3 = [elements[2], elements[5], elements[8]];
	var math_matrix = math.matrix([row1, row2, row3]);
	return math_matrix;
}

/*
	Functions for solving multi-body cases
*/