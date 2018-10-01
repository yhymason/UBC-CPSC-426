/*
	CPSC 426 - Computer Animation
	University of British Columbia, Vancouver, BC, Canada
	Spline editor utility function : curve definitions and interpolation methods
	Created by:
		- Mason Yang : yhymason@gmail.com
		- Michiel van de Panne : van@cs.ubc.ca
	2018-09-20
*/

// 2D Plot Definition Start 
// using piecewise linear interpolation
function Plot( origin, xend, yend ){

	this.origin = origin || new THREE.Vector3();
	this.xend = xend || new THREE.Vector3( this.origin.x + 20, this.origin.y, this.origin.z );
	this.yend = yend || new THREE.Vector3( this.origin.x, this.origin.y + 20, this.origin.z );
	this.xvals;
	this.yvals;
	this.xtext;
	this.ytext;
	this.xtextpos;
	this.ytextpos;
	this.obj = {};

	// transform points from range1 [a, b] to range2 [c, d]
	// points: an array of points from range1
	this.mapPoints = function( points, range1, range2 ) {
		var output = [];
		for(var i = 0; i < points.length; i++){
			var raw = ( points[i] - range1[0] ) * ( range2[1] - range2[0] ) / ( range1[1] - range1[0] );
			var shift = range2[0];
			if( isNaN(raw) )
			{
				raw = 0;
			}
			output.push( raw + shift );
		}
		return output;
	};

	// set data for the given plot object
	this.setData = function ( xvals, yvals ) {
		var rangex1 = [Math.min(...xvals), Math.max(...xvals)];
		var rangex2 = [this.origin.x, this.xend.x];
		var rangey1 = [Math.min(...yvals), Math.max(...yvals)];
		var rangey2 = [this.origin.y, this.yend.y];
		this.xvals = this.mapPoints( xvals, rangex1, rangex2 );
		this.yvals = this.mapPoints( yvals, rangey1, rangey2 );
	};

	// set label properties for the given plot object
	this.setLabels = function ( xtext, ytext ) {
		this.xtext = xtext;
		this.ytext = ytext;
		this.xtextpos = new THREE.Vector3( this.xend.x, this.xend.y - 1, this.xend.z );
		this.ytextpos = new THREE.Vector3( this.yend.x - 1, this.yend.y, this.yend.z );
	};

	// retrieve points from the given plot object
	// points are in real world coordinates instead of relative space
	this.getPoints = function () {
		var points = [];
		for(var i = 0; i < this.xvals.length; i++){
			points.push( new THREE.Vector3( this.xvals[i], this.yvals[i], 0 ) );
		}
		return points;
	};

	// retrieve a point from the given plot object's data array
	// by a given index
	this.getPoint = function ( index ) {
		var points = this.getPoints();
		return points[index];
	};

	// contruct the plot object
	// plot object will have real geometry
	this.plotObject = function () {

		var xlength = (this.xend.x - this.origin.x) * 1.25;
		var ylength = (this.yend.y - this.origin.y) * 1.25;
		var xdir = new THREE.Vector3( this.xend.x - this.origin.x, this.xend.y - this.origin.y, this.xend.z - this.origin.z );
		var ydir = new THREE.Vector3( this.yend.x - this.origin.x, this.yend.y - this.origin.y, this.yend.z - this.origin.z )
		this.obj.xaxis = new THREE.ArrowHelper( xdir, this.origin, xlength, 0xff0000 );
		this.obj.yaxis = new THREE.ArrowHelper( ydir, this.origin, ylength, 0xff0000 );
		var geometry = new THREE.Geometry().setFromPoints( this.getPoints() );
		var material = new THREE.LineBasicMaterial( { color : 'blue' } );
		this.obj.curve = new THREE.Line( geometry, material );

		return this.obj;
	};

	// feed the plot object with new data
	this.updatePlot = function ( xvals, yvals ) {
		this.setData( xvals, yvals );
		var points = this.getPoints();
		this.obj.curve.geometry.vertices = points;
		this.obj.curve.geometry.verticesNeedUpdate = true;
	};
}
// 2D Plot Definition End

// Control Polygon Definition Start
function ControlPolygon( control_points ) {
	this.obj = {};
	this.obj.control_points = control_points;
	this.obj.geometry = new THREE.Geometry().setFromPoints( this.obj.control_points );
	this.obj.material = new THREE.LineBasicMaterial( { color : 'black' } );
	this.obj.mesh = new THREE.Line( this.obj.geometry, this.obj.material );

	// feed control polygon with new points
	// also update its geometry
	this.updatePoints = function ( new_points ) {
		this.obj.control_points = new_points;
		this.obj.mesh.geometry.vertices = new_points;
		this.obj.mesh.geometry.verticesNeedUpdate = true;
	}

	this.getObject = function () {
		return this.obj;
	}
}

// Control Polygon Definition End


