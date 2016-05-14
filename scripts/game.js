Math.random2d = function(x,y) {
    var x2 = 12.9898, y2 = 78.233;
    if (x === 0)
        x = 0.0001;
    var dot = (x*x2 + y*y2) / (Math.sqrt(x*x+y*y) * Math.sqrt(x2*x2+y2*y2));
    var whole = (Math.sin(dot)*0.5+0.5) * 43758.5453;
    return whole - Math.floor(whole);
};

Date.timeStamp = function() {
    return new Date().getTime() / 1000.0;
};

window.game = function() {

    var left = false, right = false;

    $(document).keydown(function(e){
        if (e.which === 37) left = true;
        else if (e.which === 39) right = true;
    });

    $(document).keyup(function(e){
        if (e.which === 37) left = false;
        else if (e.which === 39) right = false;
    });

    var canvas = document.getElementById('3dview');
    var cam = new THREE.PerspectiveCamera(75, 1.5, 0.1, 1000);
    var scene = new THREE.Scene();
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setClearColor( 0x777777, 1 );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.soft = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.physicallyBasedShading = true;

    scene.fog = new THREE.Fog('#777777', 3.0, 7.0);

    var viewport = null;

    var setViewport = function () {
        var lvp = viewport;
        viewport = {
            w: window.innerWidth,
            h: window.innerHeight
        };
        if (!lvp || lvp.w !== viewport.w || lvp.h !== viewport.h) {
            renderer.setSize(viewport.w, viewport.h);
            cam.aspect = viewport.w / viewport.h;
            cam.updateProjectionMatrix();
        }
    };

    var makeGeom = function (dir) {
        var ret = new THREE.PlaneBufferGeometry( 1, 1, 24, 24 );
        var verts = ret.attributes.position;
        var offset = 0;

        for (var iy = 0; iy <= 24; iy += 1) {
            for (var ix = 0; ix <= 24; ix += 1) {

                var x = (ix / 24 - 0.5) * 2;
                var y = (-(iy / 24 - 0.5)) * 2;
                var t = Math.pow(Math.sqrt(x*x+y*y), 2.0);
                var z = t > 1 ? 0.0 : 1 - Math.max(0, Math.sin(Math.PI*t*0.5));
                z *= dir;

                verts.array[offset+0] *= 2;
                verts.array[offset+1] *= 2;
                verts.array[offset+2] = z;
          
                offset += 3;
            }
        }

        ret.computeFaceNormals();
        ret.computeVertexNormals();
        ret.computeBoundingBox();

        return ret;

    };

    setViewport();

    cam.position.set(0, 0, 0.5);
    cam.lookAt(new THREE.Vector3(0, 5, 0));

    var light = new THREE.SpotLight( 0x777777, 1, 5);
    light.castShadow = true;
    scene.add(light);

    var lightAmbient = new THREE.AmbientLight( 0x777777 );
    scene.add(lightAmbient);

    var geometry = new THREE.PlaneBufferGeometry( 2, 2, 4, 4 );
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    var negGeom = makeGeom(-1);
    var posGeom = makeGeom(1);
    var material = new THREE.MeshPhongMaterial( { color: 0x888888 } );

    var box = new THREE.CubeGeometry(0.125, 0.125, 0.125);
    var pmat = new THREE.MeshPhongMaterial( { color: 0x008800 } );
    var pmesh = new THREE.Mesh(box, pmat);
    pmesh.castShadow = true;
    pmesh.receiveShadow = true;
    scene.add(pmesh);

    var range = 5;
    var getKey = function(x, y) {
        return x*100000+y;
    };
    var cache = {};

    var cx = 0, cy = 0;
    var angle = Math.PI/3.0;
    var speed = 0.05;
    var time = 0.0;
    var lastTS = Date.timeStamp();

    var render = function () {
        var ts = Date.timeStamp();
        var dt = ts - lastTS;
        lastTS = ts;
        time += dt;

        dt *= 0.65;

        window.requestAnimationFrame(render);

        setViewport();

        cx += Math.cos(angle) * speed * dt*60;
        cy += Math.sin(angle) * speed * dt*60;

        if (left) {
            angle += Math.PI / 90 * dt*60;
        }
        if (right) {
            angle -= Math.PI / 90 * dt*60;
        }

        cam.position.set(cx-Math.cos(angle), cy-Math.sin(angle), 1.1);
        cam.lookAt(new THREE.Vector3(cx+Math.cos(angle), cy+Math.sin(angle), 0));
        cam.up.set(0, 0, 1);
        cam.updateMatrix();
        cam.updateMatrixWorld();

        pmesh.rotation.x += 0.1;
        pmesh.rotation.y += 0.13;
        
        light.position.set( cx-Math.cos(angle+Math.PI/2), cy-Math.sin(angle+Math.PI/2), 1.5 );
        light.target = pmesh;
        light.updateMatrix();
        light.updateMatrixWorld(); 

        var camDist = Math.sqrt(cam.position.x*cam.position.x + cam.position.y*cam.position.y);

        $('#hud').html('<b>Time: ' + (Math.floor(time*10)/10) + '</b><br>Distance: ' + Math.floor(camDist*10) + '<br><b>Score: ' + Math.floor(camDist/time*100) + '');

        var x0 = Math.floor(cam.position.x/2);
        var y0 = Math.floor(cam.position.y/2);
        var x0i = Math.floor(cx/2+0.5);
        var y0i = Math.floor(cy/2+0.5);
        var active = {};
        var sc = 0;
        for (var ox=-range; ox<=range; ox++) {
            for (var oy=-range; oy<=range; oy++) {
                var x = x0+ox, y = y0+oy;
                var k = getKey(x,y);
                active[k] = true;
                
                var geom = geometry;
                var r = Math.pow(Math.random2d(x-3441, y+3431), 1);
                var r2 = Math.pow(Math.random2d(x+1241, y-1343), 2);
                if (r > 0.5) {
                    geom = posGeom;
                    if (x == x0i && y == y0i) {
                        sc = 1;
                    }
                }
                else if (r2 > 0.5) {
                    geom = negGeom;
                    if (x == x0i && y == y0i) {
                        sc = -1;
                    }
                }
                if (!cache[k]) {
                    var mesh = new THREE.Mesh( geom, material );
                    scene.add( mesh );
                    mesh.position.set(x*2, y*2, 0.0);
                    mesh.castShadow = geom != geometry;
                    mesh.receiveShadow = true;
                    cache[k] = mesh;
                }
            }
        }

        for (var k in cache) {
            if (!active[k]) {
                scene.remove(cache[k]);
                cache[k] = null;
                delete cache[k];
            }
        }

        var xf = Math.abs(cx/2+0.5 - x0i) - 0.5;
        var yf = Math.abs(cy/2+0.5 - y0i) - 0.5;
        var t = Math.pow(Math.sqrt(xf*xf+yf*yf) * 2, 2.0);
        var z = t > 1 ? 0.0 : 1 - Math.max(0, Math.sin(Math.PI*t*0.5));
        z *= sc;
        speed = (z + 1.0) * 0.05
        if (z > 0) {
            speed = Math.pow(speed, 0.8);
        }
        pmesh.position.set(cx, cy, z + 0.25);
        pmesh.updateMatrix();
        pmesh.updateMatrixWorld();

        renderer.clear();
        renderer.render(scene, cam);
    };
    window.requestAnimationFrame(render);

};