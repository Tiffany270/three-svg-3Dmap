class MinMaxGUIHelper {
    constructor(
        obj,
        minProp,
        maxProp,
        minDif) {
        this.obj = obj;
        this.minProp = minProp;
        this.maxProp = maxProp;
        this.minDif = minDif;
    }
    get min() {
        return this.obj[this.minProp];
    }
    set min(v) {
        this.obj[this.minProp] = v;
        this.obj[this.maxProp] = Math.max(this.obj[this.maxProp], v + this.minDif);
    }
    get max() {
        return this.obj[this.maxProp];
    }
    set max(v) {
        this.obj[this.maxProp] = v;
        this.min = this.min;  // this will call the min setter
    }
}


async function main() {
    const canvas = document.getElementById('yiki');
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    renderer.sortObjects = false;
    canvas.appendChild(renderer.domElement);
    // ------ 

    const camera = new THREE.PerspectiveCamera
        (50,
            canvas.offsetWidth / canvas.offsetHeight,
            0.1,
            (canvas.offsetWidth) * 4);
    const camera_z = (canvas.offsetWidth) > 1000 ?
        (canvas.offsetWidth) - 500 : (canvas.offsetWidth) + 1000;
    camera.position.set(0, 0, camera_z);

    //----
    function updateCamera() {
        camera.updateProjectionMatrix();
    }
    function updatePosition() {
        camera.position.set(position_controls.pX, position_controls.pY, position_controls.pZ);
    }
    // ------ 

    const controls = new THREE.OrbitControls(camera, canvas);
    controls.target.set(0, 5, 0);
    controls.minDistance = 10;
    controls.maxDistance = 1500;
    controls.enableZoom = true;
    controls.enableDamping = true;
    controls.dampingFactor = 1.25;
    controls.autoRotate = false;
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE
    };
    controls.maxPolarAngle = 2.7;
    controls.minPolarAngle = 0.1;
    controls.update();

    // ------ 
    const position_controls = {
        pX: 0,
        pY: 0,
        pZ: 0
    };
    const gui = new dat.GUI();
    gui.add(camera, 'fov', 1, 180).onChange(updateCamera);
    const minMaxGUIHelper = new MinMaxGUIHelper(camera, 'near', 'far', 0.1);
    gui.add(minMaxGUIHelper, 'min', 0.1, 500, 0.1).name('near').onChange(updateCamera);
    gui.add(minMaxGUIHelper, 'max', 0.1, 500, 0.1).name('far').onChange(updateCamera);
    gui.add(position_controls, "pX", 500, 2500).onChange(updatePosition);
    gui.add(position_controls, "pY", 500, 2500).onChange(updatePosition);
    gui.add(position_controls, "pZ", 500, 2500).onChange(updatePosition);


    // ------ 
    const scene = new THREE.Scene();
    const textureLoader = new THREE.TextureLoader();
    const decalDiffuse = textureLoader.load('threebg.jpg', () => {
        scene.background = decalDiffuse;
    });
    scene.rotation.x = 5.3;
    const ambient = new THREE.AmbientLight(0xe3e1e1);
    scene.add(ambient);
    const point = new THREE.PointLight(0xC0C0C0, 0.4);
    point.position.set(512, 384, 300);
    scene.add(point);
    const light = new THREE.DirectionalLight(0xffffff, 0.6);
    light.position.set(0.75, 0.75, 1.0).normalize();
    scene.add(light);
    // ------ 

    const list = [];
    let currentList = null;


    function initSVGObject(svgurl) {
        const obj = {
            paths: null,
            depths: null,
            colors: null,
            center: null,
        };
        const promiseA = new Promise((resolutionFunc, rejectionFunc) => {
            const loader = new THREE.SVGLoader();
            loader.load(svgurl, function (data) {
                obj.paths = data.paths;
                obj.depths = [10, 20, 30];
                obj.colors = ['#efd9d1', '#efd9d1', '#efd9d1'];
                obj.center = { x: 0, y: 0 };
                resolutionFunc(obj);
            });
        });
        return promiseA;
    }
    function containsChinese(str) {
        return /.*[\u4e00-\u9fa5]+.*$/.test(str);
    }
    function makeTextSprite(message, parameters) {
        if (parameters === undefined) parameters = {};
        const fontface = parameters.hasOwnProperty("fontface") ?
            parameters["fontface"] : "Arial";
        const fontsize = parameters.hasOwnProperty("fontsize") ?
            parameters["fontsize"] : 55;
        const borderThickness = parameters.hasOwnProperty("borderThickness") ?
            parameters["borderThickness"] : 2;
        const borderColor = parameters.hasOwnProperty("borderColor") ?
            parameters["borderColor"] : { r: 0, g: 0, b: 0, a: 1.0 };
        const backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
            parameters["backgroundColor"] : { r: 255, g: 255, b: 255, a: 0.1 };
        const fontColor = parameters.hasOwnProperty("color") ?
            parameters["color"] : "#ffffff";

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
            + backgroundColor.b + "," + backgroundColor.a + ")";

        context.font = "Bold " + fontsize + "px " + fontface;
        context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
            + borderColor.b + "," + borderColor.a + ")";
        context.fillStyle = fontColor;
        context.fillText(message, borderThickness, fontsize + borderThickness);
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        const spriteMaterial = new THREE.SpriteMaterial(
            {
                map: texture,
                transparent: true
            });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(100, 100, 1.0);
        return sprite;
    }
    function addGeoObject(
        svgObject
    ) {
        const paths = svgObject.paths;
        const group = new THREE.Group();


        const simpleShapes = paths[0].toShapes(true, true);
        for (let j = 0; j < simpleShapes.length; j++) {
            const material = new THREE.MeshLambertMaterial({
                color: new THREE.Color('#a6a6a4'),
                transparent: true
            });
            const simpleShape = simpleShapes[j];
            const shape3d = new THREE.ExtrudeGeometry(simpleShape, {
                steps: 1,
                depth: 4,
                bevelEnabled: true,
                bevelThickness: 1,
                bevelSize: 2,
                bevelSegments: 1
            });

            const mesh = new THREE.Mesh(shape3d, material);
            mesh.rotation.x = Math.PI;
            mesh.position.set(0, 0, -21);

            group.add(mesh);
        }

        for (let i = 1; i < paths.length; i++) {
            const path = paths[i];
            const color = new THREE.Color(`hsla(${~~(360 * Math.random())},70%,70%,1)`);
            const simpleShapes = path.toShapes(true, true);
            const material = new THREE.MeshLambertMaterial({
                color: color,
                transparent: true,
            });
            for (let j = 0; j < simpleShapes.length; j++) {
                const name = path.userData.node.id ?
                    path.userData.node.id : 'path-' + i + '-' + j;
                if (containsChinese(name)) {
                    const sprite = makeTextSprite(name);
                    if (path.currentPath) {
                        sprite.oriX = path.currentPath.currentPoint.x;
                        sprite.oriY = path.currentPath.currentPoint.y;
                        sprite.position.set(sprite.oriX, -sprite.oriY, 20);
                    }
                    group.add(sprite);
                    continue;
                }
                const simpleShape = simpleShapes[j];
                const shape3d =
                    new THREE.ExtrudeGeometry(
                        simpleShape, {// Shape or an array of shapes
                        steps: 1,
                        depth: 20,
                        bevelEnabled: false,
                        bevelThickness: 1,
                        bevelSize: 1,
                        bevelSegments: 1
                    });

                const mesh = new THREE.Mesh(shape3d, material);
                mesh.rotation.x = Math.PI;
                mesh.cursor = 'pointer';
                mesh.name = name;
                group.add(mesh);
            }
        }
        const bbox = new THREE.Box3().setFromObject(group);
        bbox.getCenter(group.position).multiplyScalar(- 1);
        return group;
    }
    {

        const svg1 = await initSVGObject('3F.svg');
        const group1 = addGeoObject(svg1);
        group1.scale.set(0.5, 0.5, 1);
        group1.position.x = group1.position.x + 500;
        group1.position.y = group1.position.y - 400;
        group1._id = 1;
        list.push(group1); // 从下往上数
        const svg2 = await initSVGObject('2F.svg');
        const group2 = addGeoObject(svg2);
        group2._id = 2;
        list.push(group2);
        const group3 = await addGeoObject(svg2);
        group3._id = 3;
        list.push(group3);
    }

    let space = 0;
    list.forEach((ele, index) => {
        ele._floorid = index;
        space += 100;
        ele.position.z = space;
        scene.add(ele);
    });


    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    function render() {

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        renderer.render(scene, camera);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
    var currentFloor = 0;

    function selecteFloorByid(id) {
        if (id == 'all') {
            space = 0;
            currentFloor = 0;
            scene.rotation.x = 5.3;
            list.forEach((ele, index) => {
                ele._floorid = index;
                space += 100;
                ele.position.z = space;
                scene.add(ele);
            });
        } else {
            currentFloor = id;
            scene.rotation.x = 0;
            for (var i = 0; i < list.length; i++) {
                if (list[i]._id == id) {
                    list[i].position.z = 0;
                    scene.add(list[i]);
                    currentList = list[i]
                } else {
                    scene.remove(list[i]);
                }
            }
        }
    }

    {

        const ul = document.getElementById('ul');
        const butns = ul.getElementsByTagName('li');
        for (let index = 0; index < butns.length; index++) {
            const element = butns[index];
            element.onclick = function (obj) {
                const id = obj.target.innerHTML;
                selecteFloorByid(id);

            }

        }

    }
    /**
     * three not provide any click event
     * use intersects to get what u click's obj
     * Here I write the function when click then change the color when u click
     * then u need to store ur last colick
     */
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    let lastobj = null;
    let color = null;
    let flag = true;
    function onMouseMove(event) {
        /***
         * clientX - > relate to window
         * if u have inner a div or others, use offsetx/y
         */


        mouse.x = (event.offsetX / canvas.offsetWidth) * 2 - 1;
        mouse.y = - (event.offsetY / canvas.offsetHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        if (currentFloor === 0) {
            var intersects = raycaster.intersectObjects(list, true);
            if (intersects && intersects[0]) {
                const id = intersects[0].object.parent._id;
                selecteFloorByid(id)
            }
        } else {
            var intersects = raycaster.intersectObjects(scene.children, true);
            if (intersects && intersects[0]) {
                const curobj = intersects[0];

                if (flag) {
                    lastobj = curobj.object;
                    color = lastobj.material.color.getHex();
                    flag = false;
                } else {
                    lastobj.material.color.setHex(color);
                }
                lastobj = curobj.object;
                color = curobj.object.material.color.getHex();
                curobj.object.material.color.setHex(0xffffff)

            }
        }


    }
    canvas.addEventListener('click', onMouseMove)

}

main();
