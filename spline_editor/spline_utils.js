/*
	CPSC 426 - Computer Animation
	University of British Columbia, Vancouver, BC, Canada
	Spline editor utility function : curve definitions and interpolation methods
	Created by:
		- Mason Yang : yhymason@gmail.com
		- Michiel van de Panne : van@cs.ubc.ca
	2018-09-20
*/

// Cubic Bezier Definition Start
function CubicBezierCurve( v0, v1, v2, v3 ) {

	this.v0 = v0 || new THREE.Vector3();
	this.v1 = v1 || new THREE.Vector3();
	this.v2 = v2 || new THREE.Vector3();
	this.v3 = v3 || new THREE.Vector3();

	this.getPoint = function( t, optionalTarget ) {

		var point = optionalTarget || new THREE.Vector3();

		var v0 = this.v0, v1 = this.v1, v2 = this.v2, v3 = this.v3;

		point.set(
			CubicBezier( t, v0.x, v1.x, v2.x, v3.x ),
			CubicBezier( t, v0.y, v1.y, v2.y, v3.y ),
			CubicBezier( t, v0.z, v1.z, v2.z, v3.z )
		);

		return point;

	};

	this.getPoints = function( divisions ) {

		if ( divisions === undefined ) divisions = 5;

		var points = [];

		for ( var d = 0; d <= divisions; d ++ ) {

			points.push( this.getPoint( d / divisions ) );

		}

		return points;

	};

}


// Student TODO
// Impletement Cubic Bezier Interpolation
function CubicBezier( t, p0, p1, p2, p3 ) {

	var k = 1 - t;

	return k * k * k * p0 + 3 * k * k * t * p1 + 3 * ( 1 - t ) * t * t * p2 +
		t * t * t * p3;

}

// Cubic Bezier Definition End


