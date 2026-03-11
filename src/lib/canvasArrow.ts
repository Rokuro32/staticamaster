/**
 * Utility function for drawing arrows on HTML Canvas
 * Handles the coordinate system correctly (Y increases downward in canvas)
 */

export interface ArrowOptions {
  headLength?: number;
  headAngle?: number; // in radians, default 0.4 (~23 degrees)
  lineWidth?: number;
  color?: string;
  filled?: boolean;
}

/**
 * Draw an arrow from (x1, y1) to (x2, y2)
 * The arrow head points in the direction of the arrow (towards x2, y2)
 */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: ArrowOptions = {}
) {
  const {
    headLength = 10,
    headAngle = 0.4,
    lineWidth = 2,
    color = '#000000',
    filled = true
  } = options;

  // Calculate the angle of the arrow
  const angle = Math.atan2(y2 - y1, x2 - x1);

  // Draw the line
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Draw the arrow head
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLength * Math.cos(angle - headAngle),
    y2 - headLength * Math.sin(angle - headAngle)
  );
  ctx.lineTo(
    x2 - headLength * Math.cos(angle + headAngle),
    y2 - headLength * Math.sin(angle + headAngle)
  );
  ctx.closePath();

  if (filled) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

/**
 * Draw just the arrow head at position (x, y) pointing in direction given by angle
 * angle is in radians, measured from positive x-axis (0 = right, PI/2 = down, PI = left, -PI/2 = up)
 */
export function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  options: ArrowOptions = {}
) {
  const {
    headLength = 10,
    headAngle = 0.4,
    color = '#000000',
    filled = true
  } = options;

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x - headLength * Math.cos(angle - headAngle),
    y - headLength * Math.sin(angle - headAngle)
  );
  ctx.lineTo(
    x - headLength * Math.cos(angle + headAngle),
    y - headLength * Math.sin(angle + headAngle)
  );
  ctx.closePath();

  if (filled) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

/**
 * Calculate the angle for an arrow given start and end points
 * Returns angle in radians suitable for use with drawArrowHead
 */
export function getArrowAngle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Draw a vector arrow from origin (ox, oy) with components (vx, vy)
 * Note: In physics, vy positive means up, but in canvas, y increases downward
 * Set invertY = true if your vy uses physics convention (positive = up)
 */
export function drawVectorArrow(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  vx: number,
  vy: number,
  scale: number = 1,
  options: ArrowOptions & { invertY?: boolean } = {}
) {
  const { invertY = false, ...arrowOptions } = options;

  const endX = ox + vx * scale;
  const endY = invertY ? oy - vy * scale : oy + vy * scale;

  drawArrow(ctx, ox, oy, endX, endY, arrowOptions);
}
