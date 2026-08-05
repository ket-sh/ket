let swallowClick = false;
let pressAt: { x: number; y: number } | undefined;

function swallow(event: MouseEvent): void {
  if (!swallowClick) {
    return;
  }

  swallowClick = false;
  event.preventDefault();
  event.stopPropagation();
}

function markPress(event: PointerEvent): void {
  swallowClick = false;
  pressAt = { x: event.clientX, y: event.clientY };
}

export function wirePress(): void {
  addEventListener('click', swallow, true);
  addEventListener('pointerdown', markPress, true);
}

export function swallowNextClick(): void {
  swallowClick = true;
}

export function stillPress(event: MouseEvent): boolean {
  return (
    pressAt === undefined ||
    Math.abs(event.clientX - pressAt.x) + Math.abs(event.clientY - pressAt.y) <= 3
  );
}