// Cubic Bezier Definition Start
function CubicBezierCurve( v0, v1, v2, v3 ) {

	this.v0 = v0 || new THREE.Vector3();
	this.v1 = v1 || new THREE.Vector3();
	this.v2 = v2 || new THREE.Vector3();
	this.v3 = v3 || new THREE.Vector3();

	// retrieve point by time
	this.getPoint = function( t, optionalTarget ) {

		var point = optionalTarget || new THREE.Vector3();

		var v0 = this.v0, v1 = this.v1, v2 = this.v2, v3 = this.v3;

		point.set(
			this.CubicBezier( t, v0.x, v1.x, v2.x, v3.x ),
			this.CubicBezier( t, v0.y, v1.y, v2.y, v3.y ),
			this.CubicBezier( t, v0.z, v1.z, v2.z, v3.z )
		);

		return point;

	};

	// generate an array of points given the number of divisions
	this.getPoints = function( divisions ) {

		if ( divisions === undefined ) divisions = 5;

		var points = [];

		for ( var d = 0; d <= divisions; d ++ ) {

			points.push( this.getPoint( d / divisions ) );

		}

		return points;

	};

	// Cubic Bezier basis functions and evaluation function
	// Student TODO
	// Impletement Cubic Bezier Interpolation
	this.basis1 = function ( t, p0 ) {
		var k = 1 - t;
		return Math.pow( k, 3 ) * p0;
	};

	this.basis2 = function ( t, p1 ) {
		var k = 1 - t;
		return 3 * Math.pow( k, 2 ) * t * p1;
	};

	this.basis3 = function ( t, p2 ) {
		return 3 * ( 1 - t ) * Math.pow( t, 2 ) * p2;
	};

	this.basis4 = function ( t, p3 ) {
		return Math.pow( t, 3 ) * p3;
	};

	this.CubicBezier = function ( t, p0, p1, p2, p3 ) {
		return this.basis1( t, p0 ) + this.basis2( t, p1 ) 
			+ this.basis3( t, p2 ) + this.basis4( t, p3 );
	}


}
// Cubic Bezier Definition End


// Cubic Hermite Definition Start
function CubicHermiteCurve( p0, p1, t0, t1 ) {

	this.p0 = p0 || new THREE.Vector3();
	this.p1 = p1 || new THREE.Vector3();
	this.t0 = t0 || new THREE.Vector3();
	this.t1 = t1 || new THREE.Vector3();

	// retrieve point by time
	this.getPoint = function( t, optionalTarget ) {

		var point = optionalTarget || new THREE.Vector3();

		var p0 = this.p0, p1 = this.p1, t0 = this.t0, t1 = this.t1;

		point.set(
			this.CubicHermite( t, p0.x, p1.x, t0.x, t1.x ),
			this.CubicHermite( t, p0.y, p1.y, t0.y, t1.y ),
			this.CubicHermite( t, p0.z, p1.z, t0.z, t1.z )
		);

		return point;

	};

	// generate an array of points given the number of divisions
	this.getPoints = function( divisions ) {

		if ( divisions === undefined ) divisions = 5;

		var points = [];

		for ( var d = 0; d <= divisions; d ++ ) {

			points.push( this.getPoint( d / divisions ) );

		}

		return points;

	};

	// Cubic Hermite basis functions and evaluation function
	// Student TODO
	// Impletement Cubic Hermite Interpolation
	this.basis1 = function ( t, p0 ) {
		return (2 * Math.pow( t, 3 ) - 3 * Math.pow( t, 2 ) + 1) * p0;
	};

	this.basis2 = function ( t, p1 ) {
		return (-2 * Math.pow( t, 3 ) + 3 * Math.pow( t, 2 )) * p1;
	};

	this.basis3 = function ( t, t0 ) {
		return (Math.pow( t, 3 ) - 2 * Math.pow( t, 2 ) + t) * t0;
	};

	this.basis4 = function ( t, t1 ) {
		return (Math.pow( t, 3 ) - Math.pow( t, 2 )) * t1;
	};

	this.CubicHermite = function ( t, p0, p1, t0, t1 ) {
		return this.basis1( t, p0 ) + this.basis2( t, p1 ) 
			+ this.basis3( t, t0 ) + this.basis4( t, t1 );
	}

}
// Cubic Hermite Definition End


// Uniform Cubic B-Spline Definition Start
function UniformCubicBSpline( v0, v1, v2, v3 ) {

	this.v0 = v0 || new THREE.Vector3();
	this.v1 = v1 || new THREE.Vector3();
	this.v2 = v2 || new THREE.Vector3();
	this.v3 = v3 || new THREE.Vector3();

	// retrieve point by time
	this.getPoint = function( t, optionalTarget ) {

		var point = optionalTarget || new THREE.Vector3();

		var v0 = this.v0, v1 = this.v1, v2 = this.v2, v3 = this.v3;

		point.set(
			this.CubicBSpline( t, v0.x, v1.x, v2.x, v3.x ),
			this.CubicBSpline( t, v0.y, v1.y, v2.y, v3.y ),
			this.CubicBSpline( t, v0.z, v1.z, v2.z, v3.z )
		);

		return point;

	};

	// generate an array of points given the number of divisions
	this.getPoints = function( divisions ) {

		if ( divisions === undefined ) divisions = 5;

		var points = [];

		for ( var d = 0; d <= divisions; d ++ ) {

			points.push( this.getPoint( d / divisions ) );

		}

		return points;

	};

	// Uniform Cubic B-Spline basis functions and evaluation function
	// Student TODO
	// Impletement Cubic B-Spline Interpolation
	this.basis1 = function ( t, p0 ) {
		var u = 1 - t;
		return Math.pow( u, 3 ) * p0 / 6;
	};

	this.basis2 = function ( t, p1 ) {
		return (3 * Math.pow( t, 3 ) - 6 * Math.pow( t, 2 ) + 4) * p1 / 6;
	};

	this.basis3 = function ( t, p2 ) {
		return (-3 * Math.pow( t, 3 ) + 3 * Math.pow( t, 2 ) + 3 * t + 1) * p2 / 6;
	};

	this.basis4 = function ( t, p3 ) {
		return Math.pow( t, 3 ) * p3 / 6;
	};

	this.CubicBSpline = function ( t, p0, p1, p2, p3 ) {
		return this.basis1( t, p0 ) + this.basis2( t, p1 ) 
			+ this.basis3( t, p2 ) + this.basis4( t, p3 );
	}

}

// Uniform Cubic B-Spline Definition End



