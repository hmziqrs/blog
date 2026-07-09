type TextCharacter = {
  char: string;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  initialScale: number;
};

type MousePosition = {
  x: number;
  y: number;
};

export function initInteractiveCanvasBanner(canvas: HTMLCanvasElement) {
  const maybeContext = canvas.getContext("2d");

  if (!maybeContext) return;

  const ctx: CanvasRenderingContext2D = maybeContext;
  const bannerTitle = canvas.dataset.title ?? "";
  const bannerSubtitle = canvas.dataset.subtitle ?? "";

  let snowflakes: Snowflake[] = [];
  let width = 0;
  let height = 0;
  const mouse: MousePosition = { x: -1000, y: -1000 };

  let charIndex = 0;
  let lastCharTime = 0;
  const charDelay = 50;
  let characters: TextCharacter[] = [];

  function resize() {
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  class Snowflake {
    x = 0;
    y = 0;
    size = 0;
    speed = 0;
    wind = 0;
    opacity = 1;

    constructor() {
      this.reset();
      this.y = Math.random() * height;
    }

    reset() {
      this.x = Math.random() * width;
      this.y = -10;
      this.size = Math.random() * 3 + 1;
      this.speed = Math.random() * 1 + 0.5;
      this.wind = Math.random() * 0.5 - 0.25;
      this.opacity = Math.random() * 0.5 + 0.5;
    }

    update() {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 80;

      if (dist > 0 && dist < maxDist) {
        const force = (maxDist - dist) / maxDist;
        this.x -= (dx / dist) * force * 3;
        this.y -= (dy / dist) * force * 3;
      }

      this.y += this.speed;
      this.x += this.wind;

      if (this.y > height + 10) {
        this.reset();
      }
      if (this.x > width) this.x = 0;
      if (this.x < 0) this.x = width;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
      ctx.fill();
    }
  }

  function init() {
    snowflakes = [];
    const flakeCount = 100;
    for (let i = 0; i < flakeCount; i++) {
      snowflakes.push(new Snowflake());
    }
    initText();
  }

  function initText() {
    characters = [];

    ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
    const titleWidth = ctx.measureText(bannerTitle).width;
    const titleX = (width - titleWidth) / 2;
    const titleY = height / 2 - 15;

    ctx.font = "16px system-ui, -apple-system, sans-serif";
    const subtitleWidth = ctx.measureText(bannerSubtitle).width;
    const subtitleX = (width - subtitleWidth) / 2;
    const subtitleY = height / 2 + 20;

    ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
    let currentX = titleX;
    for (let i = 0; i < bannerTitle.length; i++) {
      const charWidth = ctx.measureText(bannerTitle[i]).width;
      characters.push({
        char: bannerTitle[i],
        x: currentX,
        y: titleY,
        baseX: currentX,
        baseY: titleY,
        initialScale: 3,
      });
      currentX += charWidth;
    }

    ctx.font = "16px system-ui, -apple-system, sans-serif";
    currentX = subtitleX;
    for (let i = 0; i < bannerSubtitle.length; i++) {
      const charWidth = ctx.measureText(bannerSubtitle[i]).width;
      characters.push({
        char: bannerSubtitle[i],
        x: currentX,
        y: subtitleY,
        baseX: currentX,
        baseY: subtitleY,
        initialScale: 3,
      });
      currentX += charWidth;
    }
  }

  function drawText(timestamp: number) {
    if (timestamp - lastCharTime > charDelay) {
      charIndex++;
      lastCharTime = timestamp;
    }

    characters.forEach((char, index) => {
      if (index >= charIndex) return;

      if (char.initialScale > 1) {
        char.initialScale -= 0.1;
        if (char.initialScale < 1) char.initialScale = 1;
      }

      const isTitle = index < bannerTitle.length;
      ctx.save();
      ctx.translate(char.x, char.y);
      ctx.scale(char.initialScale, char.initialScale);

      ctx.font = isTitle
        ? "bold 32px system-ui, -apple-system, sans-serif"
        : "16px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = `rgba(255, 255, 255, ${isTitle ? 1 : 0.7})`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(char.char, 0, 0);

      ctx.restore();
    });
  }

  function animate(timestamp = 0) {
    ctx.clearRect(0, 0, width, height);

    snowflakes.forEach((flake) => {
      flake.update();
      flake.draw();
    });

    drawText(timestamp);
    requestAnimationFrame(animate);
  }

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });

  canvas.addEventListener("mouseleave", () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  resize();
  init();
  animate();

  window.addEventListener("resize", () => {
    resize();
    initText();
  });
}
