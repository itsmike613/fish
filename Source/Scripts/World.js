// fish/Source/Scripts/World.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

function tex(url, repeatX=1, repeatY=1){
  const t = new THREE.TextureLoader().load(url);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapNearestFilter;
  return t;
}

export class World {
  constructor(scene){
    this.scene = scene;

    this.sandTex = tex('./Source/Assets/Terrain/sand.png', 1, 1);
    this.waterTex = tex('./Source/Assets/Terrain/water.png', 200, 200);

    this.sandMat = new THREE.MeshLambertMaterial({ map: this.sandTex });
    this.waterMat = new THREE.MeshLambertMaterial({ map: this.waterTex });

    this.sand = [];
    this.sandSet = new Set();

    this.waterY = 0.8;
    this.sandTop = 1.0;

    this._buildIsland();
    this._buildWater();
  }

  _key(ix, iz){
    return `${ix},${iz}`;
  }

  _buildIsland(){
    const g = new THREE.BoxGeometry(1, 1, 1);
    const r = 6.0;

    for(let iz=0; iz<12; iz++){
      for(let ix=0; ix<12; ix++){
        const cx = -5.5 + ix;
        const cz = -5.5 + iz;

        const d = Math.hypot(cx, cz);
        if(d <= r){
          const m = new THREE.Mesh(g, this.sandMat);
          m.position.set(cx, 0.5, cz);
          m.castShadow = false;
          m.receiveShadow = false;
          this.scene.add(m);
          this.sand.push(m);
          this.sandSet.add(this._key(ix, iz));
        }
      }
    }
  }

  _buildWater(){
    const g = new THREE.PlaneGeometry(12000, 12000, 1, 1);
    g.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(g, this.waterMat);
    this.water.position.set(0, this.waterY, 0);
    this.water.frustumCulled = false;
    this.scene.add(this.water);
  }

  update(playerPos){
    this.water.position.x = playerPos.x;
    this.water.position.z = playerPos.z;
  }

  _tileIndex(v){
    return Math.floor(v + 6);
  }

  isSandAt(ix, iz){
    if(ix < 0 || ix > 11 || iz < 0 || iz > 11) return false;
    return this.sandSet.has(this._key(ix, iz));
  }

  canStand(x, z, radius=0.3){
    const s = [
      [ x, z ],
      [ x + radius, z ],
      [ x - radius, z ],
      [ x, z + radius ],
      [ x, z - radius ],
      [ x + radius*0.707, z + radius*0.707 ],
      [ x - radius*0.707, z + radius*0.707 ],
      [ x + radius*0.707, z - radius*0.707 ],
      [ x - radius*0.707, z - radius*0.707 ]
    ];

    for(const p of s){
      const ix = this._tileIndex(p[0]);
      const iz = this._tileIndex(p[1]);
      if(!this.isSandAt(ix, iz)) return false;
    }
    return true;
  }

  raycastFirst(raycaster){
    const list = [...this.sand, this.water];
    const hits = raycaster.intersectObjects(list, false);
    if(!hits || hits.length === 0) return null;
    return hits[0];
  }
}
