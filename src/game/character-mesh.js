(function () {
  "use strict";

  function hexToRgb(color) {
    const value = color.replace("#", "");
    const hex = value.length === 3
      ? value.split("").map((part) => part + part).join("")
      : value;
    const number = parseInt(hex, 16);

    return [
      ((number >> 16) & 255) / 255,
      ((number >> 8) & 255) / 255,
      (number & 255) / 255,
    ];
  }

  function mixColor(a, b, amount) {
    return [
      a[0] + (b[0] - a[0]) * amount,
      a[1] + (b[1] - a[1]) * amount,
      a[2] + (b[2] - a[2]) * amount,
    ];
  }

  function normalizeVector(x, y, z) {
    const length = Math.hypot(x, y, z) || 1;
    return [x / length, y / length, z / length];
  }

  function transformPosition(position, transform) {
    if (!transform) {
      return position;
    }

    let [x, y, z] = position;
    const originX = transform.originX || 0;
    const originY = transform.originY || 0;
    const originZ = transform.originZ || 0;
    x -= originX;
    y -= originY;
    z -= originZ;

    if (transform.rotateX) {
      const c = Math.cos(transform.rotateX);
      const s = Math.sin(transform.rotateX);
      const nextY = y * c - z * s;
      const nextZ = y * s + z * c;
      y = nextY;
      z = nextZ;
    }
    if (transform.rotateY) {
      const c = Math.cos(transform.rotateY);
      const s = Math.sin(transform.rotateY);
      const nextX = x * c + z * s;
      const nextZ = -x * s + z * c;
      x = nextX;
      z = nextZ;
    }
    if (transform.rotateZ) {
      const c = Math.cos(transform.rotateZ);
      const s = Math.sin(transform.rotateZ);
      const nextX = x * c - y * s;
      const nextY = x * s + y * c;
      x = nextX;
      y = nextY;
    }

    return [
      x + originX + (transform.translateX || 0),
      y + originY + (transform.translateY || 0),
      z + originZ + (transform.translateZ || 0),
    ];
  }

  function transformNormal(normal, transform) {
    if (!transform) {
      return normal;
    }

    let [x, y, z] = normal;

    if (transform.rotateX) {
      const c = Math.cos(transform.rotateX);
      const s = Math.sin(transform.rotateX);
      const nextY = y * c - z * s;
      const nextZ = y * s + z * c;
      y = nextY;
      z = nextZ;
    }
    if (transform.rotateY) {
      const c = Math.cos(transform.rotateY);
      const s = Math.sin(transform.rotateY);
      const nextX = x * c + z * s;
      const nextZ = -x * s + z * c;
      x = nextX;
      z = nextZ;
    }
    if (transform.rotateZ) {
      const c = Math.cos(transform.rotateZ);
      const s = Math.sin(transform.rotateZ);
      const nextX = x * c - y * s;
      const nextY = x * s + y * c;
      x = nextX;
      y = nextY;
    }

    return normalizeVector(x, y, z);
  }

  function pushVertex(vertices, position, normal, color) {
    vertices.push(
      position[0],
      position[1],
      position[2],
      normal[0],
      normal[1],
      normal[2],
      color[0],
      color[1],
      color[2],
      color[3] ?? 1,
    );
  }

  function addQuad(vertices, a, b, c, d, normal, color, transform) {
    const transformedNormal = transformNormal(normal, transform);
    pushVertex(vertices, transformPosition(a, transform), transformedNormal, color);
    pushVertex(vertices, transformPosition(b, transform), transformedNormal, color);
    pushVertex(vertices, transformPosition(c, transform), transformedNormal, color);
    pushVertex(vertices, transformPosition(a, transform), transformedNormal, color);
    pushVertex(vertices, transformPosition(c, transform), transformedNormal, color);
    pushVertex(vertices, transformPosition(d, transform), transformedNormal, color);
  }

  function addEllipsoid(vertices, centerX, centerY, centerZ, radiusX, radiusY, radiusZ, color, transform, detail = 1) {
    const rings = 6 + detail * 2;
    const segments = 10 + detail * 4;

    for (let ring = 0; ring < rings; ring += 1) {
      const theta0 = (ring / rings) * Math.PI;
      const theta1 = ((ring + 1) / rings) * Math.PI;

      for (let segment = 0; segment < segments; segment += 1) {
        const phi0 = (segment / segments) * Math.PI * 2;
        const phi1 = ((segment + 1) / segments) * Math.PI * 2;
        const p00 = ellipsoidPoint(centerX, centerY, centerZ, radiusX, radiusY, radiusZ, theta0, phi0);
        const p01 = ellipsoidPoint(centerX, centerY, centerZ, radiusX, radiusY, radiusZ, theta0, phi1);
        const p10 = ellipsoidPoint(centerX, centerY, centerZ, radiusX, radiusY, radiusZ, theta1, phi0);
        const p11 = ellipsoidPoint(centerX, centerY, centerZ, radiusX, radiusY, radiusZ, theta1, phi1);
        const n00 = ellipsoidNormal(theta0, phi0);
        const n01 = ellipsoidNormal(theta0, phi1);
        const n10 = ellipsoidNormal(theta1, phi0);
        const n11 = ellipsoidNormal(theta1, phi1);

        pushVertex(vertices, transformPosition(p00, transform), transformNormal(n00, transform), color);
        pushVertex(vertices, transformPosition(p10, transform), transformNormal(n10, transform), color);
        pushVertex(vertices, transformPosition(p11, transform), transformNormal(n11, transform), color);
        pushVertex(vertices, transformPosition(p00, transform), transformNormal(n00, transform), color);
        pushVertex(vertices, transformPosition(p11, transform), transformNormal(n11, transform), color);
        pushVertex(vertices, transformPosition(p01, transform), transformNormal(n01, transform), color);
      }
    }
  }

  function ellipsoidPoint(centerX, centerY, centerZ, radiusX, radiusY, radiusZ, theta, phi) {
    const sinTheta = Math.sin(theta);

    return [
      centerX + radiusX * sinTheta * Math.cos(phi),
      centerY + radiusY * sinTheta * Math.sin(phi),
      centerZ + radiusZ * Math.cos(theta),
    ];
  }

  function ellipsoidNormal(theta, phi) {
    const sinTheta = Math.sin(theta);
    return normalizeVector(
      sinTheta * Math.cos(phi),
      sinTheta * Math.sin(phi),
      Math.cos(theta),
    );
  }

  function addDisc(vertices, centerX, centerY, centerZ, radiusX, radiusY, color, transform, segments = 28) {
    const normal = [0, 0, 1];

    for (let index = 0; index < segments; index += 1) {
      const angle0 = (index / segments) * Math.PI * 2;
      const angle1 = ((index + 1) / segments) * Math.PI * 2;
      const center = [centerX, centerY, centerZ];
      const p0 = [centerX + Math.cos(angle0) * radiusX, centerY + Math.sin(angle0) * radiusY, centerZ];
      const p1 = [centerX + Math.cos(angle1) * radiusX, centerY + Math.sin(angle1) * radiusY, centerZ];

      pushVertex(vertices, transformPosition(center, transform), transformNormal(normal, transform), color);
      pushVertex(vertices, transformPosition(p0, transform), transformNormal(normal, transform), color);
      pushVertex(vertices, transformPosition(p1, transform), transformNormal(normal, transform), color);
    }
  }

  function addCylinder(vertices, centerX, centerY, centerZ, radiusX, radiusY, height, color, transform, segments = 14) {
    const z0 = centerZ - height / 2;
    const z1 = centerZ + height / 2;

    for (let index = 0; index < segments; index += 1) {
      const angle0 = (index / segments) * Math.PI * 2;
      const angle1 = ((index + 1) / segments) * Math.PI * 2;
      const x0 = Math.cos(angle0) * radiusX;
      const y0 = Math.sin(angle0) * radiusY;
      const x1 = Math.cos(angle1) * radiusX;
      const y1 = Math.sin(angle1) * radiusY;
      const n0 = normalizeVector(Math.cos(angle0) / radiusX, Math.sin(angle0) / radiusY, 0);
      const n1 = normalizeVector(Math.cos(angle1) / radiusX, Math.sin(angle1) / radiusY, 0);
      const p0 = [centerX + x0, centerY + y0, z0];
      const p1 = [centerX + x1, centerY + y1, z0];
      const p2 = [centerX + x1, centerY + y1, z1];
      const p3 = [centerX + x0, centerY + y0, z1];

      pushVertex(vertices, transformPosition(p0, transform), transformNormal(n0, transform), color);
      pushVertex(vertices, transformPosition(p1, transform), transformNormal(n1, transform), color);
      pushVertex(vertices, transformPosition(p2, transform), transformNormal(n1, transform), color);
      pushVertex(vertices, transformPosition(p0, transform), transformNormal(n0, transform), color);
      pushVertex(vertices, transformPosition(p2, transform), transformNormal(n1, transform), color);
      pushVertex(vertices, transformPosition(p3, transform), transformNormal(n0, transform), color);
    }

    addDisc(vertices, centerX, centerY, z1, radiusX, radiusY, color, transform, segments);
    addDisc(vertices, centerX, centerY, z0, radiusX, radiusY, color, transform, segments);
  }

  function addCapsule(vertices, centerX, centerY, centerZ, radiusX, radiusY, radiusZ, length, color, transform) {
    addCylinder(vertices, centerX, centerY, centerZ, radiusX, radiusY, length, color, transform, 14);
    addEllipsoid(vertices, centerX, centerY, centerZ + length / 2, radiusX, radiusY, radiusZ, color, transform, 1);
    addEllipsoid(vertices, centerX, centerY, centerZ - length / 2, radiusX, radiusY, radiusZ, color, transform, 1);
  }

  function makeCharacterVertices(player, now, index) {
    const vertices = [];
    const body = hexToRgb(player.bodyColor);
    const accent = hexToRgb(player.accentColor);
    const skin = player.local ? [1, 0.79, 0.62] : [0.96, 0.72, 0.54];
    const hair = [0.08, 0.11, 0.18];
    const shoe = [0.055, 0.07, 0.105];
    const blush = [1, 0.48, 0.48];
    const eye = [0.025, 0.035, 0.06];
    const white = [1, 1, 1];
    const armColor = mixColor(body, skin, 0.38);
    const moving = player.isWalking;
    const walkPhase = moving ? now * 0.011 + index * 1.6 : 0;
    const stride = moving ? Math.sin(walkPhase) : 0;
    const counterStride = moving ? Math.sin(walkPhase + Math.PI) : 0;
    const bounce = moving ? Math.abs(Math.sin(walkPhase)) * 2.6 : 0;
    const legLift = moving ? Math.max(stride, 0) * 2.4 : 0;
    const counterLegLift = moving ? Math.max(counterStride, 0) * 2.4 : 0;
    const armSwing = moving ? Math.sin(walkPhase) * 0.08 : 0;
    const legSwing = moving ? Math.sin(walkPhase) * 0.065 : 0;

    if (player.local) {
      addDisc(vertices, 0, 0, 0.4, 0.4, 0.3, [0.12, 0.88, 0.95, 0.38]);
    }

    const root = {
      translateZ: bounce,
      originZ: 34,
    };
    const leftLeg = {
      ...root,
      translateY: legSwing,
      translateZ: bounce + legLift,
    };
    const rightLeg = {
      ...root,
      translateY: -legSwing,
      translateZ: bounce + counterLegLift,
    };
    const leftArm = {
      ...root,
      translateY: -armSwing,
      rotateZ: -0.12,
    };
    const rightArm = {
      ...root,
      translateY: armSwing,
      rotateZ: 0.12,
    };

    addEllipsoid(vertices, 0, 0.02, 2.2, 0.34, 0.26, 1.8, [0, 0, 0, 0.24], undefined, 1);
    addCapsule(vertices, -0.08, 0.015, 14, 0.068, 0.058, 2.8, 14, mixColor(body, shoe, 0.42), leftLeg);
    addCapsule(vertices, 0.08, 0.015, 14, 0.068, 0.058, 2.8, 14, mixColor(body, shoe, 0.42), rightLeg);
    addEllipsoid(vertices, -0.08, -0.035, 5.2, 0.12, 0.068, 2.5, shoe, leftLeg, 1);
    addEllipsoid(vertices, 0.08, -0.035, 5.2, 0.12, 0.068, 2.5, shoe, rightLeg, 1);
    addEllipsoid(vertices, 0, 0, 31.5, 0.25, 0.18, 14.5, body, root, 2);
    addEllipsoid(vertices, 0, -0.145, 39, 0.215, 0.047, 3.6, accent, root, 1);
    addCapsule(vertices, -0.245, -0.005, 31.5, 0.055, 0.05, 2.5, 14, armColor, leftArm);
    addCapsule(vertices, 0.245, -0.005, 31.5, 0.055, 0.05, 2.5, 14, armColor, rightArm);
    addEllipsoid(vertices, -0.245, -0.012, 23.2, 0.062, 0.054, 3.1, skin, leftArm, 1);
    addEllipsoid(vertices, 0.245, -0.012, 23.2, 0.062, 0.054, 3.1, skin, rightArm, 1);
    addEllipsoid(vertices, 0, 0, 57, 0.31, 0.255, 18.5, skin, root, 3);
    addEllipsoid(vertices, 0, -0.048, 69, 0.32, 0.23, 9, hair, root, 2);
    addEllipsoid(vertices, -0.118, -0.212, 58.5, 0.037, 0.014, 2.8, eye, root, 1);
    addEllipsoid(vertices, 0.118, -0.212, 58.5, 0.037, 0.014, 2.8, eye, root, 1);
    addEllipsoid(vertices, -0.17, -0.202, 54.7, 0.038, 0.014, 1.8, blush, root, 1);
    addEllipsoid(vertices, 0.17, -0.202, 54.7, 0.038, 0.014, 1.8, blush, root, 1);
    addEllipsoid(vertices, -0.108, -0.224, 59.7, 0.009, 0.004, 0.85, white, root, 1);
    addEllipsoid(vertices, 0.133, -0.224, 59.7, 0.009, 0.004, 0.85, white, root, 1);

    return new Float32Array(vertices);
  }

  window.CityCharacterMesh = {
    addCapsule,
    addDisc,
    addEllipsoid,
    hexToRgb,
    makeCharacterVertices,
    mixColor,
  };
})();
