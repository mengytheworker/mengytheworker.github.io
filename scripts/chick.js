import * as THREE from 'https://unpkg.com/three/build/three.module.js';

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0.87, 0.87, 0.87);

// Create renderer
const renderer = new THREE.WebGLRenderer();

// Retrieve container
const container = document.getElementById('chick');

// Set renderer size
renderer.setSize(container.offsetWidth, container.offsetHeight);

// Append renderer to container
container.appendChild(renderer.domElement);

// Create camera
const camera = new THREE.PerspectiveCamera(85, container.offsetWidth/container.offsetHeight, 0.1, 1000);
camera.position.z = 10;

// Create sphere for head
const geometry_head = new THREE.SphereGeometry(4, 32, 32);
const material_head = new THREE.MeshBasicMaterial( { color: new THREE.Color(1, 0.9, 0) } );
const head = new THREE.Mesh(geometry_head, material_head);
head.rotateY(0*Math.PI/180);
scene.add(head);

// Create eyes
const geometry_eye = new THREE.SphereGeometry(1.4, 32, 32);
const material_eye = new THREE.MeshBasicMaterial( { color: new THREE.Color(1, 1, 1) } );
const eye_left = new THREE.Mesh(geometry_eye, material_eye);
const eye_right = new THREE.Mesh(geometry_eye, material_eye);
eye_left.position.set(-1, 0, 4);
eye_right.position.set(1, 0, 4);
head.add(eye_left);
head.add(eye_right);

// Create eye balls
const geometry_eyeball = new THREE.SphereGeometry(0.2, 32, 32);
const material_eyeball = new THREE.MeshBasicMaterial( { color: new THREE.Color(0, 0, 0) } );
const eyeball_left = new THREE.Mesh(geometry_eyeball, material_eyeball);
const eyeball_right = new THREE.Mesh(geometry_eyeball, material_eyeball);
eyeball_left.position.set(0.1, 0, 1.5);
eyeball_right.position.set(-0.1, 0, 1.5)
eye_left.add(eyeball_left);
eye_right.add(eyeball_right);

// Create beak
const geometry_beak = new THREE.ConeGeometry(0.4, 1);
const material_beak = new THREE.MeshBasicMaterial( { color: new THREE.Color(1, 0.5, 0) } );
const beak = new THREE.Mesh(geometry_beak, material_beak);
beak.position.set(0, -2.2, 3.7);
beak.rotation.set(120*Math.PI/180, 0, 0);
head.add(beak);

// Add ambient light
scene.add(new THREE.AmbientLight(0xFFFFFF, 10));

// Animate
function animate() {
    requestAnimationFrame( animate );
    renderer.render(scene, camera);
}
animate();

// Event listener: resize
window.addEventListener('resize', () => {
    // Update renderer size
    renderer.setSize(container.offsetWidth, container.offsetHeight);

    // Update camera aspect ratio and recompute the projection matrix
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
});

// Event listener: mousemove
document.addEventListener('mousemove', handleMovement);

// Event listener: touchmove
document.addEventListener('touchmove', handleMovement, { passive: false });

// Function to handle mouse and touch movements
function handleMovement(event) {
    // Prevent default behavior to avoid scrolling on touch devices
    event.preventDefault();

    let clientX, clientY;

    if (event.type.startsWith('touch')) {
        // Use the first touch point for simplicity
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        // Mouse event properties
        clientX = event.clientX;
        clientY = event.clientY;
    }

    // Get the bounding rectangle of the #chick div
    const rect = container.getBoundingClientRect();

    // Normalize event coordinates
    const mouse = new THREE.Vector2();
    mouse.x = +(clientX - rect.left) / rect.width * 2 - 1;
    mouse.y = -(clientY - rect.top) / rect.height * 2 + 1;

    // Calculate desired rotation based on mouse/touch position
    const rotationX = Math.PI / 36 * -mouse.y; // Vertical position affects X rotation
    const rotationY = Math.PI / 12 * +mouse.x; // Horizontal position affects Y rotation

    // Apply calculated rotation directly, ensuring it's continuous and within the desired range
    eye_left.rotation.x = rotationX;
    eye_left.rotation.y = rotationY;
    eye_right.rotation.x = rotationX;
    eye_right.rotation.y = rotationY;
}
