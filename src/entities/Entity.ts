import * as THREE from 'three';
import type { World } from '../world/World';

export abstract class Entity {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = 0;

  hp = 10;
  dead = false;

  abstract update(dt: number, world: World): void;
}
