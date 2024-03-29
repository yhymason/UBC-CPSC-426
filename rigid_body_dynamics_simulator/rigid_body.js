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
	this.mesh;
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
		for(var f in array_of_forces){
			this.forces.push(f);
		}
	}

	// Computes the net force acting on this body
	// forces: array of forces besides gravity
	this.computeNetForce = function(){
		var gravity = g.clone().multiplyScalar(this.m);
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
	this.update = function( change, t ) {
   		var update;
   		var d_t;
   		if(arguments.length == 2){ // if an update tuple is passed to this function
   			update = arguments[0];
   			d_t = arguments[1];
   		}
   		else // else handles the non-constrained case
   		{
   			update = this.solveSystem();
   			d_t = arguments[0];
   		}
   		var dv = update.linear;
   		var dw = update.angular;
   		//update position
   		this.position.add(this.v.clone().multiplyScalar(d_t));
   		//update linear velocity
   		this.v.add(dv.clone().multiplyScalar(d_t));
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
   		this.w.add(dw.clone().multiplyScalar(d_t));
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
function solveBodies( connection_map ){
	var matrix_A = connection_map.constructMatrixA();
	var matrix_b = connection_map.constructVectorb();
	var lu = math.lup(matrix_A); // LU decomposition of A
	var x = math.lusolve(lu, matrix_b); // solve A*x = b
	var results = x._data;
	var updates = [];
	var num_bodies = connection_map.getBodies().length;
	for(var i = 0; i < num_bodies; i++){
		var update = {};
		update.linear = new THREE.Vector3().set(results[6*i], results[6*i+1], results[6*i+2]);
		update.angular = new THREE.Vector3().set(results[6*i+3], results[6*i+4], results[6*i+5]);
		updates.push(update);
	}
	return updates;
}

// Object for storing the inter-body information 
function ConnectionMap( static_contact ){
	this.relationships = []; // array of constraints 
	this.static_contact = static_contact; // the contact point's location on the static object
	// Gets an array of bodies that are connected in this map
	this.getBodies = function(){
		var bodies = [];
		for(var r in this.relationships){
			var relationship = this.relationships[r];
			var length = Object.keys(relationship).length;
			if(length == 6)
			{
				bodies.push(relationship.first);
			}
			else
			{
				bodies.push(relationship.second);
			}
		}
		return bodies;
	};

	// Adds a connection between two bodies at a given point
	this.addConnection = function( body1, body2, point /* or (body1, point)*/){
		if(arguments.length == 3){
			var relationship = {};
			relationship.first = arguments[0]; // first body in this constraint 
			relationship.contact_point = arguments[2]; // contact point's location
			relationship.contact_point_local = []; // array of contact points' position in each body's local frame
			// contact point's location in each body's local frame
			relationship.contact_point_local.push(new THREE.Vector3().subVectors(arguments[2], arguments[0].position));
			relationship.contact_point_local.push(new THREE.Vector3().subVectors(arguments[2], arguments[1].position));
			relationship.second = arguments[1]; // second body in this constraint
			relationship.rowR = []; // r tilda matrices in the row Jacobian
			relationship.columnR = []; // r tilda matrices in the column Jacobian
			relationship.r_vectors = []; // r vectors for each body
			if(this.hasRelationship(arguments[0],
				arguments[1],
				arguments[2]) == false)
			{
				this.relationships.push(relationship);
			}
		}
		else if(arguments.length == 2){ // static + one body case
			var relationship = {};
			relationship.first = arguments[0]; // first body in this constraint 
			relationship.contact_point = arguments[1]; // contact point's location
			relationship.contact_point_local = []; // array of contact points' position in each body's local frame
			// contact point's location in each body's local frame
			//relationship.contact_point_local.push(new THREE.Vector3(0,0,3));
			relationship.contact_point_local.push(new THREE.Vector3().subVectors(arguments[1], arguments[0].position));
			relationship.rowR = []; // r tilda matrices in the row Jacobian
			relationship.columnR = []; // r tilda matrices in the column Jacobian
			relationship.r_vectors = []; // r vectors for each body
			if(this.hasRelationship(arguments[0],arguments[1]) == false)
			{
				this.relationships.push(relationship);
			}
		}
		else
			return;
			
	};

	// Updates all the connection points upon body transformation
	// to be called after all bodies are updated
	this.updateConnections = function(){
		for(var r in this.relationships){
			var relationship = this.relationships[r];
			var body = relationship.first;
			// each constraint's contact point is updated with respect to the first body 
			var new_point = body.mesh.localToWorld(relationship.contact_point_local[0].clone());
			relationship.contact_point = new_point;
		}
	};

	// Checks if a connection already exists
	this.hasRelationship = function( body1, body2, point /* or (body1, point)*/){
		for(var r in this.relationships){
			var relationship = this.relationships[r];
			var length = Object.keys(relationship).length;
			if(length === 7 && arguments.length === 3) // check for regular 2 bodies + 1 point case
			{
				if(relationship.first.position.equals(arguments[0]) && 
				relationship.second.position.equals(arguments[1]) && 
				relationship.contact_point.equals(arguments[2])){
					return true;
				}
			}
			else if(length === 6 && arguments.length === 2) // check for 1 static + 1 body + 1 point case
			{
				if(relationship.first.position.equals(arguments[0]) && 
				relationship.contact_point.equals(arguments[1])){
					return true;
				}
			}
			
		}
		return false;
	};

	// Construct all the r tilda matrics required for the RBD linear system
	this.constructRMatrix = function(){
		for(var r in this.relationships){
			var relationship = this.relationships[r];
			var length = Object.keys(relationship).length;
			// clear each constraint R arrays
			relationship.rowR = []; // r tilda matrices in the row Jacobian
			relationship.columnR = []; // r tilda matrices in the column Jacobian
			relationship.r_vectors = []; // r vectors for each body
			if(length == 7) // regular 2 body case
			{
				var b1 = relationship.first;
				var b2 = relationship.second;
				var contact_point1 = relationship.contact_point; // contact point's world position on first body
				var contact_point2 = b2.mesh.localToWorld(relationship.contact_point_local[1].clone()); // contact point's world position on second body
				var r1_tilda = new THREE.Vector3().subVectors(contact_point1, b1.position);
				var r2_tilda = new THREE.Vector3().subVectors(contact_point2, b2.position);
				relationship.r_vectors.push(r1_tilda);
				relationship.r_vectors.push(r2_tilda);
				r1_tilda = vectorToPreliminary(r1_tilda);
				relationship.rowR.push(r1_tilda);
				relationship.columnR.push(r1_tilda.clone().multiplyScalar(-1));
				r2_tilda = vectorToPreliminary(r2_tilda);
				relationship.columnR.push(r2_tilda);
				relationship.rowR.push(r2_tilda.clone().multiplyScalar(-1));
			}
			else // 1 static and 1 body case
			{
				var b1 = relationship.first;
				var p = relationship.contact_point;
				var r1_tilda = new THREE.Vector3().subVectors(p, b1.position);
				relationship.r_vectors.push(r1_tilda);
				r1_tilda = vectorToPreliminary(r1_tilda);
				relationship.rowR.push(r1_tilda);
				relationship.columnR.push(r1_tilda.clone().multiplyScalar(-1));
			}
		}
	};

	// Constructs the b vector that contains all the known values for solving A*x=b
	this.constructVectorb = function(){
		var size = this.relationships.length;
		var matrix_b = []; // 6 for each body and 3 for each Fc
		var bodies = this.getBodies();
		// loop adding all the net forces and net torques
		for(var i = 0; i < size; i++){
			var mg = bodies[i].computeNetForce();
			var inertia_tensor = bodies[i].getInertiaTensor();
			var net_torque = bodies[i].computeNetTorque(); // torque free case <0,0,0>
			var w_cross_I = vectorToPreliminary(bodies[i].w).multiply(inertia_tensor);
			w_cross_I = convertMatrix(w_cross_I); // to math js matrix
			var w_cross_I_dot_w = math.multiply(w_cross_I, math.matrix(bodies[i].w.toArray())); // math js vector
			w_cross_I_dot_w = new THREE.Vector3().fromArray(w_cross_I_dot_w._data); // back to three js vector
			net_torque.sub(w_cross_I_dot_w); // net torque minus (w cross I dot w)
			mg.sub(bodies[i].v.clone().multiplyScalar(0.1)); // add friction
			matrix_b.push(mg.x);
			matrix_b.push(mg.y);
			matrix_b.push(mg.z);
			matrix_b.push(net_torque.x);
			matrix_b.push(net_torque.y);
			matrix_b.push(net_torque.z);
		}
		// loop adding all the force constraints
		for(var i = 0; i < size; i++){
			var wwr;
			var stabilization = new THREE.Vector3();;
			// case when only one body is constrained
			if(this.relationships[i].second === undefined){
				var w1 = this.relationships[i].first.w.clone();
				wwr = w1.clone();
				wwr = wwr.cross(w1.cross(this.relationships[i].r_vectors[0]));
				// comment out the following code to disable stabilization
				var position_diff = new THREE.Vector3().subVectors(this.static_contact, this.relationships[i].contact_point);
				var wr = new THREE.Vector3().crossVectors(this.relationships[i].first.w.clone(), this.relationships[i].r_vectors[0]);
				var contact_velocity = new THREE.Vector3().addVectors(this.relationships[i].first.v.clone(), wr);
				var velocity_diff = new THREE.Vector3().subVectors(new THREE.Vector3(), contact_velocity);
				var sum = new THREE.Vector3().addVectors(position_diff.multiplyScalar(-2.0), velocity_diff.multiplyScalar(-0.5));
				stabilization.set(sum.x, sum.y, sum.z);
				// comment out the above code to disable stabilization
			}
			else{
				var w1 = this.relationships[i].first.w.clone();
				wwr = w1.clone();
				wwr = wwr.cross(w1.cross(this.relationships[i].r_vectors[0]));
				var w2 = this.relationships[i].second.w.clone();
				var w2w2r2 = new THREE.Vector3().crossVectors(w2, this.relationships[i].r_vectors[1]);
				w2w2r2 = w2w2r2.crossVectors(w2, w2w2r2);
				wwr = wwr.sub(w2w2r2);
				// comment out the following code to disable stabilization
				var first_body = this.relationships[i].first;
				var second_body = this.relationships[i].second;
				// compute the contact point's location with respect to each body
				var contact_point1 = first_body.mesh.localToWorld(this.relationships[i].contact_point_local[0].clone());
				var contact_point2 = second_body.mesh.localToWorld(this.relationships[i].contact_point_local[1].clone());
				var position_diff = new THREE.Vector3().subVectors(contact_point2, contact_point1);
				// compute the contact point's velocity with respect to each body
				var wr1 = new THREE.Vector3().crossVectors(this.relationships[i].first.w.clone(), this.relationships[i].r_vectors[0]);
				var wr2 = new THREE.Vector3().crossVectors(this.relationships[i].second.w.clone(), this.relationships[i].r_vectors[1]);
				var contact_velocity1 = new THREE.Vector3().addVectors(this.relationships[i].first.v.clone(), wr1);
				var contact_velocity2 = new THREE.Vector3().addVectors(this.relationships[i].second.v.clone(), wr2);
				var velocity_diff = new THREE.Vector3().subVectors(contact_velocity2, contact_velocity1);
				var sum = new THREE.Vector3().addVectors(position_diff.multiplyScalar(-2.0), velocity_diff.multiplyScalar(-0.5));
				stabilization.set(sum.x, sum.y, sum.z);
				// comment out the above code to disable stabilization
			}
			matrix_b.push(wwr.x + stabilization.x);
			matrix_b.push(wwr.y + stabilization.y);
			matrix_b.push(wwr.z + stabilization.z);
		}
		matrix_b = math.matrix(matrix_b);
		return matrix_b;
	};

	// Constructs an array of mass matrices for all the bodies
	this.constructMassMatrix = function(){
		var bodies = this.getBodies();
		var mass_matrices = [];
		for(var i = 0; i < bodies.length; i++){
			var m3 = new THREE.Matrix3().multiplyScalar(bodies[i].m);
			mass_matrices.push(m3);
		}
		return mass_matrices;
	};

	// Constructs an array of inertia tensors for all the bodies
	this.constructInertiaTensors = function(){
		var bodies = this.getBodies();
		var tensors = [];
		for(var i = 0; i < bodies.length; i++){
			var m3 = bodies[i].getInertiaTensor();
			tensors.push(m3);
		}
		return tensors;
	};

	// Construct the matrix A that represents the dynamic system
	this.constructMatrixA = function(){
		var mass_matrices = this.constructMassMatrix();
		var inertia_tensors = this.constructInertiaTensors();
		var num_bodies = this.relationships.length;
		var matrix_A = math.zeros(2*3*num_bodies+3*num_bodies, 2*3*num_bodies+3*num_bodies)._data;
		this.constructRMatrix(); // this line has to be here
		var identity = new THREE.Matrix3();
		var negative_I = new THREE.Matrix3().multiplyScalar(-1);
		// Now fill the data
		// loop adding all the mass matrices and inertia tensors
		for(var i = 0; i < num_bodies; i++){
			var index_M = [0+6*i, 0+6*i];
			var index_I = [3+6*i, 3+6*i];
			var m = mass_matrices[i];
			var tensor = inertia_tensors[i];
			insertMatrix3(matrix_A, m, index_M);
			insertMatrix3(matrix_A, tensor, index_I);
		}
		
		for(var r in this.relationships){
			var relationship = this.relationships[r];
			var length = Object.keys(relationship).length - 4;
			if(length == 2){ // handle this static obj + non-static body case
				// set identity matrices
				var I;
				if(r % num_bodies == 1){
					I = identity;
				}
				else
				{
					I = negative_I;
				}
				// insert row matrices
				var rowr_index = [6*num_bodies + 3*r, 3*r + 3];
				var row_tilda = relationship.rowR[0];
				var rowi_index = [6*num_bodies + 3*r, 3*r];
				insertMatrix3(matrix_A, I, rowi_index);
				insertMatrix3(matrix_A, row_tilda, rowr_index);
				// insert column matrices
				var columnr_index = [3*r + 3, 6*num_bodies + 3*r];
				var column_tilda = relationship.columnR[0];
				var columni_index = [3*r, 6*num_bodies + 3*r];
				insertMatrix3(matrix_A, I, columni_index);
				insertMatrix3(matrix_A, column_tilda, columnr_index);
			}
			else{ // handle the regular case
				var I;
				I = negative_I;
				var rowr_index = [6*num_bodies + 3*r, 6*(r-1) + 3];
				var row_tilda = relationship.rowR[0];
				var rowi_index = [6*num_bodies + 3*r, 6*(r-1)];
				insertMatrix3(matrix_A, I, rowi_index);
				insertMatrix3(matrix_A, row_tilda, rowr_index);
				var columnr_index = [6*(r-1) + 3, 6*num_bodies + 3*r];
				var column_tilda = relationship.columnR[0];
				var columni_index = [6*(r-1), 6*num_bodies + 3*r];
				insertMatrix3(matrix_A, I, columni_index);
				insertMatrix3(matrix_A, column_tilda, columnr_index);
				I = identity;
				rowr_index = [6*num_bodies + 3*(r), 6*(r-1) + 9];
				row_tilda = relationship.rowR[1];
				rowi_index = [6*num_bodies + 3*(r), 6*(r-1) + 6];
				insertMatrix3(matrix_A, I, rowi_index);
				insertMatrix3(matrix_A, row_tilda, rowr_index);
				columnr_index = [6*(r-1) + 9, 6*num_bodies + 3*(r)];
				column_tilda = relationship.columnR[1];
				columni_index = [6*(r-1) + 6, 6*num_bodies + 3*(r)];
				insertMatrix3(matrix_A, I, columni_index);
				insertMatrix3(matrix_A, column_tilda, columnr_index);
			}
		}
		matrix_A = math.matrix(matrix_A);
		return matrix_A;
	};
}


// Inserts a Matrix3 into a parent MATH JS matrix given the starting index
function insertMatrix3( parent_matrix, matrix3, index /*[row column]*/ ){
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
		var m3_elements = matrix3.toArray(); // m3_elements are in column-major
		for(var i = row; i < row + 3; i++)
		{
			for(var j = column; j < column + 3; j++)
			{
				parent_matrix[i][j] = m3_elements[(i%3)+3*(j%3)];
			}
		}
	}

} 
