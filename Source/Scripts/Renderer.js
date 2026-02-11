// fish/Source/Scripts/Renderer.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export class Renderer {
  constructor(canvas){
    this.canvas = canvas;
    this.r = new THREE.WebGLRenderer({ canvas, antialias:false, alpha:false });
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 5000);
    this.camera.position.set(0, 2.62, 0);

    const amb = new THREE.AmbientLight(0xffffff, 0.75);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(12, 20, 8);

    this.scene.add(amb);
    this.scene.add(dir);

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resize();
  }

  resize(){
    const w = this.canvas.clientWidth | 0;
    const h = this.canvas.clientHeight | 0;
    this.r.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  render(){
    this.r.render(this.scene, this.camera);
  }

  dispose(){
    window.removeEventListener('resize', this._onResize);
    this.r.dispose();
  }
}
