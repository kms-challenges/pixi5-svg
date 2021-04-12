import SVG from './index';
import {ObservablePoint} from 'pixi.js';

/**
 * @typedef {Object} DefaultOptions
 * @property {number} [lineWidth] default stroke thickness (must be greater or equal of 1)
 * @property {number} [lineColor] default stroke color
 * @property {number} [lineOpacity] default stroke opacity
 * @property {number} [fillColor] default fill color
 * @property {number} [fillOpacity] default fill opacity
 * @property {boolean} [unpackTree] unpack node tree, otherwise build single Graphics
 */
export type SVGOptions = {
	unpackTree: boolean;
	lineColor: number;
	lineOpacity: number;
	fillColor: number;
	fillOpacity: number;
	lineWidth: number;
};

export default class SVGGraphics extends SVG {
  constructor(svg: string, options?: Partial<SVGOptions>) {
    super(svg, options);
  }

  scale: ObservablePoint;
}
