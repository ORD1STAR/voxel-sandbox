export class Time {
    now = performance.now();
    dt = 0;
    t = 0;
  
    tick() {
      const n = performance.now();
      this.dt = Math.min(0.05, (n - this.now) / 1000);
      this.now = n;
      this.t += this.dt;
    }
  }
  