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

	this.setData = function ( xvals, yvals ) {
		var rangex1 = [Math.min(...xvals), Math.max(...xvals)];
		var rangex2 = [this.origin.x, this.xend.x];
		var rangey1 = [Math.min(...yvals), Math.max(...yvals)];
		var rangey2 = [this.origin.y, this.yend.y];
		this.xvals = this.mapPoints( xvals, rangex1, rangex2 );
		this.yvals = this.mapPoints( yvals, rangey1, rangey2 );
	};

	this.setLabels = function ( xtext, ytext ) {
		this.xtext = xtext;
		this.ytext = ytext;
		this.xtextpos = new THREE.Vector3( this.xend.x, this.xend.y - 1, this.xend.z );
		this.ytextpos = new THREE.Vector3( this.yend.x - 1, this.yend.y, this.yend.z );
	};

	this.getPoints = function () {
		var points = [];
		for(var i = 0; i < this.xvals.length; i++){
			points.push( new THREE.Vector3( this.xvals[i], this.yvals[i], 0 ) );
		}
		return points;
	};

	this.getPoint = function ( index ) {
		var points = this.getPoints();
		return points[index];
	};

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


