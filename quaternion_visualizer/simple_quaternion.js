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
	this.normalize();

	// Adds q to this quaternion
	this.add = function( q ) {
		this.w += q.w;
		this.x += q.x;
		this.y += q.y;
		this.z += q.z;
		this.v.set( this.x, this.y, this.z );
		this.normalize();
	};

	// Multiplies this quaternion by q
	this.multiply = function( q ) {
		if( q.isQuaternion = true )
		{
			var s = this.w * q.w - this.v.dot( q.v ); // new s
			var v = new THREE.Vector3(); // new v
			// quaternion multiplication
			v.crossVectors( this.v, q.v );
			v.addScaledVector( q.v, this.w );
			v.addScaledVector( this.v, q.w );
			// update properties
			this.v = v;
			this.x = this.v.x;
			this.y = this.v.y;
			this.z = this.v.z;
			this.w = s;
		}
		this.normalize();
		return this;
	};

	// Normalizes this quaternion
	this.normalize = function() {
		var length = Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w );
		this.x = this.x * length;
		this.y = this.y * length;
		this.z = this.z * length;
		this.w = this.w * length;

		return this;
	};

	// Returns the rotational conjugate of this quaternion
	this.conjugate = function() {
		this.x *= - 1;
		this.y *= - 1;
		this.z *= - 1;
		this.normalize();
		return this;
	}

}
// Quaternion Definition End

// Helper Functions Start

// Given Euler angles, convert to 3*3 rotation matrix
function fromEulerToRotationMatrix( euler ){
	// Safety check
	if(!euler.isEuler){
		return;
	}
	var m = new Matrix3();
	var order = euler.order; //'YZX', 'ZXY', 'XZY', 'YXZ' and 'ZYX'. Default is 'XYZ'
	var Rx = new Matrix3();
	Rx.set( 1, 0, 0, 
			0, Math.cos(euler.x), -1*Math.sin(euler.x), 
			0, Math.sin(euler.x), Math.cos(euler.x));
	var Ry = new Matrix3();
	Ry.set( Math.cos(euler.y), 0, Math.sin(euler.y),
			0, 1, 0,
			-1*Math.sin(euler.y), 0, Math.cos(euler.y));
	var Rz = new Matrix3();
	Rz.set( Math.cos(euler.z), Math.sin(euler.z), 0,
			Math.sin(euler.z), Math.cos(euler.z), 0,
			0, 0, 1);
	// Construct rotation matrix given euler angles' order
	switch( order ) { 
    case 'YZX':
    	m.multiply(Rx);
    	m.multiply(Rz);
    	m.multiply(Ry);
        break;
    case 'ZXY':
    	m.multiply(Ry);
    	m.multiply(Rx);
    	m.multiply(Rz);
        break;
    case 'XZY':
    	m.multiply(Ry);
    	m.multiply(Rz);
    	m.multiply(Rx);
    	break;
    case 'YXZ':
    	m.multiply(Rz);
    	m.multiply(Rx);
    	m.multiply(Ry);
    	break;
    case 'ZYX':
    	m.multiply(Rx);
    	m.multiply(Ry);
    	m.multiply(Rz);
    	break;
    default:
        m.multiply(Rz);
    	m.multiply(Ry);
    	m.multiply(Rx);
	}
	return m;
}

// Given a simple quaternion, convert to 3*3 rotation matrix 
function fromQuaternionToRotationMatrix( simple_quaternion ){
	if(!simple_quaternion.isQuaternion){
		return;
	}
	var m = new Matrix3();
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
	if( m.determinant !== 1){
		return;
	}
	var elements = m.elements;
	var w = Math.sqrt(1+elements[0]+elements[4]+elements[8]) / 2;
	var x = (elements[7] - elements[5]) / (w*4);
	var y = (elements[2] - elements[6]) / (w*4);
	var z = (elements[3] - elements[1]) / (w*4);

	var quaternion = new SimpleQuaternion( x, y, z, w );
	return quaternion;
}

// Given a simple quaternion, convert to a THREE.Euler object
function fromQuaternionToEuler( simple_quaternion ){
	var euler = new THREE.Euler();
	var m = fromQuaternionToRotationMatrix( simple_quaternion );
	euler.setFromRotationMatrix( m );

	return euler; 
}

// convert a 3*3 rotation matrix to 4*4
function fromRotation3toRotation4( m3 ){
	var m4 = new Matrix4();
	var elements = m3.elements;
	m4.set( elements[0], elements[3], elements[6], 0,
			elements[1], elements[4], elements[7], 0,
			elements[2], elements[5], elements[8], 0,
			0, 0, 0, 1);
	return m4;
}

// Helper Functions End