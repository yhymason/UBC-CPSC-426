/*
	CPSC 426 - Computer Animation
	University of British Columbia, Vancouver, BC, Canada
	Quaternion utility function : object definitions and helper functions
	Created by:
		- Mason Yang : yhymason@gmail.com
		- Michiel van de Panne : van@cs.ubc.ca
	2018-10-03
*/

// Quaternion Definition Start
function SimpleQuaternion( x, y, z, w ) {

	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;
	this.w = w || 1;
	this.v = new THREE.Vector3(this.x, this.y, this.z);
	this.isQuaternion = true;

	// Return the clone of this quaternion
	this.copy = function( q )
	{
		return new this.constructor( this.x, this.y, this.z, this.w );
	};

	// Adds q to this quaternion
	this.add = function( q ) {
		this.w += q.w;
		this.x += q.x;
		this.y += q.y;
		this.z += q.z;
		this.v.set( this.x, this.y, this.z );
		normalize();
		return this;
	};

	// Multiplies this quaternion by q
	this.multiply = function( q ) {
		if( q.isQuaternion = true )
		{
			var v = new THREE.Vector3().copy(this.v); // new v
			var s = this.w * q.w - v.dot( q.v ); // new s
			// quaternion multiplication
			v.crossVectors( this.v, q.v );
			v.addScaledVector( q.v, this.w );
			v.addScaledVector( this.v, q.w );
			// update properties
			this.v.set( v.x, v.y, v.z );
			this.x = this.v.x;
			this.y = this.v.y;
			this.z = this.v.z;
			this.w = s;
		}
		return this;
	};

	// Normalizes this quaternion
	this.normalize = function() {
		var length = Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w );
		this.x = this.x / length;
		this.y = this.y / length;
		this.z = this.z / length;
		this.w = this.w / length;
		this.v.set( this.x, this.y, this.z );
		return this;
	};

	// Returns the rotational conjugate of this quaternion
	this.conjugate = function() {
		this.x *= - 1;
		this.y *= - 1;
		this.z *= - 1;
		this.v.set( this.x, this.y, this.z );
		this.normalize();
		return this;
	};

}
// Quaternion Definition End

// Helper Functions Start

// Given Euler angles, convert to 3*3 rotation matrix
function fromEulerToRotationMatrix( euler ){
	// Safety check
	if(!euler.isEuler){
		return;
	}
	var m = new THREE.Matrix3();
	var x = euler.x;
	var y = euler.y;
	var z = euler.z;
	var order = euler.order; //'YZX', 'ZXY', 'XZY', 'YXZ' and 'ZYX'. Default is 'XYZ'
	var Rz = new THREE.Matrix3().set( Math.cos(z), -1*Math.sin(z), 0,
									   Math.sin(z), Math.cos(z), 0,
									   0, 0, 1 ); // matrix for rotation about the z axis
	var Ry = new THREE.Matrix3().set( Math.cos(y), 0, Math.sin(y),
									   0, 1, 0, 
									   -1*Math.sin(y), 0, Math.cos(y)); // matrix for rotation about the y axis
	var Rx = new THREE.Matrix3().set( 1, 0, 0,
									   0, Math.cos(x), -1*Math.sin(x),
									   0, Math.sin(x), Math.cos(x) ); // matrix for rotation about the z axis
	// Construct rotation matrix given euler angles' order
	switch( order ) 
	{ 
    	case 'XZY':
	    	m.multiply(Rx);
	    	m.multiply(Rz);
	    	m.multiply(Ry);
	        break;
	    case 'XYZ':
	    	m.multiply(Rx);
	    	m.multiply(Ry);
	    	m.multiply(Rz);
	        break;
	    case 'YXZ':
	    	m.multiply(Ry);
	    	m.multiply(Rx);
	    	m.multiply(Rz);
	    	break;
	    case 'YZX':
	    	m.multiply(Ry);
	    	m.multiply(Rz);
	    	m.multiply(Rx);
	    	break;
	    case 'ZYX':
	    	m.multiply(Rz);
	    	m.multiply(Ry);
	    	m.multiply(Rx);
	    	break;
	    case 'ZXY':
	    	m.multiply(Rz);
	    	m.multiply(Rx);
	    	m.multiply(Ry);
	    	break;
	}
	return m;
}

