(function () {
  "use strict";

  const { directionToAngle } = window.CityGameMath;

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "Could not compile character shader");
    }

    return shader;
  }

  function createProgram(gl, vertexSource, fragmentSource) {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Could not link character shader");
    }

    return program;
  }

  const { makeCharacterVertices } = window.CityCharacterMesh;

  function createCharacterMesh(gl) {
    const buffer = gl.createBuffer();

    return {
      buffer,
      count: 0,
      capacity: 0,
    };
  }

  function updateCharacterMesh(gl, mesh, player, now, index) {
    const vertices = makeCharacterVertices(player, now, index);
    const count = vertices.length / 10;

    mesh.count = count;
    mesh.capacity = vertices.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  }

  function createCharacterRenderer(gl, characterCanvas) {
    if (!gl) {
      return null;
    }

    characterCanvas.width = 192;
    characterCanvas.height = 192;

    const vertexSource = `
      attribute vec3 a_position;
      attribute vec3 a_normal;
      attribute vec4 a_color;

      uniform float u_angle;

      varying vec4 v_color;
      varying float v_light;

      void main() {
        float c = cos(u_angle);
        float s = sin(u_angle);
        vec2 local = vec2(
          a_position.x * c - a_position.y * s,
          a_position.x * s + a_position.y * c
        );
        vec3 normal = normalize(vec3(
          a_normal.x * c - a_normal.y * s,
          a_normal.x * s + a_normal.y * c,
          a_normal.z
        ));
        vec2 mapPoint = vec2(
          (local.x - local.y) * 54.0,
          (local.x + local.y) * 27.0 - a_position.z
        );
        vec2 pixel = mapPoint + vec2(96.0, 144.0);
        vec2 clip = vec2(
          pixel.x / 192.0 * 2.0 - 1.0,
          1.0 - pixel.y / 192.0 * 2.0
        );
        float depth = clamp(0.55 - a_position.z * 0.004 + (local.x + local.y) * 0.02, -0.95, 0.95);

        vec3 lightDirection = normalize(vec3(-0.42, -0.55, 0.72));
        v_light = 0.48 + max(dot(normal, lightDirection), 0.0) * 0.52;
        v_color = a_color;
        gl_Position = vec4(clip, depth, 1.0);
      }
    `;
    const fragmentSource = `
      precision mediump float;

      varying vec4 v_color;
      varying float v_light;

      void main() {
        gl_FragColor = vec4(v_color.rgb * v_light, v_color.a);
      }
    `;
    const program = createProgram(gl, vertexSource, fragmentSource);
    const locations = {
      position: gl.getAttribLocation(program, "a_position"),
      normal: gl.getAttribLocation(program, "a_normal"),
      color: gl.getAttribLocation(program, "a_color"),
      angle: gl.getUniformLocation(program, "u_angle"),
    };
    const meshes = new Map();

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);

    return {
      resize() {
        gl.viewport(0, 0, characterCanvas.width, characterCanvas.height);
      },
      renderToSprite(player, now, index) {
        gl.viewport(0, 0, characterCanvas.width, characterCanvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);

        if (!meshes.has(player.id)) {
          meshes.set(player.id, createCharacterMesh(gl));
        }

        const mesh = meshes.get(player.id);
        const angle = player.displayAngle ?? directionToAngle(player.directionX, player.directionY);
        updateCharacterMesh(gl, mesh, player, now, index);

        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
        gl.enableVertexAttribArray(locations.position);
        gl.enableVertexAttribArray(locations.normal);
        gl.enableVertexAttribArray(locations.color);
        gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 40, 0);
        gl.vertexAttribPointer(locations.normal, 3, gl.FLOAT, false, 40, 12);
        gl.vertexAttribPointer(locations.color, 4, gl.FLOAT, false, 40, 24);
        gl.uniform1f(locations.angle, angle);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);

        return characterCanvas;
      },
    };
  }

  window.CityCharacterRenderer = {
    createCharacterRenderer,
  };
})();
