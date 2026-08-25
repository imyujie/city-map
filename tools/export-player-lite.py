import argparse
import os
import sys

import bpy


def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []

    parser = argparse.ArgumentParser(description="Export a lighter GLB player model.")
    parser.add_argument("input", help="Source .glb/.gltf file")
    parser.add_argument("output", help="Destination .glb file")
    parser.add_argument("--ratio", type=float, default=0.08, help="Decimate ratio for mesh objects")
    parser.add_argument("--texture-size", type=int, default=1024, help="Maximum embedded texture size")
    return parser.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_model(path):
    ext = os.path.splitext(path)[1].lower()

    if ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path)
        return

    if ext in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=path)
        return

    raise ValueError(f"Unsupported model type: {ext}")


def resize_images(max_size):
    for image in bpy.data.images:
        if image.size[0] == 0 or image.size[1] == 0:
            continue

        largest = max(image.size)
        if largest <= max_size:
            continue

        scale = max_size / largest
        width = max(1, int(round(image.size[0] * scale)))
        height = max(1, int(round(image.size[1] * scale)))
        image.scale(width, height)
        image.pack()
        print(f"resized image {image.name}: {width}x{height}")


def decimate_meshes(ratio):
    ratio = max(0.01, min(1.0, ratio))

    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue

        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj

        modifier = obj.modifiers.new("GameLOD_Decimate", "DECIMATE")
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_move_to_index(modifier=modifier.name, index=0)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        print(f"decimated mesh {obj.name} with ratio {ratio:.3f}")


def export_model(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_animations=True,
        export_skins=True,
        export_image_format="AUTO",
        export_yup=True,
    )


def main():
    args = parse_args()
    clear_scene()
    import_model(args.input)
    resize_images(args.texture_size)
    decimate_meshes(args.ratio)
    export_model(args.output)
    print(f"exported {args.output}")


if __name__ == "__main__":
    main()
