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

// Helper Functions End