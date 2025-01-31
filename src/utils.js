import * as PIXI from "pixi.js";

/**
 * Get the style property and parse options.
 * @param {SVGElement} node
 * @return {Object} Style attributes
 */
export function parseSvgStyle(node) {
	const style = node.getAttribute("style");
	const result = {
		fill: node.getAttribute("fill"),
		opacity: node.getAttribute("opacity"),
		fillOpacity: node.getAttribute("fill-opacity"),
		stroke: node.getAttribute("stroke"),
		strokeOpacity: node.getAttribute("stroke-opacity"),
		strokeWidth: node.getAttribute("stroke-width")
	};
	if (style !== null) {
		style.split(";").forEach(prop => {
			if (prop) {
				const [name, value] = prop.split(":");
				if (name && value) {
					result[name.trim()] = value.trim();
				}
			}
		});
		if (result["stroke-width"]) {
			result.strokeWidth = result["stroke-width"];
			delete result["stroke-width"];
		}
	}

	for (let key in result) {
		if (result[key] === null) {
			delete result[key];
		}
	}
	return result;
}

/**
 * Parse transform attribute
 * @param {SVGElement} node
 */
export function parseSvgTransform(node) {
	if (!node.getAttribute("transform")) {
		return undefined;
	}

	const matrix = new PIXI.Matrix();
	const transformAttr = node.getAttribute("transform");
	const commands = parseTransform(transformAttr);

	//apply transform matrix right to left
	for (let key = commands.length - 1; key >= 0; --key) {
		let command = commands[key].command;
		let values = commands[key].params;

		switch (command) {
			case "matrix": {
				matrix.a = parseScientific(values[0]);
				matrix.b = parseScientific(values[1]);
				matrix.c = parseScientific(values[2]);
				matrix.d = parseScientific(values[3]);
				matrix.tx = parseScientific(values[4]);
				matrix.ty = parseScientific(values[5]);

				return matrix;
			}
			case "translate": {
				const dx = parseScientific(values[0]);
				const dy = parseScientific(values[1]) || 0;
				matrix.translate(dx, dy);
				break;
			}
			case "scale": {
				const sx = parseScientific(values[0]);
				const sy = values.length > 1 ? parseScientific(values[1]) : sx;
				matrix.scale(sx, sy);
				break;
			}
			case "rotate": {
				let dx = 0;
				let dy = 0;

				if (values.length > 1) {
					dx = parseScientific(values[1]);
					dy = parseScientific(values[2]);
				}

				matrix
					.translate(-dx, -dy)
					.rotate((parseScientific(values[0]) * Math.PI) / 180)
					.translate(dx, dy);

				break;
			}
			default: {
				console.log(`Command ${command} can't implement yet`);
			}
		}
	}

	return matrix;
}


export function parseScientific(numberString) {
	var info = /([\d\\.]+)e-(\d+)/i.exec(numberString);
	if (!info) {
		return parseFloat(numberString);
	}

	var num = info[1].replace(".", ""),
		numDecs = info[2] - 1;
	var output = "0.";
	for (var i = 0; i < numDecs; i++) {
		output += "0";
	}
	output += num;
	return parseFloat(output);
}

export function splitAttributeParams(attr) {
	if (attr.indexOf(",") >= 0) {
		return attr.split(",");
	} else {
		//Especially in IE Edge, the parameters do not have to be split by commas, IE even replaces commas with spaces!
		return attr.split(" ");
	}
}

/**
 * Parse transform attribute
 * @param {string} transform 
 */
export function parseTransform(transform)
{
	transform = transform.replace(/\ /gi, ",");
	let token = transform;
	let math = token.match(/(\w+\((\-?\d+\.?\d*e?\-?\d*,?)+\))+/g);
    let result = [];
	for (let i in math )
    {
        let c = math[i].match(/[\w\.\-]+/g);
		result.push({
			command : c.shift(),
			params : c
		});
    }
    return result;
}

var TAU = Math.PI * 2;

/* eslint-disable space-infix-ops */

// Calculate an angle between two unit vectors
//
// Since we measure angle between radii of circular arcs,
// we can use simplified math (without length normalization)
//
function unit_vector_angle(ux, uy, vx, vy) {
	var sign = ux * vy - uy * vx < 0 ? -1 : 1;
	var dot = ux * vx + uy * vy;

	// Add this to work with arbitrary vectors:
	// dot /= Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);

	// rounding errors, e.g. -1.0000000000000002 can screw up this
	if (dot > 1.0) {
		dot = 1.0;
	}
	if (dot < -1.0) {
		dot = -1.0;
	}

	return sign * Math.acos(dot);
}