// Given a simple quaternion, convert to 3*3 rotation matrix 
function fromQuaternionToRotationMatrix( simple_quaternion ){
	if(!simple_quaternion.isQuaternion){
		return;
	}
	var m = new THREE.Matrix3();
	var elements = m.elements;
	var qx = simple_quaternion.x;
	var qy = simple_quaternion.y;
	var qz = simple_quaternion.z;
	var qw = simple_quaternion.w;
	elements[0] = 1 - 2*Math.pow(qy,2) - 2*Math.pow(qz,2);
	elements[1] = 2*qx*qy + 2*qz*qw;
	elements[2] = 2*qx*qz - 2*qy*qw;
	elements[3] = 2*qx*qy - 2*qz*qw;
	elements[4] = 1 - 2*Math.pow(qx,2) - 2*Math.pow(qz,2);
	elements[5] = 2*qy*qz + 2*qx*qw;
	elements[6] = 2*qx*qz + 2*qy*qw;
	elements[7] = 2*qy*qz - 2*qx*qw;
	elements[8] = 1 - 2*Math.pow(qx,2) - 2*Math.pow(qy,2);
	m.elements = elements;

	return m;
}

// Given a THREE.Euler object, convert to a simple quaternion
function fromEulerToQuaternion( euler ){
	var m = fromEulerToRotationMatrix( euler );

	var elements = m.elements;
	var w, x, y, z;
	var S;
	var tr = elements[0] + elements[4] + elements[8]; // matrix trace
	if (tr > 0) { 
		S = 0.5 / Math.sqrt(tr+1.0); // S=4*qw 
	    w = 0.25 / S;
	    x = (elements[5] - elements[7]) * S;
	    y = (elements[6] - elements[2]) * S; 
	    z = (elements[1] - elements[3]) * S; 
	} 
	else if ((elements[0] > elements[4])&&(elements[0] > elements[8])) { 
		S = Math.sqrt(1.0 + elements[0] - elements[4] - elements[8]) * 2; // S=4*qx 
		w = (elements[5] - elements[7]) / S;
		x = 0.25 * S;
		y = (elements[1] + elements[3]) / S; 
		z = (elements[2] + elements[6]) / S; 
	} 
	else if (elements[4] > elements[8]) { 
		S = Math.sqrt(1.0 + elements[4] - elements[0] - elements[8]) * 2; // S=4*qy
		w = (elements[6] - elements[2]) / S;
		x = (elements[1] + elements[3]) / S; 
		y = 0.25 * S;
		z = (elements[7] + elements[5]) / S; 
	} 
	else { 
		S = Math.sqrt(1.0 + elements[8] - elements[0] - elements[4]) * 2; // S=4*qz
		w = (elements[1] - elements[3]) / S;
		x = (elements[2] + elements[6]) / S;
		y = (elements[7] + elements[5]) / S;
		z = 0.25 * S;
	}
	var quaternion = new SimpleQuaternion(x,y,z,w);
	return quaternion;
}

// Given a simple quaternion, convert to a THREE.Euler object
function fromQuaternionToEuler( simple_quaternion ){
	var euler = new THREE.Euler();
	var m = fromQuaternionToRotationMatrix( simple_quaternion );
	euler.setFromRotationMatrix( m );

	return euler; 
}

// Given a simple quaternion, convert to an Axis angle
function fromQuaternionToAxisAngle( simple_quaternion ){
	var qx = simple_quaternion.x;
	var qy = simple_quaternion.y;
	var qz = simple_quaternion.z;
	var qw = simple_quaternion.w;
	var axis_angle = {};
	axis_angle.theta = 2 * Math.acos(qw);
	var x, y, z;
	if(qw === 1){
		x = qx;
		y = qy;
		z = qz;
	}
	else{
		x = qx / Math.sqrt(1-qw*qw);
		y = qy / Math.sqrt(1-qw*qw);
		z = qz / Math.sqrt(1-qw*qw);
	}
	axis_angle.k = new THREE.Vector3( x, y, z );

	return axis_angle;

}   

// Given an axis-angle pair, convert to a simple quaternion
function fromAxisAngleToQuaternion( angle, axis ){
	if( !axis.isVector3 ){
		return;
	}
	var s = Math.sin(angle/2);
  	var x = axis.x * s;
  	var y = axis.y * s;
  	var z = axis.z * s;
  	var w = Math.cos(angle/2);
  	var quaternion = new SimpleQuaternion( x, y, z, w );
  	return quaternion;
}

// convert a 3*3 rotation matrix to 4*4
function fromRotation3toRotation4( m3 ){
	var m4 = new THREE.Matrix4();
	var elements = m3.elements;
	m4.set( elements[0], elements[3], elements[6], 0,
			elements[1], elements[4], elements[7], 0,
			elements[2], elements[5], elements[8], 0,
			0, 0, 0, 1);
	return m4;
}

// quaternion rotation of a vector
function applyQuaternionToVector( vector3 , quaternion ){
	var vector3_quaternion = new SimpleQuaternion(vector3.x, vector3.y, vector3.z, 0);
	var q = quaternion.copy();
	var q_inv = quaternion.copy().conjugate();
	q.multiply(vector3_quaternion);
	q.multiply(q_inv);
	var result_vector = new THREE.Vector3(q.x, q.y, q.z);
	return result_vector;
}

// Helper Functions End