// Convert from endpoint to center parameterization,
// see http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
//
// Return [cx, cy, theta1, delta_theta]
//
function get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_phi, cos_phi) {
	// Step 1.
	//
	// Moving an ellipse so origin will be the middlepoint between our two
	// points. After that, rotate it to line up ellipse axes with coordinate
	// axes.
	//
	var x1p = (cos_phi * (x1 - x2)) / 2 + (sin_phi * (y1 - y2)) / 2;
	var y1p = (-sin_phi * (x1 - x2)) / 2 + (cos_phi * (y1 - y2)) / 2;

	var rx_sq = rx * rx;
	var ry_sq = ry * ry;
	var x1p_sq = x1p * x1p;
	var y1p_sq = y1p * y1p;

	// Step 2.
	//
	// Compute coordinates of the centre of this ellipse (cx', cy')
	// in the new coordinate system.
	//
	var radicant = rx_sq * ry_sq - rx_sq * y1p_sq - ry_sq * x1p_sq;

	if (radicant < 0) {
		// due to rounding errors it might be e.g. -1.3877787807814457e-17
		radicant = 0;
	}

	radicant /= rx_sq * y1p_sq + ry_sq * x1p_sq;
	radicant = Math.sqrt(radicant) * (fa === fs ? -1 : 1);

	var cxp = ((radicant * rx) / ry) * y1p;
	var cyp = ((radicant * -ry) / rx) * x1p;

	// Step 3.
	//
	// Transform back to get centre coordinates (cx, cy) in the original
	// coordinate system.
	//
	var cx = cos_phi * cxp - sin_phi * cyp + (x1 + x2) / 2;
	var cy = sin_phi * cxp + cos_phi * cyp + (y1 + y2) / 2;

	// Step 4.
	//
	// Compute angles (theta1, delta_theta).
	//
	var v1x = (x1p - cxp) / rx;
	var v1y = (y1p - cyp) / ry;
	var v2x = (-x1p - cxp) / rx;
	var v2y = (-y1p - cyp) / ry;

	var theta1 = unit_vector_angle(1, 0, v1x, v1y);
	var delta_theta = unit_vector_angle(v1x, v1y, v2x, v2y);

	if (fs === 0 && delta_theta > 0) {
		delta_theta -= TAU;
	}
	if (fs === 1 && delta_theta < 0) {
		delta_theta += TAU;
	}

	return [cx, cy, theta1, delta_theta];
}

//
// Approximate one unit arc segment with bézier curves,
// see http://math.stackexchange.com/questions/873224
//
function approximate_unit_arc(theta1, delta_theta) {
	var alpha = (4 / 3) * Math.tan(delta_theta / 4);

	var x1 = Math.cos(theta1);
	var y1 = Math.sin(theta1);
	var x2 = Math.cos(theta1 + delta_theta);
	var y2 = Math.sin(theta1 + delta_theta);

	return [x1, y1, x1 - y1 * alpha, y1 + x1 * alpha, x2 + y2 * alpha, y2 - x2 * alpha, x2, y2];
}

export function arcToBezier({ x1, y1, x2, y2, fa, fs, rx, ry, phi }) {
	var sin_phi = Math.sin((phi * TAU) / 360);
	var cos_phi = Math.cos((phi * TAU) / 360);

	// Make sure radii are valid
	//
	var x1p = (cos_phi * (x1 - x2)) / 2 + (sin_phi * (y1 - y2)) / 2;
	var y1p = (-sin_phi * (x1 - x2)) / 2 + (cos_phi * (y1 - y2)) / 2;

	if (x1p === 0 && y1p === 0) {
		// we're asked to draw line to itself
		return [];
	}

	if (rx === 0 || ry === 0) {
		// one of the radii is zero
		return [];
	}

	// Compensate out-of-range radii
	//
	rx = Math.abs(rx);
	ry = Math.abs(ry);

	var lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
	if (lambda > 1) {
		rx *= Math.sqrt(lambda);
		ry *= Math.sqrt(lambda);
	}

	// Get center parameters (cx, cy, theta1, delta_theta)
	//
	var cc = get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_phi, cos_phi);

	var result = [];
	var theta1 = cc[2];
	var delta_theta = cc[3];

	// Split an arc to multiple segments, so each segment
	// will be less than τ/4 (= 90°)
	//
	var segments = Math.max(Math.ceil(Math.abs(delta_theta) / (TAU / 4)), 1);
	delta_theta /= segments;

	for (var i = 0; i < segments; i++) {
		result.push(approximate_unit_arc(theta1, delta_theta));
		theta1 += delta_theta;
	}

	// We have a bezier approximation of a unit circle,
	// now need to transform back to the original ellipse
	//
	return result.map(function(curve) {
		for (var i = 0; i < curve.length; i += 2) {
			var x = curve[i + 0];
			var y = curve[i + 1];

			// scale
			x *= rx;
			y *= ry;

			// rotate
			var xp = cos_phi * x - sin_phi * y;
			var yp = sin_phi * x + cos_phi * y;

			// translate
			curve[i + 0] = xp + cc[0];
			curve[i + 1] = yp + cc[1];
		}

		return curve;
	});
}
