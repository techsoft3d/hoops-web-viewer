/// <reference path="tcc.d.ts" />
declare namespace Communicator.Animation {
    /** Structure encapsulating a specific animation */
    class Animation {
        name: string;
        nodeChannels: NodeChannel[];
        cameraChannels: CameraChannel[];
        pivotPoints: Map<number, Point3>;
        /**
         * Creates a new, empty Animation
         * @param name friendly name for the animation
         */
        constructor(name: string);
        /**
         * Creates a new node animation channel.
         * @param name friendly name for the channel.
         * @param target id of node that will receive interpolated values.
         * @param property the node property that will be animated.
         * @param sampler sampler describing the buffer and interpolation type.
         */
        createNodeChannel(name: string, target: NodeId, property: NodeProperty, sampler: Sampler): NodeChannel;
        private _registerNodeChannel;
        /**
         * Creates a new camera animation channel.
         * @param name friendly name for the channel.
         * @param property the property that will be animated by this channel.
         * @param sampler sampler describing the buffer and interpolation type used.
         */
        createCameraChannel(name: string, property: CameraProperty, sampler: Sampler): CameraChannel;
        private _registerCameraChannel;
        /**
         * Removes a channel from this animation.
         *
         * Call [[Player.reload]] on any players that are referencing this animation.
         */
        deleteChannel(channel: NodeChannel | CameraChannel): void;
        /** @hidden */
        _gatherForExport(context: Internal.ExportContext): void;
        /** @hidden */
        _export(context: Internal.ExportContext): {
            nodeChannels?: {
                name?: string | undefined;
                colorMap?: number | undefined;
                nodeId: number;
                property: "Translation" | "Rotation" | "Scale" | "Opacity" | "Visibility" | "Color" | "ColorMap";
                sampler: number;
            }[] | undefined;
            cameraChannels?: {
                name?: string | undefined;
                property: "Position" | "Target" | "Up" | "Width" | "Height";
                sampler: number;
            }[] | undefined;
            name?: string | undefined;
            pivotPoints?: {
                node: number;
                point: Object;
            }[] | undefined;
        };
        /** @hidden */
        static _import(context: Internal.ImportContext, data: ReturnType<Animation["_export"]>): Animation;
    }
}
declare namespace Communicator.Animation {
    enum NodeProperty {
        Translation = 0,
        Rotation = 1,
        Scale = 2,
        Opacity = 3,
        Visibility = 4,
        Color = 5,
        ColorMap = 6
    }
    interface ColorPosition {
        color: Color;
        position: number;
    }
    /**
     * RGB color values are specified in the 0-255 range.
     * Positions are specified in the 0-1 range, pre-sorted in ascending order.
     */
    type ColorMap = ColorPosition[];
    class NodeChannel {
        readonly name: string;
        readonly nodeId: NodeId;
        readonly property: NodeProperty;
        readonly sampler: Sampler;
        colorMap: ColorMap | undefined;
        constructor(name: string, nodeId: NodeId, property: NodeProperty, sampler: Sampler);
        /** @hidden */
        _getValue(t: number, values: Internal.NodeValues): void;
        private _getColorFromMap;
        /** @hidden */
        _gatherForExport(context: Internal.ExportContext): void;
        /** @hidden */
        _export(context: Internal.ExportContext): {
            name?: string | undefined;
            colorMap?: number | undefined;
            nodeId: number;
            property: "Translation" | "Rotation" | "Scale" | "Opacity" | "Visibility" | "Color" | "ColorMap";
            sampler: number;
        };
        /** @hidden */
        static _import(context: Internal.ImportContext, data: ReturnType<NodeChannel["_export"]>): NodeChannel;
    }
    enum CameraProperty {
        Position = 0,
        Target = 1,
        Up = 2,
        Width = 3,
        Height = 4
    }
    class CameraChannel {
        readonly name: string;
        readonly property: CameraProperty;
        readonly sampler: Sampler;
        /**
         * Do not use directly.  Create via Animation class API.
         * @hidden
         * */
        constructor(name: string, property: CameraProperty, sampler: Sampler);
        /** @hidden */
        _getValue(t: number, values: BatchedCameraValues): void;
        /** @hidden */
        _gatherForExport(context: Internal.ExportContext): void;
        /** @hidden */
        _export(context: Internal.ExportContext): {
            name?: string | undefined;
            property: "Position" | "Target" | "Up" | "Width" | "Height";
            sampler: number;
        };
        /** @hidden */
        static _import(context: Internal.ImportContext, data: ReturnType<CameraChannel["_export"]>): CameraChannel;
    }
}
declare namespace Communicator.Animation {
    /**
     * Return the given animations and their dependent data in a form suitable
     * for serialization via, e.g., `JSON.stringify`. The animation objects can
     * be recreated by passing the output to [[importAnimations]].
     *
     * Sharing of objects such as keyframe buffers and samplers is preserved.
     *
     * The layout of the returned data is subject to change in future releases.
     */
    function exportAnimations(animations: Animation[]): Object;
    /**
     * Recreate [[Animation]] objects exported by a call to
     * [[exportAnimations]].
     */
    function importAnimations(exportedObj: Object): Animation[];
}
/** @hidden */
declare namespace Communicator.Animation.Internal {
    class ExportContext {
        readonly buffers: IndexedSet<KeyframeBuffer>;
        readonly samplers: IndexedSet<Sampler>;
        readonly colorMaps: IndexedSet<ColorPosition[]>;
    }
    class ImportContext {
        readonly buffers: KeyframeBuffer[];
        readonly samplers: Sampler[];
        readonly colorMaps: ColorMap[];
    }
    /**
     * Provides the functionality of a `Set` with the addition of a
     * monotonically-increasing index associated with each element.
     */
    class IndexedSet<T> {
        private readonly map;
        add(value: T): void;
        getIndex(value: T): number;
        /**
         * Returns an array containing each element of the set placed at its
         * assigned index.
         */
        toArray(): T[];
        isEmpty(): boolean;
    }
}
declare namespace Communicator.Animation {
    /** Describes the type of values stored in a Keyframe Buffer */
    enum KeyType {
        /** Keyframe value is a single scalar. */
        Scalar = 1,
        /** Keyframe value is a 3 component vector. */
        Vec3 = 3,
        /** Keyframe value is interpreted as a 4 component quaternion */
        Quat = 4
    }
    /**
     * This class contains a collection of keyframes.
     * A Keyframe consists of a scalar value T, representing the linear time in seconds, and a vector of scalars described by [[KeyType]].
     * Optionally, a Keyframe can also have a vector of tangents described by [[KeyType]], that are used for cubic spline interpolation.
     * Keyframes are stored in the times, values, and tangents arrays.
     * For example, with [[KeyType]] of Vec3:
     * times: t0, t1, ... tn
     * values: v0x, v0y, v0z, ... vnx, vny, vnz
     * tangents: in_v0x, in_v0y, in_v0z, out_v0x, out_v0y, out_v0z, ... in_vnx, in_vny, in_vnz, out_vnx, out_vny, out_vnz
     * */
    class KeyframeBuffer {
        readonly keyType: KeyType;
        times: number[];
        values: number[];
        tangents: number[];
        /** The number of elements between successive keyframes in the array. */
        readonly keyOffset: number;
        /** Keeps track if the data in the points array has associated tangents. */
        private _hasTangents;
        /**
         * Creates a new buffer for storing keyframe data.
         * @param keyType The type of keyframes that will be stored in the buffer.
         */
        constructor(keyType: KeyType);
        private _validateKey;
        private _validateTangents;
        private _findIndexFromTime;
        /** Returns the index of the keyframe at the specified time. */
        getKeyframeIndex(t: number): number;
        /** Deletes a keyframe at the specified index. */
        deleteKeyframe(index: number): void;
        /**
         * Inserts a Scalar keyframe with the specified time. The type of this buffer should be [[KeyType.Scalar]]
         * @returns Index at which keyframe was inserted
         */
        insertScalarKeyframe(t: number, val: number, inTan?: number, outTan?: number): number;
        /** Updates a Scalar keyframe at the specified index. The type of this buffer should be [[KeyType.Scalar]] */
        updateScalarKeyframe(index: number, t: number, val: number, inTan?: number, outTan?: number): void;
        /**
         * Inserts a Vec3 keyframe with the specified time. The type of this buffer should be [[KeyType.Vec3]]
         * @returns Index at which keyframe was inserted
         */
        insertVec3Keyframe(t: number, x: number, y: number, z: number, inTanX?: number, inTanY?: number, inTanZ?: number, outTanX?: number, outTanY?: number, outTanZ?: number): number;
        /** Updates a Vec3 keyframe at the specified index. The type of this buffer should be [[KeyType.Vec3]] */
        updateVec3Keyframe(index: number, t: number, x: number, y: number, z: number, inTanX?: number, inTanY?: number, inTanZ?: number, outTanX?: number, outTanY?: number, outTanZ?: number): number;
        /**
         * Inserts a Quat keyframe with the specified time. The type of this buffer should be [[KeyType.Quat]]
         * @returns Index at which keyframe was inserted
         */
        insertQuatKeyframe(t: number, x: number, y: number, z: number, w: number, inTanX?: number, inTanY?: number, inTanZ?: number, inTanW?: number, outTanX?: number, outTanY?: number, outTanZ?: number, outTanW?: number): void;
        /** Updates a Quat keyframe at the specified index. The type of this buffer should be [[KeyType.Quat]] */
        updateQuatKeyframe(index: number, t: number, x: number, y: number, z: number, w: number, inTanX?: number, inTanY?: number, inTanZ?: number, inTanW?: number, outTanX?: number, outTanY?: number, outTanZ?: number, outTanW?: number): void;
        /** @hidden */
        _export(): {
            tangents?: number[] | undefined;
            keyType: "Scalar" | "Vec3" | "Quat";
            times: number[];
            values: number[];
        };
        /** @hidden */
        static _import(data: ReturnType<KeyframeBuffer["_export"]>): KeyframeBuffer;
    }
}
declare namespace Communicator.Animation {
    /** Top-level interface for the animation system. */
    class Manager {
        private _viewer;
        private _players;
        private _intervalHandle;
        private _batch;
        /** @hidden Created during WebViewer Initialization. */
        constructor(_viewer: WebViewer);
        /** Creates a new animation player for the supplied animation. */
        createPlayer(animation: Animation): Player;
        /** Removes the player at the provided index from control of the manager. Returns `true` if a player was removed */
        removePlayerByIndex(index: number): boolean;
        /** Removes the provided player from control of the manager. Returns `true` is a player was removed */
        removePlayer(player: Player): boolean;
        /** Removes all players from control of the manager. */
        clear(): void;
        private _tick;
        /** @hidden  Called by the web viewer only*/
        _shutdown(): void;
        /**
         * Sets the interval at which animations are updated.
         * @param milliseconds number of milliseconds between update intervals
         */
        setTickInterval(milliseconds: number): void;
    }
}
declare namespace Communicator.Animation {
    enum PlayerState {
        Stopped = 0,
        Playing = 1,
        Paused = 2,
        Complete = 3
    }
    class Player {
        private readonly _viewer;
        /** The animation played by this player */
        readonly animation: Animation;
        /** If loop is set to LoopIndefinitely, the animation will play repeatedly. */
        static readonly LoopIndefinitely = -1;
        private readonly _nodeValues;
        private readonly _disabledChannels;
        /** The current time in seconds that the animation has been running. */
        private _currentTime;
        /** The time of the last update. */
        private _lastUpdate;
        /** Scale value to be applied to animation time. */
        speed: number;
        /** The total calculated time of the animation. */
        private _animationTime;
        private _state;
        /** The number of times the animation will repeat. Set to [[LoopIndefinitely]] to repeat indefinitely. Default is 0 */
        loop: number;
        /** The number of times the animation has repeated. */
        private _loopCount;
        /** Callback function to be called when the animation is complete.  Will not be triggered if the player is looping. */
        onComplete: (() => void) | null;
        /** A base offset value which will be applied to all node identifiers in the animation attached to this player.
         * This is useful to play an authored animation for a model that has been loaded into the scene after initial startup.
         * In this situation the authored node identifiers in the animation may not match up with the runtime node identifiers in the current scene.
         * The [[Model.getNodeIdOffset]] function can be used on the loaded model's root node to retrieve the correct offset value.
         * */
        nodeIdOffset: NodeIdOffset;
        /** @hidden Do not use.  Create via Animation.Manager API instead. */
        constructor(_viewer: WebViewer, 
        /** The animation played by this player */
        animation: Animation);
        /** Sets the enabled state for a channel in this players animation.
         * All channels are enabled by default when a player is created.
         * A channel that has been disabled will not have its value interpolated by the system until it is re-enabled
         * @param channel a channel from the underlying animation
         * @param enabled boolean value indicating whether the channel should be enabled.
         */
        setChannelEnabled(channel: NodeChannel | CameraChannel, enabled: boolean): void;
        /**
         * Updates internal state of animation player.
         *
         * Call this method after any part of the underlying animation has been updated.
         * */
        reload(): void;
        /**
         * Called automatically by the Animation.Manager when it is updating all animations.
         * @returns True if values were modified.
         * @hidden
         */
        _tick(now: number, batch: BatchedValues): boolean;
        /**
         * Updates the animation using the supplied delta time specified in seconds.
         * @returns True if values were modified.
         * @hidden
         */
        private _tickTime;
        /** Starts playing the animation. */
        play(): void;
        /** Pauses animation playback. */
        pause(): void;
        /** Stops animation playback and resets the current time to 0. */
        stop(): void;
        /**
         * Sets the current animation time.
         * @param time time in milliseconds
         */
        setTime(time: number): void;
        /**
         * Calculate the values for each channel of the associated [[Animation]]
         * at the given time.
         *
         * @param time The time at which to evaluate the animation.
         * @param out Storage for the evaluated values. If supplied, this object
         * will be returned instead of a new [[BatchedValues]] object. This
         * allows values gathered from multiple players to be combined into one
         * batch.
         */
        evaluate(time: number, out?: BatchedValues): BatchedValues;
        /** Gets the current animation state. */
        getState(): PlayerState;
        /** Gets the current time in seconds that the animation has been playing. */
        getCurrentTime(): number;
        /** Gets the current time in seconds of the entire animation. */
        getAnimationTime(): number;
    }
}
declare namespace Communicator {
    class Point3 {
        x: number;
        y: number;
        z: number;
        /**
         * Creates a new point object.
         * @param x X value
         * @param y Y value
         * @param z Z value
         */
        constructor(x: number, y: number, z: number);
        /**
         * Sets this point equal to another point.
         * @param point The point to assign.
         * @returns This point object.
         */
        assign(point: Point3): Point3;
        /**
         * Sets the values of this point.
         * @param x X value to set.
         * @param y Y value to set.
         * @param z Z value to set.
         * @returns This point object.
         */
        set(x: number, y: number, z: number): Point3;
        /**
         * Sets an array from this point.
         * @param arr Array to assign.
         */
        toArray(arr: number[]): void;
        /**
         * Sets this point from an array.
         * @param arr Array to assign from.
         * @returns This point object.
         */
        fromArray(arr: number[]): Point3;
        /**
         * Adds another point to this point.
         * @param point Point to add.
         * @returns This point object.
         */
        add(pt: Point3): Point3;
        /**
         * Subtracts another point from this point.
         * @param point Point to subtract.
         * @returns This point object.
         */
        subtract(pt: Point3): Point3;
        /**
         * Creates a copy of this point.
         * @returns Copy of this point object.
         */
        copy(): Point3;
        /**
         * Creates a new [[Point3]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any): Point3;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any): Point3;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Strictly compares this point with another.
         * @param other Point to compare with.
         * @returns True if the values of this point equal those of the other.
         */
        equals(other: Point3): boolean;
        /**
         * Compares this point with another using a tolerance.
         * @param other Point to compare with.
         * @param tolerance Tolerance to be used in the comparison.
         * @returns True if the values of this point equal those of the other.
         */
        equalsWithTolerance(other: Point3, tolerance: number): boolean;
        /**
         * Returns a boolean value indicating if this vector lies on a major axis.
         */
        isAxis(): boolean;
        /**
         * Returns the length of this vector.
         * @returns Vector length.
         */
        length(): number;
        /**
         * Returns the squared length of this vector.
         * @returns Vector squared length.
         */
        squaredLength(): number;
        /**
         * Scale the point by constant value.
         * @param k Constant value to scale by.
         * @returns Point object.
         */
        scale(k: number): Point3;
        /**
         * Normalizes the vector.
         * @returns This object.
         */
        normalize(): Point3;
        /**
         * Negates the point.
         * @returns This object.
         */
        negate(): Point3;
        /**
         * Creates a new Point initialized to (0,0,0).
         * @returns New point with all elements set to 0.
         */
        static zero(): Point3;
        /**
         * Adds two points.
         * @param p1 First point.
         * @param p2 Second point.
         * @returns Sum of p1 and p2.
         */
        static add(p1: Point3, p2: Point3): Point3;
        /**
         * Subtract two points.
         * @param p1 First point.
         * @param p2 Second point.
         * @returns Difference of p1 and p2.
         */
        static subtract(p1: Point3, p2: Point3): Point3;
        /**
         * Calculate dot product.
         * @param p1 First point.
         * @param p2 Second point.
         * @returns Dot product of p1 and p2.
         */
        static dot(p1: Point3, p2: Point3): number;
        /**
         * Calculate cross product.
         * @param p1 First point.
         * @param p2 Second point.
         * @returns Cross product of p1 and p2.
         */
        static cross(p1: Point3, p2: Point3): Point3;
        /**
         * Calculate distance between two points
         * @param p1 First point
         * @param p2 Second point
         * @returns Distance between p1 and p2
         */
        static distance(p1: Point3, p2: Point3): number;
        /**
         * Scale a point by a constant factor
         * @param p1 Point to scale
         * @param k Constant value to scale byS
         * @returns Copy of p scaled by a constant factor
         */
        static scale(p: Point3, k: number): Point3;
        /**
         * Creates a point from an array of numbers
         * @param Array to assign from
         * @returns new point set from array elements
         */
        static createFromArray(arr: number[]): Point3;
    }
}
declare namespace Communicator {
    /**
     * Object representing the 4x4 Matrix. More information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/model_attributes/matrices.html).
     */
    class Matrix {
        m: SC.Matrix16;
        /**
         * Creates a new matrix set to the identity matrix.
         */
        constructor();
        /**
         * Sets the matrix to the identity matrix.
         * @returns This matrix object.
         */
        loadIdentity(): Matrix;
        isIdentity(): boolean;
        /**
         * Strictly compares this matrix with another.
         * @param other Matrix to compare with.
         * @returns True if the values of this matrix equal those of the other.
         */
        equals(other: Matrix): boolean;
        /**
         * Compares this matrix with another using a tolerance.
         * @param other Matrix to compare with.
         * @param tolerance Tolerance to be used in the comparison.
         * @returns True if the values of this matrix equal those of the other.
         */
        equalsWithTolerance(other: Matrix, tolerance: number): boolean;
        /**
         * Sets the scale components of this matrix.
         * @param x X scale value.
         * @param y Y scale value.
         * @param z Z scale value.
         * @returns This matrix object.
         */
        setScaleComponent(x: number, y: number, z: number): Matrix;
        /**
         * Sets the translation components of this matrix.
         * @param x X translation value.
         * @param y Y translation value.
         * @param z Z translation value.
         * @returns This matrix object.
         */
        setTranslationComponent(x: number, y: number, z: number): Matrix;
        /**
         * Creates a copy of this matrix.
         * @returns Copy of this matrix.
         */
        copy(): Matrix;
        /**
         * Sets the value of this matrix to another.
         * @param matrix the matrix whose values will be set.
         * @returns This matrix object.
         */
        assign(matrix: Matrix): Matrix;
        /**
         * Scales all elements of the matrix.
         * @param k Constant value to scale elements by.
         * @returns This matrix object.
         * @deprecated For multiplying all elements by a scalar see [[scalarMultiply]]. For setting scale component see [[setScaleComponent]]
         */
        scale(k: number): Matrix;
        /**
         * Multiply the matrix by given scalar.
         * @param scalar Scalar to multiply the matrix with.
         * @return This matrix object.
         */
        multiplyByScalar(scalar: number): Matrix;
        /**
         * Transforms a point according to this matrix. The source and destination points are allowed to be the same object.
         * @param point The point to be transformed.
         * @param result Point which will hold the result of the transformation.
         */
        transform(point: Point3, result: Point3): void;
        /**
         * Transforms a point according to this matrix.
         * @param point The point to be transformed.
         * @returns A new point which will hold the result of the transformation.
         */
        transform(point: Point3): Point3;
        /**
         * Transforms a point according to this matrix. The source and destination points are allowed to be the same object.
         * @param point The point to be transformed.
         * @param result Point which will hold the result of the transformation.
         */
        transform4(point: Point4, result: Point4): void;
        /**
         * Transforms a point according to this matrix.
         * @param point The point to be transformed.
         * @returns A new point which will hold the result of the transformation.
         */
        transform4(point: Point4): Point4;
        /**
         * Transforms an array of points according to this matrix.
         * @param inPoints an array of points to be transformed.
         * @param outPoints an array that will be populated with transformed points. Note that the results will be pushed onto the end of the array.
         */
        transformArray(inPoints: Point3[], outPoints: Point3[]): void;
        transformBox(inBox: Box): Box;
        /**
         * Sets this matrix equal to its transpose.
         * @returns This matrix object.
         */
        transpose(): Matrix;
        /**
         * Creates a matrix from an array of numbers.
         * @param arr 16 element array of numbers.
         * @returns New matrix with elements set to the values of the array parameter
         */
        static createFromArray(arr: number[]): Matrix;
        /**
         * Creates a rotation matrix from an arbitrary axis.
         * @param axis Axis to rotate about.
         * @param degrees Amount of degrees to rotate about the provided axis.
         * @returns Rotation matrix which represents the rotation about the supplied axis.
         */
        static createFromOffAxisRotation(axis: Point3, degrees: Degrees): Matrix;
        /**
         * Creates a matrix from three [[Point3]]s, which will be used as the
         * columns of the matrix.
         *
         * @param xAxis The first column.
         * @param yAxis The second column.
         * @param zAxis The third column.
         */
        static createFromBasis(xAxis: Point3, yAxis: Point3, zAxis: Point3): Matrix;
        /**
         * Multiplies two matrices.
         *
         * (p' = ABp <=> p' = multiply(B, A).transform(p))
         *
         * @param m1 The first matrix.
         * @param m2 The second matrix.
         * @returns Matrix which is the result of the multiplication.
         */
        static multiply(m1: Matrix, m2: Matrix): Matrix;
        /**
         * Computes the determinant and inverse of a matrix, if possible.
         * @returns An array containing the inverse (or null if not invertible) followed by the determinant
         */
        inverseAndDeterminant(): [Matrix | null, number];
        /**
         * Computes the inverse of a matrix if possible.
         * @param matrix Matrix whose inverse will be computed.
         * @returns Matrix set to the inverse of the supplied matrix.
         */
        static inverse(matrix: Matrix): Matrix | null;
        /**
         * Computes the determinant of the upper-left 3x3 subsection of this matrix.
         */
        upperLeft3x3Determinant(): number;
        /**
         * @returns the version of this matrix suitable for applying to normals,
         * i.e. the inverse transpose of the upper-left 3x3 submatrix.
         */
        normalMatrix(): Matrix | null;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): number[];
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[Matrix]] from an object given by [[toJson]].
         * @param An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(obj: any): Matrix;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any): Matrix;
        /** @hidden */
        static toMatrix12(m: SC.Matrix16): SC.Matrix12;
        /**
         * Returns the matrix for a rotation around the X-axis, using the right-hand rule.
         * @param degrees The degrees of the rotation.
         * @returns The rotation matrix.
         */
        static xAxisRotation(degrees: Degrees): Matrix;
        /**
         * Returns the matrix for a rotation around the Y-axis, using the right-hand rule.
         * @param degrees The degrees of the rotation.
         * @returns The rotation matrix.
         */
        static yAxisRotation(degrees: Degrees): Matrix;
        /**
         * Returns the matrix for a rotation around the Z-axis, using the right-hand rule.
         * @param degrees The degrees of the rotation.
         * @returns The rotation matrix.
         */
        static zAxisRotation(degrees: Degrees): Matrix;
    }
}
declare namespace Communicator {
    /** @hidden */
    class Quaternion {
        x: number;
        y: number;
        z: number;
        w: number;
        constructor(x: number, y: number, z: number, w: number);
        set(x: number, y: number, z: number, w: number): void;
        assign(other: Quaternion): void;
        copy(): Quaternion;
        equals(q: Quaternion): boolean;
        equalsWithTolerance(other: Quaternion, tolerance: number): boolean;
        fromArray(arr: number[]): Quaternion;
        toArray(arr: number[]): Quaternion;
        negate(): Quaternion;
        magnitudeSquared(): number;
        magnitude(): number;
        normalize(): void;
        static add(q1: Quaternion, q2: Quaternion): Quaternion;
        static subtract(q1: Quaternion, q2: Quaternion): Quaternion;
        /** @deprecated use [[Quaternion.identity]] instead. */
        static Identity(): Quaternion;
        static identity(): Quaternion;
        static toMatrix(quaternion: Quaternion): Matrix;
        static createFromMatrix(matrix: Matrix): Quaternion;
        static interpolate(begin: Quaternion, end: Quaternion, t: number): Quaternion;
        private static readonly _epsilon;
        private static _arccos;
    }
}
declare namespace Communicator.Animation {
    enum InterpolationType {
        Constant = 0,
        Linear = 1,
        CubicSpline = 2
    }
    type KeyframeIndex = number;
    /** Describes how the keyframes in a buffer are sampled. */
    class Sampler {
        readonly buffer: KeyframeBuffer;
        interpolationType: InterpolationType;
        private static q0;
        private static q1;
        private static q2;
        private static q3;
        private static q4;
        private static q5;
        private static v0;
        private static v1;
        private static v2;
        private static v3;
        /**
         * Creates a new sampler for a [[KeyframeBuffer]]
         * @param buffer The buffer that will be sampled.
         * @param interpolationType The Type of interpolation that will be used
         */
        constructor(buffer: KeyframeBuffer, interpolationType: InterpolationType);
        /**
         * Returns the index of the next keyframe for a given frame T.
         * Note that this assumes that all keyframes in the buffer
         * are arranged in ascending order by frame time.
         */
        private _getNextKeyframeIndex;
        /** Computes an interpolated quaternion for the given frame. */
        interpolateQuat(t: number, out: Quaternion): void;
        /** Computes an interpolated Vector 3 value for the given frame. */
        interpolateVec3(t: number, out: Point3): void;
        /** Computes an interpolated scalar value for the given frame. */
        interpolateScalar(t: number): number;
        /** Performs linear interpolation of two scalar values beginning at indices k0 and k1. */
        private interpolateScalarLinear;
        /** Performs spherical linear interpolation on the quaternion values beginning at indices k0 and k1. */
        private interpolateQuatSlerp;
        private static _interpVec3;
        /** Performs linear interpolation on the Vector3 values at keyframes beginning at indices k0 and k1 */
        private interpolateVec3Linear;
        private _interpCubicSpline;
        /** Performs Cubic Spline Interpolation on two scalar values beginning at indices k0 and k1 */
        private interpolateScalarCubicSpline;
        /** Performs Cubic Spline Interpolation on the Vector3 values at keyframes beginning at indices k0 and k1 */
        interpolateVec3CubicSpline(k0: KeyframeIndex, k1: KeyframeIndex, t: number, out: Point3): void;
        /** Performs Cubic Spline Interpolation on the Quaternion values beginning at indices k0 and k1 */
        private interpolateQuatCubicSpline;
        private _setVecFromKeyframeIndex;
        private _setVecTanFromKeyframeIndex;
        private _setQuatFromKeyframeIndex;
        private _setQuatTanFromKeyframeIndex;
        /** @hidden */
        _gatherForExport(context: Internal.ExportContext): void;
        /** @hidden */
        _export(context: Internal.ExportContext): {
            buffer: number;
            interpolationType: "Constant" | "Linear" | "CubicSpline";
        };
        /** @hidden */
        static _import(context: Internal.ImportContext, data: ReturnType<Sampler["_export"]>): Sampler;
    }
}
declare namespace Communicator.Animation.Util {
    /**
     * Convenience method that sets up Animation channels, samplers, and keyframe buffers for the supplied camera.
     *
     * The created channel and buffer names will have the form: <namePrefix>-<Property> where type is the corresponding value of [[CameraProperty]]
     * @param animation Animation that will receive the new camera channels.  This animation should not contain any camera channels.
     * @param namePrefix Prefix to use for channel names.
     * @param interpolationType The type of interpolation that will be set on each sampler that is created.
     */
    function createCameraChannels(animation: Animation, namePrefix: string, interpolationType: InterpolationType): CameraChannel[];
    /**
     * Convenience method that will update keyframe buffers for animation channels created with [[createChannelsForCamera]].
     * @param t Animation time (in seconds) that will be used for the created keyframes
     * @param camera Camera containing the current values to keyframe.
     * @param animation An animation containing camera channels created using [[createChannelsForCamera]]
     */
    function keyframeCamera(t: number, camera: Camera, animation: Animation): void;
}
/** @hidden */
declare namespace Communicator.Animation.Internal {
    /**
     * Enumeration whose bits indicate which node properties are interpolated.
     * */
    enum NodeValuesFlags {
        None = 0,
        Transform = 1,
        Opacity = 2,
        Visibility = 4,
        Color = 8
    }
    /**
     * Structure which holds interpolated values for a node.
     * */
    class NodeValues {
        readonly nodeId: NodeId;
        readonly translate: Point3;
        readonly rotation: Quaternion;
        readonly scale: Point3;
        readonly color: Point3;
        pivotPoint: Point3 | null | undefined;
        opacity: number;
        visibility: number;
        matrix: Matrix;
        flags: NodeValuesFlags;
        constructor(nodeId: NodeId);
        updateMatrix(): void;
        private _updateMatrixWithOrigin;
        private _updateMatrix;
    }
}
declare namespace Communicator.Animation {
    /**
     * A structure that holds interpolated animation data for a camera. See
     * [[BatchedValues]].
     */
    class BatchedCameraValues {
        /** The camera's position, applied with [[Camera.setPosition]]. */
        position: Point3 | null;
        /** The camera's target, applied with [[Camera.setTarget]]. */
        target: Point3 | null;
        /** The camera's up vector, applied with [[Camera.setUp]]. */
        up: Point3 | null;
        /** The camera's field width, applied with [[Camera.setWidth]]. */
        width: number | null;
        /** The camera's field height, applied with [[Camera.setHeight]]. */
        height: number | null;
        /** Reset this object to its initial state. */
        clear(): void;
        /**
         * Set the stored values on the supplied [[Camera]].
         * @returns True if the camera was modified.
         */
        apply(camera: Camera): boolean;
    }
    /**
     * A structure that holds interpolated animation data for one or more nodes.
     * See [[BatchedValues]].
     */
    class BatchedNodeValues {
        /** Opacity values to be applied with [[Model.setNodesOpacities]]. */
        readonly opacities: Map<number, number>;
        /** Color values to be applied with [[Model.setNodesColors]]. */
        readonly colors: Map<number, Color>;
        /** [[NodeId]] values corresponding to the matrix values in [[matrices]]. */
        matrixNodeIds: NodeId[];
        /** Matrices to be set on the nodes specified in [[matrixNodeIds]]. */
        matrices: Matrix[];
        /** Nodes to be made visible. */
        visibilityOn: NodeId[];
        /** Nodes to be made invisible. */
        visibilityOff: NodeId[];
        /** Reset this object to its initial state. */
        clear(): void;
        /** Set the stored values on the supplied [[WebViewer]]. */
        apply(viewer: WebViewer): void;
    }
    /**
     * A structure that holds all interpolated data to be applied to the viewer
     * for one tick of the [[Animation.Manager]]. See [[Player.evaluate]].
     */
    class BatchedValues {
        /** Properties to be set on nodes. */
        node: BatchedNodeValues;
        /** Properties to be set on the camera. */
        camera: BatchedCameraValues;
        /** Reset this object to its initial state. */
        clear(): void;
        /** Set the stored values on the supplied [[WebViewer]]. */
        apply(viewer: WebViewer): void;
    }
}
declare namespace Communicator {
    enum BCFVersion {
        Unknown = 0,
        v1_0 = 1,
        v2_0 = 2,
        v2_1 = 3
    }
    enum BCFFileType {
        Unknown = 0,
        TopicFolder = 1,
        Version = 2,
        Markup = 3,
        Snapshot = 4,
        Viewpoint = 5,
        Schema = 6,
        Project = 7
    }
    /**
     * This class contains data corresponding to the BCF file format.
     */
    class BCFData {
        private readonly _bcfFileName;
        private readonly _id;
        private _version;
        private _topicsMap;
        constructor(bcfFileName: BCFName, id: number);
        /**
         * Exports BCF data to a file. Prompts the user to save it on their device.
         * @param filename Filename BCF data will be exported as
         */
        exportBCF(filename: BCFName): Promise<void>;
        /**
         * Creates a BCFZIP blob. The resulting blob is importable using `BcfManager.addBCFFromBuffer`.
         */
        toBcfZipBlob(): Promise<Blob>;
        /**
         * Adds a BCF topic.
         * @param topicId
         * @param topic
         */
        addTopic(topicId: BCFTopicId, topic: BCFTopic): void;
        /**
         * @returns A map associating BCF topic ids to BCF topic data.
         */
        getTopics(): Map<BCFTopicId, BCFTopic>;
        /**
         * Gets a BCF topic.
         * @param topicId
         */
        getTopic(topicId: BCFTopicId): BCFTopic | null;
        /**
         * Gets the BCF version.
         */
        getVersion(): BCFVersion;
        /**
         * Sets the BCF version.
         * @param version
         */
        setVersion(version: BCFVersion): void;
        /**
         * Gets the BCF filename.
         */
        getFilename(): BCFName;
        /**
         * Identifier used to keep track of loaded BCF data.
         */
        getId(): number;
    }
}
declare namespace Communicator {
    class BCFMarkupHeaderFile {
        private _ifcProject;
        private _ifcSpatialStructureElement;
        private _isExternal;
        private _filename;
        private _date;
        private _reference;
        constructor(ifcProject: GenericId | undefined, ifcSpatialStructureElement: GenericId | undefined, isExternal: boolean | undefined, filename: string | undefined, date: Date | undefined, reference: string | undefined);
        /**
         * [[GenericId]] Reference to the project to which this topic is related in the IFC file
         */
        getIfcProject(): GenericId | null;
        /**
         * [[GenericId]] Reference to the spatial structure element, e.g. IfcBuildingStorey, to which this topic is related.
         */
        getIfcSpacialStructureElement(): GenericId | null;
        /**
         * Is the IFC file external or within the bcfzip
         */
        getIsExternal(): boolean | null;
        /**
         * The BIM file related to this topic.
         */
        getBimFilename(): string | null;
        /**
         * Date of the BIM file.
         */
        getBimDate(): Date | null;
        /**
         * URI to IfcFile.
         * IsExternal=false "..\example.ifc" (within bcfzip)
         * IsExternal=true "https://.../example.ifc"
         */
        getReference(): string | null;
    }
    class BCFMarkupViewpoint {
        private readonly _guid;
        private readonly _viewpointFilename;
        private readonly _snapshotFilename;
        private readonly _index;
        constructor(guid: Uuid, viewpointFilename: string | undefined, snapshotFilename: string | undefined, index: string | undefined);
        getGuid(): Uuid;
        getViewpointFilename(): string | null;
        getSnapshotFilename(): string | null;
        getIndex(): number | null;
    }
    class BCFComment {
        private readonly _guid;
        private _date;
        private _author;
        private _text;
        private _viewpointGuid?;
        private _modifiedDate?;
        private _modifiedAuthor?;
        constructor(guid: BCFCommentId, date: Date, author: string, text: string, viewpointGuid?: string, modifiedDate?: Date, modifiedAuthor?: string);
        getId(): BCFCommentId;
        getDate(): Date;
        setDate(date: Date): void;
        getAuthor(): string;
        setAuthor(author: string): void;
        getText(): string;
        setText(text: string): void;
        getViewpointGuid(): Uuid | null;
        setViewpointGuid(id: Uuid | null): void;
        getModifiedDate(): Date | null;
        setModifiedDate(date: Date | null): void;
        getModifiedAuthor(): string | null;
        setModifiedAuthor(author: string | null): void;
    }
    class BCFMarkup {
        private readonly _bcfTopic;
        private readonly _filename;
        private _projectGuid;
        private _markupHeaderFiles;
        private _topic;
        private _comments;
        private _viewpoints;
        constructor(filename: string, document: Document | null, bcfTopic: BCFTopic);
        private _parseDocument;
        private _exportHeader;
        private _exportTopicData;
        private _exportBimSnippet;
        private _exportDocumentReference;
        private _exportRelatedTopic;
        private _exportTopic;
        private _exportComment;
        private _exportViewpoint;
        /**
         * @returns XML document containing the markup data.
         */
        export(): XMLDocument;
        /**
         * @deprecated Use [[getMarkupHeaderFiles]] instead.
         */
        getIfcProject(): GenericId | undefined;
        /**
         * @deprecated Use [[getMarkupHeaderFiles]] instead.
         */
        getIfcSpacialStructureElement(): GenericId | undefined;
        /**
         * @deprecated Use [[getMarkupHeaderFiles]] instead.
         */
        getIsExternal(): boolean | undefined;
        /**
         * @deprecated Use [[getMarkupHeaderFiles]] instead.
         */
        getBimFilename(): string | undefined;
        /**
         * @deprecated Use [[getMarkupHeaderFiles]] instead.
         */
        getBimDate(): Date | undefined;
        /**
         * @deprecated Use [[getMarkupHeaderFiles]] instead.
         */
        getReference(): string | undefined;
        /**
         * @returns the project GUID.
         */
        getProjectGuid(): Uuid | null;
        /**
         * @returns a list of [[BCFMarkupHeaderFile]] containing data related to IFC files.
         */
        getMarkupHeaderFiles(): BCFMarkupHeaderFile[];
        /**
         * Gets the Markup filename.
         */
        getFilename(): string;
        /**
         * Gets the topic id.
         */
        getTopicId(): Uuid;
        /**
         * Sets the topic id.
         * @param guid
         */
        setTopicId(guid: Uuid): void;
        /**
         * Gets the topic type.
         */
        getTopicType(): string | null;
        /**
         * Sets the topic type.
         * @param topicType
         */
        setTopicType(topicType: string | null): void;
        /**
         * Gets the topic status.
         */
        getTopicStatus(): string | null;
        /**
         * Sets the topic status.
         * @param topicStatus
         */
        setTopicStatus(topicStatus: string | null): void;
        /**
         * Gets the title of the markup topic.
         */
        getTopicTitle(): string;
        /**
         * Sets the title of the markup topic.
         * @param title
         */
        setTopicTitle(title: string): void;
        /**
         * Gets the creation date of the markup topic.
         */
        getTopicCreationDate(): Date;
        /**
         * Sets the creation date of the markup topic;
         * @param date
         */
        setTopicCreationDate(date: Date): void;
        /**
         * Gets the name of the user that created the markup topic.
         */
        getTopicCreationAuthor(): string;
        /**
         * Sets the name of the user that created the markup topic.
         * @param author
         */
        setTopicCreationAuthor(author: string): void;
        /**
         * List of references to the topic, for example, a work request management system or an URI to a model.
         */
        getTopicReferenceLink(): string | null;
        /**
         * Sets the ReferenceLink.
         * @param referenceLink
         */
        setTopicReferenceLink(referenceLink: string | null): void;
        /**
         * Gets the topic priority.
         */
        getTopicPriority(): string | null;
        /**
         * Sets the topic priority.
         * @param priority
         */
        setTopicPriority(priority: string | null): void;
        /**
         * Number to maintain the order of the topics.
         */
        getTopicIndex(): number | null;
        /**
         * Sets the topic index.
         * @param index
         */
        setTopicIndex(index: number | null): void;
        /**
         * Tags for grouping Topics.
         */
        getTopicLabels(): string[];
        /**
         * Sets the topic labels.
         * @param labels
         */
        setTopicLabels(labels: string[]): void;
        /**
         * Date when the topic was last modified. Exists only when Topic has been modified after creation.
         */
        getTopicModifiedDate(): Date | null;
        /**
         * Sets the topic modified date.
         * @param date
         */
        setTopicModifiedDate(date: Date | null): void;
        /**
         * User who modified the topic. Exists only when Topic has been modified after creation.
         */
        getTopicModifiedAuthor(): string | null;
        /**
         * Sets the author that last modified the topic.
         * @param modifiedAuthor
         */
        setTopicModifiedAuthor(modifiedAuthor: string | null): void;
        /**
         * Date when the issue needs to be resolved by.
         */
        getTopicDueDate(): Date | null;
        /**
         * Sets the topic due date.
         * @param date
         */
        setTopicDueDate(date: Date | null): void;
        /**
         * The user to whom this topic is assigned to. Recommended to be in email format. The list of possible values are defined in the extension schema.
         */
        getTopicAssignedTo(): string | null;
        /**
         * Sets the user that the topic is assigned to.
         */
        setTopicAssignedTo(assignedTo: string | null): void;
        /**
         * Description of the topic.
         */
        getTopicDescription(): string | null;
        /**
         * Sets the topic description;
         * @param description
         */
        setTopicDescription(description: string | null): void;
        /**
         * Stage this topic is part of.
         */
        getTopicStage(): string | null;
        /**
         * Sets the topic stage;
         * @param stage
         */
        setTopicState(stage: string | null): void;
        /**
         * Gets a map of GUIDs and corresponding comments.
         */
        getComments(): Map<Uuid, BCFComment>;
        /**
         * Adds a comment to the topic.
         * @param date
         * @param author
         * @param text
         * @param viewpointGuid
         * @param modifiedDate
         * @param modifiedAuthor
         */
        addComment(date: Date, author: string, text: string, viewpointGuid?: string, modifiedDate?: Date, modifiedAuthor?: string): BCFComment;
        /**
         * Updates a topic comment.
         * @param comment
         */
        updateComment(comment: BCFComment): void;
        /**
         * Deletes a comment from the topic..
         * @param guid
         */
        deleteComment(guid: Uuid): void;
        /**
         * Gets a map of GUIDs and corresponding viewpoints.
         */
        getViewpoints(): Map<Uuid, BCFMarkupViewpoint>;
        private _addFile;
        private _parseHeader;
        private _parseTopic;
        private _parseComment;
        private _parseViewpoint;
        addViewpoint(guid: Uuid, viewpointFilename?: string, snapshotFilename?: string, index?: string): void;
        private _getChildData;
        private _getElementAttributes;
    }
}
declare namespace Communicator {
    class BCFSnapshot {
        private readonly _filename;
        private readonly _data;
        constructor(filename: string, data: Uint8Array);
        /**
         * Creates a BCF Snapshot from an HTMLImageElement.
         * @param filename
         * @param image
         */
        static createFromImage(filename: string, image: HTMLImageElement): BCFSnapshot;
        /**
         * Gets the filename.
         */
        getFilename(): string;
        /**
         * Gets png data.
         */
        getData(): Uint8Array;
        /**
         * Gets a url for images corresponding to viewpoints.
         */
        getUrl(): string;
        /**
         * Gets image data as a Uint8Array from an HTMLImageElement.
         * @param img
         */
        static snapshotDataFromImage(img: HTMLImageElement): Uint8Array;
        private static _convertDataURIToBinary;
    }
}
declare namespace Communicator {
    /**
     * This class contains data corresponding to a BCF file topic.
     */
    class BCFTopic {
        private readonly _viewer;
        private readonly _topicId;
        private readonly _bcfDataId;
        private readonly _bcfFilename;
        private _markup;
        private _viewpointMap;
        private _snapshotMap;
        constructor(bcfDataId: number, bcfFilename: BCFName, topicId: BCFTopicId, viewer: WebViewer);
        /**
         * Takes a MarkupView and creates a BCF Topic from it.
         * @param bcfDataId
         * @param bcfFilename
         * @param viewer
         * @param markupView
         * @param topicTitle
         */
        static createTopic(viewer: WebViewer, bcfDataId: number, bcfFilename: BCFName, topicTitle: string, markupView?: Markup.MarkupView | null): Promise<BCFTopic>;
        /**
         * Gets the topic id corresponding to the BCF topic folder.
         */
        getTopicId(): BCFTopicId;
        /**
         * Adds a BCF markup.
         * @param markup BCF markup data.
         */
        addMarkup(filename: string, document: Document | null): BCFMarkup;
        /**
         * @returns BCF markup data.
         */
        getMarkup(): BCFMarkup;
        /**
         * Creates and adds BCF viewpoint.
         * @param fileName viewpoint filename.
         * @param viewpoint BCF viewpoint data.
         */
        addViewpoint(filename: string, document: Document | null, version: BCFVersion, modelBounding: Box, modelUnits: number): BCFViewpoint;
        /**
         * Adds a BCF Viewpoint. If there is a already a viewpoint with the same filename, it will be replaced.
         * @param filename
         * @param viewpoint
         */
        setViewpoint(filename: string, viewpoint: BCFViewpoint): void;
        /**
         * @returns A map associating viewpoint filenames with viewpoint data.
         */
        getViewpointMap(): Map<string, BCFViewpoint>;
        /**
         * Gets viewpoint data.
         * @param filename viewpoint filename.
         */
        getViewpoint(filename: string): BCFViewpoint | null;
        /**
         * Creates and adds a Snapshot.
         * @param fileName Snapshot filename.
         * @param png Image data.
         */
        addSnapshot(filename: string, png: Uint8Array): void;
        /**
         * Adds a BCF Snapshot. If there is already a snapshot with the smae filename, it will be replaced.
         * @param filename
         * @param snapshot
         */
        setSnapshot(filename: string, snapshot: BCFSnapshot): void;
        /**
         * @returns A map associating snapshot filenames with snapshot data.
         */
        getSnapshotMap(): Map<string, BCFSnapshot>;
        /**
         * Gets snapshot data.
         * @param filename snapshot or corresponding viewpoint filename
         */
        getSnapshot(filename: string): BCFSnapshot | null;
        private _massageSnapshotFilename;
    }
}
declare namespace Communicator {
    class BCFViewpoint {
        private readonly _viewer;
        private readonly _filename;
        private readonly _version;
        private readonly _modelBounding;
        private readonly _unitScale;
        private _viewpointGuid;
        private _components;
        private _orthogonalCamera;
        private _perspectiveCamera;
        private _lines;
        private _clippingPlanes;
        constructor(filename: string, document: Document | null, version: BCFVersion, modelBounding: Box, modelUnits: number, viewer: WebViewer);
        static createViewpoint(viewer: WebViewer, viewpointFilename: string, markupView?: Markup.MarkupView | null): Promise<BCFViewpoint>;
        private static _markupRedlineToBcf;
        private _parseDocument;
        private _exportComponents;
        private _exportOrthogonalCamera;
        private _exportPerspectiveCamera;
        private _exportLines;
        private _exportClippingPlanes;
        /**
         * @returns XML document containing the viewpoint data.
         */
        export(): XMLDocument;
        /**
         * Activates viewpoint.
         * Sets the camera, visibility, cutting planes, colors, and markup.
         */
        activate(): Promise<void>;
        private _activateCamera;
        private _activateComponentsVisibility;
        private _activateMarkup;
        private _activateCuttingPlanes;
        private _activateSelected;
        private _activateColors;
        /**
         * Gets the viewpoint filename.
         */
        getFilename(): string;
        /**
         * Gets the GUID associated with the viewpoint.
         */
        getViewpointGuid(): string | null;
        private _fromBCFPerspectiveCamera;
        private _fromBCFOrthogonalCamera;
        /**
         * Gets the viewpoint camera, or null if none is set.
         */
        getCamera(): Camera | null;
        /**
         * Sets the viewpoint camera.
         * @param camera
         */
        setCamera(camera: Camera): void;
        private _toBCFOrthogonalCamera;
        private _toBCFPerspectiveCamera;
        /**
         * Sets the default visibility.
         * If true, visibility exceptions are hidden.
         * If false, visibility exceptions are shown.
         * @param defaultVisibility
         */
        setDefaultVisibility(defaultVisibility: boolean): void;
        private _getDefaultVisibility;
        /**
         * Sets the visibility exceptions. These nodes will be shown or hidden based on the default visibility setting.
         * @param visibilityExceptions Array of GenericIds corresponding to components.
         */
        setVisibilityExceptions(visibilityExceptions: GenericId[]): void;
        /**
         * Gets the visibility exceptions.
         * @returns Array of GenericIds corresponding to components.
         */
        getVisibilityExceptions(): GenericId[];
        /**
         * Sets the colors.
         * @param colorGenericIdMap Map correlating color to GenericIds.
         */
        setColors(colorGenericIdMap: Map<Color, Set<GenericId>>): void;
        /**
         * @returns Map correlating color to components.
         */
        getColors(): Map<Color, Set<GenericId>>;
        /**
         * Sets the markup lines.
         * @param lines array of start point and end point line pairs.
         */
        setLines(lines: [Point3, Point3][]): void;
        /**
         * Gets markup lines.
         * @returns Array containing start point and end point line pairs.
         */
        getLines(): [Point3, Point3][];
        /**
         * Sets the clipping planes.
         * @param planes array containing position and direction pairs.
         */
        setClippingPlanes(planes: [Point3, Point3][]): void;
        /**
         * Gets the clipping planes.
         * @returns Array containing position and direction pairs.
         */
        getClippingPlanes(): [Point3, Point3][];
        /**
         * Sets a list of items to be added to the selection set.
         *
         */
        setSelection(selection: GenericId[]): void;
        /**
         * Gets a list of items that are in the selection set.
         */
        getSelection(): GenericId[];
        private _getGenericIdsFromComponents;
        private _parseComponentsV2_0;
        private _parseComponents;
        private _getCameraData;
        private _parseOrthogonalCamera;
        private _parsePerspectiveCamera;
        private _parseLines;
        private _parseClippingPlanes;
        private _getClippingPlane;
        private _getLine;
        private _getPoint;
        private _colorFromArgb;
        private _getColoring;
        private _getComponents;
    }
}
declare namespace Communicator {
    /**
     * An object representing an RGB Color. Values are specified in the 0-255 range.
     */
    class Color {
        r: number;
        g: number;
        b: number;
        /**
         * Creates a new color object. Values are specified in the 0-255 range.
         * @param r red color component
         * @param g green color component
         * @param b blue color component
         */
        constructor(r: number, g: number, b: number);
        /**
         * Sets this color equal to another color
         * @param color the point whose values will be used to set this color
         * @returns the color object
         */
        assign(color: Color): Color;
        /**
         * Creates a copy of this color
         * @returns Copy of this color
         */
        copy(): Color;
        /**
         * Compares this color with another color
         * @param color the color to compare with
         * @returns True if the values of this color equal the other. False otherwise.
         */
        equals(color: Color): boolean;
        /**
         * Sets the color object. Values are specified in the 0-255 range.
         * @param r red color component
         * @param g green color component
         * @param b blue color component
         */
        set(r: number, g: number, b: number): void;
        /**
         * Sets the color object from floating point values. Values are specified in the 0.0-1.0 range.
         * @param r red color component
         * @param g green color component
         * @param b blue color component
         */
        setFromFloat(r: number, g: number, b: number): void;
        /**
         * Sets this color from an array of normalized floating point values
         * @param the array to assign from
         */
        fromFloatArray(arr: number[]): void;
        /**
         * Gets an array of floating point values representing this color. Values are clamped in the 0.0 - 1.0 range.
         * @returns array of floating point values for this color.
         */
        getFloatArray(): [number, number, number];
        /**
         * Populates an array with floating point values for this color. Values are clamped in the 0.0 - 1.0 range.
         * @param arr array whose first three elements will be populated with the r,g, and b values of this color respectively.
         */
        toFloatArray(arr: number[]): void;
        /**
         * Creates a new [[Color]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any): Color;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a color object from floating point values. Values are specified in the 0.0-1.0 range.
         * @param r red color component
         * @param g green color component
         * @param b blue color component
         * @returns new color object
         */
        static createFromFloat(r: number, g: number, b: number): Color;
        /**
         * Creates a color object from an array of floating point values.
         * Values are specified in the 0.0-1.0 range.
         */
        static createFromFloatArray(values: number[]): Color;
        /**
         * Creates a new color object initialized to red.
         * @returns new color object
         */
        static red(): Color;
        /**
         * Creates a new color object initialized to green.
         * @returns new color object
         */
        static green(): Color;
        /**
         * Creates a new color object initialized to blue.
         * @returns new color object
         */
        static blue(): Color;
        /**
         * Creates a new color object initialized to yellow.
         * @returns new color object
         */
        static yellow(): Color;
        /**
         * Creates a new color object initialized to white.
         * @returns new color object
         */
        static white(): Color;
        /**
         * Creates a new color object initialized to black.
         * @returns new color object
         */
        static black(): Color;
    }
    class VerticalGradient {
        top: Color | null;
        bottom: Color | null;
        constructor(top: Color | null, bottom: Color | null);
    }
}
declare namespace Communicator.Internal {
    const enum ViewModeEyeBits {
        X = 2,
        Y = 4,
        Z = 8
    }
    const enum ViewModeUpBits {
        X = 16,
        Y = 32,
        Z = 64
    }
    const enum ViewMode {
        None = 0,
        EyeX_UpY = 34,
        EyeX_UpZ = 66,
        EyeY_UpX = 20,
        EyeY_UpZ = 68,
        EyeZ_UpX = 24,
        EyeZ_UpY = 40
    }
    const enum AxisConstants {
        StemHeight = 2,
        CapHeight = 0.5,
        TaperHeight = 0.1,
        SegmentCount = 20,
        CylinderRadius = 0.2,
        ConeBaseRadius = 0.4,
        LetterOffsetPos = 0.6,
        LetterWidth = 0.3,
        LetterHeight = 0.5
    }
}
declare namespace Communicator {
    /**
     * This class provides an interface to the axis triad which is enabled by default.
     * The default functionality orients the camera based on the axis that is clicked.
     * This triad is initialized and associated with an overlay when the viewer is created.
     * For additional information on overlays please refer to the [[OverlayManager]].
     *
     * More information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/scene_attributes/axis-triad-and-navcube.html).
     */
    class AxisTriad {
        private readonly _viewer;
        private _position;
        private _viewportSize;
        private _anchor;
        private readonly _instanceKeys;
        private _enabled;
        private readonly _sceneReadyCompleted;
        private _geometryCreated;
        private static readonly _xRotMatrix;
        private static readonly _yRotMatrix;
        private static readonly _zRotMatrix;
        private static readonly _xColor;
        private static readonly _yColor;
        private static readonly _zColor;
        private static readonly _fieldSize;
        /** @hidden */
        constructor(viewer: WebViewer);
        /**
         * Sets the color of one axis on this [[AxisTriad]]
         * @param axis The axis that will change color
         * @param color The color to set
         */
        setAxisColor(axis: Axis, color: Color): Promise<void>;
        /**
         * Sets the anchor position for this [[AxisTriad]].
         * @param anchor The anchor position.
         * @returns A promise that resolves on completion.
         */
        setAnchor(anchor: OverlayAnchor): Promise<void>;
        /**
         * Gets the anchor position for this [[AxisTriad]].
         * Default position is in the lower left corner.
         * @returns The overlay anchor value of the triad.
         */
        getAnchor(): OverlayAnchor;
        /**
         * Enables this [[AxisTriad]].
         * @returns A promise that resolves on completion.
         */
        enable(): DeprecatedPromise;
        /**
         * Disables this [[AxisTriad]].
         * @returns A promise that resolves on completion.
         */
        disable(): DeprecatedPromise;
        /**
         * Updates the visibility of this [[AxisTriad]] based on the enabled status.
         * @returns A promise that resolves on completion.
         */
        private _updateVisibility;
        /**
         * Hides the overlay window.
         * @returns A promise that resolves on completion.
         */
        private _hideOverlay;
        /**
         * Shows the overlay window.
         * @returns A promise that resolves on completion.
         */
        private _showOverlay;
        /**
         * Gets the current state of this [[AxisTriad]].
         * @returns `true` if enabled and `false` otherwise.
         */
        getEnabled(): boolean;
        /**
         * Gets the overlay id. This id should be considered reserved and not be used by client applications.
         * @returns The overlay id used by this [[AxisTriad]].
         */
        getOverlayId(): OverlayIndex;
        private _updateViewport;
        private _createViewport;
        private _onViewportSet;
        private _createGeometry;
        private _createGeomCallbacks;
        /** @hidden */
        _geometryHasBeenCreated(): boolean;
        /**
         * Determines whether or not a point is inside the axis triad overlay
         * @param mousePos
         * @returns Boolean indicating whether the provided point is inside the axis triad overlay
         */
        insideOverlay(mousePos: Point2): boolean;
        /** @hidden */
        _getOverlayOffset(): Point2;
        /** @hidden */
        _getViewportSize(): OverlayUnitPoint;
        /** @hidden */
        _getViewportPixelSize(): Point2;
        /**
         * Checks if a selection is part of the axis triad, and return the corresponding axis.
         * @param selectionItem selection item to check.
         * @returns Axis if selected, null otherwise.
         */
        getSelectionAxis(selectionItem: Selection.SelectionItem | null): Axis | null;
        /**
         * Called when the axis triad is clicked. Realigns the view along the axis selected by `selection`
         * or does nothing if no axis is selected.
         * @param selection
         */
        onClickSelection(selection: Selection.SelectionItem | null): Promise<void>;
        private _getScEngine;
        private _createInstance;
        private _createAxis;
        private _createAxisLabel;
        private _onCameraUpdate;
        private _alignedFitBounding;
    }
}
declare namespace Communicator {
    type BCFName = string;
    type BCFViewpointName = string;
    type BCFMarkupName = string;
    type BCFTopicId = Uuid;
    type BCFCommentId = Uuid;
    /**
     * This class provides an interface to the BIM Collaboration Format related features of the viewer.
     */
    class BCFManager {
        private readonly _viewer;
        private _id;
        private _bcfMap;
        constructor(viewer: WebViewer);
        private _getId;
        /**
         * Gets a map containing BCF data correlated with the BCF filename.
         */
        getBCFMap(): Map<number, BCFData>;
        /**
         * Gets the parsed BCF data for a BCF file.
         * @param id corresponding to the BCF file.
         */
        getBCFData(id: number): BCFData | null;
        /**
         * Removes the parsed BCF data for a BCF file.
         * @param id corresponding to the BCF file.
         */
        removeBCFData(id: number): void;
        /**
         * Creates a BCF file.
         * @param filename
         */
        createBCFData(filename: BCFName): BCFData;
        /**
         * Imports BCF data from a BCF file.
         * @param filename
         */
        addBCFFromFile(filename: BCFName): Promise<void>;
        /**
         * Imports BCF data from a buffer.
         * @param buffer
         * @param filename
         */
        addBCFFromBuffer(buffer: ArrayBuffer, filename: BCFName): Promise<void>;
        private _getVersion;
        private _loadBCFData;
        private _getDocument;
        private _getFileType;
    }
}
declare namespace Communicator {
    /**
     * Represents an axis-aligned bounding box.
     * A box is represented by a minimum and maximum point which describe the extents of the box.
     */
    class Box {
        /**
         * The point of minimum extent for the box.
         */
        min: Point3;
        /**
         * The point of maximum extent for the box.
         */
        max: Point3;
        /**
         * Creates a new box.
         * @param min The minimum extent of the box. Defaults to the origin.
         * @param max The maximum extent of the box. Defaults to the origin.
         */
        constructor(min?: Point3, max?: Point3);
        /**
         * Creates a copy of the box.
         * @returns A copy of this box.
         */
        copy(): Box;
        /**
         * Strictly compares this box with another box.
         * @param box Box to compare with.
         * @returns True if the values of this box equals the other. False otherwise.
         */
        equals(box: Box): boolean;
        /**
         * Gets the center point for the box.
         * @returns The center point of this box.
         */
        center(): Point3;
        /**
         * Gets the extents of the box.
         * @returns A point with members set to extent values for each corresponding axis.
         */
        extents(): Point3;
        /**
         * Expands the extents of the box so that it will contain another box.
         * @param box The box to add.
         */
        addBox(box: Box): void;
        /**
         * Expands the extents of the box so that it will contain a particular point.
         * @param point The point to add.
         */
        addPoint(point: Point3): void;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[Box]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any): Box;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any): Box;
        /**
         * Gets all eight corner points for the box.
         * @returns The corner points of this box.
         */
        getCorners(): Point3[];
        /**
         * Creates and returns an invalid bounding box.
         * @returns an invalid bounding box.
         */
        static invalid(): Box;
        /**
         * Returns whether or not the box is degenerate.
         * @returns whether or not the box is degenerate.
         */
        isDegenerate(): boolean;
    }
}
declare namespace Communicator.Internal {
    class CallbackManager {
        private readonly _aliasMap;
        private readonly _callbackMap;
        private _activeTriggerDepth;
        private readonly _pendingClearUnboundFilteredNames;
        constructor();
        private _triggerDeprecatedSelectionCallback;
        private _filterName;
        bind(callbackMap: CallbackMap, highPriority?: boolean): void;
        unbind(callbackMap: CallbackMap): void;
        private _clearUnboundCallbacks;
        promiseTrigger(name: "_assemblyTreeReady", delegate: "assemblyTreeReady"): Promise<void>;
        promiseTrigger(name: "_firstAttachment", delegate: null, attachType: AttachType): Promise<void>;
        promiseTrigger(name: "_firstBoundingReady", delegate: null): Promise<void>;
        promiseTrigger(name: "_firstModelLoaded", delegate: "firstModelLoaded", modelRootIds: NodeId[], isHwf: boolean, attachType: AttachType): Promise<void>;
        promiseTrigger(name: "_modelStructureHeaderParsed", delegate: null, header: Tree.AssemblyDataHeader): Promise<void>;
        promiseTrigger(name: "_modelStructureReady", delegate: "modelStructureReady"): Promise<void>;
        promiseTrigger(name: "_modelSwitched", delegate: "modelSwitched", clearOnly: boolean, newRoots: NodeId[], attachType: AttachType): Promise<void>;
        promiseTrigger(name: "_resetAssemblyTreeBegin", delegate: null): Promise<void>;
        promiseTrigger(name: "_resetDrawing", delegate: null): Promise<void>;
        promiseTrigger(name: "_sessionStarted", delegate: null): Promise<void>;
        promiseTrigger(name: "_subtreeLoaded", delegate: "subtreeLoaded", loadedRootIds: NodeId[], source: NodeSource): Promise<void>;
        private _unsafePromiseTrigger;
        trigger(name: "_announceModel", attachScope: SC.AttachScope, masterModelKey: SC.MasterModelKey): void;
        trigger(name: "_attached", attachScope: SC.AttachScope): void;
        trigger(name: "_attachmentPopulated", rootIds: NodeId[]): void;
        trigger(name: "_drawComplete"): void;
        trigger(name: "_firstInstance"): void;
        trigger(name: "_geometryCreated", inc: SC.InstanceInc): void;
        trigger(name: "_inclusion", attachScope: SC.AttachScope, inclusionKey: SC.InclusionKey, modelKey: SC.ModelKey): void;
        trigger(name: "_inputInteraction", event: Event.InputEvent, eventType: EventType): void;
        trigger(name: "_metaData", modelKey: SC.ModelKey, dataKey: SC.DataKey, data: Uint8Array): void;
        trigger(name: "_missingModel", attachScope: SC.AttachScope, modelPath: string): void;
        trigger(name: "_priorityMetaDataSent", attachScope: SC.AttachScope, prototypeInstanceCount: number): void;
        trigger(name: "_remapInclusion", attachScope: SC.AttachScope, effectiveModelKey: SC.ModelKey, effectiveInclusionKey: SC.InclusionKey, originalInclusionKey: SC.InclusionKey): void;
        trigger(name: "_remapModel", attachScope: SC.AttachScope, effectiveModelKey: SC.ModelKey, originalModelKey: SC.ModelKey): void;
        trigger(name: "_fetchBegin", url: string, attachScope: SC.AttachScope): void;
        trigger(name: "_fetchEnd", url: string, attachScope: SC.AttachScope): void;
        trigger(name: "_resetOpacity"): void;
        trigger(name: "_rootModelKey", modelKey: SC.ModelKey): void;
        trigger(name: "_shutdownBegin"): void;
        trigger(name: "_test"): void;
        trigger(name: "_timeout"): void;
        trigger(name: "_updateTransform", isFullyOutOfHierarchy: boolean): void;
        trigger(name: "addCuttingSection", cuttingSection: CuttingSection): void;
        trigger(name: "bcfLoaded", id: number, filename: BCFName): void;
        trigger(name: "bcfRemoved", id: number): void;
        trigger(name: "beginInteraction"): void;
        trigger(name: "cadViewCreated", cadViewId: CadViewId, cadViewName: string): void;
        trigger(name: "camera", camera: Camera): void;
        trigger(name: "cappingIdle", isIdle: boolean, cappedInstanceCount: number): void;
        trigger(name: "configurationActivated", id: NodeId): void;
        trigger(name: "contextMenu", position: Point2, modifiers: KeyModifiers): void;
        trigger(name: "cuttingPlaneDragStart", cuttingSection: CuttingSection, planeIndex: number): void;
        trigger(name: "cuttingPlaneDrag", cuttingSection: CuttingSection, planeIndex: number): void;
        trigger(name: "cuttingPlaneDragEnd", cuttingSection: CuttingSection, planeIndex: number): void;
        trigger(name: "cuttingSectionsLoaded"): void;
        trigger(name: "deprecated", className: "CuttingSection", deprecatedFunctionName: keyof CuttingSection): void;
        trigger(name: "deprecated", className: "MarkupManager", deprecatedFunctionName: keyof MarkupManager): void;
        trigger(name: "deprecated", className: "Model", deprecatedFunctionName: keyof Model): void;
        trigger(name: "deprecated", className: "SelectionManager", deprecatedFunctionName: keyof SelectionManager): void;
        trigger(name: "deprecated", className: "View", deprecatedFunctionName: keyof View): void;
        trigger(name: "deprecated", className: "WebViewer", deprecatedFunctionName: keyof WebViewer): void;
        trigger(name: "endInteraction"): void;
        trigger(name: "explode", magnitude: number): void;
        trigger(name: "frameDrawn", camera: Camera, visiblePoints: number[]): void;
        trigger(name: "handleEvent", eventType: HandleEventType, nodeIds: NodeId[], initialMatrices: Matrix[], newMatrices: Matrix[]): void;
        trigger(name: "handleEventEnd", eventType: HandleEventType, nodeIds: NodeId[], initialMatrices: Matrix[], newMatrices: Matrix[]): void;
        trigger(name: "handleEventStart", eventType: HandleEventType, nodeIds: NodeId[], initialMatrices: Matrix[]): void;
        trigger(name: "hwfParseComplete"): void;
        trigger(name: "incrementalSelectionBatchBegin"): void;
        trigger(name: "incrementalSelectionBatchEnd"): void;
        trigger(name: "incrementalSelectionEnd"): void;
        trigger(name: "info", infoType: InfoType, message: string): void;
        trigger(name: "lineCreated", line: Markup.Line.LineMarkup): void;
        trigger(name: "lineDeleted", line: Markup.Line.LineMarkup): void;
        trigger(name: "lineLoaded", line: Markup.Line.LineMarkup): void;
        trigger(name: "measurement", measurement: Markup.Measure.MeasureMarkup): void;
        trigger(name: "measurementBegin"): void;
        trigger(name: "measurementCreated", measurement: Markup.Measure.MeasureMarkup): void;
        trigger(name: "measurementDeleted", measurement: Markup.Measure.MeasureMarkup): void;
        trigger(name: "measurementHidden", measurement: Markup.Measure.MeasureMarkup): void;
        trigger(name: "measurementLoaded", measurement: Markup.Measure.MeasureMarkup): void;
        trigger(name: "measurementShown", measurement: Markup.Measure.MeasureMarkup): void;
        trigger(name: "measurementValueSet", measurement: Markup.Measure.MeasureMarkup): void;
        trigger(name: "missingModel", modelPath: string): void;
        trigger(name: "modelLoadBegin"): void;
        trigger(name: "modelLoaded", loadedRootIds: NodeId[], source: NodeSource): void;
        trigger(name: "modelLoadFailure", modelName: ScModelName, reason: string, exception?: any): void;
        trigger(name: "modelStructureHeaderParsed", filename: string, fileType: FileType): void;
        trigger(name: "modelStructureLoadBegin"): void;
        trigger(name: "modelStructureLoadEnd"): void;
        trigger(name: "modelStructureParseBegin"): void;
        trigger(name: "modelSwitched", clearOnly: boolean, newRoots: NodeId[]): void;
        trigger(name: "modelSwitchStart", clearOnly: boolean): void;
        trigger(name: "noteTextCreated", noteText: Markup.Note.NoteText): void;
        trigger(name: "noteTextHidden", noteText: Markup.Note.NoteText): void;
        trigger(name: "noteTextShown", noteText: Markup.Note.NoteText): void;
        trigger(name: "overlayViewportSet", overlayIndex: OverlayIndex): void;
        trigger(name: "redlineCreated", redlineMarkup: Markup.Redline.RedlineItem): void;
        trigger(name: "redlineDeleted", redlineMarkup: Markup.Redline.RedlineItem): void;
        trigger(name: "redlineUpdated", redlineMarkup: Markup.Redline.RedlineItem): void;
        trigger(name: "removeCuttingSection"): void;
        trigger(name: "sceneReady"): void;
        trigger(name: "selectionArray", events: Event.NodeSelectionEvent[], removed: boolean): void;
        trigger(name: "shatteredXmlStructureReady", nodeId: NodeId): void;
        trigger(name: "sheetActivated", id: SheetId): void;
        trigger(name: "sheetDeactivated"): void;
        trigger(name: "streamingActivated"): void;
        trigger(name: "streamingDeactivated"): void;
        trigger(name: "subtreeDeleted", loadedRootIds: NodeId[]): void;
        trigger(name: "timeout"): void;
        trigger(name: "timeoutWarning", warningTime: number): void;
        trigger(name: "transitionBegin", duration: number): void;
        trigger(name: "transitionEnd"): void;
        trigger(name: "viewAxes", frontVector: Point3, upVector: Point3): void;
        trigger(name: "viewCreated", view: Markup.MarkupView): void;
        trigger(name: "viewDeactivated", view: Markup.MarkupView): void;
        trigger(name: "viewDeleted", view: Markup.MarkupView): void;
        trigger(name: "viewLoaded", view: Markup.MarkupView): void;
        trigger(name: "viewOrientation", orientation: ViewOrientation): void;
        trigger(name: "visibilityChanged", shownBodyIds: BodyId[], hiddenBodyIds: BodyId[]): void;
        trigger(name: "walkOperatorActivated"): void;
        trigger(name: "webGlContextLost"): void;
        trigger(name: "websocketConnectionClosed"): void;
        trigger(name: "XHRonerror", event: ErrorEvent): void;
        trigger(name: "XHRonloadend", event: ProgressEvent, status: number, uri: string): void;
        trigger(name: "XHRonprogress", event: ProgressEvent): void;
        unsafeTrigger(eventName: keyof CallbackMap, args?: any[]): void;
    }
}
declare namespace Communicator {
    /** Object which maps callback names to functions. Used by [[WebViewer.setCallbacks]]. */
    interface CallbackMap {
        /** @hidden */
        _assemblyTreeReady?: () => Promise<void>;
        /** @hidden */
        _firstAttachment?: (attachType: Internal.AttachType) => Promise<void>;
        /** @hidden */
        _firstBoundingReady?: () => Promise<void>;
        /** @hidden */
        _firstModelLoaded?: (modelRootIds: NodeId[], isHwf: boolean, attachType: Internal.AttachType) => Promise<void>;
        /** @hidden */
        _missingModel?: (attachScope: SC.AttachScope, modelPath: string) => void;
        /** @hidden */
        _modelStructureHeaderParsed?: (header: Internal.Tree.AssemblyDataHeader) => Promise<void>;
        /** @hidden */
        _modelStructureReady?: () => Promise<void>;
        /** @hidden */
        _modelSwitched?: (clearOnly: boolean, modelRootIds: NodeId[], attachType: Internal.AttachType) => Promise<void>;
        /** @hidden */
        _resetAssemblyTreeBegin?: () => Promise<void>;
        /** @hidden */
        _resetDrawing?: () => Promise<void>;
        /** @hidden */
        _sessionStarted?: () => Promise<void>;
        /** @hidden */
        _subtreeLoaded?: (subtreeRootIds: NodeId[], source: NodeSource) => Promise<void>;
        /** @hidden */
        _announceModel?: (attachScope: SC.AttachScope, masterModelKey: SC.MasterModelKey) => void;
        /** @hidden */
        _attached?: (attachScope: SC.AttachScope) => void;
        /** @hidden */
        _attachmentPopulated?: (attachmentRootIds: NodeId[]) => void;
        /** @hidden */
        _drawComplete?: () => void;
        /** @hidden */
        _firstInstance?: () => void;
        /** @hidden */
        _geometryCreated?: (inc: SC.InstanceInc) => void;
        /** @hidden */
        _inclusion?: (attachScope: SC.AttachScope, inclusionKey: SC.InclusionKey, modelKey: SC.ModelKey) => void;
        /** @hidden */
        _inputInteraction?: (event: Event.InputEvent, eventType: EventType) => void;
        /** @hidden */
        _metaData?: (modelKey: SC.ModelKey, dataKey: SC.DataKey, data: Uint8Array) => void;
        /** @hidden */
        _priorityMetaDataSent?: (attachScope: SC.AttachScope, prototypeInstanceCount: number) => void;
        /** @hidden */
        _remapInclusion?: (attachScope: SC.AttachScope, effectiveModelKey: SC.ModelKey, effectiveInclusionKey: SC.InclusionKey, originalInclusionKey: SC.InclusionKey) => void;
        /** @hidden */
        _remapModel?: (attachScope: SC.AttachScope, effectiveModelKey: SC.ModelKey, originalModelKey: SC.ModelKey) => void;
        /** @hidden */
        _fetchBegin?: (url: string, attachScope: SC.AttachScope) => void;
        /** @hidden */
        _fetchEnd?: (url: string, attachScope: SC.AttachScope) => void;
        /** @hidden */
        _resetOpacity?: () => void;
        /** @hidden */
        _rootModelKey?: (modelKey: SC.ModelKey) => void;
        /** @hidden */
        _shutdownBegin?: () => void;
        /** @hidden */
        _test?: () => void;
        /** @hidden */
        _timeout?: () => void;
        /** @hidden */
        _updateTransform?: (isFullyOutOfHierarchy: boolean) => void;
        /**
         * Triggered when a cutting section is added to the scene.
         *
         * @param cuttingSection The cutting section added.
         */
        addCuttingSection?: (cuttingSection: CuttingSection) => void;
        /**
         * Triggered when methods on the [[Model]] class are allowed to be called.
         */
        assemblyTreeReady?: () => void;
        /**
         * Triggered after a BCF file has been loaded.
         * @param id index associated with the bcf file.
         * @param filename associated with the bcf file.
         */
        bcfLoaded?: (id: number, filename: BCFName) => void;
        /**
         * Triggered after a BCF file has been removed.
         */
        bcfRemoved?: (id: number) => void;
        /**
         * Triggered on the start of a mouse drag from any of the built-in Communicator operators.
         */
        beginInteraction?: () => void;
        /**
         * Triggered when a CAD View is created.
         *
         * @param cadViewId The [[CadViewId]] of the CAD View.
         * @param cadViewName The name of the CAD View.
         */
        cadViewCreated?: (cadViewId: CadViewId, cadViewName: string) => void;
        /**
         * Triggered when the camera changes.
         *
         * @param camera The changed camera.
         */
        camera?: (camera: Camera) => void;
        /**
         * Triggered when capping geometry generation becomes idle or active.
         *
         * @param isIdle `true` if becoming idle. `false` if becoming active.
         * @param cappedInstanceCount The number of geometry instances with capped faces.
         */
        cappingIdle?: (isIdle: boolean, cappedInstanceCount: number) => void;
        /**
         * Triggered when a Configuration is activated.
         *
         * @param nodeId The [[NodeId]] of the activated Configuration.
         */
        configurationActivated?: (nodeId: NodeId) => void;
        /**
         * Triggered when `Ui.Context.ContextMenu` menu is shown or hidden.
         *
         * By default, this function is called on right mouse-click events.
         *
         * @param position The window position of the mouse at the time of trigger.
         * @param modifiers The active key modifiers at the time of trigger.
         */
        contextMenu?: (position: Point2, modifiers: KeyModifiers) => void;
        /**
         * Triggered when a cutting plane drag event starts.
         *
         * @param cuttingSection The cutting section containing the cutting plane.
         * @param planeIndex The index of the cutting plane in the cutting section.
         */
        cuttingPlaneDragStart?: (cuttingSection: CuttingSection, planeIndex: number) => void;
        /**
         * Triggered when a cutting plane is dragged.
         *
         * @param cuttingSection The cutting section containing the cutting plane.
         * @param planeIndex The index of the cutting plane in the cutting section.
         */
        cuttingPlaneDrag?: (cuttingSection: CuttingSection, planeIndex: number) => void;
        /**
         * Triggered when a cutting plane drag event stops.
         *
         * @param cuttingSection The cutting section containing the cutting plane.
         * @param planeIndex The index of the cutting plane in the cutting section.
         */
        cuttingPlaneDragEnd?: (cuttingSection: CuttingSection, planeIndex: number) => void;
        /**
         * Triggered after a batch update to cutting sections, such as when
         * deserializing from JSON data.
         *
         * This event may be triggered manually after modifying cutting sections
         * to cause the UI state to be updated.
         */
        cuttingSectionsLoaded?: () => void;
        /**
         * Triggered when a function marked (@deprecated) is called.
         *
         * @param classNameOfDeprecatedFunction The name of the class owning the deprecated function.
         * @param deprecatedFunctionName The name of the called deprecated function.
         */
        deprecated?: (classNameOfDeprecatedFunction: string, deprecatedFunctionName: string) => void;
        /**
         * Triggered at the end of a mouse drag from any of the built-in Communicator operators
         * or if [[Operator.stopInteraction]] gets called for a given operator.
         */
        endInteraction?: () => void;
        /**
         * Triggered when the expode magnitude of [[ExplodeManager]] changes.
         * @param magnitude The new explosion magnitude.
         */
        explode?: (magnitude: number) => void;
        /**
         * Triggered when the first model of a scene gets loaded.
         *
         * Clearing or switching models allows this to be triggered again.
         *
         * @param modelRootIds The root node IDs of the loaded model.
         * @param isHwf True if the model is an HWF model, false otherwise.
         */
        firstModelLoaded?: (modelRootIds: NodeId[], isHwf: boolean) => void;
        /**
         * Triggered when a frame has been drawn.
         *
         * @param camera The camera used when the frame was drawn.
         * @param visiblePoints A list of indices of points passed to [[View.setPointVisibilityTest]].
         */
        frameDrawn?: (camera: Camera, visiblePoints: number[]) => void;
        /**
         * Triggered when a geometry handle is selected.
         *
         * @param eventType The type of the handle event.
         * @param nodeIds The node IDs bound to the handle.
         * @param initialMatrices The initial matrices for each of the supplied `nodeIds`.
         */
        handleEventStart?: (eventType: HandleEventType, nodeIds: NodeId[], initialMatrices: Matrix[]) => void;
        /**
         * Triggered when a geometry handle is moved.
         *
         * @param eventType The type of the handle event.
         * @param nodeIds The node IDs bound to the handle.
         * @param initialMatrices The initial matrices for each of the supplied `nodeIds`.
         * @param newMatrices The new matrices for each of the supplied `nodeIds`.
         */
        handleEvent?: (eventType: HandleEventType, nodeIds: NodeId[], initialMatrices: Matrix[], newMatrices: Matrix[]) => void;
        /**
         * Triggered when a geometry handle is no longer selected.
         *
         * @param eventType The type of the handle event.
         * @param nodeIds The node IDs bound to the handle.
         * @param initialMatrices The initial matrices for each of the supplied `nodeIds`.
         * @param newMatrices The new matrices for each of the supplied `nodeIds`.
         */
        handleEventEnd?: (eventType: HandleEventType, nodeIds: NodeId[], initialMatrices: Matrix[], newMatrices: Matrix[]) => void;
        /**
         * Triggered when HWF parsing becomes completed.
         */
        hwfParseComplete?: () => void;
        /**
         * Triggered before a batch of incrementally selected entities is put into the [[SelectionManager]].
         *
         * See also:
         *  - [[SelectionManager.advanceIncrementalSelection]]
         */
        incrementalSelectionBatchBegin?: () => void;
        /**
         * Triggered after a batch of incrementally selected entities is put into the [[SelectionManager]].
         *
         * See also:
         *  - [[SelectionManager.advanceIncrementalSelection]]
         */
        incrementalSelectionBatchEnd?: () => void;
        /**
         * Triggered after all batches of incrementally selected entities have been put into the [[SelectionManager]].
         *
         * See also:
         *  - [[SelectionManager.advanceIncrementalSelection]]
         */
        incrementalSelectionEnd?: () => void;
        /**
         * Triggered when an info message is generated by the viewer.
         *
         * @param infoType The type of the message.
         * @param message The message.
         */
        info?: (infoType: InfoType, message: string) => void;
        /**
         * Triggered when a markup line is created.
         *
         * @param line The created markup line.
         */
        lineCreated?: (line: Markup.Line.LineMarkup) => void;
        /**
         * Triggered when a markup line is deleted.
         *
         * @param line The deleted markup line.
         */
        lineDeleted?: (line: Markup.Line.LineMarkup) => void;
        /**
         * Triggered when a markup line is loaded.
         *
         * @param line The loaded markup line.
         */
        lineLoaded?: (line: Markup.Line.LineMarkup) => void;
        /**
         * @deprecated
         *
         * Use any of the specific measurement callbacks instead:
         *  - [[measurementBegin]],
         *  - [[measurementCreated]],
         *  - [[measurementDeleted]],
         *  - [[measurementHidden]],
         *  - [[measurementLoaded]],
         *  - [[measurementShown]],
         *  - [[measurementValueSet]]
         */
        measurement?: (measurement: Markup.Measure.MeasureMarkup) => void;
        /**
         * Triggered when a measurement operator has begun measuring.
         */
        measurementBegin?: () => void;
        /**
         * Triggered when a measurement is fully created.
         *
         * @param measurement The created measurement.
         */
        measurementCreated?: (measurement: Markup.Measure.MeasureMarkup) => void;
        /**
         * Triggered when a measurement is deleted by its [[MeasureManager]].
         *
         * @param measurement The deleted measurement.
         *
         * See also:
         *  - [[MeasureManager.removeMeasurement]]
         *  - [[MeasureManager.removeAllMeasurements]]
         */
        measurementDeleted?: (measurement: Markup.Measure.MeasureMarkup) => void;
        /**
         * Triggered when a measurement is hidden by a call to its `setVisibility` method.
         *
         * @param measurement The hidden measurement.
         *
         * See also:
         *  - [[Markup.Measure.MeasureMarkup.setVisibility]]
         */
        measurementHidden?: (measurement: Markup.Measure.MeasureMarkup) => void;
        /**
         * Triggered when a measurement loaded by its [[MeasureManager]].
         *
         * @param measurement The loaded measurement.
         *
         * See also:
         *  - [[MeasureManager.loadData]]
         */
        measurementLoaded?: (measurement: Markup.Measure.MeasureMarkup) => void;
        /**
         * Triggered when a measurement is shown by a call to its `setVisibility` method.
         *
         * @param measurement The shown measurement.
         *
         * See also:
         *  - [[Markup.Measure.MeasureMarkup.setVisibility]]
         */
        measurementShown?: (measurement: Markup.Measure.MeasureMarkup) => void;
        /**
         * Triggered when the measurement value is set but before it is displayed to the user.
         *
         * This callback is useful for customizing the display of measurement text by using
         * its `getMeasurementValue` and `setMeasurementText` methods.
         *
         * @param measurement The modified measurement.
         */
        measurementValueSet?: (measurement: Markup.Measure.MeasureMarkup) => void;
        /**
         * Triggered when a missing model is discovered during a load.
         *
         * @param modelPath The path of the missing model.
         */
        missingModel?: (modelPath: string) => void;
        /**
         * Triggered immediately when [[Model.switchToModel]] is called.
         */
        modelLoadBegin?: () => void;
        /**
         * @deprecated Use [[subtreeLoaded]] instead.
         */
        modelLoaded?: (modelRootIds: NodeId[], source: NodeSource) => void;
        /**
         * Triggered when a model could not be loaded.
         *
         * @param modelName The name of the model that failed to load.
         * @param reason The reason the model failed to load.
         * @param error The error object thrown when the load failed, if available.
         */
        modelLoadFailure?: (modelName: ScModelName, reason: string, error?: any) => void;
        /**
         * Triggered when a model header has been parsed.
         * @param filename The name of the original model file.
         * @param filetype The type of the original model file.
         */
        modelStructureHeaderParsed?: (filename: string, fileType: FileType) => void;
        /**
         * @deprecated
         */
        modelStructureLoadBegin?: () => void;
        /**
         * @deprecated
         */
        modelStructureLoadEnd?: () => void;
        /**
         * @deprecated
         */
        modelStructureParseBegin?: () => void;
        /**
         * Triggered when the model structure has been loaded and is ready to be queried.
         *
         * This callback will only be called after the [[assemblyTreeReady]] callback gets triggered.
         */
        modelStructureReady?: () => void;
        /**
         * Triggered when [[Model.switchToModel]] or [[Model.clear]] is called.
         * This gets triggered after any of the above methods complete.
         *
         * @param clearOnly `true` if the callback was triggered by [[Model.clear]]. `false` otherwise.
         * @param modelRootIds The root IDs of the newly loaded assembly tree nodes.
         */
        modelSwitched?: (clearOnly: boolean, modelRootIds: NodeId[]) => void;
        /**
         * Triggered when [[Model.switchToModel]] or [[Model.clear]] is called.
         * This gets triggered after any of the above methods begin.
         *
         * @param clearOnly `true` if the callback was triggered by [[Model.clear]]. `false` otherwise.
         */
        modelSwitchStart?: (clearOnly: boolean) => void;
        /**
         * Triggered when note text is created, especially via the note operator.
         *
         * @param noteText The note text that was created.
         */
        noteTextCreated?: (noteText: Markup.Note.NoteText) => void;
        /**
         * Triggered when note text is hidden, especially via the note operator.
         *
         * @param noteText The note text that was hidden.
         */
        noteTextHidden?: (noteText: Markup.Note.NoteText) => void;
        /**
         * Triggered when note text is shown, especially via the note operator.
         *
         * @param noteText The note text that was shown.
         */
        noteTextShown?: (noteText: Markup.Note.NoteText) => void;
        /**
         * Triggered when an overlay viewport is set.
         *
         * @param overlayIndex The index of the overlay that had its viewport set.
         */
        overlayViewportSet?: (overlayIndex: OverlayIndex) => void;
        /**
         * Triggered when parts are hidden.
         *
         * @param nodeIds The node IDs containing the bodies that were hidden.
         * @deprecated Use [[visibilityChanged]] instead.
         */
        partsVisibilityHidden?: (nodeIds: NodeId[]) => void;
        /**
         * Triggered when parts are shown.
         *
         * @param nodeIds The node IDs containing the bodies that were shown.
         * @deprecated Use [[visibilityChanged]] instead.
         */
        partsVisibilityShown?: (nodeIds: NodeId[]) => void;
        /**
         * Triggered when a redline markup item is created.
         *
         * @param redlineMarkup The created redline.
         */
        redlineCreated?: (redlineMarkup: Markup.Redline.RedlineItem) => void;
        /**
         * Triggered when a redline markup item is deleted.
         *
         * @param redlineMarkup The deleted redline.
         */
        redlineDeleted?: (redlineMarkup: Markup.Redline.RedlineItem) => void;
        /**
         * Triggered when a redline markup item is updated.
         *
         * An update is triggered by changes in a redline markup item's
         * position, size, or text.
         *
         * @param redlineMarkup The deleted redline.
         */
        redlineUpdated?: (redlineMarkup: Markup.Redline.RedlineItem) => void;
        /**
         * Triggered when a cutting section is removed.
         */
        removeCuttingSection?: () => void;
        /**
         * Triggered when the scene is ready to be interacted with.
         *
         * [[View]]-related operations such as moving the camera may be invoked.
         * However, operations requiring node IDs should not be called at this time.
         */
        sceneReady?: () => void;
        /**
         * @deprecated Use [[frameDrawn]] instead.
         *
         * Triggered when a frame has been drawn.
         */
        sceneRendered?: () => void;
        /**
         * @deprecated Use [[selectionArray]] instead.
         *
         * Triggered when a selection event occurs.
         *
         * @param selectionEvents A list of selection events.
         */
        selection?: (...selectionEvents: Event.NodeSelectionEvent[]) => void;
        /**
         * Triggered when a selection event occurs.
         *
         * @param selectionEvents A list of selection events.
         * @param removed `true` if the selection items have been removed from the selection set. `false` otherwise.
         */
        selectionArray?: (selectionEvents: Event.NodeSelectionEvent[], removed: boolean) => void;
        /**
         * @deprecated
         *
         * Triggered when the node structure parsed directly from the XML file
         * of a shattered model is parsed.
         *
         * @param nodeId The node ID of a model root node in the shattered XML file
         */
        shatteredXmlStructureReady?: (nodeId: NodeId) => void;
        /**
         * Triggered when a drawing sheet has been activated.
         * @param nodeId The node ID of the activated sheet.
         */
        sheetActivated?: (nodeId: SheetId) => void;
        /**
         * Triggered when drawing sheets have been deactivated.
         */
        sheetDeactivated?: () => void;
        /**
         * Triggered when the client begins streaming data from the server.
         */
        streamingActivated?: () => void;
        /**
         * Triggered when streaming from the client has stopped.
         */
        streamingDeactivated?: () => void;
        /**
         * Triggered when a subtree has been deleted.
         *
         * @param modelRootIds A list of deleted subtree roots.
         */
        subtreeDeleted?: (modelRootIds: NodeId[]) => void;
        /**
         * Triggered when a subtree has been loaded.
         * This includes loading a model as well as directly creating nodes.
         *
         * @param modelRootIds A list of loaded subtree roots.
         */
        subtreeLoaded?: (modelRootIds: NodeId[], source: NodeSource) => void;
        /**
         * Triggered when a timeout due to inactivity occurs.
         */
        timeout?: () => void;
        /**
         * Triggered when a timeout due to inactivity is about to occur.
         *
         * @param minutesRemaining The remaining time until the [[timeout]] callback gets triggered.
         */
        timeoutWarning?: (minutesRemaining: number) => void;
        /**
         * Triggered when a camera transition begins.
         *
         * @param duration The duration of the transition in milliseconds.
         */
        transitionBegin?: (duration: number) => void;
        /**
         * Triggered when a camera transition ends.
         */
        transitionEnd?: () => void;
        /**
         * Triggered after the view axes have been set.
         *
         * @param frontVector The front vector of the view.
         * @param upVector The up vector of the view.
         */
        viewAxes?: (frontVector: Point3, upVector: Point3) => void;
        /**
         * Triggered when a view is created or by creating a redline item when no view is active.
         *
         * @param view The created markup view.
         *
         * See also:
         *  - [[MarkupManager.createMarkupView]]
         */
        viewCreated?: (view: Markup.MarkupView) => void;
        /**
         * Triggered when a view is deactivated.
         *
         * @param view The deactivated markup view.
         *
         * See also:
         *  - [[MarkupManager.activateMarkupView]]
         *  - [[MarkupManager.deleteMarkupView]]
         */
        viewDeactivated?: (view: Markup.MarkupView) => void;
        /**
         * Triggered when a view is deleted.
         *
         * @param view The deleted markup view.
         *
         * See also:
         *  - [[MarkupManager.deleteMarkupView]]
         */
        viewDeleted?: (view: Markup.MarkupView) => void;
        /**
         * Triggered when a view is loaded from data.
         *
         * @param view The loaded markup view.
         *
         * See also:
         *  - [[MarkupManager.loadMarkupData]]
         */
        viewLoaded?: (view: Markup.MarkupView) => void;
        /**
         * Triggered after the view orientation has changed.
         *
         * @param orientation The new view orientation.
         *
         * See also:
         *  - [[View.setViewOrientation]]
         */
        viewOrientation?: (orientation: ViewOrientation) => void;
        /**
         * Triggered when nodes are shown or hidden. If `shownBodyIds` and `hiddenBodyIds` are both
         * empty, only the visibility of structural nodes (nodes that do not directly contain
         * geometry) changed.
         *
         * @param shownBodyIds IDs of `Body` nodes that were shown.
         * @param hiddenBodyIds IDs of `Body` nodes that were hidden.
         */
        visibilityChanged?: (shownBodyIds: BodyId[], hiddenBodyIds: BodyId[]) => void;
        /**
         * @deprecated Use [[incrementalSelectionBatchBegin]] instead.
         *
         * Triggered before another batch of selected entities is put into the [[SelectionManager]].
         */
        volumeSelectionBatchBegin?: () => void;
        /**
         * @deprecated Use [[incrementalSelectionBatchEnd]] instead.
         *
         * Triggered after another batch of selected entities is put into the [[SelectionManager]].
         */
        volumeSelectionBatchEnd?: () => void;
        /**
         * @deprecated Use [[incrementalSelectionEnd]] instead.
         *
         * Triggered after all batches of selected entities have been put into the [[SelectionManager]].
         */
        volumeSelectionEnd?: () => void;
        /**
         * Triggered when the [[Operator.CameraWalkOperator]] becomes active.
         */
        walkOperatorActivated?: () => void;
        /**
         * triggered when the [[Operator.CameraWalkOperator]] is deactivated.
         */
        walkOperatorDeactivated?: () => void;
        /**
         * Triggered when the browser causes the WebGL context to be lost and rendering cannot continue.
         */
        webGlContextLost?: () => void;
        /**
         * Triggered when the browser stream websocket connection is closed.
         */
        websocketConnectionClosed?: () => void;
        /**
         * Triggered during load progress of HTTP requests.
         *
         * Happens when an error occurs during the loading of a model via an HTTP request.
         * For some errors (e.g. 404) make sure to check the status of XHRonloadend instead.
         *
         * @param errorEvent Describes the error.
         */
        XHRonerror?: (errorEvent: ErrorEvent) => void;
        /**
         * Triggered when an HTTP request completes.
         *
         * A completed HTTP request does not necessarily indicate success.
         * Make sure to check the return status.
         *
         * @param progressEvent Describes the progress of the completed load.
         * @param status The status of the request.
         * @param uri The URI of the request.
         *
         * See also:
         *   - https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
         */
        XHRonloadend?: (progressEvent: ProgressEvent, status: number, uri: string) => void;
        /**
         * Triggered during load progress of HTTP requests.
         *
         * Happens when loading a model via an HTTP request.
         *
         * @param progressEvent Describes the progress of the load.
         */
        XHRonprogress?: (progressEvent: ProgressEvent) => void;
    }
}
declare namespace Communicator {
    /** A pair of numbers identifying a mesh. */
    type MeshId = [number, number];
    /** A pair of numbers identifying an image. */
    type ImageId = [number, number];
    /**
     * This is the User Data Index for a node.
     *
     * Values of this type are unsigned 64 bit numbers.
     *
     * A value is of type `number` when it can be represented precisely as such.
     *
     * Otherwise a value is of type `string`, where the string is the hex encoding of the index.
     * The hex representation is in uppercase and does not have a leading `0x`.
     */
    type UserDataIndex = number | string;
    /**
     * Used to silence TypeScript unused variable warnings.
     *
     * ---
     *
     * Usage:
     * ```
     * x as Unreferenced;
     * ```
     */
    type Unreferenced = any;
    enum NodeSource {
        LoadModel = 0,
        CreateNode = 1,
        CreateInstance = 2,
        CreatePmi = 3
    }
    enum ScreenConfiguration {
        Desktop = 0,
        Mobile = 1
    }
    enum ElementType {
        Faces = 0,
        Lines = 1,
        Points = 2
    }
    /**
     * Enumerated values used for setting camera projection.
     */
    enum Projection {
        /** Orthographic projection */
        Orthographic = 0,
        /** Perspective projection */
        Perspective = 1
    }
    /**
     * Enumerated values used when setting pre-defined view orientations.
     */
    enum ViewOrientation {
        /** Top view */
        Top = 0,
        /** Bottom view */
        Bottom = 1,
        /** Left view */
        Left = 2,
        /** Right view */
        Right = 3,
        /** Front view */
        Front = 4,
        /** Back view */
        Back = 5,
        /** Isometric view */
        Iso = 6,
        TopRightFront = 7,
        TopLeftFront = 8,
        TopLeftBack = 9,
        TopRightBack = 10,
        TopBack = 11,
        TopFront = 12,
        TopLeft = 13,
        TopRight = 14,
        BottomRightBack = 15,
        BottomLeftBack = 16,
        BottomLeftFront = 17,
        BottomRightFront = 18,
        BottomFront = 19,
        BottomBack = 20,
        BottomLeft = 21,
        BottomRight = 22,
        RightBottomBack = 23,
        RightBottomFront = 24,
        RightTopFront = 25,
        RightTopBack = 26,
        RightTop = 27,
        RightBottom = 28,
        RightFront = 29,
        RightBack = 30,
        LeftBottomFront = 31,
        LeftBottomBack = 32,
        LeftTopBack = 33,
        LeftTopFront = 34,
        LeftTop = 35,
        LeftBottom = 36,
        LeftBack = 37,
        LeftFront = 38,
        FrontBottomRight = 39,
        FrontTopRight = 40,
        FrontTopLeft = 41,
        FrontBottomLeft = 42,
        FrontRight = 43,
        FrontLeft = 44,
        FrontTop = 45,
        FrontBottom = 46,
        BackTopRight = 47,
        BackBottomRight = 48,
        BackBottomLeft = 49,
        BackTopLeft = 50,
        BackLeft = 51,
        BackRight = 52,
        BackBottom = 53,
        BackTop = 54
    }
    /** Enumerated values used when referring to an axis */
    enum Axis {
        /** The X axis */
        X = 0,
        /** The Y axis */
        Y = 1,
        /** The Z axis */
        Z = 2
    }
    /** Enumerated values used when referring to the buttons on a mouse */
    enum Button {
        /** No mouse button */
        None = -1,
        /** Left mouse button */
        Left = 0,
        /** Middle mouse button */
        Middle = 1,
        /** Right mouse button */
        Right = 2
    }
    /** Bitmask for buttons being pressed when referring to the buttons on a mouse */
    enum Buttons {
        None = 0,
        Left = 1,
        Right = 2,
        Middle = 4
    }
    /** Enumerated values for types of handles for [[HandleOperator]]. */
    enum HandleType {
        Axis = 0,
        Plane = 1,
        ViewPlane = 2,
        Rotate = 3
    }
    /** Enumerated values for types of handle events for [[HandleOperator]]. */
    enum HandleEventType {
        Translate = 0,
        Rotate = 1
    }
    /** Enumerates IDs for operators. For more information see reference for [[Communicator.Operator]]. */
    enum OperatorId {
        Invalid = -1,
        None = 0,
        Navigate = 1,
        Orbit = 2,
        Pan = 3,
        Zoom = 4,
        WindowZoom = 5,
        Walk = 6,
        KeyboardWalk = 7,
        WalkMode = 8,
        Turntable = 9,
        Select = 10,
        AreaSelect = 11,
        RayDrillSelect = 12,
        RedlineCircle = 13,
        RedlineText = 14,
        RedlineRectangle = 15,
        RedlinePolyline = 16,
        MeasureEdgeLength = 17,
        MeasureFaceFaceDistance = 18,
        MeasureLineLineAngle = 19,
        MeasurePointPointDistance = 20,
        MeasureBodyBodyDistance = 21,
        MeasureFaceFaceAngle = 22,
        MeasurePolylineDistance = 23,
        MeasurePolygonArea = 24,
        Note = 25,
        Cutting = 26,
        Handle = 27,
        NavCube = 28,
        AxisTriad = 29,
        Floorplan = 30,
        SpaceMouse = 31
    }
    /** Enumerates IDs for built-in operators */
    type BuiltInOperatorId = OperatorId.Navigate | OperatorId.Orbit | OperatorId.Pan | OperatorId.Zoom | OperatorId.WindowZoom | OperatorId.Walk | OperatorId.KeyboardWalk | OperatorId.WalkMode | OperatorId.Turntable | OperatorId.Select | OperatorId.AreaSelect | OperatorId.RayDrillSelect | OperatorId.RedlineCircle | OperatorId.RedlineText | OperatorId.RedlineRectangle | OperatorId.RedlinePolyline | OperatorId.MeasureEdgeLength | OperatorId.MeasureFaceFaceDistance | OperatorId.MeasureLineLineAngle | OperatorId.MeasurePointPointDistance | OperatorId.MeasureBodyBodyDistance | OperatorId.MeasureFaceFaceAngle | OperatorId.MeasurePolylineDistance | OperatorId.MeasurePolygonArea | OperatorId.Note | OperatorId.Cutting | OperatorId.Handle | OperatorId.NavCube | OperatorId.AxisTriad | OperatorId.Floorplan | OperatorId.SpaceMouse;
    /** Enumerates EventTypes for Operators */
    enum EventType {
        MouseDown = 0,
        MouseMove = 1,
        MouseUp = 2,
        Mousewheel = 3,
        TouchStart = 4,
        TouchMove = 5,
        TouchEnd = 6,
        KeyDown = 7,
        KeyUp = 8,
        ViewOrientationChange = 9
    }
    /** Enumerates Modifier Keys. Note this enumeration may not correspond with JavaScript key codes for the corresponding keys. */
    enum KeyModifiers {
        /** No modifier key */
        None = 0,
        /** The shift key */
        Shift = 2,
        /** The alt key */
        Alt = 4,
        /** The control key */
        Control = 8,
        /** The command key */
        Command = 16
    }
    /** Enumerates types of mouse input */
    enum MouseInputType {
        /** Mouse button was pressed down */
        Down = 0,
        /** Mouse button was released */
        Up = 1,
        /** Mouse was moved */
        Move = 2,
        /** The mouse wheel was moved */
        Wheel = 3
    }
    /** Enumerates types of touch input */
    enum TouchInputType {
        /** A touch has started */
        Start = 0,
        /** A touch has moved */
        Move = 1,
        /** A touch has ended */
        End = 2
    }
    /** Enumerates types of keyboard input */
    enum KeyInputType {
        /** A key has been pressed */
        Down = 0,
        /** A key has been released */
        Up = 1
    }
    /** Enumerates directions for the walk operator */
    enum WalkDirection {
        Forward = 0,
        Backward = 1,
        Left = 2,
        Right = 3,
        Up = 4,
        Down = 5,
        RotateRight = 6,
        RotateLeft = 7,
        TiltUp = 8,
        TiltDown = 9
    }
    /** Enumerates JavaScript Key Codes. We recommend using [this tool](https://keycode.info/) if you are unsure which keycode you are trying to capture. */
    enum KeyCode {
        /** Backspace key */
        Backspace = 8,
        /** Shift key */
        Shift = 16,
        /** Escape Key */
        Escape = 27,
        /** PageUp Key */
        PgUp = 33,
        /** PageDown Key */
        PgDown = 34,
        /** Left Arrow */
        LeftArrow = 37,
        /** Up Arrow */
        UpArrow = 38,
        /** Right Arrow */
        RightArrow = 39,
        /** Down Arrow */
        DownArrow = 40,
        /** Delete Key */
        Delete = 46,
        /** Characters */
        a = 65,
        b = 66,
        c = 67,
        d = 68,
        e = 69,
        f = 70,
        g = 71,
        h = 72,
        i = 73,
        j = 74,
        k = 75,
        l = 76,
        m = 77,
        n = 78,
        o = 79,
        p = 80,
        q = 81,
        r = 82,
        s = 83,
        t = 84,
        u = 85,
        v = 86,
        w = 87,
        x = 88,
        y = 89,
        z = 90,
        _0 = 48,
        _1 = 49,
        _2 = 50,
        _3 = 51,
        _4 = 52,
        _5 = 53,
        _6 = 54,
        _7 = 55,
        _8 = 56,
        _9 = 57,
        NumPad_0 = 96,
        NumPad_1 = 97,
        NumPad_2 = 98,
        NumPad_3 = 99,
        NumPad_4 = 100,
        NumPad_5 = 101,
        NumPad_6 = 102,
        NumPad_7 = 103,
        NumPad_8 = 104,
        NumPad_9 = 105
    }
    /** Bitmask for allowed selection types */
    enum SelectionMask {
        None = 0,
        Face = 1,
        Line = 2,
        Point = 4,
        All = 7
    }
    /** Enumerates a type of selection */
    enum SelectionType {
        /** Nothing was selected */
        None = 0,
        /** A face element was selected */
        Face = 1,
        /** A line element was selected */
        Line = 2,
        /** A point element was selected */
        Point = 3,
        /** A Part was selected */
        Part = 4
    }
    /**
     * Enumerates the modes to be used when performing selections.
     */
    enum SelectionMode {
        /**
         * Sets the contents of the selection set to the supplied item.
         * All other selected items will be removed from the selection set.
         */
        Set = 0,
        /** Adds the item to the contents of the selection set. */
        Add = 1,
        /**
         * If the selection item is in the selection set, removes it.
         * If it is not in the selection set, adds it.
         */
        Toggle = 2
    }
    /**
     * Enumerates the visual indications for selected objects
     */
    enum SelectionHighlightMode {
        /** Selected nodes are highlighted */
        HighlightOnly = 0,
        /** An outline is rendered around selected nodes */
        OutlineOnly = 1,
        /** Selected Nodes are highlighted and an outline is rendered. */
        HighlightAndOutline = 2
    }
    /** Enumerates the type of message passed via an info callback */
    enum InfoType {
        /** Informational message which will most likely not affect execution */
        Info = 0,
        /** Warning message which does not trigger an error but may affect program execution */
        Warning = 1,
        /** Error message indicating a problem has occurred */
        Error = 2
    }
    /**
     * Enumerates the mode the viewer will use when streaming data to the client.
     */
    enum StreamingMode {
        /**
         * This is the default setting for the viewer.
         * Data will be streamed as it becomes visible based on the viewing frustum.
         * Keyed data that was encoded with priority 0 will not be streamed unless explicitly requested.
         * The supporting server process will remain active while the user views the model.
         */
        Interactive = 1,
        /**
         * All data will be streamed to the client.
         * Priority will be given to data visible based on the view frustum.
         * The supporting server process will remain active.
         */
        All = 2,
        /**
         * No data is streamed to the client unless it has been explicitly requested.
         * The supporting server process will remain active while the user views the model.
         */
        OnDemand = 4,
        /**
         * The default streaming mode.
         */
        Default = 1
    }
    /**
     * Enumerates the mode that is used for rendering
     */
    enum RendererType {
        /**
         * This is the default setting for the viewer.
         * Rendering is performed using webGL on the client.
         */
        Client = 0,
        /** Rendering is performed on the server */
        Server = 1
    }
    /** Enumerates drawing modes available in the viewer. More information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/scene_attributes/draw-modes.html). */
    enum DrawMode {
        /** Lines are rendered and faces are not */
        Wireframe = 0,
        /** Faces are rendered and lines are not */
        Shaded = 1,
        /** Lines and faces are rendered */
        WireframeOnShaded = 2,
        /** Silhouette edges and obscured lines are rendered */
        HiddenLine = 3,
        /** Selected items are drawn on top, and unselected items are drawn transparent */
        XRay = 4,
        /** Shading occurs only in mid-tones so that edge lines and highlights remain visually prominent. */
        Gooch = 5,
        /** Conventional smooth lighting values are calculated for each pixel and then quantized to a small number of discrete shades */
        Toon = 6
    }
    /** Enumerates ways of displaying transparent geometry */
    enum TransparencyMode {
        /** Transparent objects are blended together without z-sorting. */
        Unsorted = 0,
        /** Only the front-most transparent object is visible at a given pixel. */
        SingleLayer = 1
    }
    /** Enumerates ways of displaying transparent (unselected) geometry in the x-ray draw mode. */
    enum XRayTransparencyMode {
        /** Transparent objects are blended together without z-sorting. */
        Unsorted = 0,
        /** Only the front-most transparent object is visible at a given pixel. */
        SingleLayer = 1
    }
    /** Enumerates anti-aliasing modes available in the viewer */
    enum AntiAliasingMode {
        /** SMAA anti-aliasing */
        SMAA = 0,
        /** No anti-aliasing */
        None = 1
    }
    /** Enumerates instance modifier modes. More information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/model_attributes/instance-modifiers.html). */
    enum InstanceModifier {
        /** If set, the instance will not be affected by an explode operation. */
        DoNotExplode = 0,
        /** If set, the instance will not be affected by cutting planes. */
        DoNotCut = 1,
        /** If set, the instance will not be selectable. */
        DoNotSelect = 2,
        /**
         * If set, the instance will be drawn at the same size
         * regardless of camera settings.
         */
        SuppressCameraScale = 3,
        /** If set, the instance will ignore scene-level visibility. */
        OverrideSceneVisibility = 4,
        /** If set, the instance will not be lit. */
        DoNotLight = 5,
        /** If set, the instance will not be outlined when highlighted. */
        DoNotOutlineHighlight = 6,
        /** If set, the instance will not be included in bounding calculations. */
        ExcludeBounding = 7,
        /** If set, the instance will not use the mesh's per-vertex colors. */
        DoNotUseVertexColors = 8,
        /**
         * If set, the instance will be drawn before other instances
         * and will not be culled in order to reach the target frame rate.
         */
        AlwaysDraw = 9,
        /** If set, the instance will not be affected by [[DrawMode.XRay]]. */
        DoNotXRay = 10,
        /**
         * If set, the instance will be oriented such that the cardinal
         * axes of object space are aligned with the cardinal axes of
         * screen space.
         */
        ScreenOriented = 11,
        /**
         * If set, the instance will be drawn in a space that extends
         * from X=-1 at the left side of the screen to X=1 at the right
         * side of the screen and from Y=-1 at the bottom of the screen
         * to Y=1 at the top of the screen.
         *
         * If the aspect ratio of the screen is not 1:1, the instance
         * will be scaled so that it appears as if the aspect ratio
         * were 1:1 (i.e., so that the instances will not appear stretched).
         */
        ScreenSpace = 12,
        /**
         * If set, the instance will be drawn in a space that extends
         * from X=-1 at the left side of the screen to X=1 at the right
         * side of the screen and from Y=-1 at the bottom of the screen
         * to Y=1 at the top of the screen.
         *
         * If the aspect ratio of the screen is not 1:1, the instance
         * will stretch in the direction of the longer side.
         */
        ScreenSpaceStretched = 13,
        /** @deprecated Use [[DoNotExplode]] instead. */
        IgnoreExplosion = 0,
        /** @deprecated Use [[DoNotCut]] instead. */
        IgnoreCutting = 1,
        /** @deprecated Use [[DoNotSelect]] instead. */
        IgnoreSelection = 2,
        /** @deprecated Use [[SuppressCameraScale]] instead. */
        IgnoreCameraScale = 3,
        /** @deprecated Use [[DoNotLight]] instead. */
        IgnoreLighting = 5,
        /** @deprecated Use [[DoNotOutlineHighlight]] instead. */
        IgnoreOutlineHighlight = 6
    }
    /** Flags used when creating a mesh instance */
    enum MeshInstanceCreationFlags {
        None = 0,
        /**
         * If set, the instance will be drawn at the same size
         * regardless of camera settings.
         */
        SuppressCameraScale = 1,
        /**
         * If set, the instance will be oriented such that the cardinal
         * axes of object space are aligned with the cardinal axes of
         * screen space.
         */
        ScreenOriented = 2,
        /** If set, the instance will not be affected by cutting planes. */
        DoNotCut = 4,
        /** If set, the instance will not be affected by explode. */
        DoNotExplode = 8,
        /** If set, the instance will not be selectable. */
        DoNotSelect = 16,
        /** If set, the instance will not be lit. */
        DoNotLight = 32,
        /** If set, the instance will not be outlined when highlighted. */
        DoNotOutlineHighlight = 64,
        /** If set, the instance will not be included in bounding calculations. */
        ExcludeBounding = 128,
        /** If set, the instance will not use the mesh's per-vertex colors. */
        DoNotUseVertexColors = 256,
        /** If set, the instance will not be visible until explicitly made visible. */
        Invisible = 512,
        /** If set, the instance will not be affected by [[DrawMode.XRay]]. */
        DoNotXRay = 1024,
        /**
         * If set, the instance will be drawn before other instances
         * and will not be culled in order to reach the target frame rate.
         */
        AlwaysDraw = 2048,
        /** If set, the instance will ignore scene-level visibility. */
        OverrideSceneVisibility = 4096,
        /**
         * If set, the instance will be drawn in a space that extends
         * from X=-1 at the left side of the screen to X=1 at the right
         * side of the screen and from Y=-1 at the bottom of the screen
         * to Y=1 at the top of the screen.
         *
         * If the aspect ratio of the screen is not 1:1, the instance
         * will be scaled so that it appears as if the aspect ratio
         * were 1:1 (i.e., so that the instances will not appear stretched).
         */
        ScreenSpace = 8192,
        /**
         * If set, the instance will be drawn in a space that extends
         * from X=-1 at the left side of the screen to X=1 at the right
         * side of the screen and from Y=-1 at the bottom of the screen
         * to Y=1 at the top of the screen.
         *
         * If the aspect ratio of the screen is not 1:1, the instance
         * will stretch in the direction of the longer side.
         */
        ScreenSpaceStretched = 16384
    }
    enum BoundingPreviewMode {
        /** No bounding previews will be rendered */
        None = 0,
        /** Bounding previews will be rendered for models that have not been streamed yet. */
        Model = 1,
        /** Bounding previews will be rendered for instances that have not been streamed yet. */
        Instance = 2,
        /** Bounding previews will be rendered for items that have been ejected. This is only applicable if the memoryLimit option is set at viewer creation. */
        Ejected = 4,
        /** Combination of Model, Instance, and Ejected options */
        All = 7
    }
    /** Enumerates Camera Orbit Fallback Modes */
    enum OrbitFallbackMode {
        /** Orbit around the camera target. */
        CameraTarget = 0,
        /** Orbit around the center of the model bounding box. */
        ModelCenter = 1,
        /** Orbit around a specified point. Defaults to the origin if there is no specified point. */
        OrbitTarget = 2
    }
    /** Enumerates Walk Modes */
    enum WalkMode {
        Mouse = 0,
        Keyboard = 1
    }
    /** Enumerates of the types returned by Model.getNodeType() */
    enum NodeType {
        /** This is a node in the model tree, this node doesn't hold any instanced mesh/body. */
        AssemblyNode = 0,
        /** This is a node in the model tree, but this one holds one or more instanced meshes/bodies. */
        PartInstance = 1,
        /** This node is a non instanced part, it holds the actual mesh/body data, like measurement. */
        Part = 2,
        /** This node is an instanced mesh/body. */
        BodyInstance = 3,
        /** This node is an instanced PMI mesh/body. */
        PmiBody = 4,
        /** @deprecated Use [[PmiBody]] instead. */
        PMIBody = 4,
        /** This node corresponds to the frame you'll find surrounding PMIs when the view is a CATIA annotation view type. */
        ViewFrame = 5,
        /** This node is a non instanced "undefined" body, held by a Part type node. */
        Body = 6,
        /** This node is a non instanced body built from a brep, held by a Part type node. */
        BrepBody = 7,
        /** This node is a non instanced body built from a tessellated object, held by a Part type node. */
        TessBody = 8,
        /** This node is a non instanced body built from a wireframed object, held by a Part type nod.e */
        WireBody = 9,
        /** This node is a non instanced body built from a point cloud, held by a Part type node. */
        PointsBody = 10,
        /** This node is a PMI, holding PMI data and PmiBody. */
        Pmi = 11,
        /** @deprecated Use [[Pmi]] instead. */
        PMI = 11,
        /** This node is the CAD view, holding view data and ViewFrame. */
        CadView = 12,
        /** @deprecated Use [[CadView]] instead. */
        CADView = 12,
        /** This node is a Drawing sheet. */
        DrawingSheet = 13,
        /** If for any reason a node doesn't correspond to any of those types, unknown is returned. */
        Unknown = 14
    }
    /** PMI type */
    enum PmiType {
        /** Unknown value */
        Unknown = 0,
        /** Plain text */
        Text = 1,
        /** Dimension */
        Dimension = 2,
        /** Arrow */
        Arrow = 3,
        /** Balloon */
        Balloon = 4,
        /** Center of circle */
        CircleCenter = 5,
        /** Coordinate */
        Coordinate = 6,
        /** Datum */
        Datum = 7,
        /** Fastener */
        Fastener = 8,
        /** GD&T */
        Gdt = 9,
        /** Locator */
        Locator = 10,
        /** Point */
        MeasurementPoint = 11,
        /** Roughness */
        Roughness = 12,
        /** Welding */
        Welding = 13,
        /** Table */
        Table = 14,
        /** Other */
        Other = 15,
        /** Geometrical tolerance */
        GeometricalTolerance = 16
    }
    /** @deprecated Use [[PmiType]] instead. */
    type PMIType = PmiType;
    /** @deprecated Use [[PmiType]] instead. */
    const PMIType: typeof PmiType;
    /** PMI subtype */
    enum PmiSubType {
        /** Unknown value */
        Unknown = 0,
        /** Datum subtype */
        DatumIdent = 1,
        /** Datum subtype */
        DatumTarget = 2,
        /** Dimension distance subtype */
        DimensionDistance = 1,
        /** Dimension distance subtype */
        DimensionDistanceOffset = 2,
        /** Dimension distance subtype */
        DimensionDistanceCumulate = 3,
        /** Dimension chamfer subtype */
        DimensionChamfer = 4,
        /** Dimension slope subtype */
        DimensionSlope = 5,
        /** Dimension ordinate subtype */
        DimensionOrdinate = 6,
        /** Dimension radius subtype */
        DimensionRadius = 7,
        /** Dimension radius subtype */
        DimensionRadiusTangent = 8,
        /** Dimension radius subtype */
        DimensionRadiusCylinder = 9,
        /** Dimension radius subtype */
        DimensionRadiusEdge = 10,
        /** Dimension diameter subtype */
        DimensionDiameter = 11,
        /** Dimension diameter subtype */
        DimensionDiameterTangent = 12,
        /** Dimension diameter subtype */
        DimensionDiameterCylinder = 13,
        /** Dimension diameter subtype */
        DimensionDiameterEdge = 14,
        /** Dimension diameter subtype */
        DimensionDiameterCone = 15,
        /** Dimension length subtype */
        DimensionLength = 16,
        /** Dimension length subtype */
        DimensionLengthCurvilinear = 17,
        /** Dimension length subtype */
        DimensionLengthCircular = 18,
        /** Dimension angle subtype */
        DimensionAngle = 19,
        /** GD&T Feature control frame subtype */
        GdtFcf = 1,
        /** Line welding subtype */
        WeldingLine = 1,
        /** Spot welding subtype */
        WeldingSpot = 2,
        /** User symbol, other subtype */
        OtherSymbolUser = 1,
        /** Utility symbol, other subtype */
        OtherSymbolUtility = 2,
        /** Custom symbol, other subtype */
        OtherSymbolCustom = 3,
        /** Geometric reference, other subtype */
        OtherGeometricReference = 4,
        /** Region symbol, other subtype */
        OtherRegion = 5
    }
    /** @deprecated Use [[PmiSubType]] instead. */
    type PMISubType = PmiSubType;
    /** @deprecated Use [[PmiSubType]] instead. */
    const PMISubType: typeof PmiSubType;
    /** PMI reference to topology (brep) */
    enum PmiTopoRef {
        Unknown = -1,
        /** Self-containing set of topological entities */
        Context = 1,
        /** Abstract root type for any topological entity (body or single item) */
        Item = 2,
        /** Vertex whose position is the average of all edges' extremity positions to whom it belongs */
        MultipleVertex = 3,
        /** Vertex with one set of coordinates (absolute position) */
        UniqueVertex = 4,
        /** Edge belonging to a wire body */
        WireEdge = 5,
        /** Edge belonging to a BrepData body */
        Edge = 6,
        /** Usage of an edge in a loop */
        CoEdge = 7,
        /** Array of co-edges that delimit a face */
        Loop = 8,
        /** Topological face delimiting a shell */
        Face = 9,
        /** Topological shell (open or closed) */
        Shell = 10,
        /** Topological region */
        Connex = 11,
        /** Abstract root type for any topological body */
        Body = 12,
        /** Single wire body */
        SingleWireBody = 13,
        /** Main entry to non-wire topology */
        BrepData = 14,
        /** Main entry to wire topology */
        WireBody = 17
    }
    /** @deprecated Use [[PmiTopoRef]] instead. */
    type PMITopoRef = PmiTopoRef;
    /** @deprecated Use [[PmiTopoRef]] instead. */
    const PMITopoRef: typeof PmiTopoRef;
    /**
     * Enumerates face winding for use with geometry. Face winding is the order in which points are specified relative to a face normal.
     */
    enum FaceWinding {
        /** The winding is unknown. This is not recommended. */
        Unknown = 0,
        /** Faces are wound in a clockwise manner. */
        Clockwise = 1,
        /** Faces are wound in a counter-clockwise manner. */
        CounterClockwise = 2
    }
    enum OverlayAnchor {
        UpperLeftCorner = 0,
        LowerLeftCorner = 1,
        LowerRightCorner = 2,
        UpperRightCorner = 3,
        TopCenter = 4,
        LeftCenter = 5,
        RightCenter = 6,
        BottomCenter = 7,
        Center = 8
    }
    /**
     * Enumerates the unit types that an overlay viewport value may be.
     */
    enum OverlayUnit {
        /**
         * The value is specified in CSS pixels.
         */
        Pixels = 0,
        /**
         * The value is specified as a proportion of the viewing canvas.
         * If the canvas is resized, the viewports dimensions will be recalculated accordingly.
         * In this case the value should be specified in a range of 0.0 to 1.0.
         */
        ProportionOfCanvas = 1,
        /**
         * The value is specified as a proportion its corresponding parameters calculated value.
         * For example, given a viewport specified with width of 0.25 and unit type of ProportionOfCanvas,
         * specifying height with value of 1.0 and type of ProportionOfOtherDimension will ensure that the
         * calculated height value will be equal to the calculated width value should the canvas resize.
         * In this case the value should be specified in a range of 0.0 to 1.0.
         */
        ProportionOfOtherDimension = 2
    }
    /** Specifies how point size is interpreted. */
    enum PointSizeUnit {
        /** Point size is measured directly in pixels of the output image, regardless of display DPI. */
        ScreenPixels = 0,
        /** CSS pixels, which may be larger than screen pixels on high-DPI displays. */
        CSSPixels = 1,
        /**
         * The world-space units in which model geometry is defined.
         * If this unit is used, points will scale according to distance from the camera under perspective projection.
         */
        World = 2,
        /** If this unit is used, the point size will be multiplied by the width of the screen. */
        ProportionOfScreenWidth = 3,
        /** If this unit is used, the point size will be multiplied by the height of the screen. */
        ProportionOfScreenHeight = 4,
        /**
         * If this unit is used, the point size will be multiplied by the length of the diagonal
         * of the scene's bounding box.
         * Points will scale according to distance from the camera under perspective projection.
         */
        ProportionOfBoundingDiagonal = 5
    }
    /** Specifies the appearance of points. */
    enum PointShape {
        /**
         * Points will be drawn as squares filled with a solid color.
         * This option will give the best performance for large point clouds.
         */
        Square = 0,
        /** Points will be drawn as circles filled with a solid color. */
        Disk = 1,
        /**
         * Points will be drawn as filled circles lit as if they were spheres
         * instead of being filled with a solid color.
         */
        Sphere = 2
    }
    /** Object which maps an Id to a string value */
    interface IdStringMap {
        [nodeId: number]: string | undefined;
    }
    /** Object which maps an Id to a color value */
    interface IdColorMap {
        [nodeId: number]: Color | undefined;
    }
    /** Object which maps an Id to a boolean value */
    interface IdBooleanMap {
        [nodeId: number]: boolean | undefined;
    }
    /** Object which maps an Id to a number value */
    interface IdNumberMap {
        [nodeId: number]: number | undefined;
    }
    /** Object which maps a string to a string */
    interface StringStringMap {
        [key: string]: string | undefined;
    }
    /**
     * Object which identifies a reference to an element on a brep
     */
    class RefOnTopoItem {
        /** @deprecated Use [[bodyId]] instead. */
        /** @deprecated Use [[bodyId]] instead. */
        bodyID: BodyId;
        /** Id of the body in assembly tree */
        bodyId: BodyId;
        /** See PmiTopoRef. Could be face, edge... */
        subElementType: PmiTopoRef;
        /** Index of the face, edge... */
        subElementIndex: number;
    }
    /** Visibity of a node's branch, including all children of that node. */
    enum BranchVisibility {
        /** All children are not visible. */
        Hidden = 0,
        /** All children are visible. */
        Shown = 1,
        /** Not all children have the same visibility state. */
        Mixed = 2
    }
    /** The space in which a culling vector is defined. */
    enum CullingVectorSpace {
        /** The object space of the item to which the culling vector is attached. The culling vector is affected by the item's modelling matrices. */
        Object = 0,
        /** World space. The culling vector is not affected by modelling matrices. */
        World = 1
    }
    enum BuiltinOverlayIndex {
        /** @hidden */
        First = 8,
        Handles = 8,
        AxisTriad = 9,
        NavCube = 10,
        Floorplan = 11,
        /** @hidden */
        TestFramework = 12
    }
    class FaceFaceDistanceItem {
        pos1: Point3;
        pos2: Point3;
        distance: number;
    }
    /**
     * Object representing the up and front vectors for the model coordinate system.
     */
    class ViewAxes {
        frontVector: Point3;
        upVector: Point3;
    }
    /** A vector and angle used to determine an object's visibility based on camera orientation. */
    interface CullingVector {
        /** The space in which the culling vector is defined. */
        space: CullingVectorSpace;
        /** A vector that will be compared with the view vector. */
        vector: Point3;
        /** The maximum angle between the culling vector and the view vector within which the object will be visible. */
        toleranceDegrees: number;
    }
    /** @hidden */
    type ResolveFunc<T> = (value?: T | PromiseLike<T>) => void;
    /** @hidden */
    type RejectFunc = (error?: any) => void;
    /**
     * A promise that can be safely ignored. Functions that return this type were once
     * asynchronous but are now synchronous.
     */
    interface DeprecatedPromise extends Promise<void> {
    }
    /**
     * Type used to denote an XML filename.
     */
    type XmlFilename = string;
    /**
     * Type used to denote an XML ExternalModel name.
     */
    type ExternalModelName = string;
    /**
     * Type used to denote an SC model name.
     */
    type ScModelName = string;
    /**
     * Type used to denote an SCS model's URI.
     */
    type ScsUri = string;
    /**
     * Type used to denote an SCS model's byte buffer.
     */
    type ScsBuffer = Uint8Array;
    /**
     * Callback to massage ExternalModel names within an XML load file to SC model names.
     * Return null to skip the model.
     * Returned value can be synchronous (non-Promise) or asynchronous (Promise).
     */
    type MassageModelNameFunc = (modelName: ExternalModelName) => Promise<ScModelName | null> | (ScModelName | null);
    /**
     * Callback to map ExternalModel names within an XML load file to SCS file URis or SCS file buffers.
     * Return null to skip the model.
     * Returned value can be synchronous (non-Promise) or asynchronous (Promise).
     */
    type ModelNameToScsFileFunc = (modelName: ExternalModelName) => Promise<ScsUri | ScsBuffer | null> | (ScsUri | ScsBuffer | null);
    /**
     * Specifies the appearance of a single repetion of a line pattern.
     * The format is an arbitrary-length array of `1`s and `0`s, where
     * pixels covered by a `1` in the pattern are visible and pixels
     * covered by a `0` are invisible.
     *
     * Examples:
     * - `[1,0]`: a dashed line with equal-length dashes and gaps
     * - `[1,1,1,1,1,1,1,1,1,0,0,0,0,1,0,0,0,0]`: a dash followed by a gap of
     *   equal length with a dot in the center
     */
    type LinePattern = number[] | Uint8Array;
    /**
     * Specifies the units in which the length of a [[LinePattern]] is measured.
     */
    enum LinePatternLengthUnit {
        /** Object space units before applying modelling matrices. */
        Object = 0,
        /** Object space units after applying modelling matrices. */
        World = 1,
        /**
         * A proportion of the width of the canvas, where `1` means the full width.
         *
         * When this unit is used, the line pattern will appear the same regardless
         * of zoom or distance from the camera. However, this requires extra
         * calculation for each vertex in the line, which makes it less
         * performant than other units.
         */
        ProportionOfScreenWidth = 2,
        /**
         * A proportion of the height of the canvas, where `1` means the full height.
         *
         * When this unit is used, the line pattern will appear the same regardless
         * of zoom or distance from the camera. However, this requires extra
         * calculation for each vertex in the line, which makes it less
         * performant than other units.
         */
        ProportionOfScreenHeight = 3
    }
    /** Specifies a category of nodes in x-ray mode. See [[DrawMode.XRay]]. */
    enum XRayGroup {
        /** Selected nodes. */
        Selected = 0,
        /** Unselected nodes. */
        Unselected = 1
    }
    /**
     * Specifies the units in which the interval between samples in a blurring
     * operation is measured.
     */
    enum BlurIntervalUnit {
        /** Pixels of the source image. */
        Pixels = 0,
        /** A proportion of the width of the source image, where `1` means the full width. */
        ProportionOfWidth = 1,
        /** A Proportion of the height of the source image, where `1` means the full height. */
        ProportionOfHeight = 2
    }
    /**
     * Describes a single layer in the bloom effect.
     *
     * See [[View.setBloomLayers]].
     */
    interface BloomLayerInfo {
        /**
         * A number used to scale the contribution of the layer to the image.
         * Can be greater than `1`.
         *
         * If unspecified, the value will be `1`.
         *
         * See [[View.setBloomIntensityScale]].
         */
        intensity?: number;
        /**
         * The number of samples taken in each of the two passes of the
         * Gaussian blur operation executed when rendering this layer.
         *
         * If unspecified, the value will be `9`.
         */
        blurSamples?: number;
        /**
         * The distance between samples taken during the Gaussian blur operation
         * executed when rendering this layer.
         *
         * The [[BlurIntervalUnit.Pixels]] unit is interpreted based on the
         * dimensions of the current layer, which are half the dimensions
         * of the previous layer (or the source image if this is the first layer).
         *
         * Using `[1, Pixels]` will ensure that each pixel in the previous layer
         * contributes to the current layer, but will cause the bloom size to
         * be dependent on the canvas size. It may therefore be advisable to adjust
         * the interval using [[BlurIntervalUnit.Pixels]] and translate it
         * to one of the other units. This has been done for the default settings.
         *
         * If unspecified, the value will be `[1, Pixels]`.
         */
        blurInterval?: [number, BlurIntervalUnit];
    }
    enum BasicUnit {
        unitUnknown = 0,
        unitLength = 1,
        unitMass = 2,
        unitTime = 3,
        unitElectricCurrent = 4,
        unitThermoTemperature = 5,
        unitSubstanceAmount = 6,
        unitLuminosityIntensity = 7,
        unitPlaneAngle = 8,
        unitSolidAngle = 9,
        unitFrequency = 10,
        unitForce = 11,
        unitPressure = 12,
        unitEnergy = 13,
        unitPower = 14,
        unitElectricCharge = 15,
        unitElectromotiveForce = 16,
        unitCapacitance = 17,
        unitElectricResistance = 18,
        unitElectricConductance = 19,
        unitMagneticFlux = 20,
        unitMagneticFluxDensity = 21,
        unitInductance = 22,
        unitLuminousFlux = 23,
        unitIlluminance = 24,
        unitActivityRadionuclide = 25,
        unitKerma = 26,
        unitDoseEquivalent = 27,
        unitCatalyticActivity = 28
    }
    interface UnitElement {
        basicUnit: BasicUnit;
        exponent: number;
        factor: number;
    }
    enum AttributeType {
        Undefined = 0,
        Int = 1,
        Float = 2,
        Time = 3,
        String = 4,
        Ignored = 5
    }
    interface Attribute {
        getType(): AttributeType;
        getTitle(): string;
        getValue(): string;
    }
    class FilteredNodes {
        readonly isInclusive: boolean;
        readonly nodeIds: Set<NodeId>;
        constructor(inclusive: boolean, nodeIds: Set<NodeId>);
    }
    /**
     * Contains a defaultVisibility boolean and visibilityExceptions set of NodeIds.
     * If defaultVisibility is true, the NodeIds represent hidden nodes.
     * If defaultVisibility is false, the NodeIds represent visible nodes.
     */
    class VisibilityState {
        readonly defaultVisibility: boolean;
        readonly visibilityExceptions: Set<NodeId>;
        constructor(defaultVisibility: boolean, nodeIds: Set<NodeId>);
    }
    /**
     * Settings that control the behavior of visual node comparison enabled
     * by [[View.startComparison]].
     */
    interface ComparisonConfig {
        /** The color used for areas covered by the first set of nodes but not the second set. */
        only1Color?: Color;
        /** The color used for areas covered by the second set of nodes but not the first set. */
        only2Color?: Color;
        /** The color used for areas covered by both sets of nodes. */
        sameColor?: Color;
    }
    /**
     * Configuration for all `loadSubtree` functions in the [[Model]] class.
     */
    class LoadSubtreeConfig {
        /**
         * Optional matrix to get multiplied into the net attachment matrix.
         */
        additionalMatrix: Matrix | null;
        /**
         * Controls whether or not missing models are ignored or cause an error.
         */
        allowMissingExternalModels: boolean;
        /**
         * If true, then models are attached with all geometry turned invisible.
         */
        attachInvisibly: boolean;
        /**
         * If true, then external models found in XML files will be implicitly loaded.
         * Otherwise [[Model.requestNodes]] must be called to load the external models.
         */
        implicitlyLoadXmlExternalModels: boolean;
        /**
         * If true CAD views will not be loaded. This can reduce memory consumption
         */
        ignoreCadViews: boolean;
        /**
         * If true filters will not be loaded. This can reduce memory consumption
         */
        ignoreFilters: boolean;
        /**
         * If true layers will not be loaded. This can reduce memory consumption
         */
        ignoreLayers: boolean;
        /**
         * If true generic types (IFC types) will not be loaded. This can reduce memory consumption
         */
        ignoreGenericTypes: boolean;
        /**
         * If true BIM relationships will not be loaded. This can reduce memory consumption
         */
        ignoreBimRelationships: boolean;
        /**
         * Allow `subtreeLoaded` callbacks to be triggered by this load.
         * @hidden
         */
        _allowSubtreeLoadedCallback: boolean;
        copy(): LoadSubtreeConfig;
    }
    /** FileType */
    enum FileType {
        /** User modeller. */
        Unknown = 0,
        /** CATIA modeller. */
        Catia = 2,
        /** CATIA V5 modeller. */
        CatiaV5 = 3,
        /** CADDS modeller. */
        Cadds = 4,
        /** Unigraphics modeller. */
        Unigraphics = 5,
        /** Parasolid modeller. */
        Parasolid = 6,
        /** Euclid modeller. */
        Euclid = 7,
        /** IGES modeller. */
        Iges = 9,
        /** Unisurf modeller. */
        Unisurf = 10,
        /** VDA modeller. */
        Vda = 11,
        /** STL modeller. */
        Stl = 12,
        /** WRL modeller. */
        Wrl = 13,
        /** DXF modeller. */
        Dxf = 14,
        /** ACIS modeller. */
        Acis = 15,
        /** Pro/E modeller. */
        ProE = 16,
        /** STEP modeller. */
        Step = 18,
        /** I-DEAS modeller. */
        Ideas = 19,
        /** JT modeller. */
        Jt = 20,
        /** SolidWorks modeller. */
        Slw = 22,
        /** CGR modeller. */
        Cgr = 23,
        /** PRC modeller. */
        Prc = 24,
        /** XVL modeller. */
        Xvl = 25,
        /** HPGL modeller. */
        Hpgl = 26,
        /** TopSolid modeller. */
        TopSolid = 27,
        /** OneSpace designer modeller. */
        OneSpaceDesigner = 28,
        /** 3DXML modeller. */
        _3dxml = 29,
        /** Inventor modeller. */
        Inventor = 30,
        /** Postscript modeller. */
        PostScript = 31,
        /** PDF modeller. */
        Pdp = 32,
        /** U3D modeller. */
        U3d = 33,
        /** IFC modeller. */
        Ifc = 34,
        /** DWG modeller. */
        Dwg = 35,
        /** DWF modeller. */
        Dwf = 36,
        /** SolidEdge modeller. */
        Se = 37,
        /** OBJ modeller. */
        Obj = 38,
        /** KMZ modeller. */
        Kmz = 39,
        /** COLLADA modeller. */
        Dae = 40,
        /** 3DS modeller. */
        _3ds = 41,
        /** Rhino modeller. */
        Rhino = 43,
        /** XML modeller. */
        Xml = 44,
        /** 3MF modeller. */
        _3mf = 45,
        /** SCS modeller. */
        Scs = 46,
        /** 3DHTML modeller. */
        _3dHtml = 47,
        /** Hsf modeller. */
        Hsf = 48,
        /** GL modeller. */
        Gltf = 49,
        /** Revit modeller. */
        Revit = 50,
        /** FBX modeller. */
        Fbx = 51
    }
    /**
     * Defines the invisible ground plane onto which simple shadows
     * are projected.
     *
     * See [[View.setGroundPlane]].
     */
    interface GroundPlane {
        /** The normal of the plane. */
        normal: Point3;
        /**
         * Any point on the plane. If `undefined`, the plane will be positioned
         * at the furthest extent of the model's bounding box.
         */
        position?: Point3;
        /**
         * If `true`, the model's view axes will affect how the normal is
         * interpreted. A normal of `[0,0,1]` will be aligned with the model's
         * up-vector.
         */
        followViewAxes?: boolean;
    }
    /**
     * Defines the orientation of the image-based lighting environment applied
     * to physically-based materials.
     */
    interface ImageBasedLightingOrientation {
        /**
         * A matrix applied to the environment. An identity matrix orients the
         * environment so that "up" is in the direction of the positive Y-axis.
         */
        matrix: Matrix;
        /**
         * If `true`, the environment will be oriented according to the model's
         * view axes after the matrix is applied.
         */
        followViewAxes?: boolean;
    }
    /**
     * Represents a node's metallic and roughness values when using a metallic roughness shading model.
     */
    interface MetallicRoughnessValue {
        /** Metallic value */
        metallic: number;
        /** Roughness value */
        roughness: number;
    }
    /**
     * Units in which attenuation distances are specified for simple
     * reflections.
     *
     * See [[View.setSimpleReflectionAttenuation]].
     */
    enum SimpleReflectionAttenuationUnit {
        /** World-space units. */
        World = 0,
        /**
         * If this unit is used, distances will be multiplied by the distance
         * from the ground plane to the furthest point on the scene bounding.
         */
        ProportionOfBoundingHeight = 1
    }
    /**
     * Possible modes to use when performing operations which allow for customization of the way the
     * model tree is walked.
     */
    enum TreeWalkMode {
        /**
         * The default tree walk mode which visits every node starting from the root.
         *
         * This mode will work in the general case, but may prove to be less performant when
         * operating on large trees.
         */
        Default = 0,
        /**
         * Perform multiple synchronous walks beginning at each node passed into the function.
         *
         * This optimized mode mode can speed up performance by greatly reducing the amount of nodes
         * that need to be walked for large model trees. Use this mode if the nodes you are
         * operating on are contained in distict subtrees, or primarily leaf nodes.
         *
         * Note that if the input contains nodes which are in the same subtree, but contain
         * conflicting values, this method may produce undesirable results, and the default method
         * should be used instead.
         */
        PerNode = 1
    }
    /** Used to allow different orientations of the floorplan display. */
    enum FloorplanOrientation {
        /** For North-Up, the floorplan rotation is fixed such that north is always facing up. */
        NorthUp = 0,
        /** For Avatar-Up, the avatar rotation is fixed such that it always points up, and the floorplan will
         *  rotate around it. */
        AvatarUp = 1
    }
    /**  Define the IFC relationships type */
    enum RelationshipType {
        ContainedInSpatialStructure = 0,
        Aggregates = 1,
        VoidsElement = 2,
        FillsElement = 3,
        SpaceBoundary = 4,
        ConnectsPathElements = 5,
        Undefined = 6
    }
    /** Type for the relationships ID*/
    type BimId = string;
    interface RelationshipInfo {
        type: RelationshipType;
        relateds: BimId[];
        relatings: BimId[];
    }
}
/** @hidden */
declare namespace Communicator.Internal {
    enum AttachType {
        Direct = 0,
        Indirect = 1
    }
}
declare namespace Communicator.Internal {
    enum CameraFlags {
        None = 0,
        Position = 1,
        Target = 2,
        Up = 4,
        Width = 8,
        Height = 16,
        Projection = 32,
        NearLimit = 64
    }
}
declare namespace Communicator {
    /**
     * Object representing a viewpoint from which the scene can be rendered. More information about using Camera can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/scene_attributes/camera.html).
     */
    class Camera {
        private readonly _position;
        private readonly _target;
        private readonly _up;
        private _width;
        private _height;
        private _projection;
        private _nearLimit;
        private _cameraFlags;
        /** @hidden */
        _clearFlags(): void;
        /** @hidden */
        _getFlags(): Internal.CameraFlags;
        /**
         * Creates a copy of the camera.
         * @returns new object initialized with the current values of this camera
         */
        copy(): Camera;
        /**
         * Sets the camera position
         * @param position the new camera position
         */
        setPosition(position: Point3): void;
        /**
         * gets the camera position
         * @returns the camera position
         */
        getPosition(): Point3;
        /**
         * Sets the camera target
         * @param target the new camera target
         */
        setTarget(target: Point3): void;
        /**
         * gets the camera target
         * @returns the camera target
         */
        getTarget(): Point3;
        /**
         * Sets the camera up vector
         * @param up the new camera up vector
         */
        setUp(up: Point3): void;
        /**
         * gets the camera up vector
         * @returns the camera up vector
         */
        getUp(): Point3;
        /**
         * Sets the camera width
         * @param width the new camera width
         */
        setWidth(width: number): void;
        /**
         * gets the camera width
         * @returns the camera width
         */
        getWidth(): number;
        /**
         * Sets the camera height
         * @param height the new camera height
         */
        setHeight(height: number): void;
        /**
         * gets the camera height
         * @returns the camera width
         */
        getHeight(): number;
        /**
         * Sets the camera projection
         * @param projection the new camera Projection
         */
        setProjection(projection: Projection): void;
        /**
         * gets the camera projection
         * @returns the camera projection
         */
        getProjection(): Projection;
        /**
         * Sets the camera near clipping limit
         * @param nearLimit the new camera near clipping limit
         */
        setNearLimit(nearLimit: number): void;
        /**
         * gets the camera near clipping limit
         * @returns the camera near clipping limit
         */
        getNearLimit(): number;
        /**
         * Returns checks for equality with another camera
         * @param cam the camera to compare against
         */
        equals(cam: Camera): boolean;
        /**
         * Returns checks for equality with another camera with tolerance
         * @param cam the camera to compare against
         * @param tolerance floating point tolerance
         */
        equalsWithTolerance(cam: Camera, tolerance: number): boolean;
        /**
         * Move the camera along a delta
         * @param delta
         */
        dolly(delta: Point3): void;
        /**
         * Finds the intersection point with the camera plane
         * @param point
         * @param view
         */
        getCameraPlaneIntersectionPoint(point: Point2, view: View): Point3 | null;
        /**
         * Returns the camera's view matrix. This matrix places the camera at
         * `<0,0,0>`, with the negative z-axis pointing toward the camera's
         * target and the y-axis in the direction of the camera's up-vector.
         * @param viewer The [[WebViewer]] for which the matrix should be valid.
         */
        getViewMatrix(viewer: WebViewer): Matrix;
        /**
         * Returns the camera's projection matrix.
         * @param viewer The [[WebViewer]] for which the matrix should be valid.
         */
        getProjectionMatrix(viewer: WebViewer): Matrix;
        /**
         * Returns the camera's projection matrix multiplied by its view matrix.
         * @param viewer The [[WebViewer]] for which the matrix should be valid.
         */
        getFullMatrix(viewer: WebViewer): Matrix;
        /**
         * Returns the transpose of the camera's view matrix without the
         * translation component and with the x- and z- axes flipped.
         * See [[getViewMatrix]].
         * @deprecated
         */
        getMatrixFromCamera(): Matrix;
        /**
         * Creates a new camera object with the given parameters.
         * @param pos the camera position.
         * @param tar the camera target.
         * @param up the camera up vector.
         * @param projection the camera projection mode.
         * @param width camea view width.
         * @param height camera view height.
         * @param nearLimit the camera near limit.
         * @returns a new camera object.
         */
        static create(pos: Point3, tar: Point3, up: Point3, projection: Projection, width: number, height: number, nearLimit?: number): Camera;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[Camera]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any): Camera;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any): Camera;
        transform(matrix: Matrix): Camera;
    }
}
declare namespace Communicator {
    /**
     * Main interface into the cutting functionality of the viewer. The object manages a number of individual CuttingSections which can be activated individually.
     */
    class CuttingManager {
        private readonly _viewer;
        private readonly _model;
        private readonly _callbackManager;
        private readonly _engine;
        private readonly _cuttingSections;
        private _cuttingLimits?;
        private _isInit;
        private _standinGeometryPickable;
        private _cappingFaceColor;
        private _cappingLineColor;
        private _cappingIdleCallbackEnabled;
        private _cappingIdlePromise;
        private _conservativeIsCappingIdle;
        /** @hidden */
        constructor(viewer: WebViewer, model: Model, callbackManager: Internal.CallbackManager, engine: Internal.ScEngine);
        /**
         * generates reference geometry for a cutting plane.
         * @param axis axis for reference geometry.
         * @param modelBounding modelBounding for geometry size.
         */
        createReferenceGeometryFromAxis(axis: Axis, modelBounding: Box): Point3[];
        /**
         * Uses a selection normal and position to create reference geometry for a cutting plane.
         * @param normal face normal.
         * @param position face position.
         * @param modelBounding model bounding for geometry size.
         */
        createReferenceGeometryFromFaceNormal(normal: Point3, position: Point3, modelBounding: Box): Point3[];
        /**
         * Activates all cutting sections, and restores any planes contained to the scene.
         */
        activateCuttingSections(): Promise<void>;
        /**
         * Removes all cutting planes and cutting plane geometry from the scene.
         * @param clearSections if true, removes all cutting planes contained in cutting sections.
         * @deprecated Use [[deactivateAllCuttingSections]] or [[clearAllCuttingSections]] instead.
         */
        deactivateCuttingSections(clearSections?: boolean): Promise<void>;
        /**
         * Deactivates all cutting sections.
         * Cutting planes are not removed from section and can be restored using [[activateCuttingSections]]
         */
        deactivateAllCuttingSections(): Promise<void>;
        /**
         * Clears all cutting sections.
         * This causes all cutting sections to be deactivated and all their cutting planes removed.
         */
        clearAllCuttingSections(): Promise<void>;
        /**
         * Sets the color for all cutting plane reference geometry.
         * @param color
         */
        setCuttingPlaneColor(color: Color): DeprecatedPromise;
        /**
         * Sets the color to be used for capping geometry faces. If null is passed in as the color object, no capping face will be shown.
         * @param color color to use for capping geometry faces.
         */
        setCappingFaceColor(color: Color | null): DeprecatedPromise;
        /**
         * Gets the color used for capping geometry faces.
         * @returns color used for capping geometry faces.
         */
        getCappingFaceColor(): Color | null;
        /**
         * Sets the color to be used for capping geometry lines. If null is passed in as the color object, no capping line will be shown.
         * @param color color to use for capping geometry lines.
         */
        setCappingLineColor(color: Color | null): DeprecatedPromise;
        /**
         * Gets the color used for capping geometry lines.
         * @returns color used for capping geometry lines.
         */
        getCappingLineColor(): Color | null;
        /**
         * Gets a cutting section by index. Cutting sections are created automatically by the system and may be queried at any point during or after the sceneReady callback has been triggered.
         * @returns the cutting section for the given index.
         */
        getCuttingSection(index: number): CuttingSection | null;
        /**
         * Gets the total number of planes supported by each cutting section.
         * Cutting planes contained in the same cutting section will work together (an object is only cut if all cutting planes in a section would cut it).
         * Cutting planes in separate cutting sections do not work together when cutting (an object is cut if any one of the cutting sections would cut it).
         * @returns the number of planes each cutting section may contain.
         */
        getCuttingSectionCapacity(): number;
        /**
         * Gets the total number of cutting sections supported by the system.
         * @returns the number of cutting sections supported by the system.
         */
        getCuttingSectionCount(): number;
        /**
         * Gets the cutting section containing the cutting plane with the given node ID. If the supplied node ID is not contained by any cutting section null will be returned.
         * @param nodeId a node ID for cutting plane stand-in geometry.
         * @returns the CuttingSection that contains the plane with the given node id or null if none contain it.
         */
        getCuttingSectionFromNodeId(nodeId: NodeId | null): CuttingSection | null;
        /**
         * Sets whether stand-in geometry for cutting sections should be pickable.
         * If this option is set to false, picking rays will pass though stand-in geometry for cutting planes.
         * The default value is not pickable.
         * @param pickable boolean value indicating whether stand-in geometry should be pickable in the scene.
         */
        setStandinGeometryPickable(pickable: boolean): DeprecatedPromise;
        /**
         * Gets whether stand-in geometry for cutting sections is pickable.
         * @returns boolean value indicating whether stand-in geometry for cutting sections is pickable.
         */
        getStandinGeometryPickable(): boolean;
        /** @hidden */
        _setStandinGeometryVisible(visible: boolean): void;
        /**
         * Sets the delay used by delayCapping() in milliseconds.
         * @param delayInMilliseconds The delay amount.
         */
        setCappingDelay(delayInMilliseconds: number): void;
        /**
         * Delays capping processing by a fixed time interval.
         */
        delayCapping(): void;
        /**
         * Enables or disables activation of "cappingIdle" callback event.
         * @param enable Enables or disables activation of "cappingIdle" callback event.
         * @returns A promise returning whether or not capping generation was idle when this call resolves.
         */
        enableCappingIdleCallback(enable: boolean): Promise<boolean>;
        waitForCappingIdle(): Promise<void>;
        /**
         * Sets whether capping geometry will show.
         * The default value is true.
         * @param cappingGeometryVisibility
         */
        setCappingGeometryVisibility(cappingGeometryVisibility: boolean): DeprecatedPromise;
        /**
         * Gets whether capping geometry will show
         * @returns boolean value indicating whether capping geometry will show
         */
        getCappingGeometryVisibility(): boolean;
        /**
         * @returns the number of active cutting sections.
         */
        getActiveCuttingSectionCount(): number;
        /** @hidden */
        _init(): void;
        /** @hidden */
        _isInitialized(): boolean;
        /**
         * Updates all cutting plane geometry.
         */
        refreshPlaneGeometry(): Promise<void>;
        /**
         * @returns true if there is an active cutting section.
         */
        hasActiveCuttingSection(): boolean;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Removes any cutting planes in the scene, and restores cutting planes from a json object.
         * @param json
         */
        fromJson(json: any): Promise<void>;
        private _gatherStandinGeometryIds;
    }
}
declare namespace Communicator.Internal {
    class DomElements {
        private readonly _container;
        private readonly _canvasContainerElement;
        private readonly _markupSvgElement;
        private readonly _redlineSvgElement;
        private readonly _redlineElement;
        private constructor();
        getCanvasContainerElement(): HTMLDivElement;
        getMarkupSvgElement(): SVGSVGElement;
        getRedlineSvgElement(): SVGSVGElement;
        getRedlineElement(): HTMLDivElement;
        shutdown(): void;
        static createFromElement(container: HTMLElement): DomElements;
        static createFromId(containerId: HtmlId): DomElements | null;
        private static _createSvgElement;
    }
}
interface ObjectConstructor {
    setPrototypeOf(o: any, proto: object | null): any;
}
declare namespace Communicator {
    /**
     * Base error class for all Communicator errors. Extends base Error class as documented [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error).
     * @preferred
     */
    class CommunicatorError extends Error {
        /**
         * Creates a new CommunicatorError
         */
        constructor(message: string);
    }
    /**
     * Error object that is thrown when a user supplies an invalid user data index.
     */
    class InvalidIndexError extends CommunicatorError {
        /**
         * Creates a new InvalidIndexError
         */
        constructor(index: number | string);
    }
    /**
     * Error object that is thrown when a user attempts to pick from a point outside the viewer canvas.
     */
    class PickOutsideCanvasError extends CommunicatorError {
        /**
         * Creates a new PickOutsideCanvasError
         */
        constructor();
    }
    /**
     * Error object that is thrown when an asynchronous selection error occurs.
     * If this error is thrown when beginning a selection, that operation failed to start.
     * If this error is thrown when advancing a selection, the handle is no longer valid.  In this case the operation has already completed.
     */
    class SelectionInvalidatedError extends CommunicatorError {
        /**
         * Creates a new SelectionInvalidatedError
         */
        constructor();
    }
    /**
     * Error object that is thrown when the viewer has entered into an invalid state.
     * This most likely is due to an error in the viewer.  Please reach out to support if you can reliably reproduce this error.
     */
    class InternalLogicError extends CommunicatorError {
        /**
         * Creates a new InternalLogicError
         */
        constructor();
    }
    /**
     * Error object that is thrown when the user passes an non existent NodeId to a function.
     */
    class InvalidNodeIdError extends CommunicatorError {
        /**
         * Creates a new InvalidNodeIdError
         */
        constructor(nodeId: NodeId);
        readonly nodeId: NodeId;
    }
    /**
     * Error object that is thrown when the user passes a node of the incorrect type to a function.
     */
    class InvalidNodeTypeError extends CommunicatorError {
        /**
         * Creates a new InvalidNodeTypeError
         */
        constructor(nodeId: NodeId, expectedTreeType: Internal.Tree.TreeNodeType, ...expectedTreeTypes: Internal.Tree.TreeNodeType[]);
        readonly nodeId: NodeId;
        readonly expectedTypes: NodeType[];
    }
    /**
     * Error object that is thrown when a model could not be loaded.
     * This can be triggered when trying to load a streaming model into an SCS session or vise versa.
     * This error object will also be thrown if an invalid URL is supplied when trying to load a SCS file.
     */
    class LoadError extends CommunicatorError {
        /**
         * Creates a new LoadError
         */
        constructor(message: string);
    }
    /**
     * Error object that is thrown when a model load is initiated during an invalid time such as when the model is currently being reset.
     */
    class LoadCancelledError extends LoadError {
        /**
         * Creates a new LoadCancelledError
         */
        constructor();
    }
    /**
     * Error object that is thrown when an invalid model path is specified when trying to load a model in a network session.
     */
    class MissingModelError extends LoadError {
        /**
         * Creates a new MissingModelError
         */
        constructor(modelPath: string);
    }
    /**
     * Error object that is thrown when invalid data is supplied to a function.
     */
    class ParseError extends CommunicatorError {
        /**
         * Creates a new ParseError
         */
        constructor(message: string);
    }
    /**
     * Error object that is thrown when assembly tree data could not be parsed.
     * This usually indicates an error with Communicator itself. Please reach out to support if you can reliably reproduce this error.
     */
    class AssemblyDataParseError extends ParseError {
        /**
         * Creates a new AssemblyDataParseError
         */
        constructor(message: string);
    }
    /** @deprecated */
    type MetaDataParseError = AssemblyDataParseError;
    /** @deprecated */
    const MetaDataParseError: typeof AssemblyDataParseError;
    /**
     * Error object that is thrown when attempting to parse XML data.
     * This can be thrown in the case of an actual parsing error or a malformed XML file.
     * The error object itself will provide a detailed description of the error.
     */
    class XmlParseError extends ParseError {
        /**
         * Creates a new XmlParseError
         */
        constructor(message: string);
    }
}
declare namespace Communicator {
    /**
     * This class provides an interface to the explode related features of the viewer. More information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/scene_attributes/explode.html).
     */
    class ExplodeManager {
        private readonly _model;
        private readonly _engine;
        private _explodeActive;
        private _explodeMagnitude;
        /** @hidden */
        constructor(model: Model, engine: Internal.ScEngine, callbackManager: Internal.CallbackManager);
        /**
         * Starts an explode operation. This will cancel any currently active explode operation.
         * @param nodeIds an array of NodeId for the parts that should be exploded. If this parameter is omitted or is an empty array, the entire model will be considered for explosion.
         * @param explosionVector the vector to use for the center of the explosion.
         * @returns a promise that resolves when this operation is complete.
         */
        start(nodeIds?: NodeId[], explosionVector?: Point3): Promise<void>;
        /**
         * Sets the explosion magnitude if there is an active explosion operation.
         * A value of 1.0 indicates that the distance between a part's exploded center, and exploded center will be double.
         * @param magnitude the magnitude for the explosion.
         * @returns a promise that resolves when this operation is complete.
         */
        setMagnitude(magnitude: number): Promise<void>;
        /**
         * Terminates any active explode operation.
         * @returns a promise that resolves when this operation is complete.
         */
        stop(): DeprecatedPromise;
        /**
         * Gets the current explode magnitude. This will always return 0 when there is no active explode operation.
         * @returns the current explode magnitude.
         */
        getMagnitude(): number;
        /**
         * Indicates whether there is a currently active explode operation.
         * @returns boolean value indicating if there is an active explode operation.
         */
        getActive(): boolean;
        private _doExplode;
    }
}
declare namespace Communicator {
    /**
     * Allows customization of the [[FloorplanManager]] user interface and functionality.
     */
    class FloorplanConfig {
        /** The [[OverlayAnchor]] for the floorplan overlay window. See [[OverlayManager.setViewport]].
         *  (default: [[OverlayAnchor.LowerRightCorner]]) */
        overlayAnchor: OverlayAnchor;
        /** Determines the size of the overlay. See [[OverlayManager.setViewport]] for an understanding
         *  of how the size and [[OverlayUnit]] values are used. (default: `0.25, 1.0`) */
        overlaySize: Point2;
        /** The [[OverlayUnit]] type for the [[overlaySize]] width. (default: [[OverlayUnit.ProportionOfCanvas]]) */
        overlayWidthUnit: OverlayUnit;
        /** The [[OverlayUnit]] type for the [[overlaySize]] height. (default: [[OverlayUnit.ProportionOfOtherDimension]]) */
        overlayHeightUnit: OverlayUnit;
        /** The X/Y values used with [[OverlayManager.setViewport]]. (default: `0, 0`) */
        overlayOffset: Point2;
        /** The [[OverlayUnit]] type for the [[overlayOffset]] x coordinate. (default: [[OverlayUnit.Pixels]])*/
        overlayOffsetXUnit: OverlayUnit;
        /** The [[OverlayUnit]] type for the [[overlayOffset]] y coordinate. (default: [[OverlayUnit.Pixels]])*/
        overlayOffsetYUnit: OverlayUnit;
        /** Determines the background color of the overlay window. (default: `white`) */
        backgroundColor: Color;
        /** Determines the opacity of the overlay background. Valid values must be in the range `[0, 1]`. (default: `0.25`) */
        backgroundOpacity: number;
        /** Determines the color of the overlay window border. (default: `black`) */
        borderColor: Color;
        /** Determines the opacity of the overlay window border. Valid values must be in the range `[0, 1]`. (default: `1.0`) */
        borderOpacity: number;
        /** Determines the primary color of the avatar shown in the overlay. (default: `Color(255,0,255)`) */
        avatarColor: Color;
        /** Determines the outline color of the avatar shown in the overlay. (default: `black`) */
        avatarOutlineColor: Color;
        /** Determines the opacity of the avatar. Valid values must be in the range `[0, 1]`. (default: `1.0`) */
        avatarOpacity: number;
        /** Determines the scale-factor of the avatar. Valid values must be in the range `[0.1, 10]`. (default: `1.0`) */
        avatarScale: number;
        /**
         * When this is `false`, the avatar size will scale with the floorplan size. For large floorplans, the avatar may appear small.
         * When this is `true`, the avatar will be the same size for all floorplans. (default: `true`)
         */
        fixedAvatarScale: boolean;
        /** Determines the scale of the floorplan within the overlay window in terms of feet-per-pixel. This value
         *  is combined with [[zoomLevel]] to determine the overall display scaling.
         *  The intent is for this value to stay fixed after being set initially, while [[zoomLevel]] is used to
         *  easily change the zoom-level of the overlay */
        overlayFeetPerPixel: number;
        /** Sets the zoom level for the floorplan display. A value of 1.0 is the standard view. Values greater will
         *  zoom-in, while smaller values will zoom-out. Valid values must be in the range `[0.1, 10]`. (default: `1.0`) */
        zoomLevel: number;
        /** Determines the conditions under which the floorplan will be auto-activated. (default: [[FloorplanAutoActivation.BimWalk]]) */
        autoActivate: FloorplanAutoActivation;
        /** Determines the drawing orientation of floorplan and avatar. (default: [[FloorplanOrientation.NorthUp]]) */
        floorplanOrientation: FloorplanOrientation;
        /** Setting this to a valid [[NodeId]] will allow for a custom avatar. To use a custom avatar, consider the following:
         *
         *  - The overlay always draws in orthographic mode with the camera pointing down the Z axis from + to -. The avatar
         *    geometry is therefore assumed to be defined in the X/Y plane, with forward pointing in the positive Y direction.
         *  - The avatar is scaled under the assumption that its units are in feet and the actual camera-eye will
         *    correspond to `0,0,0` within the avatar geometry.
         *  - The [[FloorplanManager]] will take ownership of the custom node. The caller should not try to delete it, ever.
         *  - The custom node will survive across model changes.
         *  - The custom node will survive across any calls to [[deactivate]].
         *  - Any previous custom avatar node will be deleted when a new custom avatar is set.
         *  - Setting this to `null` will restore the default avatar.
         *  - The avatar background and outline colors/opacities will *not* be applied to a custom avatar. The user
         *    must set these manually as needed for any custom avatar. The custom avatar [[NodeId]] will not change and can
         *    thus be maintained by the user for setting node properties as needed.
         *
         * (default: `null`)
         */
        customAvatar: NodeId | null;
        /**
         * Setting this to `true` will move the floorplan with the camera to keep the avatar centered.
         * When this is `false`, the floorplan will stay fixed in place, and the avatar will move.
         */
        trackCameraEnabled: boolean;
        /**
         * Per-floor information.
         * @returns Copy of this configuration object.
         */
        copy(): FloorplanConfig;
    }
    /** Different conditions on which the floorplan can be activated automatically. */
    enum FloorplanAutoActivation {
        /** Never activate the floorplan automatically. */
        Never = 0,
        /** Activate the floorplan when a BIM model is loaded. */
        Bim = 1,
        /** Activate the floorplan if a BIM model is loaded and a walk operator is active. */
        BimWalk = 2
    }
    /**
     * Main interface into the 2D floorplan functionality for the viewer.
     * Can show a 2-dimensional floorplan of a BIM-enabled model. The floorplan display will
     * include an avatar that represents the camera position of the 3D view.
     */
    class FloorplanManager {
        private readonly _viewer;
        private readonly _model;
        private readonly _engine;
        private readonly _modelStructure;
        private readonly _overlayManager;
        private _active;
        private _isSceneReady;
        private _isModelLoaded;
        private _isOverlayVisible;
        private _isCallbacksSet;
        private _onCameraUpdateFunc;
        private _onFrameDrawnFunc;
        private _floorplanNode;
        private _currentFloorInfo;
        private _config;
        private _floorLock;
        private _tightBoundings;
        private readonly _genericStoreyType;
        /** key is floor node */
        private readonly _floorInfos;
        /** This will hold the floorInfos redundantly to _floorInfos. This is really only to support
         *  simple iteration of the floorInfos with early exit ability. (ie. not calling .forEach())
         *  If we move to ES6 output, we can remove this and just  properly iterate the _floorInfos
         *  with for...of
         */
        private readonly _floorInfosArray;
        private _avatarNode;
        private _avatarDirty;
        private _borderNode;
        private _borderDirty;
        private _backgroundNode;
        private _backgroundDirty;
        /** We need to watch for the viewer size changing so we can redo the overlay geometry. */
        private _canvasSize;
        /** The sync queue is used to synchronize the activate/deactivate processes. While we can reasonably expect our users to
         *  properly call activate/deactivate with 'await', we always have the possibility of callbacks happening concurrently. To
         *  best ensure no problems, calls related to activation are thus synchronized */
        private _sync;
        /** Dedicated sync queue for setting the floorplan. This will skip any intervening changes in favor of the most recent */
        private _setFloorplanSync;
        private static readonly _genericStoreyType;
        private static readonly _ifcFloorTypes;
        private static readonly _ifcSpaceTypes;
        /** IFC types that will be used in floorplan mesh generation */
        private static readonly _ifcFloorplanCreationTypes;
        private static readonly _backgroundZ;
        private static readonly _avatarZ;
        private static readonly _borderZ;
        /** @hidden */
        constructor(viewer: WebViewer, model: Model, overlayManager: OverlayManager, engine: Internal.ScEngine, modelStructure: Internal.Tree.ModelStructure, config: FloorplanConfig);
        /** Sets a custom avatar. See [[FloorplanConfig.customAvatar]] for detailed information. */
        setCustomAvatar(customAvatarNodeId: NodeId | null): Promise<void>;
        /** Sets the size of the floorplan overlay window. See [[FloorplanConfig.overlaySize]] for detailed information. */
        setOverlaySize(size: Point2, widthUnits: OverlayUnit, heightUnits: OverlayUnit): Promise<void>;
        /** Sets the anchor position of the floorplan overlay window. See [[FloorplanConfig.overlayAnchor]] for detailed information. */
        setOverlayAnchor(anchor: OverlayAnchor): Promise<void>;
        /** Sets the offset position of the floorplan overlay window. See [[FloorplanConfig.overlayOffset]] for detailed information. */
        setOverlayOffset(offset: Point2): Promise<void>;
        /** Sets the overlay scaling. See [[FloorplanConfig.overlayFeetPerPixel]] for detailed information. */
        setOverlayFeetPerPixel(feetPerPixel: number): Promise<void>;
        /** Sets the overlay zoom level. See [[FloorplanConfig.zoomLevel]] for detailed information. */
        setZoomLevel(zoomLevel: number): Promise<void>;
        /** Sets the overlay background color. See [[FloorplanConfig.backgroundColor]] for detailed information. */
        setBackgroundColor(color: Color): Promise<void>;
        /** Sets the overlay background opacity. See [[FloorplanConfig.backgroundOpacity]] for detailed information. */
        setBackgroundOpacity(opacity: number): Promise<void>;
        /** Sets the overlay border color. See [[FloorplanConfig.borderColor]] for detailed information. */
        setBorderColor(color: Color): Promise<void>;
        /** Sets the overlay border opacity. See [[FloorplanConfig.borderOpacity]] for detailed information. */
        setBorderOpacity(opacity: number): Promise<void>;
        /** Sets the avatar primary color. See [[FloorplanConfig.avatarColor]] for detailed information. */
        setAvatarColor(color: Color): Promise<void>;
        /** Sets the avatar outline color. See [[FloorplanConfig.avatarOutlineColor]] for detailed information. */
        setAvatarOutlineColor(color: Color): Promise<void>;
        /** Sets the avatar opacity. See [[FloorplanConfig.avatarOpacity]] for detailed information. */
        setAvatarOpacity(opacity: number): Promise<void>;
        /** Sets the avatar scale. See [[FloorplanConfig.avatarScale]] for detailed information. */
        setAvatarScale(scale: number): Promise<void>;
        /** Sets the avatar size to fixed scale. See [[FloorplanConfig.fixedAvatarScale]] for detailed information. */
        setFixedAvatarScale(fixedScale: boolean): Promise<void>;
        /** Sets the floorplan tracking mode. See [[FloorplanConfig.trackCameraEnabled]] for detailed information. */
        setTrackCameraEnabled(enabled: boolean): Promise<void>;
        /** Sets the floorplan display orientation. See [[FloorplanConfig.floorplanOrientation]] for detailed information. */
        setFloorplanOrientation(orientation: FloorplanOrientation): Promise<void>;
        /** Sets the auto-activate capability for any models loaded after this call. See [[FloorplanConfig.autoActivate]] for detailed information. */
        setAutoActivate(autoActivate: FloorplanAutoActivation): Promise<void>;
        /** Locks floorplan to current floor such that changing floors will not change the displayed floorplan. */
        setFloorLock(lock: boolean): Promise<void>;
        /** Returns `true` if displayed floor has been locked with [[setFloorLock]]. */
        getFloorLock(): boolean;
        /**
         * Makes floorplans use tight boundings during creation which can result in a better fit for the overlay.
         * This involves recreating any already existing floorplans.
         * This can be significantly more time consuming than using loose boundings if your floors are complex.
         * Defaults to `false`.
         */
        setUseTightBoundings(tightBoundings: boolean): Promise<void>;
        /**
         * Updates the floorplan to use the given configuration. This function allows
         * the user to set all configuration values with a single operation. There are
         * also `set<config-value>()` functions for easily setting individual configuration
         * values.
         *
         * Note that when using this function, all settings in the given configuration are
         * used and thus overwrite any individual settings changed with a prior
         * `set<config-value>()` call.
         *
         * All values from the passed configuration will be copied as part of this operation.
         */
        setConfiguration(config: FloorplanConfig): Promise<void>;
        /** Returns a copy of the current floorplan configuration. */
        getConfiguration(): FloorplanConfig;
        /** Gets the [[NodeId]] of the current storey. */
        getCurrentFloorNodeId(): NodeId | null;
        /** Gets the [[NodeId]] of the floorplan avatar. */
        getAvatarNodeId(): NodeId | null;
        /** Returns `true` if the given point is inside the floorplan overlay and `false` otherwise. */
        insideOverlay(point: Point2): boolean;
        /**
         *  Activate the floorplan overlay.
         */
        activate(): Promise<void>;
        /**
         *  Deactivate the floorplan overlay. Once explicitly deactivated via this call, auto-activation
         *  will be suppressed for any new model that is loaded. Auto-activation can be reenabled by
         *  calling [[setAutoActivate]].
         */
        deactivate(): Promise<void>;
        /**
         * The avatar node needs to be deleted any time we are making changes to the mesh,
         * such as switching to a custom avatar or fixed avatar scale.
         */
        private _deleteAvatarNode;
        /** Perform the steps needed to set a custom avatar. */
        private _doSetCustomAvatar;
        /** Call after something in the configuration has changed. Will update all visuals accordingly */
        private _onConfigurationChanged;
        /** Sets the best floorplan for the given world position */
        private _setFloorplanFromPosition;
        /** Sets what floor the floorplan displays based on position */
        private _doSetFloorplanFromPosition;
        /** This function performs a downward selection and sorts the results by the top of their boundings */
        private _performDownwardSelection;
        /**
         *  Will set the active state appropriately and kick off activation processing
         */
        private _activate;
        /**
         *  Deactivation will remove camera callbacks, hide the overlay, delete floornodes, and any other necessary cleanup
         */
        private _deactivate;
        /**  This will be called anytime a model has loaded... first model, second model, etc. */
        private _onModelLoaded;
        /**
         * When a model is loaded, the active state will be examined and possibly modified here based on the incoming model.
         */
        private _doOnModelLoaded;
        /**
         *  This will activate the floorplan visuals if conditions allow.
         */
        private _doUpdateActivation;
        /**
         *  Deletes all floorplan infos including generated nodes
         */
        private _deleteAllFloorplans;
        /** Hides the currently active floorplan */
        private _hideActiveFloorplan;
        /**
         *  Call when IFC information is available from the model tree. Note that this call can happen multiple
         *  times within a session, thus it must be tolerant of existing data vs new data.
         */
        private _onProcessIfc;
        /**
         */
        private _hasFloorInfo;
        /**
         */
        private _getFloorInfo;
        /**
         * Creates floorplan related information from a floor node
         */
        private _createFloorInfo;
        /**
         *  Find the root floor nodes within the model.
         */
        private _gatherFloorInfos;
        /**
         * Gathers all descendent nodes that have IFC types matching the given IFC types
         */
        private _gatherDescendentIfcNodes;
        /**
         * Creates a floorplan mesh from a FloorInfo object and returns the NodeId of the resulting mesh.
         * Note: This does not attach the created floorplan mesh to the FloorInfo param. That must be done after.
         */
        private _createFloorplanFromFloorInfo;
        /** We need to handle a canvas size updates, so use the frame-drawn callback */
        private _onFrameDrawn;
        /** Updates the overlay camera based on current state */
        private _doCameraUpdate;
        /**
         * Returns `true` if the [[FloorplanManager]] is fully active.
         */
        isActive(): boolean;
        /** Call anytime something in the floorplan overlay might need to change. */
        private _updateOverlay;
        /**
         * Call anytime something in the floorplan overlay might need to change.
         */
        private _updateOverlayNodes;
        /**
         * Moves the camera such that the avatar will appear at the provided point on the overlay.
         * This is only available when the floorplan is not tracking the camera.
         * @param point Point in canvas within overlay
         */
        snapAvatarToPoint(point: Point2): void;
        /** Figure out the pixel size of the overlay window */
        private _getOverlaySizeInPixels;
        /** Get overlay offset in pixels */
        private _getOverlayOffsetInPixels;
        private _getFixedCameraSize;
        /** Updates the camera settings for the overlay. Only update if the floorplan has changed?  */
        private _updateOverlayCamera;
        /**
         * Sets the current floorplan based on the floorNode.
         *
         * @param floorNode A IFC Story node.
         */
        private _setFloorplanFromFloorNode;
        /**
         *  Creates the floorplan overlay
         */
        private _setupOverlay;
        /** Nodes within the the overlay displays aren't honoring their visibility settings. This is a workaround
         *  until that problem is fixed. Since the floorplan is a top-down view, we can just move "hidden" nodes
         *  far enough out of the camera view so they aren't rendered.
         */
        private _hideOverlayNode;
        /** See _hideOverlayNode for workaround description */
        private _showOverlayNode;
        /** Creates a simple node to show the camera-position as an avatar on the overlay */
        private _createAvatar;
        /** Create a 2d line based box. Used for the overlay border & background */
        private _create2dBox;
    }
}
declare namespace Communicator.Settings {
    /**
     * This class controls settings used in hidden line rendering.
     * Settings get applied when `View.setDrawMode(DrawMode.HiddenLine)` is called.
     */
    class HiddenLineSettings {
        private _obscuredLineColor;
        private _obscuredLineOpacity;
        private _visibleLineColor;
        private _visibleLineOpacity;
        private _backgroundColor;
        /**
         * Returns the `Color` used for rendering obscured lines.
         * @returns The color used for obscured lines.
         */
        getObscuredLineColor(): Color;
        /**
         * Sets the `Color` used for rendering obscured lines.
         * @param color The color used for obscured lines.
         */
        setObscuredLineColor(color: Color): void;
        /**
         * Returns the opacity used for rendering obscured lines.
         * @returns The opacity used for obscured lines.
         */
        getObscuredLineOpacity(): number;
        /**
         * @deprecated use [[getObscuredLineOpacity]] instead.
         */
        getObscuredLineTransparency(): number;
        /**
         * Sets the opacity used for rendering obscured lines.
         * @param opacity The opacity used for obscured lines.
         */
        setObscuredLineOpacity(opacity: number): void;
        /**
         * @deprecated use [[setObscuredLineOpacity]] instead.
         */
        setObscuredLineTransparency(transparency: number): void;
        /**
         * Gets the `Color` used for rendering visible lines.
         * @returns The color used for visible lines.
         */
        getVisibleLineColor(): Color;
        /**
         * Sets the `Color` used for rendering visible lines.
         * @param color The color used for visible lines.
         */
        setVisibleLineColor(color: Color): void;
        /**
         * Gets the opacity used for rendering visible lines.
         * @returns The opacity used for visible lines.
         */
        getVisibleLineOpacity(): number;
        /**
         * @deprecated use [[getVisibleLineOpacity]] instead.
         */
        getVisibleLineTransparency(): number;
        /**
         * Sets the opacity used for rendering visible lines.
         * @param opacity The opacity used for visible lines.
         */
        setVisibleLineOpacity(opacity: number): void;
        /**
         * @deprecated use [[setVisibleLineOpacity]] instead.
         */
        setVisibleLineTransparency(transparency: number): void;
        /**
         * Gets the `Color` used for the background in hidden line rendering.
         * @returns The background color used for hidden line.
         */
        getBackgroundColor(): Color;
        /**
         * Sets the `Color` used for the background in hidden line rendering.
         * @param color The background color used for hidden line.
         */
        setBackgroundColor(color: Color): void;
    }
}
/**
 * The Event module exposes UI event listeners for the WebViewer. More information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/operators/operators.html).
 * @preferred
 */
declare namespace Communicator.Event {
    /**
     * Gets whether an EventType is a mouse event type or not.
     * @param eventType EventType to be tested
     * @returns Boolean indicating whether or not eventType is a mouse event type
     */
    function isMouseEventType(eventType: EventType): boolean;
    class InputEvent {
        private _date;
        private _handled;
        /**
         * Gets the handled state of the event
         * @returns whether the event has been handled
         */
        getHandled(): boolean;
        /**
         * Sets the handled state of the event. When an event has been handled it will not propagate any further
         * @param handled Indicates whether this event has been handled.
         */
        setHandled(handled: boolean): void;
        /**
         * Gets the Date this event occurred
         * @returns the event Date
         */
        getDate(): Date;
    }
}
declare namespace Communicator.Event {
    class KeyInputEvent extends InputEvent {
        private _keyCode;
        private _eventType;
        /** @hidden */
        constructor(keyCode: number, _modifiers: number, eventType: KeyInputType);
        /**
         * gets the key code
         * @returns the key code of the event
         */
        getKeyCode(): number;
        /**
         * gets the event type
         * @returns the type of key event
         */
        getEventType(): KeyInputType;
    }
}
declare namespace Communicator.Internal {
    class EventDispatcher {
        private _callbackManager;
        private _contextEventChecker;
        private _operatorManager;
        constructor(callbackManager: CallbackManager, operatorManager: OperatorManager);
        injectMouseDownEvent(x: number, y: number, button: Button, buttons: Buttons, modifiers: KeyModifiers): void;
        injectMouseMoveEvent(x: number, y: number, button: Button, buttons: Buttons, modifiers: KeyModifiers): void;
        injectMouseUpEvent(x: number, y: number, button: Button, buttons: Buttons, modifiers: KeyModifiers): void;
        injectMousewheelEvent(x: number, y: number, delta: number, buttons: Buttons, modifiers: KeyModifiers): void;
        injectKeyDownEvent(keyCode: number, modifiers: KeyModifiers): void;
        injectKeyUpEvent(keyCode: number, modifiers: KeyModifiers): void;
        injectTouchStartEvent(identifier: number, x: number, y: number, buttons: Buttons): void;
        injectTouchMoveEvent(identifier: number, x: number, y: number, buttons: Buttons): void;
        injectTouchEndEvent(identifier: number, x: number, y: number, buttons: Buttons): void;
        injectViewOrientationChangeEvent(): void;
    }
}
declare namespace Communicator {
    class Point2 {
        x: number;
        y: number;
        /**
         * Creates a new point
         * @param {number} x value to set for x
         * @param {number} y value to set for y
         */
        constructor(x: number, y: number);
        /**
         * Sets this point equal to another point
         * @param {Point2} pt the point whose values will be used to set this object
         * @returns {Point2} the point object
         */
        assign(pt: Point2): Point2;
        /**
         * Adds a point to this one
         * @param {Point2} pt the point whose values will be added
         * @returns {Point2} the point object
         */
        add(pt: Point2): Point2;
        /**
         * Subtracts a point from this one
         * @param {Point2} pt the point whose values will be subtracted
         * @returns {Point2} the point object
         */
        subtract(pt: Point2): Point2;
        /**
         * Scales the point by a constant value
         * @param {number} k the value to scale by
         * @returns {Point2} the point object
         */
        scale(k: number): Point2;
        /**
         * Compares this point with another point
         * @param {Point2} pt the point to compare with
         * @returns {Boolean} True if the values of this point equal the other. False otherwise.
         */
        equals(pt: Point2): boolean;
        /**
         * Sets the values of this point
         * @param {number} x value to set for x
         * @param {number} y value to set for y
         * @returns {Point2} the point object
         */
        set(x: number, y: number): Point2;
        /**
         * Creates a copy of this point
         * @returns {Point} Copy of this point
         */
        copy(): Point2;
        /**
         * Returns the length of this point
         * @returns {number} the point length
         */
        length(): number;
        /**
         * Returns the squared length of this vector.
         * @returns Vector squared length.
         */
        squaredLength(): number;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[Point2]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any): Point2;
        /**
         * Subtracts a point from another
         * @param {Point2} pt1 initial point
         * @param {Point2} pt2 the point to subtract
         * @returns {Point2} new point set to pt1 - pt2
         */
        static subtract(pt1: Point2, pt2: Point2): Point2;
        /**
         * Adds two points
         * @param {Point2} pt1 initial point
         * @param {Point2} pt2 the point to add
         * @returns {Point2} new point set to pt1 + pt2
         */
        static add(pt1: Point2, pt2: Point2): Point2;
        /**
         * Scale a point by a constant factor
         * @param {Point2} pt Point to be scaled
         * @param {number} k Amount to scale by
         * @returns {Point2} The scaled point
         */
        static scale(pt: Point2, k: number): Point2;
        /**
         * Calculate distance between two points
         * @param {Point2} p1 first point
         * @param {Point2} p2 second point
         * @returns {number} the distance between p1 and p2
         */
        static distance(p1: Point2, p2: Point2): number;
        /**
         * Creates a point initialized to (0,0)
         * @returns {Point} The new point
         */
        static zero(): Point2;
        static fromPoint3(p: Point3): Point2;
    }
}
declare namespace Communicator.Internal {
    namespace InputMonitor {
        interface Options {
            usePointerEvents?: boolean;
        }
    }
    class InputMonitor {
        private static _activeEventDispatcher;
        private static _activeEventDispatcherLocked;
        private static _activeOffset;
        private readonly _eventDispatcher;
        private readonly _timeoutMonitor;
        private readonly _isIE;
        private readonly _isFirefox;
        private _canvas;
        private _document;
        private _canvasEventFunctions;
        private _documentEventFunctions;
        private _pointerEventsEnabled;
        private _processInput;
        private _eventsBound;
        private _dragStarted;
        private _captureInput;
        private readonly _elementOffset;
        private _pointerUp;
        private _buttons;
        constructor(eventDispatcher: EventDispatcher, timeoutMonitor: TimeoutMonitor);
        private _tryLockEventDispatcher;
        private _unlockEventDispatcher;
        shutdown(): void;
        setDocument(doc: Document): void;
        setOptions(options: InputMonitor.Options): void;
        elementResize(): void;
        setPointerEventsEnabled(enabled: boolean): void;
        getPointerEventsEnabled(): boolean;
        private _browserSupportsPointerEvents;
        private _usePointerEvents;
        private _calculateElementOffset;
        private _initDocumentEvents;
        private _initCanvasEvents;
        bindEvents(canvasContainer: HTMLDivElement): void;
        private _bindDocumentEvent;
        private _bindCanvasEvent;
        private _unbindDocumentEvents;
        private _unbindCanvasEvents;
        unbindEvents(): void;
        private _convertEventCoordsToTargetCoords;
        focusInput(focus: boolean): void;
        private _setButtons;
        private _processMouseDown;
        private _processMouseMove;
        private _processMouseUp;
        private _processMousewheel;
        private _processDocumentMouseMove;
        private _processDocumentMouseUp;
        private _processMouseLeave;
        private _processMouseEnter;
        private _isFunctionKey;
        private _processKeyDownEvent;
        private _processKeyUpEvent;
        private _processTouchStart;
        private _processTouchMove;
        private _processTouchEnd;
        private _processPointerDown;
        private _processPointerMove;
        private _processPointerUp;
        private _processPointerEnter;
        private _processPointerLeave;
        private _processDocumentPointerMove;
        private _processDocumentPointerUp;
        private _getEventModifiers;
    }
}
declare namespace Communicator {
    /**
     * Specifies how a light affects the scene. See [[Light]].
     */
    enum LightType {
        /**
         * Approximates a distant light source like the sun. The light's
         * position is interpreted as a vector pointing *toward* the light
         * rather than a point inside the scene. Light will hit every point
         * in the scene from that direction.
         */
        Directional = 0
    }
    /**
     * Specifies the space in which a light's position is defined. See [[Light]].
     */
    enum LightSpace {
        /** World space. */
        World = 0,
        /**
         * Camera space. Specifying light positions in this space will cause
         * them to follow the camera.
         */
        Camera = 1
    }
    /**
     * Contains properties of a light. More information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/scene_attributes/lights.html).
     */
    class Light {
        /** The light's type. */
        type: LightType;
        /** The space in which the light's position is defined. */
        space: LightSpace;
        /**
         * The light's position in the scene. See [[LightType.Directional]]
         * for information on how the position is interpreted for directional
         * lights.
         */
        position: Point3;
        /** The light's color. */
        color: Color;
        /**
         * @param type The light's type. See [[type]].
         * @param space The space in which a light is defined. See [[space]]
         * @param position The light's position. See [[position]].
         * @param color The light's color. See [[color]].
         */
        constructor(type: LightType, space: LightSpace, position: Point3, color: Color);
    }
}
declare namespace Communicator {
    /**
     * The markup manager exports JSON data for markup in the scene. By default, it will export "views", "notes", "measurement", and "lines".
     * To add a custom markup class to be exported and imported along with other markup items, you can register a custom markup type manager.
     *
     * The custom markup manager needs two functions:
     * - exportMarkup creates an array of JSON markup data.
     * - loadData takes an array of JSON markup data and creates markup items.
     */
    class MarkupTypeManager {
        /**
         * @returns JSON Array containing markup data.
         */
        exportMarkup(): Object[];
        /**
         * Loads JSON markup data
         * @param jsonData JSON Array containing markup data.
         */
        loadData(jsonData: any[]): Promise<boolean[]>;
    }
}
declare namespace Communicator {
    /**
     * This class provides an interface to 3D line management related functions of the viewer.
     */
    class LineManager extends MarkupTypeManager {
        private readonly _viewer;
        private readonly _callbackManager;
        private readonly _markupArray;
        /** @hidden */
        constructor(viewer: WebViewer, callbackManager: Internal.CallbackManager);
        /**
         * Adds a new Line to the Line Manager
         * @param lineItem LineMarkup Object that will be added
         */
        addLine(lineItem: Markup.Line.LineMarkup): Promise<void>;
        /**
         * Removes an existing line item.
         * @param lineItem the line item to remove.
         */
        removeLine(lineItem: Markup.Line.LineMarkup): Promise<void>;
        /**
         * Removes all line items.
         */
        removeAllLines(): Promise<void>;
        /**
         * Return an array of line items.
         * @returns array of all line items.
         */
        getAllLines(): Markup.Line.LineMarkup[];
        /**
         * Removes the most recently added line item.
         */
        removeLastLine(): Promise<void>;
        /**
         * Gets a line markup item associated with a node id.
         * @param id
         */
        getLineByNodeId(id: number): Markup.Line.LineMarkup | null;
        /**
         * @returns JSON Array with line markup
         */
        exportMarkup(): Object[];
        private _handleLoadLine;
        /**
         * Loads JSON markup data
         * @param lineData
         * @param viewer
         */
        loadData(lineDataJson: any[]): Promise<boolean[]>;
    }
}
declare namespace Communicator {
    interface MarkupData {
        [key: string]: Object[];
    }
    /**
     * This class provides an interface into working with markup in the viewer. More information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/markup/markup-basics.html).
     */
    class MarkupManager {
        private readonly _viewManager;
        private readonly _itemManager;
        private readonly _noteTextManager;
        private readonly _measurementManager;
        private readonly _lineManager;
        private readonly _renderer;
        private readonly _viewer;
        private readonly _domElements;
        private readonly _callbackManager;
        private readonly _sheetManager;
        private readonly _markupTypeMap;
        /** @hidden */
        constructor(domElements: Internal.DomElements, measurementManager: MeasureManager, lineManager: LineManager, callbackManager: Internal.CallbackManager, sheetManager: SheetManager, noteTextManager: Markup.Note.NoteTextManager, viewer: WebViewer);
        /** @hidden */
        private static deprecated;
        /**
         * Registers a MarkupTypeManager to add markup to exported data.
         * @param markupTypeManager
         */
        registerMarkupTypeManager(markupType: string, markupTypeManager: MarkupTypeManager): void;
        /**
         * Creates a new view based on the current camera, line, and face visibility values.
         * @param name optional name for the view. If omitted or null, the system will generate a default name
         * @param triggerEvent optional parameter indicating whether a [[CallbackMap.viewCreated]] event should be triggered. This parameter defaults to true
         * @param visibilityState optional parameter
         * @returns Unique identifier for the new view
         */
        createMarkupView(name?: string, triggerEvent?: boolean, visibilityState?: VisibilityState | null, colorMap?: Map<NodeId, Color> | null, snapshotImage?: HTMLImageElement | null): Uuid;
        /**
         * Gets a [[MarkupView]] object from the viewer.
         * @param uniqueId the handle for the view object to retreive
         * @returns [[MarkupView]] object for the corresponding ID or null if no view was found
         */
        getMarkupView(uniqueId: Uuid): Markup.MarkupView | null;
        /**
         * @returns an array of string keys for all markup views
         */
        getMarkupViewKeys(): Uuid[];
        /**
         * Activates a [[MarkupView]].
         * @param uniqueId the handle for the [[MarkupView]] object to activate
         * @param duration the time in milliseconds for the transition to this view
         */
        activateMarkupViewWithPromise(uniqueId: Uuid, duration?: number): Promise<boolean>;
        /** @deprecated Use [[activateMarkupViewWithPromise]] instead. */
        activateMarkupView(uniqueId: Uuid, duration?: number): boolean;
        /**
         * Returns the currently active [[MarkupView]].
         * @returns [[MarkupView]] object for the currently active view, or null if no view is active
         */
        getActiveMarkupView(): Markup.MarkupView | null;
        /**
         * Deletes a [[MarkupView]] object.
         * @param uniqueId the handle for the view object to delete
         * @returns true if a [[MarkupView]] with the supplied uniqueId was deleted, false otherwise
         */
        deleteMarkupView(uniqueId: Uuid): boolean;
        /**
         * Registers a [[MarkupItem]] to be rendered with the 3D view.
         * @param markupItem the item to register
         * @returns unique handle to this [[MarkupItem]].
         */
        registerMarkup(markupItem: Markup.MarkupItem): Uuid;
        /**
         * Unregisters a [[MarkupItem]]. It will no longer be rendered with the 3D view.
         * @param uniqueId unique handle to the object that was returned from [[registerMarkup]]
         */
        unregisterMarkup(uniqueId: Uuid): void;
        /**
         * Add an HTML element to the markup element layer. The element will have its ID set to a system generated unique identifier.
         * @param element the HTML Element to add
         * @returns system generated unique identifier which is the id of the passed in object
         */
        addMarkupElement(element: HTMLElement): Uuid;
        /**
         * Removes a markup element from the markup element layer
         * @param uniqueId unique handle to the object that was returned from [[registerMarkup]]
         */
        removeMarkupElement(id: Uuid): void;
        /**
         * Redraws the markup without rendering the scene. Useful when markup is added or removed but the scene is not affected.
         */
        refreshMarkup(): void;
        updateLater(): void;
        /**
         * Picks a [[MarkupItem]]. Tests scene based and markup attached to the active view (if any)
         * @param point position to pick against
         * @returns [[MarkupItem]] that was selected or null if none was picked
         */
        pickMarkupItem(point: Point2): Markup.MarkupItem | null;
        /**
         * Gets the pick tolerance in pixels for picking a [[MarkupItem]]
         * @returns Current tolerance
         */
        getPickTolerance(): number;
        /**
         * Sets the pick tolerance in pixels for picking a [[MarkupItem]]
         * @param tolerance The new tolerance
         */
        setPickTolerance(tolerance: number): void;
        /**
         * Selects a [[MarkupItem]]. Pass null to clear the selection.
         * @param markupItem The [[MarkupItem]] to select.
         */
        selectMarkup(markupItem: Markup.MarkupItem | null): void;
        /**
         * Returns the currently selected [[MarkupItem]], or null if nothing is currently selected
         * @returns selected [[MarkupItem]]
         */
        getSelectedMarkup(): Markup.MarkupItem | null;
        /**
         * export markup from the viewer
         * @returns Serialized markup objects
         */
        exportMarkup(): MarkupData;
        /**
         * Loads markup data into the viewer.
         * @param data markup data to be loaded into the viewer
         */
        loadMarkupData(json: string | MarkupData): Promise<boolean>;
        private _loadMarkupData;
        /**
         * Returns a the interface to the [[MarkupRenderer]].
         * @returns [[MarkupRenderer]] interface
         */
        getRenderer(): Markup.MarkupRenderer;
        /** @hidden */
        _shutdown(): void;
        /** @hidden */
        _update(): void;
        /** @hidden */
        _setActiveMarkupView(markupView: Markup.MarkupView | null): Promise<void>;
        /** @hidden */
        _getItemManager(): Internal.MarkupItemManager;
    }
}
declare namespace Communicator {
    /**
     * This class provides an interface to measurement management related functions of the viewer.
     */
    class MeasureManager extends MarkupTypeManager {
        private readonly _callbackManager;
        private readonly _markupArray;
        /** @hidden */
        protected readonly _viewer: WebViewer;
        private readonly _color;
        private readonly _edgeColor;
        /** @hidden */
        constructor(viewer: WebViewer, callbackManager: Internal.CallbackManager);
        /**
         * Adds a new Measurement to the Measure Manager
         * @param measurementItem MeasureMarkup Object that will be added
         */
        addMeasurement(measureItem: Markup.Measure.MeasureMarkup): Uuid;
        /**
         * Triggers a measurementCreated callback
         * @param measureItem
         * @param triggerEvent boolean trigger a callback event
         */
        finalizeMeasurement(measureItem: Markup.Measure.MeasureMarkup): void;
        /**
         * Removes an existing measurement item.
         * @param measurementItem the measurement item to remove.
         */
        removeMeasurement(measureItem: Markup.Measure.MeasureMarkup): void;
        /**
         * Removes all measurement items.
         */
        removeAllMeasurements(): void;
        /**
         * Return an array of measurement items.
         * @returns array of all measurement items.
         */
        getAllMeasurements(): Markup.Measure.MeasureMarkup[];
        /**
         * Removes the most recently added measurement item.
         */
        removeLastMeasurement(): void;
        /**
         * Sets the current measurement color.
         * @param color the measurement color to set.
         */
        setMeasurementColor(color: Color): void;
        /**
         * Gets the current measurement color.
         * @returns color current measurement color.
         */
        getMeasurementColor(): Color;
        /**
         * Sets the current measurement edge color.
         * @param color the measurement edge color to set.
         */
        setMeasurementEdgeColor(color: Color): void;
        /**
         * Gets the current measurement edge color.
         * @returns color current measurement edge color.
         */
        getMeasurementEdgeColor(): Color;
        /**
         * @returns JSON Array with measurement markup
         */
        exportMarkup(): Object[];
        private _handleLoadMeasurement;
        /**
         * Loads JSON markup data
         * @param measurementData
         * @param viewer
         */
        loadData(measurementDataJson: any[]): Promise<boolean[]>;
    }
}
declare namespace Communicator {
    /**
     * Object which represents geometry data which will be inserted into the scene at run time.
     * For performance reasons, it is not recommended to create meshes with large amounts of data on the client side as certain optimizations are not available to geometry inserted this way.
     *
     * More information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/geometry/meshes.html).
     */
    class MeshData {
        private readonly _faceMeshData;
        private readonly _pointMeshData;
        private readonly _polylineMeshData;
        private _faceWinding;
        private _backfacesEnabled;
        private _isManifold;
        /**
         * Adds face data to the mesh. Note that the arrays passed into this function are not copied and should remain unchanged until the mesh has been created.
         * When adding vertex data into the mesh using this method, it is important to note that the data is interpreted as triangles in which each vertex must be explicitly enumerated.
         * @param vertexData floating point data describing the points in space for the faces to be added to the mesh
         * @param normalData normals for the corresponding vertex data points.
         * @param rgba32data colors for the corresponding vertex data points (four bytes per rbga).
         * @param uvs texture parameters for the corresponding vertex data points.
         * @param bits bitmask associated with the face.
         */
        addFaces(vertexData: Float32Array | number[], normalData?: Float32Array | number[], rgba32data?: Uint8Array | number[], uvs?: Float32Array | number[], bits?: number): void;
        /**
         * Adds point data to the mesh. Note that the arrays passed into this function are not copied and should remain unchanged until the mesh has been created.
         * @param pointData floating point data describing the points to be added to the mesh
         * @param rgba32data colors for the corresponding vertex data points (four bytes per rbga).
         * @param bits bitmask associated with the point.
         */
        addPoints(pointData: Float32Array | number[], rgba32data?: Uint8Array | number[], bits?: number): void;
        /**
         * Adds polyline data to the mesh.Note that the arrays passed into this function are not copied and should remain unchanged until the mesh has been created.
         * @param polylineData floating point data describing the polyline to be added to the mesh
         * @param rgba32data colors for the corresponding vertex data points (four bytes per rbga).
         * @param bits bitmask associated with the line.
         */
        addPolyline(polylineData: Float32Array | number[], rgba32data?: Uint8Array | number[], bits?: number): void;
        /**
         * Removes all data from the object.
         */
        clear(): void;
        /**
         * Sets the face winding to be used for this mesh. The default value is CounterClockwise.
         * @param faceWinding the face winding to use for mesh geometry.
         */
        setFaceWinding(faceWinding: FaceWinding): void;
        /**
         * Gets the face winding used for this mesh.
         */
        getFaceWinding(): FaceWinding;
        /**
         * Sets whether backfaces should be enabled for this geometry. The default value is false.
         * Setting this to true for geometry with a large amount of faces may affect performance.
         * @param backfacesEnabled indicated whether backfaces should be enabled for this geometry.
         */
        setBackfacesEnabled(backfacesEnabled: boolean): void;
        /**
         * Gets whether backfaces are enabled for this geometry
         * @returns value indicting whether backfaces are enabled for this geometry.
         */
        getBackfacesEnabled(): boolean;
        /**
         * Sets whether the mesh is a manifold one or not (if the mesh is not set as manifold, then capping won't happen while cutting).
         * @param isManifold indicated whether or not it's a manifold mesh.
         */
        setManifold(isManifold: boolean): void;
        /**
         * Gets if the mesh is set as manifold.
         * @returns value indicating whether or not it's a manifold mesh.
         */
        isManifold(): boolean;
        /** @hidden */
        _getFaceData(): Internal.FaceMeshData[];
        /** @hidden */
        _getPointData(): Internal.PointMeshData[];
        /** @hidden */
        _getPolylineData(): Internal.PolylineMeshData[];
    }
    /**
     * Object representing a Mesh instance that will be created by the client at run time.
     * This class allows for the specification of instance specific properties of a mesh.
     */
    class MeshInstanceData {
        private _meshId;
        private _matrix;
        private _faceColor;
        private _lineColor;
        private _pointColor;
        private _instanceName;
        private _faceOpacity;
        private _lineOpacity;
        private _pointOpacity;
        private _creationFlags;
        private _overlayIndex;
        /**
         * Creates a new MeshInstanceData object.
         * @param meshId the [[MeshId]] of the mesh to instantiate
         * @param matrix a matrix that will be applied to this instance
         * @param instanceName a name that will be visible when querying the model hierarchy
         * @param faceColor the color for faces of this instance
         * @param lineColor the color for lines of this instance
         * @param pointColor the color for points of this instance
         * @param creationFlags additional options that can be used to alter the behavior of this instance
         */
        constructor(meshId?: MeshId | null, matrix?: Matrix | null, instanceName?: string | null, faceColor?: Color | null, lineColor?: Color | null, pointColor?: Color | null, creationFlags?: MeshInstanceCreationFlags | null);
        /**
         * Creates a copy of this MeshInstanceData.
         * @returns Copy of this MeshInstanceData object.
         */
        copy(): MeshInstanceData;
        /**
         * Resets all fields of this object.
         */
        clear(): void;
        /**
         * Gets the [[MeshId]] of the mesh to use for this instance.
         * [[MeshId]]s are created with [[Model.createMesh]] or retrieved with [[Model.getMeshIds]].
         * @returns the mesh ID to use for this instance.
         */
        getMeshId(): MeshId | null;
        /**
         * @deprecated Use [[getMeshId]] instead
         */
        getMeshKey(): MeshId | null;
        /**
         * Sets the [[MeshId]] of the mesh to use for the instance.
         * [[MeshId]]s are created with [[Model.createMesh]] or retrieved with [[Model.getMeshIds]].
         * @param meshId the [[MeshId]] to use.
         */
        setMeshId(meshId: MeshId): void;
        /**
         * @deprecated use [[setMeshId]] instead
         */
        setMeshKey(meshId: MeshId): void;
        /**
         * Gets the matrix to apply to this instance.
         * @returns the current matrix that will be applied to this instance upon creation.
         */
        getMatrix(): Matrix | null;
        /**
         * Gets the mesh instance creation flags (SuppressCameraScale, DoNotExplode, DoNotLight...)
         * @returns the mesh instance creation flags (null if none set)
         */
        getCreationFlags(): MeshInstanceCreationFlags;
        /**
         * Sets the mesh instance creation flags (SuppressCameraScale, DoNotExplode, DoNotLight...)
         * @param flags creation flags
         */
        setCreationFlags(flags: MeshInstanceCreationFlags): void;
        /**
         * Sets the matrix that will be applied to this instance.
         * @param matrix the matrix to apply.
         */
        setMatrix(matrix: Matrix): void;
        /**
         * Gets the name that will be applied to the instance.
         * @returns the instance name.
         */
        getInstanceName(): string | null;
        /**
         * Sets the name that will be assigned to this instance. This name will be visible when querying the model hierarchy.
         * @param instanceName the name to assign to this instance.
         */
        setInstanceName(instanceName: string): void;
        /**
         * Sets the color for face elements in this instance.
         * @param faceColor the color to apply to face elements.
         */
        setFaceColor(faceColor: Color): void;
        /**
         * Gets the color for face elements in this instance.
         * @returns the color for face elements.
         */
        getFaceColor(): Color | null;
        /**
         * Sets the color for line elements in this instance.
         * @param lineColor the color to apply to line elements.
         */
        setLineColor(lineColor: Color): void;
        /**
         * Gets the color for line elements in this instance.
         * @returns the color for line elements.
         */
        getLineColor(): Color | null;
        /**
         * Sets the color for point elements in this instance.
         * @param pointColor the color to apply to point elements.
         */
        setPointColor(pointColor: Color): void;
        /**
         * Gets the color for point elements in this instance.
         * @returns the color for point elements.
         */
        getPointColor(): Color | null;
        /**
         * Sets the point opacity for this instance.
         * @param pointOpacity opacity value to set.
         */
        setPointOpacity(pointOpacity: number): void;
        /**
         * Gets the point opacity value for this instance.
         * @returns the point opacity value for this instance.
         */
        getPointOpacity(): number;
        /**
         * Sets the line opacity for this instance.
         * @param lineOpacity opacity value to set.
         */
        setLineOpacity(lineOpacity: number): void;
        /**
         * Gets the line opacity value for this instance.
         * @returns the line opacity value for this instance.
         */
        getLineOpacity(): number;
        /**
         * Sets the face opacity for this instance.
         * @param faceOpacity opacity value to set.
         */
        setOpacity(faceOpacity: number): void;
        /** @deprecated use [[setOpacity]] instead. */
        setTransparency(transparency: number): void;
        /**
         * Gets the face opacity value for this instance.
         * @returns the face opacity value for this instance.
         */
        getOpacity(): number;
        /** @deprecated use [[getOpacity]] instead. */
        getTransparency(): number;
        /**
         * Sets the overlay index for this instance.
         * @param overlayIndex overlay index to set.
         */
        setOverlayIndex(overlayIndex: OverlayIndex): void;
        /**
         * Gets the overlay index for this instance.
         * @returns the overlay index for this instance.
         */
        getOverlayIndex(): OverlayIndex;
    }
}
declare namespace Communicator.Internal {
    class FaceMeshData {
        vertexData: Float32Array | number[];
        normalData?: Float32Array | number[];
        rgba32data?: Uint8Array | number[];
        uvData?: Float32Array | number[];
        bits: number;
        constructor(vertexData: Float32Array | number[], normalData?: Float32Array | number[], rgba32data?: Uint8Array | number[], uvData?: Float32Array | number[], bits?: number);
    }
    class PolylineMeshData {
        vertexData: Float32Array | number[];
        rgba32data?: Uint8Array | number[];
        bits: number;
        constructor(vertexData: Float32Array | number[], rgba32data?: Uint8Array | number[], bits?: number);
    }
    class PointMeshData {
        vertexData: Float32Array | number[];
        rgba32data?: Uint8Array | number[];
        bits: number;
        constructor(vertexData: Float32Array | number[], rgba32data?: Uint8Array | number[], bits?: number);
    }
}
declare namespace Communicator {
    /**
     * The data for a single vertex in a [[MeshDataCopy]], returned by a [[MeshDataCopyIterator]].
     */
    interface MeshDataCopyVertex {
        /**
         * The vertex's 3-dimensional position.
         */
        position: number[];
        /**
         * The vertex's 3-dimensional normal, if available.
         */
        normal?: number[];
        /**
         * The vertex's 2-dimensional texture coordinates, if available.
         */
        UV?: number[];
        /**
         * The color of the vertex in RGBA format, if available. Possible values are integers 0-255.
         */
        RGBA?: number[];
    }
    /**
     * An iterator over the vertices of a [[MeshDataCopyElement]] or [[MeshDataCopyElementGroup]].
     */
    interface MeshDataCopyIterator {
        /**
         * @returns `false` if a call to [[next]] will return a vertex, or `true` if a call to [[next]] will return `undefined`.
         */
        done(): boolean;
        /**
         * @returns The next vertex in the element or element group, or `undefined` if iteration has completed.
         */
        next(): MeshDataCopyVertex;
        /**
         * Continue iteration from a particular index.
         * @param index the index from which to iterate
         */
        goTo(index: number): void;
    }
    /**
     * Provides access to mesh data of a single face, line, or point element in a [[MeshDataCopyElementGroup]].
     *
     * This object additionally supports the ECMAScript 2015 **iterable** protocol and therefore can be iterated over using a `for..of` loop.
     */
    interface MeshDataCopyElement {
        /**
         * The number of vertices in this element.
         */
        vertexCount: number;
        /**
         * The selection filter bits supplied for this element.
         */
        bits: number;
        /**
         * @returns An iterator over the vertices in this element.
         */
        iterate(): MeshDataCopyIterator;
    }
    /**
     * Provides access to all data of a particular type (faces, lines or points) within a [[MeshDataCopy]].
     *
     * This object additionally supports the ECMAScript 2015 **iterable** protocol and therefore can be iterated over using a `for..of` loop.
     */
    interface MeshDataCopyElementGroup {
        /**
         * The total number of vertices in all elements in this group.
         */
        vertexCount: number;
        /**
         * Whether the vertices in this element group have normals.
         */
        hasNormals: boolean;
        /**
         * Whether the vertices in this element group have texture coordinates.
         */
        hasUVs: boolean;
        /**
         * Whether the vertices in this element group have colors.
         */
        hasRGBAs: boolean;
        /**
         * The number of elements in this group.
         */
        elementCount: number;
        /**
         * @returns An iterator over all the vertices in all the elements in this group.
         */
        iterate(): MeshDataCopyIterator;
        /**
         * Provides access to mesh data of a single element. Throws `RangeError` if `index` is invalid.
         * @param index the element's index
         */
        element(index: number): MeshDataCopyElement;
    }
    /**
     * A self-contained copy of the data of a single mesh. The data is part of this object and is not managed by Communicator.
     */
    interface MeshDataCopy {
        /**
         * Provides access to the mesh's face data.
         */
        faces: MeshDataCopyElementGroup;
        /**
         * Provides access to the mesh's line data. Line data is represented as a list of individual line segments and not polylines.
         */
        lines: MeshDataCopyElementGroup;
        /**
         * Provides access to the mesh's point data.
         */
        points: MeshDataCopyElementGroup;
        /**
         * Whether or not the mesh data is two-sided. Backface culling is disabled for two-sided meshes.
         */
        isTwoSided: boolean;
        /**
         * Whether or not the mesh data is manifold. Cutting section caps are generated only for manifold objects.
         */
        isManifold: boolean;
        /**
         * The order in which the vertices of each face are specified. This determines which side of the face is the front.
         * May be `undefined`.
         */
        winding?: "clockwise" | "counterClockwise";
    }
}
declare namespace Communicator.Internal.Tree {
    /**
     * This is the complete runtime ID of an assembly tree node.
     *
     * No two living nodes will have the same `RuntimeNodeId` in a given session.
     * (Once a node is removed from the scene, the ID in principle can be reused, much like C pointers.)
     *
     * Note:
     * This is conceptually the same as `NodeId`, but has a more descriptive name
     * that clarifies internal use. This type is also more strongly typed than `NodeId`.
     * As such, use of `NodeId` in `Communicator.Internal.Tree` should not be used at all.
     *
     * Some implementation details:
     *  - Positive values are `AuthoredNodeId`s.
     *  - Negative values are `DynamicNodeId`s.
     *  - The value `-1` is `invalidNodeId`.
     *
     * If these details are needed to be known outside of this file, please
     * extend this file's exported interface to handle it instead.
     */
    const enum RuntimeNodeId {
    }
    /**
     * This is the ID of an assembly tree node that was authored in the loaded model.
     *
     * These IDs are *not* unique in a given assembly tree.
     *
     * These should be unique within a given model. (Notably at the individual model level, not the shattered model level.)
     */
    const enum AuthoredNodeId {
    }
    /**
     * This is the ID of an assembly tree node that was created dynamically.
     * (That is, the node was created locally and not supplied through loaded models.)
     *
     * No two living nodes will have the same `DynamicNodeId` in a given session.
     *
     * Some implementation details:
     *  - A `DynamicNodeId` always coincides with its `RuntimeNodeId`.
     */
    const enum DynamicNodeId {
    }
    /**
     * This is the offset added to an `AuthoredNodeId` to get its `RuntimeNodeId`.
     *
     * This offset is the same for all nodes within a given inclusion.
     *
     * No two living inclusions will have the same `AuthoredNodeId` in a given session.
     */
    const enum NodeIdOffset {
    }
    /**
     * This is the value for invalid node IDs.
     *
     * This value is overloaded for use in both `DynamicNodeId` and `RuntimeNodeId` types.
     *
     * Note:
     * There is no such thing as an invalid node ID for `AuthoredNodeId`s.
     */
    const invalidNodeId: DynamicNodeId & RuntimeNodeId;
    function isAuthoredId(nodeId: RuntimeNodeId | AuthoredNodeId | DynamicNodeId): nodeId is AuthoredNodeId;
    function getAuthoredId(nodeId: AuthoredNodeId): AuthoredNodeId;
    function getRuntimeId(nodeId: AuthoredNodeId | DynamicNodeId, node: HasInclusionContext): RuntimeNodeId;
}
declare namespace Communicator {
    /** The default duration in milliseconds of camera transitions. */
    let DefaultTransitionDuration: number;
    const EmptyModelName = "_empty";
    const InvalidNodeId: NodeId;
    interface GetNodesBoundingConfig {
        /**
         * Controls whether or not body instances are visited.
         */
        bodyInstance: boolean;
        /**
         * Controls whether or not PMI bodies are visited.
         */
        pmiBody: boolean;
        /**
         * Controls whether or not view frames are visited.
         */
        viewFrame: boolean;
        /**
         * Controls whether or not a tight bounding is desired.
         * If `undefined`, this is treated as `false`.
         */
        tightBounding?: boolean;
        /**
         * Controls whether or not invisible geometry is visited.
         * If `undefined`, this is treated as `false`.
         */
        ignoreInvisible?: boolean;
    }
    /**
     * Object representing the model geometry and its associated data.
     * All major functionality for querying the model hierarchy, retrieving geometry data and loading additional model data are part of this object.
     *
     * More information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/data_model/model-tree.html).
     */
    class Model {
        private readonly _engine;
        private readonly _callbackManager;
        private readonly _pmiColor;
        private _pmiColorOverride;
        private _viewAxes;
        private _viewAxesSet;
        private _firstModelRootId;
        private _modelStructure;
        /** @hidden */
        constructor(engine: Internal.ScEngine, callbackManager: Internal.CallbackManager);
        /** @hidden */
        private static deprecated;
        /** @hidden */
        _setModelStructure(modelStructure: Internal.Tree.ModelStructure): void;
        /**
         * Returns the dimensions of the client.
         * @returns a pair of numbers, [width, height].
         */
        getClientDimensions(): [number, number];
        /**
         * Sets the up and front vectors for the model coordinate system.
         * Both the upVector and frontVector must be unique, cardinal axes.
         * @param frontVector
         * @param upVector
         */
        setViewAxes(frontVector: Point3, upVector: Point3): void;
        /**
         * Gets whether there has been a successful call to setViewAxes.
         */
        viewAxesHaveBeenSet(): boolean;
        /**
         * @returns the up and front vectors for the model coordinate system.
         */
        getViewAxes(): ViewAxes;
        /**
         * Gets the world space bounding box for the model.
         * @returns Promise that resolves with a Box representing the world space bounding box of the model.
         */
        getModelBounding(ignoreInvisible: boolean, includeExcluded: boolean, tightBounding?: boolean): Promise<Box>;
        /**
         * Gets the world space bounding box for the model. This does not take node visibility into account.
         * @returns Promise that resolves with a Box representing the world space bounding box of the model.
         */
        getLooseBounding(): Promise<Box>;
        /** @hidden */
        _allowNodeDeletion(nodeId: NodeId): void;
        /** @hidden */
        _preventNodeDeletion(nodeId: NodeId): void;
        /** @hidden */
        _preventMeshDeletion(meshId: MeshId): void;
        /** @hidden */
        _getNodeFromInstanceInc(markNodeLoadedIfCreated: boolean, inclusionKey: SC.InclusionKey, instanceKey: SC.InstanceKey, isOutOfHierarchy: boolean): NodeId;
        /**
         * Gets the world space bounding box for a list of nodes.
         * @param nodeIds IDs of the nodes for which you wish to get the bounding box.
         * @param config Allows fine control of what body types to compute the bounding against. If not provided, all body types are considered.
         * @returns Promise that resolves with the world space bounding box for the given IDs.
         */
        getNodesBounding(nodeIds: NodeId[], config?: GetNodesBoundingConfig): Promise<Box>;
        /**
         * Gets the world space bounding box for a node including any effects (explosion, camera suppression, etc).
         * Note: This function can have performance implications when used on nodes with many children.
         * @param nodeId ID of the node for which you wish to get the bounding box.
         * @returns Promise that resolves with the world space bounding box for the given ID.
         */
        getNodeRealBounding(nodeId: NodeId): Promise<Box>;
        /**
         * Sets the visibility for a given set of nodes.
         * @param mapping The mapping of node IDs to boolean value indicating the visibility setting for that node.
         * @param initiallyHiddenStayHidden Controls whether or not initially hidden geometries stay hidden. Default behavior is driven by [[setBehaviorInitiallyHidden]].
         * @param mode an optional walk mode to use while traversing the model tree
         * @returns Promise that resolves when the operation has completed.
         */
        setNodesVisibilities(mapping: Map<NodeId, boolean> | IdBooleanMap, initiallyHiddenStayHidden?: boolean | null, mode?: TreeWalkMode): Promise<void>;
        /**
         * Sets visibility for a given list of nodes.
         * @param nodeIds The node IDs whose visibilities will be set.
         * @param visibility If true, nodes will be shown. If false, they will be hidden.
         * @param initiallyHiddenStayHidden Controls whether or not initially hidden geometries stay hidden. Default behavior is driven by [[setBehaviorInitiallyHidden]].
         * @param mode an optional walk mode to use while traversing the model tree
         * @returns Promise that resolves when the operation has completed.
         */
        setNodesVisibility(nodeIds: NodeId[], visibility: boolean, initiallyHiddenStayHidden?: boolean | null, mode?: TreeWalkMode): Promise<void>;
        /**
         * Sets the visibility of all body nodes starting from a given node.
         * @param startNodeId The start node to walk when updating body nodes visibility.
         * @param visibility If true, nodes will be shown. If false, they will be hidden.
         * @returns Promise that resolves when the operation has completed.
         */
        setBodyNodesVisibility(startNodeId: NodeId, visibility: boolean): Promise<void>;
        /**
         * Resets visibility for all nodes in the model.
         * @returns Promise that resolves when the operation has completed.
         */
        resetNodesVisibility(): Promise<void>;
        /**
         * Returns a defaultVisibility boolean value and a visibilityException set of NodeIds.
         * defaultVisibility will be true if there are more nodes visible than hidden, and false otherwise.
         * If defaultVisibility is true, set of nodes that are hidden, if false, nodes that are visible.
         */
        getVisibilityState(startNodeId: NodeId): Promise<VisibilityState>;
        /**
         * Resets transform for all nodes in the model.
         * @returns Promise that resolves when the operation has completed.
         */
        resetNodesTransform(): Promise<void>;
        /**
         * Resets the state of the model to its default
         * @returns Promise that resolves when the operation has completed.
         */
        reset(): Promise<void>;
        /**
         * Remove all nodes, CAD views, configurations, and sheets from the model.
         *
         * If you intend to load additional models via the `loadSubtree` family
         * of methods, you should wait on the resolution of this promise before doing so.
         */
        clear(): Promise<void>;
        /**
         * Sets the color on the faces for a given list of nodes.
         * @param nodeIds IDs of nodes whose color to set
         * @param color the color to set
         * @returns Promise that resolves when this operation has completed.
         */
        setNodesFaceColor(nodeIds: NodeId[], color: Color): DeprecatedPromise;
        private _setNodesFaceColor;
        private _unsetNodesColor;
        /**
         * Unsets the color on the faces for a given list of nodes.
         * @param nodeIds IDs of nodes to modify
         * @param color the color to set
         * @returns Promise that resolves when this operation has completed.
         */
        unsetNodesFaceColor(nodeIds: NodeId[]): DeprecatedPromise;
        /**
         * Sets the color on the lines/edges for a given list of nodes.
         * @param nodeIds IDs of nodes whose color to set
         * @param color the color to set
         * @returns Promise that resolves when this operation has completed.
         */
        setNodesLineColor(nodeIds: NodeId[], color: Color): DeprecatedPromise;
        private _setNodesLineColor;
        /**
         * Unsets the color on the lines for a given list of nodes.
         * @param nodeIds IDs of nodes to modify
         * @param color the color to set
         * @returns Promise that resolves when this operation has completed.
         */
        unsetNodesLineColor(nodeIds: NodeId[]): DeprecatedPromise;
        /**
         * Sets whether the supplied nodes should appear highlighted. When a node is highlighted,
         * the highlight color will override any color previously set on the model.
         *
         * *Tip:* An easy way to unhighlight the entire model is to call [[setNodesHighlighted]]
         * on the root node of the model:
         * ```
         * hwv.model.setNodesHighlighted([hwv.model.getAbsoluteRootNode()], false);
         * ```
         * (In this case, `hwv` is your instance of [[WebViewer]].)
         *
         * @param nodeIds array of IDs for this operation.
         * @param highlighted value indicating whether the supplied nodes should be highlighted.
         * @returns Promise that resolves when this operation has completed.
         */
        setNodesHighlighted(partIds: PartId[], highlighted: boolean): DeprecatedPromise;
        /**
         * Returns whether the supplied nodes have been highlighted with [[setNodesHighlighted]].
         * @param nodeIds the list of nodes to be queried
         */
        getNodesHighlighted(partIds: PartId[]): Promise<boolean[]>;
        /**
         * Sets colors for a given set of nodes.
         * @param params object mapping node IDs to color to set for that node
         * @param alsoApplyToWireframe change or not lines color
         * @returns Promise that resolves when this operation has completed.
         */
        setNodesColors(colorMap: Map<NodeId, Color> | IdColorMap, alsoApplyToWireframe?: boolean): DeprecatedPromise;
        /**
         * Gets an array of PMI topology references linking a PMI node to a body element, like a face or an edge.
         * @param pmiNodeId the ID of the PMI node.
         */
        getPmiTopologyReferences(pmiNodeId: NodeId): RefOnTopoItem[] | null;
        /**
         * Returns names and ids of all the PMIs available in the scene
         * @returns a map associating PMI IDs to PMI names
         */
        getPmis(): IdStringMap;
        /** @deprecated Use [[getPmis]] instead. */
        getPMIs(): IdStringMap;
        /**
         * Returns the type of a given PMI
         * @param idPMI ID of the PMI
         * @returns Type of the PMI (Dimension, Datum, GD&T...)
         */
        getPmiType(pmiId: PmiId): PmiType;
        /** @deprecated Use [[getPmiType]] instead. */
        getPMIType(pmiId: PmiId): PmiType;
        /**
         * Returns the subtype of a given PMI
         * @param idPMI ID of the PMI
         * @returns Subtype of the PMI (Dimension distance, Datum target, GD&T fcf...)
         */
        getPmiSubtype(pmiId: PmiId): PmiSubType;
        /** @deprecated Use [[getPmiSubtype]] instead. */
        getPMISubtype(pmiId: PmiId): PmiSubType;
        /**
         * Saves a PMI override color
         * @param color the override color
         */
        setPmiColor(color: Color): void;
        /** @deprecated Use [[setPmiColor]] instead. */
        setPMIColor(color: Color): void;
        /**
         * Returns the set PMI override color  (if none is set, defaults to black)
         * @returns color
         */
        getPmiColor(): Color;
        /** @deprecated Use [[getPmiColor]] instead. */
        getPMIColor(): Color;
        /**
         * Takes a boolean value and either enables the set PMI override color or resets all PMI colors to their default
         * @returns Promise that resolves when this operation has completed.
         */
        setPmiColorOverride(enableOverride: boolean, rootId?: NodeId): DeprecatedPromise;
        /** @deprecated Use [[setPmiColorOverride]] instead. */
        setPMIColorOverride(enableOverride: boolean): DeprecatedPromise;
        /**
         * @returns a boolean value indicating the status of the PMI override color.
         */
        getPmiColorOverride(): boolean;
        /** @deprecated Use [[getPmiColorOverride]] instead. */
        getPMIColorOverride(): boolean;
        /**
         * Computes the distance between two bodies
         * @param partId1 id for the part which the first face belongs to
         * @param partId2 id for the part which the second face belongs to
         * @returns a promise that resolves with a Markup.Measure.FaceFaceDistanceItem when the operation completes
         */
        computeMinimumBodyBodyDistance(partId1: PartId, partId2: PartId): Promise<FaceFaceDistanceItem>;
        /**
         * Computes the distance between two faces
         * @param partId1 id for the part which the first face belongs to
         * @param faceId1 id for the face in the first part
         * @param partId2 id for the part which the second face belongs to
         * @param faceId2 id for the face in the second part
         * @returns a promise that resolves with a Markup.Measure.FaceFaceDistanceItem when the operation completes
         */
        computeMinimumFaceFaceDistance(partId1: PartId, faceId1: number, partId2: PartId, faceId2: number): Promise<FaceFaceDistanceItem>;
        /**
         * Computers the minimum distance between a face and a ray.
         * @param nodeId id of the node the face belongs to
         * @param faceId id of the face in the node
         * @param ray the ray to test against
         * @returns a promise that resolves with a Markup.Measure.FaceFaceDistanceItem when the operation completes
         */
        computeMinimumFaceRayDistance(partId: PartId, faceId: number, ray: Ray): Promise<FaceFaceDistanceItem>;
        /**
         * Computers the minimum distance between a face and an infinite line.
         * @param nodeId id of the node the face belongs to
         * @param faceId id of the face in the node
         * @param ray the line (in the form of a ray) to test against
         * @returns a promise that resolves with a Markup.Measure.FaceFaceDistanceItem when the operation completes
         */
        computeMinimumFaceLineDistance(partId: PartId, faceId: number, ray: Ray): Promise<FaceFaceDistanceItem>;
        /**
         * Sets the color for a face element. This color will take precedence over any currently set color on the node
         * @param nodeId the Id of the node containing the face
         * @param faceId the Id of the face in the node that will have its color set
         * @param color the color to set
         */
        setNodeFaceColor(partId: PartId, faceId: number, color: Color): DeprecatedPromise;
        private _setNodeFaceColor;
        /**
         * Sets the visibility for a face element. This visibility setting will take precedence over other element visibility settings
         * @param partId the Id of the part containing the face
         * @param faceId the Id of the face in the node that will have its visibility set
         * @param visibility visibility state to be set
         */
        setNodeFaceVisibility(partId: PartId, faceId: number, visibility: boolean): void;
        /**
         * Clears the visibility for a node's face elements, resetting them to default.
         * @param partId the Id of the part to be reset
         */
        clearNodeFaceVisibility(partId: PartId): void;
        private _setNodeElementVisibility;
        private _clearNodeElementVisibility;
        private _unsetElementColor;
        /**
         * Unsets the color for a face element. This will return the face's color to its default state.
         * @param nodeId the Id of the node containing the face
         * @param faceId the Id of the face in the node that will have its color unset
         */
        unsetNodeFaceColor(partId: PartId, faceId: number): DeprecatedPromise;
        /**
         * Sets whether the face element for a given node should appear highlighted.
         * When a face element is highlighted, the highlight color will override
         * any color previously set on the element.
         * @param nodeId the id for the node containing the face element.
         * @param faceId the face Id that is the target of this operation.
         * @param highlighted value indicating whether the supplied face element should be highlighted.
         */
        setNodeFaceHighlighted(nodeId: NodeId, faceId: number, highlighted: boolean): DeprecatedPromise;
        private _setNodeFaceHighlighted;
        private _getElementHighlighted;
        /**
         * Returns whether the supplied face element has been highlighted with [[setNodeFaceHighlighted]].
         * @param nodeId the ID of the node containing the face element
         * @param faceIndex the index of the face within the node
         */
        getNodeFaceHighlighted(nodeId: NodeId, faceIndex: number): Promise<boolean>;
        /**
         * Sets the color for a line element.
         * @param nodeId the Id of the node containing the line.
         * @param lineId the Id of the line in the node that will have its color set.
         * @param color the color to set.
         */
        setNodeLineColor(partId: PartId, lineId: number, color: Color): DeprecatedPromise;
        private _setNodeLineColor;
        /**
         * Unsets the color for a line element. This will return the line's color to its default state.
         * @param nodeId the Id of the node containing the line
         * @param lineId the Id of the line in the node that will have its color unset
         */
        unsetNodeLineColor(partId: PartId, lineId: number): DeprecatedPromise;
        /**
         * Sets the visibility for a line element. This visibility setting will take precedence over other element visibility settings
         * @param partId the Id of the part containing the line
         * @param lineId the Id of the line in the node that will have its visibility set
         * @param visibility visibility state to be set
         */
        setNodeLineVisibility(partId: PartId, lineId: number, visibility: boolean): void;
        /**
         * Clears the visibility for a node's line elements, resetting them to default.
         * @param partId the Id of the part to clear visibilities from
         */
        clearNodeLineVisibility(partId: PartId): void;
        /**
         * Sets whether the line element for a given node should appear highlighted. When a line element is highlighted, the highlight color will override any color previously set on the element.
         * @param nodeId the id for the node containing the line element.
         * @param lineId the line Id that is the target of this operation.
         * @param highlighted value indicating whether the supplied line element should be highlighted.
         */
        setNodeLineHighlighted(partId: PartId, lineId: number, highlighted: boolean): DeprecatedPromise;
        private _setNodeLineHighlighted;
        /**
         * Returns whether the supplied line element has been highlighted with [[setNodeLineHighlighted]].
         * @param nodeId the ID of the node containing the line element
         * @param lineIndex the index of the line within the node
         */
        getNodeLineHighlighted(nodeId: NodeId, lineIndex: number): Promise<boolean>;
        /**
         * Sets the visibility for a point element. This visibility setting will take precedence over other element visibility settings
         * @param partId the Id of the part containing the point
         * @param pointId the Id of the point in the node that will have its visibility set
         * @param visibility visibility state to be set
         */
        setNodePointVisibility(partId: PartId, pointId: number, visibility: boolean): void;
        /**
         * Clears the visibility for a node's point elements, resetting it to default.
         * @param partId the Id of the part to clear visibilities from
         */
        clearNodePointVisibility(partId: PartId): void;
        /**
         * Sets whether the point element for a given node should appear highlighted. When a point element is highlighted, the highlight color will override any color previously set on the element.
         * @param nodeId the id for the node containing the point element.
         * @param pointId the point Id that is the target of this operation.
         * @param highlighted value indicating whether the supplied point element should be highlighted.
         */
        setNodePointHighlighted(partId: NodeId, pointId: number, highlighted: boolean): DeprecatedPromise;
        private _setNodePointHighlighted;
        /**
         * Returns whether the supplied point element has been highlighted with [[setNodePointHighlighted]].
         * @param nodeId the ID of the node containing the point element
         * @param pointIndex the index of the point within the node
         */
        getNodePointHighlighted(nodeId: NodeId, pointIndex: number): Promise<boolean>;
        /**
         * Resets color for all nodes in the model.
         * @returns Promise that resolves when this operation has completed.
         */
        resetNodesColor(): DeprecatedPromise;
        /**
         * Sets opacity for a given list of nodes.
         * @param nodeIds IDs of nodes whose opacity will be set
         * @param opacity opacity value to apply to each node. The value should be between the range of 0.0 and 1.0. 0.0 indicates fully transparent, while 1.0 is fully opaque.
         */
        setNodesOpacity(nodeIds: NodeId[], opacity: number): void;
        /** @deprecated use [[setNodesOpacity]] instead. */
        setNodesTransparency(nodeIds: NodeId[], transparency: number): DeprecatedPromise;
        /**
         * Returns whether nodes with the given NodeIds have an opacity value that is not fully opaque.
         * @param nodeIds IDs of nodes to query.
         * @returns array of boolean values corresponding to the id array passed into the function.  A value of true indicates that the node contains transparency and is not fully opaque.
         */
        getNodesHaveTransparency(nodeIds: NodeId[]): Promise<boolean[]>;
        /**
         * Sets opacity for a given set of nodes.
         * @param params object mapping node IDs to opacity to set for that NodeId. The opacity value should be between the range of 0.0 and 1.0. 0.0 indicates fully transparent, while 1.0 is fully opaque.
         */
        setNodesOpacities(params: Map<NodeId, number> | IdNumberMap): void;
        /** @deprecated use [[setNodesOpacities]] instead. */
        setNodesTransparencies(params: Map<NodeId, number> | IdNumberMap): DeprecatedPromise;
        /**
         * Resets opacity for all nodes in the model.
         * @returns Promise that resolves when this operation has completed.
         */
        resetModelOpacity(): void;
        /** @deprecated Use [[resetModelOpacity]] instead. */
        resetModelTransparency(): DeprecatedPromise;
        /**
         * Resets highlight for all nodes in the model.
         * @returns Promise that resolves when this operation has completed.
         */
        resetModelHighlight(): DeprecatedPromise;
        /**
         * Resets opacity for a given list of nodes.
         * @param nodeIds IDs of nodes whose opacity will be reset to their default values
         */
        resetNodesOpacity(nodeIds: NodeId[]): void;
        /** @deprecated use [[resetNodesOpacity]] instead. */
        resetNodesTransparency(nodeIds: NodeId[]): DeprecatedPromise;
        private _getNodesColor;
        private _getNodesEffectiveColor;
        /**
         * Gets the color set via [[setNodesFaceColor]] on the faces of a list of leaf nodes.
         * If no color has been explicitly set for a particular node, `null` will appear at the corresponding
         * position in the returned array.
         * <br><br> See also: [[getNodesEffectiveFaceColor]]
         * @param nodeIds IDs of the nodes to be queried
         */
        getNodesFaceColor(nodeIds: NodeId[]): Promise<(Color | null)[]>;
        /**
         * Gets the color set on the faces of a list of leaf nodes. If no color has been set,
         * the color specified when the model was authored will be returned.
         * @param nodeIds IDs of the nodes to be queried
         */
        getNodesEffectiveFaceColor(nodeIds: NodeId[]): Promise<Color[]>;
        /**
         * Gets the color set via [[setNodesLineColor]] on the lines of a list of leaf nodes.
         * If no color has been set for a particular node, `null` will appear at the corresponding
         * position in the returned array.
         * @param nodeIds IDs of the nodes to be queried
         */
        getNodesLineColor(nodeIds: NodeId[]): Promise<(Color | null)[]>;
        /**
         * Gets the color set on the lines of a list of leaf nodes. If no color has been set,
         * the color specified when the model was authored will be returned.
         * @param nodeIds IDs of the nodes to be queried
         */
        getNodesEffectiveLineColor(nodeIds: NodeId[]): Promise<Color[]>;
        /**
         * Gets a map associating NodeIds to colors that are set on those nodes.
         * Only NodeIds of nodes that have a color set will be included.
         * @param startNodeId The start node to walk when building the color map.
         * @param elementType Returned colors are of this element type.
         */
        getNodeColorMap(startNodeId: NodeId, elementType: ElementType): Promise<Map<NodeId, Color>>;
        /**
         * Gets the opacity set via [[setNodesOpacity]] on a list of leaf nodes.
         * If no value has been set for a particular node, `null` will appear at the corresponding
         * position in the returned array.
         * @param nodeIds IDs of the nodes to be queried
         */
        getNodesOpacity(leafNodes: NodeId[]): Promise<(number | null)[]>;
        /** @deprecated use [[getNodesOpacity]] instead. */
        getNodesTransparency(leafNodes: NodeId[]): Promise<(number | null)[]>;
        private _getNodesOpacity;
        /**
         * Gets the opacity set on a list of leaf nodes multiplied by the opacity
         * specified when the model was authored. If no opacity has been set,
         * the opacity specified when the model was authored will be returned directly.
         * @param nodeIds IDs of the nodes to be queried
         * @param elementType the type of element (faces, lines or points) to query
         */
        getNodesEffectiveOpacity(leafNodes: NodeId[], elementType: ElementType): Promise<number[]>;
        /** @deprecated use [[getNodesEffectiveOpacity]] instead. */
        getNodesEffectiveTransparency(leafNodes: NodeId[], elementType: ElementType): Promise<number[]>;
        private _getNodeElementColor;
        private _getNodeEffectiveElementColor;
        /**
         * Gets the color set via [[setNodeFaceColor]] on a face element.
         * If no color has been set, `null` will be returned.
         * <br><br> See also: [[getNodeEffectiveFaceColor]]
         * @param nodeId the ID of the node containing the face
         * @param faceIndex the index of the face in the node
         */
        getNodeFaceColor(partId: PartId, faceIndex: number): Promise<Color | null>;
        /**
         * Gets the color set via [[setNodeFaceColor]] on a face element. If no color has been set,
         * the node's face color will be returned. If the node's face color has not been set,
         * the color specified when the model was authored will be returned.
         * @param nodeId the ID of the node containing the face
         * @param faceIndex the index of the face in the node
         */
        getNodeEffectiveFaceColor(partId: PartId, faceIndex: number): Promise<Color | null>;
        /**
         * Gets the color set via [[setNodeLineColor]] on a line element.
         * If no color has been set, `null` will be returned.
         * @param nodeId the ID of the node containing the line
         * @param lineIndex the index of the line in the node
         */
        getNodeLineColor(partId: PartId, lineIndex: number): Promise<Color | null>;
        /**
         * Gets the color set via [[setNodeLineColor]] on a line element. If no color has been set,
         * the node's line color will be returned. If the node's line color has not been set,
         * the color specified when the model was authored will be returned.
         * @param nodeId the ID of the node containing the line
         * @param lineIndex the index of the line in the node
         */
        getNodeEffectiveLineColor(partId: PartId, lineIndex: number): Promise<Color | null>;
        /**
         * Returns "Out Of Hierarchy" status for child node for the given Id.
         * @param id Node id to get children of
         * @returns false if node is Out Of Hierarchy, true if it is
         */
        getOutOfHierarchy(nodeId: NodeId): boolean;
        /**
         * Returns the absolute root node of the assembly tree.
         * @returns Id for the model tree root node or null if the model structure is not loaded.
         */
        getAbsoluteRootNode(): NodeId;
        /** @deprecated Use [[getAbsoluteRootNode]] instead. */
        getRootNode(): NodeId;
        /**
         * Returns IDs for child nodes for the given Id.
         * @param id Node id to get children of
         * @param includeOutOfHierarchy true to include Out Of Hierarchy node, false or null to exclude them
         * @returns ID for the children of this node, or null if the ID is invalid
         */
        getNodeChildren(nodeId: NodeId, includeOutOfHierarchy?: boolean): NodeId[];
        /**
         * Returns IDs of nodes who instance the same part as the supplied node.
         * This method should be called on nodes whose type is `PartInstance`.
         * @param id ID of a `PartInstance` node.
         * @returns Array containing `PartInstance` node IDs. These nodes all instance the same part as the supplied node.  If this method is called on a node which is not of type `PartInstance` then `null` will be returned.
         */
        getNodesInstancingSamePart(nodeId: NodeId): Promise<NodeId[] | null>;
        /**
         * Returns the unit multiplier affecting the root of the first loaded model.
         * This number is a multiplier of millimeters (for example inches will be `25.4`).
         * The default value is `1.0`.
         * @returns The unit multiplier for the model (in mm)
         * @deprecated Use [[getNodeUnitMultiplier]] instead.
         */
        getUnitMultiplier(): number;
        /**
         * Returns the unit multiplier affecting the supplied node.
         * This number is a multiplier of millimeters (for example inches will be `25.4`).
         * The default value is `1.0`.
         * @returns The unit multiplier for the model (in mm)
         */
        getNodeUnitMultiplier(nodeId: NodeId): number;
        /**
         * Creates a CAD view. This method will trigger a "cadViewCreated" callback if the creation is successful.
         * @param id Node id to attach the created view to
         * @param viewName Name of the view
         * @param camera Camera that will be set when the view gets activated
         * @param pmiIds (optional, pass null or empty array if none to send) Node IDs of the PMI to show for the view
         * @param nodesToShow (optional, pass null or empty array if none to send) Node IDs of the elements to force visibility on
         * @param nodesToHide (optional, pass null or empty array if none to send) Node IDs of the elements to force visibility off
         * @param nodeIdsAndLocalTransforms (optional, pass null or empty array if none to send) array of node ID and matrix pair, defining specific local transform to apply
         * @param cuttingPlane (optional, pass null if none to send) Cutting plane to set when the view gets activated
         * @param meshInstanceData (optional, pass null if none to send) object that specifies the data for the mesh instance of the rectangular frame (mostly found on capture views)
         * @returns id of the view, null is returned if the function fails
         */
        createCadView(nodeId: NodeId, viewName: string, camera: Camera, pmiIds?: PmiId[] | null, nodesToShow?: NodeId[] | null, nodesToHide?: NodeId[] | null, nodeIdsAndLocalTransforms?: [NodeId, Matrix][] | null, cuttingPlane?: Plane | null, meshInstanceData?: MeshInstanceData | null): CadViewId | null;
        /** @deprecated Use [[createCadView]] instead. */
        createCADView(nodeId: NodeId, viewName: string, camera: Camera, pmiIds?: PmiId[], nodesToShow?: NodeId[], nodesToHide?: NodeId[], nodesIdAndLocalTransforms?: [NodeId, Matrix][], cuttingPlane?: Plane, meshInstanceData?: MeshInstanceData): CadViewId | null;
        /**
         * Gets CAD View information for this model.
         * @returns a map mapping associating CAD View ID to name
         */
        getCadViewMap(): Map<NodeId, string>;
        /** @deprecated Use [[getCadViewMap]] instead. */
        getCadViews(): IdStringMap;
        /** @deprecated Use [[getCadViews]] instead. */
        getCADViews(): IdStringMap;
        /**
         * Activates a CAD View
         * @param id ID of the CAD View to activate.
         * @param duration camera transition time in milliseconds.
         * @returns None.
         */
        activateCadView(nodeId: NodeId, duration?: number): Promise<void>;
        /** @deprecated Use [[activateCadView]] instead. */
        activateCADView(nodeId: NodeId, duration?: number): Promise<void>;
        /**
         * Get PMI IDs for a CAD View
         * @param id ID of the CAD View
         * @returns IDs of visible PMIs for the view
         */
        getCadViewPmis(nodeId: NodeId): PmiId[];
        /** @deprecated Use [[getCadViewPmis]] instead. */
        getCADViewPMIs(nodeId: NodeId): PmiId[];
        /**
         * Gets whether or not cad configurations are enabled
         * @returns Boolean indicating whether or not cad configurations are enabled
         */
        cadConfigurationsEnabled(): Promise<boolean>;
        /**
         * Gets CAD configurations
         * @returns an object mapping CAD configuration ID to config name
         */
        getCadConfigurations(): IdStringMap;
        /** @deprecated Use [[getCadConfigurations]] instead. */
        getCADConfigurations(): IdStringMap;
        /**
         * Gets CAD default configuration
         * @returns ID of default CAD Configuration
         */
        getDefaultCadConfiguration(): NodeId | null;
        /**
         * Gets CAD default view
         * @returns ID of default CAD Configuration
         */
        getDefaultCadView(): NodeId | null;
        activateDefaultCadView(): Promise<void>;
        /** @deprecated Use [[getDefaultCadConfiguration]] instead. */
        getCADDefaultConfiguration(): NodeId | null;
        /**
         * Gets Active CAD configuration
         * @returns ID of activated CAD Configuration
         */
        getActiveCadConfiguration(): NodeId | null;
        /** @deprecated Use [[getActiveCadConfiguration]] instead. */
        getCADActiveConfiguration(): NodeId | null;
        /**
         * Get the configuration in which the view is defined
         * @returns ID of CAD Configuration of the view
         */
        getCadViewConfiguration(cadViewNodeId: NodeId): NodeId | null;
        /**
         * Activates a CAD configuration
         * @param id ID of the CAD Configuration to activate
         * @returns None.
         */
        activateCadConfiguration(nodeId: NodeId): Promise<void>;
        /** @deprecated Use [[activateCadConfiguration]] instead. */
        activateCADConfiguration(nodeId: NodeId): Promise<void>;
        /**
         * Activates Default CAD configuration
         * @returns None.
         */
        activateDefaultCadConfiguration(): Promise<void>;
        /** @deprecated Use [[activateDefaultCadConfiguration]] instead. */
        activateCADDefaultConfiguration(): Promise<void>;
        /**
         * Returns point attributes for a node of the given node and point.
         * @param nodeId Node to retrieve point properties from
         * @param pointIndex Index of point for which to retrieve point attributes
         * @returns Promise for the requested point attributes. Properties returned will be null if none associated with the point.
         */
        getPointAttributes(nodeId: NodeId, pointIndex: number): Promise<SubentityAttributes | null>;
        /**
         * Returns edge count for a node of the given node.
         * @param nodeId Node to retrieve edge count from
         * @returns Promise providing the number of edges
         */
        getEdgeCount(nodeId: NodeId): Promise<number>;
        /**
         * Returns edge attributes for a node of the given node and edge.
         * @param nodeId Node to retrieve edge properties from
         * @param edgeIndex Index of edge for which to retrieve edge attributes
         * @returns Promise for the requested edge attributes. Properties returned will be null if none associated with the edge.
         */
        getEdgeAttributes(nodeId: NodeId, edgeIndex: number): Promise<SubentityAttributes | null>;
        /**
         * Returns edge properties for a node of the given node and edge.
         * @param nodeId Node to retrieve edge properties from
         * @param edgeid ID of edge for which to retrieve edge properties
         * @returns Promise for the requested edge properties. Properties returned will be null if none associated with the edge.
         */
        getEdgeProperty(nodeId: NodeId, edgeId: number): Promise<SubentityProperties.Edge | null>;
        /**
         * Returns face count for a node of the given node and face.
         * @param nodeId Node to retrieve face count from
         * @returns Promise providing the number of faces
         */
        getFaceCount(nodeId: NodeId): Promise<number>;
        /**
         * Returns face attributes for a node of the given node and face.
         * @param nodeId Node to retrieve edge properties from
         * @param faceIndex Index of face for which to retrieve face attributes
         * @returns Promise for the requested face attributes. Properties returned will be null if none associated with the edge.
         */
        getFaceAttributes(nodeId: NodeId, faceIndex: number): Promise<SubentityAttributes | null>;
        /**
         * Returns Face properties for a node of the given node and face.
         * @param nodeId Node to retrieve face properties from
         * @param faceid ID of face for which to retrieve face properties
         * @returns Promise for the requested face properties. Properties returned will be null if none associated with the face.
         */
        getFaceProperty(nodeId: NodeId, faceId: number): Promise<SubentityProperties.Face | null>;
        /**
         * Set edge property for a node of the given node and edge.
         * @param id Node to set edge properties to
         * @param edgeid ID of edge
         * @param prop property (CircleElement, LineElement...)
         */
        setEdgeProperty(nodeId: NodeId, edgeId: number, prop: SubentityProperties.Base): void;
        /**
         * Set face property for a node of the given node and face.
         * @param id Node to set edge properties to
         * @param faceid ID of face
         * @param prop property (CylinderElement, PlaneElement...)
         */
        setFaceProperty(nodeId: NodeId, faceId: number, prop: SubentityProperties.Base): void;
        /**
         * Fetch the mesh data for a particular node
         * @param nodeId the node's ID
         */
        getNodeMeshData(nodeId: NodeId): Promise<MeshDataCopy>;
        /**
         * Returns a copy of the Matrix for a node of the given ID
         * @param id Node to retrieve matrix from
         * @returns Copy of the Matrix of the node
         */
        getNodeMatrix(nodeId: NodeId): Matrix;
        /**
         * Sets Matrix for a node of the given ID
         * @param id Node to set matrix on
         * @param Matrix of the Node
         * @param setAsInitial tells if you want to change the node initial matrix or not
         */
        setNodeMatrix(nodeId: NodeId, matrix: Matrix, setAsInitial?: boolean): Promise<void>;
        /**
         * Used by Animation system to efficiently update the matrix of many nodes at once.
         * Currently not part of public API due to difference in signature with other bulk operations which use Map based parameter.
         * @hidden
         */
        _setNodesMatrices(nodeIds: NodeId[], matrices: Matrix[], setAsInitial?: boolean): Promise<void>;
        /**
         * Reset node matrix to the one set as the initial one
         * @param id Node to set matrix on
         */
        resetNodeMatrixToInitial(nodeId: NodeId): Promise<void>;
        /**
         * Returns net matrix for a node of the given ID
         * @param id Node to retrieve net matrix from
         * @returns Net Matrix of the Node
         */
        getNodeNetMatrix(nodeId: NodeId): Matrix;
        /**
         * Returns the parent Id for the given node id.
         * @param id node id to get the parent of
         * @returns ID of the parent node for the supplied ID. If the ID is invalid or the root ID, null is returned.
         */
        getNodeParent(nodeId: NodeId): NodeId | null;
        /**
         * Returns the type of the node with the given ID.
         * @param id The ID of the node to get the type for.
         * @returns The type of the node.
         */
        getNodeType(nodeId: NodeId): NodeType;
        /**
         * Returns the properties for the given node ID.
         * @param id Node ID to get the parent of
         * @returns object properties for the supplied ID, or null if the ID was invalid
         */
        getNodeProperties(nodeId: NodeId): Promise<StringStringMap | null>;
        /**
         * Purpose: Adds a property to the node
         * @Param nodeId node id to set the property on
         * @Param property name
         * @Param property value
         * @returns true if all went right, false otherwise
         */
        addPropertyToNode(nodeId: NodeId, propertyName: string, propertyValue: string, propertyUnit: UnitElement[]): boolean;
        /**
         * Purpose: Sets physical properties
         * @Param nodeId node id to set the property on, the node id has to be a body node
         * @Param gravityCenter gravity center in local coordinates
         * @Param surfaceArea surface area, in squared current unit
         * @Param volume volume, in cubed current unit
         * @returns true if all went right, false otherwise
         */
        setPhysicalProperties(nodeId: NodeId, gravityCenter: Point3, surfaceArea: number, volume: number): boolean;
        /**
         * Specifies nodes for the system to load. This method is useful when the viewer was created with the <code>streamOnDemand</code> option set to true.
         * @param nodeIds array of unique IDs for the system to load
         */
        requestNodes(nodeIds: NodeId[]): Promise<void>;
        /**
         * Returns the name for a node in the assembly tree.
         * @param nodeId The node ID to get the name of.
         * @returns The name of the node with the given nodeId or null if no name is found.
         */
        getNodeName(nodeId: NodeId): string | null;
        /**
         * Returns the Exchange ID of a node in the assembly tree.
         * @param nodeId The node ID to get the Exchange ID of.
         * @returns The Exchange ID of the node with the given nodeId or null if no Exchange ID is found.
         */
        getNodeExchangeId(nodeId: NodeId): ExchangeId | null;
        /**
         * Returns names and ids of all filters available in the scene
         * @returns a map associating Filter IDs to filter names
         */
        getFilters(): Map<FilterId, FilterName>;
        /**
         * @returns The name of a filter for the given filter ID index or null if filter was not found
         */
        getFilterName(filterId: FilterId): FilterName | null;
        /**
         * @param nodeId The ID of the node to query.
         * @returns Filters which retain or remove the given node.
         */
        getFiltersWithNode(nodeIdSearched: NodeId): FilterId[];
        /**
         * @param filtersId array of filters indexes to take in account
         * @returns nodesId of nodes retained by the given filter indices and the type of filter (inclusive or not). Returns null if no filter is found.
         */
        getNodesFromFiltersId(filtersId: FilterId[]): FilteredNodes | null;
        /**
         * Returns names and ids of all layers available in the scene
         * @returns a map associating Layer IDs to Layer names
         */
        getLayers(): Map<LayerId, LayerName>;
        /**
         * Return names of layers. Different layers can have the same name. Some layers can be unnamed.
         * @returns Names of layers
         */
        getUniqueLayerNames(): LayerName[];
        /**
         * @returns The name of a layer for the given filter ID or null if layer was not found
         */
        getLayerName(layerId: LayerId): LayerName | null;
        /**
         * @returns Id of layers for the given filter name or null if no layers are found
         */
        getLayerIdsFromName(name: LayerName): LayerId[] | null;
        /**
         * Returns the layer ID of a node in the assembly tree.
         * @param nodeId The node ID to get the Exchange ID of.
         * @returns The layer ID of the node with the given nodeId or null if no layer is found.
         */
        getNodeLayerId(nodeId: NodeId): LayerId | null;
        /**
         * Returns IDs of nodes in the given layer.
         * @param layerId The layer ID to get nodes from.
         * @param onlyTreeNodes if true return only nodes present in model Tree
         * @returns An array of nodes Id of nodes with the given layerId or null if no layers are found.
         */
        getNodesFromLayer(layerId: LayerId, onlyTreeNodes?: boolean): NodeId[] | null;
        /**
         * Returns IDs of nodes in given layers.
         * @param layersId Array of layers Id to get nodes from.
         * @param onlyTreeNodes if true return only nodes present in model Tree
         * @returns An array of nodes Id of nodes with one of the given layerId or null if no layers are found.
         */
        getNodesFromLayers(layersId: LayerId[], onlyTreeNodes?: boolean): NodeId[] | null;
        /**
         * Returns IDs of nodes in the given layer.
         * @param layer name the name of layer to get nodes from.
         * @param onlyTreeNodes if true return only nodes present in model Tree
         * @returns An array of nodes Id of nodes with the given layerName or null if no layers are found.
         */
        getNodesFromLayerName(layerName: LayerName, onlyTreeNodes?: boolean): NodeId[] | null;
        /**
         * Returns the current visibility for a node.
         * @param nodeId ID of the node to get visibility for.
         * @returns true if the current node's visibility state is on or false if it is not.
         */
        getNodeVisibility(nodeId: NodeId): boolean;
        /**
         * Branch visibility indicates the visibility state for all of a node's children.
         * @param nodeId ID of the node at the root of the branch.
         * @returns Shown/Hidden if all children have the same visibility state, Mixed otherwise.
         */
        getBranchVisibility(nodeId: NodeId): BranchVisibility;
        /**
         * Returns a chunk of keyed data
         * @param an Array of ModelKey-DataKey pairs ([ModelKey, DataKey, ModelKey, DataKey, ModelKey, DataKey...]
         * @returns promise that resolves when this operation has completed returning an array of 8bits int arrays for each ModelKey-DataKey pairs
         */
        getDataFromIds(ids: SC.DataIds): Promise<Uint8Array[]>;
        /** @deprecated Use [[getDataFromIds]] instead. */
        getDataFromKeys(ids: SC.DataIds): Promise<Uint8Array[]>;
        /**
         * @param meshData [[MeshData]] object containing data to insert into the scene.
         * @returns Promise that resolves with a [[MeshId]] when the mesh has been created. The [[MeshId]] can be used to create instances of the mesh using [[createMeshInstance]].
         */
        createMesh(meshData: MeshData, config?: {
            /** If true, the mesh won't be deleted when the model is cleared or switched. */
            doNotDelete?: boolean;
        }): Promise<MeshId>;
        private static _flatArrayToPairArray;
        private static _pairArrayToFlatArray;
        /**
         * Retrieve the [[MeshId]] associated with the mesh data attached to the given nodes.
         */
        getMeshIds(nodeIds: NodeId[]): Promise<MeshId[]>;
        /**
         * Replace a mesh's data. This will affect all instances of that mesh.
         * @param key the [[MeshId]] identifying the mesh
         * @param data the new data
         */
        replaceMesh(id: MeshId, data: MeshData): Promise<void>;
        /**
         * Creates an instance of a mesh that has been created using [[createMesh]] or retrieved using [[getMeshIds]].
         * @param data object that specifies the data for this mesh instance
         * @param parentNodeId the ID of the desired parent node
         * @param preventFromResetting if set to true, then the visibility and positioning won't be reset when resetxxx() functions gets called.
         * @param isOutOfHierarchy True if the node created shouldn't appear in the model structure.
         * @returns Promise that resolves with a node ID that can be used to perform operations on this instance.
         */
        createMeshInstance(data: MeshInstanceData, parentNodeId?: NodeId | null, preventFromResetting?: boolean | null, isOutOfHierarchy?: boolean | null): Promise<NodeId>;
        private _createMeshInstance;
        /**
         * Creates a PMI Instance from a mesh that has been created using the createMesh method.
         * @param data object that specifies the data for the PMI graphic representation
         * @param pmiType see PmiType enum (Datum, Gdt, Dimension...)
         * @param pmiSubType see PmiSubType enum (DatumTarget, GdtFcf, DimensionDistance...)
         * @param refOnTopoItems see RefOnTopoItem. It defines the PMI links to a body element, like a face or an edge
         * @param parentNodeId the ID of the desired parent node
         * @returns Promise that resolves with a node ID that can be used to perform operations on this instance. You can use deleteMeshInstances() to delete the PMI
         */
        createPmiInstance(data: MeshInstanceData, pmiType: PmiType, pmiSubType: PmiSubType, refOnTopoItems: RefOnTopoItem[], parentNodeId?: NodeId | null): Promise<PmiId>;
        /** @deprecated Use [[createPmiInstance]] instead. */
        createPMIInstance(data: MeshInstanceData, pmiType: PmiType, pmiSubType: PmiSubType, refOnTopoItems: RefOnTopoItem[], parentNodeId?: NodeId): Promise<PmiId>;
        /**
         * Creates an image that can be applied as a texture via [[setNodesTexture]].
         * See [[deleteImages]].
         * @param primaryImage The image data and associated options
         * @param thumbnailImage If specified, an uncompressed image that will be used as a
         *                       placeholder for the primary image until it is fully loaded.
         *                       Only useful when `primaryImage` is a compressed image.
         */
        createImage(primaryImage: ImageOptions, thumbnailImage?: ImageOptions): Promise<ImageId>;
        /**
         * Deletes images created with [[createImage]].
         * @param imageIds The IDs of the images to be deleted
         */
        deleteImages(imageIds: ImageId[]): Promise<void>;
        /**
         * Apply an image to a node as a texture map. See [[createImage]] and [[unsetNodesTexture]].
         * @param nodeIds The nodes on which to apply the texture
         * @param options Options specifying how the texture is applied
         */
        setNodesTexture(nodeIds: NodeId[], options: TextureOptions): Promise<void>;
        /**
         * Remove one or more textures applied via [[setNodesTexture]].
         * @param nodeIds The nodes from which to remove the texture or textures
         */
        unsetNodesTexture(nodeIds: NodeId[]): void;
        /**
         * Deletes meshes that have been created at run time.
         *
         * In order for this method to succeed, all mesh instances created for the given IDs
         * must have also been destroyed with [[deleteMeshInstances]].
         *
         * @param meshIds The IDs of meshes that should be deleted
         * @returns Promise that resolves when this operation has completed.
         */
        deleteMeshes(ids: MeshId[]): Promise<void>;
        /**
         * Deletes mesh instances that have been created at run time
         * @param nodeIds array of IDs for mesh instances created at run time that should be destroyed
         * @returns Promise that resolves when this operation has completed.
         */
        deleteMeshInstances(nodeIds: NodeId[]): Promise<void>;
        private _obtainLoadSubtreeConfig;
        /**
         * Loads the tree stored in the XML and query loading of required meshes
         * @param nodeId ID of the node to link the sub tree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param xmlFilename URL of XML file to load.
         * @param massageModelName Optional callback to massage model names within the XML file. Return null to skip the model.
         * @param config Configuration to control load behavior.
         * @returns A `Promise` of the newly loaded model's root nodes IDs.
         */
        loadSubtreeFromXmlFile(nodeId: NodeId, xmlFilename: XmlFilename, massageModelName: MassageModelNameFunc | null, config: LoadSubtreeConfig): Promise<NodeId[]>;
        /**
         * Loads the tree stored in the XML and query loading of required meshes
         * @param nodeId ID of the node to link the sub tree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param xmlFilename URL of XML file to load.
         * @param massageModelName Optional callback to massage model names within the XML file. Return null to skip the model.
         * @param additionalMatrix Optional matrix to get multiplied into the net attachment matrix.
         * @param allowMissingExternalModels Optional boolean to control whether or not missing models in the XML file are ignored or cause an error.
         * @returns A `Promise` of the newly loaded model's root nodes IDs.
         */
        loadSubtreeFromXmlFile(nodeId: NodeId, xmlFilename: XmlFilename, massageModelName?: MassageModelNameFunc | null, additionalMatrix?: Matrix | null, allowMissingExternalModels?: boolean): Promise<NodeId[]>;
        /**
         * Loads the tree stored in the XML and query loading of required meshes
         * @param nodeId ID of the node to link the sub tree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param xmlData XML document or XML document string.
         * @param massageModelName Optional callback to massage model names within the XML file. Return null to skip the model.
         * @param config Configuration to control load behavior.
         * @returns A `Promise` of the newly loaded model's root nodes IDs.
         */
        loadSubtreeFromXmlBuffer(nodeId: NodeId, xmlData: string | Document, massageModelName: MassageModelNameFunc | null, config: LoadSubtreeConfig): Promise<NodeId[]>;
        /**
         * Loads the tree stored in the XML and query loading of required meshes
         * @param nodeId ID of the node to link the sub tree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param xmlData XML document or XML document string.
         * @param massageModelName Optional callback to massage model names within the XML file. Return null to skip the model.
         * @param additionalMatrix Optional matrix to get multiplied into the net attachment matrix.
         * @param allowMissingExternalModels Optional boolean to control whether or not missing models in the XML file are ignored or cause an error.
         * @returns A `Promise` of the newly loaded model's root nodes IDs.
         */
        loadSubtreeFromXmlBuffer(nodeId: NodeId, xmlData: string | Document, massageModelName?: MassageModelNameFunc | null, additionalMatrix?: Matrix | null, allowMissingExternalModels?: boolean): Promise<NodeId[]>;
        /**
         * Loads the tree stored in the XML and query loading of required meshes
         * Load order is determined by the projected size of bounding information present in the XML.
         * If streamCutoffScale is set to a non zero value, a file whose projected size is lower than the cutoff will not be streamed until its projected size reaches the cutoff.
         * @param nodeId ID of the node to link the sub tree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param xmlFilename URL of XML file to load.
         * @param modelNameToScs Optional callback to massage model names within the XML file to SCS file URLS or SCS file buffers. Return null to skip the model.
         * @param config Configuration to control load behavior.
         * @returns A `Promise` of the newly loaded model's root nodes IDs that will resolve when all files have been loaded.
         */
        loadSubtreeFromScsXmlFile(nodeId: NodeId, xmlFilename: XmlFilename, modelNameToScs: ModelNameToScsFileFunc | null, config: LoadSubtreeConfig): Promise<NodeId[]>;
        /**
         * Loads the tree stored in the XML and query loading of required meshes
         * Load order is determined by the projected size of bounding information present in the XML.
         * If streamCutoffScale is set to a non zero value, a file whose projected size is lower than the cutoff will not be streamed until its projected size reaches the cutoff.
         * @param nodeId ID of the node to link the sub tree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param xmlFilename URL of XML file to load.
         * @param modelNameToScs Optional callback to massage model names within the XML file to SCS file URLS or SCS file buffers. Return null to skip the model.
         * @param additionalMatrix Optional matrix to get multiplied into the net attachment matrix.
         * @param allowMissingExternalModels Optional boolean to control whether or not missing models in the XML file are ignored or cause an error.
         * @returns A `Promise` of the newly loaded model's root nodes IDs that will resolve when all files have been loaded.
         */
        loadSubtreeFromScsXmlFile(nodeId: NodeId, xmlFilename: XmlFilename, modelNameToScs?: ModelNameToScsFileFunc | null, additionalMatrix?: Matrix | null, allowMissingExternalModels?: boolean): Promise<NodeId[]>;
        /**
         * Loads the tree stored in the XML and query loading of required meshes
         * Load order is determined by the projected size of bounding information present in the XML.
         * If streamCutoffScale is set to a non zero value, a file whose projected size is lower than the cutoff will not be streamed until its projected size reaches the cutoff.
         * @param nodeId ID of the node to link the sub tree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param xmlData XML document or XML document string.
         * @param modelNameToScs Optional callback to massage model names within the XML file to SCS file URLS or SCS file buffers. Return null to skip the model.
         * @param config Configuration to control load behavior.
         * @returns A `Promise` of the newly loaded model's root nodes IDs that will resolve when all files have been loaded.
         */
        loadSubtreeFromScsXmlBuffer(nodeId: NodeId, xmlData: string | Document, modelNameToScs: ModelNameToScsFileFunc | null, config: LoadSubtreeConfig): Promise<NodeId[]>;
        /**
         * Loads the tree stored in the XML and query loading of required meshes.
         * Load order is determined by the projected size of bounding information present in the XML.
         * If streamCutoffScale is set to a non zero value, a file whose projected size is lower than the cutoff will not be streamed until its projected size reaches the cutoff.
         * @param nodeId ID of the node to link the sub tree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param xmlData XML document or XML document string.
         * @param modelNameToScs Optional callback to massage model names within the XML file to SCS file URLS or SCS file buffers. Return null to skip the model.
         * @param additionalMatrix Optional matrix to get multiplied into the net attachment matrix.
         * @param allowMissingExternalModels Optional boolean to control whether or not missing models in the XML file are ignored or cause an error.
         * @returns A `Promise` of the newly loaded model's root nodes IDs that will resolve when all files have been loaded.
         */
        loadSubtreeFromScsXmlBuffer(nodeId: NodeId, xmlData: string | Document, modelNameToScs?: ModelNameToScsFileFunc | null, additionalMatrix?: Matrix | null, allowMissingExternalModels?: boolean): Promise<NodeId[]>;
        /**
         * Loads the tree stored in a model file and query loading of required meshes
         * @param nodeId ID of the node to link the subtree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param modelName The name of the model to load.
         * @param config Configuration to control load behavior.
         * @returns A `Promise` of the newly loaded model's root nodes IDs.
         */
        loadSubtreeFromModel(nodeId: NodeId, modelName: ScModelName, config: LoadSubtreeConfig): Promise<NodeId[]>;
        /**
         * Loads the tree stored in a model file and query loading of required meshes
         * @param nodeId ID of the node to link the subtree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param modelName The name of the model to load.
         * @param additionalMatrix Optional matrix to get multiplied into the net attachment matrix.
         * @returns A `Promise` of the newly loaded model's root nodes IDs.
         */
        loadSubtreeFromModel(nodeId: NodeId, modelName: ScModelName, additionalMatrix?: Matrix | null): Promise<NodeId[]>;
        /**
         * Loads the tree stored in a model file and query loading of required meshes
         * @param nodeId ID of the node to link the subtree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param scsFilename The name of the SCS file to load.
         * @param config Configuration to control load behavior.
         * @returns A `Promise` of the newly loaded model's root nodes IDs.
         */
        loadSubtreeFromScsFile(nodeId: NodeId, scsFilename: ScsUri, config: LoadSubtreeConfig): Promise<NodeId[]>;
        /**
         * Loads the tree stored in a model file and query loading of required meshes
         * @param nodeId ID of the node to link the subtree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param scsFilename The name of the SCS file to load.
         * @param additionalMatrix Optional matrix to get multiplied into the net attachment matrix.
         * @returns A `Promise` of the newly loaded model's root nodes IDs.
         */
        loadSubtreeFromScsFile(nodeId: NodeId, scsFilename: ScsUri, additionalMatrix?: Matrix | null): Promise<NodeId[]>;
        /**
         * Loads the tree stored in a model file and query loading of required meshes
         * @param nodeId ID of the node to link the subtree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param buffer The SCS buffer to load.
         * @param config Configuration to control load behavior.
         * @returns A `Promise` of the newly loaded model's root nodes IDs.
         */
        loadSubtreeFromScsBuffer(nodeId: NodeId, buffer: ScsBuffer, config: LoadSubtreeConfig): Promise<NodeId[]>;
        /**
         * Loads the tree stored in a model file and query loading of required meshes
         * @param nodeId ID of the node to link the subtree with. This ID should not have a type of Body or BodyInstance. If this parameter is null, the sub tree will be linked to the root. This method will trigger a subtreeLoaded event.
         * @param buffer The SCS buffer to load.
         * @param additionalMatrix Optional matrix to get multiplied into the net attachment matrix.
         * @returns A `Promise` of the newly loaded model's root nodes IDs.
         */
        loadSubtreeFromScsBuffer(nodeId: NodeId, buffer: ScsBuffer, additionalMatrix?: Matrix | null): Promise<NodeId[]>;
        /** @deprecated Use [[loadSubtreeFromXmlFile]] instead. */
        loadSubtreeFromUrl(nodeId: NodeId, xmlFilename: XmlFilename): Promise<NodeId[]>;
        /** @deprecated Use [[loadSubtreeFromXmlBuffer]] instead. */
        loadSubtreeFromXML(nodeId: NodeId, xmlData: string): Promise<NodeId[]>;
        /**
         * Delete all the current scene and load the specified model instead. Also triggers a "modelSwitched" when finished.
         * @param newModelFilename Name of the model file to load after the existing scene gets deleted
         * @returns A `Promise` of the newly loaded model's root nodes IDs.
         */
        switchToModel(newModelFilename: ScModelName): Promise<NodeId[]>;
        /**
         * Creates a node
         * @param parentNodeId ID of the node to link the child node to. This ID should not have a type of Body or BodyInstance. If this parameter is `undefined`, the child node will be linked to the root.
         * @param name of the node to create
         * @param nodeID (optional) ID you want the node to have, if not specified the nodeID will be set automatically. Be aware that if the specified node ID is already used by another node, then it will be ignored a new one will be set automatically.
         * @param localMatrix (optional) Initial local matrix of the node (identity if none set)
         * @param visibility (optional) Initial visibility of the node (visible if nothing set)
         * @param measurmentUnit (optional) Specifies optional measurement units for this node. When set to null (the default), the node will inheret the unit setting of the parent node. If set, a scaling matrix will be computed
         *    that scales appropriately based on the unit scaling and applied to the newly created node. If a non-null localMatrix has been specified, that matrix will be combined with the computed scaling matrix.
         * @returns child node ID
         */
        createNode(parentNodeId: NodeId | undefined | null, nodeName: string, nodeId?: NodeId | null, localMatrix?: Matrix | null, visibility?: boolean | null, measurementUnit?: number | null): NodeId;
        /**
         * Delete a node and all its children
         * @param ID of the node
         */
        deleteNode(nodeId: NodeId): Promise<void>;
        /**
         * Creates an part node
         * @param nodeID (optional) ID you want the node to have, if not specified the nodeID will be set automatically. Be aware that if the specified node ID is already used by another node, then it will be ignored and new one will be set automatically.
         * @returns a node ID to access the created part node
         */
        createPart(nodeId?: NodeId | null): PartId;
        /**
         * Set a part on an assembly node
         * @param assemblyNodeID ID of the assembly node
         * @param partNodeID ID of the part node
         * @returns true if all went right, false otherwise
         */
        setPart(assemblyNodeId: NodeId | undefined | null, partNodeId: PartId | undefined | null): boolean;
        /**
         * Creates a representation item on a part
         * @param partNodeId ID of the part node
         * @param repItemId (optional) Id you want the node to have, if not specified the nodeId will be set automatically. Be aware that if the specified node Id is already used by another node, then it will be ignored and a new one will be set automatically.
         * @returns node ID to access the created representation item, null is returned if something went wrong
         */
        createAndAddRepresentationItem(partNodeId: PartId | undefined | null, repItemId?: NodeId | null): NodeId | null;
        /** @deprecated Use [[createAndAddRepresentationItem]] instead. */
        createAndAddBody(partNodeId: PartId | undefined | null, repItemId?: NodeId | null): NodeId | null;
        /**
         * Returns the lowest available node ID
         */
        getLowestAvailableNodeId(): NodeId;
        /** @deprecated Use [[getLowestAvailableNodeId]] instead. */
        getLowestAvailableNodeID(): NodeId;
        /**
         * Allows changing the behavior in the viewer
         * @param instanceModifier InstanceModifier
         * @param nodeIds Array of node ids
         * @param value boolean
         */
        setInstanceModifier(instanceModifier: InstanceModifier, nodeIds: NodeId[], value: boolean): DeprecatedPromise;
        /** @hidden */
        _setInstanceModifier(instanceModifier: InstanceModifier, nodeIds: NodeId[], value: boolean, allowedTypes: Internal.Tree.BodyTypeBits): void;
        /**
         * Returns the SC ID of a body instance
         * @param body node instance ID
         * @returns SC instance ID, a pair of numbers consisting of the inclusion ID and the instance ID. null is returned if the function fails.
         * @deprecated
         */
        getSCInstanceKey(bodyId: BodyId): SC.InstanceInc | null;
        /**
         * Returns the body node instance ID for the given SC instance ID
         * @returns body node instance ID
         * @deprecated
         */
        getNodeIDFromSCInstanceKey(inclusionKey: SC.InclusionKey, instanceKey: SC.InstanceKey): NodeId | null;
        /** @deprecated */
        getPrimaryModelKey(): Promise<SC.ModelKey>;
        /** @deprecated */
        getPrimaryModelId(): Promise<SC.ModelKey>;
        getAssociatedModelKey(nodeId: NodeId): Promise<SC.ModelKey | null>;
        hasDepthRange(nodeIds: NodeId[]): Promise<boolean[]>;
        /**
         * Remaps the depth values used for z-ordering of pixels to the given
         * range, which must be a subset of `[0,1]`. The depth value at the
         * near plane (normally `0`) is mapped to `min` and the value at
         * the far plane (normally `1`) is mapped to `max`.
         *
         * The smaller the range, the more z-fighting you will see among
         * objects set to that range.
         *
         * @param nodeIds the node IDs to operate on
         * @param min the depth value at the near plane
         * @param max the depth value at the far plane
         */
        setDepthRange(nodeIds: NodeId[], min: number, max: number): DeprecatedPromise;
        private _setDepthRange;
        /**
         * Unsets the depth range set by [[setDepthRange]].
         * @param nodeIds the node IDs to operate on
         */
        unsetDepthRange(nodeIds: NodeId[]): void;
        /** @hidden */
        _gatherInstanceIncsFromNodeIds(nodeIds: NodeId[], allowedTypes?: Internal.Tree.BodyTypeBits): SC.InstanceIncs;
        private _getInstanceIncsFromLeafNodes;
        private _getInstanceIncFromSingleLeafNode;
        /**
         * Sets the desired mesh level
         * @param nodeIds IDs of nodes in the assembly on which mesh level will be set
         * @param meshLevel 0 standard, 1 low, 2 extra low
         * @returns Promise that resolves when the operation has completed.
         */
        setMeshLevel(nodeIds: NodeId[], meshLevel: number): DeprecatedPromise;
        /**
         * Sets the metallic and roughness factors for the supplied nodes materials.
         * Materials that are not currently set to use the Metallic Roughness shading model will be upgraded to use this mode.
         * @param nodeIds List of nodes to set material properties for
         * @param metallicFactor The metalness of the material
         * @param roughnessFactor The roughness of the material
         */
        setMetallicRoughness(nodeIds: NodeId[], metallicFactor: number, roughnessFactor: number): void;
        /**
         * Gets the metallic and roughness factors for the supplied nodes materials.
         * Materials that are not currently set to use the Metallic Roughness shading model will have a null entry
         * @param nodeIds List of nodes to get material properties for
         */
        getMetallicRoughness(nodeIds: NodeId[]): Promise<(MetallicRoughnessValue | null)[]>;
        /**
         * Unsets the metallic and roughness values set with [[setMetallicRoughness]]
         * These materials will no longer use the Metallic Roughness shading model.
         * @param nodeIds List of nodes to unset material properties for
         */
        unsetMetallicRoughness(nodeIds: NodeId[]): void;
        /**
         * If enabled then models loaded into an existing scene with a different unit value will be scaled to the unit value of the current scene.
         * @param enabled value indicating if automatic unit scaling will be active
         */
        setEnableAutomaticUnitScaling(enabled: boolean): void;
        /**
         * By default, objects that are initially hidden stays hidden unless specifically set to be shown. This function allows this behavior to be disabled.
         * @param enabled value indicating if initially hidden objects stay hidden
         */
        setBehaviorInitiallyHidden(enabled: boolean): void;
        /**
         * Tells if the model is a CAD drawing or not
         * @returns true if the model is a CAD drawing
         */
        isDrawing(): boolean;
        /**
         * @returns true if the model contains measurement data.
         */
        isMeasurable(): boolean;
        /**
         * @returns the original file name of the model which contain the given node or null if the node is not found.
         */
        getModelFileNameFromNode(nodeId: NodeId): string | null;
        /**
         * @returns the original file type of the model which contain the given node or null if the node is not found.
         */
        getModelFileTypeFromNode(nodeId: NodeId): FileType | null;
        /**
         * @returns the generic type of the given node or null if the node is not found.
         */
        getNodeGenericType(nodeId: NodeId): GenericType | null;
        /**
         * @returns the generic id of the given node or null if the node is not found.
         */
        getNodeGenericId(nodeId: NodeId): GenericId | null;
        /**
         * This function recursively discovers BIM nodes in the supplied subtree and registers them.
         * @param startNodeId The root of the subtree to walk for registration.
         * @param attributeToMask The callback used to obtain a node's [[BimMask]] from its attributes.
         * @returns Promise that resolves when the operation has completed.
         */
        registerBimNodes(startNodeId: NodeId, attributeToMask: (value: string) => BimMask, legacy_useAttributeTitle?: string | boolean | null): Promise<void>;
        /**
         * Gets all generic types and NodeIds with that type.
         * @returns Map containing generic types and NodeIds
         */
        getGenericTypeIdMap(): Map<GenericType, Set<NodeId>>;
        /** @deprecated Use [[getGenericTypeIdMap]] instead. */
        getIfcNodeIds(): Map<GenericType, Set<NodeId>>;
        /** @deprecated Use [[getGenericTypeIdMap]] instead. */
        getIfcTypeByNodeId(id: NodeId): GenericType | null;
        /**
         * This function returns all NodeIds with an IFC type.
         * @param genericType
         * @returns All NodeIds with an IFC type
         */
        getNodesByGenericType(genericType: GenericType): Set<NodeId> | null;
        /** @deprecated Use [[getNodesByGenericType]] instead. */
        getNodesByIfcType(ifcType: IfcType): Set<NodeId> | null;
        /**
         * This function gets all generic types contained in the model.
         * @returns All generic types.
         */
        getGenericTypes(): GenericType[];
        /** @deprecated Use [[getGenericTypes]] instead. */
        getIfcTypes(): GenericType[];
        /**
         * Checks if a [[NodeId]] is a generic type.
         * @param nodeId
         * @param genericType
         */
        hasEffectiveGenericType(nodeId: NodeId, genericType: GenericType): boolean;
        /**
         * This function recursively discovers IFC nodes in the supplied subtree and registers them.
         * @param startNodeId The root of the subtree to walk for registration.
         * @returns Promise that resolves when the operation has completed.
         */
        registerIfcNodes(startNodeId: NodeId, legacy_useAttributeTitle?: string | boolean | null): Promise<void>;
        /**
         * Tells if the view is an annotation view or not
         * @param cadViewNodeId Node ID of the CAD view
         * @returns true if the view is an annotation view
         */
        isAnnotationView(cadViewNodeId: CadViewId): boolean;
        /**
         * Sets a vector and angle used to determine an object's visibility based on camera orientation.
         * @param space The space in which the culling vector is defined.
         * @param vector A vector that will be compared with the view vector.
         * @param toleranceDegrees The maximum angle between the culling vector and the view vector within which the object will be visible.
         */
        setNodesCullingVector(nodeIds: NodeId[], space: CullingVectorSpace, vector: Point3, toleranceDegrees: Degrees): DeprecatedPromise;
        private _setNodesCullingVector;
        /**
         * Unsets the vector and angle used to determine an object's visibility based on camera orientation.
         * @param nodeIds The nodes to unset culling vectors on.
         */
        unsetNodesCullingVectors(nodeIds: NodeId[]): DeprecatedPromise;
        private _unsetNodesCullingVectors;
        /**
         * Retrieves the vector and angle used to determine an object's visibility based on camera orientation.
         * If unset, `null` will appear at the corresponding array index.
         * @param nodeIds The nodes to query culling vectors from.
         * @returns A promise of culling vectors.
         */
        getNodesCullingVectors(nodeIds: NodeId[]): Promise<(CullingVector | null)[]>;
        /**
         * Retrieves the node ID offset for a given node.
         * @param nodeId The node to obtain the node ID offset from.
         * @returns The node ID offset for the supplied node.
         */
        getNodeIdOffset(nodeId: NodeId): NodeIdOffset;
        /**
         * Queries if a node is fully loaded or not.
         * @param nodeId The node to query.
         * @returns True if the node is fully loaded; false otherwise.
         */
        isNodeLoaded(nodeId: NodeId): boolean;
        /**
         * Triangulates the supplied polygon.
         * @param polygonPoints An array of point data for the polygon. Points are stored [XYZXYZXYZ...] format.
         * @param normal The normal of the polygon to triangulate.
         * @returns An array containing the point data for the generated triangles. Points are stored [XYZXYZXYZ...] format.
         *          This returned list is always divisible by 9 (3 points per triangle; 3 floats per point).
         */
        triangulatePolygon(polygonPoints: Float32Array | number[], normal: Point3): Float32Array;
        /**
         * Applies the given line pattern to the specified nodes. See also [[unsetNodesLinePattern]].
         * @param nodeIds The IDs of the nodes.
         * @param pattern The line pattern. See [[LinePattern]] for details.
         * @param patternLength The length of a single repetition of the line pattern.
         * @param patternLengthUnit The unit in which the length of the pattern is measured. See [[LinePatternLengthUnit]] for details.
         */
        setNodesLinePattern(nodeIds: NodeId[], pattern: LinePattern, patternLength: number, patternLengthUnit: LinePatternLengthUnit): void;
        /**
         * Removes the line pattern applied by [[setNodesLinePattern]].
         * @param nodeIds The IDs of the nodes.
         */
        unsetNodesLinePattern(nodeIds: NodeId[]): void;
        /** @hidden */
        _hwfAwaitAssemblyTreeReady(): Promise<void>;
        /**
         * Returns all the `UserDataIndex` items associated with the input node.
         * @param nodeId The ID of the node to query.
         * @returns A list of `UserDataIndex`, possibly empty.
         * @throws `InvalidNodeIdError`
         */
        getNodeUserDataIndices(nodeId: NodeId): UserDataIndex[];
        /**
         * Returns the user data for a given node and index.
         * @param nodeId The ID of the node to query.
         * @param index The index of the data.
         * @returns The user data.
         * @throws `InvalidNodeIdError` `InvalidIndexError`
         */
        getNodeUserData(nodeId: NodeId, index: UserDataIndex): Uint8Array;
        /**
         * Returns a list of node IDs given a list of generic IDs. Note that the
         * returned list of node IDs may be longer than the provided list of generic
         * IDs since one ID can be used by more than one node.
         * @param genericIds Array of generic IDs to find nodes fore
         * @returns Array of node ids corresponding to the provided generic IDs
         */
        getNodeIdsByGenericIds(genericIds: GenericId[]): NodeId[];
        /** @deprecated Use [[getNodeIdsByGenericIds]] instead. */
        getNodeIdsByIfcGuids(ifcGuids: IfcGuid[]): NodeId[];
        /** @hidden */
        _getModelStructure(): Internal.Tree.ModelStructure;
        /**
         * Returns true if the node is within an external model.
         * @param nodeId
         */
        isWithinExternalModel(nodeId: NodeId): boolean;
        /** @hidden */
        _firstAssemblyDataHeader(): Internal.Tree.AssemblyDataHeader | null;
        /**
         * Retrieves the bim id of the corresponding node id.
         * @param node the id of the node for which you want its bim id.
         * @returns the bim id corresponding to the node or null if none.
         */
        getBimIdFromNode(node: NodeId): BimId | null;
        /**
         * Retrieves the bim ids of the corresponding generic id.
         * @param ifcGuid the generic id for which you want its bim id.
         * @returns the bim id corresponding to the ifcGuid or null if none.
         */
        getBimIdsFromGenericId(ifcGuid: GenericId): BimId[];
        /**
         * Retrieves the node id of the corresponding bim id.
         * @param node any known node id of the working model.
         * @param bimID bim id for which you want its node id.
         * @returns the node id corresponding to the BimId or null if none.
         */
        getNodeIdFromBimId(node: NodeId, bimID: BimId): NodeId | null;
        /**
         * Retrieves the generic id of the corresponding bim id.
         * @param node any known node id of the working model.
         * @param bimId bim id for which you want its generic id.
         * @returns the generic id corresponding to the BimId or null if none.
         */
        getGenericIdFromBimId(node: NodeId, bimId: BimId): GenericId | null;
        /**
         * Retrieves all type of relationships that a bim id has.
         * @param node any known node id of the working model.
         * @param bimId bim id for which you want its types of relationships.
         * @returns array of type of relationship corresponding to the BimId.
         */
        getRelationshipTypesFromBimId(node: NodeId, bimId: BimId): RelationshipType[];
        /**
         * Retrieve all related relationships that a bim id have.
         * @param node any known node id of the working model.
         * @param bimId bim id for which you want its related relationships.
         * @returns array of bim id which are the related relationship of the BimId.
         */
        getBimIdRelatedElements(node: NodeId, bimId: BimId, type: RelationshipType): BimId[];
        /**
         * Retrieve all relating relationships that a bim id have.
         * @param node any known node id of the working model.
         * @param bimId bim id for which you want its relating relationships.
         * @returns array of bim id which are the relating relationship of the BimId.
         */
        getBimIdRelatingElements(node: NodeId, bimId: BimId, type: RelationshipType): BimId[];
        /**
         * Retrieve all relationships that a bim id have, sorted in 2 arrays (relateds and relatings)
         * @param node any known node id of the working model.
         * @param bimId bim id for which you want its relationships.
         * @returns double array of bim id of relationship of the BimId sorted by its relateds and its relatings.
         */
        getBimIdConnectedElements(node: NodeId, bimId: BimId, type: RelationshipType): {
            relateds: BimId[];
            relatings: BimId[];
        };
        /**
         * Retrieve the name of the bim element
         * @param bimId bim id for which you want the bim element name.
         * @param node any known node id of the working model.
         * @returns the name and the info regarding the connection to a node of the bim element.
         */
        getBimInfoFromBimId(node: NodeId, bimId: BimId): {
            name: string;
            connected: boolean;
        };
    }
}
declare namespace Communicator {
    /**
     * This class provides an interface to the navigational cube which is enabled by default. The default functionality changes the camera's view orientation based on the location the user clicks on the cube.
     * This cube is initialized and associated with an overlay when the viewer is created. For additional information on overlays please refer to the [[Communicator.OverlayManager]].
     *
     * More information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/scene_attributes/axis-triad-and-navcube.html).
     */
    class NavCube {
        private readonly _viewer;
        private _position;
        private _viewportSize;
        private _anchor;
        private _dimension;
        private _fieldSize;
        private readonly _instanceKeys;
        private _enabled;
        private _textImageId;
        private _fontInfo;
        private _fontSize;
        private _textureSize;
        private readonly _selectionFaceColor;
        private readonly _outlineColor;
        private readonly _lastSelectedNodes;
        private readonly _nodeIds;
        private readonly _adjacentFaces;
        private _preserveModelUp;
        private _cameraRotation;
        private _lastOrientation;
        private _lastCamera;
        private _lastFaceIndex;
        private readonly _textWidths;
        private static readonly _faceTexts;
        private readonly _sceneReadyCompleted;
        private _texturesReady;
        private _geometryCreated;
        /** @hidden */
        constructor(viewer: WebViewer);
        /**
         * Sets the anchor position for the NavCube.
         * @param anchor the anchor position.
         */
        setAnchor(anchor: OverlayAnchor): Promise<void>;
        /**
         * Gets the anchor position for the NavCube. Default position is in the UpperRightCorner, see [[Communicator.OverlayAnchor]] for more details.
         */
        getAnchor(): OverlayAnchor;
        /**
         * Enables the NavCube.
         */
        enable(): DeprecatedPromise;
        /**
         * Disables the NavCube.
         */
        disable(): DeprecatedPromise;
        /**
         * Determines if model up or camera up will the preserved when navigating with the NavCube.
         * If model up is preserved, navigation with the NavCube will keep the model upright all the time.
         * If camera up is preserved, navigation with the NavCube will attempt to preserve the current up direction of
         * the camera as much as possible.
         * Defaults to `true`.
         * @param preserve If true, model up is preserved. Otherwise, camera up is preserved.
         */
        setPreserveModelUp(preserve: boolean): void;
        /**
         * Gets the NavCube preserveModelUp state.
         * @returns true if model up is preserved, false if camera up is preserved.
         */
        getPreserveModelUp(): boolean;
        /**
         * Sets the visibility for the NavCube based on the enabled and textures state.
         */
        private _updateVisibility;
        /**
         * Hides the overlay window
         */
        private _hideOverlay;
        /**
         * Shows the overlay window
         */
        private _showOverlay;
        /**
         * Gets whether the NavCube is currently enabled.
         */
        getEnabled(): boolean;
        /**
         * Gets the associated overlay id.
         */
        getOverlayId(): OverlayIndex;
        private _setTextures;
        private _updateViewport;
        private _createViewport;
        private _onViewportSet;
        private _createGeometry;
        private _createTexture;
        /** @hidden */
        _geometryHasBeenCreated(): boolean;
        /**
         * Determines whether or not a point is inside the NavCube overlay.
         * @param mousePos
         * @returns Boolean indicating whether the provided point is inside the NavCube overlay
         */
        insideOverlay(mousePos: Point2): boolean;
        /** @hidden */
        _getOverlayOffset(): Point2;
        /** @hidden */
        _getViewportSize(): OverlayUnitPoint;
        /** @hidden */
        _getViewportPixelSize(): Point2;
        /** @hidden */
        _onNoSelection(): void;
        /**
         * Called when the NavCube is clicked. Realigns the view to the side/edge/corner
         * selected by `selection`, or rotates the view 90 degrees if the selection matches
         * the current view orientation, or does nothing if no side is selected.
         * @param selection
         */
        onClickSelection(selection: Selection.SelectionItem | null): Promise<void>;
        /**
         * Called when the NavCube is "moused over". Displays face/edge/corner that will be selected.
         * @param selection
         */
        onMoveSelection(selection: Selection.SelectionItem | null): void;
        /**
         * Returns the corresponding view orientation for each node index.
         * If the node indexes change in the future, this will need to be updated.
         */
        private _getViewOrientationFromFaceIndex;
        private _setViewOrientation;
        private _getScEngine;
        private _createInstance;
        private _createCube;
        private _onCameraUpdate;
        private _updateOrientationMatrices;
        private _createSelectionFace;
        private _createQuad;
        private _makeRotationMatrixX;
        private _makeRotationMatrixY;
        private _makeRotationMatrixZ;
        private _getFaceIndexFromNodeId;
        private _getNodeIdFromFaceIndex;
        private _isSameEdge;
        private _initializeTextures;
    }
}
declare namespace Communicator {
    /**
     * Main interface into the Operator functionality of the viewer.
     * The OperatorManager manages a number of operators in a stack and allows the user to register and unregister new operators.
     */
    class OperatorManager {
        private readonly _operatorStack;
        private readonly _operators;
        private _customOperatorIdCount;
        private readonly _customOperatorIdIndex;
        private readonly _viewer;
        private _eventSequencePromise;
        private _events;
        /** @hidden */
        constructor(viewer: WebViewer);
        /** @hidden */
        _shutdown(): void;
        /** @hidden */
        _registerOperator(operatorId: BuiltInOperatorId, operator: Operator.Operator): void;
        /**
         * Registers a custom operator
         * @param operator
         * @returns operatorId
         */
        registerCustomOperator(operator: Operator.Operator): OperatorId;
        /**
         * Removes a custom operator from the registered operator list.
         * @param operatorId
         */
        unregisterCustomOperator(operatorId: OperatorId): void;
        /**
         * Replaces the operator that the specified id refers to. Returns a boolean indicating success or failure.
         * @param previousOperatorId operator id for the operator to be replaced.
         * @param newOperatorId operator id for the new operator.
         */
        replaceOperator(previousOperatorId: OperatorId, newOperatorId: OperatorId): boolean;
        /**
         * Returns the index of an operator on the stack
         * @param operatorId
         * @returns operator index or -1 if not found
         */
        indexOf(operatorId: OperatorId): number;
        /**
         * Adds an operator on the stack if it's not already on the stack
         * @param operatorId id of the operator to add to the stack
         * @returns boolean indicating success or failure
         */
        push(operatorId: OperatorId): boolean;
        /**
         * Sets a position on the stack to an operator if it's not already on the stack
         * If there is already an operator in that position, it is replaced.
         * @param operatorId id of the operator to add to the stack
         * @param position position on the stack to assign
         * @returns boolean indicating success or failure
         */
        set(operatorId: OperatorId, position: number): boolean;
        /**
         * Removes an operator from the top of the stack
         * @returns the operator id
         */
        pop(): OperatorId | undefined;
        /**
         * Removes an operator from the stack
         * @param operatorId id of the operator to remove from the stack
         */
        remove(operatorId: OperatorId): void;
        /**
         * @returns the operator id at the top of the stack
         */
        peek(): OperatorId;
        /**
         * Removes all operators from the stack
         */
        clear(): void;
        /**
         * @returns the operator stack size
         */
        size(): number;
        /**
         * @param id
         * @returns Operator reference
         */
        getOperator(id: OperatorId.Navigate): Operator.CameraNavigationOperator;
        getOperator(id: OperatorId.Orbit): Operator.CameraOrbitOperator;
        getOperator(id: OperatorId.Pan): Operator.CameraPanOperator;
        getOperator(id: OperatorId.Zoom): Operator.CameraZoomOperator;
        getOperator(id: OperatorId.WindowZoom): Operator.CameraWindowZoomOperator;
        getOperator(id: OperatorId.Walk): Operator.CameraKeyboardWalkOperator;
        getOperator(id: OperatorId.KeyboardWalk): Operator.CameraKeyboardWalkOperator;
        getOperator(id: OperatorId.WalkMode): Operator.CameraWalkModeOperator;
        getOperator(id: OperatorId.Turntable): Operator.CameraTurntableOperator;
        getOperator(id: OperatorId.Select): Operator.SelectionOperator;
        getOperator(id: OperatorId.AreaSelect): Operator.AreaSelectionOperator;
        getOperator(id: OperatorId.RayDrillSelect): Operator.RayDrillSelectionOperator;
        getOperator(id: OperatorId.RedlineCircle): Operator.RedlineCircleOperator;
        getOperator(id: OperatorId.RedlineText): Operator.RedlineTextOperator;
        getOperator(id: OperatorId.RedlineRectangle): Operator.RedlineRectangleOperator;
        getOperator(id: OperatorId.RedlinePolyline): Operator.RedlinePolylineOperator;
        getOperator(id: OperatorId.MeasureEdgeLength): Operator.MeasureEdgeLengthOperator;
        getOperator(id: OperatorId.MeasureFaceFaceDistance): Operator.MeasureFaceFaceDistanceOperator;
        getOperator(id: OperatorId.MeasurePointPointDistance): Operator.MeasurePointPointDistanceOperator;
        getOperator(id: OperatorId.MeasureFaceFaceAngle): Operator.MeasureFaceFaceAngleOperator;
        getOperator(id: OperatorId.MeasurePolylineDistance): Operator.MeasurePolylineDistanceOperator;
        getOperator(id: OperatorId.MeasurePolygonArea): Operator.MeasurePolygonAreaOperator;
        getOperator(id: OperatorId.Note): Operator.NoteOperator;
        getOperator(id: OperatorId.Cutting): Operator.CuttingPlaneOperator;
        getOperator(id: OperatorId.Handle): Operator.HandleOperator;
        getOperator(id: OperatorId.NavCube): Operator.NavCubeOperator;
        getOperator(id: BuiltInOperatorId): Operator.Operator;
        getOperator(id: OperatorId): Operator.Operator | null;
        private _injectEvent;
        injectEvent(event: Event.MouseInputEvent | Event.TouchInputEvent | Event.KeyInputEvent | Event.MouseWheelInputEvent, eventType: EventType): Promise<void>;
        private _injectNextEvent;
        private _stopInteraction;
        /** @hidden */
        _injectViewOrientationChangeEvent(): void;
        private _isValid;
        private _contains;
        private _activateOperator;
        private _deactivateOperator;
    }
}
declare namespace Communicator {
    /**
     * @hidden
     * Represents a point or size defined with [[OverlayUnit]]s.
     */
    class OverlayUnitPoint {
        x: number;
        xUnit: OverlayUnit;
        y: number;
        yUnit: OverlayUnit;
        constructor(x: number, xUnit: OverlayUnit, y: number, yUnit: OverlayUnit);
    }
    /**
     * The OverlayManager exposes functionality for creating overlays that are layered on top of the 3d scene. More
     * information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/scene_attributes/overlays.html).
     * An overlay defines a viewport on the screen with an associated camera.
     * These overlays are useful for creating axis triads, navigational cubes, or similar elements.
     * The overlays are not designed to create multiple views of a model. Therefore, inserting large amounts of
     * geometry into overlays isn't recommended.
     */
    class OverlayManager {
        private readonly _viewer;
        private readonly _engine;
        private _viewports;
        /** @hidden */
        constructor(viewer: WebViewer, engine: Internal.ScEngine);
        /**
         * Gets the maximum index value that can be used for indexing overlays.
         * @returns the maximum index value.
         */
        maxIndex(): OverlayIndex;
        /**
         * Creates an overlay or updates an existing one.
         * @param index the index of the overlay. This value may be any number between 1 and maxIndex(). If No overlay exists for this index one will be created.
         * @param anchor the anchor point for the viewport.
         * @param x the x value of the viewport location.
         * @param xUnit the unit type of the x parameter.
         * @param y the y value of the viewport location.
         * @param yUnit the unit type of the y parameter.
         */
        setViewport(index: OverlayIndex, anchor: OverlayAnchor, x: number, xUnit: OverlayUnit, y: number, yUnit: OverlayUnit, width: number, widthUnit: OverlayUnit, height: number, heightUnit: OverlayUnit): DeprecatedPromise;
        /**
         * @hidden
         * Gets the position of a viewport as it was defined with OverlayUnits
         * @param index Index to get position of
         * @returns OverlayUnitPoint expressing overlay's position
         */
        _getViewportPosition(index: OverlayIndex): OverlayUnitPoint | null;
        /**
         * Gets position in pixels of the viewport with the supplied index, or `null` if none has been set.
         * Note: This does not take the anchor point into account
         * @param index The index of the overlay to get the position of.
         */
        getViewportPixelPosition(index: OverlayIndex): Point2 | null;
        /**
         * Gets the calculated position of the upper-left corner of the viewport with the supplied index, or `null`
         * if none has been set.
         * @param index The index of the overlay to get the offset of
         */
        getViewportPixelOffsetInCanvas(index: OverlayIndex): Point2 | null;
        /**
         * @hidden
         * Gets the size of a viewport as it was defined with OverlayUnits
         * @param index Index to get size of
         * @returns OverlayUnitPoint expressing overlay's size
         */
        _getViewportSize(index: OverlayIndex): OverlayUnitPoint | null;
        /**
         * Gets size in pixels of the viewport with the supplied index, or `null` if none has been set.
         * @param index The index of the overlay to get the size of.
         */
        getViewportPixelSize(index: OverlayIndex): Point2 | null;
        /**
         * Get the anchor point of the viewport with the supplied index, or `null` if none has been set.
         * @param index The index of the overlay to get the anchor of.
         */
        getViewportAnchor(index: OverlayIndex): OverlayAnchor | null;
        /**
         * Sets the visibility state for the given viewport.
         * @param index the overlay index.
         * @param visibility boolean value indicating whether the overlay should be rendered.
         */
        setVisibility(index: OverlayIndex, visibility: boolean): DeprecatedPromise;
        /**
         * Removes an overlay from the system. All nodes that have been assigned to this overlay will be returned to the default view.
         * @param index the index of the overlay to destroy.
         */
        destroy(index: OverlayIndex): DeprecatedPromise;
        /**
         * Adds nodes into the overlay at the given index. They will no longer be rendered in the main window or any other overlay.
         * This method should not be called before the model structure ready callback has been triggered.
         * @param index the overlay index to add nodes into.
         * @param nodes the nodes to add into the overlay.
         */
        addNodes(index: OverlayIndex, nodes: NodeId[]): DeprecatedPromise;
        /**
         * Sets the camera for the given index.
         * @param index
         * @param camera
         */
        setCamera(index: OverlayIndex, camera: Camera): DeprecatedPromise;
        /** @hidden */
        _getOverlayOffset(anchor: OverlayAnchor, viewportPixelSize: Point2): Point2;
        /**
         * @hidden
         * Converts an OverlayUnitPoint to a pixel defined Point2 using the viewer's current dimensions
         * @param unitPoint Point defined with [[OverlayUnit]]s to convert
         * @returns point expressed in pixels based on viewer's current size
         */
        _toPixelPoint(unitPoint: OverlayUnitPoint): Point2;
        private _validateUnit;
    }
}
declare namespace Communicator {
    enum BimMask {
        None = 0,
        Floor = 1,
        Wall = 2,
        Door = 4
    }
    /**
     * Configuration for all pick functions in the View class.
     */
    class PickConfig {
        constructor(selectionMask?: SelectionMask);
        /** Returns a copy of this [[PickConfig]]. */
        copy(): PickConfig;
        allowFaces: boolean;
        allowLines: boolean;
        allowPoints: boolean;
        /** Configures what types of entities are considered for selection. */
        selectionMask: SelectionMask;
        /** (8 bits) If requiredBitsAny are supplied, a mesh can only be selected if its selection bits have any of the ones supplied. */
        requiredBitsAny?: number;
        /** (8 bits) If requiredBitsAll are supplied, a mesh can only be selected if its selection bits have all the ones supplied. */
        requiredBitsAll?: number;
        /** (8 bits) If rejectionBitsAny are supplied, a mesh cannot be selected if its selection bits have any of the ones supplied. */
        rejectionBitsAny?: number;
        /** (8 bits) If rejectionBitsAll are supplied, a mesh cannot be selected if its selection bits have all the ones supplied. */
        rejectionBitsAll?: number;
        /** Configures whether or not visibility is respected when performing a selection. */
        respectVisibility: boolean;
        /**
         * For each element type bit in this mask, if the bit is on, then scene visibility and geometry visibility
         * are treated as if that element type is visible during selection.
         */
        forceEffectiveVisibilityMask: SelectionMask;
        /**
         * For each element type bit in this mask, if the bit is on, then scene visibility is treated
         * as if that element type is visible during selection.
         */
        forceEffectiveSceneVisibilityMask: SelectionMask;
        /**
         * Configures whether or not depth range is respected when performing a selection.
         * This option is only relevant for screen selection.
         */
        respectDepthRange: boolean;
        /**
         * If true, then only one entity per entity type can be returned per instance.
         *
         * For example, consider a cube made from a single mesh instance, where each face is
         * a different face entity and backfaces culling is disabled. If this option is true,
         * then at most one face from the cube can be selected. If false, then multiple faces
         * from the cube can be selected. (This can occur when selecting from the front of the
         * cube and then obtaining the face behind the front face in addition to the front face.)
         */
        oneEntityPerTypePerInstance: boolean;
        /**
         * Configures whether or not line and point selection is restricted to instances that get selected by face.
         * This is only a heuristic and may be ignored.
         * This option is only relevant for screen selection.
         */
        restrictLinesAndPointsToSelectedFaceInstances: boolean;
        /**
         * If true, faces can be selected by proximity (like lines and points).
         * This option is only relevant for screen selection.
         */
        enableProximityFaces: boolean;
        /** Configures whether or not capping geometry is ignored when computing selection results. */
        ignoreCappingGeometry: boolean;
        /**
         * If true, selection will not process geometry contained in overlays.
         * This option is only relevant for screen selection.
         */
        ignoreOverlays: boolean;
        /**
         * If true, selection is performed only within overlays.
         * This option is only relevant for screen selection.
         */
        restrictToOverlays: boolean;
        /** If set, selection will be restricted to geometry of the specified BIM types. */
        bimMask?: BimMask;
        /**
         * If supplied, this is the maximum distance in world-space along
         * the selection ray that can be used to select any geometry.
         *
         * If this value is negative, it is ignored.
         *
         * This parameter is incompatible with line and point selection.
         */
        maxWorldDistance?: number;
    }
    class IncrementalPickConfig {
        constructor(selectionMask?: SelectionMask);
        /** Configures whether or not items must be fully contained in the selection volume to be selection candidates. */
        mustBeFullyContained: boolean;
        /** Configures whether or not visibility is respected when performing a selection. */
        respectVisibility: boolean;
        /**
         * For each element type bit in this mask, if the bit is on, then scene visibility and geometry visibility
         * are treated as if that element type is visible during selection.
         */
        forceEffectiveVisibilityMask: SelectionMask;
        /**
         * For each element type bit in this mask, if the bit is on, then scene visibility is treated
         * as if that element type is visible during selection.
         */
        forceEffectiveSceneVisibilityMask: SelectionMask;
        /** If set, selection will be restricted to geometry of the specified BIM types. */
        bimMask?: BimMask;
        /** Configures whether or not faces are considered for selection. */
        allowFaces: boolean;
        /** Configures whether or not lines are considered for selection. */
        allowLines: boolean;
        /** Configures whether or not points are considered for selection. */
        allowPoints: boolean;
        /** Configures whether or not cutting sections are ignored during selection. */
        ignoreCuttingSections: boolean;
        /**
         * If false, instances that have not yet been streamed will be processed.
         * If true, instances that have not yet been streamed will be ignored.
         */
        onlyStreamedInstances: boolean;
        /**
         * This config option only applies for [[StreamingMode.OnDemand]] viewer sessions.
         * If true, then in nodes that are not requested will not be selected.
         * If false, then non-requested nodes can be selected.
         */
        ignoreUnrequestedInstances: boolean;
    }
    /** @deprecated Use [[IncrementalPickConfig]] instead. */
    type VolumePickConfig = IncrementalPickConfig;
}
/** @hidden */
declare namespace SC {
    const UnspecifiedMeasurementUnit = 0;
    function isError(x: any): x is OpaqueError;
    function getStateFailure(error: OpaqueError): StateFailure | null;
}
declare namespace Communicator.Internal {
    const enum KeyInfoBy {
        Attachment = 0,
        Model = 1
    }
    const enum KeyInfoReturn {
        AllKeys = 0,
        KeyCountOnly = 1
    }
    interface CuttingSectionLimits {
        maxCuttingSections: number;
        maxCuttingPlanesPerSection: number;
    }
    namespace ScEngine {
        interface InitOptions {
            enginePath?: string;
            engineReady: (sessionStartedPromise: Promise<void>) => void;
            priorityMetaDataSent: (attachScope: SC.AttachScope, prototypeInstanceCount: number) => void;
            renderComplete: () => void;
            sceneReady: () => void;
            streamingActivated: () => void;
            streamingDeactivated: () => void;
        }
    }
    const enum RequestBatchType {
        MetaData = 0,
        Count = 1
    }
    class ScEngine implements Tree.AbstractScEngine {
        private readonly _callbackManager;
        private _sc;
        private _sessionType;
        private _matrixCache;
        private _scSelectionManager;
        private _initOptions;
        private _canvasContainer;
        private readonly _engineReadyPromise;
        private readonly _sessionStartedPromise;
        private _connectionlessEmpty;
        private _uri;
        private _model?;
        private _sessionToken?;
        private _buffer?;
        private _streamingMode;
        private _rendererType;
        private _meshLevel;
        private _memoryLimit;
        private _boundingPreviewMode;
        private _streamCutoffScale;
        private _loadFinished;
        private _statistics;
        private _cachedTriangleCount;
        private _cachedElementCount;
        private readonly _windowSize;
        private _syncedCamera?;
        private readonly _cuttingSectionToKeyMap;
        private readonly _cappingQuantizationGranularity;
        private _cappingFaceColor;
        private _cappingLineColor;
        private _cappingGeometryVisibility;
        private _cappingNeedsUpdate;
        private _cappingDelayTimeoutId;
        private _cappingDelay;
        private _requestBatchCountByType;
        private _pendingRequestsByType;
        constructor(callbackManager: CallbackManager, options: WebViewerConfig);
        getNetworkModelName(): ScModelName;
        logMessage(message: string): void;
        setTimeout(handler: () => void, timeout: number): number;
        sleep(duration: Milliseconds): Promise<void>;
        getScsInfo(): ScsUri | ScsBuffer | null;
        private _applyOptions;
        start(canvasContainer: HTMLDivElement, options: ScEngine.InitOptions): boolean;
        setPickTolerance(tolerance: number): void;
        getPickTolerance(): number;
        private _onEngineReady;
        loadFinished(): boolean;
        resetCachedStatistics(): void;
        setAmbientOcclusionEnabled(enabled: boolean): void;
        setAmbientOcclusionRadius(radius: number): void;
        setLightingEnabled(enabled: boolean): void;
        private _fillStatTotalCounts;
        private _updateCachedStats;
        private _toVector3;
        startExplode(incs: SC.InstanceIncs, vector: Point3): void;
        setExplodeMagnitude(magnitude: number): void;
        stopExplode(): void;
        getStatistics(forceUpdate?: boolean): Promise<StatisticMap>;
        setStreamIdleMarker(): Promise<void>;
        hasDepthRange(incs: SC.InstanceIncs): Promise<boolean[]>;
        setDepthRange(incs: SC.InstanceIncs, min: number, max: number): void;
        unsetDepthRange(incs: SC.InstanceIncs): void;
        setDefaultDepthRange(min: number, max: number): void;
        _getScPlaneArray(cuttingSection: CuttingSection): SC.Plane3[];
        getCuttingSectionLimits(): CuttingSectionLimits;
        private _addCuttingSection;
        addCuttingSection(cuttingSection: CuttingSection): Promise<void>;
        removeCuttingSection(cuttingSection: CuttingSection): Promise<void>;
        removeAllCuttingSections(): void;
        updateCuttingSection(cuttingSection: CuttingSection): Promise<void>;
        setCappingDelay(delayInMilliseconds: number): void;
        enableCappingIdleCallback(enable: boolean): Promise<boolean>;
        delayCapping(): void;
        setCappingGeometryVisibility(cappingGeometryVisibility: boolean): void;
        private _regenerateCapping;
        getCappingGeometryVisibility(): boolean;
        private _toRgb;
        private _toRgba;
        setCappingFaceColor(color: Color | null): void;
        setCappingLineColor(color: Color | null): void;
        private _onSessionStarted;
        isInit(): boolean;
        setRemoteEndpoint(uri: string, modelName: ScModelName): void;
        getSessionType(): SC.SessionType;
        private _awaitEmptyLoad;
        loadEmpty(): Promise<void>;
        private _loadEmpty;
        private _loadEmptyScs;
        private _loadEmptyNetwork;
        setProjection(projection: Projection): void;
        getViewMatrix(camera?: Camera): Matrix;
        getProjectionMatrix(camera?: Camera): Matrix;
        getFullCameraMatrix(camera?: Camera): Matrix;
        getSynchedViewMatrix(): Matrix;
        getSynchedProjectionMatrix(): Matrix;
        getPrimaryModelKey(): Promise<SC.ModelKey>;
        getPartsBounding(incs: SC.InstanceIncs, ignoreInvisible: boolean, tightBounding: boolean): Promise<Box>;
        getDrawnPartsBounding(incs: SC.InstanceIncs): Promise<Box>;
        getBounding(incs: SC.InstanceIncs, ignoreInvisible: boolean, includeExcluded: boolean, tightBounding: boolean): Promise<Box>;
        getLooseBounding(): Promise<Box>;
        getClientDimensions(): [number, number];
        getModelBounding(ignoreInvisible: boolean, includeExcluded: boolean, tightBounding: boolean): Promise<Box>;
        pickFromScreen(point: Point2, config: PickConfig, isDrawing: boolean): Promise<Selection.NodeEntitySelectionItem | null>;
        pickAllFromScreen(point: Point2, config: PickConfig, isDrawing: boolean): Promise<Selection.NodeEntitySelectionItem[]>;
        compositePickFromScreen(point: Point2, config: PickConfig, isDrawing: boolean): Promise<Selection.CompositeSelectionItem>;
        beginScreenAreaSelection(areaCssMin: Point2, areaCssMax: Point2, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        beginRayDrillSelection(rayCssOrigin: Point2, rayCssBoxRadius: number, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        beginConvexPolyhedronSelection(volumePlanes: Plane[], heuristicOrigin: Point3, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        beginSphereSelection(sphereCenter: SC.Vector3, sphereRadius: number, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        endIncrementalSelection(handle: Selection.IncrementalSelectionId): void;
        advanceIncrementalSelection(handle: Selection.IncrementalSelectionId): Promise<Selection.SelectionItem[] | null>;
        flushMetaDataCache(): void;
        safeGetMetaDatas(modelKey: SC.ModelKey, dataKey: [SC.DataKey]): Promise<[Uint8Array] | null>;
        safeGetMetaDatas(modelKey: SC.ModelKey, dataKeys: SC.DataKey[]): Promise<Uint8Array[] | null>;
        safeGetMetaData(modelKey: SC.ModelKey, dataKey: SC.DataKey): Promise<Uint8Array | null>;
        safeLoadMetaDatas(ids: SC.DataIds): Promise<void>;
        getDataFromIds(ids: SC.DataIds): Promise<Uint8Array[]>;
        private _getDataFromIds;
        pickFromRay(ray: Ray, config: PickConfig): Promise<Selection.NodeEntitySelectionItem | null>;
        pickAllFromRay(ray: Ray, config: PickConfig): Promise<Selection.NodeEntitySelectionItem[]>;
        updateCamera(camera: Camera): Camera;
        private _toProjection;
        private _toCamera;
        setCamera(camera: Camera): void;
        private _setCamera;
        markCameraAsEmpty(): void;
        setInstancesMatrix(incs: SC.InstanceIncs, matrix: Matrix): void;
        setMatrices(incs: SC.InstanceIncs, matrices: Matrix[]): void;
        highlightParts(incs: SC.InstanceIncs, highlighted: boolean): void;
        highlightElements(incs: SC.InstanceIncs, elementType: ElementType, elementIndex: number, elementCount: number, value: boolean): void;
        getPartHighlighted(incs: SC.InstanceIncs): Promise<boolean[]>;
        getElementHighlighted(incs: SC.InstanceIncs, elementType: ElementType, elementIndex: number): Promise<boolean[]>;
        setNodeHighlightColor(fillColor: Color | null, outlineColor: Color | null): void;
        setElementHighlightColor(fillColor: Color | null, outlineColor: Color | null): void;
        setHighlightColorizeCompression(compressionLevel: number): void;
        computeMinimumBodyBodyDistance(inc1: SC.InstanceInc, inc2: SC.InstanceInc): Promise<FaceFaceDistanceItem>;
        computeMininimumFaceFaceDistance(inc1: SC.InstanceInc, face1: number, inc2: SC.InstanceInc, face2: number): Promise<FaceFaceDistanceItem>;
        computeMinimumFaceRayDistance(inc: SC.InstanceInc, faceId: number, ray: Ray): Promise<FaceFaceDistanceItem>;
        computeMinimumFaceLineDistance(inc: SC.InstanceInc, faceId: number, ray: Ray): Promise<FaceFaceDistanceItem>;
        pauseRendering(callback?: () => void): void;
        resumeRendering(): void;
        beginRequestBatch(type: RequestBatchType): void;
        endRequestBatch(type: RequestBatchType): void;
        private _flushBatchedRequests;
        private _flushBatchedMetaDataRequests;
        clearHighlight(): void;
        resetColors(): void;
        resetOpacity(): void;
        setPartOpacity(incs: SC.InstanceIncs, opacity: number): void;
        unsetPartOpacity(incs: SC.InstanceIncs): void;
        getPartOpacity(incs: SC.InstanceIncs): (number | null)[];
        getEffectivePartOpacity(incs: SC.InstanceIncs, elementType: ElementType): Promise<number[]>;
        getPartHasTransparency(incs: SC.InstanceIncs): Promise<boolean[]>;
        setPartColor(incs: SC.InstanceIncs, elementType: ElementType, color: Color): void;
        unsetPartColor(incs: SC.InstanceIncs, elementType: ElementType): void;
        getPartColor(incs: SC.InstanceIncs, elementType: ElementType): Promise<(Color | null)[]>;
        getEffectivePartColor(incs: SC.InstanceIncs, elementType: ElementType): Promise<Color[]>;
        setElementColor(incs: SC.InstanceIncs, elementType: ElementType, elementOffset: number, elementCount: number, color: Color): void;
        unsetElementColor(incs: SC.InstanceIncs, elementType: ElementType, elementOffset: number, elementCount: number): void;
        getElementColor(inc: SC.InstanceInc, elementType: ElementType, elementOffset: number): Promise<[Color | null]>;
        getElementColor(incs: SC.InstanceIncs, elementType: ElementType, elementOffset: number): Promise<(Color | null)[]>;
        getEffectiveElementColor(incs: SC.InstanceIncs, elementType: ElementType, elementOffset: number): Promise<Color[]>;
        synchronizeVisibilities(incs: SC.InstanceIncs, visible: boolean): void;
        setPartVisibility(incs: SC.InstanceIncs, visible: boolean, onlyDemanded: boolean): void;
        setElementVisibility(incs: SC.InstanceIncs, elementType: ElementType, elementOffset: number, elementCount: number, visible: boolean): void;
        clearElementVisibility(incs: SC.InstanceIncs, elementType: ElementType): void;
        setVisibilityByAttachment(attachScope: SC.AttachScope, setVisibility: SC.SetVisibility): void;
        requestMeshInstances(incs: SC.InstanceIncs): void;
        getRendererType(): RendererType;
        private _toMeshDataBuilder;
        createMesh(meshData: MeshData): Promise<SC.MeshId>;
        replaceMesh(id: MeshId, data: MeshData): Promise<void>;
        destroyMeshes(meshIds: SC.MeshIds): Promise<void>;
        private _toImageFormat;
        private _validateImage;
        createImage(primaryImage: ImageOptions, thumbnailImage?: ImageOptions): Promise<SC.ImageId>;
        destroyImages(imageIds: SC.ImageIds): Promise<void>;
        _toTextureTiling(value: TextureTiling | undefined): SC.TextureTiling;
        _toTextureInterpolation(value: boolean | undefined): SC.TextureInterpolation;
        _toTextureMipMapping(value: boolean | undefined): SC.TextureMipMapping;
        _toTextureParameterization(value: TextureParameterization | undefined): SC.TextureParameterization;
        _toTextureModifier(value: number | undefined): SC.TextureModifier;
        setTexture(instanceIncs: SC.InstanceIncs, options: TextureOptions): Promise<void>;
        unsetTexture(incs: SC.InstanceIncs): void;
        createMatrix(elements: SC.Matrix16): Promise<SC.MatrixInc>;
        createIdentityMatrix(): Promise<SC.MatrixInc>;
        createMeshInstance(meshInstanceData: MeshInstanceData): Promise<SC.InstanceInc>;
        destroyLocalInstances(instanceIncs: SC.InstanceIncs): Promise<void>;
        private _fromScCamera;
        getCameraPromise(): Promise<Camera>;
        getCamera(): Camera;
        resize(): void;
        setFaceVisibility(faceVisibility: boolean): void;
        setLineVisibility(lineVisibility: boolean): void;
        getCanvasSize(): Point2;
        setBackgroundGradient(top: Color | null, bottom: Color | null): void;
        setServerRenderQuality(jpegQualityLow: number, jpegQualityHigh: number, scaleLow: number, scaleHigh: number): void;
        setMinimumFramerate(value: number): void;
        getMinimumFramerate(): Promise<number>;
        setBackFacesVisible(visible: boolean): void;
        setDrawMode(value: SC.DrawMode): void;
        enableHiddenLineRendering(settings: Settings.HiddenLineSettings): void;
        setAntiAliasingMode(antiAliasingMode: AntiAliasingMode): void;
        setInstanceModifier(instanceModifier: InstanceModifier, incs: SC.InstanceIncs, modifierValue: boolean): void;
        attachModel(attachScope: SC.AttachScope, modelName: ScModelName, inclusionMatrix: SC.Matrix12, attachMeasurementUnit: number, attachInvisibly: boolean): Promise<void>;
        attachScsModelByKey(attachScope: SC.AttachScope, modelKey: SC.ModelKey, inclusionMatrix: SC.Matrix12, attachMeasurementUnit: number, attachInvisibly: boolean): SC.InclusionKey;
        private _attachModels;
        attachScsBuffer(attachScope: SC.AttachScope, buffer: ScsBuffer, inclusionMatrix: SC.Matrix12, attachMeasurementUnit: number, attachInvisibly: boolean, resolveOnFullyLoaded: boolean): Promise<void>;
        feedScsBuffer(attachScope: SC.AttachScope, buffer: ScsBuffer | null): void;
        private _parseKeyInfo;
        instanceKeyInfo(modelKey: SC.ModelKey, by: KeyInfoBy.Model, ret: KeyInfoReturn.AllKeys): Promise<SC.InstanceKey[]>;
        instanceKeyInfo(attachScope: SC.AttachScope, by: KeyInfoBy.Attachment, ret: KeyInfoReturn.AllKeys): Promise<Map<SC.ModelKey, SC.InstanceKey[]>>;
        instanceKeyInfo(modelKey: SC.ModelKey, by: KeyInfoBy.Model, ret: KeyInfoReturn.KeyCountOnly): Promise<[number]>;
        instanceKeyInfo(attachScope: SC.AttachScope, by: KeyInfoBy.Attachment, ret: KeyInfoReturn.KeyCountOnly): Promise<[number]>;
        metaDataKeyInfo(modelKey: SC.ModelKey, byModel: true, keyCountOnly: false): Promise<SC.DataKey[]>;
        metaDataKeyInfo(attachScope: SC.AttachScope, byModel: false, keyCountOnly: false): Promise<Map<SC.ModelKey, SC.DataKey[]>>;
        metaDataKeyInfo(modelKey: SC.ModelKey, byModel: true, keyCountOnly: true): Promise<[number]>;
        metaDataKeyInfo(attachScope: SC.AttachScope, byModel: false, keyCountOnly: true): Promise<[number]>;
        modelKeysFromInclusionKeys(inclusionKeys: SC.InclusionKey[]): Promise<SC.ModelKey[]>;
        detachInclusions(inclusionKeys: SC.InclusionKey[]): Promise<void>;
        resetToEmpty(whitelistInstances: SC.InstanceKey[], whitelistMeshes: SC.MeshKey[]): Promise<void>;
        redraw(): void;
        disconnectNetwork(): void;
        shutdown(): void;
        getVersionString(): string;
        setAllowHighDpi(allow: boolean): void;
        getAllowHighDpi(): boolean;
        setMeshLevel(incs: SC.InstanceIncs, meshLevel: number): void;
        setMetallicRoughness(incs: SC.InstanceIncs, metallicFactor: number, roughnessFactor: number): void;
        setMetallicRoughnessMaterialOverride(defaultMetallicFactor: number, defaultRoughnessFactor: number): void;
        getMetallicRoughness(incs: SC.InstanceIncs): Promise<(MetallicRoughnessValue | null)[]>;
        unsetMetallicRoughness(incs: SC.InstanceIncs): void;
        setOverlayVisibility(index: OverlayIndex, visibility: boolean): void;
        setOverlayCamera(index: OverlayIndex, camera: Camera): void;
        destroyOverlay(index: OverlayIndex): void;
        private _overlayUnit;
        getMaxOverlayIndex(): OverlayIndex;
        private _overlayAnchor;
        setOverlayViewport(index: OverlayIndex, anchor: OverlayAnchor, x: number, xUnit: OverlayUnit, y: number, yUnit: OverlayUnit, width: number, widthUnit: OverlayUnit, height: number, heightUnit: OverlayUnit): void;
        addNodesToOverlay(incs: SC.InstanceIncs, index: OverlayIndex): void;
        getInstancesMeshData(inc: SC.InstanceInc): Promise<SC.MeshId>;
        getInstancesMeshData(incs: SC.InstanceIncs): Promise<SC.MeshIds>;
        getMeshData(id: MeshId): Promise<MeshDataCopy>;
        private _toElementType;
        private _toXRayGroup;
        setXRayColor(group: XRayGroup, element: ElementType, color: Color): void;
        unsetXRayColor(group: XRayGroup, element: ElementType): Promise<void>;
        setXRayOpacity(value: number, element?: ElementType): void;
        private _xRayTransparencyMode;
        setXRayTransparencyMode(value: XRayTransparencyMode): void;
        setGoochBlue(value: number): void;
        setGoochBaseColorProminence(value: number): void;
        setGoochYellow(value: number): void;
        setGoochLuminanceShiftStrength(value: number): void;
        setToonShadingBandCount(bandCount: number): void;
        setToonShadingSpecularFactor(specularFactor: number): void;
        private _transparencyMode;
        setTransparencyMode(value: TransparencyMode): void;
        private _toPointSizeUnit;
        private _toPointShape;
        private _fromPointSizeUnit;
        private _fromPointShape;
        setPointSize(size: number, unit: PointSizeUnit): void;
        getPointSize(): Promise<[number, PointSizeUnit]>;
        setPointShape(shape: PointShape): void;
        getPointShape(): Promise<PointShape>;
        setEyeDomeLightingEnabled(enabled: boolean): void;
        getEyeDomeLightingEnabled(): Promise<boolean>;
        setEyeDomeLightingBlurSamples(value: number): void;
        getEyeDomeLightingBlurSamples(): Promise<number>;
        setEyeDomeLightingBlurInterval(value: number): void;
        getEyeDomeLightingBlurInterval(): Promise<number>;
        setEyeDomeLightingBlurEdgeDistance(value: number): void;
        getEyeDomeLightingBlurEdgeDistance(): Promise<number>;
        setEyeDomeLightingShadingEdgeDistance(value: number): void;
        getEyeDomeLightingShadingEdgeDistance(): Promise<number>;
        setEyeDomeLightingOpacity(value: number): void;
        getEyeDomeLightingOpacity(): Promise<number>;
        setDisplayIncompleteFrames(value: boolean): void;
        setInteractiveDrawDelay(value: number): void;
        setInteractiveDrawLimitIncreaseEnabled(enable: boolean): void;
        getInteractiveDrawLimitIncreaseEnabled(): Promise<boolean>;
        private _toCullingVectorSpace;
        private _fromCullingVectorSpace;
        setCullingVector(incs: SC.InstanceIncs, space: CullingVectorSpace, vector: Point3, toleranceDegrees: number): void;
        unsetCullingVector(incs: SC.InstanceIncs): void;
        getCullingVector(incs: SC.InstanceIncs): Promise<(CullingVector | null)[]>;
        private _setStreamCutoffScale;
        setStreamCutoffScale(value: number): void;
        getStreamCutoffScale(): number;
        loseWebGlContext(): boolean;
        triangulatePolygon(polygonPoints: Float32Array | number[], normal: SC.Vector3): Float32Array;
        debug_log(message: string): Promise<void>;
        debug_stateFailure(value: SC.StateFailure): Promise<void>;
        debug_sync(): Promise<void>;
        private _toLinePatternLengthUnit;
        setLinePattern(incs: SC.InstanceIncs, pattern: LinePattern, patternLength: number, patternLengthUnit: LinePatternLengthUnit): void;
        unsetLinePattern(incs: SC.InstanceIncs): void;
        createFloorplanMesh(incs: SC.InstanceIncs): Promise<SC.InstanceIncs>;
        exportToSvg(config: SvgConfig): Promise<string>;
        waitForImageDecoding(): Promise<void>;
        registerBimInstances(incs: SC.InstanceIncs, bimType: SC.BimType): void;
        setAmbientLightColor(value: Color): void;
        clearLights(): void;
        private _toLightType;
        private _toLightSpace;
        addLight(light: Light): Promise<SC.LightKey>;
        removeLight(key: LightKey): void;
        updateLight(key: LightKey, light: Light): void;
        setBloomEnabled(value: boolean): void;
        setBloomThreshold(value: number): void;
        setBloomThresholdRampWidth(value: number): void;
        setBloomIntensityScale(value: number): void;
        private _toBlurIntervalUnit;
        setBloomLayers(layers: BloomLayerInfo[]): void;
        startComparison(instanceSet1: SC.InstanceIncs, instanceSet2: SC.InstanceIncs, config?: ComparisonConfig): void;
        endComparison(): void;
        setSimpleShadowColor(value: Color): void;
        setSimpleShadowEnabled(value: boolean): void;
        setSimpleShadowOpacity(value: number): void;
        setGroundPlane(normal: Point3, position?: Point3): void;
        setSimpleShadowResolution(pixels: number): void;
        setSimpleShadowBlurSamples(value: number): void;
        setSimpleShadowBlurInterval(value: number): void;
        setSimpleShadowInteractiveUpdateEnabled(value?: boolean): void;
        setSilhouetteColor(value: Color): void;
        setSilhouetteEnabled(value?: boolean): void;
        setSilhouetteOpacity(value: number): void;
        setSilhouetteThreshold(value: number): void;
        setSilhouetteThresholdRampWidth(value: number): void;
        setHardEdgeColor(value: Color): void;
        setHardEdgesEnabled(value?: boolean): void;
        setHardEdgeOpacity(value: number): void;
        setHardEdgeThreshold(value: number): void;
        setHardEdgeThresholdRampWidth(value: number): void;
        setSimpleReflectionEnabled(value?: boolean): void;
        setSimpleReflectionBlurInterval(value: number, unit: BlurIntervalUnit): void;
        setSimpleReflectionBlurSamples(value: number): void;
        setSimpleReflectionFadeAngle(degrees: number): void;
        setSimpleReflectionOpacity(value: number): void;
        setSimpleReflectionAttenuation(nearDistance: number, farDistance: number, unit?: SimpleReflectionAttenuationUnit): void;
        throttleLoad(newPauseInterval: Milliseconds, throttleDuration: Milliseconds): void;
        private _toVector3Array;
        testPointVisibility(points: Point3[]): Promise<number[]>;
        setPointVisibilityTest(points: Point3[]): void;
        setImageBasedLightingEnabled(value: boolean): void;
        setImageBasedLightingIntensity(value: number): void;
        private _toMatrix9;
        setImageBasedLightingMatrix(value: Matrix): void;
        setImageBasedLightingEnvironment(data: Uint8Array): void;
        setImageBasedLightingEnvironmentToDefault(): void;
        setLineJitterEnabled(value: boolean): void;
        setLineJitterInstanceCount(value: number): void;
        setLineJitterRadius(value: number): void;
        setLineJitterFrequency(value: number): void;
    }
}
/**
 * A set of Classes and Interfaces to facilitate Selection interactions with various parts of the Model, including a point, line, and face (plane).
 */
declare namespace Communicator.Selection {
    /**
     * Encapsulates a face selection.
     */
    class FaceEntity {
        private readonly _position;
        private readonly _normal;
        private readonly _elementIndex;
        private readonly _elementBits;
        private readonly _bounding;
        private readonly _overlayIndex;
        private readonly _isProximityFace;
        /** @hidden */
        constructor(position: Point3, normal: Point3, elementIndex: number, overlayIndex: OverlayIndex, elementBits: number, bounding: Box, isProximityFace: boolean);
        /**
         * Returns whether or not this face entity was selected by proximity or was instead selected dead-on.
         * @returns True if this face entity was selected by proximity and false otherwise.
         */
        isProximityFace(): boolean;
        /**
         * Returns whether or not this face entity is capping geometry or not.
         * @returns True if this face entity is capping geometry and false otherwise.
         */
        isCappingGeometry(): boolean;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[FaceEntity]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any): FaceEntity;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any): FaceEntity;
        /**
         * Gets the world space position of the selection point.
         * @returns World space position of the selection point if it can be determined.
         */
        getPosition(): Point3;
        /**
         * Gets the face normal for the selection Point.
         * @returns Face normal for the selection position if it can be determined.
         */
        getNormal(): Point3;
        /**
         * Gets the cad face index for the selection Point.
         * @returns The index for the cad face.
         */
        getCadFaceIndex(): number;
        /**
         * Gets the cad face bits for the selection Point.
         * @returns The bits set on the cad face.
         */
        getCadFaceBits(): number;
        /**
         * Gets the bounding box for the face entity
         * @returns Bounding box for the face entity
         */
        getBounding(): Box;
        /**
         * @returns The index of the overlay the entity belongs to.
         */
        overlayIndex(): OverlayIndex;
    }
    /**
     * Encapsulates a line selection.
     */
    class LineEntity {
        private readonly _elementIndex;
        private readonly _elementBits;
        private readonly _position;
        private readonly _lineSegmentVertices;
        private readonly _bestLineSegmentVertexIndex?;
        private readonly _bounding;
        private readonly _overlayIndex;
        /** @hidden */
        constructor(elementIndex: number, position: Point3, lineSegmentVertices: number[] | null, bestLineSegmentVertexIndex: number, bounding: Box, overlayIndex: OverlayIndex, elementBits: number);
        isCappingGeometry(): boolean;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[LineEntity]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any): LineEntity;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any): LineEntity;
        /**
         * Gets the line identifier
         * @returns the identifier of the line that was selected
         */
        getLineId(): number;
        /**
         * Gets the closest point on the selected line
         * @returns the closest point on the line
         */
        getPosition(): Point3;
        getPoints(): Point3[];
        /**
         * Returns the vertex of the line that is closest to the selection
         * point.
         *
         * Clipped vertices are skipped. If the vertex is occluded, then
         * `null` is returned.
         */
        getBestVertex(): Point3 | null;
        /**
         * Gets the kine bits for the selection Point.
         * @returns The bits set on the line/edge.
         */
        getLineBits(): number;
        /**
         * Gets the bounding box for the line entity
         * @returns Bounding box for the line entity
         */
        getBounding(): Box;
        /**
         * @returns The index of the overlay the entity belongs to.
         */
        overlayIndex(): OverlayIndex;
    }
    class PointEntity {
        private readonly _elementIndex;
        private readonly _elementBits;
        private readonly _position;
        private readonly _overlayIndex;
        /** @hidden */
        constructor(position: Point3, elementIndex: number, overlayIndex: OverlayIndex, elementBits: number);
        /**
         * Creates a new [[PointEntity]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any): PointEntity;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any): PointEntity;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Gets the world space position of the selection point.
         * @returns World space position of the selection point if it can be determined.
         */
        getPosition(): Point3;
        /**
         * Gets the cad bits for the selection Point.
         * @returns The bits set on the point.
         */
        getPointBits(): number;
        /**
         * Gets the point identifier
         * @returns the identifier of the point that was selected
         */
        getPointId(): number;
        /**
         * @returns The index of the overlay the entity belongs to.
         */
        overlayIndex(): OverlayIndex;
    }
    class IncrementalSelectionId {
        constructor(handle: SC.IncrementalSelectionHandle);
        /** @hidden */
        readonly _handle: SC.IncrementalSelectionHandle;
    }
    /** @deprecated Use [[IncrementalSelectionId]] instead. */
    type VolumeSelectionId = IncrementalSelectionId;
    class SelectionItem {
        /** @hidden */
        protected readonly _faceEntity: FaceEntity | null;
        /** @hidden */
        protected readonly _lineEntity: LineEntity | null;
        /** @hidden */
        protected readonly _pointEntity: PointEntity | null;
        /** @hidden */
        protected _nodeId: NodeId | null;
        /** @hidden */
        protected readonly _inclusionKey: SC.InclusionKey | null;
        /** @hidden */
        private constructor();
        /**
         * Create a new [[FaceSelectionItem]].
         */
        static create(nodeId: NodeId, inclusionKey: SC.InclusionKey | null | undefined, faceEntity: FaceEntity, lineEntity?: LineEntity | null, pointEntity?: PointEntity | null): FaceSelectionItem;
        /**
         * Create a new [[LineSelectionItem]].
         */
        static create(nodeId: NodeId, inclusionKey: SC.InclusionKey | null | undefined, faceEntity: FaceEntity | null | undefined, lineEntity: LineEntity, pointEntity?: PointEntity | null): LineSelectionItem;
        /**
         * Create a new [[PointSelectionItem]].
         */
        static create(nodeId: NodeId, inclusionKey: SC.InclusionKey | null | undefined, faceEntity: FaceEntity | null | undefined, lineEntity: LineEntity | null | undefined, pointEntity: PointEntity): PointSelectionItem;
        /**
         * Create a new [[EntitySelectionItem]].
         */
        static create(nodeId: NodeId | null | undefined, inclusionKey: SC.InclusionKey | null | undefined, faceEntity: FaceEntity, lineEntity?: LineEntity | null, pointEntity?: PointEntity | null): EntitySelectionItem;
        /**
         * Create a new [[EntitySelectionItem]].
         */
        static create(nodeId: NodeId | null | undefined, inclusionKey: SC.InclusionKey | null | undefined, faceEntity: FaceEntity | null | undefined, lineEntity: LineEntity, pointEntity?: PointEntity | null): EntitySelectionItem;
        /**
         * Create a new [[EntitySelectionItem]].
         */
        static create(nodeId: NodeId | null | undefined, inclusionKey: SC.InclusionKey | null | undefined, faceEntity: FaceEntity | null | undefined, lineEntity: LineEntity | null | undefined, pointEntity: PointEntity): EntitySelectionItem;
        /**
         * Create a new [[NodeSelectionItem]].
         */
        static create(nodeId: NodeId, inclusionKey?: SC.InclusionKey | null, faceEntity?: FaceEntity | null, lineEntity?: LineEntity | null, pointEntity?: PointEntity | null): NodeSelectionItem;
        /**
         * Create a new [[SelectionItem]].
         */
        static create(nodeId?: NodeId | null, inclusionKey?: SC.InclusionKey | null, faceEntity?: FaceEntity | null, lineEntity?: LineEntity | null, pointEntity?: PointEntity | null): SelectionItem;
        getSelectionType(): SelectionType;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /** @hidden */
        static _fromJson(objData: any): SelectionItem;
        /**
         * Gets the face entity for this selection.
         * @returns the face entity if one was selected, otherwise null
         */
        getFaceEntity(): FaceEntity | null;
        /**
         * Gets the line entity for this selection.
         * @returns the line entity if one was selected, otherwise null
         */
        getLineEntity(): LineEntity | null;
        /**
         * Gets the point entity for this selection.
         * @returns the point entity if one was selected, otherwise null
         */
        getPointEntity(): PointEntity | null;
        /**
         * Gets the part id for this selection.
         * @returns the part id associated with this selection item
         */
        getNodeId(): NodeId | null;
        /**
         * Gets the include id for this selection.
         * @returns the inclusion key associated with this selection item
         */
        getInclusionKey(): SC.InclusionKey | null;
        /** @deprecated Use [[getInclusionKey]] instead. */
        getIncludeId(): SC.InclusionKey | null;
        /**
         * Convenience method for getting the world space position of the selection point.
         * [[SelectionItem]]s with a type of [[SelectionType.Part]] will not have a position and null will be returned.
         * @returns World space position of the selection point if it can be determined.
         */
        getPosition(): Point3 | null;
        /**
         * Gets the overlay index for this selection.
         * @returns the overlay index associated with this selection item
         */
        overlayIndex(): OverlayIndex | null;
        /** @hidden */
        _setNodeId(id: NodeId): void;
        /**
         * Determines if two selection items are equal.
         * @param selectionItem The selection item to test against.
         * @returns whether or not the two items are equal.
         */
        equals(selectionItem: SelectionItem): boolean;
        /** @hidden */
        _hash(singleEntityToggleMode: boolean): string;
        /**
         * @returns true if the object has the fields required for an [[EntitySelectionItem]].
         * This function can be used as a TypeScript [type guard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards).
         */
        isEntitySelection(): this is EntitySelectionItem;
        /**
         * @returns true if the object has the fields required for a [[NodeSelectionItem]].
         * This function can be used as a TypeScript [type guard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards).
         */
        isNodeSelection(): this is NodeSelectionItem;
        /**
         * @returns true if the object has the fields required for a [[NodeEntitySelectionItem]].
         * This function can be used as a TypeScript [type guard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards).
         */
        isNodeEntitySelection(): this is NodeEntitySelectionItem;
        /**
         * @returns true if the object has the fields required for a [[FaceSelectionItem]].
         * This function can be used as a TypeScript [type guard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards).
         */
        isFaceSelection(): this is FaceSelectionItem;
        /**
         * @returns true if the object has the fields required for a [[LineSelectionItem]].
         * This function can be used as a TypeScript [type guard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards).
         */
        isLineSelection(): this is LineSelectionItem;
        /**
         * @returns true if the object has the fields required for a [[PointSelectionItem]].
         * This function can be used as a TypeScript [type guard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards).
         */
        isPointSelection(): this is PointSelectionItem;
    }
    /** A [[SelectionItem]] that is guaranteed to have a valid [[NodeId]]. */
    interface NodeSelectionItem extends SelectionItem {
        getNodeId(): NodeId;
        /** @hidden */
        _setNodeId(id: NodeId): void;
    }
    /** A [[SelectionItem]] that is guaranteed to have a valid entity. */
    interface EntitySelectionItem extends SelectionItem {
        getPosition(): Point3;
        overlayIndex(): OverlayIndex;
    }
    /** A [[SelectionItem]] that is guaranteed to have a valid [[NodeId]] and entity. */
    interface NodeEntitySelectionItem extends SelectionItem {
        getNodeId(): NodeId;
        getPosition(): Point3;
        overlayIndex(): OverlayIndex;
        /** @hidden */
        _setNodeId(id: NodeId): void;
    }
    /** A [[SelectionItem]] that is guaranteed to have a valid [[NodeId]] and [[FaceEntity]]. */
    interface FaceSelectionItem extends NodeEntitySelectionItem {
        getFaceEntity(): FaceEntity;
    }
    /** A [[SelectionItem]] that is guaranteed to have a valid [[NodeId]] and [[LineEntity]]. */
    interface LineSelectionItem extends NodeEntitySelectionItem {
        getLineEntity(): LineEntity;
    }
    /** A [[SelectionItem]] that is guaranteed to have a valid [[NodeId]] and [[PointEntity]]. */
    interface PointSelectionItem extends NodeEntitySelectionItem {
        getPointEntity(): PointEntity;
    }
    /**
     * This class is used to represent the result of a composite picking operation.  Each of its fields may be populated with a [[NodeEntitySelectionItem]].
     */
    class CompositeSelectionItem {
        constructor(faceItem: FaceSelectionItem | null, lineItem: LineSelectionItem | null, pointItem: PointSelectionItem | null);
        /**
         * Returns the most relevant selection item for the provided selection mask.
         * The priority used by this method is points -> lines -> faces.
         * For example, if your selection mask was Faces | Lines and this item contained and all fields were populated, this method would return its lineItem.
         * @param mask a selection mask used to indicate the relevancy of the item to retrieve.
         * @returns the most relevant selection item if one exists.  If no relevant item is found, null is returned.
         */
        fetchMostRelevant(mask: SelectionMask): NodeEntitySelectionItem | null;
        faceItem: FaceSelectionItem | null;
        lineItem: LineSelectionItem | null;
        pointItem: PointSelectionItem | null;
    }
}
declare namespace Communicator.Util {
    /**
     * Returns a promise that resolves after the provided number of milliseconds
     * @param duration number of milliseconds until the returned promise can resolve
     */
    function sleep(duration: Milliseconds): Promise<void>;
    /**
     * This function is an helper function that delay the call to a callback to the
     * computation of the next 'frame' of the browser's js engine.
     * The point is to let the js engine deal with pending promises before running
     * the given code.
     *
     * @param cb the callback to call the promise to call on the next frame.
     * @param args the arguments of the callback.
     * @returns a timeout id in order to cancel it if necessary.
     */
    function delayCall(cb: (...cbArgs: any[]) => any, ...args: any[]): ReturnType<typeof setTimeout>;
}
declare namespace Communicator.Internal {
    function hasBits(storedBits: number, desiredBits: number): boolean;
    function setBit(mask: number, bit: number, turnOn: boolean): number;
    function classFromString(this: any, qualifiedClassName: string): any;
    function projectOnto(source: Point3, target: Point3): Point3;
    function majorAxis(p: Point3): Point3 | null;
    function deepClone<T>(obj: T): T;
    function copyOwnProperties<T>(from: T, to: T): void;
    function getWithDefault<T>(maybeValue: T | undefined, defaultValue: T): T;
    type VersionNumber = number[];
    function versionAtLeast(version: VersionNumber, atLeast: VersionNumber): boolean;
    function versionString(version: VersionNumber): string;
    function getCrypto(): Crypto;
}
declare namespace Communicator {
    type SelectionFilter = (nodeId: NodeId, model: Model) => NodeId | null;
    /**
     * This class provides the main interface into the selection functionality of the viewer. The class manages a list of selection items that are optionally highlighted as the user selects objects in the scene.
     */
    class SelectionManager {
        private readonly _view;
        private readonly _model;
        private readonly _modelStructure;
        private readonly _engine;
        private readonly _callbackManager;
        private readonly _selectedItemsPruned;
        private readonly _selectedItemsFull;
        private readonly _selectedNodeCounts;
        private readonly _temporalLinks;
        private _oldestItemHash;
        private _newestItemHash;
        private readonly _selectedLayers;
        private readonly _selectedTypes;
        private readonly _nodeSelectionColor;
        private readonly _nodeSelectionOutlineColor;
        private readonly _elementSelectionColor;
        private readonly _elementSelectionOutlineColor;
        private _nodeHighlightMode;
        private _nodeElementHighlightMode;
        private _highlightNodeSelection;
        private _highlightFaceElementSelection;
        private _highlightLineElementSelection;
        private _highlightPointElementSelection;
        private _selectParentIfSelected;
        private _pruneSelectionDescendants;
        private _ignoreEntityWhenTogglingChildSelection;
        private _singleEntityToggleMode;
        private _suppressImplicitRemovalCallback;
        private _selectionFilter;
        static ifcSelectionFilter: (nodeId: number, model: Model) => number | null;
        /** @hidden */
        _incrementalBlacklistedInstanceNodes: Set<number>;
        /** @hidden */
        constructor(callbackManager: Internal.CallbackManager, engine: Internal.ScEngine, view: View, model: Model, modelStructure: Internal.Tree.ModelStructure);
        /** @hidden */
        private static deprecated;
        /** * @hidden */
        _init(): void;
        /**
         * This allows manipulating the selected NodeId.
         * To reset the filter, set it to null.
         * @param selectionFilter function that manipulates the selected NodeId.
         */
        setSelectionFilter(selectionFilter: SelectionFilter | null): void;
        /**
         * @returns [[SelectionFilter]] function or null if none is set.
         */
        getSelectionFilter(): SelectionFilter | null;
        /**
         * Enables / disables descendant pruning and clears the current selection set.  When enabled, a parent and child will not be present in the same selection set.  This behavior is enabled by default.
         */
        setPruneSelectionDescendants(pruneSelectionDescendants: boolean): void;
        /**
         * Gets whether descendant pruning is enabled.
         * See also: [[setPruneSelectionDescendants]]
         */
        getPruneSelectionDescendants(): boolean;
        /**
         * Enables / disables automatic parent selection.  When enabled, if a selected part is selected again, its parent will be selected.  This behavior is enabled by default.
         */
        setSelectParentIfSelected(selectParent: boolean): void;
        /**
         * Gets whether automatic parent selection is enabled.
         * See also: [[setSelectParentIfSelected]]
         */
        getSelectParentIfSelected(): boolean;
        /**
         * Enables / disables ignore entity when toggling child selection mode.
         *
         * When enabled, a [[Selection.NodeSelectionItem]] that has a selected ancestor may only be toggled if it does not contain an entity selection.
         * A selection item without an entity selection is usually generated from selecting a node via a model tree control.
         * A selection item containing an entity selection is usually generated as a result of a viewport picking operation.
         *
         * This behavior is enabled by default.
         * See Also: [[toggle]]
         */
        setIgnoreEntityWhenTogglingChildSelection(strictMode: boolean): void;
        /**
         * Gets whether ignore entity when toggling child selection mode is enabled.
         * See also: [[setIgnoreEntityWhenTogglingChildSelection]]
         */
        getIgnoreEntityWhenTogglingChildSelection(): boolean;
        /**
         * Enables / disables single entity toggle mode.
         *
         * When enabled, limits the selection set to containing only one entity selection for each node id.
         * Toggling with an entity selection that has the same node id as a [[Selection.NodeSelectionItem]]
         * already in the selection set will remove that item from the selection set.
         *
         * This behavior is disabled by default.
         * See Also: [[toggle]]
         */
        setSingleEntityToggleModeEnabled(enabled: boolean): void;
        /**
         * Gets whether single entity toggle mode is enabled.
         * See also: [[setSingleEntityToggleModeEnabled]]
         */
        getSingleEntityToggleModeEnabled(): boolean;
        /**
         * Sets whether to generate selectionArray callbacks with implicitly removed nodes.
         *
         * For example, consider the case where you have a parent node that has a multiple child nodes.
         * Normally, if the parent begins selected and then a child is removed from the selection set
         * there will be two selectionArray callbacks generated. The first will for the removal of the
         * parent node. The second wil be for the addition of all of it's children except the one that was
         * initially removed.
         *
         * When this behavior is enabled only a single selectionArray callback will be generated for the
         * child node that was removed.
         *
         * This behavior is disabled by default.
         */
        setSuppressImplicitRemovalCallback(suppress: boolean): void;
        /**
         * Gets whether implicit removal callbacks are being suppressed
         * See also: [[setSuppressImplicitRemovalCallback]]
         */
        getSuppressImplicitRemovalCallback(): boolean;
        /**
         * Performs a selection operation from the given position on the canvas. The best candidate entity is selected.
         * This method triggers a selection event.
         * @param point The canvas position to select from.
         * @param config The configuration object used for this picking operation.
         * @param selectionMode The mode to use for this selection.
         * @returns Promise that resolves when this operation has completed.
         */
        selectFromPoint(point: Point2, config: PickConfig, selectionMode?: SelectionMode): Promise<void>;
        /**
         * Performs a selection operation from the given position on the canvas. All candidate entities are selected.
         * This method triggers a selection event.
         * @param point The canvas position to select from.
         * @param config The configuration object used for this picking operation.
         * @param selectionMode The mode to use for this selection.
         * @returns Promise that resolves when this operation has completed.
         */
        selectAllFromPoint(point: Point2, config: PickConfig, selectionMode?: SelectionMode): Promise<void>;
        /**
         * Performs a selection operation from the given world-space ray. The best candidate entity is selected.
         * This method triggers a selection event.
         * @param ray The world-space ray to perform the selection with.
         * @param config The configuration object used for this picking operation.
         * @param selectionMode The mode to use for this selection.
         * @returns Promise that resolves when this operation has completed.
         */
        selectFromRay(ray: Ray, config: PickConfig, selectionMode?: SelectionMode): Promise<void>;
        /**
         * Performs a selection operation from the given world-space ray. All candidate entities are selected.
         * This method triggers a selection event.
         * @param ray The world-space ray to perform the selection with.
         * @param config The configuration object used for this picking operation.
         * @param selectionMode The mode to use for this selection.
         * @returns Promise that resolves when this operation has completed.
         */
        selectAllFromRay(ray: Ray, config: PickConfig, selectionMode?: SelectionMode): Promise<void>;
        private _onSelectionItem;
        private _onSelectionItems;
        /**
         * Creates a new and active selection context for the provided selection window.
         * @param areaCssMin The minimum coordinate in css pixel space for the selection window.
         * @param areaCssMax The maximum coordinate in css pixel space for the selection window.
         * @param config The configuration object used for this selection operation.
         * @returns The handle for the selection context.
         */
        beginScreenSelectByArea(areaCssMin: Point2, areaCssMax: Point2, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        /**
         * Creates a new and active selection context for the provided selection ray.
         * The ray is created at the supplied ray origin and is cast into the scene.
         * Faces are selected if they lie along the ray.
         * Lines and points are selected if they lie within the ray's box radius.
         *
         * Note: Somewhat confusingly ray drill selection is actually a selection by volume.
         * The provided ray origin and radius are used to create a frustum to preform the selection.
         * This has some consequences. For example, the `SelectionResult`s returned by advancing a
         * ray drill selection will not have selection positions, since they were not selected at
         * a single point.
         * @param rayCssOrigin The coordinate in css pixel space for the selection ray's origin.
         * @param rayCssBoxRadius The radius around the ray in css pixel space used for line and point selection proximity.
         * @param config The configuration object used for this selection operation.
         * @returns The handle for the selection context.
         */
        beginRayDrillSelection(rayCssOrigin: Point2, rayCssBoxRadius: number, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        /**
         * Creates a new and active selection context for the provided selection volume.
         * The selection volume is a convex polyhedron defined by the bounded intersection of its half-spaces.
         * @param volumePlanes The planes used to define volume. A point p is inside the volume if and only if (plane.determineSide(p) == true) for all supplied planes.
         * @param heuristicOrigin A point used to compute distances against for ordering returned results. This is typically (but not necessarily) the center of the volume.
         * @param config The configuration object used for this selection operation.
         * @returns The handle for the selection context.
         */
        beginConvexPolyhedronSelection(volumePlanes: Plane[], heuristicOrigin: Point3, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        /**
         * Creates a new and active selection context for the provided selection sphere.
         * @param sphereCenter The center of the selection sphere.
         * @param sphereRadius The radius of the selection sphere.
         * @param config The configuration object used for this selection operation.
         * @returns The handle for the selection context.
         */
        beginSphereSelection(sphereCenter: Point3, sphereRadius: number, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        /**
         * Deactivates and destroys the provided selection context.
         * @param handle The selection context to destroy.
         */
        endIncrementalSelection(handle: Selection.IncrementalSelectionId): DeprecatedPromise;
        /** @deprecated Use [[endIncrementalSelection]] instead. */
        endVolumeSelection(handle: Selection.IncrementalSelectionId): DeprecatedPromise;
        /**
         * Adds the next batch of instances selected by the supplied selection
         * context to the selection set.
         *
         * @param handle The handle to an active area selection context.
         * @param predicate An optional function that returns `true` if a given
         * [[NodeSelectionItem]] should be added to the selection set. If
         * `false` is returned, the item will not be added.
         *
         * @returns `true` if there are possibly more items to select and
         * `false` if not.
         */
        advanceIncrementalSelection(handle: Selection.IncrementalSelectionId, predicate?: ((item: Selection.NodeSelectionItem) => Promise<boolean>) | null): Promise<boolean>;
        /** @deprecated Use [[advanceIncrementalSelection]] instead. */
        advanceVolumeSelection(handle: Selection.IncrementalSelectionId, predicate?: ((item: Selection.NodeSelectionItem) => Promise<boolean>) | null): Promise<boolean>;
        isSelected(item: Selection.SelectionItem): boolean;
        /**
         * Checks whether a node, or its parents, appear in the selection set or not.
         * Note: for the purposes of this function element selections on a node
         * are considered the same as node selection.
         * @param nodeId Node to check for
         * @returns `true` if the node or its parents appear in the selection set. `false` otherwise
         */
        isNodeSelected(nodeId: NodeId): boolean;
        contains(item: Selection.SelectionItem): boolean;
        /**
         * Checks if the parent of a selection item is in the selection set.
         * @param selectionItem
         * @returns parent selection item, or null if not found
         */
        containsParent(item: Selection.NodeSelectionItem): Selection.NodeSelectionItem | null;
        private _findAncestor;
        /**
         * Adds all items in a layer to the selection set.
         * @param layerName
         * @param selectionMode
         */
        selectLayer(layerName: LayerName, selectionMode: SelectionMode): void;
        /**
         * Gets all selected layers.
         */
        getSelectedLayers(): LayerName[];
        /**
         * Adds all items with an IFC type to the selection set.
         * @param genericType
         */
        selectType(genericType: GenericType, selectionMode: SelectionMode): void;
        /**
         * Gets all selected IFC types.
         */
        getSelectedTypes(): GenericType[];
        /**
         * Selects a node with the given Id.
         * @param nodeId nodeId of the node to select. Pass null to clear the selection.
         * @returns the selection type of this operation.
         */
        selectNode(nodeId: NodeId | null, selectionMode?: SelectionMode): SelectionType;
        private _triggerNullSelection;
        private _isInAxisOverlay;
        private _getNodeCounts;
        private _addToFull;
        private _addItems;
        private _addItem;
        /**
         * Manually adds an item or array of items to the selection set.
         * Triggers a selection event.
         * @param itemOrItems A selectionItem or selectionItem array that will be added to the current selection set.
         * @param suppressCallback Optional boolean param to suppress the selectionArray callbacks calls to this generate.
         */
        add(itemOrItems: Selection.NodeSelectionItem | Selection.NodeSelectionItem[] | null, suppressCallback?: boolean): void;
        private _filterItem;
        private _addImpl;
        private _removeUpdateLayers;
        private _removeUpdateTypes;
        private _removeFromFull;
        private _removeItems;
        private _removeItem;
        /**
         * Manually removes an item or an array of items from the selection set.
         * Triggers a selection event.
         * @param itemOrItems A selectionItem or an array of selection items that will be removed from the current selection set.
         * @param suppressCallback Optional boolean param to suppress the selectionArray callbacks calls to this generate.
         */
        remove(itemOrItems: Selection.NodeSelectionItem | Selection.NodeSelectionItem[], suppressCallback?: boolean): void;
        /** hidden */
        private _removeImpl;
        private static _selectionItemIsFromModelBrowser;
        /**
         * Manually adds or removes an item from the selection set.
         * Triggers a selection event.
         * @param selectionItem A selectionItem that will be added or removed from the selection set.
         */
        toggle(item: Selection.NodeSelectionItem): void;
        /**
         * Manually removes all currently selected items (if any) from the selection set and adds the supplied item.
         * Triggers a selection event.
         * @param selectionItem A selectionItem that will become the new selection item.
         */
        set(selection: Selection.NodeSelectionItem | null): void;
        /**
         * Gets all current selection items.
         * @returns array of all selection items.
         */
        getResults(): Selection.NodeSelectionItem[];
        /**
         * Gets a selection at the specified index. The first selected item will be at index 0.
         * @param index index of selection item to get
         * @returns the selection result at the given index.
         */
        getResult(index: number): Selection.NodeSelectionItem | null;
        private _getItemFromOldest;
        private _getItemFromNewest;
        /**
         * Gets the least recent selection item.
         * @returns the least recently selected item (if any).
         */
        getFirst(): Selection.NodeSelectionItem | null;
        /**
         * Gets the most recent selection item.
         * @returns the most recently selected item (if any).
         */
        getLast(): Selection.NodeSelectionItem | null;
        /**
         * Gets the number of selection items.
         * @returns the number of selected items.
         */
        size(): number;
        /**
         * Iterates over all selection items.
         * The function passed in will be called once for every selection item and will receive the item as its parameter.
         * @param func a function to be called for every selection item.
         */
        each(func: (s: Selection.NodeSelectionItem) => void): void;
        /**
         * Removes all items from the selection set.
         * @param triggerCallback triggers a null selection callback when true.
         */
        clear(triggerCallback?: boolean): void;
        /**
         * Sets the color to be used when selecting nodes.
         * This method should not be called before the sceneReady callback has been triggered.
         * @param color the color to apply to the selected node.
         */
        setNodeSelectionColor(color: Color): DeprecatedPromise;
        private _setNodeSelectionColor;
        /**
         * Gets the color to be used when selecting nodes.
         * @returns the color that is applied to a selected node.
         */
        getNodeSelectionColor(): Color;
        /**
         * Sets color for the node selection outline.
         * This method should not be called before the sceneReady callback has been triggered.
         * @param color the color to apply to the node selection outline.
         */
        setNodeSelectionOutlineColor(color: Color): DeprecatedPromise;
        private _setNodeSelectionOutlineColor;
        /**
         * Gets the color to be used for outlining the node selection.
         * @returns the color for node selection outline.
         */
        getNodeSelectionOutlineColor(): Color;
        /**
         * Sets the color to use for node element selection.
         * This method should not be called before the sceneReady callback has been triggered.
         * @param color the color to apply to selected node elements.
         */
        setNodeElementSelectionColor(color: Color): DeprecatedPromise;
        private _setNodeElementSelectionColor;
        /**
         * Gets the color to use for face and line selection.
         * @returns the color used for face and line selection.
         */
        getNodeElementSelectionColor(): Color;
        /**
         * Gets the color to use for outlining node element selection.
         * This method should not be called before the sceneReady callback has been triggered.
         * @param color the color used for outlining face and line selection.
         */
        setNodeElementSelectionOutlineColor(color: Color): DeprecatedPromise;
        private _setNodeElementSelectionOutlineColor;
        /**
         * Gets the color to use for outlining face and line selection.
         * @returns color the color used for outlining face and line selection.
         */
        getNodeElementSelectionOutlineColor(): Color;
        /**
         * Gets whether face elements will be highlighted on selection.
         * @returns boolean the current value for face element selection highlighting.
         */
        getHighlightFaceElementSelection(): boolean;
        /**
         * Sets whether face elements should be highlighted when a selection occurs.
         * By default the system will automatically highlight face elements associated with a selection item.
         * @param highlightFaceElementSelection value indicating whether selected face elements should be highlighted.
         */
        setHighlightFaceElementSelection(highlightFaceElementSelection: boolean): DeprecatedPromise;
        /**
         * Sets the highlighting mode for selected nodes. The default behavior is to highlight the node and render an overlay outline.
         * This method should not be called before the sceneReady callback has been triggered.
         * @param highlightMode the highlighting mode that will be applied to selected nodes.
         */
        setNodeSelectionHighlightMode(highlightMode: SelectionHighlightMode): DeprecatedPromise;
        private _setNodeSelectionHighlightMode;
        /**
         * Gets the highlighting mode for selected nodes.
         * @returns the current
         */
        getNodeSelectionHighlightMode(): SelectionHighlightMode;
        /**
         * Sets the highlighting mode for selected node elements.
         * The default behavior is to highlight the node element and render an overlay outline.
         * This method should not be called before the sceneReady callback has been triggered.
         * @param highlightMode the highlighting mode that will be applied to selected nodes.
         */
        setNodeElementSelectionHighlightMode(highlightMode: SelectionHighlightMode): DeprecatedPromise;
        private _setNodeElementSelectionHighlightMode;
        getNodeElementSelectionHighlightMode(): SelectionHighlightMode;
        /**
         * Sets whether nodes should be highlighted when a selection occurs.
         * By default, the system will automatically highlight the node associated with a selection item.
         * @param highlightNodeSelection value indicating whether selected nodes should be highlighted.
         */
        setHighlightNodeSelection(highlightSelection: boolean): DeprecatedPromise;
        /**
         * Gets whether nodes will be highlighted on selection.
         * @returns the current value for node selection highlighting.
         */
        getHighlightNodeSelection(): boolean;
        /**
         * Gets whether line elements will be highlighted on selection.
         * @returns boolean the current value for line element selection highlighting.
         */
        getHighlightLineElementSelection(): boolean;
        /**
         * Gets whether point elements will be highlighted on selection.
         * @returns boolean the current value for point element selection highlighting.
         */
        getHighlightPointElementSelection(): boolean;
        /**
         * Sets whether line elements should be highlighted when a selection occurs.
         * By default the system will automatically highlight line elements associated with a selection item.
         * @param highlightLineElementSelection value indicating whether selected line elements should be highlighted.
         */
        setHighlightLineElementSelection(highlightLineElementSelection: boolean): DeprecatedPromise;
        /**
         * Sets whether point elements should be highlighted when a selection occurs.
         * By default the system will automatically highlight point elements associated with a selection item.
         * @param highlightPointElementSelection value indicating whether selected point elements should be highlighted.
         */
        setHighlightPointElementSelection(highlightPointElementSelection: boolean): DeprecatedPromise;
        /**
         * Sets the pick tolerance in pixels for line and point picking.
         * If a line or point is within this pixel tolerance of the click point,
         * it will be prioritized over the face at the click position.
         *
         * The default value is 20.
         * @param Pick Tolerance value in pixels
         */
        setPickTolerance(tolerance: number): void;
        /**
         * Gets the pick tolerance in pixels for line and point picking.
         *
         * The default value is 20.
         * @returns number Pick tolerance value in pixels
         */
        getPickTolerance(): number;
        /**
         * Exports selection objects so that they may be loaded back into the the system at a later time using loadSelectionData.
         * @returns exported selection data.
         */
        exportSelectionData(): Object[];
        /**
         * Loads serialized selection items exported using [[exportSelectionData]] back into the [[SelectionManager]].
         * The current selection will be cleared. A selection event will be triggered for each loaded item.
         * This method should not be called before the [[CallbackMap.modelStructureReady]] callback has been triggered.
         * @param data data to be imported in the form of a JavaScript object or JSON string
         */
        loadSelectionData(datas: Object[] | string): void;
        private _pathToParent;
        private _removeImplicit;
        private _removeDescendants;
        private _removeDescendantsRecursive;
        private _processSelection;
        private _clearHighlight;
        private _updateHighlight;
        private _updateItemHighlight;
        private _updateHighlightingMode;
        private _onSubtreeLoaded;
    }
}
declare namespace Communicator {
    class SheetManager {
        private readonly _viewer;
        private readonly _callbackManager;
        private _markupManager;
        private _activeSheetId;
        private _backgroundSheetMeshId;
        private _sheetIds;
        private _backgroundSheetEnabled;
        private _backgroundSelectionEnabled;
        private _backgroundColor;
        private _sheetColor;
        private _sheetShadowColor;
        private _engine;
        constructor(viewer: WebViewer, engine: Internal.ScEngine, callbackManager: Internal.CallbackManager, disableAutomaticBackgroundSheets: boolean);
        /**
         * @returns an array of 2D [[SheetId]]s.
         */
        getSheetIds(): NodeId[];
        /**
         * Returns Ids of sheet nodes which contain 3D data.
         */
        get3DNodes(): NodeId[];
        /**
         * Deactivate sheets and only display 3D content
         * @param triggerCallback triggers a "sheetDeactivated" callback if true
         * @param ignoreFitNodes camera will not fit nodes if true
         * @returns promise that resolves when the operation has completed
         */
        deactivateSheets(triggerCallback?: boolean, ignoreFitNodes?: boolean): Promise<void>;
        /**
         * Sets the id of the current active sheet
         * @param activeSheetId id of the sheet which will be activated.
         * @param isolateNodes indicates whether the nodes in the sheet should be isolated
         * @param fitNodes indicates whether a fit world should be performed after isolating the nodes.  Note: This parameter has no effect if `isolateNodes` is `false`.
         * @returns promise that resolves when the operation has completed
         */
        setActiveSheetId(activeSheetId: NodeId, isolateNodes?: boolean, fitNodes?: boolean): Promise<void>;
        private _activateSheetId;
        /**
         * @returns gets the id of the current active sheet. null if none has been set.
         */
        getActiveSheetId(): NodeId | null;
        /**
         * @returns true if a drawing sheet is activated, false otherwise
         */
        isDrawingSheetActive(): boolean;
        /** @hidden */
        setMarkupManager(markupManager: MarkupManager): void;
        private _createBackgroundSheetMesh;
        private _createBackgroundSheetMatrix;
        private _createBackgroundSheetInstance;
        /**
         * Deletes background sheets described by sheetTypes, but only if they exist.
         * @param sheetTypes An array with the sheets to delete. Omitting will delete all sheets.
         */
        private _deleteBackgroundSheetInstances;
        /**
         *  Creates the sheet-type into our array, or if the sheet already exists updates the necessary state values
         */
        private _createOrUpdateSheet;
        /**
         * Refreshes the background sheets used for 2D drawings.
         */
        private _refreshBackgroundSheets;
        /**
         * Sets custom sheet colors.
         * @param backgroundColor viewer background color.
         * @param sheetColor sheet background color.
         * @param sheetShadowColor sheet shadow effect color.
         */
        setSheetColors(backgroundColor: Color, sheetColor: Color, sheetShadowColor: Color): Promise<void>;
        /**
         * Gets the sheet Background Color.
         */
        getSheetBackgroundColor(): Color;
        /**
         * Gets the Sheet Color.
         */
        getSheetColor(): Color;
        /**
         * Gets the Sheet Shadow Color.
         */
        getSheetShadowColor(): Color;
        /**
         * Enables or disables the background sheet used for 2D drawings.
         */
        setBackgroundSheetEnabled(enabled: boolean): Promise<void>;
        /**
         * Gets the current state of the background sheet.
         * @returns `true` if enabled and `false` otherwise.
         */
        getBackgroundSheetEnabled(): boolean;
        /**
         * Sets whether the background for 2D drawings is selectable. By default it is not.
         * 2D drawings have an invisible selection plane with a single face. Note that this setting
         * is unaffected by the background-sheet enable setting.
         */
        setBackgroundSelectionEnabled(enabled: boolean): Promise<void>;
        /** Gets the current state of the background sheet.
         * @returns `true` if enabled and `false` otherwise.
         */
        getBackgroundSelectionEnabled(): boolean;
        /**
         * Enables a visual comparison of two drawing sheets. The nodes specified
         * by `sheetId1` are filled with one color, the nodes specified by
         * `sheetId2` with another color, and overlapping areas are filled
         * with a third color.
         *
         * See [[endSheetComparison]], [[View.startComparison]].
         *
         * @param sheetId1 the drawing sheet to compare against `sheetId2`
         * @param sheetId2 the drawing sheet to compare against `sheetId1`
         * @param config settings controlling the behavior of the comparison
         */
        startComparison(sheetId1: SheetId, sheetId2: SheetId, config?: ComparisonConfig): Promise<void>;
        /**
         * Disables a visual comparison of two drawing sheets enabled by
         * [[startSheetComparison]]. The `Promise` returned by that function
         * should be waited upon before calling [[endSheetComparison]].
         */
        endComparison(): Promise<void>;
    }
}
/**
 * https://github.com/canvg/canvg
 * https://www.npmjs.com/package/canvg
 */
declare var canvg: (canvas: HTMLCanvasElement | string, svgXmlStr: string) => void;
declare namespace Communicator {
    /**
     * Specifies which layers to include in a snapshot. These may be bitwise
     * OR-ed together.
     */
    enum SnapshotLayer {
        /** The rendered model and 3D overlays. */
        Model = 1,
        /** SVG-based markup. */
        Svg = 2,
        /** HTML-based markup, such as text boxes. */
        Html = 4,
        /** All available layers. */
        All = 7
    }
    /**
     * This class contains configuration properties for creating viewer snapshots.
     */
    class SnapshotConfig {
        /**
         * Specifies the width of the resulting snapshot image.
         * A value of 0 indicates the canvas width should be used.
         * The default value is 0.
         */
        width: number;
        /**
         * Specifies the width of the resulting snapshot image.
         * A value of 0 indicates the canvas width should be used.
         * The default value is 0.
         */
        height: number;
        /**
         * Indicates which layers to include in the snapshot.
         * The default value is [[SnapshotLayer.All]].
         */
        layers: SnapshotLayer;
        /**
         * Creates a new SnapshotConfig object.
         */
        constructor(width?: number, height?: number, layers?: SnapshotLayer);
    }
}
declare namespace Communicator.Internal {
    class Snapshot {
        private readonly _domElements;
        private readonly _config;
        constructor(domElements: DomElements, config: SnapshotConfig);
        private _extractMarkupSvgAsCanvas;
        private _extractRedlineSvgAsCanvas;
        private _extractRedlineAsCanvas;
        capture(mainCanvasContainer: HTMLDivElement): Promise<HTMLImageElement>;
    }
}
declare namespace Communicator.Markup.Shape {
    class StrokedShape {
        private _strokeWidth;
        private _strokeColor;
        /** @hidden */
        _assign(other: StrokedShape): void;
        /**
         * Sets the stroke color for this shape
         * @param color the stroke color
         */
        setStrokeColor(color: Color): void;
        /**
         * Gets the stroke color for this shape
         * @returns the stroke color
         */
        getStrokeColor(): Color;
        /**
         * Sets the stroke width for this shape in pixels
         * @param strokeWidth the stroke width in pixels
         */
        setStrokeWidth(strokeWidth: Pixels): void;
        /**
         * Gets the stroke width for this shape in pixels
         * @returns the stroke width in pixels
         */
        getStrokeWidth(): Pixels;
    }
    class FilledShape extends StrokedShape {
        private _fillColor;
        private _fillOpacity;
        /** @hidden */
        _assign(other: FilledShape): void;
        /**
         * Gets the fill opacity for this shape
         * @returns the fill opacity
         */
        getFillOpacity(): number;
        /**
         * Sets the fill opacity for this shape
         * @param fillOpacity the fill opacity
         */
        setFillOpacity(fillOpacity: number): void;
        /**
         * Sets the fill color for this shape
         * @param color the fill color
         */
        setFillColor(color: Color): void;
        /**
         * Gets the fill color for this shape
         * @returns the fill color
         */
        getFillColor(): Color;
    }
    /**
     * Enumerates the type of shapes that can appear at the endcap of a shape.
     */
    enum EndcapType {
        None = 0,
        Arrowhead = 1,
        Circle = 2
    }
    class EndcapShape extends StrokedShape {
        private _startEndcapType;
        private _startEndcapColor;
        private _startEndcapSize;
        private _endEndcapType;
        private _endEndcapColor;
        private _endEndcapSize;
        private _endcapsInverted;
        /** @hidden */
        _assign(other: EndcapShape): void;
        /**
         * Gets the start endcap type for this shape. The default Value is none.
         * @returns the start endcap type
         */
        getStartEndcapType(): EndcapType;
        /**
         * Sets the start endcap type for this shape
         * @param endcapType the new endcap type
         */
        setStartEndcapType(endcapType: EndcapType): void;
        /**
         * Gets the color of the start endcap. Default value is black.
         * @returns color for the start endcap.
         */
        getStartEndcapColor(): Color;
        /**
         * Sets the color for the start endcap.
         * @param color the start endcap color value.
         */
        setStartEndcapColor(color: Color): void;
        /**
         * Gets the size of the start endcap in pixels. Default value is 9.
         * @returns size of the start endcap.
         */
        getStartEndcapSize(): Pixels;
        /**
         * Sets the size of the start endcap in pixels.
         * @param size the start endcap.
         */
        setStartEndcapSize(size: Pixels): void;
        /**
         * Gets the end endcap type for this shape. The default value is none.
         * @returns the end endcap type
         */
        getEndEndcapType(): EndcapType;
        /**
         * Sets the end endcap type for this shape
         * @param endcapType the new endcap type
         */
        setEndEndcapType(endcapType: EndcapType): void;
        /**
         * Convenience for setting the start and eend endcap type for this shape
         * @param endcapType the new endcap type
         */
        setEndcapType(endcapType: EndcapType): void;
        /**
         * Gets the size of the end endcap in pixels. Default value is 9.
         * @returns size of the end endcap.
         */
        getEndEndcapSize(): Pixels;
        /**
         * Sets the size of the end endcap in pixels.
         * @param size the end endcap.
         */
        setEndEndcapSize(size: Pixels): void;
        /**
         * Gets the color of the end endcap. Default value is black.
         * @returns color for the end endcap.
         */
        getEndEndcapColor(): Color;
        /**
         * Sets the color for the end endcap.
         * @param color the end endcap color value.
         */
        setEndEndcapColor(color: Color): void;
        /**
         * Gets whether endcaps are inverted for this shape. The default value is false.
         * @returns value indicating whether endcaps are inverted
         */
        getEndcapsInverted(): boolean;
        /**
         * Sets whether endcapsare inverted for this shape.
         * @param inverted value indicated whether endcaps should be inverted
         */
        setEndcapsInverted(inverted: boolean): void;
    }
}
declare namespace Communicator.Markup.Shape {
    /**
     * This is a base class for rectangular markup objects. It should not be used directly.
     */
    class RectangleBase extends FilledShape {
        private _borderRadius;
        /** @hidden */
        _assign(other: RectangleBase): void;
        /**
         * Gets the border radius for this shape
         * @returns the border radius
         */
        getBorderRadius(): number;
        /**
         * Sets the border radius for this shape
         * @param borderRadius the border radius in pixels
         */
        setBorderRadius(borderRadius: number): void;
    }
    /**
     * Represents a rectangle defined by a position and a size.
     */
    class Rectangle extends RectangleBase {
        private _position;
        private _size;
        /**
         * Creates a new rectangle markup item
         * @param position the screen space position of the top left of the rectangle.
         * @param size the point object representing the width and height of the rectangle in pixels.
         */
        constructor(position?: Point2, size?: Point2);
        /** @hidden */
        _assign(other: Rectangle): void;
        /**
         * Sets the rectanlge position
         * @param position the top left corner of the rectangle
         */
        setPosition(position: Point2): void;
        /**
         * Gets rectangle position
         * @returns the rectangle position
         */
        getPosition(): Point2;
        /**
         * Sets the rectanlge size
         * @param size indicating the rectangle width and height
         */
        setSize(size: Point2): void;
        /**
         * Gets rectangle size
         * @returns the rectangle size
         */
        getSize(): Point2;
    }
    /** @hidden */
    class _MarkupRectangleData {
        position: Point2;
        size: Point2;
        constructor(position: Point2, size: Point2);
    }
    /**
     * This is useful for drawing a number of rectangles which share the same visual appearance.
     */
    class RectangleCollection extends RectangleBase {
        private _rectangles;
        /**
         * Removes all rectangles from this collection
         */
        clear(): void;
        /**
         * Adds a rectangle to the collection
         * @param position the top left corner of the rectangle
         * @param size indicating the rectangle width and height
         */
        addRectangle(position: Point2, size: Point2): void;
        /**
         * Gets the rectangles in the collection
         */
        getRectangles(): _MarkupRectangleData[];
    }
}
declare namespace Communicator.Markup.Shape {
    /**
     * This is a base class for text markup objects. It should not be created directly.
     */
    class TextMarkupBase extends FilledShape {
        private _fontFamily;
        private _fontSize;
        /** @hidden */
        constructor();
        /** @hidden */
        _assign(other: TextMarkupBase): void;
        /**
         * Gets the font family for this text
         * @returns the font family
         */
        getFontFamily(): string | null;
        /**
         * Sets the font family this shape
         * @param fontFamily font family to use for this text
         */
        setFontFamily(fontFamily: string): void;
        /**
         * Sets the font size for this text
         * @param fontSize size to use for this text
         */
        setFontSize(fontSize: number): void;
        /**
         * Gets the font size for this text
         * @returns the font size
         */
        getFontSize(): number;
    }
    /**
     * This object represents markup text that is drawn on the canvas.
     */
    class Text extends TextMarkupBase {
        private _position;
        private _text;
        /**
         * Creates a new markup text item.
         * @param text the text associated with this item.
         * @param position the screen space point of the top left of the text string.
         */
        constructor(text: string, position: Point2);
        /** @hidden */
        _assign(other: Text): void;
        /**
         * Sets the text position
         * @returns the top left position to render text from
         */
        setPosition(position: Point2): void;
        /**
         * Gets the text position
         * @returns the text position
         */
        getPosition(): Point2;
        /**
         * Sets the text content
         * @param text the text to render
         */
        setText(text: string): void;
        /**
         * Gets the text content
         * @returns the text content
         */
        getText(): string;
    }
    /** @hidden */
    class _MarkupTextData {
        text: string;
        position: Point2;
        constructor(text: string, position: Point2);
    }
    class TextCollection extends TextMarkupBase {
        private _textStrings;
        /**
         * Removes all text strings from this collection
         */
        clear(): void;
        /**
         * Adds a string to the collection
         * @param text the text to render
         * @param position the top left position of the text
         */
        addString(text: string, position: Point2): void;
        /**
         * Gets the strings in the collection
         */
        getStrings(): _MarkupTextData[];
    }
}
declare namespace Communicator.Markup {
    /**
     * This is a base class for all markup items that are overlayed over the viewer.
     * Inherit from this class or provide an identical interface when creating custom markup items.
     */
    class MarkupItem {
        /**
         * Called when the MarkupItem is removed from the system.
         * Any cleanup that needs to be done should be performed in this method.
         */
        remove(): void;
        /**
         * Called when the markup item should be redrawn on the screen. This most typically happens when the scene is rendered.
         */
        draw(): void;
        /**
         * Called when a hit test is performed on this markup item.
         * @param point position in window where the hit test is being performed.
         * @returns boolean value indicating whether this item was picked
         */
        hit(point: Point2): boolean;
        /**
         * Called when a hit test is performed on this markup item.
         * @param point position in window where the hit test is being performed.
         * @param pickTolerance amount of tolerance allowed for a hit in pixels.
         * @returns boolean value indicating whether this item was picked
         */
        hitWithTolerance(point: Point2, pickTolerance: number): boolean;
        /**
         * Called when this markup item is selected by the system.
         */
        onSelect(): void;
        /**
         * Called when this markup item is deselected by the system
         */
        onDeselect(): void;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Gets the fully qualified class name for this markup item. E.g. "Communicator.Markup.Redline.RedlineCircle"
         * @returns fully qualified class name
         */
        getClassName(): string;
        /** @hidden */
        protected _behindView: boolean;
    }
}
declare namespace Communicator.Internal {
    class StatisticMap {
        total_element_count: number;
        total_triangle_count: number;
    }
    class Statistics {
        private _viewer;
        private _callbackManager;
        private _statisticsDisplayHandle;
        private _statisticsDisplay;
        private _statistics;
        constructor(callbackManager: CallbackManager, viewer: WebViewer);
        update(): Promise<void>;
        isShown(): boolean;
        getStatistics(): StatisticMap;
        showDisplay(): Promise<void>;
        hideDisplay(): void;
    }
}
declare namespace Communicator {
    /**
     *  Allows customization of an exported SVG.
     */
    class SvgConfig {
        /** If true, the standard XML prolog will be included in the output SVG (default: true) */
        svgXmlPrologEnabled: boolean;
        /** If non-empty, an SVG <rect> element will be at the root with the given background color. (default: "") */
        svgBackgroundCssColor: string;
        /** Determines if silhouette lines will be drawn for the model (default: true) */
        silhouettesEnabled: boolean;
        /** Determines if the model lines will be included in the SVG output (default: true) */
        linesDrawModelLinesEnabled: boolean;
        /**
         * Determines the output SVG line width for all lines in the model. This is relative to
         * the SVG viewBox settings of -32767 to +32767 in both X and Y directions. (default: 20.0)
         */
        linesStrokeWidth: number;
        /** CSS compliant color string used to draw lines (default: "#000000") */
        linesCssColor: string;
        /**
         * For line clipping, this factor determines how close a line can get to a triangle
         * without getting clipped. Larger values will help small sections that shouldn't
         * get clipped, but larger values may also allow hidden line sections to poke through.
         * Z values are normalized to -32767 to 32767, so this value is relative to that scale. (default: 5.5)
         */
        linesClipProximityToPlane: number;
        /**
         * For line clipping, this value will be used to adjust line segment endpoints, bringing
         * closer to the camera for positive values. This is helpful for z-fighting causing
         * small sections of lines to be unintentionally clipped.
         * Z values are normalized to -32767 to 32767, so this value is relative to that scale. (default: 5.5)
         */
        linesClipZNudgeFactor: number;
        /**
         * If set to a non-empty CSS string value, forces all polygons to be drawn as this color
         * Example, to force all polygons to be white, use <code>PolygonsForceDrawColor="#ffffff"</code>
         * (default: "")
         */
        polygonsForceDrawCssColor: string;
        /** Enables progress logging. If running in-browser, this will go to the developer console (default: false) */
        logProgress: boolean;
        /** Enables diagnostics logging. If running in-browser, this will go to the developer console (default: false) */
        logDiagnostics: boolean;
    }
}
declare namespace Communicator {
    /** Formats accepted when specifying texture images. */
    enum ImageFormat {
        /** Uncompressed, interleaved RGBA, 32 bits per pixel (1 byte per channel) */
        Rgba32 = 0,
        /** Uncompressed, interleaved RGB, 24 bits per pixel (1 byte per channel) */
        Rgb24 = 1,
        /** Uncompressed grayscale, 1 byte per pixel */
        Gray8 = 2,
        /** Uncompressed grayscale with alpha, 16 bits per pixel (1 byte per channel) */
        GrayAlpha16 = 3,
        /** JPEG data */
        Jpeg = 4,
        /**
         * PNG data.
         *
         * Note: Currently, applying PNGs inserted through the viewer API as textures
         *       will cause objects to which they are applied to be treated as transparent,
         *       which may cause undesirable behavior. This can be avoided by setting
         *       [[TextureModifier.Decal]] in [[TextureOptions]] when applying the texture.
         *       [[TextureModifier.Decal]] is not currently supported for PBR based materials.
         */
        Png = 5
    }
    /** Parameters that describe an image to be used as a texture map. */
    interface ImageOptions {
        /** The format of the `data` property */
        format?: ImageFormat;
        /** The raw image data */
        data?: Uint8Array;
        /**
         * For uncompressed formats, the width of the image data in pixels.
         * Ignored for compressed formats.
         */
        width?: number;
        /**
         * For uncompressed formats, the height of the image data in pixels.
         * Ignored for compressed formats.
         */
        height?: number;
    }
    /** Controls how UV coordinates are interpreted outside the [0.0, 1.0] range. */
    enum TextureTiling {
        /**
         * Textures don't repeat. Any UV coordinates outside the [0.0, 1.0] range are clamped
         * to 0.0 or 1.0, whichever is closer.
         */
        Clamp = 0,
        /** Repeat the texture image when UV coordinates go outside the [0.0, 1.0] range. */
        Repeat = 1,
        /** The texture will get mapped normally for parameters in the range [0,1], but parameters outside that range will act as if the texture at that location is transparent. */
        Trim = 2
    }
    /**
     * Indicates how texture coordinates are specified or generated. This controls where a given
     * pixel of a texture appears on the object to which it is applied.
     */
    enum TextureParameterization {
        /** The texture will be mapped according to UV coordinates specified in the mesh data. */
        UV = 0
    }
    /** Flags that control how textures are applied. */
    enum TextureModifier {
        /**
         * When set, any transparent areas of the texture will be the same color as the underlying
         * diffuse color of the object.
         */
        Decal = 1
    }
    /** Parameters that describe a texture and control how it is applied. */
    interface TextureOptions {
        /** The image used by this texture. */
        imageId?: ImageId;
        /**
         * A matrix to be applied to the texture's UV coordinates. If not specified,
         * the identity matrix will be used.
         */
        matrix?: Matrix;
        /**
         * Controls how UV coordinates are interpreted outside the [0.0, 1.0] range.
         * (Default: [[TextureTiling.Repeat]])
         */
        tiling?: TextureTiling;
        /**
         * Enables or disables interpolation of texel colors (also known as linear filtering).
         * (Default: `true`)
         *
         * If disabled, the texture image will appear pixelated when enlarged.
         */
        interpolation?: boolean;
        /**
         * Enables or disables mipmapping. (Default: `true`)
         *
         * Enable mipmapping to improve image quality at the expense of slightly more memory usage.
         * Depending on the platform, mipmapping may take effect only for textures with dimensions
         * that are powers of two.
         *
         * If disabled, textures may appear noisy when reduced in size.
         */
        mipMapping?: boolean;
        /**
         * Indicates how texture coordinates are specified or generated.
         * (Defalut: [[TextureParameterization.UV]])
         *
         * This controls where a given pixel of the texture appears on the object to which it is applied.
         */
        parameterization?: TextureParameterization;
        /**
         * Flags that control how the texture is applied. This is the result of OR-ing together
         * one or more [[TextureModifier]]s. (Default: `0`)
         */
        modifiers?: number;
    }
}
declare namespace Communicator.Internal {
    class TimeoutMonitor {
        private readonly _callbackManager;
        private _timeoutDurationMinutes;
        private _timeoutWarningMinutes;
        private _timer;
        private _enabled;
        constructor(callbackManager: CallbackManager);
        setTimeoutDurations(duration: number, warning: number): boolean;
        shutdown(): void;
        resetTimeout(): void;
        private _warn;
        private _timeout;
    }
}
declare namespace Communicator {
    /** @deprecated Use [[uuid]] instead. */
    type Guid = string;
    /** Type used to denote GUIDs. */
    type Uuid = string;
    /** @deprecated Use [[GenericId]] instead. */
    type IfcGuid = string;
    /** Type used to denote HTML IDs. */
    type HtmlId = string;
    /** Type used to denote overlay indices. */
    type OverlayIndex = SC.OverlayIndex;
    /** Type used to denote Exchange IDs. */
    type ExchangeId = string;
    /** Type used to denote Filter IDs. */
    const enum FilterId {
    }
    /** Type used to denote Layer IDs. */
    const enum LayerId {
    }
    /** Type used to denote Layer names. */
    type LayerName = string;
    /** Type used to denote Filter names. */
    type FilterName = string;
    /** @deprecated Use [[GenericType]] instead. */
    type IfcType = string;
    /** Type used to denote generic types */
    type GenericType = string;
    /** Type used to denote generic id */
    type GenericId = string;
    /** Type used to denote assembly tree node IDs. */
    type NodeId = number;
    type NodeIdOffset = number;
    /** Type used to denote assembly tree part IDs. All PartIds are NodeIds. */
    type PartId = NodeId;
    /** Type used to denote assembly tree body IDs. All BodyIds are NodeIds. */
    type BodyId = NodeId;
    /** Type used to denote assembly tree CAD view IDs. All CadViewIds are NodeIds. */
    type CadViewId = NodeId;
    /** Type used to denote assembly tree PMI IDs. All PmiIds are NodeIds. */
    type PmiId = NodeId;
    /** Type used to denote assembly tree sheet IDs. All SheetIds are NodeIds. */
    type SheetId = NodeId;
    /** Type used to denote light keys */
    type LightKey = number;
    /** Type used to denote the degrees of angles. */
    type Degrees = number;
    /** Type used to denote the radians of angles. */
    type Radians = number;
    /** A number typed in pixel units. */
    type Pixels = number;
    /** A number typed in millisecond units. */
    type Milliseconds = number;
}
declare namespace Communicator.UUID {
    /**
     * This function returns a RFC4122 compliant UUID string.
     * This function is provided as a convenience only.  If you need secure identifiers, they should be generated with a fully conforming UUID package.
     */
    function create(): Uuid;
}
declare namespace Communicator.GUID {
    /** @deprecated Use [[UUID.create]] instead. */
    function create(): Uuid;
}
declare namespace Communicator {
    /**
     * Object representing the view associated to a model.
     * All major functionality that affects how a model is rendered including the currently active camera, the view mode and other functionality like selection are part of this object.
     */
    class View {
        private readonly _viewer;
        private readonly _engine;
        private readonly _callbackManager;
        private readonly _model;
        private readonly _interpolationManager;
        private _markupManager?;
        private readonly _eventDispatcher;
        private readonly _statistics;
        private _backfacesVisible;
        private _initialCamera;
        private _lineVisibility;
        private _faceVisibility;
        private _boundingCalculationIgnoresInvisible;
        private _backgroundColorTop;
        private _backgroundColorBottom;
        private _drawMode;
        private _ambientOcclusionEnabled;
        private _ambientOcclusionRadius;
        private _antiAliasingMode;
        private _lightingEnabled;
        private _ambientLightColor;
        private _bloomEnabled;
        private _bloomThreshold;
        private _bloomThresholdRampWidth;
        private _bloomIntensityScale;
        private _bloomLayers;
        private _goochBlue;
        private _goochYellow;
        private _goochBaseColorProminence;
        private _goochLuminanceShiftStrength;
        private _toonBandCount;
        private _toonSpecularFactor;
        private _groundPlane;
        private _simpleShadowEnabled;
        private _simpleShadowColor;
        private _simpleShadowOpacity;
        private _simpleShadowResolution;
        private _simpleShadowBlurSamples;
        private _simpleShadowBlurInterval;
        private _simpleShadowInteractiveUpdateEnabled;
        private _simpleReflectionEnabled;
        private _simpleReflectionBlurInterval;
        private _simpleReflectionBlurSamples;
        private _simpleReflectionFadeAngle;
        private _simpleReflectionOpacity;
        private _simpleReflectionAttenuation;
        private _silhouetteEnabled;
        private _silhouetteColor;
        private _silhouetteOpacity;
        private _silhouetteThreshold;
        private _silhouetteThresholdRampWidth;
        private _hardEdgesEnabled;
        private _hardEdgeColor;
        private _hardEdgeOpacity;
        private _hardEdgeThreshold;
        private _hardEdgeThresholdRampWidth;
        private _imageBasedLightingEnabled;
        private _imageBasedLightingIntensity;
        private _imageBasedLightingOrientation;
        private _lineJitterEnabled;
        private _lineJitterInstanceCount;
        private _lineJitterRadius;
        private _lineJitterFrequency;
        private readonly _determineInitialAxes;
        private readonly _hiddenLineSettings;
        private _projectionMode;
        private _navCube;
        private _axisTriad;
        /** @hidden */
        constructor(viewer: WebViewer, engine: Internal.ScEngine, callbackManager: Internal.CallbackManager, eventDispatcher: Internal.EventDispatcher, interpolationManager: Internal.InterpolationManager, statistics: Internal.Statistics, navCube: NavCube, axisTriad: AxisTriad);
        /** @hidden */
        private static deprecated;
        private _initEvents;
        private _massageInitialCamera;
        /**
         * Sets the line visibility for the view.
         * @param lineVisibility indicates whether to draw lines.
         */
        setLineVisibility(lineVisibility: boolean): DeprecatedPromise;
        private _setLineVisibility;
        /**
         * Gets the line visibility for the view.
         * @returns whether lines are currently being drawn.
         */
        getLineVisibility(): boolean;
        /**
         * Sets the face visibility for the view.
         * @param faceVisibility indicates whether to draw faces.
         */
        setFaceVisibility(faceVisibility: boolean): DeprecatedPromise;
        private _setFaceVisibility;
        /**
         * Gets the face visibility for the view.
         * @returns whether faces are currently being drawn.
         */
        getFaceVisibility(): boolean;
        /**
         * Sets the projection mode.
         * @param projection the projection mode to set.
         */
        setProjectionMode(projectionMode: Projection): void;
        /**
         * Gets the projection mode.
         * @returns The current projection mode.
         */
        getProjectionMode(): Projection;
        /**
         * Gets the view matrix.
         * @returns The current view matrix.
         */
        getViewMatrix(): Matrix;
        /**
         * Gets the projection matrix.
         * @returns The current projection matrix.
         */
        getProjectionMatrix(): Matrix;
        /**
         * This is equivalent to (projectionMatrix * viewMatrix).
         * @returns The current full camera matrix.
         */
        getFullCameraMatrix(): Matrix;
        /**
         * Creates a ray based on a viewport position.
         * @param point The (X, Y) viewport position.
         * @returns The ray if it was generated, otherwise null.
         */
        raycastFromPoint(point: Point2): Ray | null;
        /**
         * @param source
         * @param projectionMatrix
         * @param viewMatrix
         * @param viewSize
         */
        private _unproject;
        private _rectifySelectionItem;
        /** @hidden */
        private isOutsideCanvasArea;
        /**
         * Performs a picking operation from the given position on the canvas. The best candidate entity is be returned.
         * This method does not trigger a selection event.
         * This method will reject if the point is outside the canvas area.
         * @param point Canvas position to pick from.
         * @param config The configuration object used for this picking operation.
         * @returns An object containing the result of the picking operation.
         */
        pickFromPoint(point: Point2, config: PickConfig): Promise<Selection.SelectionItem>;
        /**
         * Performs a picking operation from the given position on the canvas. All candidate entities are returned.
         * This method does not trigger a selection event.
         * This method will reject if the point is outside the canvas area.
         * @param point Canvas position to pick from.
         * @param config The configuration object used for this picking operation.
         * @returns An object containing the result of the picking operation.
         */
        pickAllFromPoint(point: Point2, config: PickConfig): Promise<Selection.NodeEntitySelectionItem[]>;
        /**
         * Performs a composite picking operation.  This operation will return all candidate Node entities according to the PickConfig.
         * @param point Canvas position to pick from.
         * @param config The configuration object used for this picking operation.
         * @returns An object containing the result of the picking operation.
         */
        compositePickFromPoint(point: Point2, config: PickConfig): Promise<Selection.CompositeSelectionItem>;
        /**
         * Performs a selection operation from the given world-space ray. The best candidate entity is be returned.
         * This method does not trigger a selection event.
         * @param ray The world-space ray to perform the selection with.
         * @param config The configuration object used for this picking operation.
         * @param selectionMode The mode to use for this selection.
         * @returns An object containing the result of the picking operation.
         */
        pickFromRay(ray: Ray, config: PickConfig): Promise<Selection.SelectionItem>;
        /**
         * Performs a selection operation from the given world-space ray. All candidate entities are returned.
         * This method does not trigger a selection event.
         * @param ray The world-space ray to perform the selection with.
         * @param config The configuration object used for this picking operation.
         * @param selectionMode The mode to use for this selection.
         * @returns An object containing the result of the picking operation.
         */
        pickAllFromRay(ray: Ray, config: PickConfig): Promise<Selection.NodeEntitySelectionItem[]>;
        /**
         * Creates a new and active selection context for the provided selection window.
         * @param areaCssMin The minimum coodinate in CSS pixel space for the selection window.
         * @param areaCssMax The maximum coodinate in CSS pixel space for the selection window.
         * @param config The configuration object used for this selection operation.
         * @returns The handle for the selection context.
         */
        beginScreenSelectByArea(areaCssMin: Point2, areaCssMax: Point2, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        /**
         * Creates a new and active selection context for the provided selection ray.
         * The ray is created at the supplied ray origin and is cast into the scene.
         * Faces are selected if they lie along the ray.
         * Lines and points are selected if they lie within the ray's box radius.
         *
         * Note: Somewhat confusingly ray drill selection is actually a selection by volume.
         * The provided ray origin and radius are used to create a frustum to preform the selection.
         * This has some consequences. For example, the `SelectionResult`s returned by advancing a
         * ray drill selection will not have selection positions, since they were not selected at
         * a single point.
         * @param rayCssOrigin The coordinate in CSS pixel space for the selection ray's origin.
         * @param rayCssBoxRadius The radius around the ray in CSS pixel space used for line and point selection proximity.
         * @param config The configuration object used for this selection operation.
         * @returns The handle for the selection context.
         */
        beginRayDrillSelection(rayCssOrigin: Point2, rayCssBoxRadius: number, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        /**
         * Creates a new and active selection context for the provided selection volume.
         * The selection volume is a convex polyhedron defined by the bounded intersection of its half-spaces.
         * @param volumePlanes The planes used to define volume. A point p is inside the volume if and only if (plane.determineSide(p) == true) for all supplied planes.
         * @param heuristicOrigin A point used to compute distances against for prioritizing returned results. This is typically (but not necessarily) the center of the volume.
         * @param config The configuration object used for this selection operation.
         * @returns The handle for the selection context.
         */
        beginConvexPolyhedronSelection(volumePlanes: Plane[], heuristicOrigin: Point3, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        /**
         * Creates a new and active selection context for the provided selection sphere.
         * @param sphereCenter The center of the selection sphere.
         * @param sphereRadius The radius of the selection sphere.
         * @param config The configuration object used for this selection operation.
         * @returns The handle for the selection context.
         */
        beginSphereSelection(sphereCenter: Point3, sphereRadius: number, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        /**
         * Deactivates and destroys the provided selection context.
         * @param handle The selection context to destroy.
         */
        endIncrementalSelection(handle: Selection.IncrementalSelectionId): DeprecatedPromise;
        private _endIncrementalSelection;
        /** @deprecated Use [[endIncrementalSelection]] instead. */
        endVolumeSelection(handle: Selection.IncrementalSelectionId): DeprecatedPromise;
        /**
         * Returns the next batch of geometry selected by the supplied selection context.
         * @param handle The handle to an active area selection context.
         * @returns Returns selected items. If the resulting list is null then there are no more items to select.
         */
        advanceIncrementalSelection(handle: Selection.IncrementalSelectionId): Promise<Selection.NodeSelectionItem[] | null>;
        /** @deprecated Use [[advanceIncrementalSelection]] instead. */
        advanceVolumeSelection(handle: Selection.IncrementalSelectionId): Promise<Selection.NodeSelectionItem[] | null>;
        /**
         * Projects a 3d world space point to a 3d screen space point.
         * @param point world space point to be projected.
         * @param camera if a camera is provided, its projection and view matrix will be used.
         * @returns point projected into 3d screen space.
         */
        projectPoint(source: Point3, camera?: Camera): Point3;
        /**
         * @param source
         * @param projectionMatrix
         * @param viewMatrix
         * @param viewSize
         */
        private _project;
        /**
         * Unprojects a 2d screen space point to a 3d world space point.
         * @param point 2d screen space
         * @param z z value, default 0
         * @returns point world space point
         */
        unprojectPoint(point: Point2, z: number): Point3 | null;
        /**
         * Creates a normalized window position in the range of (-1, 1) for a given point in window space.
         * @returns the normalized window position
         */
        pointToWindowPosition(pt: Point2): Point2;
        /**
         * Sets the current camera
         * @param camera the camera to set
         * @param duration camera transition time in milliseconds
         */
        setCamera(camera: Camera | null, duration?: number): boolean;
        /** @hidden */
        _setCameraPromise(camera: Camera, duration: number): Promise<void>;
        private _setCameraImpl;
        private _interpolateCamera;
        /**
         * Updates camera properties individually. This method should be used to incrementally update camera properties individually.
         * @param camera the camera to set.
         * @returns updated camera object.
         */
        updateCamera(camera: Camera): Camera;
        /**
         * Resets the camera to the initial view of the model when first loaded.
         * @param duration the amount of time in milliseconds that the camera transition between the current and initial view should take.
         */
        resetCamera(duration?: number): Promise<void>;
        /**
         * Gets the current camera
         * @returns the current camera
         */
        getCamera(): Camera;
        /**
         * Returns a camera set to a ViewOrientation
         * @param orientation The desired view orientation for the camera.
         * @param bounding Optional bounding to fit the camera about. If not supplied, the model bounding will be used.
         */
        getViewOrientationCamera(orientation: ViewOrientation, bounding?: Box, preserveModelUp?: boolean): Promise<Camera>;
        /**
         * Sets the view to a standard orientation.
         * @param orientation The desired view orientation for the camera.
         * @param duration The number of milliseconds used to transition to the new camera.
         * @param bounding Optional bounding to fit the camera about. If not supplied, the model bounding will be used.
         * @param preserveModelUp Indicates whether the camera up will be set according to model up or current camera.
         */
        setViewOrientation(orientation: ViewOrientation, duration?: number, bounding?: Box, preserveModelUp?: boolean): Promise<void>;
        /**
         * Centers the camera on a specified node id.
         * @param nodeId
         * @param duration the number of milliseconds to transition to the new camera.
         */
        centerCameraOnNode(nodeId: NodeId, duration?: number, camera?: Camera): Promise<void>;
        /** @hidden */
        _setInitialView(duration: number): Promise<void>;
        /**
         * Returns the size of the viewer canvas.
         * @returns the current size of the viewer canvas.
         */
        getCanvasSize(): Point2;
        /**
         * @hidden
         * @param markupManager
         */
        _setMarkupManager(markupManager: MarkupManager): void;
        /**
         * Sets the display for the default statistic overlay.
         * @param visible whether the default statistics overlay should be drawn.
         */
        setStatisticsDisplayVisibility(visibility: boolean): Promise<void>;
        /**
         * Returns the background colors of the canvas.
         * @returns the canvas background colors.
         */
        getBackgroundColor(): VerticalGradient;
        /**
         * Sets the viewer background color to a gradient interpolating from the top to bottom color.
         * For a solid color, the top and bottom color should have the same values.
         * Background Transparency is only available with client-side rendering.
         * To re-enable a transparent background, pass null to the parameters of this function.
         * @param top the top color for the the background gradient.
         * @param bottom the bottom color for the the background gradient.
         * @returns a promise that resolves when the operation has completed.
         */
        setBackgroundColor(top?: Color | null, bottom?: Color | null): DeprecatedPromise;
        /**
         * Hides all nodes except those specified. Also fits the camera to those nodes' bounding box.
         * @param nodeIds An array of the node IDs to be isolated.
         * @param duration Time in milliseconds for the camera transition to the new camera view.
         * @param fitNodes If true, then the view is fitted around the isolated nodes.
         * @param initiallyHiddenStayHidden Controls whether or not initially hidden geometries stay hidden. Default behavior is driven by [[setBehaviorInitiallyHidden]].
         */
        isolateNodes(nodeIds: NodeId[], duration?: number, fitNodes?: boolean, initiallyHiddenStayHidden?: boolean | null): Promise<void>;
        /**
         * Fits the camera to the bounding box containing the node ids.
         * @param nodeIds Array of node ids to fit the camera.
         * @param duration Time in milliseconds for the camera transition to the new camera view.
         * @returns A promise that will be resolved once the transition is complete.
         */
        fitNodes(ids: NodeId[], duration?: number): Promise<void>;
        /**
         * Fits the view to the model bounding box.
         * @param duration the number of milliseconds to transition to the new camera.
         * @returns A promise that will be resolved once the transition is complete.
         */
        fitWorld(duration?: number, camera?: Camera): Promise<void>;
        private _fitCameraToBounding;
        /**
         * Fits the camera to the bounding box.
         * @param bounding bounding box to fit the camera.
         * @param duration Time in milliseconds for the camera transition to the new camera view.
         * @returns A promise that will be resolved once the transition is complete.
         */
        fitBounding(bounding: Box, duration?: number, camera?: Camera): Promise<void>;
        /**
         * Sets whether backfaces should be rendered in the scene.
         * @param visible Boolean value indicating whether backfaces should be rendered.
         * @returns Promise that is resolved when this operation has completed.
         */
        setBackfacesVisible(visible: boolean): DeprecatedPromise;
        /**
         * Gets whether backfaces are being rendered in the scene.
         * @returns Boolean value indicating whether backfaces are being rendered in the scene.
         */
        getBackfacesVisible(): boolean;
        /**
         * Sets the drawing mode for the scene.
         * @param drawMode The drawing mode to set.
         */
        setDrawMode(drawMode: DrawMode): DeprecatedPromise;
        private _setDrawMode;
        /**
         * @returns The current draw mode
         */
        getDrawMode(): DrawMode;
        /**
         * Sets the anti-aliasing mode for the scene.
         * @param antiAliasingMode
         */
        setAntiAliasingMode(antiAliasingMode: AntiAliasingMode): DeprecatedPromise;
        private _setAntiAliasingMode;
        /**
         * Gets the anti-aliasing mode for the scene. The Default value is AntiAliasingMode.SMAA
         * @returns the current anti-aliasing mode.
         */
        getAntiAliasingMode(): AntiAliasingMode;
        /**
         * @returns a [[Settings.HiddenLineSettings]] object.
         */
        getHiddenLineSettings(): Settings.HiddenLineSettings;
        /**
         * Sets whether ambient occlusion is enabled
         * @param enabled sets whether ambient occlusion will be enabled
         */
        setAmbientOcclusionEnabled(enabled?: boolean): DeprecatedPromise;
        private _setAmbientOcclusionEnabled;
        /**
         * @returns boolean value indicating whether ambient occlusion is enabled
         */
        getAmbientOcclusionEnabled(): boolean;
        /**
         * Sets the ambient occlusion radius. This value represents the maximum screen-proportional distance between two points such that one will cast a shadow on the other.
         * @param radius the ambient occlusion radius.
         */
        setAmbientOcclusionRadius(radius: number): DeprecatedPromise;
        private _setAmbientOcclusionRadius;
        /**
         * @returns the ambient occlusion radius
         */
        getAmbientOcclusionRadius(): number;
        /**
         * Sets whether lighting is enabled. When disabled, material colors
         * are drawn at full intensity.
         *
         * See also [[InstanceModifier.DoNotLight]], [[clearLights]].
         */
        setLightingEnabled(enabled?: boolean): DeprecatedPromise;
        private _setLightingEnabled;
        /**
         * Returns whether lighting is enabled.
         *
         * See also [[setLightingEnabled]].
         */
        getLightingEnabled(): boolean;
        /**
         * Sets how transparent objects are blended.
         */
        setTransparencyMode(mode: TransparencyMode): void;
        /**
         * Sets the opacity of unselected items in x-ray mode.
         * @param opacity a number between 0 and 1
         * @param element the type of element to which the opacity will apply.
         * If unspecified, the opacity will apply to all element types.
         */
        setXRayOpacity(opacity: number, element?: ElementType): DeprecatedPromise;
        private _setXRayOpacity;
        /**
         * Sets how transparent (unselected) objects are blended in x-ray mode.
         */
        setXRayTransparencyMode(mode: XRayTransparencyMode): DeprecatedPromise;
        private _setXRayTransparencyMode;
        /**
         * Sets the color applied to nodes in x-ray mode.
         * By default, the color is unset.
         *
         * See [[unsetXRayColor]].
         *
         * @param element the type of geometry to apply the color to
         * @param color the color to apply
         * @param group the category of nodes that will be affected.
         * If unspecified, [[XRayGroup.Selected]] will be used.
         */
        setXRayColor(element: ElementType, color: Color, group?: XRayGroup): DeprecatedPromise;
        /**
         * Unsets the color applied to selected items in x-ray mode.
         * Selected items will be displayed without overriding their colors.
         *
         * See [[setXRayColor]].
         *
         * @param element the type of geometry affected by the change
         * @param group the category of nodes that will be affected.
         * If unspecified, [[XRayGroup.Selected]] will be used.
         */
        unsetXRayColor(element: ElementType, group?: XRayGroup): Promise<void>;
        /**
         * Sets the value to use as the blue tone in Gooch shading.
         * @param blue the blue tone.  This value should be in the range [0,1]
         */
        setGoochBlue(blue: number): void;
        /**
         * Gets the value to use as the blue tone in Gooch shading.
         */
        getGoochBlue(): number;
        /**
         * Sets the prominence of the object's base color in Gooch shading.
         * @param prominence this scalar value determines the amount of the object's base color is applied to the final shaded color.
         */
        setGoochBaseColorProminence(prominence: number): void;
        /**
         * Gets the prominence of the object's base color in Gooch shading.
         */
        getGoochBaseColorProminence(): number;
        /**
         * Sets the value to use as the yellow tone in Gooch shading.
         * @param yellow the yellow tone. This value should be in the range [0,1]
         *
         */
        setGoochYellow(yellow: number): void;
        /**
         * Gets the value to use as the yellow tone in Gooch shading.
         */
        getGoochYellow(): number;
        /**
         * Sets the number of discrete shading bands that will be used when toon shading is enabled.  Each band represents a shade between dark and light which will control the final color of the pixel based on its light intensity.  The default band count is 3.
         */
        setToonShadingBandCount(bandCount: number): void;
        /**
         * Gets the current number of discrete shading bands that will be used when toon shading is enabled.
         */
        getToonShadingBandCount(): number;
        /**
         * Sets a scale factor which controls the size of specular highlights when toon shading is enabled.  The default value is 1.0.
         */
        setToonShadingSpecularFactor(specularFactor: number): void;
        /**
         * Gets the current toon shading specular scale factor.
         */
        getToonShadingSpecularFactor(): number;
        /**
         * Sets the strength of the luminance shift in Gooch shading.
         * @param shiftStrength this scalar values determines the amount of luminance shift that is applied to the object's base color
         */
        setGoochLuminanceShiftStrength(shiftStrength: number): void;
        /**
         * Gets the strength of the luminance shift in Gooch shading.
         */
        getGoochLuminanceShiftStrength(): number;
        /**
         * Sets the diameter of rendered points. (default: 1, ScreenPixels) See [[PointSizeUnit]].
         */
        setPointSize(size: number, unit: PointSizeUnit): DeprecatedPromise;
        private _setPointSize;
        /**
         * Gets the diameter of rendered points. See [[PointSizeUnit]].
         */
        getPointSize(): Promise<[number, PointSizeUnit]>;
        /**
         * Controls the appearance of rendered points. (default: Square) See [[PointShape]].
         */
        setPointShape(shape: PointShape): DeprecatedPromise;
        private _setPointShape;
        /**
         * Gets the PointShape. See [[PointShape]]
         */
        getPointShape(): Promise<PointShape>;
        /**
         * Enables or disables eye-dome lighting for point clouds. (default: disabled)
         */
        setEyeDomeLightingEnabled(enabled?: boolean): DeprecatedPromise;
        private _setEyeDomeLightingEnabled;
        /**
         * @returns boolean value indicating if eye-dome lighting is enabled or disabled.
         */
        getEyeDomeLightingEnabled(): Promise<boolean>;
        /**
         * Sets the diameter of the blur filter used in eye-dome lighting for point clouds.
         * Setting the value to 0 will disable blurring. (default: 7)
         */
        setEyeDomeLightingBlurSamples(value: number): DeprecatedPromise;
        private _setEyeDomeLightingBlurSamples;
        /**
         * Returns the diameter of the blur filter used in eye-dome lighting for point clouds.
         * A value of 0 means that blurring is disabled.
         */
        getEyeDomeLightingBlurSamples(): Promise<number>;
        /**
         * Sets the distance in pixels between samples taken by the blur filter used in eye-dome lighting
         * for point clouds. (default: 1)
         */
        setEyeDomeLightingBlurInterval(value: number): DeprecatedPromise;
        private _setEyeDomeLightingBlurInterval;
        /**
         * Returns the distance in pixels between samples taken by the blur filter used in eye-dome lighting
         * for point clouds.
         */
        getEyeDomeLightingBlurInterval(): Promise<number>;
        /**
         * Controls the maximum Z-distance between samples taken by the blur filter used in eye-dome
         * lighting for point clouds. The value is taken as a proportion of the screen size.
         * Decreasing the value will result in sharper edges, and increasing the value will result
         * in softer edges. (default: .03)
         */
        setEyeDomeLightingBlurEdgeDistance(value: number): DeprecatedPromise;
        private _setEyeDomeLightingBlurEdgeDistance;
        /**
         * Returns a value that controls the maximum Z-distance between samples taken by
         * the blur filter used in eye-dome lighting for point clouds.
         * The value is a proportion of the screen size.
         */
        getEyeDomeLightingBlurEdgeDistance(): Promise<number>;
        /**
         * Controls the shading contrast in eye-dome lighting for point clouds. The value is taken
         * as a number of pixels. Increasing the value will result in overall lighter shading, and
         * decreasing the value will result in overall darker shading. (default: 2)
         */
        setEyeDomeLightingShadingEdgeDistance(value: number): DeprecatedPromise;
        private _setEyeDomeLightingShadingEdgeDistance;
        /**
         * Returns a value that controls the shading contrast in eye-dome lighting for point clouds.
         * The value is a number of pixels.
         */
        getEyeDomeLightingShadingEdgeDistance(): Promise<number>;
        /**
         * Sets the opacity of the shading rendered by eye-dome lighting for point clouds. (default: 1)
         * @param value A number in the range [0,1].
         */
        setEyeDomeLightingOpacity(value: number): DeprecatedPromise;
        private _setEyeDomeLightingOpacity;
        /**
         * Returns the opacity of the shading rendered by eye-dome lighting for point clouds.
         * The value is in the range [0,1].
         */
        getEyeDomeLightingOpacity(): Promise<number>;
        /**
         * Sets whether or not bounding calculations by this View object ignores invisible geometry.
         */
        setBoundingCalculationIgnoresInvisible(value: boolean): void;
        /**
         * @returns whether or not bounding calculations by this View object ignores invisible geometry.
         */
        getBoundingCalculationIgnoresInvisible(): boolean;
        /**
         * Sets whether intermediate frames of an incremental draw will be displayed. (default: true)
         *
         * If false, the image will only be displayed once completely drawn, except immediately
         * after certain operations, such as setting the camera. To disable these exceptions,
         * call [[setInteractiveDrawDelay]] with a value of 0.
         */
        setDisplayIncompleteFrames(value: boolean): DeprecatedPromise;
        private _setDisplayIncompleteFrames;
        /**
         * Sets how long after certain operations, such as setting the camera, to wait before
         * starting a redraw. This delay exists in order to prevent flicker during continuous
         * interaction. The initial value is 200ms.
         * @param value The delay in milliseconds
         */
        setInteractiveDrawDelay(value: number): DeprecatedPromise;
        private _setInteractiveDrawDelay;
        /**
         * Sets whether or not the viewer will periodically attempt to increase the amount drawn during interaction.
         * Setting this to `false` may improve periodic framerate dips caused by such adjustments.
         * @param enable
         */
        setInteractiveDrawLimitIncreaseEnabled(enable: boolean): void;
        /**
         * Gets whether or not the viewer will periodically attempt to increase the amount drawn during interaction.
         * @return boolean value indicating whether this feature is enabled or not
         */
        getInteractiveDrawLimitIncreaseEnabled(): Promise<boolean>;
        getNavCube(): NavCube;
        readonly navCube: NavCube;
        getAxisTriad(): AxisTriad;
        readonly axisTriad: AxisTriad;
        private _determineViewAxes;
        /**
         * Sets the color of the ambient light applied to the scene.
         * This is a constant source of light that affects every point
         * in the scene in the same way regardless of position
         * or surface normal.
         *
         * See also [[getAmbientLightColor]].
         */
        setAmbientLightColor(value: Color): void;
        /**
         * Gets the color of the ambient light applied to the scene.
         *
         * See also [[setAmbientLightColor]].
         */
        getAmbientLightColor(): Color;
        /**
         * Removes all lights from the scene. When there are no lights,
         * material colors are drawn at full intensity. This has the same
         * visual effect as calling `setLightingEnabled(false)`.
         *
         * See also:
         *  - [[InstanceModifier.DoNotLight]]
         *  - [[setLightingEnabled]]
         */
        clearLights(): void;
        /**
         * Adds a light to the scene. The returned promise may be rejected if
         * there are too many lights in the scene. See [[Light]].
         *
         * See also:
         *  - [[clearLights]]
         *  - [[removeLight]]
         *  - [[updateLight]]
         *  - [[setAmbientLightColor]]
         */
        addLight(light: Light): Promise<LightKey>;
        /**
         * removes a light from the scene. See [[Light]].
         *
         * See also:
         *  - [[addLight]]
         *  - [[clearLights]]
         *  - [[updateLight]]
         */
        removeLight(key: LightKey): void;
        /**
         * Updates a light in the scene. See [[Light]].
         *
         * See also:
         *  - [[addLight]]
         *  - [[clearLights]]
         *  - [[removeLight]]
         */
        updateLight(key: LightKey, light: Light): void;
        /**
         * Sets whether bloom is enabled.
         *
         * See [[getBloomEnabled]].
         */
        setBloomEnabled(value?: boolean): void;
        /**
         * Returns whether bloom is enabled.
         *
         * See [[setBloomEnabled]].
         */
        getBloomEnabled(): boolean;
        /**
         * Sets the minimum luminance value a pixel must have for it to
         * contribute to bloom. The value should be in the range `[0,1]`.
         *
         * See [[getBloomThreshold]], [[setBloomThresholdRampWidth]].
         */
        setBloomThreshold(value: number): void;
        /**
         * Returns the minimum luminance value a pixel must have for it to
         * contribute to bloom.
         *
         * See [[setBloomThreshold]], [[getBloomThresholdRampWidth]].
         */
        getBloomThreshold(): number;
        /**
         * Sets how much greater than the threshold set by [[setBloomThreshold]]
         * a pixel's luminance value must be before it contributes fully to
         * the bloom effect.
         *
         * If the pixel's luminance value does not exceed
         * the threshold by at least the amount set by this function,
         * the pixel's contribution will be diminished based on how close
         * its luminance value is to the threshold.
         *
         * See [[getBloomThresholdRampWidth]].
         */
        setBloomThresholdRampWidth(value: number): void;
        /**
         * Returns how much greater than the threshold set by [[setBloomThreshold]]
         * a pixel's luminance value must be before it contributes fully to
         * the bloom effect.
         *
         * See [[setBloomThresholdRampWidth]].
         */
        getBloomThresholdRampWidth(): number;
        /**
         * Sets the intensity of the bloom effect. This value is multiplied
         * by the intensities of the individual layers set by [[setBloomLayers]].
         *
         * See [[getBloomIntensityScale]].
         */
        setBloomIntensityScale(value: number): void;
        /**
         * Gets the intensity of the bloom effect.
         *
         * See [[setBloomIntensityScale]].
         */
        getBloomIntensityScale(): number;
        /**
         * Sets the number of layers in the bloom effect and the layers'
         * attributes.
         *
         * The bloom effect is achieved by applying a luminance filter to the
         * source image, then progressively downsampling, blurring, and adding
         * the results together. The result of each downsample/blur operation is
         * fed into the next, which is executed at half the resolution of the
         * previous. The number of stages and the behavior of each stage
         * are controlled by this function.
         *
         * See [[BloomLayerInfo]], [[getBloomLayers]].
         */
        setBloomLayers(layers: BloomLayerInfo[]): void;
        /**
         * Returns an array of objects describing each layer in the bloom
         * effect.
         *
         * See [[setBloomLayers]].
         */
        getBloomLayers(): BloomLayerInfo[];
        /**
         * Enables a visual comparison of two sets of nodes. The nodes specified
         * by `nodeIdSet1` are filled with one color, the nodes specified by
         * `nodeIdSet2` with another color, and overlapping areas are filled
         * with a third color.
         *
         * See [[endComparison]].
         *
         * @param nodeIdSet1 the nodes to compare against `nodeIdSet2`
         * @param nodeIdSet2 the nodes to compare against `nodeIdSet1`
         * @param config settings controlling the behavior of the comparison
         */
        startComparison(nodeIdSet1: NodeId[], nodeIdSet2: NodeId[], config?: ComparisonConfig): void;
        /**
         * Disables a visual comparison of two sets of nodes enabled by
         * [[startComparison]].
         */
        endComparison(): void;
        /**
         * Enables or disables a full-scene shadow projected onto an
         * invisible ground plane.
         *
         * See also:
         *  - [[getSimpleShadowEnabled]]
         *  - [[setSimpleShadowColor]]
         *  - [[setSimpleShadowOpacity]]
         *  - [[setGroundPlane]]
         *  - [[setSimpleShadowResolution]]
         *  - [[setSimpleShadowInteractiveUpdateEnabled]]
         *
         * @param value Whether simple shadows should be enabled.
         */
        setSimpleShadowEnabled(value?: boolean): void;
        /**
         * Returns whether simple shadows are enabled.
         *
         * See [[setSimpleShadowEnabled]].
         */
        getSimpleShadowEnabled(): boolean;
        /**
         * Sets the color of simple shadows.
         *
         * See also:
         *  - [[getSimpleShadowColor]]
         *  - [[setSimpleShadowEnabled]]
         *
         * @param color The color to set.
         */
        setSimpleShadowColor(color: Color): void;
        /**
         * Returns the color of simple shadows.
         *
         * See also:
         *  - [[setSimpleShadowColor]]
         *  - [[setSimpleShadowEnabled]]
         */
        getSimpleShadowColor(): Color;
        /**
         * Sets the opacity of simple shadows.
         *
         * See also:
         *  - [[getSimpleShadowOpacity]]
         *  - [[setSimpleShadowEnabled]]
         *
         * @param opacity The opacity to set.
         */
        setSimpleShadowOpacity(opacity: number): void;
        /**
         * Returns the opacity of simple shadows.
         *
         * See also:
         *  - [[setSimpleShadowOpacity]]
         *  - [[setSimpleShadowEnabled]]
         */
        getSimpleShadowOpacity(): number;
        /**
         * Defines the invisible ground plane onto which simple shadows
         * and reflections are projected.
         *
         * See also:
         *  - [[getGroundPlane]]
         *  - [[setSimpleShadowEnabled]]
         *  - [[setSimpleReflectionEnabled]]
         *
         * @param plane The plane to set.
         */
        setGroundPlane(plane: GroundPlane): void;
        private _updateGroundPlane;
        /**
         * Returns information about the invisible ground plane onto which
         * simple shadows and reflections are projected.
         *
         * See also:
         *  - [[setGroundPlane]]
         */
        getGroundPlane(): GroundPlane;
        /**
         * Sets the width and height in pixels of the texture image into which
         * simple shadows are drawn.
         *
         * See also:
         *  - [[getSimpleShadowResolution]]
         *  - [[setSimpleShadowEnabled]]
         *
         * @param pixels The resolution to set.
         */
        setSimpleShadowResolution(pixels: number): void;
        /**
         * Returns the width and height in pixels of the texture image
         * into which simple shadows are drawn.
         *
         * See also:
         *  - [[getSimpleShadowResolution]]
         *  - [[setSimpleShadowEnabled]]
         */
        getSimpleShadowResolution(): number;
        /**
         * Sets the diameter of the blur filter used for simple shadows.
         * Setting the value to `0` will disable blurring.
         *
         * See also:
         *  - [[getSimpleShadowBlurSamples]]
         *  - [[setSimpleShadowEnabled]]
         *
         * @param value The number of samples.
         */
        setSimpleShadowBlurSamples(value: number): void;
        /**
         * Returns the diameter of the blur filter used for simple shadows.
         *
         * See also:
         *  - [[setSimpleShadowBlurSamples]]
         *  - [[setSimpleShadowEnabled]]
         */
        getSimpleShadowBlurSamples(): number;
        /**
         * Sets the distance in pixels between samples taken by the blur filter
         * used for simple shadows.
         *
         * See also:
         *  - [[getSimpleShadowBlurInterval]]
         *  - [[setSimpleShadowEnabled]]
         *
         * @param value The interval to set.
         */
        setSimpleShadowBlurInterval(value: number): void;
        /**
         * Returns the distance in pixels between samples taken by the blur
         * filter used for simple shadows.
         *
         * See also:
         *  - [[setSimpleShadowBlurInterval]]
         *  - [[setSimpleShadowEnabled]]
         */
        getSimpleShadowBlurInterval(): number;
        /**
         * Enables or disables updates to simple shadows during user
         * interaction.
         *
         * See also:
         *  - [[getSimpleShadowInteractiveUpdateEnabled]]
         *  - [[setSimpleShadowEnabled]]
         */
        setSimpleShadowInteractiveUpdateEnabled(value?: boolean): void;
        /**
         * Returns whether simple shadows will be updated during user
         * interaction.
         *
         * See also:
         *  - [[setSimpleShadowInteractiveUpdateEnabled]]
         *  - [[setSimpleShadowEnabled]]
         */
        getSimpleShadowInteractiveUpdateEnabled(): boolean;
        /**
         * Enables or disables silhouette edges.
         *
         * Silhouette edges are always enabled in hidden line mode.
         *
         * See also:
         * - [[getSilhouetteEnabled]]
         * - [[setSilhouetteColor]]
         * - [[setSilhouetteOpacity]]
         * - [[setSilhouetteThreshold]]
         * - [[setSilhouetteThresholdRampWidth]]
         *
         * @param value Whether silhouette edges should be enabled.
         */
        setSilhouetteEnabled(value?: boolean): void;
        /**
         * Returns whether silhouette edges are enabled.
         *
         * Silhouette edges are always enabled in hidden line mode, regardless
         * of the return value.
         *
         * See [[setSilhouetteEnabled]].
         */
        getSilhouetteEnabled(): boolean;
        /**
         * Sets the color of silhouette edges.
         *
         * See also:
         * - [[getSilhouetteColor]]
         * - [[setSilhouetteEnabled]]
         *
         * @param value The color to set.
         */
        setSilhouetteColor(value: Color): void;
        /**
         * Returns the color of silhouette edges.
         *
         * See also:
         * - [[setSilhouetteColor]]
         * - [[setSilhouetteEnabled]]
         */
        getSilhouetteColor(): Color;
        /**
         * Sets the opacity of silhouette edges.
         *
         * See also:
         * - [[getSilhouetteOpacity]]
         * - [[setSilhouetteEnabled]]
         *
         * @param value The opacity to set.
         */
        setSilhouetteOpacity(value: number): void;
        /**
         * Returns the opacity of silhouette edges.
         *
         * See also:
         * - [[setSilhouetteOpacity]]
         * - [[setSilhouetteEnabled]]
         */
        getSilhouetteOpacity(): number;
        /**
         * Sets the distance threshold for silhouette edges. This value
         * affects the minimum z-distance required between two pixels
         * for an edge to be drawn. A smaller value will result in more edges
         * being drawn on finer details.
         *
         * The value is a proportion of the canvas size and not a world-space
         * distance.
         *
         * See also:
         * - [[getSilhouetteThreshold]]
         * - [[setSilhouetteThresholdRampWidth]]
         * - [[setSilhouetteEnabled]]
         *
         * @param value The threshold to set.
         */
        setSilhouetteThreshold(value: number): void;
        /**
         * Returns the distance threshold for silhouette edges. This value
         * affects the minimum z-distance required between two pixels
         * for an edge to be drawn. A smaller value will result in more edges
         * being drawn on finer details.
         *
         * The value is a proportion of the canvas size and not a world-space
         * distance.
         *
         * See also:
         * - [[setSilhouetteThreshold]]
         * - [[setSilhouetteThresholdRampWidth]]
         * - [[setSilhouetteEnabled]]
         *
         * @param value The threshold to set.
         */
        getSilhouetteThreshold(): number;
        /**
         * Controls how quickly edges fade as z-distance between pixels
         * decreases.
         *
         * This value is added to the one set by [[setSilhouetteThreshold]]
         * to create a secondary threshold. Distances greater than the
         * secondary threshold will result in edges with full opacity, and
         * distances between the two thresholds will result in edges with
         * reduced opacity.
         *
         * Setting this value to `0` will cause all edges to be drawn
         * at full opacity.
         *
         * See also:
         * - [[getSilhouetteThresholdRampWidth]]
         * - [[setSilhouetteEnabled]]
         */
        setSilhouetteThresholdRampWidth(value: number): void;
        /**
         * Returns the value set by [[setSilhouetteThresholdRampWidth]].
         *
         * This value is added to the one set by [[setSilhouetteThreshold]]
         * to create a secondary threshold. Distances greater than the
         * secondary threshold will result in edges with full opacity, and
         * distances between the two thresholds will result in edges with
         * reduced opacity.
         *
         * A value of `0` means that all edges are drawn at full opacity.
         *
         * See also:
         * - [[setSilhouetteThresholdRampWidth]]
         * - [[setSilhouetteEnabled]]
         */
        getSilhouetteThresholdRampWidth(): number;
        /**
         * Enables or disables hard edges. Hard edges are edges between two
         * faces whose normals diverge beyond a given angle.
         *
         * Hard edges are always enabled in hidden line mode.
         *
         * See also:
         * - [[getHardEdgesEnabled]]
         * - [[setHardEdgeColor]]
         * - [[setHardEdgeOpacity]]
         * - [[setHardEdgeThreshold]]
         * - [[setHardEdgeThresholdRampWidth]]
         *
         * @param value Whether hard edges should be enabled.
         */
        setHardEdgesEnabled(value?: boolean): void;
        /**
         * Returns whether hard edges are enabled. Hard edges are edges between
         * two faces whose normals diverge beyond a given angle.
         *
         * Hard edges are always enabled in hidden line mode, regardless of the
         * return value.
         *
         * See [[setHardEdgesEnabled]].
         */
        getHardEdgesEnabled(): boolean;
        /**
         * Sets the color of hard edges.
         *
         * See also:
         * - [[getHardEdgeColor]]
         * - [[setHardEdgesEnabled]]
         *
         * @param value The color to set.
         */
        setHardEdgeColor(value: Color): void;
        /**
         * Returns the color of hard edges.
         *
         * See also:
         * - [[setHardEdgeColor]]
         * - [[setHardEdgesEnabled]]
         */
        getHardEdgeColor(): Color;
        /**
         * Sets the opacity of hard edges.
         *
         * See also:
         * - [[getHardEdgeOpacity]]
         * - [[setHardEdgesEnabled]]
         *
         * @param value The opacity to set.
         */
        setHardEdgeOpacity(value: number): void;
        /**
         * Returns the opacity of hard edges.
         *
         * See also:
         * - [[setHardEdgeOpacity]]
         * - [[setHardEdgesEnabled]]
         */
        getHardEdgeOpacity(): number;
        /**
         * Sets the angle threshold for hard edges. Edges will be drawn between
         * two faces whose normals diverge beyond this angle.
         *
         * See also:
         * - [[getHardEdgeThreshold]]
         * - [[setHardEdgeThresholdRampWidth]]
         * - [[setHardEdgesEnabled]]
         *
         * @param degrees The threshold to set.
         */
        setHardEdgeThreshold(degrees: number): void;
        /**
         * Returns the angle threshold for hard edges. Edges will be drawn
         * between two faces whose normals diverge beyond this angle.
         *
         * See also:
         * - [[setHardEdgeThreshold]]
         * - [[setHardEdgeThresholdRampWidth]]
         * - [[setHardEdgesEnabled]]
         *
         * @param value The threshold to set.
         */
        getHardEdgeThreshold(): number;
        /**
         * Controls how quickly edges fade as the angle between adjacent faces
         * decreases.
         *
         * This value is added to the one set by [[setHardEdgeThreshold]] to
         * create a secondary threshold. Angles greater than the secondary
         * threshold will result in edges with full opacity, and angles between
         * the two thresholds will result in edges with reduced opacity.
         *
         * Setting this value to `0` will cause all edges to be drawn at full
         * opacity.
         *
         * See also:
         * - [[getHardEdgeThresholdRampWidth]]
         * - [[setHardEdgesEnabled]]
         */
        setHardEdgeThresholdRampWidth(degrees: number): void;
        /**
         * Returns the value set by [[setHardEdgeThresholdRampWidth]].
         *
         * This value is added to the one set by [[setHardEdgeThreshold]] to
         * create a secondary threshold. Angles greater than the secondary
         * threshold will result in edges with full opacity, and angles between
         * the two thresholds will result in edges with reduced opacity.
         *
         * A value of `0` means that all edges are drawn at full opacity.
         *
         * See also:
         * - [[setHardEdgeThresholdRampWidth]]
         * - [[setHardEdgesEnabled]]
         */
        getHardEdgeThresholdRampWidth(): number;
        /**
         * Enables or disables simple reflections projected onto an
         * invisible ground plane.
         *
         * See also:
         * - [[getSimpleReflectionEnabled]]
         * - [[setSimpleReflectionOpacity]]
         * - [[setSimpleReflectionBlurSamples]]
         * - [[setSimpleReflectionBlurInterval]]
         * - [[setSimpleReflectionFadeAngle]]
         */
        setSimpleReflectionEnabled(value?: boolean): void;
        /**
         * Returns whether simple reflections are enabled.
         *
         * See [[setSimpleReflectionEnabled]].
         */
        getSimpleReflectionEnabled(): boolean;
        /**
         * Sets the distance between samples taken by the blur filter used for
         * simple reflections.
         *
         * See also:
         *  - [[getSimpleReflectionBlurInterval]]
         *  - [[setSimpleReflectionEnabled]]
         *
         * @param value The interval to set.
         * @param unit The unit in which the `value` argument is specified.
         */
        setSimpleReflectionBlurInterval(value: number, unit?: BlurIntervalUnit): void;
        /**
         * Returns the distance between samples taken by the blur filter used
         * for simple reflections.
         *
         * See also:
         *  - [[setSimpleReflectionBlurInterval]]
         *  - [[setSimpleReflectionEnabled]]
         */
        getSimpleReflectionBlurInterval(): [number, BlurIntervalUnit];
        /**
         * Sets the diameter of the blur filter used for simple reflections.
         * Setting the value less than or equal to `1` will disable blurring.
         *
         * See also:
         * - [[getSimpleReflectionBlurSamples]]
         * - [[setSimpleReflectionEnabled]]
         */
        setSimpleReflectionBlurSamples(value: number): void;
        /**
         * Returns the diameter of the blur filter used for simple reflections.
         * A value less than or equal to `1` means that blurring is disabled.
         *
         * See also:
         * - [[setSimpleReflectionBlurSamples]]
         * - [[setSimpleReflectionEnabled]]
         */
        getSimpleReflectionBlurSamples(): number;
        /**
         * Sets the angle, in degrees, between the view vector and the ground
         * plane at which simple reflections begin to fade.
         *
         * Settings the value to `0` will disable the fading effect.
         *
         * Regardless of the value, simple reflections will not be drawn
         * if the camera is below the ground plane.
         *
         * See also:
         * - [[getSimpleReflectionFadeAngle]]
         * - [[setSimpleReflectionEnabled]]
         *
         * @param degrees The angle in degrees.
         */
        setSimpleReflectionFadeAngle(degrees: number): void;
        /**
         * Returns the angle, in degrees, between the view vector and the ground
         * plane at which simple reflections begin to fade.
         *
         * A value to `0` means that the fading effect is disabled.
         *
         * Regardless of the value, simple reflections will not be drawn
         * if the camera is below the ground plane.
         *
         * See also:
         * - [[setSimpleReflectionFadeAngle]]
         * - [[setSimpleReflectionEnabled]]
         */
        getSimpleReflectionFadeAngle(): number;
        /**
         * Sets the opacity of simple reflections.
         *
         * See also:
         *  - [[getSimpleReflectionOpacity]]
         *  - [[setSimpleReflectionEnabled]]
         *
         * @param opacity The opacity to set.
         */
        setSimpleReflectionOpacity(value: number): void;
        /**
         * Returns the opacity of simple reflections.
         *
         * See also:
         *  - [[setSimpleReflectionOpacity]]
         *  - [[setSimpleReflectionEnabled]]
         */
        getSimpleReflectionOpacity(): number;
        /**
         * Controls how objects drawn in simple reflections fade as they
         * move further from the ground plane.
         *
         * Attenuation begins at `nearDistance` and increases linearly
         * such that the model is not visible in the reflection beyond
         * `farDistance`.
         *
         * Attenuation is disabled if `farDistance` is less than or equal to
         * `nearDistance`.
         *
         * See also:
         *  - [[getSimpleReflectionAttenuation]]
         *  - [[setSimpleReflectionEnabled]]
         *
         * @param nearDistance The distance from the ground plane at which
         * objects begin to fade.
         * @param farDistance The distance from the ground plane at which
         * objects are completely faded.
         * @param unit The unit in which `nearDistance` and `farDistance` are
         * specified. If unspecified, [[SimpleReflectionAttenuationUnit.World]]
         * will be used.
         */
        setSimpleReflectionAttenuation(nearDistance: number, farDistance: number, unit?: SimpleReflectionAttenuationUnit): void;
        /**
         * Returns properties that control how objects drawn in simple
         * reflections fade as they move further from the ground plane.
         *
         * Attenuation begins at `nearDistance` and increases linearly
         * such that the model is not visible in the reflection beyond
         * `farDistance`.
         *
         * Attenuation is disabled if `farDistance` is less than or equal to
         * `nearDistance`.
         *
         * See also:
         *  - [[setSimpleReflectionAttenuation]]
         *  - [[setSimpleReflectionEnabled]]
         *
         * @returns An object with the following properties:
         */
        getSimpleReflectionAttenuation(): {
            /** The distance from the ground plane at which the model begins to fade. */
            nearDistance: number;
            /** The distance from the ground plane at which the model is completely faded. */
            farDistance: number;
            /** The unit in which `nearDistance` and `farDistance` are specified. */
            unit: SimpleReflectionAttenuationUnit;
        };
        /**
         * Tests whether the given points are visible by comparing them to
         * the depth buffer of the most-recently-drawn frame. Points that
         * are partially obscured by transparent objects are considered visible.
         *
         * If the test is to be run every time a frame is drawn,
         * [[setPointVisibilityTest]] should be used instead for proper
         * synchronization.
         *
         * @param points The points to test.
         * @returns A list of indices of the visible points.
         */
        testPointVisibility(points: Point3[]): Promise<number[]>;
        /**
         * Sets a list of points whose visibility will be tested every time a
         * frame is drawn by comparing them to the frame's depth buffer. Points
         * that are partially obscured by transparent objects are considered
         * visible.
         *
         * The results are passed to the [[CallbackMap.frameDrawn]] callback so
         * that UI elements may be updated in sync with rendering.
         *
         * See also [[testPointVisibility]].
         *
         * @param points The points to test. An empty array will disable the test.
         */
        setPointVisibilityTest(points: Point3[]): void;
        /**
         * Sets whether image-based lighting is enabled for physically-based
         * materials.
         *
         * See also:
         * - [[getImageBasedLightingEnabled]]
         * - [[setImageBasedLightingIntensity]]
         * - [[setImageBasedLightingOrientation]]
         */
        setImageBasedLightingEnabled(value: boolean): void;
        /**
         * Returns whether image-based lighting is enabled for physically-based
         * materials.
         *
         * See also:
         * - [[setImageBasedLightingEnabled]]
         * - [[setImageBasedLightingIntensity]]
         * - [[setImageBasedLightingOrientation]]
         */
        getImageBasedLightingEnabled(): boolean;
        /**
         * Sets the intensity (brightness) of image-based lighting applied to
         * physically-based materials.
         *
         * The default value is 1.
         *
         * See also:
         * - [[getImageBasedLightingIntensity]]
         * - [[setImageBasedLightingEnabled]]
         * - [[setImageBasedLightingOrientation]]
         */
        setImageBasedLightingIntensity(value: number): void;
        /**
         * Returns the intensity (brightness) of image-based lighting applied to
         * physically-based materials.
         *
         * The default value is 1.
         *
         * See also:
         * - [[setImageBasedLightingIntensity]]
         * - [[setImageBasedLightingEnabled]]
         * - [[setImageBasedLightingOrientation]]
         */
        getImageBasedLightingIntensity(): number;
        private _copyImageBasedLightingOrientation;
        /**
         * Sets the orientation of the image-based lighting environment applied
         * to physically-based materials.
         *
         * See also:
         * - [[getImageBasedLightingOrientation]]
         * - [[setImageBasedLightingEnabled]]
         * - [[setImageBasedLightingIntensity]]
         */
        setImageBasedLightingOrientation(value: ImageBasedLightingOrientation): void;
        /**
         * Returns the orientation of the image-based lighting environment
         * applied to physically-based materials.
         *
         * See also:
         * - [[setImageBasedLightingOrientation]]
         * - [[setImageBasedLightingEnabled]]
         * - [[setImageBasedLightingIntensity]]
         */
        getImageBasedLightingOrientation(): ImageBasedLightingOrientation;
        private _updateImageBasedLightingOrientation;
        /**
         * Sets the environment image used by image-based lighting applied to
         * physically-based materials.
         *
         * Passing `null` will cause the default environment image to be used.
         *
         * The image should be a cube map in KTX2 format with a space-separated
         * list of spherical harmonics coefficients stored under the "sh"
         * metadata key.
         *
         * A compatible image can be created from an equirectangular source
         * image (such as those found at [HDRI Haven](https://hdrihaven.com))
         * with the following process:
         *
         * - cmgen: https://github.com/google/filament
         * - ktx2ktx2, ktx2sc: https://github.com/KhronosGroup/KTX-Software/
         *
         * ```
         * cmgen -x out --format=ktx --size=256 in.hdr
         * ktx2ktx2 -o uncompressed.ktx2 out/out_ibl.ktx
         * ktxsc --zcmp 20 -o out.ktx2 uncompressed.ktx2
         * ```
         */
        setImageBasedLightingEnvironment(data: Uint8Array | null): void;
        /**
         * Sets whether line jitter is enabled.
         *
         * Line jitter makes lines look 'sketchy' by drawing them multiple times
         * with randomized offsets applied to the vertices.
         *
         * See also:
         * - [[getLineJitterEnabled]]
         * - [[setLineJitterInstanceCount]]
         * - [[setLineJitterRadius]]
         * - [[setLineJitterFrequency]]
         */
        setLineJitterEnabled(value?: boolean): void;
        /**
         * Returns whether line jitter is enabled.
         *
         * Line jitter makes lines look 'sketchy' by drawing them multiple times
         * with randomized offsets applied to the vertices.
         *
         * See also:
         * - [[setLineJitterEnabled]]
         * - [[getLineJitterInstanceCount]]
         * - [[getLineJitterRadius]]
         * - [[getLineJitterFrequency]]
         */
        getLineJitterEnabled(): boolean;
        /**
         * Sets the number of times lines are drawn when line jitter is enabled.
         * The default value is 4.
         *
         * Increasing this number can make the lines look more 'sketchy.'
         *
         * See also:
         * - [[setLineJitterEnabled]]
         * - [[getLineJitterInstanceCount]]
         * - [[setLineJitterRadius]]
         * - [[setLineJitterFrequency]]
         */
        setLineJitterInstanceCount(value: number): void;
        /**
         * Returns the number of times lines are drawn when line jitter is
         * enabled. The default value is 4.
         *
         * See also:
         * - [[getLineJitterEnabled]]
         * - [[setLineJitterInstanceCount]]
         * - [[getLineJitterRadius]]
         * - [[getLineJitterFrequency]]
         */
        getLineJitterInstanceCount(): number;
        /**
         * Sets the radius of the random offset applied to line vertices when
         * line jitter is enabled. The default value is 0.005.
         *
         * The value is specified as a proportion of the canvas height, where 1
         * means the full height of the canvas.
         *
         * See also:
         * - [[setLineJitterEnabled]]
         * - [[setLineJitterInstanceCount]]
         * - [[getLineJitterRadius]]
         * - [[setLineJitterFrequency]]
         */
        setLineJitterRadius(value: number): void;
        /**
         * Returns the radius of the random offset applied to line vertices when
         * line jitter is enabled. The default value is 0.005.
         *
         * The value is specified as a proportion of the canvas height, where 1
         * means the full height of the canvas.
         *
         * See also:
         * - [[getLineJitterEnabled]]
         * - [[getLineJitterInstanceCount]]
         * - [[setLineJitterRadius]]
         * - [[getLineJitterFrequency]]
         */
        getLineJitterRadius(): number;
        /**
         * Sets the frequency of the noise used to offset line vertices when
         * line jitter is enabled. The default value is 5.
         *
         * Decreasing this value causes lines to appear smoother, while
         * increasing it causes lines to look more noisy.
         *
         * See also:
         * - [[setLineJitterEnabled]]
         * - [[setLineJitterInstanceCount]]
         * - [[setLineJitterRadius]]
         * - [[getLineJitterFrequency]]
         */
        setLineJitterFrequency(value: number): void;
        /**
         * Returns the frequency of the noise used to offset line vertices when
         * line jitter is enabled. The default value is 5.
         *
         * See also:
         * - [[getLineJitterEnabled]]
         * - [[getLineJitterInstanceCount]]
         * - [[getLineJitterRadius]]
         * - [[setLineJitterFrequency]]
         */
        getLineJitterFrequency(): number;
    }
}
declare namespace Communicator.Internal.Tree {
    const MaxModelFileVersion: VersionNumber;
    /**
     * This is a wrapper over `ProductOccurrenceInfo` so the two
     * types can be differentiated with an `instanceof` check.
     */
    class ReferencedNodeInfo {
        constructor(nodeInfo: ProductOccurrenceInfo);
        protected readonly __ReferencedNodeInfo: PhantomMember;
        readonly referencedInfo: ProductOccurrenceInfo;
    }
    type ModelFileNodeInfo = ProductOccurrenceInfo | ReferencedNodeInfo;
    /**
     * This contains the tree structure of a `ModelFile`.
     * The XML files used for loading models are of model files.
     */
    interface ModelFileInfo {
        treeInfos: RoseTree<ModelFileNodeInfo>[];
    }
    /**
     * Extracts the `ProductOccurrenceInfo` from any `ModelFileNodeInfo`.
     */
    function modelFileNodeInfoAsProdOccInfo(nodeInfo: ModelFileNodeInfo): ProductOccurrenceInfo;
    class ModelFile {
        /**
         * This is used to parse `ModelFileInfo` without adding it to the tree.
         */
        static parseXml(config: LoadSubtreeConfig, assemblyTree: AssemblyTree, inclusionContext: InclusionContext, elem: Element, toAttachData: ToAttachDataFunc): ModelFileInfo;
        private static _parentMapToChildMap;
        private static _childMapRoseTrees;
        /**
         * Inserts `ModelFileInfo` into the assembly tree.
         */
        static reify(config: LoadSubtreeConfig, callbackManager: CallbackManager, treeLoader: TreeLoader, assemblyTree: AssemblyTree, context: InclusionContext, fileInfo: ModelFileInfo): Promise<ProductOccurrence[]>;
        private static _rectifyExternalModelInfo;
        private static _reifyProductOccurrence;
        private static _parseBounding;
        static parseBounding(modelFileInfo: ModelFileInfo, parentUnit: number): Box;
        private constructor();
        protected readonly __ModelFile: PhantomMember;
    }
}
declare namespace Communicator {
    interface WebViewerConfig {
        /** The ID of the div element to use for the Web Viewer. */
        containerId?: HtmlId;
        /** A HTML element to use for the Web Viewer. */
        container?: HTMLElement;
        /** Specifies the endpoint to be used by the viewer. This can be of type: http, https or ws. */
        endpointUri?: string;
        /** Specifies the instance name to be loaded. This option is required if you specify an enpdointUri of type `ws://` or `wss://`. */
        model?: ScModelName | null;
        /** An arbitrary value used for authentication. If used, it must match the token expected by the server for connection to proceed. */
        sessionToken?: string;
        /** Specifies a buffer containing a binary representation of an SCS file to load. */
        buffer?: Uint8Array;
        /** Specifies the renderer type to be used. Default value is [[RendererType.Client]]. */
        rendererType?: RendererType;
        /** Whether the viewer should be started without connecting to a server or loading a model. */
        empty?: boolean;
        /** Specifies whether pointer events should be used when available. Setting this option to false can be useful when using web views in GUI toolkits that rely on Internet Explorer. Default value is `true`. */
        usePointerEvents?: boolean;
        /** Sets the streaming mode that the viewer will use. Default value is [[StreamingMode.Interactive]]. */
        streamingMode?: StreamingMode;
        /** Controls the amount of mesh data present on the client machine at given time. This value is expressed in [Mebibytes](https://en.wikipedia.org/wiki/Mebibyte). Default value is `0` indicating no limit. */
        memoryLimit?: number;
        /** Specifies what types of bounding previews should be rendered. DefaultValue is [[BoundingPreviewMode.All]]. */
        boundingPreviewMode?: BoundingPreviewMode;
        /** Specifies which mesh detail level will be used to initially stream the model. The default value is `0`. */
        defaultMeshLevel?: number;
        /** Specifies a scale factor that will be applied to the streaming size cutoff.
         *
         * In streaming sessions, an object whose projected size is lower than the cutoff will not be streamed until its projected size reaches the cutoff.
         *
         * In file sessions, when loading a tree via XML, a file whose projected size is lower than the cutoff will not be requested until its projected size reaches the cutoff.
         *
         * A value of 0 will disable the cutoff.  The value should be in the interval of [0.0, 2.0].
         * If unspecified, this value will default to 1.0 for streaming sessions and 0.0 (disabled) for file based sessions.
         * */
        streamCutoffScale?: number;
        /** If true, then automatic generation of background sheets for drawings is not performed when the drawing is loaded. */
        disableAutomaticBackgroundSheets?: boolean;
        /** If true, then the floorplan overlay capability will not be displayed automatically for BIM enabled models */
        disableAutomaticFloorplanOverlay?: boolean;
        /** If true, the default view axes will be calculated from the initial camera unless explicitly set during authoring time. Default value is `true`. */
        calculateDefaultViewAxes?: boolean;
        /** If true, disable automatic fitworld on camera activation when there is no camera on view */
        disableAutomaticFitWorld?: boolean;
        /** If true, then CAD views contained within external models will populate the model tree UI. */
        enableShatteredModelUiViews?: boolean;
        /** Path containing the graphics engine `.js` and `.wasm` files. Follows the same rules as the `src` attribute of an HTML `script` tag. */
        enginePath?: string;
        defaultMetallicFactor?: number;
        defaultRoughnessFactor?: number;
        /** @hidden */
        _maxConcurrentAttachments?: number;
        /** @hidden */
        _markImplicitNodesOutOfHierarchy?: boolean;
    }
    class WebViewer {
        private static BUILD_ID;
        private static VIEWER_VERSION_STRING;
        readonly view: View;
        readonly model: Model;
        readonly operatorManager: OperatorManager;
        readonly markupManager: MarkupManager;
        readonly explodeManager: ExplodeManager;
        readonly floorplanManager: FloorplanManager;
        readonly selectionManager: SelectionManager;
        readonly measureManager: MeasureManager;
        readonly lineManager: LineManager;
        readonly cuttingManager: CuttingManager;
        readonly overlayManager: OverlayManager;
        readonly BCFManager: BCFManager;
        readonly sheetManager: SheetManager;
        readonly noteTextManager: Markup.Note.NoteTextManager;
        readonly animationManager: Animation.Manager;
        private readonly _engine;
        private readonly _callbackManager;
        private readonly _interpolationManager;
        private readonly _domElements;
        private readonly _eventDispatcher;
        private readonly _inputMonitor;
        private readonly _statistics;
        private readonly _timeoutMonitor;
        private readonly _modelStructure;
        private _streamingMode;
        private _rendererType;
        private readonly _params;
        private _contextMenuActiveFlag;
        private _alreadyShutDown;
        private readonly _shutdownTimer;
        private readonly _sceneReadyPromise;
        private _modelLoadFailure;
        /**
         * Creates a new Web Viewer instance. You must pass in a **containerId** key with the ID of an element or a **container** element to use for your viewer.
         * The system will create any required elements inside the supplied container.
         *
         * @param inputParams object containing key-value pairs for viewer to set
         */
        constructor(inputParams: WebViewerConfig);
        /** @hidden */
        private static deprecated;
        /**
         * Sets a boolean with the status of the context menu
         * @param isActive
         */
        setContextMenuStatus(isActive: boolean): void;
        /**
         * @returns boolean true if the context menu is active, false otherwise
         */
        getContextMenuStatus(): boolean;
        /**
         * Deactivate sheets and only display 3D content
         * @deprecated Use [[SheetManager.deactivateSheets]] from [[sheetManager]] instead.
         * @returns promise that resolves when the operation has completed
         */
        deactivateSheets(): Promise<void>;
        /**
         * Sets the id of the current active sheet.
         * This method will also isolate and fit the nodes contained in the sheet.
         * @param activeSheetId id of the sheet which will be activated.
         * @deprecated Use [[SheetManager.setActiveSheetId]] from [[sheetManager]] instead.
         * @returns promise that resolves when the operation has completed
         */
        setActiveSheetId(activeSheetId: SheetId): Promise<void>;
        /**
         * @deprecated Use [[SheetManager.getActiveSheetId]] from [[sheetManager]] instead.
         * @returns gets the id of the current active sheet. null if none has been set.
         */
        getActiveSheetId(): SheetId | null;
        /**
         * @deprecated Use [[SheetManager.getSheetIds]] from [[sheetManager]] instead.
         * @returns an array of 2D [[SheetId]]s.
         */
        getSheetIds(): SheetId[];
        /**
         * @deprecated Use [[SheetManager.isDrawingSheetActive]] from [[sheetManager]] instead.
         * @returns true if a drawing sheet is activated, false otherwise
         */
        isDrawingSheetActive(): boolean;
        /**
         * @deprecated Use [[SheetManager.setBackgroundSheetEnabled]] from [[sheetManager]] instead.
         * Enables or disables the background sheet used for 2D drawings.
         */
        setBackgroundSheetEnabled(enabled: boolean): Promise<void>;
        /**
         * Gets the current state of the background sheet.
         * @deprecated Use [[SheetManager.getBackgroundSheetEnabled]] from [[sheetManager]] instead.
         * @returns `true` if enabled and `false` otherwise.
         */
        getBackgroundSheetEnabled(): boolean;
        /**
         * Sets whether the background for 2D drawings is selectable. By default it is not.
         * 2D drawings have an invisible selection plane with a single face. Note that this setting
         * is unaffected by the background-sheet enable setting.
         * @deprecated Use [[SheetManager.setBackgroundSelectionEnabled]] from [[sheetManager]] instead.
         */
        setBackgroundSelectionEnabled(enabled: boolean): Promise<void>;
        /**
         * Gets the current state of the background sheet.
         * @deprecated Use [[SheetManager.getBackgroundSelectionEnabled]] from [[sheetManager]] instead.
         * @returns `true` if enabled and `false` otherwise.
         */
        getBackgroundSelectionEnabled(): boolean;
        /**
         * Sets custom sheet colors.
         * @param backgroundColor viewer background color.
         * @param sheetColor sheet background color.
         * @param sheetShadowColor sheet shadow effect color.
         * @deprecated Use [[SheetManager.setSheetColors]] from [[sheetManager]] instead.
         */
        setSheetColors(backgroundColor: Color, sheetColor: Color, sheetShadowColor: Color): Promise<void>;
        /**
         * Gets the sheet Background Color.
         * @deprecated Use [[SheetManager.getSheetBackgroundColor]] from [[sheetManager]] instead.
         */
        getSheetBackgroundColor(): Color;
        /**
         * Gets the Sheet Color.
         * @deprecated Use [[SheetManager.getSheetBackgroundColor]] from [[sheetManager]] instead.
         */
        getSheetColor(): Color;
        /**
         * Gets the Sheet Shadow Color.
         * @deprecated Use [[SheetManager.getSheetBackgroundColor]] from [[sheetManager]] instead.
         */
        getSheetShadowColor(): Color;
        /**
         * Gets the parameters that were used to initialize this instance of the WebViewer
         * @returns initial creation parameters
         */
        getCreationParameters(): WebViewerConfig;
        /**
         * @param options
         */
        private _setInitialOptions;
        /**
         * @param viewer
         */
        private _initEventDispatcher;
        /**
         * Returns the viewer version string.
         * @returns string containing version information for the viewer.
         */
        getViewerVersionString(): string;
        /**
         * Returns the format version string.
         * @returns string containing version information for the format.
         */
        getFormatVersionString(): string;
        /**
         * @deprecated Use [[view]] instead.
         * Returns the view interface.
         * @returns Interface containing view-related methods.
         */
        getView(): View;
        /**
         * @deprecated Use [[model]] instead.
         * Returns the model interface.
         * @returns Interface containing model-related methods.
         */
        getModel(): Model;
        /**
         * @deprecated Use [[overlayManager]] instead.
         * Returns the overlay interface.
         * @returns Interface containting overlay-related methods
         */
        getOverlayManager(): OverlayManager;
        /**
         * @deprecated Use [[measureManager]] instead.
         * Returns the Measure interface.
         * @returns Interface containing measure-related methods.
         */
        getMeasureManager(): MeasureManager;
        /**
         * @deprecated Use [[lineManager]] instead.
         * Returns the Line interface.
         * @returns Interface containing line-related methods.
         */
        getLineManager(): LineManager;
        /**
         * @deprecated Use [[cuttingManager]] instead.
         * Returns the CuttingManager interface which contains methods for creating and interacting with cutting planes and sections.
         * @returns Interface containing cutting-related methods.
         */
        getCuttingManager(): CuttingManager;
        /**
         * @deprecated Use [[markupManager]] instead.
         * Returns the markup interface.
         * @returns Interface containing markup-related methods.
         */
        getMarkupManager(): MarkupManager;
        /**
         * @deprecated Use [[selectionManager]] instead.
         * Returns the selection interface
         * @returns Interface containing selection-related methods.
         */
        getSelectionManager(): SelectionManager;
        /**
         * @deprecated Use [[explodeManager]] instead.
         * Returns the model explode interface.
         * @returns Interface containing model explode-related functionality
         */
        getExplodeManager(): ExplodeManager;
        /**
         * @deprecated Use [[operatorManager]] instead.
         */
        getOperatorManager(): OperatorManager;
        /**
         * @hidden
         * @deprecated Use [[noteTextManager]] instead.
         * The note text manager is currently in the internal namespace.
         * This is a public function so the selection operator can access the NoteTextManager
         */
        _getNoteTextManager(): Markup.Note.NoteTextManager;
        /**
         * Starts the viewer and begins the loading process
         */
        start(): boolean;
        /**
         * Associates a custom operator object with a system generated operatorId.
         * @param operatorId the ID of the operator that is to be unregistered
         * @returns an operatorId to be used for this operator.
         */
        registerCustomOperator(operator: Operator.Operator): OperatorId;
        /**
         * Removes a previously registered custom operator from the system.
         * @param operatorId the ID of the operator that is to be unregistered
         */
        unregisterCustomOperator(operatorId: OperatorId): void;
        /**
         * Sets whether keyboard input should be directed to this Web Viewer.
         * @param focus if true, the Web Viewer will be focused and accept keyboard input, otherwise it will be blurred and not accept keyboard input
         */
        focusInput(focus: boolean): void;
        /**
         * Registers callbacks that will be called when their corresponding events occur.
         * @param callbacks object with property names set to corresponding functions to be called when the event occurs.
         */
        setCallbacks(callbacks: CallbackMap): void;
        /**
         * Unregisters callbacks from the system. Note the actual function object passed in must be the same as the one that was registered using setCallbacks.
         * @param callbacks object with property names set to corresponding functions to be unregistered.
         */
        unsetCallbacks(callbacks: CallbackMap): void;
        /**
         * This method should be called after the container element is moved or resized.
         */
        resizeCanvas(): void;
        /**
         * This method should be called when the viewer is being moved to a new window. An example use case would be opening a new pop up window.
         * @param win the new document that this viewer will be associated with.
         */
        moveToWindow(win: Window): void;
        /**
         * Forces the viewer to perform a full redraw.
         * @param callback A function to be called once the draw is complete.
         * This is provided instead of a `Promise` to ensure the callback is
         * called before the start of another redraw.
         */
        redraw(callback?: () => void): void;
        /**
         * Selects a part with the given Id.
         * @param nodeId nodeId of the part to select. Pass null to clear the selection.
         */
        selectPart(nodeId: PartId | null, selectionMode?: SelectionMode): SelectionType;
        trigger(name: "bcfLoaded", id: number, filename: BCFName): void;
        trigger(name: "bcfRemoved", id: number): void;
        trigger(name: "handleEvent", eventType: HandleEventType, nodeIds: NodeId[], initialMatrices: Matrix[], newMatrices: Matrix[]): void;
        trigger(name: "handleEventEnd", eventType: HandleEventType, nodeIds: NodeId[], initialMatrices: Matrix[], newMatrices: Matrix[]): void;
        trigger(name: "handleEventStart", eventType: HandleEventType, nodeIds: NodeId[], initialMatrices: Matrix[]): void;
        trigger(name: "cuttingPlaneDragStart", cuttingSection: CuttingSection, planeIndex: number): void;
        trigger(name: "cuttingPlaneDrag", cuttingSection: CuttingSection, planeIndex: number): void;
        trigger(name: "cuttingPlaneDragEnd", cuttingSection: CuttingSection, planeIndex: number): void;
        trigger(name: "cuttingSectionsLoaded"): void;
        trigger(name: "redlineCreated", redlineMarkup: Markup.Redline.RedlineItem): void;
        trigger(name: "redlineDeleted", redlineMarkup: Markup.Redline.RedlineItem): void;
        trigger(name: "redlineUpdated", redlineMarkup: Markup.Redline.RedlineItem): void;
        trigger(name: "measurementBegin"): void;
        trigger(name: "measurementCreated", measurement: Markup.Measure.MeasureMarkup): void;
        trigger(name: "measurementDeleted", measurement: Markup.Measure.MeasureMarkup): void;
        trigger(name: "measurementValueSet", measurement: Markup.Measure.MeasureMarkup): void;
        trigger(name: "measurementShown", measurement: Markup.Measure.MeasureMarkup): void;
        trigger(name: "measurementHidden", measurement: Markup.Measure.MeasureMarkup): void;
        trigger(name: "noteTextCreated", noteText: Markup.Note.NoteText): void;
        trigger(name: "noteTextHidden", noteText: Markup.Note.NoteText): void;
        trigger(name: "noteTextShown", noteText: Markup.Note.NoteText): void;
        trigger(name: "walkOperatorActivated"): void;
        trigger(name: "walkOperatorDeactivated"): void;
        trigger(name: "viewCreated", view: Markup.MarkupView): void;
        trigger(name: "viewDeleted", view: Markup.MarkupView): void;
        trigger(name: "viewLoaded", view: Markup.MarkupView): void;
        trigger(name: "contextMenu", position: Point2, modifiers: KeyModifiers): void;
        trigger(name: "beginInteraction"): void;
        trigger(name: "endInteraction"): void;
        /**
         * Triggers a web viewer event
         * @param eventName the name of the event to trigger
         * @param args, arguments to be passed to callback functions
         * @deprecated Use [[trigger]] instead
         */
        triggerEvent(eventName: string, args?: any[]): void;
        /** @hidden */
        _getCallbackManager(): Internal.CallbackManager;
        /** @hidden */
        _setStreamIdleMarker(): Promise<void>;
        /**
         * Gets viewer statistics for the current rendered frame. Statistics marked with a (*) below must be calculated and will not be included in the results unless the calculateTotals parameter is true.
         * The values of these items will be cached and only updated during the next call to this method with calculateTotals set to true.
         * @param calculateTotals Forces an update of the total count elements. Please note that repeatedly calculating these items can cause a performance impact.
         * @returns an object containing informational key/value pairs
         *
         * | Statistic Name| Description                                          |
         * | ----------------------- | -----------------------------------------------------|
         * | draw_call_count  | number of draw calls made when rendering the frame             |
         * | frames_per_second  | frames per second estimation    |
         * | triangle_count  | the number of triangles rendered    |
         * | line_segment_count  | the number of line segments rendered    |
         * | point_count  | the number of points rendered    |
         * | total_element_count(*)  | the total number of elements in the scene    |
         * | total_triangle_count(*)  | the total number of triangles in the scene   |
         *
         */
        getStatistics(calculateTotals?: boolean): Promise<Object>;
        /**
         * Sets a minimum frame rate that will be maintained by the viewer.
         * The viewer will use various culling techniques in order to maintain the value passed in.
         *
         * Passing `0` will cause the entire scene to be drawn for every frame.
         * @param value The frame rate for the viewer to maintain.
         * @returns Promise that is resolved when the operation has completed.
         */
        setMinimumFramerate(value: number): DeprecatedPromise;
        private _setMinimumFramerate;
        /**
         * Gets the minimum framerate that will be maintained by the viewer. The viewer will use various culling techniques in order to maintain the value returned.
         * @returns Promise that is resolved when the operation has completed.
         */
        getMinimumFramerate(): Promise<number>;
        /**
         * Sets the image quality settings for the high quality and low quality server side render. The low quality settings will be applied during model interaction (camera changes, selection, etc)
         * @param jpegQualityLow The JPEG quality of the low quality render frame
         * @param jpegQualityHigh The JPEG quality of the high quality render frame
         * @param scaleLow The scale factor for the low quality render frame
         * @param scaleHigh The scale factor for the high quality render frame
         */
        setServerRenderQuality(jpegQualityLow: number, jpegQualityHigh: number, scaleLow: number, scaleHigh: number): void;
        /**
         * Gets the streaming mode this viewer was created with.
         * @returns the streaming mode.
         */
        getStreamingMode(): StreamingMode;
        /**
         * Gets the RendererType this viewer was created with.
         * @returns the render mode.
         */
        getRendererType(): RendererType;
        /**
         * Gets the view element for this viewer. This element contains the canvas
         * @returns the view element
         */
        getViewElement(): HTMLDivElement;
        /**
         * Releases the resources used by the viewer. This method should be called when the viewer is no longer needed but the page is not being reloaded.
         */
        shutdown(): void;
        /**
         * Sets the parameters for client driven timeout monitoring.
         * If no input is recorded for the the duration, the viewer will disconnect and free server resources.
         * Calling this method will reset any pending timeout duration.
         * No timeout will occur when viewing SCS Files.
         * The default value is to disconnect after 15 minutes, with a warning issued after 14 minutes of inactivity.
         * <br><br> <strong>Please note:</strong> Both parameters are required.
         * @param timeoutDuration the total time in minutes of inactivity that is allowed before a timeout event occurs
         * @param warningTime the number of minutes before issuing a timeoutWarning event
         * @returns boolean value indicating whether the timeout values were sucessfully updated
         */
        setClientTimeout(timeoutDuration: number, warningTime: number): boolean;
        /**
         * Resets the client timeout to the duration set with setClientTimeout.
         */
        resetClientTimeout(): void;
        /**
         * Pauses rendering updates for the viewer. This function is useful when
         * performing large batches of updates and you would like the result
         * to appear all at once.
         *
         * @param callback If provided, rendering will be paused, the callback
         * will be called, and then rendering will be resumed once the callback
         * returns or throws an exception.
         */
        pauseRendering(callback?: () => void): DeprecatedPromise;
        private _pauseRendering;
        /**
         * Resumes rendering in the viewer.
         */
        resumeRendering(): DeprecatedPromise;
        private _resumeRendering;
        /**
         * Delays capping processing by a fixed time interval.
         */
        delayCapping(): void;
        /**
         * Reset the camera, visibility, and transforms to their default state
         * @param duration the amount of time in milliseconds that the camera transition between the current and initial view should take.
         * @returns Promise that resolves when the operation has completed.
         */
        reset(durationCameraTransition?: number): Promise<void>;
        /**
         * Disconnects the network connection when in CSR mode.
         */
        closeConnection(): void;
        /**
         * Controls rendering on high DPI displays. If true, the image will be rendered at full resolution when a high-DPI display is detected. If false, the image may be rendered at a lower resolution. The default value is false.
         * This method may be called any time during or after the sceneReady callback has triggered.
         * @param allow controls the high DPI Setting.
         */
        setAllowHighDpi(allow: boolean): void;
        /** @deprecated Use [[setAllowHighDpi]] instead. */
        setAllowHighDPI(allow: boolean): void;
        /**
         * Gets the current value for high DPI rendering
         * @returns current high DPI setting
         */
        getAllowHighDpi(): boolean;
        /** @deprecated Use [[getAllowHighDpi]] instead. */
        getAllowHighDPI(): boolean;
        /**
         * Creates an Image of the current canvas
         */
        takeSnapshot(config?: SnapshotConfig): Promise<HTMLImageElement>;
        fitWorld(duration?: number): Promise<void>;
        /**
         * Sets the orientation of the current model view.
         * @param orientation a [[ViewOrientation]] object specifying back, front, top, etc.
         * @param duration the time in milliseconds for the model to transition to the new view orientation.
         */
        setViewOrientation(orientation: ViewOrientation, duration?: number): Promise<void>;
        private _applyMetallicRoughnessDefaults;
        private _scEngineReady;
        private _sceneReady;
        private _seenPriorityMetaDataSent;
        private _priorityMetaDataSent;
        private _renderComplete;
        private _streamingActivated;
        private _streamingDeactivated;
        /**
         * Specifies a scale factor that will be applied to the streaming size cutoff.
         * An object whose projected size is lower than the cutoff will not be streamed
         * until its projected size reaches the cutoff.
         *
         * This value may also be set for file-based sessions.  In that case, when loading
         * an SCS file based assembly via XML, projected size will be calculated on a
         * per-file basis using the bounding information provided in the XML.
         * For additional information, refer to [[Model.loadSubtreeFromXmlBuffer]].
         *
         * A value of 0 will disable the cutoff.  The value should be in the interval of [0.0, 2.0].
         */
        setStreamCutoffScale(value: number): DeprecatedPromise;
        private _setStreamCutoffScale;
        /**
         * Returns the scale factor that will be applied to the streaming size cutoff.
         * An object whose projected size is lower than the cutoff will not be streamed
         * until its projected size reaches the cutoff. A value of 0 disables the cutoff.
         */
        getStreamCutoffScale(): number;
        /** @hidden */
        _loseWebGlContext(): boolean;
        /** @hidden */
        _getScEngine(): Internal.ScEngine;
        /** @hidden */
        _debug_log(message: string): Promise<void>;
        /** @hidden */
        _debug_stateFailure(value: SC.StateFailure): Promise<void>;
        /** @hidden */
        _debug_sync(): Promise<void>;
        /**
         * Exports the current scene to a two-dimensional SVG representation.
         *
         * @param config Allows customization of the resultant SVG.
         * @return A promise that resolves to the created SVG string.
         */
        exportToSvg(config?: SvgConfig): Promise<string>;
        /**
         * Returns a Promise that will resolve after streaming and associated
         * asynchronous operations complete and the scene is fully drawn.
         */
        waitForIdle(config?: {
            /** If `false`, do not wait for rendering to finish. */
            redraw?: boolean;
        }): Promise<void>;
        /**
         * Enables a visual comparison of two drawing sheets. The nodes specified
         * by `sheetId1` are filled with one color, the nodes specified by
         * `sheetId2` with another color, and overlapping areas are filled
         * with a third color.
         *
         * See [[endSheetComparison]], [[View.startComparison]].
         *
         * @param sheetId1 the drawing sheet to compare against `sheetId2`
         * @param sheetId2 the drawing sheet to compare against `sheetId1`
         * @param config settings controlling the behavior of the comparison
         * @deprecated Use [[SheetManager.startComparison]] from [[sheetManager]] instead.
         */
        startSheetComparison(sheetId1: SheetId, sheetId2: SheetId, config?: ComparisonConfig): Promise<void>;
        /**
         * Disables a visual comparison of two drawing sheets enabled by
         * [[startSheetComparison]]. The `Promise` returned by that function
         * should be waited upon before calling [[endSheetComparison]].
         * @deprecated Use [[SheetManager.endComparison]] from [[sheetManager]] instead.
         */
        endSheetComparison(): Promise<void>;
    }
}
declare namespace Communicator.Util {
    /**
     * Creates a basic sphere with normals.
     */
    function generateSphereMeshData(): MeshData;
    /**
     * Creates a cylinder with an attached cone.  An example of the resulting geometry can be observed in the default Axis Triad or Handles implementation.
     * @param cylinderRadius the radius of the cylinder portion of the geometry.
     * @param numSegments the number of segments used to create the cylinder and cone portions.  Increasing this number will result in a smoother appearance but consume more memory.
     * @param stemHeight the height of the cone portion.
     * @param coneBaseRadius the radius of the cone portion
     * @param capHeight the height of the cylinder cap
     * @param taperHeight the height of the taper.
     */
    function generateConeCylinderMeshData(cylinderRadius: number, numSegments: number, stemHeight: number, coneBaseRadius: number, capHeight: number, taperHeight: number): MeshData;
    /**
     * Creates a cylinder that is deformed by an arc.  An example of the resulting geometry can be observed in the Handles implementation.
     * @param arc an array of numbers describing points on an arc that will be used to deform the cylinder
     * @param axisDirection cylinder axis.
     * @param numSegments the number of segments to use when constructing the cylinder.  A higher number will give a smoother appearance but consume more memory.
     * @param scale a scaling factor to apply to the geometry.
     */
    function createCylinderMeshDataFromArc(arc: number[], axisDirection: Point3, numSegments: number, scale: number): MeshData;
}
declare namespace Communicator.Util {
    /**
     * This class is a high-level wrapper over the various incremental selection operations that can be performed.
     *
     * See also:
     *
     * [[SelectionManager.prototype.beginScreenSelectByArea]]
     * [[SelectionManager.prototype.beginRayDrillSelection]]
     * [[SelectionManager.prototype.beginConvexPolyhedronSelection]]
     * [[SelectionManager.prototype.beginSphereSelection]]
     * [[SelectionManager.prototype.advanceIncrementalSelection]]
     * [[SelectionManager.prototype.endIncrementalSelection]]
     *
     * [[View.prototype.beginScreenSelectByArea]]
     * [[View.prototype.beginRayDrillSelection]]
     * [[View.prototype.beginConvexPolyhedronSelection]]
     * [[View.prototype.beginSphereSelection]]
     * [[View.prototype.advanceIncrementalSelection]]
     * [[View.prototype.endIncrementalSelection]]
     */
    class IncrementalSelection<M extends IncrementalSelection.Mode> {
        private readonly _impl;
        private readonly _mode;
        private constructor();
        /**
         * Creates a new `IncrementalSelection` object that can be used to perform incremental selections.
         *
         * @param mode Controls whether or not selections are performed using the [[View]] or the [[SelectionManager]].
         * @param viewer The `WebViewer` of the scene.
         * @param createSelectionPredicate This callback is used to create a selection predicate. Return null to not filter selection results.
         * @returns The created `IncrementalSelection` object.
         */
        static create<M extends IncrementalSelection.Mode>(mode: M, viewer: WebViewer): IncrementalSelection<M>;
        /**
         * Perform an incremental selection using the [[SelectionManager]].
         *
         * Selected objects will incrementally be added to the `SelectionManager`
         * as the incremental selection progresses.
         *
         * @returns A Promise that resolves when the selection has completed.
         */
        performSelection(this: IncrementalSelection<"SelectionManager">, beginConfig: IncrementalSelection.BeginConfig, predicate?: IncrementalSelection.Predicate | null): Promise<void>;
        /**
         * Perform an incremental selection using the [[View]].
         *
         * @returns A Promise of all selected items when selection has completed.
         */
        performSelection(this: IncrementalSelection<"View">, beginConfig: IncrementalSelection.BeginConfig, predicate?: IncrementalSelection.Predicate | null): Promise<Selection.NodeSelectionItem[]>;
        /**
         * Perform an incremental selection using the [[View]].
         *
         * Selected objects will incrementally be added to the
         * `outItems` argument as the incremental selection progresses.
         *
         * @returns A Promise that resolves to `outItems` when selection has completed.
         */
        performSelection(this: IncrementalSelection<"View">, beginConfig: IncrementalSelection.BeginConfig, predicate: IncrementalSelection.Predicate | null | undefined, outItems: Selection.NodeSelectionItem[]): Promise<Selection.NodeSelectionItem[]>;
        performSelection(this: IncrementalSelection<IncrementalSelection.Mode>, beginConfig: IncrementalSelection.BeginConfig, predicate?: IncrementalSelection.Predicate | null): Promise<void | Selection.NodeSelectionItem[]>;
        /**
         * Returns whether or not this object has an active selection in progress.
         * @returns `true` if active and `false` if idle.
         */
        isIdle(): boolean;
        /**
         * Used to wait for this object to become idle.
         * @returns A promise that resolves when this becomes idle.
         */
        waitForIdle(): Promise<void>;
        /**
         * Stops the selection.
         * @returns A `Promise` that resolves when completed.
         */
        stopSelection(): Promise<void>;
        /**
         * Stops and clears the selection.
         * @returns A `Promise` that resolves when completed.
         */
        clearSelection(this: IncrementalSelection<"SelectionManager">): Promise<void>;
    }
    namespace IncrementalSelection {
        /**
         * Type used for a selection predicate.
         * The predicate is used to filter selection items.
         */
        type Predicate = (item: Selection.NodeSelectionItem) => Promise<boolean>;
        /**
         * Determines whether or not selections are performed using the [[View]] or the [[SelectionManager]].
         */
        type Mode = "View" | "SelectionManager";
        /**
         * Configuration object detailing how an incremental selection begins.
         */
        type BeginConfig = ScreenByAreaConfig | RayDrillConfig | ConvexPolyhedronConfig | SphereConfig;
        /**
         * Configuration object detailing how a screen by area selection begins.
         */
        interface ScreenByAreaConfig {
            /** The configuration object used for this selection operation. */
            pickConfig: IncrementalPickConfig;
            /** The minimum coodinate in CSS pixel space for the selection window. */
            areaCssMin: Point2;
            /** The maximum coodinate in CSS pixel space for the selection window. */
            areaCssMax: Point2;
        }
        /**
         * Determines if the input `BeginConfig` is a `ScreenByAreaConfig`.
         * @param config The config to test.
         * @returns `true` if `config` is a `ScreenByAreaConfig` and `false` otherwise.
         */
        function isScreenByAreaConfig(config: BeginConfig): config is ScreenByAreaConfig;
        /**
         * Configuration object detailing how a ray drll selection begins.
         */
        interface RayDrillConfig {
            /** The configuration object used for this selection operation. */
            pickConfig: IncrementalPickConfig;
            /** The coodinate in CSS pixel space for the selection ray's origin. */
            rayCssOrigin: Point2;
            /** The radius around the ray in CSS pixel space used for line and point selection proximity. */
            rayCssBoxRadius: number;
        }
        /**
         * Determines if the input `BeginConfig` is a `RayDrillConfig`.
         * @param config The config to test.
         * @returns `true` if `config` is a `RayDrillConfig` and `false` otherwise.
         */
        function isRayDrillConfig(config: BeginConfig): config is RayDrillConfig;
        /**
         * Configuration object detailing how a convex polyhedron selection begins.
         */
        interface ConvexPolyhedronConfig {
            /** The configuration object used for this selection operation. */
            pickConfig: IncrementalPickConfig;
            /** The planes used to define volume. A point p is inside the volume if and only if (plane.determineSide(p) == true) for all supplied planes. */
            volumePlanes: Plane[];
            /** A point used to compute distances against for prioritizing returned results. This is typically (but not necessarily) the center of the volume. */
            heuristicOrigin: Point3;
        }
        /**
         * Determines if the input `BeginConfig` is a `ConvexPolyhedronConfig`.
         * @param config The config to test.
         * @returns `true` if `config` is a `ConvexPolyhedronConfig` and `false` otherwise.
         */
        function isConvexPolyhedronConfig(config: BeginConfig): config is ConvexPolyhedronConfig;
        /**
         * Configuration object detailing how a sphere selection begins.
         */
        interface SphereConfig {
            /** The configuration object used for this selection operation. */
            pickConfig: IncrementalPickConfig;
            /** The center of the selection sphere. */
            sphereCenter: Point3;
            /** The radius of the selection sphere. */
            sphereRadius: number;
        }
        /**
         * Determines if the input `BeginConfig` is a `SphereConfig`.
         * @param config The config to test.
         * @returns `true` if `config` is a `SphereConfig` and `false` otherwise.
         */
        function isSphereConfig(config: BeginConfig): config is SphereConfig;
    }
}
declare namespace Communicator.Internal {
    type SelectionDriver = View | SelectionManager;
    class IncrementalSelectionImpl {
        readonly viewer: WebViewer;
        private readonly _killHandles;
        private _activeSelectionCount;
        private _inactivityPromise;
        constructor(viewer: WebViewer);
        isIdle(): boolean;
        waitForIdle(): Promise<void>;
        stopSelection(): Promise<void>;
        clearSelection(): Promise<void>;
        private _advanceBySelectionManager;
        private _advanceByView;
        private _wrapBeginSelection;
        performSelection(driver: SelectionDriver, beginConfig: Util.IncrementalSelection.BeginConfig, predicate: Util.IncrementalSelection.Predicate | null, outItems: Selection.NodeSelectionItem[] | undefined): Promise<void | Selection.NodeSelectionItem[]>;
        private _performSelection;
    }
}
declare namespace Communicator.Internal {
    class ScMatrixCache {
        private readonly _engine;
        private _identityInc;
        constructor(engine: ScEngine);
        getIdentityInc(): SC.MatrixInc;
        init(): Promise<void>;
    }
}
declare namespace Communicator.Internal {
    enum AdvanceSelectionCapacity {
        Batch = 5000,
        Chunk = 500
    }
    const enum ScSelectionBits {
        SelectionBitsFaceHasMeasurementData = 1,
        SelectionBitsFacePlanar = 2,
        SelectionBitsEdgeHasMeasurementData = 4
    }
    class ScSelectionManager {
        private readonly _sc;
        private _pickTolerance;
        private readonly _incrementalChunkedItems;
        constructor(sc: SC.Instance);
        setPickTolerance(tolerance: number): void;
        getPickTolerance(): number;
        beginScreenAreaSelection(areaCssMin: Point2, areaCssMax: Point2, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        beginRayDrillSelection(rayCssOrigin: Point2, rayCssBoxRadius: number, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        beginConvexPolyhedronSelection(volumePlanes: Plane[], heuristicOrigin: Point3, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        beginSphereSelection(sphereCenter: SC.Point3, sphereRadius: number, config: IncrementalPickConfig): Promise<Selection.IncrementalSelectionId>;
        endIncrementalSelection(handle: Selection.IncrementalSelectionId): void;
        advanceIncrementalSelection(handle: Selection.IncrementalSelectionId, allowForStreamIdle: boolean): Promise<Selection.SelectionItem[] | null>;
        private _screenSelectByRay;
        private _worldSelectByRay;
        pickFromScreen(point: Point2, config: PickConfig, isDrawing: boolean): Promise<Selection.NodeEntitySelectionItem | null>;
        pickAllFromScreen(point: Point2, config: PickConfig, isDrawing: boolean): Promise<Selection.NodeEntitySelectionItem[]>;
        compositePickFromScreen(point: Point2, config: PickConfig, isDrawing: boolean): Promise<Selection.CompositeSelectionItem>;
        pickFromRay(ray: Ray, config: PickConfig): Promise<Selection.NodeEntitySelectionItem | null>;
        pickAllFromRay(ray: Ray, config: PickConfig): Promise<Selection.NodeEntitySelectionItem[]>;
        pickCompositeFromRay(ray: Ray, config: PickConfig): Promise<Selection.CompositeSelectionItem>;
    }
}
declare namespace Communicator.Internal.Test {
    const AdvanceSelectionCapacity: typeof Internal.AdvanceSelectionCapacity;
}
declare namespace Communicator.Internal {
    function toScRay(ray: Ray): SC.Ray;
    function makeFaceFaceDistanceItem(f: SC.FaceFaceDistanceObject): FaceFaceDistanceItem;
}
declare namespace Communicator.Internal {
    type ExchangeId = "(ExchangeId)";
    type FilterName = "(FilterName)";
    type GenericId = "(GenericId)";
    type GenericType = "(GenericType)";
    type LayerName = "(LayerName)";
}
declare namespace Communicator {
    interface Attribute {
        getType(): AttributeType;
        getTitle(): string;
        getValue(): string;
        copy(): Attribute;
    }
    /**
     * Properties returned from Model's `getEdgeAttributes` and `getFaceAttributes` methods.
     */
    class SubentityAttributes {
        constructor(attributes: Attribute[]);
        copy(): SubentityAttributes;
        attributes: Attribute[];
    }
}
declare namespace Communicator.Internal.Tree.MeasurementProperty {
    function isFace(prop: SubentityProperties.Base): prop is SubentityProperties.Face;
    function isEdge(prop: SubentityProperties.Base): prop is SubentityProperties.Edge;
}
declare namespace Communicator.Internal.Tree.MeasurementProperty.Face {
    function parseBinary(parser: AssemblyDataParser): SubentityProperties.Face;
    class Cylinder {
        static parseBinary(parser: AssemblyDataParser): SubentityProperties.CylinderElement;
    }
    class Plane {
        static parseBinary(parser: AssemblyDataParser): SubentityProperties.PlaneElement;
    }
    class Cone {
        static parseBinary(parser: AssemblyDataParser): SubentityProperties.ConeElement;
    }
    class Sphere {
        static parseBinary(parser: AssemblyDataParser): SubentityProperties.SphereElement;
    }
    class Torus {
        static parseBinary(parser: AssemblyDataParser): SubentityProperties.TorusElement;
    }
    class Other {
        static parseBinary(_parser: AssemblyDataParser): SubentityProperties.OtherFaceElement;
    }
    class Blend01 {
        static parseBinary(_parser: AssemblyDataParser): SubentityProperties.Blend01Element;
    }
    class Blend02 {
        static parseBinary(_parser: AssemblyDataParser): SubentityProperties.Blend02Element;
    }
    class Blend03 {
        static parseBinary(_parser: AssemblyDataParser): SubentityProperties.Blend03Element;
    }
    class Nurbs {
        static parseBinary(_parser: AssemblyDataParser): SubentityProperties.NurbsElement;
    }
    class Cylindrical {
        static parseBinary(_parser: AssemblyDataParser): SubentityProperties.CylindricalElement;
    }
    class Offset {
        static parseBinary(_parser: AssemblyDataParser): SubentityProperties.OffsetElement;
    }
    class Pipe {
        static parseBinary(_parser: AssemblyDataParser): SubentityProperties.PipeElement;
    }
    class Ruled {
        static parseBinary(_parser: AssemblyDataParser): SubentityProperties.RuledElement;
    }
    class Revolution {
        static parseBinary(_parser: AssemblyDataParser): SubentityProperties.RevolutionElement;
    }
    class Extrusion {
        static parseBinary(_parser: AssemblyDataParser): SubentityProperties.ExtrusionElement;
    }
    class FromCurves {
        static parseBinary(_parser: AssemblyDataParser): SubentityProperties.FromCurvesElement;
    }
    class Transform {
        static parseBinary(_parser: AssemblyDataParser): SubentityProperties.TransformElement;
    }
}
declare namespace Communicator.Internal.Tree.MeasurementProperty.Edge {
    function parseBinary(parser: AssemblyDataParser): SubentityProperties.Edge;
    class Line {
        static parseBinary(parser: AssemblyDataParser): SubentityProperties.LineElement;
    }
    class Circle {
        static parseBinary(parser: AssemblyDataParser): SubentityProperties.CircleElement;
    }
    class Other {
        static parseBinary(parser: AssemblyDataParser): SubentityProperties.OtherEdgeElement;
    }
}
/**
 * Properties returned from [[Model.getFaceProperty]] and [[Model.getEdgeProperty]].
 */
declare namespace Communicator.SubentityProperties {
    /**
     * Represents any Edge or Face subentity property.
     */
    type Base = Edge | Face;
    /**
     * Represents any Edge subentity property.
     */
    type Edge = LineElement | CircleElement | OtherEdgeElement;
    /**
     * Represents any Face subentity property.
     */
    type Face = CylinderElement | PlaneElement | ConeElement | SphereElement | TorusElement | Blend01Element | Blend02Element | Blend03Element | NurbsElement | CylindricalElement | OffsetElement | PipeElement | RuledElement | RevolutionElement | ExtrusionElement | FromCurvesElement | TransformElement | OtherFaceElement;
    /**
     * The edge type of an `Edge` property.
     */
    enum EdgeType {
        Undefined = 0,
        Line = 1,
        Circle = 2,
        Other = 6
    }
    /**
     * The face type of an `Face` property.
     */
    enum FaceType {
        Undefined = 0,
        Cylinder = 3,
        Plane = 4,
        Cone = 5,
        Other = 6,
        Sphere = 7,
        Torus = 8,
        Blend01 = 9,
        Blend02 = 10,
        Blend03 = 11,
        Nurbs = 12,
        Cylindrical = 13,
        Offset = 14,
        Pipe = 15,
        Ruled = 16,
        Revolution = 17,
        Extrusion = 18,
        FromCurves = 19,
        Transform = 20
    }
    /**
     * Returned by [[Model.getEdgeProperty]] when the requested edge is a segment.
     */
    class LineElement {
        constructor(length: number);
        copy(): LineElement;
        type(): EdgeType;
        protected readonly __LineElement: Internal.PhantomMember;
        length: number;
    }
    /**
     * Returned by [[Model.getEdgeProperty]] when the requested edge is an arc.
     */
    class CircleElement {
        constructor(radius: number, origin: Point3, normal: Point3);
        copy(): CircleElement;
        type(): EdgeType;
        protected readonly __CircleElement: Internal.PhantomMember;
        radius: number;
        origin: Point3;
        normal: Point3;
    }
    /**
     * @deprecated
     * Use [[OtherEdgeElement]] instead.
     */
    type OtherElement = OtherEdgeElement;
    /**
     * Returned by [[Model.getEdgeProperty]] when the requested edge fits neither a segment nor a circle arc.
     */
    class OtherEdgeElement {
        constructor(length: number);
        copy(): OtherEdgeElement;
        type(): EdgeType;
        protected readonly __OtherEdgeElement: Internal.PhantomMember;
        length: number;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits no other face type.
     */
    class OtherFaceElement {
        copy(): OtherFaceElement;
        type(): FaceType;
        protected readonly __OtherFaceElement: Internal.PhantomMember;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a cylinder.
     */
    class CylinderElement {
        constructor(radius: number, origin: Point3, normal: Point3);
        copy(): CylinderElement;
        type(): FaceType;
        protected readonly __CylinderElement: Internal.PhantomMember;
        radius: number;
        origin: Point3;
        normal: Point3;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a plane.
     */
    class PlaneElement {
        constructor(origin: Point3, normal: Point3);
        copy(): PlaneElement;
        type(): FaceType;
        protected readonly __PlaneElement: Internal.PhantomMember;
        origin: Point3;
        normal: Point3;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a cone.
     */
    class ConeElement {
        constructor(radius: number, origin: Point3, normal: Point3, halfAngle: number);
        copy(): ConeElement;
        type(): FaceType;
        protected readonly __ConeElement: Internal.PhantomMember;
        radius: number;
        origin: Point3;
        normal: Point3;
        halfAngle: number;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a sphere.
     */
    class SphereElement {
        constructor(radius: number, origin: Point3, normal: Point3);
        copy(): SphereElement;
        type(): FaceType;
        protected readonly __SphereElement: Internal.PhantomMember;
        radius: number;
        origin: Point3;
        normal: Point3;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a torus.
     */
    class TorusElement {
        constructor(majorRadius: number, minorRadius: number, origin: Point3, normal: Point3);
        copy(): TorusElement;
        type(): FaceType;
        protected readonly __TorusElement: Internal.PhantomMember;
        majorRadius: number;
        minorRadius: number;
        origin: Point3;
        normal: Point3;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a Blend01.
     */
    class Blend01Element {
        copy(): Blend01Element;
        type(): FaceType;
        protected readonly __Blend01Element: Internal.PhantomMember;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a Blend02.
     */
    class Blend02Element {
        copy(): Blend02Element;
        type(): FaceType;
        protected readonly __Blend02Element: Internal.PhantomMember;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a Blend03.
     */
    class Blend03Element {
        copy(): Blend03Element;
        type(): FaceType;
        protected readonly __Blend03Element: Internal.PhantomMember;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a Nurbs.
     */
    class NurbsElement {
        copy(): NurbsElement;
        type(): FaceType;
        protected readonly __NurbsElement: Internal.PhantomMember;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a Cylindrical.
     */
    class CylindricalElement {
        copy(): CylindricalElement;
        type(): FaceType;
        protected readonly __CylindricalElement: Internal.PhantomMember;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits an Offset.
     */
    class OffsetElement {
        copy(): OffsetElement;
        type(): FaceType;
        protected readonly __OffsetElement: Internal.PhantomMember;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a Pipe.
     */
    class PipeElement {
        copy(): PipeElement;
        type(): FaceType;
        protected readonly __PipeElement: Internal.PhantomMember;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a Ruled.
     */
    class RuledElement {
        copy(): RuledElement;
        type(): FaceType;
        protected readonly __RuledElement: Internal.PhantomMember;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a Revolution.
     */
    class RevolutionElement {
        copy(): RevolutionElement;
        type(): FaceType;
        protected readonly __RevolutionElement: Internal.PhantomMember;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits an Extrusion.
     */
    class ExtrusionElement {
        copy(): ExtrusionElement;
        type(): FaceType;
        protected readonly __ExtrusionElement: Internal.PhantomMember;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a FromCurves.
     */
    class FromCurvesElement {
        copy(): FromCurvesElement;
        type(): FaceType;
        protected readonly __FromCurvesElement: Internal.PhantomMember;
    }
    /**
     * Returned by [[Model.getFaceProperty]] when the requested face fits a Transform.
     */
    class TransformElement {
        copy(): TransformElement;
        type(): FaceType;
        protected readonly __TransformElement: Internal.PhantomMember;
    }
}
declare namespace Communicator {
    /**
     * This contains constants for commonly known GenericType values.
     */
    namespace StaticGenericType {
        const IfcColumn = "IFCCOLUMN";
        const IfcCovering = "IFCCOVERING";
        const IfcCurtainWall = "IFCCURTAINWALL";
        const IfcDoor = "IFCDOOR";
        const IfcRamp = "IFCRAMP";
        const IfcRoof = "IFCROOF";
        const IfcSlab = "IFCSLAB";
        const IfcSpace = "IFCSPACE";
        const IfcStair = "IFCSTAIR";
        const IfcStairFlight = "IFCSTAIRFLIGHT";
        const IfcTransportElement = "IFCTRANSPORTELEMENT";
        const IfcWall = "IFCWALL";
        const IfcWallStandardCase = "IFCWALLSTANDARDCASE";
        const IfcWindow = "IFCWINDOW";
    }
}
declare namespace Communicator.Internal.Tree {
    function hasEffectiveGenericType(startNode: AnyTreeNode, genericType: GenericType): boolean;
    function ifcAttributeToBimMask(value: string): BimMask;
    function registerBimNodes(attributeToMask: (value: string) => BimMask, engine: ScEngine, modelStructure: ModelStructure, startNode: AnyTreeNode, legacy_useAttributeTitle: string | null): Promise<void>;
}
declare namespace Communicator.Internal.Tree {
    interface AbstractScEngine {
        attachModel(attachScope: SC.AttachScope, modelName: ScModelName, inclusionMatrix: SC.Matrix12, parentMeasurementUnit: number, markAllInstancesInvisible: boolean): Promise<void>;
        attachScsBuffer(attachScope: SC.AttachScope, buffer: ScsBuffer | null, inclusionMatrix: SC.Matrix12, parentMeasurementUnit: number, markAllInstancesInvisible: boolean, resolveOnFullyLoaded: boolean): Promise<void>;
        feedScsBuffer(attachScope: SC.AttachScope, buffer: ScsBuffer | null): void;
        attachScsModelByKey(attachScope: SC.AttachScope, modelKey: SC.ModelKey, inclusionMatrix: SC.Matrix12, parentMeasurementUnit: number, markAllInstancesInvisible: boolean): SC.InclusionKey;
        beginRequestBatch(type: RequestBatchType): void;
        createMeshInstance(meshInstanceData: MeshInstanceData): Promise<SC.InstanceInc>;
        endRequestBatch(type: RequestBatchType): void;
        getModelBounding(ignoreInvisible: boolean, includeExcluded: boolean, tightBounding: boolean): Promise<Box>;
        getPartsBounding(incs: SC.InstanceIncs, ignoreInvisible: boolean, tightBounding: boolean): Promise<Box>;
        getRendererType(): RendererType;
        getSessionType(): SC.SessionType;
        instanceKeyInfo(attachScope: SC.AttachScope, by: KeyInfoBy.Attachment, ret: KeyInfoReturn.AllKeys): Promise<Map<SC.ModelKey, SC.InstanceKey[]>>;
        instanceKeyInfo(attachScope: SC.AttachScope, by: KeyInfoBy.Attachment, ret: KeyInfoReturn.KeyCountOnly): Promise<[number]>;
        loadEmpty(): Promise<void>;
        logMessage(message: string): void;
        pauseRendering(): void;
        requestMeshInstances(incs: SC.InstanceIncs): void;
        resetToEmpty(whitelistInstances: SC.InstanceKey[], whitelistMeshes: SC.MeshKey[]): Promise<void>;
        resumeRendering(): void;
        safeGetMetaData(modelKey: SC.ModelKey, dataKey: SC.DataKey): Promise<Uint8Array | null>;
        safeGetMetaDatas(modelKey: SC.ModelKey, dataKeys: SC.DataKey[]): Promise<Uint8Array[] | null>;
        setMatrices(incs: SC.InstanceIncs, matrices: Matrix[]): void;
        setMeshLevel(incs: SC.InstanceIncs, meshLevel: number): void;
        setInstanceModifier(instanceModifier: InstanceModifier, incs: SC.InstanceIncs, modifierValue: boolean): void;
        setPartColor(incs: SC.InstanceIncs, elementType: ElementType, color: Color): void;
        setPartVisibility(incs: SC.InstanceIncs, visible: boolean, onlyDemanded: boolean): void;
        setTimeout(handler: () => void, timeout: number): number;
        setVisibilityByAttachment(attachScope: SC.AttachScope, setVisibility: SC.SetVisibility): void;
        sleep(duration: Milliseconds): Promise<void>;
        synchronizeVisibilities(incs: SC.InstanceIncs, visible: boolean): void;
        throttleLoad(newPauseInterval: Milliseconds, throttleDuration: Milliseconds): void;
        unsetPartColor(incs: SC.InstanceIncs, elementType: ElementType): void;
        getViewMatrix(camera?: Camera): Matrix;
        getProjectionMatrix(camera?: Camera): Matrix;
    }
    interface AbstractView {
        _setCameraPromise(camera: Camera, duration: number): Promise<void>;
        getCamera(): Camera;
        getFullCameraMatrix(): Matrix;
        fitWorld(duration: number, camera?: Camera): Promise<void>;
        isolateNodes(nodeIds: NodeId[], duration: number, fitNodes: boolean, initiallyHiddenStayHidden: boolean | null): Promise<void>;
        setViewOrientation(orientation: ViewOrientation, duration: number, bounding?: Box): Promise<void>;
    }
    interface AbstractModel {
        setViewAxes(frontVector: Point3, upVector: Point3): void;
    }
    interface AbstractCuttingManager {
        getCuttingSection(index: number): AbstractCuttingSection | null;
        clearAllCuttingSections(): Promise<void>;
        getCuttingSectionCount(): number;
        activateCuttingSections(): Promise<void>;
    }
    interface AbstractCuttingSection {
        activate(): Promise<void>;
        addPlane(plane: Plane, referenceGeometry: Point3[] | null): Promise<boolean>;
        clear(): Promise<void>;
    }
}
declare namespace Communicator.Internal.Tree {
    type AssemblyDataHeaderVersion = number;
    class AssemblyDataHeader {
        readonly headerVersion: AssemblyDataHeaderVersion;
        private readonly _rootAssemblyDataKey;
        readonly isDrawing: boolean;
        readonly isMeasurable: boolean;
        readonly originalFileName: string;
        readonly originalFileType: FileType;
        readonly doublePrecisionMatrices: boolean;
        private constructor();
        supportsAttributeBits(): boolean;
        rootAssemblyDataKey(): SC.DataKey;
        /**
         * This mirrors C++ `AssemblyTreeHeader::MaxVersion`.
         */
        private static readonly _maxHeaderVersion;
        static readonly dynamic: AssemblyDataHeader;
        static parseBinary(data: Uint8Array): AssemblyDataHeader | null;
    }
    class AssemblyData {
        constructor(header: AssemblyDataHeader | null, bytes: Uint8Array);
        readonly header: AssemblyDataHeader | null;
        readonly bytes: Uint8Array;
    }
}
declare namespace Communicator.Internal.Tree {
    type LoadId = number;
    interface AssemblyTreeConfig {
        readonly disableAutomaticFitWorld: boolean;
        readonly markImplicitNodesOutOfHierarchy: boolean;
        readonly streamingMode: StreamingMode;
    }
    /**
     * This basically contains 'global' information about the assembly tree.
     */
    class AssemblyTree {
        constructor(config: AssemblyTreeConfig, engine: AbstractScEngine, callbackManager: CallbackManager, cuttingManager: AbstractCuttingManager, view: AbstractView, model: AbstractModel);
        initialize(scAttacher: ScAttacher): void;
        isInitialized(): boolean;
        getRootNode(): ProductOccurrence;
        getAbstractScEngine(): AbstractScEngine;
        generateDynamicNodeId(): DynamicNodeId;
        newNodeIdOffset(): NodeIdOffset;
        /**
         * Please don't use me. This was kept for legacy reasons with Erwan's tree, which
         * had fundamental design problems with NodeIds (because they could conflict).
         */
        getLowestAvailableNodeId(): RuntimeNodeId;
        tryParseHeader(possibleHeaderData: Uint8Array): Promise<AssemblyDataHeader> | null;
        private _isRegistered;
        registerProductOccurrence(node: ProductOccurrence): void;
        lookupProductOccurrence(nodeId: RuntimeNodeId): ProductOccurrence | null;
        registerPmi(node: Pmi): void;
        lookupPmi(nodeId: RuntimeNodeId): Pmi | null;
        registerCadView(node: CadView): void;
        getFirstProductOccurrenceWithView(): ProductOccurrence | null;
        lookupCadView(nodeId: RuntimeNodeId): CadView | null;
        registerBodyInstance(node: BodyInstance): void;
        lookupBodyInstance(nodeId: RuntimeNodeId): BodyInstance | null;
        registerPmiBody(node: PmiBody): void;
        lookupPmiBody(nodeId: RuntimeNodeId): PmiBody | null;
        registerViewFrame(node: ViewFrame): void;
        lookupViewFrame(nodeId: RuntimeNodeId): ViewFrame | null;
        registerPartDefinition(partDef: PartDefinition): void;
        lookupPartDefinition(nodeId: RuntimeNodeId): PartDefinition | null;
        registerRepresentationItem(repItem: RepresentationItem): void;
        lookupRepresentationItem(nodeId: RuntimeNodeId): RepresentationItem | null;
        lookupAnyBody(nodeId: RuntimeNodeId): AnyBody | null;
        lookupAnyTreeNode(nodeId: RuntimeNodeId): AnyTreeNode | null;
        lookupAnyNonTreeNode(nodeId: RuntimeNodeId): AnyNonTreeNode | null;
        lookupAnyNode(nodeId: RuntimeNodeId): AnyNode | null;
        private _registerCadConfiguration;
        getInstanceCountByInclusion(inclusionKey: SC.InclusionKey): number;
        lookupAnyBodyByInstanceInc(inclusionKey: SC.InclusionKey, instanceKey: SC.InstanceKey): AnyBody | null;
        private _registerAnyBodyByInstanceInc;
        private _getInclusionContent;
        private _getModelContent;
        registerPrototypeByDataId(loadContext: LoadContext, modelKey: SC.ModelKey, dataKey: SC.DataKey, prototype: SharedPrototypeContext): void;
        registerPartDefinitionByDataId(loadContext: LoadContext, modelKey: SC.ModelKey, dataKey: SC.DataKey, partDefinition: LazyPromise<PartDefinition>): void;
        lookupPrototypeByDataId(loadContext: LoadContext, modelKey: SC.ModelKey, dataKey: SC.DataKey): SharedPrototypeContext | null;
        lookupPartDefinitionByDataId(loadContext: LoadContext, modelKey: SC.ModelKey, dataKey: SC.DataKey): LazyPromise<PartDefinition> | null;
        registerInclusionContext(context: InclusionContext): void;
        getInclusionContexts(inclusionKey: SC.InclusionKey): InclusionContext[];
        private _createLayer;
        private _updateNameToLayersMap;
        /**
         * Creates a new layer in the assembly tree. Also creates a mapping in the supplied assembly tree from
         * the authored layer id to the effective, runtime, id.
         * @param authoredLayerId The authored ID of the layer. Used to create the mapping in the assembly tree
         * @param layerName Name of the layer
         * @param loadContext Attach context of the node creating the layer. A layer mapping will be created in it
         */
        createLayer(authoredLayerId: AuthoredLayerId, layerName: LayerName | null, loadContext: LoadContext): Layer;
        /**
         * Changes the name of an existing layer.
         * @param layerId Layer id to update
         * @param layerName Name to be set
         */
        updateLayerName(layerId: LayerId, layerName: LayerName): void;
        private _registerNodeInLayer;
        /**
         * Registers a node as part of a layer. This will create a layer if one doesn't exist.
         * @param node Node to be registered
         * @param authoredLayerId Authored id of the Layer
         */
        registerNodeInLayer(node: AnyTreeNode, authoredLayerId: AuthoredLayerId): void;
        /**
         * Registers a tree node as part of a layer. This will create a layer if one doesn't exist.
         * @param node Node to be registered
         * @param authoredLayerId Authored id of the Layer
         */
        registerTreeNodeInLayer(node: AnyTreeNode, authoredLayerId: AuthoredLayerId): void;
        addFilter(filter: Filter, loadContext: LoadContext): void;
        getFilters(): Map<FilterId, FilterName>;
        getFilterName(filterId: FilterId): FilterName | null;
        getFiltersWithNode(targetNode: AnyTreeNode): FilterId[];
        getNodesFromFilterIds(filterIds: FilterId[]): FilteredNodes | null;
        getLayers(): Map<LayerId, LayerName>;
        getUniqueLayerNames(): LayerName[];
        getLayerName(layerId: LayerId): LayerName | null;
        getLayersIdFromName(name: LayerName): LayerId[] | null;
        getNodesFromLayer(layerId: LayerId, onlyTreeNodes?: boolean): AnyTreeNode[] | null;
        getNodesFromLayers(layerIds: LayerId[], onlyTreeNodes?: boolean): AnyTreeNode[] | null;
        getNodesFromLayerName(layerName: LayerName, onlyTreeNodes?: boolean): AnyTreeNode[] | null;
        generateProductName(): string;
        generateGroupName(): string;
        generateDrawingSheetName(): string;
        generateDrawingViewName(): string;
        forEachCadView(callback: (node: CadView) => void): void;
        forEachPmi(callback: (node: Pmi) => void): void;
        forEachCadConfiguration(callback: (node: ProductOccurrence) => void): void;
        hasActiveCadView(): boolean;
        activateCadView(cadView: CadView, duration: number): Promise<void>;
        deactivateActiveCadView(): Promise<void>;
        getDefaultCadView(node: ProductOccurrence | null): CadView | null;
        getCadViewPmis(cadView: CadView): Pmi[];
        isMeasureable(): boolean;
        containsDrawings(): boolean;
        getDefaultCadConfiguration(): ProductOccurrence | null;
        getActiveCadConfiguration(): ProductOccurrence | null;
        activateCadConfiguration(node: ProductOccurrence): Promise<void>;
        massageAuthoredUserId(inclusionContext: InclusionContext, authoredId: AuthoredNodeId | null): AuthoredNodeId | DynamicNodeId;
        createNode(parent: ProductOccurrence, nodeName: string, authoredId: AuthoredNodeId | null, localMatrix: SC.Matrix16 | null, visibility: boolean, measurementUnit?: number | null): ProductOccurrence;
        createPart(authoredNodeId: AuthoredNodeId | null): PartDefinition;
        setPart(referrer: ProductOccurrence, partDef: PartDefinition): void;
        private _createCadView;
        private _createCadViewInstance;
        createCadView(engine: AbstractScEngine, parent: CadViewParent, name: string, camera: Camera, pmis: Pmi[], productOccurrencesToShow: RuntimeNodeId[], productOccurrencesToHide: RuntimeNodeId[], transformMap: Map<RuntimeNodeId, SC.Matrix16>, cuttingPlane: Plane | null, meshInstanceData: MeshInstanceData | null): CadView;
        createMeshInstance(markLoaded: boolean, inclusionKey: SC.InclusionKey, instanceKey: SC.InstanceKey, authoredId: AuthoredNodeId | null, name: string | null, parent: ProductOccurrence, preventFromResetting: boolean, isOutOfHierarchy: boolean, implicitBody: boolean): BodyInstance;
        createPmiInstance(inclusionKey: SC.InclusionKey, instanceKey: SC.InstanceKey, authoredId: AuthoredNodeId | null, name: string | null, parent: ProductOccurrence, pmiType: PmiType, pmiSubType: PmiSubType, topoRefs: ReferenceOnTopology[]): Pmi;
        getRelationshipsOfItem(contextNodeId: RuntimeNodeId, node: BimId): Map<RelationshipType, BimRelationship>;
        getAutomaticMeasurementUnitScaling(): boolean;
        setAutomaticMeasurementUnitScaling(value: boolean): void;
        getInitiallyHiddenStayHidden(): boolean;
        setInitiallyHiddenStayHidden(value: boolean): void;
        private _removeIdMappingsRecursive;
        deleteNode(node: ProductOccurrence | BodyInstance): Promise<void>;
        private _canDeleteNode;
        allowNodeDeletion(node: ProductOccurrence | BodyInstance | InclusionContext | AttachContext | LoadContext): void;
        preventNodeDeletion(node: ProductOccurrence | BodyInstance | InclusionContext | AttachContext | LoadContext): void;
        preventMeshDeletion(meshKey: SC.MeshKey): void;
        private _resetContents;
        reset(): Promise<void>;
        setViewAxes(frontVec: Point3, upVec: Point3): void;
        private _requestIncsOfNodes;
        private _requestExternalModelsLocal;
        private _requestExternalModelsNonLocal;
        private _requestExternalModelsOfNodes;
        private _requestNodes;
        requestNodes(treeLoader: TreeLoader, nodes: AnyTreeNode[], isImplicitlyRequested: boolean): Promise<void>;
        isBeingRequested(startNode: AnyTreeNode | AnyTreeContext): boolean;
        onDemandRequestsActive(): boolean;
        onLoadBegin(): LoadId;
        onLoadEnd(loadId: number): void;
        markSeenExternalModel(): void;
        seenExternalModel(): boolean;
        getNodesByGenericId(genericId: GenericId): Set<AnyTreeNode> | null;
        getNodesByGenericType(genericType: GenericType): Set<AnyTreeNode> | null;
        genericTypeToNodes(): Map<GenericType, Set<AnyTreeNode>>;
        registerGenericGlobalId(node: AnyTreeNode, genericId: GenericId): void;
        registerGenericType(node: AnyTreeNode, genericType: GenericType): void;
        disableAutomaticFitWorld(): boolean;
        markImplicitNodesOutOfHierarchy(): boolean;
        private _throttleLoad;
        /**
         * Enqueues an action that can be throttled by user interactions.
         */
        enqueue<T>(lazyPromise: LazyLike<Promise<T>>): Promise<T>;
        private _onUserInteraction;
        protected readonly __AssemblyTree: PhantomMember;
        private readonly _config;
        private readonly _engine;
        private readonly _callbackManager;
        private readonly _cuttingManager;
        private readonly _view;
        private readonly _model;
        private _centralQueue;
        private readonly _centralQueueClock;
        private readonly _isScs;
        private _rootLoadContext;
        private _rootNode;
        private readonly _productOccurrences;
        private readonly _pmis;
        private readonly _cadViews;
        private readonly _bodyInstances;
        private readonly _pmiBodies;
        private readonly _viewFrames;
        private readonly _partDefinitions;
        private readonly _representationItems;
        private readonly _partToInstance;
        private readonly _filters;
        private readonly _layers;
        private readonly _layersIds;
        private _nextLayerId;
        private readonly _genericTypeToNodes;
        private readonly _genericIdToNodes;
        private readonly _cadConfigurations;
        private readonly _modelContents;
        private readonly _inclusionContents;
        private readonly _nodeDeletionBlackList;
        private readonly _meshDeletionBlackList;
        private _dynamicNodeIdSeed;
        private _currentNodeIdOffset;
        private _initialEmptyNodeIdOffsetObtained;
        private _activeCadView;
        private _activeCadConfiguration;
        private _defaultCadConfiguration;
        private _defaultCadViewsByConfiguration;
        private _firstProductOccurrenceWithView;
        private _containsDrawings;
        private _isMeasurable;
        private _automaticMeasurementUnitScaling;
        private _initiallyHiddenStayHidden;
        private _nextLoadId;
        private _activeLoadIds;
        private _requestedNodes;
        private _unnamedProductCount;
        private _unnamedGroupCount;
        private _unnamedDrawingSheetCount;
        private _unnamedDrawingViewCount;
        private _isInitialized;
        private _seenExternalModel;
    }
}
declare namespace Communicator.Internal.Tree {
    /**
     * This master `BitDefinitions` enum is to help maintain non-colliding bits, so more specialized
     * bit enums can be type summed (e.g. FooBits | BarBits) without worry of overlap.
     *
     * Mirrored in C++.
     */
    const enum BitDefinitions {
        IsLoaded = -2147483648,
        InitiallyShown = 1073741824,
        InitiallyRemoved = 536870912,
        OutOfHierarchy = 268435456,
        IsAnnotationView = 134217728,
        IsCameraSet = 67108864,
        IsPmiFilteringSet = 33554432,
        IsGeomFilteringSet = 16777216,
        IsCrossSectionSet = 8388608,
        IsExplosionSet = 4194304,
        IsCombineState = 2097152,
        IsPerspective = 1048576,
        IsShownSpecified = 524288,
        IsShown = 262144,
        BranchVisibilityHidden = 131072,
        BranchVisibilityShown = 65536,
        BranchVisibilityDirty = 32768,
        PreventFromResetting = 16384,
        HasDynamicFrame = 8192,
        IsMissing = 4096,
        IsExternalModelRoot = 2048,
        Requested = 1024,
        ImplicitBody = 512,
        IsDefaultView = 256,
        Unused2 = 128,
        Unused1 = 64,
        NodeTypeDrawingSheet = 32,
        IsADefaultNodeType = 16,
        NodeTypeDrawingView = 8,
        NodeTypeGroup = 4,
        NodeTypeProduct = 2,
        IsAConfigurationNode = 1
    }
}
declare namespace Communicator.Internal.Tree {
    class ModelStructure {
        /**
         * Until `modelStructure.isReady()` is true, only the following functions are legal to call:
         *      - `modelStructure.waitForReady()`
         *      - `modelStructure.isReady()`
         */
        static unsafeCreate(config: AssemblyTreeConfig, engine: AbstractScEngine, callbackManager: CallbackManager, cuttingManager: AbstractCuttingManager, view: AbstractView, model: AbstractModel, maxConcurrentAttachments: number | null): ModelStructure;
        static create(config: AssemblyTreeConfig, engine: AbstractScEngine, callbackManager: CallbackManager, cuttingManager: AbstractCuttingManager, view: AbstractView, model: AbstractModel, maxConcurrentAttachments: number | null): Promise<ModelStructure>;
        private static _create;
        private constructor();
        private _init;
        private _loadSubtreePrologue;
        private _loadSubtreeEpilogue;
        loadSubtreeFromXmlFile(nodeId: RuntimeNodeId, xmlFilename: XmlFilename, massageModelName: MassageModelNameFunc, config: LoadSubtreeConfig): Promise<RuntimeNodeId[]>;
        loadSubtreeFromXmlDoc(nodeId: RuntimeNodeId, xml: string | Document, massageModelName: MassageModelNameFunc, config: LoadSubtreeConfig): Promise<RuntimeNodeId[]>;
        loadSubtreeFromScsXmlFile(nodeId: RuntimeNodeId, xmlFilename: XmlFilename, modelNameToScs: ModelNameToScsFileFunc, config: LoadSubtreeConfig): Promise<RuntimeNodeId[]>;
        loadSubtreeFromScsXmlDoc(nodeId: RuntimeNodeId, xmlData: string | Document, modelNameToScs: ModelNameToScsFileFunc, config: LoadSubtreeConfig): Promise<RuntimeNodeId[]>;
        private _loadSubtreeFromStream;
        loadSubtreeFromStream(nodeId: RuntimeNodeId, modelName: ScModelName, config: LoadSubtreeConfig): Promise<RuntimeNodeId[]>;
        loadSubtreeFromScsFile(nodeId: RuntimeNodeId, scsFilename: ScsUri, config: LoadSubtreeConfig): Promise<RuntimeNodeId[]>;
        loadSubtreeFromScsBuffer(nodeId: RuntimeNodeId, scsBuffer: ScsBuffer, config: LoadSubtreeConfig): Promise<RuntimeNodeId[]>;
        /**
         * I don't think this is used at all. If so, this should be removed.
         */
        loadSubtreeFromAssemblyData(nodeId: RuntimeNodeId, modelInc: SC.ModelInc, assemblyData: AssemblyData, config: LoadSubtreeConfig): Promise<RuntimeNodeId[]>;
        private _clearImpl;
        clear(): Promise<void>;
        switchToModel(newModelFilename: string): Promise<RuntimeNodeId[]>;
        getAbsoluteRootNodeId(): RuntimeNodeId;
        isIdValid(nodeId: RuntimeNodeId): boolean;
        private _getNodeChildren;
        getChildIds(nodeId: RuntimeNodeId, includeOutOfHierarchy: boolean): RuntimeNodeId[];
        isOutOfHierarchy(nodeId: RuntimeNodeId): boolean;
        getParentId(nodeId: RuntimeNodeId): RuntimeNodeId | null;
        getPartReferrers(nodeId: RuntimeNodeId): Promise<RuntimeNodeId[] | null>;
        getAttributes(nodeId: RuntimeNodeId): Promise<Attribute[]>;
        getProperties(nodeId: RuntimeNodeId): Promise<StringStringMap | null>;
        addProperty(nodeId: RuntimeNodeId, propertyName: string, propertyValue: string, propertyUnit: UnitElement[]): boolean;
        setPhysicalProperties(nodeId: RuntimeNodeId, centerOfGravity: Point3, surfaceArea: number, volume: number): boolean;
        getUserDataIndices(nodeId: RuntimeNodeId): UserDataIndex[];
        getUserData(nodeId: RuntimeNodeId, index: UserDataIndex): Uint8Array;
        getInstanceIncs(nodeId: RuntimeNodeId, allowedTypes: BodyTypeBits): SC.InstanceIncs;
        getNodeFromInstanceInc(markNodeLoadedIfCreated: boolean, inclusionKey: SC.InclusionKey, instanceKey: SC.InstanceKey, isOutOfHierarchy: boolean): RuntimeNodeId;
        private _getAssociatedModelKey;
        getAssociatedModelKey(nodeId: RuntimeNodeId): SC.ModelKey | null;
        getMatrix(nodeId: RuntimeNodeId): Matrix;
        setMatrix(nodeId: RuntimeNodeId, matrix: Matrix, setAsInitial: boolean): Promise<void>;
        setMatrices(nodeIds: RuntimeNodeId[], matrices: Matrix[], setAsInitial: boolean): Promise<void>;
        resetToInitialMatrix(nodeId: RuntimeNodeId): Promise<void>;
        getNetMatrix(nodeId: RuntimeNodeId): SC.Matrix16;
        private _getBodyInstanceIndexFrom;
        getNodeOrRepItem(node: AnyNode): Promise<ProductOccurrence | Pmi | CadView | PartDefinition | RepresentationItem | null>;
        private _getNodeOrRepItemFromId;
        getPointAttributes(nodeId: RuntimeNodeId, pointId: number): Promise<SubentityAttributes | null>;
        getEdgeCount(nodeId: RuntimeNodeId): Promise<number>;
        getEdgeAttributes(nodeId: RuntimeNodeId, edgeId: number): Promise<SubentityAttributes | null>;
        getEdgeProperty(nodeId: RuntimeNodeId, edgeId: number): Promise<SubentityProperties.Edge | null>;
        getFaceCount(nodeId: RuntimeNodeId): Promise<number>;
        getFaceAttributes(nodeId: RuntimeNodeId, faceId: number): Promise<SubentityAttributes | null>;
        getFaceProperty(prcId: RuntimeNodeId, faceId: number): Promise<SubentityProperties.Face | null>;
        setEdgeProperty(nodeId: RuntimeNodeId, edgeId: number, prop: SubentityProperties.Base): void;
        setFaceProperty(nodeId: RuntimeNodeId, faceId: number, prop: SubentityProperties.Base): void;
        getName(nodeId: RuntimeNodeId): string | null;
        getNodeExchangeId(nodeId: RuntimeNodeId): ExchangeId | null;
        getFilters(): Map<FilterId, FilterName>;
        getFilterName(filterId: FilterId): FilterName | null;
        getFiltersWithNode(nodeId: RuntimeNodeId): FilterId[];
        getNodesFromFilterIds(filterIds: FilterId[]): FilteredNodes | null;
        getLayers(): Map<LayerId, LayerName>;
        getUniqueLayerNames(): LayerName[];
        getLayerName(layerId: LayerId): LayerName | null;
        getLayerIdsFromName(name: LayerName): LayerId[] | null;
        getNodeLayerId(nodeId: RuntimeNodeId): LayerId | null;
        getAuthoredNodesFromLayer(layerId: LayerId, onlyTreeNodes?: boolean): AuthoredNodeId[] | null;
        getAuthoredNodesFromLayers(layersId: LayerId[], onlyTreeNodes?: boolean): AuthoredNodeId[] | null;
        getRuntimeNodesFromLayer(layerId: LayerId, onlyTreeNodes?: boolean): RuntimeNodeId[] | null;
        getRuntimeNodesFromLayers(layersId: LayerId[], onlyTreeNodes?: boolean): RuntimeNodeId[] | null;
        getRuntimeNodesFromLayerName(layerName: LayerName, onlyTreeNodes?: boolean): RuntimeNodeId[] | null;
        createCadView(parentId: RuntimeNodeId, viewName: string, camera: Camera, pmiIds: RuntimeNodeId[], nodesToShow: RuntimeNodeId[], nodesToHide: RuntimeNodeId[], nodesIdAndLocalTransforms: [RuntimeNodeId, Matrix][], cuttingPlane: Plane | null, meshInstanceData: MeshInstanceData | null): RuntimeNodeId | null;
        getCadViewMap(): Map<NodeId, string>;
        activateCadView(cadViewId: RuntimeNodeId, duration: number): Promise<void>;
        getCadViewPmis(cadViewId: RuntimeNodeId): RuntimeNodeId[];
        _disableCadConfigurations(): Promise<void>;
        cadConfigurationsEnabled(): Promise<boolean>;
        getCadConfigurations(): IdStringMap;
        getDefaultCadConfiguration(): RuntimeNodeId | null;
        getActiveCadConfiguration(): RuntimeNodeId | null;
        getCadViewConfiguration(nodeId: RuntimeNodeId): RuntimeNodeId | null;
        private _activateCadConfiguration;
        activateCadConfiguration(cadConfigId: RuntimeNodeId): Promise<void>;
        activateDefaultCadConfiguration(): Promise<void>;
        getDefaultCadView(): RuntimeNodeId | null;
        activateDefaultCadView(): Promise<void>;
        getPmis(): IdStringMap;
        getPmiType(pmiId: RuntimeNodeId): PmiType;
        getPmiSubType(pmiId: RuntimeNodeId): PmiSubType;
        getUnit(nodeId: RuntimeNodeId): number;
        private _rectifyParent;
        createMeshInstance(inclusionKey: SC.InclusionKey, instanceKey: SC.InstanceKey, name: string | null, parentId: RuntimeNodeId | null, preventFromResetting: boolean, isOutOfHierarchy: boolean, implicitBody: boolean): RuntimeNodeId;
        createPmiInstance(inclusionKey: SC.InclusionKey, instanceKey: SC.InstanceKey, pmiType: PmiType, pmiSubType: PmiSubType, topoRefs: ReferenceOnTopology[], name: string | null, parentId: RuntimeNodeId | null): RuntimeNodeId;
        setVisibilitiesByMap(idToVisibility: Map<RuntimeNodeId, boolean>, initiallyHiddenStayHidden: boolean | null, mode: TreeWalkMode): Promise<void>;
        setBodyNodesVisibility(startNode: AnyTreeNode, visibility: boolean): Promise<void>;
        setVisibilitiesByValue(nodeIds: RuntimeNodeId[], visibility: boolean, initiallyHiddenStayHidden: boolean | null, mode: TreeWalkMode): Promise<void>;
        resetAllVisibilities(): Promise<void>;
        resetAllTransforms(): Promise<void>;
        reset(): Promise<void>;
        setPmiColor(color: Color, startNodeId: RuntimeNodeId | undefined): void;
        resetPmiColor(startNodeId: RuntimeNodeId | undefined): void;
        getPmiTopologyReferences(pmiNodeId: RuntimeNodeId): PmiTopologyReference[] | null;
        createNode(parentId: RuntimeNodeId | null, nodeName: string, nodeId: AuthoredNodeId | null, localMatrix?: Matrix | null, visibility?: boolean, measurementUnit?: number | null): RuntimeNodeId;
        deleteNode(nodeId: RuntimeNodeId): Promise<void>;
        createPart(nodeId: AuthoredNodeId | null): RuntimeNodeId;
        setPart(nodeId: RuntimeNodeId, partId: RuntimeNodeId): boolean;
        createAndAddRepItem(partId: RuntimeNodeId, repItemId: AuthoredNodeId | null): RuntimeNodeId | null;
        getLowestAvailableNodeId(): RuntimeNodeId;
        getType(nodeId: RuntimeNodeId): NodeType;
        isVisible(nodeId: RuntimeNodeId): boolean;
        getBranchVisibility(nodeId: RuntimeNodeId): BranchVisibility;
        setMeshLevel(nodeIds: RuntimeNodeId[], meshLevel: number): void;
        setEnableAutomaticUnitScaling(value: boolean): void;
        setBehaviorInitiallyHidden(value: boolean): void;
        isACadDrawing(): boolean;
        isMeasurable(): boolean;
        getModelFileNameFromNode(nodeId: RuntimeNodeId): string | null;
        getModelFileTypeFromNode(nodeId: RuntimeNodeId): FileType | null;
        isAnnotationView(cadViewNodeId: RuntimeNodeId): boolean;
        /** This will undo the effect of calling preventNodeDeletion() for the given node. */
        allowNodeDeletion(nodeId: RuntimeNodeId): void;
        preventNodeDeletion(nodeId: RuntimeNodeId): void;
        preventMeshDeletion(meshKey: SC.MeshKey): void;
        getBounding(nodeIds: RuntimeNodeId[], allowedTypes: BodyTypeBits, ignoreInvisible: boolean, tightBounding: boolean): Promise<Box>;
        getIdOffset(nodeId: RuntimeNodeId): NodeIdOffset;
        /**
         * Motivation for this function:
         *
         * It is possible to begin a load where some SC geometry gets streamed in
         * but the assembly tree has not been fully parsed. Suppose an SC instance
         * (A) gets streamed, and has its node parsed by the assembly tree. If the
         * user attempts to select (A), our internals will find the NodeId associated
         * with (A). This is so far okay (but not ideal perhaps). The big issue comes
         * when the user starts to query the parents or children of the node. Since
         * the entire loaded subtree has not been fully parsed, querying such things
         * may not make sense because they might not be available. (Querying other
         * things might also be problematic.)
         *
         * It might make sense to not expose this function publically (as it is today
         * in `Model`) and do all the required filtering of selection results in the
         * selection internals. This, however might be 'problematic' when loading a
         * giant model (such as the Boeing). In this case, it might take ages for the
         * tree to completely load, which would make geometry not selectable in the
         * meantime. This might be interpreted as a bug from our users because they might
         * want to highlight such selected geometries.
         *
         * Related: COM-1169
         */
        isNodeLoaded(nodeId: RuntimeNodeId): boolean;
        shutdown(): void;
        isReady(): boolean;
        waitForReady(): Promise<void>;
        lookupAnyTreeNode(nodeId: RuntimeNodeId): AnyTreeNode | null;
        lookupAnyBody(nodeId: RuntimeNodeId): AnyBody | null;
        lookupBodyInstance(nodeId: RuntimeNodeId): BodyInstance | null;
        gatherInstanceIncsFromNodeIds(nodeIds: RuntimeNodeId[], allowedTypes: BodyTypeBits, restriction: WalkRestriction): SC.InstanceIncs;
        requestNodes(nodeIds: RuntimeNodeId[]): Promise<void>;
        isWithinExternalModel(nodeId: RuntimeNodeId): boolean;
        getNodeGenericType(nodeId: RuntimeNodeId): GenericType | null;
        getNodeGenericId(nodeId: RuntimeNodeId): GenericId | null;
        getNodesByGenericId(genericId: GenericId): Set<RuntimeNodeId> | null;
        getNodesByGenericType(genericType: GenericType): Set<RuntimeNodeId> | null;
        getGenericTypes(): GenericType[];
        getGenericTypeIdMap(): Map<GenericType, Set<RuntimeNodeId>>;
        hasEffectiveGenericType(nodeId: NodeId, genericType: GenericType): boolean;
        registerGenericId(node: AnyTreeNode, genericId: GenericId): void;
        registerGenericType(node: AnyTreeNode, genericType: GenericType): void;
        hasRelationships(nodeId: RuntimeNodeId): boolean;
        getBimIdFromNode(nodeId: RuntimeNodeId): BimId | null;
        getRuntimeNodeFromBimId(contextNodeId: RuntimeNodeId, bimId: BimId): RuntimeNodeId | null;
        getRelationsByTypeFromNode(contextNodeId: RuntimeNodeId, nodeId: BimId): Map<RelationshipType, BimRelationship> | null;
        firstAssemblyDataHeader(): AssemblyDataHeader | null;
        setPrefetchScsCutoffScale(prefetchCutoffScale: number): void;
        getAllRelationships(nodeId: RuntimeNodeId): Relationship[];
        private getAllBimInfos;
        getInfoOfBimId(nodeID: RuntimeNodeId, bimId: BimId): {
            name: string;
            connected: boolean;
        };
        private indexOfBimInfo;
        getBimIdRelationshipTypes(contextNodeId: RuntimeNodeId, nodeId: BimId): RelationshipInfo[];
        protected readonly __ModelStructure: PhantomMember;
        private readonly _engine;
        private readonly _callbackManager;
        private readonly _cuttingManager;
        private readonly _view;
        private readonly _model;
        private readonly _readyPromise;
        private _assemblyTree;
        private _treeLoader;
        private _clearQueue;
        private _clearInProgress;
        private _cadConfigurationsEnabled;
    }
}
declare namespace Communicator.Internal.Tree {
    function getNetMatrix(startNode: AnyNode | AnyTreeContext): SC.Matrix16;
    /**
     * Retrieves the nearest `AnyTreeContext` to the input object by walking upward.
     * If the input object is already an `AnyTreeContext`, it is immediately returned instead.
     */
    function towardContainerNode(startNode: AnyTreeNode | AnyTreeContext): AnyContainerNode | null;
    function isOutOfHierarchy(node: AnyNode): boolean;
    function getBranchVisibility(node: AnyTreeNode): BranchVisibility;
    function getNodeType(node: AnyNode): NodeType;
    function getNodeGenericType(node: AnyTreeNode): GenericType | null;
    /**
     * The type used to denote a tree node or tree context where `towardInclusionContext` can be called from.
     */
    type HasInclusionContext = AnyTreeNode | InclusionContext | PrototypeContext;
    /**
     * Retrieves the nearest `InclusionContext` to the input object by walking upward.
     * If the input object is already an `InclusionContext`, it is immediately returned instead.
     */
    function towardInclusionContext(startNode: HasInclusionContext): InclusionContext;
    /**
     * Retrieves the nearest `LoadContext` to the input object by walking upward.
     * If the input object is already a `LoadContext`, it is immediately returned instead.
     */
    function towardLoadContext(startNode: AnyTreeContext | AnyTreeNode): LoadContext;
    /**
     * Retrieves the nearest `AttachContext` to the input object by walking upward.
     * If the input object is already an `AttachContext`, it is immediately returned instead.
     */
    function towardAttachContext(startNode: AnyTreeNode | InclusionContext | AttachContext | LoadContext | PrototypeContext): AttachContext;
    /**
     * Retrieves the nearest "attach root" to the input node by walking upward.
     * If the input node is already an "attach root", it is immediately returned instead.
     *
     * An "attach root" is defined to be a `ProductOccurrence` that is a child of an `InclusionContext`.
     */
    function towardAttachRoot(startNode: AnyTreeNode): ProductOccurrence;
    /**
     * Retrieves the nearest `ProductOccurrence` to the input object by walking upward.
     * If the input object is already a `ProductOccurrence`, it is immediately returned instead.
     */
    function towardProductOccurrence(startNode: AnyTreeNode | AnyTreeContext): ProductOccurrence | null;
}
declare namespace Communicator.Internal.Tree {
    type AttachContextParent = ProductOccurrence | LoadContext;
    enum GenericTypeId {
    }
    type GenericTypeMaps = Bimap<GenericTypeId, GenericType>;
    /**
     * This object lives in the tree structure of `AssemblyTree`.
     * `AttachContext` stores information relevant to the SC attachment of tree nodes below it.
     * If multiple `AttachContext`s are ancestors to a given node, the closest
     * context takes precedence.
     *
     * See `AnyTreeContext` for generic information about tree contexts.
     *
     * Note:
     * This class does *not* represent a model (as in it's not a "ModelContext").
     * It represents an SC attachment. (SC attachments in turn yield included models.)
     * The main role of this is to root key remappers and master model keys.
     */
    class AttachContext {
        constructor(remapper: ScKeyRemapper, attachScope: SC.AttachScope, attachedInvisibly: boolean, masterModelKey: SC.MasterModelKey, parent: AttachContextParent);
        getRootNodeMetaData(assemblyTree: AssemblyTree): Promise<AssemblyData | null>;
        getAttachScope(): SC.AttachScope;
        attachedInvisibly(): boolean;
        getMasterModelKey(): SC.MasterModelKey;
        addInclusionContext(context: InclusionContext): void;
        getRemapper(): ScKeyRemapper;
        getParent(): AttachContextParent;
        getChildren(): ProductOccurrence[];
        split(attachScope: SC.AttachScope, attachedInvisibly: boolean, parent: AttachContextParent): AttachContext;
        hasChildren(): boolean;
        removeProductOccurrence(node: ProductOccurrence): boolean;
        purgeContents(): Promise<void>;
        isLoaded(): boolean;
        setReservedNodeIdOffset(offset: NodeIdOffset): void;
        getReservedNodeIdOffset(): NodeIdOffset | null;
        forgetReservedNodeIdOffset(): void;
        getOriginalFileName(): string;
        getOriginalFileType(): FileType;
        setGenericTypeMaps(maps: GenericTypeMaps): void;
        getGenericTypeMaps(): GenericTypeMaps | null;
        protected readonly __AttachContext: PhantomMember;
        private readonly _parent;
        private readonly _remapper;
        private readonly _attachScope;
        private readonly _attachedInvisibly;
        private readonly _masterModelKey;
        private _reservedNodeIdOffset;
        private _inclusionContexts;
        private _originalFileName;
        private _originalFileType;
        private _genericTypeMaps;
    }
}
declare namespace Communicator.Internal.Tree {
    /**
     * This object lives in the tree structure of `AssemblyTree`.
     * `InclusionContext` stores information relevant to the SC inclusion of tree nodes below it.
     * If multiple `InclusionContext`s are ancestors to a given node, the closest
     * context takes precedence.
     *
     * See `AnyTreeContext` for generic information about tree contexts.
     */
    class InclusionContext {
        constructor(assemblyTree: AssemblyTree, attachContext: AttachContext, inclusionKey: SC.InclusionKey, modelKey: SC.ModelKey);
        split(assemblyTree: AssemblyTree, parent: AttachContext): InclusionContext;
        getIdOffset(): NodeIdOffset;
        toRuntimeId(authoredId: AuthoredNodeId): RuntimeNodeId;
        getInclusionKey(): SC.InclusionKey;
        getModelKey(): SC.ModelKey;
        getParent(): AttachContext;
        /** Naming clarity for when you know you want it as the attach-context */
        getAttachContext(): AttachContext;
        addProductOccurrence(node: ProductOccurrence): void;
        getChildren(): ProductOccurrence[];
        removeProductOccurrence(node: ProductOccurrence): boolean;
        purgeContents(): Promise<void>;
        hasChildren(): boolean;
        isLoaded(): boolean;
        addRelationship(relationship: Relationship): void;
        getRelationships(): Relationship[];
        addBimInfos(bimInfo: BimObject): void;
        getBimInfos(): BimObject[];
        addBimIdToMap(bimId: BimId, runtimeId: RuntimeNodeId): void;
        getRuntimeNodeFromBimId(bimId: BimId): RuntimeNodeId | null;
        protected readonly __InclusionContext: PhantomMember;
        private readonly _attachContext;
        private readonly _inclusionKey;
        private readonly _modelKey;
        private readonly _nodeIdOffset;
        private _productOccurrences;
        private readonly _relationship;
        private _bimNodeIdMap;
        private _bimInfos;
    }
}
declare namespace Communicator.Internal.Tree {
    type LoadContextParent = ProductOccurrence | null;
    /**
     * This object lives in the tree structure of `AssemblyTree`.
     * `LoadContext` stores information relevant to the "load" of tree nodes below it.
     * If multiple `LoadContext`s are ancestors to a given node, the closest
     * context takes precedence.
     *
     * See `AnyTreeContext` for generic information about tree contexts.
     *
     * This context always roots subtrees loaded from any of the `Model.loadSubtreeFromXxx`
     * methods as well as the tree's absolute root node.
     */
    class LoadContext {
        constructor(parent: LoadContextParent, debugLoadString: string, scsBufferCache: PromiseCache<ExternalModelName, ScsBuffer | null> | null);
        /**
         * Returns whether or not an authored external model should be handled or not.
         */
        handleExternalModel(includerAuthoredNodeId: AuthoredNodeId, includerInclusionContext: InclusionContext, externalInclusionKey: SC.InclusionKey): boolean;
        getParent(): LoadContextParent;
        addAttachContext(context: AttachContext): void;
        getChildren(): ProductOccurrence[];
        hasChildren(): boolean;
        removeProductOccurrence(node: ProductOccurrence): boolean;
        purgeContents(): Promise<void>;
        isLoaded(): boolean;
        /**
         * This should not be called more than once per `ExternalModelName` in a given `LoadContext`.
         */
        initializeScsModelKeysOf(modelName: ExternalModelName): void;
        /**
         * Gets the model keys of an SCS model by its external name from a shattered XML file.
         *
         * Returns:
         *  - `null` if `initializeScsModelKeysOf` was not called for the given model.
         *  - `TrackedOpenPromise<null>` if the model has no attachment data.
         *  - `TrackedOpenPromise<SC.ModelKey[]>` if the model has attachment data.
         */
        getScsModelKeysOf(modelName: ExternalModelName): TrackedOpenPromise<SC.ModelKey[] | null> | null;
        markAsFirstLoad(): void;
        isFirstLoad(): boolean;
        toScsBuffer(modelName: ExternalModelName, toAttachData: ToAttachDataFunc): Promise<ScsBuffer | Response | null>;
        onLoadComplete(): void;
        addLayerIdToMap(runtimeId: LayerId, authoredId: AuthoredLayerId): void;
        getAuthoredLayerId(runtimeId: LayerId): AuthoredLayerId | null;
        getRuntimeLayerId(authoredId: AuthoredLayerId): LayerId | null;
        protected readonly __LoadContext: PhantomMember;
        private readonly _parent;
        private readonly _debugLoadString;
        private _scsBufferCache;
        private _handledExternalModels;
        private _attachContexts;
        private _registeredScsModelKeys;
        private _isFirstLoad;
        private _layerIdMap;
    }
}
declare namespace Communicator.Internal.Tree {
    /**
     * The shared portion of a prototype context.
     */
    class SharedPrototypeContext {
        constructor(prototype: LazyPromise<ProductOccurrence>);
        _addReferrer(referrer: ProductOccurrence): void;
        _getReferrers(): ProductOccurrence[];
        _getPrototype(): LazyPromise<ProductOccurrence>;
        _removeReferrer(node: ProductOccurrence): boolean;
        _purgeContents(): Promise<void>;
        _isLoaded(): boolean;
        protected readonly __SharedPrototypeContext: PhantomMember;
        private readonly _prototype;
        private _referrers;
    }
    /**
     * This (by design) is used to break the tree structure of the assembly tree.
     * Because this exists, the tree is actually a directed acyclic graph.
     * If I'm not mistaken, this is much like an inclusion in the Visualize sense of the term.
     * (Not to be confused with the SC sense of the term.)
     */
    class PrototypeContext {
        constructor(shared: SharedPrototypeContext | LazyObject<SharedPrototypeContext>, inclusionContext: InclusionContext);
        getInclusionContext(): InclusionContext;
        addReferrer(referrer: ProductOccurrence): void;
        getReferrers(): ProductOccurrence[];
        getProductOccurrence(): LazyPromise<ProductOccurrence>;
        removeReferrer(node: ProductOccurrence): boolean;
        removeAllReferrers(): void;
        purgeContents(): Promise<void>;
        isLoaded(): boolean;
        protected readonly __PrototypeContext: PhantomMember;
        private readonly _shared;
        private readonly _inclusionContext;
    }
}
declare namespace Communicator.Internal.Tree {
    const enum NodeParseBits1 {
        Id = 1,
        Name = 2,
        Visiblity = 4,
        Transform = 8,
        SubNodes = 16,
        Instance = 32,
        InstanceQuickAccess = 64,
        BodyInstances = 128,
        Attributes = 256,
        PartDataLink = 512,
        Bodies = 1024,
        FaceMeasurement = 2048,
        EdgeMeasurement = 4096,
        MeshKey = 8192,
        Unit = 16384,
        Views = 32768,
        Pmis = 65536,
        ScInclusionKey = 131072,
        ScInstanceKey = 262144,
        ExternalModel = 524288,
        PhysicalProperties = 1048576,
        VersionNumber = 2097152,
        ProductBits = 4194304,
        Header = 8388608,
        FrontUpVector = 16777216,
        ExchangeId = 33554432,
        LayerId = 67108864,
        LayerList = 134217728,
        Filters = 268435456,
        UserData = 536870912,
        UseNodeParseBits2 = 1073741824
    }
    const enum NodeParseBits2 {
        FaceAttributes = 1,
        EdgeAttributes = 2,
        OriginalName = 4,
        GenericTypes = 8,
        GenericTypeId = 16,
        GenericId = 32,
        DoublePrecisionMatrices = 64,
        PointAttributes = 128,
        Relationships = 256
    }
    class NodeParseBits {
        hasBits1(bits: NodeParseBits1): boolean;
        hasBits2(bits: NodeParseBits2): boolean;
        parseBits1(parser: AssemblyDataParser): void;
        parseBits2(parser: AssemblyDataParser): void;
        private _bits1;
        private _bits2;
    }
    const enum ViewParseBits {
        Name = 1,
        Camera = 2,
        Pmi = 4,
        Frame = 8,
        ShowNodes = 16,
        HideNodes = 32,
        MoveNodes = 64,
        CuttingPlanes = 128,
        IsAnnotationView = 256,
        IsNotCameraSet = 512,
        IsNotPmiFilteringSet = 1024,
        IsNotGeomFilteringSet = 2048,
        IsNotCrosssectionSet = 4096,
        IsNotExplosionSet = 8192,
        IsCombineState = 16384,
        IsPerspective = 32768,
        IsDefaultView = 65536
    }
    const enum PmiParseBits {
        Name = 1,
        TopoRef = 2,
        Attributes = 4,
        InitiallyHidden = 8,
        HasMultipleBodies = 16
    }
    const enum FilterParseBits {
        Name = 1,
        LayerItem = 2,
        EntityItem = 4
    }
    const enum LayerParseBits {
        Name = 1
    }
    const enum AttributeParseBits {
        ValueName = 1,
        Units = 2
    }
    const enum RelationshipParseBits {
        Type = 1,
        Related = 2,
        Relating = 4
    }
    class AssemblyVisibility {
        constructor(shown: boolean, removed: boolean);
        readonly shown: boolean;
        readonly removed: boolean;
    }
    class AssemblyDataParser {
        constructor(assemblyData: AssemblyData);
        hasNext(): boolean;
        parseCount_32(): number;
        parseIndex_32(): number;
        parseAssemblyDataVersion(components: number): VersionNumber;
        parseAssemblyDataHeaderVersion(): AssemblyDataHeaderVersion;
        parseVisibility(): AssemblyVisibility;
        parseProductBits(): ProductBits;
        parseUnits(): UnitElement[];
        parseCString(): string;
        parseUInt32(): number;
        parseInt32(): number;
        parseBytes(count: number): Uint8Array;
        parseNodeId(): AuthoredNodeId;
        parseLayerId(): AuthoredLayerId;
        parseGenericTypes(): GenericTypeMaps;
        parseGenericTypeId(): GenericTypeId;
        parseGenericId(): GenericId;
        private _parseScKey;
        parseDataKey(): SC.DataKey;
        parseInstanceKey(): SC.InstanceKey;
        parseMeshKey(): SC.MeshKey;
        parseModelKey(remapper: ScKeyRemapper | null): SC.ModelKey;
        parseInclusionKey(remapper: ScKeyRemapper | null, effectiveModelKey: SC.ModelKey | SC.MasterModelKey): SC.InclusionKey;
        parseMatrix(): SC.Matrix16;
        private _parseInt_8;
        private _parseUint_8;
        private _parseUint_32;
        private _parseInt_32;
        private _parseFloat_32;
        private _parseFloat_64;
        parseFloat_32(): number;
        parseFloat_64(): number;
        parseAttributeType(): AttributeType;
        parseNodeParseBits(): NodeParseBits;
        parseViewParseBits(): ViewParseBits;
        parsePmiParseBits(): PmiParseBits;
        parseLayerParseBits(): LayerParseBits;
        parseAttributeParseBits(): AttributeParseBits;
        parseRelationshipParseBits(): RelationshipParseBits;
        parseBoolean(): boolean;
        parsePoint3_32(): Point3;
        parsePoint3_64(): Point3;
        parsePlane3_32(): Plane;
        parsePmiType(): PmiType;
        parsePmiSubType(): PmiSubType;
        parsePmiTopoRef(): PmiTopoRef;
        parseBodyType(): BodyType;
        parseFaceType(): SubentityProperties.FaceType;
        parseEdgeType(): SubentityProperties.EdgeType;
        parseUserDataIndex(): UserDataIndex;
        getHeader(): AssemblyDataHeader | null;
        protected readonly __AssemblyDataParser: PhantomMember;
        private readonly _bytes;
        private readonly _header;
        private readonly _dataView;
        private _currentPos;
    }
}
declare namespace Communicator.Internal.Tree {
    interface AttachInfo {
        getAttachScope(): SC.AttachScope;
        getMasterModelKey(): SC.MasterModelKey;
        getModelKeys(): SC.ModelKey[];
        hasInclusions(): boolean;
        getAllInclusions(): SC.ModelIncs;
        getInclusionsOf(modelKey: SC.ModelKey | SC.MasterModelKey): SC.ModelIncs;
        hasModelIncluded(modelKey: SC.ModelKey): boolean;
        attachedInvisibly(): boolean;
        /**
         * Returns the number of instance prototypes in the attachment.
         * If this returns the value 0, then the number is unknown (and may be
         * queried later by manually calling `AbstractScEngine.instanceKeyInfo`).
         */
        prototypeInstanceCount(): number;
    }
    class AttachInfoBuilder implements AttachInfo {
        constructor(attachScope: SC.AttachScope, attachedInvisibly: boolean);
        getAttachScope(): SC.AttachScope;
        getMasterModelKey(): SC.MasterModelKey;
        getModelKeys(): SC.ModelKey[];
        hasInclusions(): boolean;
        getAllInclusions(): SC.ModelIncs;
        getInclusionsOf(modelKey: SC.ModelKey | SC.MasterModelKey): SC.ModelIncs;
        hasModelIncluded(modelKey: SC.ModelKey): boolean;
        attachedInvisibly(): boolean;
        prototypeInstanceCount(): number;
        registerInclusion(inclusionKey: SC.InclusionKey, modelKey: SC.ModelKey): void;
        registerMasterModelKey(masterModelKey: SC.MasterModelKey): void;
        registerPrototypeInstanceCount(prototypeInstanceCount: number): void;
        private readonly _inclusionsOf;
        private readonly _attachScope;
        private readonly _attachedInvisibly;
        private _masterModelKey;
        private _prototypeInstanceCount;
    }
}
declare namespace Communicator.Internal.Tree {
    type XmlAttachPriorityProxy = object;
    type NonXmlAttachPriorityValue = number;
    type AttachPriority = NonXmlAttachPriorityValue | XmlAttachPriorityProxy;
    interface OpaqueAttachPriority {
        _OpaqueAttachPriority: PhantomMember;
    }
    /**
     * This is used to prioritize the order of attaching pending attachments.
     */
    class AttachPriorityManager {
        constructor();
        getPriorityCompareValue(priority: AttachPriority): number;
        setRequireBoundingInfo(required: boolean): void;
        comparePriority(p1: OpaqueAttachPriority, p2: OpaqueAttachPriority): boolean;
        private _updateHeuristicInfo;
        createPriority(viewInfo: ViewInfo, inclusionMatrix: Matrix, xmlAttachInfo: XmlAttachInfo | null): OpaqueAttachPriority;
        destroyPriority(priority: OpaqueAttachPriority): void;
        onViewChange(viewInfo: ViewInfo, view: AbstractView, engine: AbstractScEngine): void;
        reset(): void;
        private _calculateCutoff;
        getCalculatedCutoff(): number;
        protected readonly __AttachQueue: PhantomMember;
        private readonly _priorityProxies;
        private _prevPriorityValue;
        private _calculatedCutoff;
        private _requireBoundingInfo;
    }
}
declare namespace Communicator.Internal.Tree {
    type ExternalModelInfo = ExternalModelInfoByInc | ExternalModelInfoByName;
    /**
     * This is for any external models authored into a model using ModelIncs.
     */
    interface ExternalModelInfoByInc {
        readonly config: LoadSubtreeConfig;
        readonly inclusionKey: SC.InclusionKey;
        readonly modelKey: SC.ModelKey;
    }
    /**
     * This is used for any external models discovered in XML files by name.
     */
    interface ExternalModelInfoByName {
        readonly config: LoadSubtreeConfig;
        readonly modelName: ExternalModelName;
        readonly bounding: Box | null;
        readonly measurementUnit: number | null;
        readonly toAttachData: ToAttachDataFunc;
        readonly reservedNodeIdOffset: NodeIdOffset;
    }
    namespace ExternalModel {
        function isNameInfo(info: ExternalModelInfo): info is ExternalModelInfoByName;
        function isIncInfo(info: ExternalModelInfo): info is ExternalModelInfoByInc;
        function canImplicitlyLoad(info: ExternalModelInfo): boolean;
    }
}
declare namespace Communicator.Internal.Tree {
    type AttachData = ScModelName | ScsBuffer | Response;
    /**
     * Returns `null` or `Promise<null>` to signify skipping the external model.
     * Returns `AttachData` or `Promise<AttachData>` otherwise for the external model.
     */
    type ToAttachDataFunc = (modelName: ExternalModelName) => Promise<AttachData | null> | AttachData | null;
    /** A variant of `ToAttachDataFunc` that also accepts a format version. */
    type VersionedToAttachDataFunc = (modelName: ExternalModelName, formatVersion: VersionNumber) => Promise<AttachData | null> | AttachData | null;
    interface XmlAttachInfo {
        readonly bounding: Box | null;
        readonly parent: ProductOccurrence;
        /**
         * If true, the attachment associated with this info will get prioritized over
         * other non-directly requested pending attachments.
         * See `AttachPriorityManager._updateHeuristicInfo` to see how priorities are affected by this.
         */
        directlyRequested: boolean;
    }
    /**
     * This class is used to make SC attachments. It abstracts away low-level SC messages
     * used for attachments. See `_awaitAttachInfo` for such abstractions.
     */
    class ScAttacher {
        static createWithEmptyModel(engine: AbstractScEngine, view: AbstractView, callbackManager: CallbackManager, maxConcurrentAttachments: number | null): Promise<ScAttacher>;
        private constructor();
        setPrefetchScsCutoffScale(prefetchCutoffScale: number): void;
        /**
         * Used in the constructor only.
         */
        private _createAttachQueue;
        /**
         * Used in the constructor only.
         */
        private _createPrefetchScsQueue;
        private _reprioritizeAttachments;
        /**
         * Used in the constructor only.
         */
        private _registerCameraListener;
        reprioritizeAttachmentsNow(): void;
        private _onCameraChange;
        /**
         * This listens on SC messages relevant for a given attachment.
         * This abstracts away the low-level details about an attachment
         * and bundles relevant information in a promise return value.
         */
        private _awaitAttachInfo;
        private _createPriority;
        private _cleanupAttachLowLevel;
        private _cleanupAttachHighLevel;
        newAttachScope(): SC.AttachScope;
        private _attachByStream;
        private static _getAllModelKeys;
        /**
         * This function is used to attach SCS buffers that are keyed to an `ExternalModelName`.
         * This happens when attaching an SCS from a model found in a shattered XML file.
         *
         * This function should be used over `simpleAttach` for this case. This is because `simpleAttach`
         * only takes a buffer as an argument. Without storing the entire buffer as a key to the attached
         * model keys of the SCS model, subsequent attachments of equivalent buffers cannot leverage
         * making new inclusions of the existing attached models. On the other hand, this keys the
         * attached models from the SCS buffer, allowing model sharing for subsequent attachments.
         *
         * Returns `Promise<null>` when the attachment is skipped (due to `toAttachData` returning `null`).
         */
        attachByNamedScsBuffer(assemblyTree: AssemblyTree, modelName: ExternalModelName, remapper: ScKeyRemapper, toAttachData: ToAttachDataFunc, inclusionMatrix: Matrix, parentMeasurementUnit: number, attachInvisibly: Lazy<boolean>, xmlAttachInfo: XmlAttachInfo): Promise<AttachInfo | null>;
        private streamScsData;
        private _attachByScsBuffer;
        simpleAttach(assemblyTree: AssemblyTree, remapper: ScKeyRemapper, attachData: ScsBuffer, inclusionMatrix: Matrix, parentMeasurementUnit: number, attachInvisibly: Lazy<boolean>, xmlAttachInfo: null, allowMissingModel: boolean): Promise<AttachInfo>;
        simpleAttach(assemblyTree: AssemblyTree, remapper: ScKeyRemapper, attachData: ScModelName, inclusionMatrix: Matrix, parentMeasurementUnit: number, attachInvisibly: Lazy<boolean>, xmlAttachInfo: XmlAttachInfo | null, allowMissingModel: boolean): Promise<AttachInfo>;
        simpleAttach(assemblyTree: AssemblyTree, remapper: ScKeyRemapper, attachData: AttachData, inclusionMatrix: Matrix, parentMeasurementUnit: number, attachInvisibly: Lazy<boolean>, xmlAttachInfo: null, allowMissingModel: boolean): Promise<AttachInfo>;
        reset(): Promise<void>;
        /**
         * This method will effectively cancel an active LoadSubtreeByXML operation.
         * All deferred promises in the prefetch queue will be canceled.
         * Note that any open promises i.e. SCS files that are being fetched when this method is called will resolve before this method returns.
         */
        clearAttachQueues(): Promise<void>;
        isIdle(): boolean;
        /**
         * Call this when a node has been directly requested by `Model.prototype.requestNodes`.
         */
        notifyDirectRequest(node: ProductOccurrence): void;
        registerXmlAttachInfo(info: XmlAttachInfo): void;
        private _forgetXmlAttachment;
        maxConcurrentAttachments(): number;
        protected readonly __ScAttacher: PhantomMember;
        private readonly _engine;
        private readonly _view;
        private readonly _callbackManager;
        private readonly _parentToXmlAttachInfos;
        private readonly _attachPriorityManager;
        private readonly _comparePriority;
        private readonly _attachQueue;
        private readonly _prefetchScsQueue;
        private _viewInfo;
        private _cameraTimeoutId;
        private _isFirstAttachment;
        private _attachScope;
    }
}
declare namespace Communicator.Internal.Tree {
    class ScKeyRemapper {
        remapModel(effectiveModelKey: SC.ModelKey, originalModelKey: SC.ModelKey): void;
        remapInclusion(effectiveModelKey: SC.ModelKey, effectiveInclusionKey: SC.InclusionKey, originalInclusionKey: SC.InclusionKey): void;
        getEffectiveModelKey(originalModelKey: SC.ModelKey): SC.ModelKey;
        getEffectiveInclusionKey(originalInclusionKey: SC.InclusionKey, effectiveModelKey: SC.ModelKey): SC.InclusionKey;
        protected readonly __ScKeyRemapper: PhantomMember;
        private readonly _remappedModelKeys;
        private readonly _remappedInclusionKeys;
    }
}
declare namespace Communicator.Internal.Tree {
    class TreeLoader {
        constructor(assemblyTree: AssemblyTree, scAttacher: ScAttacher, engine: AbstractScEngine, view: AbstractView, callbackManager: CallbackManager);
        private _resolveMeasurementUnits;
        /**
         * Used to create assembly tree data for instances that don't have authored assembly tree data.
         */
        private _patchImplicitNodesByModelInc;
        private _getPrototypeInstanceCountByAttachment;
        /**
         * Used to create assembly tree data for instances that don't have authored assembly tree data.
         */
        private _patchImplicitNodesByAttachment;
        /**
         * Newly loaded children should have their instances demanded if any of their
         * ancestors are currently being demanded. This function performs this logic.
         */
        private _updateOnDemandRequests;
        private _populateAttachment;
        private _postProcessAttachContext;
        private _parseRootNodes;
        private _parseRootNode;
        private _setupRootNode;
        private _populateInclusion;
        /**
         * COM-1701
         */
        private _rectifyLateVisibilityChange;
        private _loadCleanup;
        private _wrap;
        private _initLoad;
        private static _getNetMatrix;
        private _lazyAttachInvisibly;
        private _loadBySingleAttach;
        private _populateFromXml;
        private _loadByXml;
        private _attachExternalModelByInc;
        private _attachExternalModelInfoByName;
        setPrefetchScsCutoffScale(prefetchCutoffScale: number): void;
        isIdle(): boolean;
        waitOnCurrentLoads(): Promise<void>;
        cancelPendingLoads(): Promise<void>;
        cancelActiveAttachmentProcess(): Promise<void>;
        loadByStream(config: LoadSubtreeConfig, parent: ProductOccurrence, modelName: ScModelName): Promise<LoadContext>;
        loadByScsBuffer(config: LoadSubtreeConfig, parent: ProductOccurrence, scsBuffer: ScsBuffer): Promise<LoadContext>;
        loadByScsFile(config: LoadSubtreeConfig, parent: ProductOccurrence, scsFilename: ScsUri): Promise<LoadContext>;
        loadByXmlDoc(config: LoadSubtreeConfig, parent: ProductOccurrence, xmlData: string | Document, toAttachData: VersionedToAttachDataFunc): Promise<LoadContext>;
        loadByXmlFile(config: LoadSubtreeConfig, parent: ProductOccurrence, xmlFilename: XmlFilename, toAttachData: VersionedToAttachDataFunc): Promise<LoadContext>;
        attachByExternalModelInfo(info: ExternalModelInfo, parent: ProductOccurrence, inclusionContext: InclusionContext): Promise<AttachContext>;
        /**
         * I don't think this is used at all. If so, this should be removed.
         */
        loadByAssemblyData(config: LoadSubtreeConfig, parent: ProductOccurrence, modelInc: SC.ModelInc, assemblyData: AssemblyData): Promise<LoadContext>;
        reset(): Promise<void>;
        notifyDirectRequest(node: ProductOccurrence): void;
        onLoadChildProductOccurrence(): Util.ActionResult;
        firstAssemblyDataHeader(): AssemblyDataHeader | null;
        protected readonly __TreeLoader: PhantomMember;
        private readonly _assemblyTree;
        private readonly _scAttacher;
        private readonly _engine;
        private readonly _view;
        private readonly _callbackManager;
        private readonly _isScsSession;
        private _loadQueue;
        private _activeLoadCount;
        private _activeLoadGeneration;
        private _isFirstLoad;
        private _firstAssemblyDataHeader;
        private _nodesUntilNextSleep;
    }
}
declare namespace Communicator.Internal.Tree {
    class ViewInfo {
        constructor(view: AbstractView);
        calculateAttachHeuristic(extent: Vector3, center: Vector3): number;
        private readonly _frustum;
        private readonly _viewProjectionW;
        private readonly _position;
        private readonly _eye;
        private readonly _eyeDistanceInverse;
        private readonly _cameraIsOrtho;
    }
}
declare namespace Communicator.Internal.Tree {
    class XmlParser {
        private static _parseUint_32;
        static _parseFloat(str: string): number | null;
        static parseFloat(elem: Element, attrName: string): number | null;
        private static _parseScKey;
        static parseDataKey(elem: Element, attrName: string): SC.DataKey | null;
        static parseMeshKey(elem: Element, attrName: string): SC.MeshKey | null;
        static parseInstanceKeyFromInc(elem: Element, attrName: string): SC.InstanceKey | null;
        static parseNodeId(elem: Element, attrName: string): AuthoredNodeId | null;
        static parseLayerId(elem: Element, attrName: string): AuthoredLayerId | null;
        static parseUint(element: Element, attrName: string): number | null;
        static parseUints(elem: Element, attrName: string): number[] | null;
        static parseFloats(elem: Element, attrName: string): number[] | null;
        static parseNodeIds(elem: Element, attrName: string): AuthoredNodeId[] | null;
        private static _parsePoint3;
        static parseBounding(parentElem: Element, childName: string): Box | null;
        static parseCamera(elem: Element): Camera | null;
    }
}
declare namespace Communicator.Internal.Tree {
    const enum TreeNodeType {
        ProductOccurrence = 0,
        AnyBody = 1,
        BodyInstance = 2,
        CadView = 3
    }
    const enum NodeBits {
        InitiallyShown = 1073741824,
        InitiallyRemoved = 536870912,
        IsShownSpecified = 524288,
        IsShown = 262144,
        IsLoaded = -2147483648
    }
    /**
     * All the information needed to describe a generic node to be added into an assembly tree.
     */
    interface NodeInfo {
        readonly nodeId: AuthoredNodeId | DynamicNodeId;
        readonly bits: NodeBits;
        readonly name: string | null;
        readonly localTransform: SC.Matrix16 | null;
        readonly attributes: SC.DataKey | Attribute[];
        readonly header: AssemblyDataHeader | null;
        readonly exchangeId: ExchangeId | null;
        readonly layerId: AuthoredLayerId | null;
        readonly genericTypeId: GenericTypeId | null;
        readonly genericId: GenericId | null;
        readonly userDatas: Map<UserDataIndex, Uint8Array> | null;
    }
    /**
     * A context is much like a node in that both live in the assembly tree.
     *
     * The difference is that (non-context) nodes are publicly known from a consumer API standpoint.
     *
     * Contexts on the other hand, are internal to the tree's implementation. They exist to inject data into
     * the tree, where nodes can be walked up to the nearest context (by type) to retrieve essential data tied
     * to that node.
     *
     * Since contexts are not publicly known, they are transparently walked through when encountered.
     *
     * For example, when retrieving the children of node N1 below, we get both N2 and N4 as a result instead of only N2.
     * (N1, N2, N3, N4 are nodes, and C1 is a context.)
     *
     * ```
     *      N1
     *     /  \
     *    N2  C1
     *   /      \
     *  N3      N4
     * ```
     *
     */
    type AnyTreeContext = LoadContext | AttachContext | InclusionContext | PrototypeContext;
    /**
     * This type denotes any assembly tree node that contains mesh instances.
     */
    type AnyBody = BodyInstance | PmiBody | ViewFrame;
    /**
     * This type denotes any assembly tree node that can contain other nodes.
     */
    type AnyContainerNode = ProductOccurrence | Pmi | CadView;
    /**
     * This type denotes any assembly tree node that lives in the *tree structure* of the assembly tree.
     */
    type AnyTreeNode = AnyContainerNode | AnyBody;
    /**
     * This type denotes any node that does not live in the *tree structure* of the assembly tree.
     * Note that these nodes are still stored in `AssemblyTree`.
     *
     * (Perhaps this type should be renamed to something else such as "AnyReferenceNode".)
     */
    type AnyNonTreeNode = PartDefinition | RepresentationItem;
    /**
     * This type denotes any assembly tree node regardless of where it lives in the assembly tree.
     */
    type AnyNode = AnyTreeNode | AnyNonTreeNode;
    class Node {
        /**
         * Parses the `NodeInfo` for a node without inserting it into the tree.
         */
        static parseXml(assemblyTree: AssemblyTree, elem: Element, config: LoadSubtreeConfig): NodeInfo;
        /**
         * Parses the `NodeInfo` for a node without inserting it into the tree.
         */
        static parseBinary(assemblyTree: AssemblyTree, parser: AssemblyDataParser, parseBits: NodeParseBits, config: LoadSubtreeConfig): NodeInfo;
        private constructor();
        protected readonly __Node: PhantomMember;
    }
    /**
     * The base functionality of `AnyTreeNode`.
     *
     * As an implementation detail, node classes inherit from this to gain common functionality.
     * As a general rule of thumb, avoid relying on this fact and instead use sum types such as
     * `AnyTreeNode` or `AnyNode`. This avoidance is for maintenance and robustness reasons.
     */
    class NodeMixin<Bits extends number> {
        protected constructor(assemblyTree: AssemblyTree, masterModelKey: SC.MasterModelKey, info: NodeInfo);
        private static _lazyLoadAttributes;
        hasAuthoredId(): boolean;
        getAuthoredId(): AuthoredNodeId;
        getName(): string | null;
        getExchangeId(): ExchangeId | null;
        getAuthoredLayerId(): AuthoredLayerId | null;
        getGenericTypeId(): GenericTypeId | null;
        getGenericId(): GenericId | null;
        protected _hasBits(bits: NodeBits | Bits): boolean;
        isLoaded(): boolean;
        markLoaded(): void;
        protected _setVisibility(visible: boolean): void;
        isVisible(): boolean;
        isInitiallyShown(): boolean;
        private _toAffineTransformation;
        setLocalTransformAsInitial(matrix: SC.Matrix16): void;
        overrideLocalTransform(matrix: SC.Matrix16): void;
        hasLocalTransformOverride(): boolean;
        removeLocalTransformOverride(): void;
        getLocalTransform(): SC.Matrix16 | null;
        getAttributes(): Promise<Attribute[]>;
        addAttribute(attr: Attribute): void;
        getUserDataIndices(): UserDataIndex[];
        getUserData(index: UserDataIndex): Uint8Array;
        protected readonly __NodeMixin: PhantomMember;
        protected readonly _nodeId: AuthoredNodeId | DynamicNodeId;
        private readonly _name;
        protected _bits: NodeBits | Bits;
        private _exchangeId;
        private _layerId;
        private _genericTypeId;
        private _genericId;
        private _lazyAttributes;
        private _attributes;
        private _localTransform;
        private _localTransformOverride;
        private _userDatas;
    }
}
declare namespace Communicator.Internal.Tree {
    type BodyInstanceParent = ProductOccurrence;
    type PmiBodyParent = Pmi;
    type ViewFrameParent = CadView;
    const enum AnyBodyBits {
        OutOfHierarchy = 268435456,
        PreventFromResetting = 16384,
        Requested = 1024,
        ImplicitBody = 512
    }
    const enum BodyTypeBits {
        None = 0,
        BodyInstance = 1,
        PmiBody = 2,
        ViewFrame = 4,
        All = 7
    }
    interface AnyBodyInfo {
        readonly nodeInfo: NodeInfo;
        readonly inclusionKey: SC.InclusionKey;
        readonly instanceKey: SC.InstanceKey;
        readonly bits: AnyBodyBits;
    }
    type BodyInstanceInfo = AnyBodyInfo;
    type PmiBodyInfo = AnyBodyInfo;
    type ViewFrameInfo = AnyBodyInfo;
    class BodyMixin<Parent> extends NodeMixin<AnyBodyBits> {
        protected constructor(assemblyTree: AssemblyTree, masterModelKey: SC.MasterModelKey, parent: Parent, info: AnyBodyInfo);
        setRequested(): void;
        isRequested(): boolean;
        isOutOfHierarchy(): boolean;
        preventFromResetting(): boolean;
        isImplicitBody(): boolean;
        getParent(): Parent;
        protected readonly __BodyMixin: PhantomMember;
        private readonly _parent;
        protected readonly _instanceKey: SC.InstanceKey;
    }
    class BodyInstance extends BodyMixin<BodyInstanceParent> {
        static parseXml(assemblyTree: AssemblyTree, elem: Element, inclusionKey: SC.InclusionKey, config: LoadSubtreeConfig): BodyInstanceInfo;
        static parseBinary(assemblyTree: AssemblyTree, inclusionContext: InclusionContext, parser: AssemblyDataParser, config: LoadSubtreeConfig): BodyInstanceInfo;
        static reify(assemblyTree: AssemblyTree, masterModelKey: SC.MasterModelKey, parent: BodyInstanceParent, info: BodyInstanceInfo): BodyInstance;
        static createDynamic(assemblyTree: AssemblyTree, inclusionKey: SC.InclusionKey, instanceKey: SC.InstanceKey, authoredId: AuthoredNodeId | null, name: string | null, parent: ProductOccurrence, bits: AnyBodyBits): BodyInstance;
        private constructor();
        getName(): string;
        getInstanceInc(): SC.InstanceInc;
        setVisibility(visible: boolean): void;
        getRuntimeId(): RuntimeNodeId;
        protected readonly __BodyInstance: PhantomMember;
    }
    class PmiBody extends BodyMixin<PmiBodyParent> {
        static parseBinary(assemblyTree: AssemblyTree, inclusionContext: InclusionContext, parser: AssemblyDataParser, forceHidden: boolean, config: LoadSubtreeConfig): PmiBodyInfo;
        static reify(assemblyTree: AssemblyTree, masterModelKey: SC.MasterModelKey, parent: PmiBodyParent, info: PmiBodyInfo): PmiBody;
        private constructor();
        getName(): string;
        getInstanceInc(): SC.InstanceInc;
        setVisibility(visible: boolean): void;
        getRuntimeId(): RuntimeNodeId;
        protected readonly __PmiBody: PhantomMember;
    }
    class ViewFrame extends BodyMixin<ViewFrameParent> {
        static parseXml(assemblyTree: AssemblyTree, elem: Element, inclusionKey: SC.InclusionKey, config: LoadSubtreeConfig): ViewFrameInfo;
        static parseBinary(assemblyTree: AssemblyTree, inclusionContext: InclusionContext, parser: AssemblyDataParser, config: LoadSubtreeConfig): ViewFrameInfo;
        static reify(assemblyTree: AssemblyTree, masterModelKey: SC.MasterModelKey, parent: ViewFrameParent, info: ViewFrameInfo): ViewFrame;
        private constructor();
        getName(): string;
        getInstanceInc(): SC.InstanceInc;
        setVisibility(visible: boolean): void;
        getRuntimeId(): RuntimeNodeId;
        protected readonly __ViewFrame: PhantomMember;
    }
}
declare namespace Communicator.Internal.Tree {
    const enum CadViewBits {
        IsAnnotationView = 134217728,
        IsCameraSet = 67108864,
        IsPmiFilteringSet = 33554432,
        IsGeomFilteringSet = 16777216,
        IsCrossSectionSet = 8388608,
        IsExplosionSet = 4194304,
        IsCombineState = 2097152,
        IsPerspective = 1048576,
        HasDynamicFrame = 8192,
        IsDefaultView = 256
    }
    interface CadViewInfo<Id> {
        readonly nodeId: AuthoredNodeId | DynamicNodeId;
        readonly name: string | null;
        readonly camera: Camera | null;
        readonly instanceMarkupKeysToShow: SC.InstanceKey[];
        readonly viewFrameInfo: ViewFrameInfo | null;
        readonly nodesToShow: Id[];
        readonly nodesToHide: Id[];
        readonly transformMap: Map<Id, SC.Matrix16>;
        readonly cuttingPlanes: Plane[];
        readonly bits: CadViewBits;
    }
    type CadViewParent = ProductOccurrence;
    class CadView extends NodeMixin<CadViewBits> {
        static parseXml(assemblyTree: AssemblyTree, elem: Element, inclusionContext: InclusionContext, config: LoadSubtreeConfig): CadViewInfo<AuthoredNodeId>;
        static parseBinary(assemblyTree: AssemblyTree, inclusionContext: InclusionContext, parser: AssemblyDataParser, config: LoadSubtreeConfig): CadViewInfo<AuthoredNodeId>;
        static reify(assemblyTree: AssemblyTree, inclusionContext: InclusionContext, info: CadViewInfo<AuthoredNodeId>, parent: CadViewParent): CadView;
        static createDynamic(assemblyTree: AssemblyTree, parent: CadViewParent, name: string, camera: Camera, pmis: Pmi[], productOccurrencesToShow: RuntimeNodeId[], productOccurrencesToHide: RuntimeNodeId[], transformMap: Map<RuntimeNodeId, SC.Matrix16>, cuttingPlane: Plane | null): CadView;
        private static isAuthoredViewInfo;
        private constructor();
        private static _toRuntimeIds;
        private _loadViewFrame;
        getViewFrame(): ViewFrame | null;
        getParent(): CadViewParent;
        getRuntimeId(): RuntimeNodeId;
        getBranchVisibility(): BranchVisibility;
        setVisibility(visible: boolean): void;
        isPmiFilteringSet(): boolean;
        isDefaultView(): boolean;
        IsCombineState(): boolean;
        deactivate(cuttingManager: AbstractCuttingManager): Promise<void>;
        private _replaceCuttingPlanes;
        activate(assemblyTree: AssemblyTree, engine: AbstractScEngine, callbackManager: CallbackManager, cuttingManager: AbstractCuttingManager, view: AbstractView, duration: number, configurationNode: ProductOccurrence | null): Promise<void>;
        private _activateView;
        private _activateCamera;
        hasPmi(pmi: Pmi): boolean;
        isAnnotationView(): boolean;
        setViewFrame(viewFrame: ViewFrame): void;
        protected readonly __CadView: PhantomMember;
        private readonly _parent;
        private readonly _camera;
        private readonly _instanceMarkupKeysToShow;
        private readonly _nodesToShow;
        private readonly _nodesToHide;
        private _viewFrame;
        private readonly _transformMap;
        private readonly _cuttingPlanes;
    }
}
declare namespace Communicator.Internal.Tree {
    interface PartDefinitionInfo {
        readonly nodeInfo: NodeInfo;
        readonly repItemInfos: RepresentationItemInfo[];
    }
    const enum PartDefinitionBits {
        IsMissing = 4096
    }
    type PartDefinitionReferrer = ProductOccurrence;
    class PartDefinition extends NodeMixin<PartDefinitionBits> {
        static parseXml(assemblyTree: AssemblyTree, elem: Element, config: LoadSubtreeConfig): PartDefinitionInfo;
        static parseBinary(assemblyTree: AssemblyTree, parser: AssemblyDataParser, config: LoadSubtreeConfig): PartDefinitionInfo;
        static reify(assemblyTree: AssemblyTree, inclusionContextForNodeId: InclusionContext, modelKey: SC.ModelKey, info: PartDefinitionInfo): PartDefinition;
        static createDynamic(assemblyTree: AssemblyTree, authoredId: AuthoredNodeId | null, name: string | null): PartDefinition;
        static createMissing(assemblyTree: AssemblyTree): PartDefinition;
        isMissing(): boolean;
        private constructor();
        private _loadRepresentationItems;
        getRuntimeId(): RuntimeNodeId;
        getInclusionContextForNodeId(): InclusionContext;
        addReferrer(referrer: PartDefinitionReferrer): void;
        createRepItem(assemblyTree: AssemblyTree, authoredId: AuthoredNodeId | null): RepresentationItem;
        private _addRepresentationItem;
        getRepresentationItems(): RepresentationItem[];
        getReferrers(): PartDefinitionReferrer[];
        removeAllReferrers(): void;
        getModelKey(): SC.ModelKey;
        protected readonly __PartDefinition: PhantomMember;
        private readonly _inclusionContextForNodeId;
        private readonly _modelKey;
        private _referrers;
        private _repItems;
    }
}
declare namespace Communicator.Internal.Tree {
    enum PmiType {
        Unknown = 0,
        Text = 1,
        Dimension = 2,
        Arrow = 3,
        Balloon = 4,
        CircleCenter = 5,
        Coordinate = 6,
        Datum = 7,
        Fastener = 8,
        Gdt = 9,
        Locator = 10,
        MeasurementPoint = 11,
        Roughness = 12,
        Welding = 13,
        Table = 14,
        Other = 15,
        GeometricalTolerance = 16
    }
    enum PmiSubTypeDatum {
        Ident = 1,
        Target = 2
    }
    enum PmiSubTypeDimension {
        Distance = 1,
        DistanceOffset = 2,
        DistanceCumulate = 3,
        Chamfer = 4,
        Slope = 5,
        Ordinate = 6,
        Radius = 7,
        RadiusTangent = 8,
        RadiusCylinder = 9,
        RadiusEdge = 10,
        Diameter = 11,
        DiameterTangent = 12,
        DiameterCylinder = 13,
        DiameterEdge = 14,
        DiameterCone = 15,
        Length = 16,
        LengthCurvilinear = 17,
        LengthCircular = 18,
        Angle = 19
    }
    enum PmiSubTypeGdt {
        Fcf = 1
    }
    enum PmiSubTypeWelding {
        Line = 1,
        Spot = 2
    }
    enum PmiSubTypeOther {
        SymbolUser = 1,
        SymbolUtility = 2,
        SymbolCustom = 3,
        GeometricReference = 4,
        Region = 5
    }
    class PmiTopologyReference {
        constructor(body: AnyBody);
        readonly body: AnyBody;
        readonly faceIds: number[];
        readonly edgeIds: number[];
    }
    interface PmiInfo {
        readonly nodeId: AuthoredNodeId | DynamicNodeId;
        readonly name: string | null;
        readonly attributesDataKey: SC.DataKey | null;
        readonly pmiBodyInfos: PmiBodyInfo[];
        readonly initiallyShown: boolean;
        readonly pmiType: PmiType;
        readonly pmiSubType: PmiSubType;
        readonly topoRefInfos: ReferenceOnTopologyInfo[];
        readonly topoRefs: ReferenceOnTopology[];
    }
    type PmiParent = ProductOccurrence;
    class Pmi extends NodeMixin<0> {
        static parseBinary(assemblyTree: AssemblyTree, inclusionContext: InclusionContext, parser: AssemblyDataParser, config: LoadSubtreeConfig): PmiInfo;
        static reify(assemblyTree: AssemblyTree, inclusionContext: InclusionContext, pmiInfo: PmiInfo, parent: PmiParent): Pmi;
        static createDynamic(assemblyTree: AssemblyTree, inclusionContext: InclusionContext, parent: PmiParent, pmiName: string | null, pmiType: PmiType, pmiSubType: PmiSubType, pmiBodyInfo: PmiBodyInfo[], topoRefs: ReferenceOnTopology[]): Pmi;
        private constructor();
        private static _loadTopoRefs;
        private _loadPmiBody;
        getPmiBodies(): PmiBody[];
        private static _pack;
        getPmiType(): PmiType;
        getPmiSubType(): PmiSubType;
        getParent(): PmiParent;
        getRuntimeId(): RuntimeNodeId;
        getBranchVisibility(): BranchVisibility;
        setVisibility(visible: boolean): void;
        getPmiTopologyReferences(assemblyTree: AssemblyTree): PmiTopologyReference[];
        protected readonly __Pmi: PhantomMember;
        private readonly _parent;
        private readonly _packed;
        private readonly _pmiBodies;
        private readonly _topoRefs;
    }
}
declare namespace Communicator.Internal.Tree {
    const enum BranchVisibility {
        Hidden = 1,
        Shown = 2,
        Mixed = 3
    }
    const enum ProductBits_Legacy {
        NodeTypeDrawingSheet = 6
    }
    const enum ProductBits {
        IsAConfigurationNode = 1,
        NodeTypeProduct = 2,
        NodeTypeGroup = 4,
        NodeTypeDrawingSheet = 32,
        NodeTypeDrawingView = 8,
        IsADefaultNodeType = 16,
        BranchVisibilityHidden = 131072,
        BranchVisibilityShown = 65536,
        BranchVisibilityDirty = 32768,
        IsMissing = 4096,
        OutOfHierarchy = 268435456,
        IsExternalModelRoot = 2048
    }
    interface ProductOccurrenceInfo {
        readonly nodeInfo: NodeInfo;
        readonly productBits: ProductBits;
        readonly childDataKeys: SC.DataKey[];
        readonly prototypeDataKey: SC.DataKey | null;
        readonly partDefinition: PartDefinitionInfo | SC.DataId | null;
        readonly quickAccessPartDefinitionDataId: SC.DataId | null;
        readonly externalModelInfo: ExternalModelInfo | null;
        readonly bodyInstanceInfos: BodyInstanceInfo[];
        readonly cadViewInfos: CadViewInfo<AuthoredNodeId>[];
        readonly pmiInfos: PmiInfo[];
        readonly measurementUnit: number | null;
        readonly simpleMaterial: SimpleMaterial | null;
        readonly layerInfos: LayerInfo[];
        readonly filters: Filter[];
        readonly relationships: Relationship[];
        readonly bimInfos: BimObject[];
    }
    type ProductOccurrenceParent = ProductOccurrence | InclusionContext | PrototypeContext;
    class ProductOccurrence extends NodeMixin<ProductBits> {
        static parseXml(config: LoadSubtreeConfig, assemblyTree: AssemblyTree, inclusionContext: InclusionContext, elem: Element, toAttachData: ToAttachDataFunc): ProductOccurrenceInfo;
        static parseBinary(config: LoadSubtreeConfig, assemblyTree: AssemblyTree, inclusionContext: InclusionContext, parser: AssemblyDataParser): ProductOccurrenceInfo;
        /**
         * Like `reify` but with a synchronous return result.
         *
         * Usage requirements:
         *      - `info.childDataKeys` must be empty.
         *      - `info.externalModelInfo` must be `null`.
         */
        static reifySync(config: LoadSubtreeConfig, treeLoader: TreeLoader, assemblyTree: AssemblyTree, inclusionContext: InclusionContext, info: ProductOccurrenceInfo, parent: ProductOccurrenceParent): ProductOccurrence;
        static reify(config: LoadSubtreeConfig, treeLoader: TreeLoader, assemblyTree: AssemblyTree, inclusionContext: InclusionContext, info: ProductOccurrenceInfo, parent: ProductOccurrenceParent): Promise<ProductOccurrence>;
        static createDynamic(assemblyTree: AssemblyTree, parent: ProductOccurrenceParent, name: string | null, authoredId: AuthoredNodeId | null, localTransform: SC.Matrix16 | null, visible: boolean, outOfHierarchy?: boolean, measurementUnit?: number | null): ProductOccurrence;
        static createMissing(assemblyTree: AssemblyTree, parent: ProductOccurrenceParent): ProductOccurrence;
        isMissing(): boolean;
        private static _amendInfo;
        private constructor();
        private _loadExternalModel;
        private _loadAndAttachExternalModel;
        loadPendingExternalModels(treeLoader: TreeLoader): Promise<AttachContext[]>;
        private _lazyLoadPartDefinitionByInfo;
        private _lazyLoadPartDefinitionById;
        private static _loadProductOccurrence;
        private _loadPrototypeContext;
        private _loadProductOccurrences;
        private _loadBodyInstances;
        private _loadCadViews;
        private _loadPmis;
        getParent(): ProductOccurrenceParent;
        getRuntimeId(): RuntimeNodeId;
        isAbsoluteRoot(): boolean;
        getPrototype(): PrototypeContext | null;
        isAConfigurationNode(): boolean;
        isADefaultNode(): boolean;
        isAProductNode(): boolean;
        isAGroupNode(): boolean;
        isADrawingSheetNode(): boolean;
        isADrawingViewNode(): boolean;
        addProductOccurrence(node: ProductOccurrence): void;
        addBodyInstance(node: BodyInstance): void;
        addCadView(node: CadView): void;
        addPmi(node: Pmi): void;
        addLoadContext(context: LoadContext): void;
        addAttachContext(context: AttachContext): void;
        private _followPrototypesWhileEmpty;
        getRawPartDefinition(): Promise<Boxed<LazyPromise<PartDefinition>> | null> | LazyPromise<PartDefinition> | null;
        getPartDefinition(): Promise<Boxed<LazyPromise<PartDefinition>> | null>;
        getPartDefinitionSync(): PartDefinition | null;
        private _getChildren;
        getChildren(): Promise<ProductOccurrence[]>;
        getChildrenSync(): ProductOccurrence[];
        tryGetChildrenSync(): ProductOccurrence[] | null;
        forEachChild(callback: (node: ProductOccurrence) => void | Promise<void>): Promise<void>;
        forEachBodyInstance(callback: (node: BodyInstance) => void | Promise<void>): Promise<void>;
        forEachPmi(callback: (node: Pmi) => void | Promise<void>): Promise<void>;
        forEachCadView(callback: (node: CadView) => void | Promise<void>): Promise<void>;
        hasBodyInstances(): boolean;
        getBodyInstances(): BodyInstance[];
        getCadViews(): CadView[];
        getPmis(): Pmi[];
        setMeasurementUnit(unit: number): void;
        unsetMeasurementUnit(): void;
        hasMeasurementUnit(): boolean;
        getMeasurementUnit(): number;
        getPhysicalProperties(): Promise<PhysicalProperties | null>;
        setPartDefinition(partDef: PartDefinition): void;
        setPrototype(prototype: PrototypeContext): void;
        removePrototype(): PrototypeContext;
        getBranchVisibility(): BranchVisibility;
        private _getBranchVisibility;
        private _setBranchVisibility;
        private _updateBranchVisibility;
        private _getSubBranchVisibilities;
        private _itemWasAdded;
        private _onItemRemoved;
        markBranchVisibilityDirty(): void;
        private _markBranchVisibilityDirty;
        setVisibility(visible: boolean): void;
        private _removeDirectChild;
        private _removeIndirectChild;
        removeProductOccurrence(node: ProductOccurrence): boolean;
        removeBodyInstance(node: BodyInstance): boolean;
        purgeContents(): Promise<void>;
        removePartDefinition(): PartDefinition;
        isOutOfHierarchy(): boolean;
        markIsExternalModelRoot(assemblyTree: AssemblyTree): void;
        isExternalModelRoot(): boolean;
        addPendingExternalModel(info: ExternalModelInfo): void;
        hasPendingExternalModels(): boolean;
        protected readonly __ProductOccurrence: PhantomMember;
        private readonly _parent;
        private _partDefinition;
        private _prototypeContext;
        private _children;
        private _childContexts;
        private _pendingExternalModels;
        private _bodyInstances;
        private _cadViews;
        private _pmis;
        private _measurementUnit;
    }
}
declare namespace Communicator.Internal.Tree {
    enum BodyType {
        Unknown = 0,
        BRep = 1,
        Tessellation = 2,
        Wireframe = 3,
        PointCloud = 4
    }
    interface RepresentationItemInfo {
        readonly nodeInfo: NodeInfo;
        readonly meshKey: SC.MeshKey | null;
        readonly bodyType: BodyType;
        readonly faceMeasurementProps: SubentityProperties.Face[];
        readonly edgeMeasurementProps: SubentityProperties.Edge[];
        readonly physicalProps: PhysicalProperties | null;
        readonly faceAttributes: (SubentityAttributes | null)[];
        readonly edgeAttributes: (SubentityAttributes | null)[];
        readonly pointAttributes: (SubentityAttributes | null)[];
    }
    type RepresentationItemParent = PartDefinition;
    class RepresentationItem extends NodeMixin<0> {
        static parseXml(assemblyTree: AssemblyTree, elem: Element, config: LoadSubtreeConfig): RepresentationItemInfo;
        static parseBinary(assemblyTree: AssemblyTree, parser: AssemblyDataParser, config: LoadSubtreeConfig): RepresentationItemInfo;
        static reify(assemblyTree: AssemblyTree, masterModelKey: SC.MasterModelKey, info: RepresentationItemInfo, parent: RepresentationItemParent): RepresentationItem;
        static createDynamic(assemblyTree: AssemblyTree, authoredId: AuthoredNodeId | null, name: string | null, masterModelKey: SC.MasterModelKey, parent: RepresentationItemParent): RepresentationItem;
        private constructor();
        setPhysicalProperties(props: PhysicalProperties): void;
        getPhysicalProperties(): PhysicalProperties | null;
        getParent(): RepresentationItemParent;
        getFaceCount(): number;
        getEdgeCount(): number;
        getFaceAttributes(index: number): SubentityAttributes | null;
        getEdgeAttributes(index: number): SubentityAttributes | null;
        getPointAttributes(index: number): SubentityAttributes | null;
        getFaceMeasurementProperty(index: number): SubentityProperties.Face | null;
        getEdgeMeasurementProperty(index: number): SubentityProperties.Edge | null;
        setFaceMeasurementProperty(index: number, prop: SubentityProperties.Face): void;
        setEdgeMeasurementProperty(index: number, prop: SubentityProperties.Edge): void;
        getBodyType(): BodyType;
        getRuntimeId(): RuntimeNodeId;
        protected readonly __RepresentationItem: PhantomMember;
        private readonly _parent;
        private readonly _bodyType;
        private _physicalProps;
        private _faceMeasurementProps;
        private _edgeMeasurementProps;
        private _faceAttributes;
        private _edgeAttributes;
        private _pointAttributes;
    }
}
declare namespace Communicator.Internal.Tree {
    class Attribute {
        static parseBinary(parser: AssemblyDataParser): Attribute;
        static parseXml(attributeNode: Element): Attribute;
        constructor(type: AttributeType, title: string, valueName: string | null, value: string, unit: UnitElement[]);
        getType(): AttributeType;
        getValueName(): string | null;
        getTitle(): string;
        getValue(): string;
        getUnit(): string;
        copy(): Attribute;
        protected readonly __Attribute: PhantomMember;
        private readonly _type;
        private readonly _valueName;
        private readonly _title;
        private readonly _value;
        private readonly _unit;
    }
}
declare namespace Communicator.Internal.Tree {
    class ColorTable {
        static parseXml(elem: Element): ColorTable;
        constructor(colors: Color[]);
        getColor(colorIndex: number): Color | null;
        protected readonly __ColorTable: PhantomMember;
        private readonly _colorTable;
    }
}
declare namespace Communicator.Internal.Tree {
    class FilterEntities {
        isInclusive: boolean;
        ids: AuthoredNodeId[];
        static parseBinary(parser: AssemblyDataParser): FilterEntities;
        static parseXml(elem: Element): FilterEntities;
    }
    class FilterLayers {
        isInclusive: boolean;
        authoredIds: AuthoredLayerId[];
        static parseBinary(parser: AssemblyDataParser): FilterLayers;
        static parseXml(elem: Element): FilterLayers;
    }
    class Filter {
        isDisplayfilter: boolean;
        name: FilterName | null;
        isActive: boolean;
        layers: FilterLayers | null;
        entities: FilterEntities | null;
        static parseBinary(parser: AssemblyDataParser): Filter;
        static parseXml(elem: Element): Filter;
    }
}
declare namespace Communicator.Internal.Tree {
    const enum AuthoredLayerId {
    }
    interface LayerInfo {
        readonly id: AuthoredLayerId;
        readonly name: LayerName | null;
    }
    class Layer {
        id: LayerId;
        name: LayerName | null;
        readonly nodes: AnyTreeNode[];
        readonly treeNodes: AnyTreeNode[];
        static NoLayerId: number;
        static parseBinary(parser: AssemblyDataParser): LayerInfo;
        static parseXml(elem: Element): LayerInfo | null;
        constructor(id: LayerId, name: LayerName | null, nodes: AnyTreeNode[], treeNodes: AnyTreeNode[]);
    }
}
declare namespace Communicator.Internal.Tree {
    class Material {
        static parseXml(elem: Element): Material;
        private constructor();
        getAmbientColorIndex(): number | null;
        getDiffuseColorIndex(): number | null;
        getEmissiveColorIndex(): number | null;
        getSpecularColorIndex(): number | null;
        getAmbientAlpha(): number;
        getDiffuseAlpha(): number;
        getEmissiveAlpha(): number;
        getSpecularAlpha(): number;
        getShininess(): number;
        private readonly _ambientAlpha;
        private readonly _diffuseAlpha;
        private readonly _emissiveAlpha;
        private readonly _specularAlpha;
        private readonly _shininess;
        private readonly _ambientIndex;
        private readonly _diffuseIndex;
        private readonly _emissiveIndex;
        private readonly _specularIndex;
    }
    class SimpleMaterial {
        static parseXml(elem: Element): SimpleMaterial;
        private constructor();
        getColor(): Color | null;
        getAlpha(): number | null;
        protected readonly __Material: PhantomMember;
        private readonly _color;
        private readonly _alpha;
    }
}
declare namespace Communicator.Internal.Tree {
    class PhysicalProperties {
        static parseBinary(parser: AssemblyDataParser): PhysicalProperties;
        constructor(surfaceArea: number, volume: number, centerOfGravity: Point3);
        protected readonly __PhysicalProperties: PhantomMember;
        readonly surfaceArea: number;
        readonly volume: number;
        readonly centerOfGravity: Point3;
    }
}
declare namespace Communicator.Internal.Tree {
    interface ReferenceOnTopologyInfo {
        readonly bodyInstanceKey: SC.InstanceKey;
        readonly topoItemType: PmiTopoRef;
        readonly itemIndex: number;
    }
    class ReferenceOnTopology {
        static parseBinary(parser: AssemblyDataParser): ReferenceOnTopologyInfo;
        static reify(inclusionContext: InclusionContext, info: ReferenceOnTopologyInfo): ReferenceOnTopology;
        static fromBodyInstance(node: BodyInstance, subElementType: PmiTopoRef, subElementIndex: number): ReferenceOnTopology;
        private constructor();
        getBodyInstanceInc(): SC.InstanceInc;
        getTopoItemType(): PmiTopoRef;
        getItemIndex(): number;
        protected readonly __ReferenceOnTopology: PhantomMember;
        private readonly _inclusionKey;
        private readonly _bodyInstanceKey;
        private readonly _topoItemType;
        private readonly _itemIndex;
    }
}
declare namespace Communicator.Internal.Tree {
    enum BimStatus {
        Undefined = 0,
        Unconnected = 1,
        Connected = 2
    }
    /** Structure of an IFC relationship*/
    interface BimRelationship {
        related: BimObject[];
        relating: BimObject[];
    }
    /** One part of the relationships*/
    interface BimObject {
        category: BimStatus;
        id: BimId;
        name: string;
    }
    class RelationshipRelated {
        relationships: BimObject[];
        static parseBinary(inclusionContext: InclusionContext, parser: AssemblyDataParser): RelationshipRelated;
    }
    class RelationshipRelating {
        relationElt: BimObject;
        static parseBinary(inclusionContext: InclusionContext, parser: AssemblyDataParser): RelationshipRelating;
        static parseXml(elem: Element): RelationshipRelating;
    }
    class Relationship {
        type: RelationshipType;
        related: RelationshipRelated | null;
        relating: RelationshipRelating | null;
        static registerBimId(bimId: BimId, inclusionContext: InclusionContext): void;
        static parseBinary(inclusionContext: InclusionContext, parser: AssemblyDataParser): Relationship;
        static parseXml(elem: Element): Relationship;
    }
    class RelationshipUtils {
        static pushRelatedItemFromParser(relatedParsed: RelationshipRelated): BimObject[];
        static addFromRelatingElt(relationToAdd: Relationship, everyRelationshipByType: Map<RelationshipType, BimRelationship>): void;
        static findBimObjectInArray(relationships: BimObject[], bimObject: BimObject): boolean;
        static addFromRelatedElt(iterRel: Relationship, outEveryRelationships: Map<RelationshipType, BimRelationship>): void;
        static findIndexInRelated(node: BimId, tabUnporcRel: BimObject[]): number;
    }
}
declare namespace Communicator.Internal.Tree {
    class Style {
        static parseXml(elem: Element): Style;
        private constructor();
        getMaterialIndex(): number | null;
        getColorIndex(): number | null;
        protected readonly __Style: PhantomMember;
        private readonly _materialIndex;
        private readonly _colorIndex;
    }
}
declare namespace Communicator.Internal.Tree {
    class Transform {
        static parseBinary(parser: AssemblyDataParser): SC.Matrix16;
        static parseXml(transformNode: Element): SC.Matrix16;
        static getIdentity(): SC.Matrix16;
        static copy(m: SC.Matrix16): SC.Matrix16;
        static isIdentity(m: SC.Matrix16): boolean;
        static multiply(m1: SC.Matrix16, m2: SC.Matrix16): SC.Matrix16;
        private constructor();
        protected readonly __Transform: PhantomMember;
    }
}
declare namespace Communicator.Internal.Tree {
    function forcePartDefinition(node: ProductOccurrence): Promise<void> | void;
    function forcePartDefinitions(startNode: ProductOccurrence): Promise<void>;
}
declare namespace Communicator.Internal.Tree {
    function forcePrototype(node: ProductOccurrence): Promise<void> | void;
    function forcePrototypes(startNode: ProductOccurrence): Promise<void>;
}
declare namespace Communicator.Internal.Tree {
    function gatherInstanceIncs(startNode: AnyTreeNode, allowedTypes: BodyTypeBits, allowOutOfHierarchy: boolean, visited: Set<AnyBody>): Promise<SC.InstanceIncs>;
    function gatherInstanceIncsSync(startNode: AnyTreeNode, allowedTypes: BodyTypeBits, allowOutOfHierarchy: boolean, visited: Set<AnyBody>, restriction: WalkRestriction): SC.InstanceIncs;
    function gatherInstanceIncsByNodeIdsSync(assemblyTree: AssemblyTree, nodeIds: RuntimeNodeId[], allowedTypes: BodyTypeBits, restriction: WalkRestriction): SC.InstanceIncs;
}
declare namespace Communicator.Internal.Tree {
    function gatherParentsOfPendingExternalModels(startNode: AnyTreeNode): Promise<ProductOccurrence[]>;
}
declare namespace Communicator.Internal.Tree {
    function getBoundingByNodeId(assemblyTree: AssemblyTree, engine: AbstractScEngine, nodeIds: RuntimeNodeId[], bodyTypeMask: BodyTypeBits, ignoreInvisible: boolean, tightBounding: boolean): Promise<Box>;
}
declare namespace Communicator.Internal.Tree {
    function getNodeColorMap(startNode: AnyTreeNode, engine: ScEngine, elementType: ElementType): Promise<Map<RuntimeNodeId, Color>>;
}
declare namespace Communicator.Internal.Tree {
    function getVisibilityState(startNode: AnyTreeNode, initialState?: boolean): Promise<VisibilityState>;
}
declare namespace Communicator.Internal.Tree {
    function markContextsLoaded(contexts: (LoadContext | AttachContext)[]): Promise<void>;
}
declare namespace Communicator.Internal.Tree {
    function resetTransforms(startNode: ProductOccurrence): Promise<boolean>;
}
declare namespace Communicator.Internal.Tree {
    function setMeshLevels(engine: AbstractScEngine, startNodes: AnyTreeNode[], meshLevel: number): void;
}
declare namespace Communicator.Internal.Tree {
    function updateScMatrices(engine: AbstractScEngine, callbackManager: CallbackManager, startNodes: AnyTreeNode[], allowOutOfHierarchy: boolean): Promise<void>;
}
declare namespace Communicator.Internal.Tree {
    function updateBodyNodesVisibility(startNode: AnyTreeNode, visibility: boolean): Promise<void>;
    function updateVisibilitiesByAttachment(assemblyTree: AssemblyTree, engine: AbstractScEngine, attachContext: AttachContext, setVisibility: SC.SetVisibility): Promise<void>;
    function updateVisibilities(assemblyTree: AssemblyTree, engine: AbstractScEngine, callbackManager: CallbackManager | null, startNode: ProductOccurrence, nodeToVisibility: Map<AnyTreeNode, boolean>, resetNonAffectedToDefault: boolean, initiallyHiddenStayHidden: boolean | null, configurationNode: ProductOccurrence | null, mode: TreeWalkMode): Promise<void>;
    function synchronizePmiVisibilities(engine: AbstractScEngine, startNode: AttachContext): Promise<void>;
}
declare namespace Communicator.Internal.Tree {
    class WalkerAsync {
        static walk(visitor: Visitor, node: AnyTreeNode | AttachContext | LoadContext, restriction: WalkRestriction): Promise<void>;
        static forceLazyPromises(node: AnyTreeNode | AttachContext | LoadContext): Promise<void>;
        private constructor();
        private _walkAnyTreeNode;
        private _walkRepresentationItem;
        private _walkPartDefinition;
        private _walkAnyBody;
        private _walkPmi;
        private _walkCadView;
        private _walkProductOccurrence;
        private readonly _visitor;
    }
}
declare namespace Communicator.Internal.Tree {
    enum WalkRestriction {
        None = 0,
        LoadedNodesOnly = 1
    }
    interface WalkerGeneric {
        walk(visitor: Visitor, node: AnyTreeNode, restriction: WalkRestriction): Promise<void> | void;
    }
    interface Visitor {
        readonly followProductOccurrence?: (node: ProductOccurrence) => boolean;
        readonly enterProductOccurrence?: (node: ProductOccurrence) => void;
        readonly leaveProductOccurrence?: (node: ProductOccurrence) => void;
        readonly followPartDefinition?: (partDef: PartDefinition) => boolean;
        readonly enterPartDefinition?: (partDef: PartDefinition) => void;
        readonly leavePartDefinition?: (partDef: PartDefinition) => void;
        readonly followRepresentationItem?: (repItem: RepresentationItem) => boolean;
        readonly enterRepresentationItem?: (repItem: RepresentationItem) => void;
        readonly leaveRepresentationItem?: (repItem: RepresentationItem) => void;
        readonly followAnyBody?: (body: AnyBody) => boolean;
        readonly enterAnyBody?: (body: AnyBody) => void;
        readonly leaveAnyBody?: (body: AnyBody) => void;
        readonly followCadView?: (cadView: CadView) => boolean;
        readonly enterCadView?: (cadView: CadView) => void;
        readonly leaveCadView?: (cadView: CadView) => void;
        readonly followPmi?: (pmi: Pmi) => boolean;
        readonly enterPmi?: (pmi: Pmi) => void;
        readonly leavePmi?: (pmi: Pmi) => void;
    }
    class TotalVisitor {
        constructor(visitor: Visitor, restriction: WalkRestriction);
        readonly followProductOccurrence: (node: ProductOccurrence) => boolean;
        readonly enterProductOccurrence: (node: ProductOccurrence) => void;
        readonly leaveProductOccurrence: (node: ProductOccurrence) => void;
        readonly followPartDefinition: (partDef: PartDefinition) => boolean;
        readonly enterPartDefinition: (partDef: PartDefinition) => void;
        readonly leavePartDefinition: (partDef: PartDefinition) => void;
        readonly followRepresentationItem: (repItem: RepresentationItem) => boolean;
        readonly enterRepresentationItem: (repItem: RepresentationItem) => void;
        readonly leaveRepresentationItem: (repItem: RepresentationItem) => void;
        readonly followAnyBody: (body: AnyBody) => boolean;
        readonly enterAnyBody: (body: AnyBody) => void;
        readonly leaveAnyBody: (body: AnyBody) => void;
        readonly followCadView: (cadView: CadView) => boolean;
        readonly enterCadView: (cadView: CadView) => void;
        readonly leaveCadView: (cadView: CadView) => void;
        readonly followPmi: (pmi: Pmi) => boolean;
        readonly enterPmi: (pmi: Pmi) => void;
        readonly leavePmi: (pmi: Pmi) => void;
    }
}
declare namespace Communicator.Internal.Tree {
    class WalkerSync {
        static walk(visitor: Visitor, node: AnyTreeNode, restriction: WalkRestriction): void;
        private constructor();
        private _walkRepresentationItem;
        private _walkPartDefinition;
        private _walkAnyBody;
        private _walkPmi;
        private _walkCadView;
        private _walkProductOccurrence;
        private readonly _visitor;
    }
}
declare namespace Communicator.Internal {
    class CuttingPlane {
        plane: Plane;
        referenceGeometry: Point3[] | null;
        meshId: MeshId | null;
        instanceNodeId: NodeId | null;
        color: Color;
        lineColor: Color;
        opacity: number;
        matrix: Matrix;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        fromJson(json: Object): void;
        getMatrix(): Matrix;
        setMatrix(matrix: Matrix): void;
        setReferenceGeometry(referenceGeometry: Point3[] | null): void;
        getReferenceGeometry(): Point3[] | null;
        createMeshData(): MeshData | null;
    }
}
declare namespace Communicator {
    /**
     * Object representing an individual cutting section, more information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/scene_attributes/cutting-planes.html).
     * A cutting section groups up to 6 cutting planes together and behaves independently of other cutting sections.
     */
    class CuttingSection {
        private readonly _viewer;
        private readonly _model;
        private readonly _callbackManager;
        private readonly _cuttingManager;
        private readonly _engine;
        private readonly _cuttingPlanes;
        private _isActive;
        /** @hidden */
        constructor(viewer: WebViewer, model: Model, callbackManager: Internal.CallbackManager, cuttingManager: CuttingManager, engine: Internal.ScEngine);
        /** @hidden */
        private static deprecated;
        /**
         * Adds a plane to the cutting section.
         * @param plane The plane to be used for cutting.
         * @param referenceGeometry An optional list of four points representing a quad to be used as reference geometry for the cutting plane. Pass null to use no reference geometry for this cutting plane.
         */
        addPlane(plane: Plane, referenceGeometry?: Point3[] | null): Promise<boolean>;
        /**
         * Sets a plane currently in the cutting section at a given index.
         * @param index The index of the cutting plane to replace.
         * @param plane The plane to be used for cutting.
         * @param referenceGeometry a list of four points representing a quad to be used as reference geometry for the cutting plane. Pass null to use no reference geometry for this cutting plane.
         */
        setPlane(index: number, plane: Plane, referenceGeometry?: Point3[] | null): Promise<void>;
        /**
         * Updates the position of a cutting plane and stand-in geometry if present.
         * @param index The index of the cutting plane.
         * @param plane The plane to use for cutting.
         * @param geometryMatrix A matrix that is multiplied by the previous position matrix to update the geometry position.
         * @param finalizePosition If true, sets the result of the geometry matrix multiplication as the new position matrix.
         * @param resetTranslation If true, uses the provided geometry matrix for the geometry position.
         */
        updatePlane(index: number, plane: Plane, geometryMatrix?: Matrix, finalizePosition?: boolean, resetTranslation?: boolean): Promise<void>;
        /**
         * Removes the cutting plane at the specified index.
         * @param index The index of the cutting plane to remove.
         */
        removePlane(index: number): Promise<void>;
        /**
         * Gets the plane for the item at the given index. In the case of an invalid index, null will be returned.
         * @param index The index of the cutting plane.
         * @returns Plane that is used for cutting at the given index or null.
         */
        getPlane(index: number): Plane | null;
        /**
         * Gets the [[NodeId]] for the reference geometry for the cutting plane at the given index.
         * In the case of an invalid index or a cutting plane with no reference geometry, null will be returned.
         * @param index the index of the cutting plane.
         * @returns [[NodeId]] of the reference geometry for the cutting plane at the given index or null.
         */
        getNodeId(index: number): NodeId | null;
        /**
         * Gets the reference geometry for the item at the given index. In the case of an invalid index, null will be returned
         * @param index The index of the cutting plane.
         * @returns A list of four points representing a quad to be used as reference geometry for the cutting plane, or null if there is no reference geometry.
         */
        getReferenceGeometry(index: number): Point3[] | null;
        /**
         * Gets the index of a plane for the corresponding node id. In the case of an invalid id, null will be returned.
         * @param id The [[NodeId]] for the plane reference geometry.
         * @returns The index of a plane associated with the provided [[NodeId]], or null if no plane is found.
         */
        getPlaneIndexByNodeId(id: NodeId): number | null;
        /**
         * Sets the opacity for the plane at the given index.
         * @param index The index of the cutting plane.
         * @param opacity A number between 0 and 1.
         */
        setPlaneOpacity(index: number, opacity: number): void;
        /** @deprecated use [[setPlaneOpacity]] instead. */
        setPlaneTransparency(index: number, transparency: number): DeprecatedPromise;
        /** @deprecated use [[setPlaneOpacity]] instead. */
        setItemTransparency(index: number, transparency: number): DeprecatedPromise;
        /**
         * Sets the color for all planes in the cutting section
         * @param color Color to set
         * @returns Promise that resolves when the operation has completed.
         */
        setColor(color: Color): DeprecatedPromise;
        /**
         * Sets the opacity for all planes in the cutting section
         * @param opacity opacity to set
         */
        setOpacity(opacity: number): void;
        /** @deprecated use [[setOpacity]] instead. */
        setTransparency(transparency: number): DeprecatedPromise;
        /**
         * Gets the number of planes in this cutting secton.
         * @returns the number of planes in this cutting section
         */
        getCount(): number;
        /**
         * Removes all planes from this cutting section. This will also deactivate the cutting section.
         */
        clear(): Promise<void>;
        /**
         * Activates a cutting section for use. A cutting section must have at least one plane to be activated.
         * @returns a promise if the cutting section was activated.
         */
        activate(): Promise<void>;
        /**
         * Removes a cutting section from use.
         */
        deactivate(): Promise<void>;
        /**
         * Gets whether a cutting section is active
         * @returns boolean value indicating whether this cutting section is active
         */
        isActive(): boolean;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        fromJson(json: Object): Promise<void>;
        private _initCuttingPlanesByNodeId;
        private _destroyGeometry;
        /** @hidden */
        _getInstanceNodeIds(): NodeId[];
        private _resetCuttingPlane;
        private _createInstanceGeometry;
        private _destroyMeshes;
        private _createCuttingPlaneGeometry;
    }
}
declare namespace Communicator.Internal {
    const emptyBytes: Uint8Array;
    function copyArray<T>(xs: T[]): T[];
    function append<T>(xs: T[], ys: T[]): void;
    function last<T>(xs: T[]): T;
    function all(results: boolean[]): boolean;
    function chunkify<T>(xs: T[], chunkCapacity: number): T[][];
    function mapInPlace<X, Y>(xs: X[], f: (x: X) => Y): Y[];
    function concatInPlace<T>(destinationArray: T[], otherArray: T[]): void;
    function concatAll<T>(xss: T[][]): T[];
}
declare namespace Communicator.Util {
    /**
     * This function takes an array of type <T>, and a predicate function to test each element of the array.
     * This function does not create a new array.
     * @param xs Array to filter.
     * @param pred If this function returns true when testing an item, the item will be kept in the array, otherwise the item will be removed.
     */
    function filterInPlace<T>(xs: T[], pred: (x: T) => boolean): void;
}
declare namespace Communicator.Internal {
    /**
     * A bidirectional map.
     */
    class Bimap<Left, Right> {
        set(left: Left, right: Right): void;
        getLeft(right: Right): Left | undefined;
        getRight(left: Left): Right | undefined;
        private readonly _leftToRight;
        private readonly _rightToLeft;
    }
}
declare namespace Communicator.Internal {
    class Boxed<T> {
        static create<T>(value: T): Boxed<T>;
        constructor(value: T);
        protected readonly __Boxed: PhantomMember;
        readonly value: T;
    }
}
declare namespace Communicator.Internal {
    class Clock {
        stop(): void;
        isTicking(): boolean;
        tickFor(duration: Milliseconds): void;
        private _remainingDuration;
        private _refreshCurrentTime;
        private _currentTime;
        private _stopTime;
    }
}
declare namespace Communicator.Internal {
    const enum VolumeTestResult {
        Outside = 0,
        PartiallyInside = 1,
        FullyInside = 2
    }
    class ConvexVolume {
        private constructor();
        static fromPlaneCoefficients(coeffsList: Point4[]): ConvexVolume;
        static createFrustumFromMatrix(matrix: Matrix): ConvexVolume;
        testAxisAlignedBox(center: Vector3, extent: Vector3): VolumeTestResult;
        axisAlignedBoxNotOutside(center: Vector3, extent: Vector3): boolean;
        sphereNotOutside(center: Vector3, squaredRadius: number): boolean;
        sphereFullyInside(center: Vector3, squaredRadius: number): boolean;
        pointInside(point: Vector3): boolean;
        private readonly _planes;
        private readonly _absPlanes;
        private readonly _signs;
        private readonly _distanceScale;
    }
}
declare namespace Communicator.Internal {
    class FetchApi {
        static _enabled: boolean;
        static isSupported(): boolean;
        static request(url: string): Promise<Response>;
    }
}
declare namespace Communicator.Internal {
    function nop(): void;
    function identity<T>(x: T): T;
}
declare namespace Communicator.Internal {
    function httpRequest(filename: string, responseType?: XMLHttpRequestResponseType): Promise<XMLHttpRequest>;
    function httpRequestBuffer(filename: string): Promise<Uint8Array>;
}
declare namespace Communicator.Util {
    /**
     * Performs a shallow copy of a Map.
     * @param input The Map to be copied
     */
    function copyMap<K, V>(input: Map<K, V>): Map<K, V>;
    /**
     * Performs a shallow copy of a Set.
     * @param input The Map to be copied
     */
    function copySet<T>(input: Set<T>): Set<T>;
    /**
     * Creates a Set from the provided array.
     * @param xs Array to create a Set from
     */
    function toSet<T>(xs: T[]): Set<T>;
}
declare namespace Communicator.Util {
    type LazyLike<T> = Lazy<T> | (() => T);
    /**
     * This is used to delay the evaluation of a value.
     *
     * Evaluation is completely deferred until `get()` is called.
     * Evaluation happens no more than once and the obtained value
     * is cached for later calls to `get()`.
     *
     * ---
     *
     * Example:
     * ```
     * const x = Lazy.create(() => {
     *     console.log("evaluating (x)")
     *     return 5;
     * });
     * console.log("created (x)");
     * console.log(`(x) is ${x.get()}`);
     * console.log(`(x+1) is ${x.get()+1}`);
     *
     * // *** Console Output ***
     * // created (x)
     * // evaluating (x)
     * // (x) is 5
     * // (x+1) is 6
     * ```
     *
     * ---
     *
     * Note: Unlike `LazyObject<T>`, this can have any type `T`.
     */
    class Lazy<T> {
        /**
         * Creates a new lazy value, which is the result of the supplied function
         * once the lazy value is forced.
         */
        static create<T>(value: () => T): Lazy<T>;
        private constructor();
        /**
         * Forces the lazy value given at construction and returns it.
         */
        get(): T;
        protected readonly __Lazy: Internal.PhantomMember;
        private _deferredValue;
        private _resolvedValue?;
    }
}
declare namespace Communicator.Internal {
    type LazyLike<T> = Util.LazyLike<T>;
    type Lazy<T> = Util.Lazy<T>;
    const Lazy: typeof Util.Lazy;
    /**
     * This is a more space-concious variant of `Lazy<T>`, but restricts the allowed types for `T`.
     */
    class LazyObject<T extends object | null> {
        /**
         * Creates a new lazy value, which is the result of the supplied function
         * once the lazy value is forced (or the value itself if a `T` is directly supplied).
         */
        static create<T extends object | null>(value: (() => T) | T): LazyObject<T>;
        private constructor();
        /**
         * Forces the lazy value given at construction and returns it.
         */
        get(): T;
        protected readonly __LazyObject: PhantomMember;
        private _value;
    }
    /**
     * This is a more space-concious variant of `LazyObject<T>`, but restricts the allowed types for `T` even further.
     *
     * Warning:
     *
     * `T` must not be itself of type `Promise` or `LazyObject`. The compiler cannot enforce this.
     *
     */
    class LazyPromise<T extends object | null> implements PromiseLike<T> {
        /**
         * Creates a new lazy value, which is the result of the supplied function
         * once the lazy value is forced (or the value itself if a `T` is directly supplied).
         */
        static create<T extends object | null>(value: T | Promise<T> | LazyObject<T | Promise<T>> | (() => T | Promise<T>)): LazyPromise<T>;
        private constructor();
        /**
         * Returns whether or not this has been both forced (lazy).
         * This says nothing about resolution (promise).
         */
        isUnforced(): boolean;
        /**
         * Returns whether or not this has been both forced (lazy) and resolved (promise).
         */
        isResolved(): boolean;
        /**
         * Returns the final promised value synchronously.
         *
         * This is only legal to call if `isResolved()` returns `true`.
         *
         */
        getResolved(): T;
        /**
         * Forces the lazy promise and then delegates to the forced promise's `then()` method.
         *
         * Note: This intentionally returns a normal `Promise`, not a `LazyPromise`.
         */
        then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
        private _rectifyResult;
        protected readonly __LazyPromise: PhantomMember;
        private _value;
    }
}
declare namespace Communicator.Internal {
    interface NumberMap<V> {
        [x: number]: V | undefined;
    }
    interface StringMap<V> {
        [x: string]: V | undefined;
    }
    /**
     * Uses `parseInt()` to work around bugs on Internet Explorer when
     * negative integers from different sources are used as keys.
     */
    function fromIntegerMap<K extends number, V>(obj: NumberMap<V> | Map<K, V>): Map<K, V>;
    function toIntegerMap<K extends number, V>(map: NumberMap<V> | Map<K, V>): NumberMap<V>;
    /**
     * Uses `Number()`. May lead to bugs on Internet Explorer when
     * negative integers from different sources are used as keys.
     */
    function fromRealNumberMap<K extends number, V>(obj: NumberMap<V> | Map<K, V>): Map<K, V>;
    function fromStringMap<K extends string, V>(obj: StringMap<V> | Map<K, V>): Map<K, V>;
}
declare namespace Communicator.Internal {
    /**
     * Used to emulate nominal typing in Typescript's structural typing environment.
     *
     * ---
     *
     * Usage:
     * ```
     * protected readonly __YourClassName: PhantomMember;
     * ```
     *
     * and never initialize the phantom member.
     */
    type PhantomMember<T = void> = undefined | T;
    /**
     * A useful tool for stubbing Work-In-Progress features (in your personal Git branches).
     * Call to create the stub. You can return the function call too in order to satisfy
     * the compiler. You can pass in any unused arguments or local variables to silence
     * unused variable warnings.
     *
     * This function unconditionally throws `InternalLogicError`.
     *
     * ---
     *
     * Example:
     * ```
     * public foo(x: number) {
     *     return Todo(x);
     * }
     * ```
     */
    function Todo(..._args: any[]): never;
    /**
     * Indicates a `Promise` that is being discarded unintentionally.
     *
     * Uses of this type should ultimately be replaced with proper handling of
     * the `Promise`s. Intentionally discarded `Promise`s should be marked with
     * [[Unreferenced]] instead.
     */
    type UnusedPromise = any;
}
declare namespace Communicator.Util {
    /**
     * This purpose of this function is guarantee a value is of a given type.
     *
     * This is essentially a compile time `console.assert(x instanceof T)`.
     *
     * This function is useful when terminating a type-narrowing if-else chain in that
     * this function makes the code more robust to future type changes.
     *
     * ---
     *
     * Warning:
     *
     * `T=never` doesn't appear to work properly, hence the existence of `TypeAssertNever`.
     *
     * ---
     *
     * Example:
     * ```
     * declare const x: Foo | Bar;
     * if (x instanceof Foo) {
     *     console.log("foo");
     * }
     * else {
     *     // This becomes a compiler error if, for example, `x`'s type gets changed to add `Baz`:
     *     //    x: Foo | Bar | Baz
     *     TypeAssert<Bar>(x);
     *     console.log("bar");
     * }
     * ```
     */
    function TypeAssert<T>(_x: T): void;
    /**
     * See `TypeAssert` for details.
     *
     * This is useful for making the compiler enforce fully-covered switch statements.
     *
     * This function unconditionally throws `InternalLogicError`.
     *
     * ---
     *
     * Example:
     * ```
     *  switch (x) {
     *      case Enum.A:
     *          break;
     *      case Enum.B:
     *          break;
     *      default:
     *          TypeAssertNever(x); // compiler complains if missing other enum cases
     *  }
     * ```
     *
     */
    function TypeAssertNever(_x: never): never;
}
declare namespace Communicator.Internal.CompileTime {
    /**
     * This is simply a named constant for `true`.
     * This is for both documentation purposes as well as eliminating unwanted dead code detection.
     */
    const enable: boolean;
    /**
     * This is simply a named constant for `false`.
     * This is for both documentation purposes as well as eliminating unwanted dead code detection.
     */
    const disable: boolean;
}
declare namespace Communicator.Internal {
    type CompareGreater<T> = (this: void, x: T, y: T) => boolean;
    /**
     * Example:
    ```
    const q = new PriorityQueue<number>((x, y) => x < y);
    q.push(2);
    q.push(3);
    q.push(1);
    q.pop() === 1;
    q.pop() === 2;
    q.pop() === 3;
    ```
     *
     */
    class PriorityQueue<T> {
        constructor(comparator: CompareGreater<T>);
        clear(): void;
        readonly length: number;
        peek(): T;
        push(value: T): void;
        pop(): T;
        replace(value: T): T;
        private _greater;
        private _swap;
        private _siftUp;
        private _siftDown;
        private readonly _heap;
        private readonly _comparator;
    }
}
declare namespace Communicator.Util {
    /**
     * This function behaves like writing [[Promise.all(promises).then(no_op)]] but does not incur the overhead of creating a [[.then]] promise.
     * Using this function can provide a performance boost when doing large amounts of batch processing with groups of promises.
     * @param promises array of promises.
     */
    function waitForAll(promises: Promise<void>[]): Promise<void>;
}
declare namespace Communicator.Internal {
    class Queue<T> {
        constructor();
        clear(): void;
        readonly length: number;
        push(x: T): void;
        pop(): T;
        private _head;
        private _tail;
        private _size;
    }
}
declare namespace Communicator.Internal {
    /**
     * https://en.wikipedia.org/wiki/Rose_tree
     */
    class RoseTree<T> {
        constructor(value: T, kids: RoseTree<T>[]);
        protected readonly __RoseTree: PhantomMember;
        readonly value: T;
        readonly kids: RoseTree<T>[];
    }
}
declare namespace Communicator.Util {
    /**
     * Turns a Set<T> into an Array<T>.
     * @param set The set to convert.
     * @returns The resulting array.
     */
    function setToArray<T>(set: Set<T>): T[];
    /**
     * Returns a new set consisting of all elements in `setA` not found in `setB`.
     * @param setA The starting set to start subtracting from.
     * @param setB The set used to reject values from `setA`.
     * @returns The resulting set.
     */
    function setSubtraction<T>(setA: Set<T>, setB: Set<T>): Set<T>;
}
declare namespace Communicator.Util {
    namespace StateMachine {
        /**
         * @interface Action common interface for action with and without payload.
         */
        interface Action<ActionName, Payload = void> {
            name: ActionName;
            payload: Payload;
        }
        /**
         * @type {StateReducer<State, ActionNames>} The signature of the
         * function that will handle actions.
         *
         * It takes the current state and the action and returns the
         * next state.
         *
         * @param state the current state of the state machine
         * @param action the action that triggered the reducer
         *
         * @returns {State} the next state of the state machine
         */
        type StateReducer<State, ActionNames> = (state: State, action: Action<ActionNames, any>) => State;
    }
    /**
     * @class StateMachine<State, ActionNames> is a minimalist state machine
     *
     * @template {State} State The type of the state
     * @template {ActionNames} ActionNames a string union of the action names
     */
    class StateMachine<State, ActionNames> {
        /**
         * @member {State} _state the current state of the StateMachine
         */
        private _state;
        /**
         * @member {StateReducer<State, ActionNames>} _reducer the reducer of the StateMachine
         */
        private _reducer;
        constructor(state: State, reducer: StateMachine.StateReducer<State, ActionNames>);
        /**
         * Handle an action and update the state
         *
         * @param evt The action to handle
         * @param payload The payload if any
         */
        handle(evt: ActionNames, payload?: any): void;
    }
}
declare namespace Communicator.Internal {
    interface WindowWithEscape extends Window {
        escape(s: string): string;
    }
    function utf8ArrayToStr(bytes: Uint8Array): string;
    function isBase10Number(s: string): boolean;
    function compressUint(n: number): string;
    function zeroPadHex32(n: number): string;
}
declare namespace Communicator.Internal {
    /**
     * This type represents a space efficient array representation by being:
     *
     * (a) `X` if length is 0.
     *
     * (b) `T` if length is 1.
     *
     * (c) `T[]` if length is greater than 1.
     *
     * Neither `null` or `undefined` should inhabit the type `T`. Doing otherwise is an error.
     */
    type TerseArray0<T, X extends null | undefined> = T[] | T | X;
    /**
     * This type represents a non-empty space efficient array representation by being:
     *
     * (a) `T` if length is 1.
     *
     * (b) `T[]` if length is greater than 1.
     *
     * Neither `null` or `undefined` should inhabit the type `T`. Doing otherwise is an error.
     */
    type TerseArray1<T> = T[] | T;
}
declare namespace Communicator.Internal.TerseArray {
    function isEmpty<T>(xs: TerseArray0<T, null | undefined>): boolean;
    /**
     * Converts a `TerseArray0` into an `Array`.
     * If the `TerseArray0` is represented by an actual `Array`, a copy is returned.
     * @param xs The `TerseArray0` to convert.
     * @returns The resulting `Array`.
     */
    function toArray<T>(xs: TerseArray0<T, null | undefined>): T[];
    /**
     * Converts an `Array` into a `TerseArray0`.
     * The converted `TerseArray0` output may be a reference of the input `Array` (as in not a copy).
     * @param xs The `Array` to convert.
     * @returns The resulting `TerseArray0`.
     */
    function fromArray<T>(xs: T[]): TerseArray0<T, null>;
    /**
     * Appends an item to the end of a `TerseArray0`.
     * The returned `TerseArray1` may be a reference of the underlying `Array` in the original
     * `TerseArray0` object (if represented as such).
     * @param xs The `TerseArray0` to push an element into.
     * @param x The item to push into the array.
     * @returns The resulting `TerseArray1` with the appended element.
     */
    function push<T>(xs: TerseArray0<T, null | undefined>, x: T): TerseArray1<T>;
}
declare namespace Communicator.Util {
    const enum TimerIdleType {
        BeforeAction = 0,
        AfterAction = 1
    }
    /**
     * This class represents a single time-delayed action.
     */
    class Timer {
        private _timerId;
        private _action;
        private _beforeActionIdlePromise;
        private _afterActionIdlePromise;
        /**
         * Returns true if no pending action exists and false otherwise.
         */
        isIdle(type: TimerIdleType): boolean;
        /**
         * Returns a promise that resolves when the timer becomes (or already is) idle.
         */
        waitForIdle(type: TimerIdleType): Promise<void>;
        private _triggerIdlePromise;
        private _clearTimeout;
        /**
         * Clears the pending action if it exists.
         */
        clear(): void;
        /**
         * Sets a new delayed action. If one is already pending before this call is made, it gets cleared.
         * @param delay The delay in milliseconds to pend the action.
         * @param action The action to pend.
         */
        set(delay: number, action: () => void): void;
    }
}
declare namespace Communicator.Internal.Unicode {
    const Subscript1 = "\u00B9";
    const Subscript2 = "\u00B2";
    const Subscript3 = "\u00B3";
    const SubscriptNeg = "\u207B";
    const Ohm = "\u2126";
}
declare namespace Communicator.Internal {
    type Vector3 = [number, number, number];
    type Vector4 = [number, number, number, number];
    function toVec3(v: Point3): Vector3;
    function cwiseAbs3(v: number[]): Vector3;
    function cwiseProduct3(u: number[], v: number[]): Vector3;
    function add3(u: Vector3, v: Vector3): Vector3;
    function sub3(u: Vector3, v: Vector3): Vector3;
    function add4(u: Vector4, v: Vector4): Vector4;
    function sub4(u: Vector4, v: Vector4): Vector4;
    function dot3(u: number[], v: number[]): number;
    function squaredNorm3(v: number[]): number;
    function norm3(v: number[]): number;
    function scale3(k: number, v: Vector3): Vector3;
    function toVec4(v: Point4): Vector4;
    function row4(matrix: Matrix, rowIndex: number): Vector4;
    function col4(matrix: Matrix, colIndex: number): Vector4;
    function squaredNorm4(v: number[]): number;
    function scale4(k: number, v: Vector4): Vector4;
    function projectSquaredSize(center: Vector3, squaredSize: number, viewProjectionW: Vector4): number;
}
declare namespace Communicator.Util {
    /**
     * A queue of [Action]s to be evaluated. Some number of actions are allowed to be active at once
     * Settable via the constructor.
     */
    class ActionQueue {
        /**
         * Creates a new [ActionQueue]
         * @param maxActivePromises Max number of promises to leave open before they begin getting deferred
         * @param suppressFailures Whether or not rejected promises and actions that throw cause the queue to fail
         */
        constructor(maxActivePromises: number, suppressFailures: boolean);
        /**
         * Returns `true` if there are no actions waiting to be evaluated
         * @returns Boolean indicating idle status
         */
        isIdle(): boolean;
        /**
         * Returns a `Promise<void>` that resolves when all actions have been completed or rejects if there
         * was a failure
         *
         * It should be noted that if the queue is configured not to suppress failures and an action throws an error,
         * any deferred actions (actions that were queued but not active at the time of the failure) will be
         * cleared from the queue and will not be evaluated
         * @returns A promise that resolves/rejects when all actions have been completed
         */
        waitForIdle(): Promise<void>;
        /**
         * Pushes a new [ActionLike] to be evaluated onto the queue
         * @param action
         */
        push(action: ActionLike): void;
        private _immediateAction;
        private _finalizePromise;
        private _tryActivateIdlePromise;
        private readonly _deferredActions;
        private _failed;
        private _failureError;
        private readonly _maxActivePromises;
        private _activePromiseCount;
        private _idlePromise;
        private readonly _suppressFailures;
    }
}
declare namespace Communicator.Util {
    type ActionResult = Promise<void> | void;
    type Action = Lazy<ActionResult>;
    type ActionLike = LazyLike<ActionResult>;
    /**
     * This class encapsulates execution of a single action at a time.
     * You set the action to execute, which waits on the currently executing
     * action and kills any pending ones.
     *
     * This class can be thought of as an `Action` queue  that limits to 1 action
     * running at a time, and if any new actions are pushed into it, the queue's
     * pending actions are cleared. (The actively running action will not get
     * cancelled.)
     */
    class CurrentAction {
        private _active;
        private _pending;
        private _idlePromise;
        private readonly _suppressFailures;
        /**
         * Creates a new `CurrentAction`.
         * @param suppressFailures Controls whether or not thrown action errors cause `waitForIdle` to throw.
         */
        constructor(suppressFailures: boolean);
        /**
         * Queries the idle state of this object.
         * @return `true` if there are no executing actions and `false` otherwise.
         */
        isIdle(): boolean;
        /**
         * Creates `Promise` that can be used to wait for this object to become idle.
         *
         * If this object was created with `suppressFailures`, then the returned `Promise`
         * never throws. Otherwise action failures (from `this.set`) propagate to the returned `Promise`.
         *
         * @return The idle `Promise`.
         */
        waitForIdle(): Promise<void>;
        /**
         * Sets the action to execute to the one supplied.
         *
         * If this object is idle, then the action is immediately executed,
         * and this object is no longer as long as the action is running.
         *
         * Otherwise if the object is not idle, then action becomes pended
         * and will execute after the current one finishes. If an action is
         * already pended, then the prior pending action is replaced by the
         * newly supplied action and is discarded.
         *
         * @param action
         */
        set(action: ActionLike): void;
        private _advance;
        /**
         * Clears and discards any pending actions. If an action is
         * currently being executed, it remains unaffected by this.
         */
        clear(): void;
    }
}
declare namespace Communicator.Util {
    /**
     * This is like `CurrentAction`, but the `set()` function returns a promise.
     * The returned promise is designed to reject if the set action is
     * pended and another set is called before the action becomes live.
     */
    class CurrentActionSync {
        private readonly _action;
        private _latestPromise;
        private _timestamp;
        isIdle(): boolean;
        /**
         * Returned promise can reject if future calls are made. This is by design.
         */
        set(action: ActionLike): Promise<void>;
        private _advance;
    }
}
declare namespace Communicator.Util {
    /**
     * This represents a `Promise` that has its `resolve` and `reject` functions
     * bundled as methods attached to the promise object.
     */
    interface OpenPromise<T> extends Promise<T> {
        resolve(this: OpenPromise<T>, value: T | PromiseLike<T>): void;
        resolve(this: OpenPromise<void>): void;
        reject(error: any): void;
    }
    namespace OpenPromise {
        /**
         * Creates a new `OpenPromise` that does not have its state resolved or rejected.
         */
        function create<T>(): OpenPromise<T>;
    }
}
declare namespace Communicator.Internal {
    type OpenPromise<T> = Util.OpenPromise<T>;
    const OpenPromise: typeof Util.OpenPromise;
}
declare namespace Communicator.Internal {
    /**
     * This is a cache of keyed `LazyPromise`s.
     */
    class PromiseCache<K extends object | number | string, V extends object | null> {
        clear(): void;
        load(key: K, lazyValue: LazyPromise<V>): Promise<V>;
        private readonly _cache;
    }
}
declare namespace Communicator.Internal {
    class _DeferredPromise<T, U = null> {
        constructor(lazyPromise: Lazy<Promise<T>>, wrapperPromise: OpenPromise<T>, compareValue: U);
        kill(): void;
        cancel(cancelValue: T): void;
        fetch(onAlive: (lazyPromise: Lazy<Promise<T>>) => Promise<T>, onKilled: () => void): void;
        private _lazyPromise;
        private readonly _wrapperPromise;
        readonly compareValue: U | undefined;
    }
    abstract class PromiseQueueImpl<T, U, DeferredContainer extends {
        length: number;
    }> {
        protected constructor(maxActivePromises: number, emptyContainer: DeferredContainer, failureFailsAll: boolean);
        maxActivePromises(): number;
        activePromiseCount(): number;
        isIdle(): boolean;
        waitForIdle(): Promise<void>;
        killDeferred(): void;
        protected _push<S extends T>(lazyPromise: LazyLike<Promise<S>>, compareValue: U): Promise<S>;
        protected abstract _queue(promise: _DeferredPromise<T, U>): void;
        protected abstract _dequeue(): _DeferredPromise<T, U>;
        protected _resort(): void;
        protected _drainQueue(): _DeferredPromise<T, U>[];
        protected _deferPromise<S extends T>(lazyPromise: Lazy<Promise<S>>, compareValue: U): Promise<S>;
        private _immediatePromise;
        protected _fetchNext(): void;
        private _finalizePromise;
        protected readonly _deferredPromises: DeferredContainer;
        private readonly _failureFailsAll;
        private _failed;
        private _failureError;
        private readonly _maxActivePromises;
        private _activePromiseCount;
        private _idlePromise;
        protected _latestPromise: Promise<T | void>;
        protected _needsResorting: boolean;
    }
    class PromiseQueue<T> extends PromiseQueueImpl<T, null, Queue<_DeferredPromise<T>>> {
        protected _queue(promise: _DeferredPromise<T>): void;
        protected _dequeue(): _DeferredPromise<T>;
        constructor(maxActivePromises: number, failureFailsAll: boolean);
        push<S extends T>(lazyPromise: LazyLike<Promise<S>>): Promise<S>;
        waitOnLatest(): Promise<void>;
    }
    class PriorityPromiseQueue<T, U> extends PromiseQueueImpl<T, U, PriorityQueue<_DeferredPromise<T, U>>> {
        protected _queue(promise: _DeferredPromise<T, U>): void;
        protected _dequeue(): _DeferredPromise<T, U>;
        constructor(maxActivePromises: number, compare: CompareGreater<U>, failureFailsAll: boolean);
        push<S extends T>(lazyPromise: LazyLike<Promise<S>>, compareValue: U): Promise<S>;
        markDirty(): void;
    }
    /**
     *  A promise queue that will hold at most two promises - one active and one queued. If a new promise
     *  is queued via the push() call, and there is an existing queued promise, the existing
     *  queued promise is deleted in favor of the new one.
     *
     *  Useful when you need an operation to be synchronous, but you want to skip intervening calls. Handling
     *  a mouseMove event is a reasonable example - If 5 moves happen before you finish processing the
     *  the first, you may want to skip the middle ones and go right to the last one.
     */
    class SingleMostRecentPromiseQueue<T> extends PromiseQueue<T> {
        protected _queue(promise: _DeferredPromise<T>): void;
        constructor(failureFailsAll: boolean);
    }
    /**
     * This class is an extension of a promise queue that makes use of an AttachPriorityManager to manage the items in the queue.
     * Dependings on priorities, only a subset of the total items added will be dequeued for retrieval and atttachment.
     * It is possible that this queue may never fully empty if items do not not every have a projected size large enough to pass the cutoff test.
     */
    class StreamCutoffAttachQueue extends PriorityPromiseQueue<ScsBuffer | Response | null, Tree.XmlAttachPriorityProxy> {
        private _cutoffScale;
        private _attachPriorityManager;
        private _cutoffAttachments;
        constructor(cutoffScale: number, attachPriorityManager: Tree.AttachPriorityManager, maxActivePromises: number, compare: CompareGreater<Tree.XmlAttachPriorityProxy>, failureFailsAll: boolean);
        setCutoffScale(cutoffScale: number): void;
        cutoffEnabled(): boolean;
        isEmpty(): boolean;
        killDeferred(): void;
        private _getCutoffValue;
        push<S extends ScsBuffer | Response | null>(lazyPromise: LazyLike<Promise<S>>, compareValue: Tree.XmlAttachPriorityProxy): Promise<S>;
        protected _resort(): void;
        update(): void;
        private _refillQueue;
        private _updateDeferredPromiseArray;
    }
}
declare namespace Communicator.Internal {
    const enum PromiseState {
        Pending = 0,
        Resolved = 1,
        Rejected = 2
    }
    /**
     * This represents a `OpenPromise` that tracks whether or not it has been resolved or rejected.
     */
    interface TrackedOpenPromise<T> extends OpenPromise<T> {
        /**
         * This value is `true` if and only if this promise has been resolved or rejected.
         */
        readonly state: PromiseState;
    }
    namespace TrackedOpenPromise {
        /**
         * Creates a new `TrackedOpenPromise` that does not have its state resolved or rejected.
         */
        function create<T>(): TrackedOpenPromise<T>;
    }
}
declare namespace Communicator.Internal {
    /**
     * This represents a `Promise` that has its promised return value immediately available.
     * The immediate value is unsafe to use (safety depends on specific use cases) until
     * this `UnsafePromise` becomes marked as ready.
     *
     * The primary use case of this would be to synchronously return a reference to an object
     * that needs to wait for an `init(): Promise<void>` function to complete.
     */
    interface UnsafePromise<T> extends Promise<T> {
        /**
         * An unsafe synchronous reference to the value returned through this promise's `then()` callback.
         */
        readonly unsafeValue: T;
        /**
         * This promise resolves once `this.unsafeValue` is safe to access.
         */
        readonly readyPromise: Promise<void>;
        /**
         * This value becomes `true` once `this.readyPromise` resolves. If `this.readyPromise` rejects, this
         * value never becomes `true`.
         */
        readonly isReady: boolean;
    }
    namespace UnsafePromise {
        /**
         * Creates a new `UnsafePromise`.
         * @param promisedValue The value this promise resolves to. (See `this.unsafeValue`.)
         * @param readyPromise The promise used for `this.readyPromise`. (See also `this.isReady`.)
         * @returns A new `UnsafePromise`.
         */
        function create<T>(promisedValue: T, readyPromise: Promise<void>): UnsafePromise<T>;
    }
}
declare namespace Communicator.Event {
    class MouseInputEventBase extends InputEvent {
        private _modifiers;
        private _position;
        private _inputType;
        /** @hidden */
        constructor(positionX: number, positionY: number, modifiers: KeyModifiers, inputType: MouseInputType);
        /**
         * gets the window position of the mouse pointer for this event
         * @returns the mouse position for this event
         */
        getPosition(): Point2;
        /**
         * gets the state of the shift key
         * @returns whether the shift key was down when this event was generated
         */
        shiftDown(): boolean;
        /**
         * gets the state of the alt key
         * @returns whether the alt key was down when this event was generated
         */
        altDown(): boolean;
        /**
         * gets the state of the control key
         * @returns whether the control key was down when this event was generated
         */
        controlDown(): boolean;
        /**
         * gets the state of the command key
         * @returns whether the command key was down when this event was generated
         */
        commandDown(): boolean;
        /**
         * gets the event type
         * @returns the type of mouse event
         */
        getEventType(): MouseInputType;
        /**
         * gets the event modifiers
         * @returns bitwise combination of KeyModifiers
         */
        getModifiers(): KeyModifiers;
    }
    class MouseInputEvent extends MouseInputEventBase {
        private _button;
        private _buttons;
        /**
         * Mouse Event class
         * @param positionX X window position of the mouse
         * @param positionY Y window position of the mouse
         * @param button mouse button associated with this event
         * @param buttons mouse buttons currently pressed with this event
         * @param modifiers bitwise collection of values from KeyModifiers enum
         * @param inputType the type of the event
         */
        constructor(positionX: number, positionY: number, button: Button, buttons: Buttons, modifiers: KeyModifiers, inputType: MouseInputType);
        /**
         * gets the mouse button associated with this event
         * @returns the mouse button for this event
         */
        getButton(): Button;
        /**
         * gets the mouse buttons currently pressed with this event
         * @returns the mouse buttons currently pressed for this event
         */
        getButtons(): Buttons;
    }
    class MouseWheelInputEvent extends MouseInputEventBase {
        private _wheelDelta;
        private _buttons;
        /**
         * Mousewheel Event class
         * @param positionX X window position of the mouse
         * @param positionY Y window position of the mouse
         * @param wheelDelta the direction the mouse wheel moved
         * @param buttons mouse buttons currently pressed with this event
         * @param modifiers bitwise collection of values from KeyModifiers enum
         * @param inputType the type of the event
         * @hidden
         */
        constructor(positionX: number, positionY: number, wheelDelta: number, buttons: Buttons, modifiers: KeyModifiers, inputType: MouseInputType);
        /**
         * Gets the wheel delta for this event. A positive value indicates that the wheel was scrolled Up, while a negative value indicated the wheel was scrolled down.
         * @returns Wheel dela value
         */
        getWheelDelta(): number;
        /**
         * gets the mouse buttons currently pressed with this event
         * @returns the mouse buttons currently pressed for this event
         */
        getButtons(): Buttons;
    }
}
declare namespace Communicator.Event {
    class NodeSelectionEvent {
        private _selection;
        /**
         * Creates a new NodeSelectionEvent
         * @hidden
         */
        constructor(selection: Selection.SelectionItem);
        /**
         * Gets the result of the selection operator.
         * @returns the result of the selection
         */
        getType(): SelectionType;
        /**
         * Gets the selection object.
         * @returns Selection object containing detailed information about the selection
         */
        getSelection(): Selection.SelectionItem;
        /**
         * Creates a no-selection event.
         * @returns Selection event with result set to none.
         * @hidden
         */
        static _createNull(): NodeSelectionEvent;
    }
}
declare namespace Communicator.Event {
    class TouchInputEvent extends InputEvent {
        private _id;
        private _position;
        private _inputType;
        private _buttons;
        /**
         * Touch Event class
         * @param id unique identifier for this touch
         * @param positionX X window position of the touch
         * @param positionY Y window position of the touch
         * @hidden
         */
        constructor(id: number, positionX: number, positionY: number, buttons: Buttons, inputType: TouchInputType);
        /**
         * gets the id this event
         * @returns the unique identifier for this touch
         */
        getId(): number;
        /**
         * gets the window position of the mouse pointer for this event
         * @returns the mouse position for this event
         */
        getPosition(): Point2;
        /**
         * gets the event type
         * @returns the type of touch event
         */
        getEventType(): TouchInputType;
        /**
         * gets the mouse buttons currently pressed with this event
         * @returns the mouse buttons currently pressed for this event
         */
        getButtons(): Buttons;
    }
}
declare namespace Communicator.Internal {
    class EaseInEaseOut {
        static calculate(t: number, a: number, b: number, c: number): number;
        private static _PA;
        private static _PB;
        private static _PC;
    }
}
declare namespace Communicator.Internal {
    class CameraInterpolation {
        private _beginCam;
        private _endCam;
        private _duration;
        private _view;
        private _completeCallback;
        private _startTime;
        private _progress;
        private _positionMoveDelta;
        private _targetMoveDelta;
        private _interpolationUsesRotation;
        private _beginQuaternion;
        private _endQuaternion;
        private _viewVectorLength;
        private _viewVectorLengthDelta;
        private _fieldWidthDelta;
        private _fieldHeightDelta;
        constructor(begin: Camera, end: Camera, duration: number, completeCallback: () => void, view: View);
        isComplete(): boolean;
        getCallback(): (() => void) | null;
        stop(): void;
        start(): void;
        update(): void;
        /**
         * Returns the transpose of the camera's view matrix without the
         * translation component and with the x- and z- axes flipped.
         *
         * Reproduced here because the public version is deprecated.
         */
        private getMatrixFromCamera;
        private _init;
    }
}
declare namespace Communicator.Internal {
    class InterpolationManager {
        private _activeInterpolation;
        private _updateTimer;
        private _updateInterval;
        stop(): void;
        start(interpolation: CameraInterpolation, force?: boolean): boolean;
        update(): void;
    }
}
declare namespace Communicator.Internal {
    class MarkupItemManager {
        private readonly _callbackManager;
        private readonly _domElements;
        private readonly _markupRenderer;
        private readonly _markupItems;
        private _activeView;
        private _selectedMarkup;
        private readonly _pendingUpdateHandleTimer;
        private _pickTolerance;
        constructor(callbackManager: CallbackManager, domElements: DomElements, markupRenderer: Markup.MarkupRenderer);
        shutdown(): void;
        private _updateLater;
        updateLater(): void;
        update(): void;
        registerMarkupItem(markupItem: Markup.MarkupItem): Uuid;
        unregisterMarkupItem(uniqueId: Uuid): void;
        getActiveView(): Markup.MarkupView | null;
        setActiveView(view: Markup.MarkupView | null): Promise<void>;
        renderMarkup(): void;
        renderActiveViewMarkup(): void;
        getPickTolerance(): number;
        setPickTolerance(tolerance: number): void;
        pick(point: Point2): Markup.MarkupItem | null;
        select(markupItem: Markup.MarkupItem | null): void;
        getSelected(): Markup.MarkupItem | null;
    }
}
declare namespace Communicator.Markup.Shape {
    /**
     * This class represents a single circle consisting of a center point and a radius.
     */
    class Circle extends FilledShape {
        private _center;
        private _radius;
        /**
         * Sets the values for the circle
         * @param center the center point of the circle.
         * @radius the circle radius.
         */
        set(center: Point2, radius: number): void;
        /**
         * Gets the center of the circle
         * @returns the circle center
         */
        getCenter(): Point2;
        /**
         * Sets the center of the circle
         * @param the circle center
         */
        setCenter(center: Point2): void;
        /**
         * Gets the radius of the circle
         * @returns the circle radius
         */
        getRadius(): number;
        /**
         * Sets the radius of the circle
         * @param radius the circle radius
         */
        setRadius(radius: number): void;
    }
    /** @hidden */
    class _MarkupCircleData {
        center: Point2;
        radius: number;
        constructor(center: Point2, radius: number);
    }
    /**
     * This class is useful for specifying multiple circles that all share the same visual appearance.
     */
    class CircleCollection extends FilledShape {
        private _circles;
        /**
         * Removes all circles from this collection
         */
        clear(): void;
        /**
         * Adds a circle to the collection
         * @param center circle center
         * @param radius the circle radius
         */
        addCircle(center: Point2, radius: number): void;
        /**
         * Updates a circle in the collection
         * @param index the index of the circle to update
         * @param center circle center
         * @param radius the circle radius
         */
        setCircle(index: number, center: Point2, radius: number): void;
        /**
         * Gets the circles in the collection
         */
        getCircles(): _MarkupCircleData[];
    }
}
declare namespace Communicator.Markup.Shape {
    /**
     * This class represents a single line consisting of two points. P1 is considered the start and P2 is considered the end of the line.
     * Each Point may have its endcap settings adjusted independently.
     */
    class Line extends EndcapShape {
        private _p1;
        private _p2;
        /**
         * Creates a new Line Shape
         * @param p1 Optional first point on the line. If omitted, default value of (0,0) is used.
         * @param p2 Optional second point on the line. If omitted, default value of (0,0) is used.
         * @returns new Line object.
         */
        constructor(p1?: Point2, p2?: Point2);
        /**
         * Sets the points that define the line segment
         * @param p1 first point of the line segment
         * @param p2 second point of the line segment
         */
        set(p1: Point2, p2: Point2): void;
        /**
         * Gets the first point of the line segment
         * @returns the first point of the line segment
         */
        getP1(): Point2;
        /**
         * Sets the first point of the line segment
         * @param p1 first point of the line segment
         */
        setP1(p1: Point2): void;
        /**
         * Gets the second point of the line segment
         * @returns the second point of the line segment
         */
        getP2(): Point2;
        /**
         * sets the first point of the line segment
         * @param p2 second point of the line segment
         */
        setP2(p2: Point2): void;
    }
    /** @hidden */
    class _MarkupLineData {
        p1: Point2;
        p2: Point2;
        constructor(p1: Point2, p2: Point2);
    }
    /**
     * This class is useful for specifying multiple lines that all share the same visual appearance.
     */
    class LineCollection extends EndcapShape {
        private _lines;
        /**
         * Adds a line segment to the collection
         * @param p1 first point of the line segment
         * @param p2 second point of the line segment
         */
        addLine(p1: Point2, p2: Point2): void;
        /**
         * Gets the lines in the collection
         */
        getLines(): _MarkupLineData[];
        /**
         * Removes all line segments from this collection
         */
        clear(): void;
    }
}
declare namespace Communicator.Markup.Shape {
    class TextBoxBase {
        private _padding;
        private _text;
        private _box;
        /** @hidden */
        constructor();
        /** @hidden */
        _assign(other: TextBoxBase): void;
        /**
         * Gets the Text portion of the TextBox. Use the methods on this object to modify the appearance of the text string
         * @returns the text markup object
         */
        getTextPortion(): TextMarkupBase;
        /**
         * Gets the Box portion of the TextBox. Use the methods on this object to modify the appearance of the rectangle around the text string
         * @returns the rectangle markup object.
         */
        getBoxPortion(): RectangleBase;
        /**
         * Gets the Pixel distance between the text and outer rectangle
         * @returns the padding value.
         */
        getPadding(): number;
        /**
         * Sets the Pixel distance between the text and outer rectangle
         * @param padding the padding value.
         */
        setPadding(padding: number): void;
    }
    /**
     * This object encapsulates a text and rectangle object into one entity. Sizing of the box and positioning of the string is handled by the system.
     * This class consists of two portions which control the look and feel of the markup. The text portion controls the styling of the text,
     * while the box portion controls the styling of the outer rectangle.
     */
    class TextBox extends TextBoxBase {
        private _position;
        private _textStr;
        /**
         * Creates a new TextBox Markup Shape.
         * @param position the screen space point of the top left of the box. Default value is (0,0).
         * @param text the text string for the box. Default value is empty string.
         */
        constructor(position?: Point2, text?: string);
        /** @hidden */
        _assign(other: TextBox): void;
        /**
         * Gets the position in screen space of the top-left corner of the TextBox rectangle
         * @returns the TextBox position
         */
        getPosition(): Point2;
        /**
         * Sets the position in screen space of the top-left corner of the TextBox rectangle
         * @param position the TextBox position
         */
        setPosition(position: Point2): void;
        /**
         * Gets the text string for this box
         * @returns the text string
         */
        getTextString(): string;
        /**
         * Sets the text string for this box
         * @param text the text string
         */
        setTextString(text: string): void;
    }
    /**
     * This class is useful for drawing a number of text boxes which share the same visual settings.
     */
    class TextBoxCollection extends TextBoxBase {
        private _textStrings;
        /**
         * Removes all text strings from this collection
         */
        clear(): void;
        /**
         * Adds a string to the collection
         * @param text the text to render
         * @param position the top left position of the text
         */
        addString(text: string, position: Point2): void;
        /**
         * Gets the strings in the collection
         */
        getStrings(): _MarkupTextData[];
    }
}
declare namespace Communicator.Markup {
    /**
     * This class provides an interface for MarkupItems to draw on the canvas.
     */
    interface MarkupRenderer {
        /** @hidden */
        _clear(): void;
        /** @hidden */
        _finalize(): void;
        /**
         * Renders a circle to the markup layer.
         * @param circle the circle to draw.
         * @returns SVG element for the circle. This element is temporary and will not be preserved when the markup is redrawn.
         */
        drawCircle(circle: Shape.Circle): Element;
        /**
         * Renders a collection of circles sharing the same properties to the markup layer.
         * @param circles the collection of circle to render.
         * @returns an array containing SVG elements for each circle. These elements are temporary and will not be preserved when the markup is redrawn.
         */
        drawCircles(circles: Shape.CircleCollection): Element[];
        /**
         * Renders a polyline to the markup layer.
         * @param line the polyline to draw.
         * @returns SVG element for the line. This element is temporary and will not be preserved when the markup is redrawn.
         */
        drawPolyline(polyline: Shape.Polyline): Element;
        /**
         * Renders a collection of polylines sharing the same properties to the markup layer.
         * @param lines the collection of polylines to render.
         * @returns an array containing SVG elements for each line. These elements are temporary and will not be preserved when the markup is redrawn.
         */
        drawPolylines(polylines: Shape.PolylineCollection): Element[];
        /**
         * Renders a polygon to the markup layer.
         * @param polygon the polygon to render.
         * @returns SVG element for the polygon. This element is temporary and will not be preserved when the markup is redrawn.
         */
        drawPolygon(polygon: Shape.Polygon): Element;
        /**
         * Renders a collection of polygons sharing the same properties to the markup layer.
         * @param polygons the collection of polygons to render.
         * @returns an array containing SVG elements for each polygon. These elements are temporary and will not be preserved when the markup is redrawn.
         */
        drawPolygons(polygons: Shape.PolygonCollection): Element[];
        /**
         * Renders a line to the markup layer.
         * @param line the line to render.
         * @returns SVG element for the line. This element is temporary and will not be preserved when the markup is redrawn.
         */
        drawLine(line: Shape.Line): Element;
        /**
         * Renders a collection of lines sharing the same properties to the markup layer.
         * @param lines the collection of lines to render.
         * @returns an array containing SVG elements for each line. These elements are temporary and will not be preserved when the markup is redrawn.
         */
        drawLines(lines: Shape.LineCollection): Element[];
        /**
         * Renders a rectangle to the markup layer.
         * @param rectangle the rectangle to render.
         * @returns SVG element for the rectangle. This element is temporary and will not be preserved when the markup is redrawn.
         */
        drawRectangle(rectangle: Shape.Rectangle): Element;
        /**
         * Renders a collection of rectangles sharing the same properties to the markup layer.
         * @param rectangles the collection of rectangles to render.
         * @returns an array containing SVG elements for each rectangle. These elements are temporary and will not be preserved when the markup is redrawn.
         */
        drawRectangles(rectangles: Shape.RectangleCollection): Element[];
        /**
         * Renders text to the markup layer.
         * @param text the text to render.
         * @returns SVG element for the text. This element is temporary and will not be preserved when the markup is redrawn.
         */
        drawText(text: Shape.Text): Element;
        /**
         * Renders a collection of text sharing the same properties to the markup layer.
         * @param texts the collection of texts to render.
         * @returns an array containing SVG elements for each text. These elements are temporary and will not be preserved when the markup is redrawn.
         */
        drawTexts(texts: Shape.TextCollection): Element[];
        /**
         * Computes the width and height of a string using the given text attributes.
         * @param str the text string to measure.
         * @param textMarkup the properties of the text item to measure.
         * @returns a point object containing the width and height in pixels of the string.
         */
        measureText(str: string, markup: Shape.TextMarkupBase): Point2;
        /**
         * Computes the width and height of a text box.
         * @param textBox the text box to measure.
         * @returns a point object containing the width and height in pixels of the text box.
         */
        measureTextBox(textBox: Shape.TextBox): Point2;
        /**
         * Renders a text box to the markup layer.
         * @param textBox the text box to render.
         * @returns SVG element pair for the text. The first item in this array corresponds to the rectangle. The second item corresponds to the text. These elements are temporary and will not be preserved when the markup is redrawn.
         */
        drawTextBox(textBox: Shape.TextBox): Element[];
        /**
         * Renders a collection of text boxes sharing the same properties to the markup layer.
         * @param textBoxes the collection of text boxes to render.
         * @returns an array containing SVG element pairs for each text box. These elements are temporary and will not be preserved when the markup is redrawn.
         */
        drawTextBoxes(textBoxes: Shape.TextBoxCollection): Element[][];
        /** @hidden */
        _setCanvas(canvas: Element): void;
    }
}
declare namespace Communicator.Markup {
    /** @hidden */
    class _MarkupViewConstruction {
        constructor(markupView: MarkupView, itemResults: boolean[]);
        markupView: MarkupView;
        itemResults: boolean[];
    }
    class MarkupView {
        private _uniqueId;
        private _name;
        private _camera;
        private _explodeMagnitude;
        private _cuttingPlaneData;
        private _lineVisibility;
        private _faceVisibility;
        private _markupItems;
        private _sheetId;
        private _colorMap;
        private _snapshotImage;
        private _defaultVisibility;
        private _visibilityExceptions;
        /** @hidden */
        constructor(uniqueId: Uuid, name: string, camera: Camera, explodeMagnitude: number, cuttingPlaneData: Object, sheetId?: SheetId | null);
        /**
         * Gets the camera of this view
         * @returns the camera of this view
         */
        getCamera(): Camera;
        /**
         * Gets the sheet id for this view
         * @returns the id of the sheet for this view. If no view was active at the time of creation this function will return null.
         */
        getSheetId(): SheetId | null;
        /**
         * Gets the unique identifier of this view
         * @returns unique identifier of this view
         */
        getUniqueId(): Uuid;
        /**
         * Gets the name of this view
         * @returns name of this view
         */
        getName(): string;
        /**
         * Sets the name for this view
         * @param name name to set
         */
        setName(name: string): void;
        /**
         * Gets line visibility setting for this view
         * @returns line visibility setting for this view
         */
        getLineVisibility(): boolean;
        /**
         * Sets line visibility for this view
         * @param lineVisibility line visibility setting for this view
         */
        setLineVisibility(lineVisibility: boolean): void;
        /**
         * Gets face visibility setting for this view
         * @returns face visibility setting for this view
         */
        getFaceVisibility(): boolean;
        /**
         * Sets face visibility for this view
         * @param faceVisibility face visibility setting for this view
         */
        setFaceVisibility(faceVisibility: boolean): void;
        /**
         * Adds a markup item to this view
         * @param markupItem the markup to be added to this view.
         */
        addMarkupItem(markupItem: MarkupItem): void;
        /**
         * Gets an array of markup items associated with this view
         * @returns {boolean} face visibility setting for this view
         */
        getMarkup(): MarkupItem[];
        /**
         * Removes a markup item from the view
         * @param markupItem the markup to be removed from this view.
         * @returns result of the removal operation
         */
        removeMarkup(item: MarkupItem): boolean;
        /**
         * @returns a JSON object with the cutting plane data associated with this view
         */
        getCuttingPlaneData(): Object;
        /**
         * Takes a JSON cutting plane data object and associates it with this view
         * @param cuttingPlaneData
         */
        setCuttingPlaneData(cuttingPlaneData: Object): void;
        /**
         * @returns the explode value associated with this view
         */
        getExplodeMagnitude(): number;
        /**
         * Takes an explode magnitude and associates it with this view
         */
        setExplodeMagnitude(explodeMagnitude: number): void;
        /**
         * @returns A color map associating NodeIds to Colors.
         */
        getColorMap(): Map<NodeId, Color>;
        /**
         * Takes a color map associating NodeIds to Colors and associates it with this view.
         * @param colorMap
         */
        setColorMap(colorMap: Map<NodeId, Color>): void;
        getDefaultVisibility(): boolean;
        setDefaultVisibility(defaultVisibility: boolean): void;
        getVisibilityExceptions(): Set<NodeId>;
        setVisibilityExceptions(nodeIds: Set<NodeId>): void;
        getSnapshotImage(): HTMLImageElement | null;
        setSnapshotImage(image: HTMLImageElement): void;
        private _handleLoadMarkupItem;
        /** @hidden */
        static _fromJson(objData: any, viewer: WebViewer): Promise<_MarkupViewConstruction>;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
    }
}
declare namespace Communicator.Internal {
    class MarkupViewManager extends MarkupTypeManager {
        private _markupViews;
        private _markupItemManager;
        private _callbackManager;
        private _explodeManager;
        private _cuttingManager;
        private _viewer;
        private _sheetManager;
        private _defaultViewCounter;
        constructor(viewer: WebViewer, markupItemManager: MarkupItemManager, callbackManager: CallbackManager, explodeManager: ExplodeManager, cuttingManager: CuttingManager, sheetManager: SheetManager);
        private _initEvents;
        getView(uniqueId: Uuid): Markup.MarkupView | null;
        getViewKeys(): Uuid[];
        loadData(viewArray: Object[]): Promise<boolean[]>;
        exportMarkup(): Object[];
        createView(name?: string, triggerEvent?: boolean, sheetId?: SheetId | null, visibilityState?: VisibilityState | null, colorMap?: Map<NodeId, Color> | null, snapshotImage?: HTMLImageElement | null): Markup.MarkupView;
        private _activateSheet;
        private _activateViewImpl;
        private _activateView;
        activateView(uniqueId: Uuid, duration?: number): Promise<boolean>;
        /** @deprecated Use [[activateViewWithPromise]] instead */
        deprecatedActivateView(uniqueId: Uuid, duration?: number): boolean;
        /** This is a helper for `activateView`. */
        private _setActiveView;
        deleteView(uniqueId: Uuid): boolean;
        private _createDefaultViewName;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
    }
}
declare namespace Communicator.Markup.Line {
    /**
     * This class is for 3D line markup items.
     */
    class LineMarkup extends MarkupItem {
        static className: string;
        private _viewer;
        private _uniqueId;
        private _lineMeshId;
        private _lineMeshInstanceId;
        private _firstPoint;
        private _secondPoint;
        private _firstNodeId;
        private _secondNodeId;
        private _lineColor;
        private _lineOpacity;
        private _linePattern;
        private _linePatternLength;
        private _linePatternLengthUnit;
        constructor(viewer: WebViewer, firstPoint?: Point3 | null, secondPoint?: Point3 | null, firstNodeId?: NodeId | null, secondNodeId?: NodeId | null);
        /**
         * Sets the line color.
         * @param color
         */
        setLineColor(color: Color): void;
        /**
         * Gets the line color.
         */
        getLineColor(): Color;
        /**
         * Sets the line opacity.
         * @param opacity
         */
        setLineOpacity(opacity: number): void;
        /**
         * Gets the line opacity.
         */
        getLineOpacity(): number;
        /**
         * Sets the line pattern.
         * @param pattern The line pattern.
         * @param patternLength The length of a single repetition of the line pattern.
         * @param patternLengthUnit The unit in which the pattern length is measured.
         */
        setLinePattern(pattern: LinePattern, patternLength: number, patternLengthUnit: LinePatternLengthUnit): void;
        /**
         * Gets the line pattern.
         */
        getLinePattern(): LinePattern | null;
        /**
         * Gets the length of a single repetition of the line pattern.
         */
        getLinePatternLength(): number | null;
        /**
         * Gets the unit in which the line pattern length is measured.
         */
        getLinePatternLengthUnit(): LinePatternLengthUnit | null;
        /**
         * Sets the first point on the line.
         * @param firstPoint
         */
        setFirstPoint(firstPoint: Point3 | null): void;
        /**
         * Gets the first point on the line.
         * @returns the first point, or null if none is set.
         */
        getFirstPoint(): Point3 | null;
        /**
         * Sets the second point on the line.
         * @param secondPoint
         */
        setSecondPoint(secondPoint: Point3 | null): void;
        /**
         * Gets the second point on the line.
         * @returns the second point, or null if none is set.
         */
        getSecondPoint(): Point3 | null;
        /**
         * Sets the NodeId of the part associated with the first line point
         * @param nodeId
         */
        setFirstNodeId(nodeId: NodeId | null): void;
        /**
         * Gets the NodeId of the part associated with the first line point
         */
        getFirstNodeId(): NodeId | null;
        /**
         * Sets the NodeId of the part associated with the second line point
         * @param nodeId
         */
        setSecondNodeId(nodeId: NodeId | null): void;
        /**
         * Gets the NodeId of the part associated with the second line point
         */
        getSecondNodeId(): NodeId | null;
        /**
         * Gets the node id associated with the line markup.
         */
        getNodeId(): number | null;
        /**
         * Removes the line geometry from the scene.
         */
        removeLine(): Promise<void>;
        /**
         * Draws updated line geometry in the scene.
         */
        updateLine(): Promise<void>;
        /**
         * Returns a unique markup id for this line.
         */
        getId(): Uuid;
        /**
         * Sets a markup id for this line.
         * @param id
         */
        setId(id: Uuid): void;
        /**
         * Returns the class name for this markup item.
         */
        getClassName(): string;
        private _toJson;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        /**
         * Creates a new [[LineMarkup]] from an object given by [[toJson]].
         * @param An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): Promise<LineMarkup>;
    }
}
declare namespace Communicator.Markup.Redline {
    /**
     * Base class for Redline Markup. It should not be used directly.
     */
    class RedlineItem extends MarkupItem {
        protected _viewer: WebViewer;
        constructor(viewer: WebViewer);
        onDragStart(position: Point2): boolean;
        onDragMove(position: Point2): boolean;
        onDragEnd(position: Point2): boolean;
        remove(): void;
    }
}
declare namespace Communicator.Internal.SVG {
    class SVGMarkupRenderer implements Markup.MarkupRenderer {
        private _svgCanvas;
        private _svgDefsElement;
        private _svgElements;
        private _svgTextElements;
        _setCanvas(canvas: Element): void;
        _clear(): void;
        _finalize(): void;
        drawCircle(circle: Markup.Shape.Circle): Element;
        drawCircles(circleCollection: Markup.Shape.CircleCollection): Element[];
        drawLine(line: Markup.Shape.Line): SVGLineElement;
        drawLines(lineCollection: Markup.Shape.LineCollection): Element[];
        drawText(text: Markup.Shape.Text): SVGTextContentElement;
        drawTexts(texts: Markup.Shape.TextCollection): Element[];
        measureText(str: string, text: Markup.Shape.TextMarkupBase): Point2;
        measureTextBox(textBox: Markup.Shape.TextBox): Point2;
        drawPolyline(line: Markup.Shape.Polyline): SVGPolylineElement;
        drawPolylines(polylineCollection: Markup.Shape.PolylineCollection): Element[];
        drawPolygon(polygon: Markup.Shape.Polygon): Element;
        drawPolygons(polygonCollection: Markup.Shape.PolygonCollection): Element[];
        drawRectangle(rectangle: Markup.Shape.Rectangle): Element;
        drawRectangles(rectangleCollection: Markup.Shape.RectangleCollection): Element[];
        drawTextBox(textBox: Markup.Shape.TextBox): Element[];
        drawTextBoxes(textBoxes: Markup.Shape.TextBoxCollection): Element[][];
        private _addTextBoxElement;
        private _renderEndcaps;
        private _createTextElement;
        private _addTextElement;
        private _addRectangleElement;
        private _addLineElement;
        private _addPolygonElement;
        private _addPolylineElement;
        private _addCircleNode;
        private _setGenericFillAttributes;
        private _setGenericStrokeAttributes;
        private _addSVGTextItemElement;
        private _addSVGElement;
    }
}
declare namespace Communicator.Internal.SVG.Util {
    const svgNamespace = "http://www.w3.org/2000/svg";
    function svgColorRgbString(color: Color): string;
    function svgPointString(points: Point2[]): string;
    function createStartArrowMarker(size: Pixels, color: Color): SVGMarkerElement;
    function createEndArrowMarker(size: Pixels, color: Color): SVGMarkerElement;
    function createCircleMarker(position: Point2, strokeWidth: Pixels, size: Pixels, color: Color): SVGCircleElement;
}
declare namespace Communicator.Markup.Shape {
    /**
     * This class represents a shape bounded by the polyline formed from its points.
     */
    class Polygon extends FilledShape {
        private _points;
        /**
         * Removes all points from this polygon
         */
        clearPoints(): void;
        /**
         * Gets the points in this polyline
         * @returns the points in this polygon
         */
        getPoints(): Point2[];
        /**
         * Adds a point to the polygon
         * @param point the point to add to the polygon
         */
        pushPoint(point: Point2): void;
    }
    /**
     * This class is useful for drawing a number of polygons which share the same visual appearance
     */
    class PolygonCollection extends FilledShape {
        private _polygons;
        /**
         * Removes all polygons from the collection
         */
        clear(): void;
        /**
         * Creates a new array of points that represent a polygon. Add Point2 objects to the array to construct the polygon
         * @returns new array which represents a polygon.
         */
        createPolygon(): Point2[];
        /**
         * @returns the polylines in this collection
         */
        getPolygons(): Point2[][];
    }
}
declare namespace Communicator.Markup.Shape {
    /**
     * This class reprsents a line defined by a list of points.
     */
    class Polyline extends EndcapShape {
        /** @hidden */
        private _points;
        /**
         * Removes all points from this polyline
         */
        clearPoints(): void;
        /**
         * Gets the points in this polyline
         * @returns the points in this polyline
         */
        getPoints(): Point2[];
        /**
         * Adds a point to the polyline
         * @param point the point to add to the line
         */
        pushPoint(point: Point2): void;
    }
    /**
     * This class is useful for drawing a number of polylines all of which share the same visual appearance.
     */
    class PolylineCollection extends EndcapShape {
        /** @hidden */
        private _polylines;
        /**
         * Removes all polylines from the collection
         */
        clear(): void;
        /**
         * Creates a new array of points that represent a polyline. Add Point2 objects to the array to construct the polyline
         * @returns new array which represents a polyline.
         */
        createPolyline(): Point2[];
        /**
         * @returns the polylines in this collection
         */
        getPolylines(): Point2[][];
    }
}
declare namespace Communicator.Util {
    /**
     * Returns the cross product of a vector against its least significant axis.
     * @param vector The input vector to cross.
     * @param out_crossVector The out parameter for the cross product.
     */
    function oneVectorCross(vector: Point3, out_crossVector?: Point3): Point3;
    /**
     * Computes the intersection of a line segment and a plane.
     * @param lineBegin The start point of the line segment to intersect.
     * @param lineEnd The end point of the line segment to intersect.
     * @param plane The plane to intersect.
     * @param out_intersectionPoint The out parameter for the point of intersection if one exists.
     * @returns True if the line segment and plane intersect. False otherwise.
     */
    function intersectionPlaneLine2(lineBegin: Point3, lineEnd: Point3, plane: Plane, out_intersectionPoint: Point3): boolean;
    /**
     * Computes the shortest distance between a point and a line segment.
     * @param plane The point to compute against.
     * @param lineBegin The start point of the line segment to compute against.
     * @param lineEnd The end point of the line segment to compute against.
     * @param out_closestPointOnLine The out parameter for a closest point on the line segment to the point.
     * @returns The distance from the point and the closest point on the line.
     */
    function computePointToLineDistance(point: Point3, lineBegin: Point3, lineEnd: Point3, out_closestPointOnLine: Point3): number;
    /**
     * Returns the formatted string of a value and its units.
     * Unit scaling is based on `unit === 1` being for millimeters.
     * @param value The value to format (without units).
     * @param unit The unit scale to be applied to `value`.
     */
    function formatWithUnit(value: number, unit: number): string;
    /**
     * Converts degrees to radians.
     * @param degrees The degrees to convert.
     * @returns The converted radians.
     */
    function degreesToRadians(degrees: Degrees): Radians;
    /**
     * Converts radians to degrees.
     * @param degrees The radians to convert.
     * @returns The converted degrees.
     */
    function radiansToDegrees(radians: Radians): Degrees;
    /**
     * Computes the rotation matrix defined by rotating around a vector.
     * @param axisVector The vector to rotate around.
     * @param degrees The amount to rotate.
     * @param out_rotationMatrix The out parameter for the rotation matrix.
     * @returns The out parameter rotation matrix.
     */
    function computeOffaxisRotation(axisVector: Point3, degrees: Degrees, out_rotationMatrix?: Matrix): Matrix;
    /**
     * Computes the intersection of two planes.
     * @param plane1 The first plane.
     * @param pointOnPlane1 A point on the first plane.
     * @param plane2 The second plane.
     * @param pointOnPlane2 A point on the second plane.
     * @param out_lineBegin Out parameter for resulting intersection line (if any).
     * @param out_lineEnd Out parameter for resulting intersection line (if any).
     * @returns `0` if the planes are disjoint. `1` if the planes coincide. `2` if the planes intersect in a line.
     */
    function intersect3d2Planes(plane1: Plane, pointOnPlane1: Point3, plane2: Plane, pointOnPlane2: Point3, out_lineBegin: Point3, out_lineEnd: Point3): 0 | 1 | 2;
    /**
     * Computes the intersection of a line segment and a plane.
     *
     * @param lineBegin The start point of the line segment to intersect.
     * @param lineEnd The end point of the line segment to intersect.
     * @param planePoint1 A point on the plane to intersect.
     * @param planePoint2 A point on the plane to intersect.
     * @param planePoint3 A point on the plane to intersect.
     * @param out_intersectionPoint The out parameter for the point of intersection if one exists.
     * @returns True if the line segment and plane intersect. False otherwise.
     *
     * See also: [[intersectionPlaneLine2]].
     */
    function intersectionPlaneLine(lineBegin: Point3, lineEnd: Point3, planePoint1: Point3, planePoint2: Point3, planePoint3: Point3, out_intersectionPoint: Point3): boolean;
    /**
     * Computes the smallest angle between two vectors in degrees.
     * @param vector1 The first vector.
     * @param vector2 The second vector.
     * @returns The angle between vectors in degrees.
     */
    function computeAngleBetweenVector(vector1: Point3, vector2: Point3): Degrees;
    /**
     * Generates tessellated points suitable for mesh creation for a given circle.
     * @param out_points The out parameter for the generated points.
     * @param center The center of the circle.
     * @param radius The radius of the circle.
     * @param numPoints The number of points to use for the tesesselated circle.
     * @param axisVector The axis to orient the circle against.
     */
    function generatePointsOnCircle(out_points: Point3[], center: Point3, radius: number, numPoints: number, axisVector: Point3): void;
    /**
     * Returns the distance between two line segments.
     * @param line1Begin The start of the first line segment.
     * @param line1End The end of the first line segment.
     * @param line2Begin The start of the second line segment.
     * @param line2End The end of the second line segment.
     * @param out_closestPointLine1 Out parameter for the closest point of line1 to line2.
     * @param out_closestPointLine2 Out parameter for the closest point of line2 to line1.
     * @returns The distance between the two input line segments.
     */
    function distanceLineLine(line1Begin: Point3, line1End: Point3, line2Begin: Point3, line2End: Point3, out_closestPointLine1: Point3, out_closestPointLine2: Point3): number;
    /** Returns the closest point on line `p1p2` to line `p3p4`. */
    function lineLineIntersect(p1: Point3, p2: Point3, p3: Point3, p4: Point3): Point3 | null;
    /**
     * Finds the scalar for the closest point on line segment p0-p1 to the given point. The returned scalar
     * will always be in the range [0, 1], where 0 indicates p0 is closest, and 1 indicates p1 is closest.
     *
     * @param p0 First point of the line segment
     * @param p1 Second point of the line segment
     * @param point Point at which to find closest line segment scalar
     */
    function closestPointScalarFromPointToSegment(p0: Point3, p1: Point3, point: Point3): number;
    /**
     * Finds the closest point on line segment p0-p1 to the given point. The closest point will always lie
     * on or between the line segment endpoints.
     *
     * @param p0 First point of the line segment
     * @param p1 Second point of the line segment
     * @param point Point at which to find closest line segment point.
     */
    function closestPointFromPointToSegment(p0: Point3, p1: Point3, point: Point3): Point3;
    /**
     * Determine if the point is both on the line formed by p0-p1, and within the p0-p1 line-segment endpoints
     *
     * @param p0 First point of the line segment
     * @param p1 Second point of the line segment
     * @param point Point that possibly lies on the line segment.
     * @param epsilon Epsilon value used with point-on-line distance calculation.
     */
    function isPointOnLineSegment(p0: Point3, p1: Point3, point: Point3, epsilon: number): boolean;
    /**
     * Returns whether the 2-dimensional point `point` lies on the line segment `p1p2`.
     *
     * @param point The point to test
     * @param p1 The first endpoint of the line segment
     * @param p2 The second endpoint of the line segment
     * @param tolerance If the perpendicular distance of `point` from the line
     * segment is less than or equal to `tolerance`, the function will return `true`.
     */
    function isPointOnLineSegment2d(point: Point2, p1: Point2, p2: Point2, tolerance: number): boolean;
    /**
     * Returns whether the 2-dimensional point `point` lies within the given rectangle.
     *
     * @param point The point to test
     * @param rectPos The lower-left corner of the rectangle
     * @param rectSize The width and height of the rectangle
     * @param tolerance The maximum distance along the x- or y-axis that `point` is
     * allowed to be outside the rectangle
     */
    function isPointInRect2d(point: Point2, rectPos: Point2, rectSize: Point2, tolerance?: number): boolean;
    /**
     * Returns an array of evenly-distributed points that lie on an arc.
     *
     * @param axis The normal of the plane containing the arc (in other words, the axis of rotation).
     * @param angle The angle swept by the arc (may be negative).
     * @param center The center point of the arc.
     * @param startOffset The starting point of the arc, expressed as an offset relative to the center.
     * @param segmentCount The number of line segments to be generated.
     * @returns An array containing `segmentCount + 1` points.
     */
    function generateArcPoints(axis: Point3, angle: number, center: Point3, startOffset: Point3, segmentCount: number): Point3[];
    function getLongUnitString(unit: UnitElement[]): string;
}
declare namespace Communicator {
    /**
     * Object representing a Ray.
     */
    class Ray {
        origin: Point3;
        direction: Point3;
        constructor(origin?: Point3, direction?: Point3);
        /**
         * Creates a copy of this ray
         * @returns {Ray} a copy of this ray object
         */
        copy(): Ray;
        /**
         * Sets this ray equal to another ray
         * @param {Ray} ray the ray to assign
         */
        assign(ray: Ray): Ray;
        /**
         * Flips the ray's direction.
         */
        negate(): Ray;
    }
}
declare namespace Communicator {
    /**
     * Object representing a Plane.
     */
    class Plane {
        normal: Point3;
        d: number;
        setFromPointAndNormal(point: Point3, normal: Point3): Plane;
        /**
         * Update the plane to pass through the three points
         */
        setFromPoints(p1: Point3, p2: Point3, p3: Point3): void;
        setFromCoefficients(a: number, b: number, c: number, d: number): void;
        getCoefficients(): [number, number, number, number];
        distanceToPoint(point: Point3): number;
        rayIntersection(ray: Ray): Point3 | null;
        intersectsRay(ray: Ray, outPoint?: Point3): boolean;
        /**
         * Returns true if the point is on the side of the plane that the plane's normal is directed. Returns false otherwise.
         * @param p The point to test.
         */
        determineSide(p: Point3): boolean;
        /**
         * Creates a copy of this plane
         * @returns a copy of this plane object
         */
        copy(): Plane;
        /**
         * Sets this plane equal to another plane
         * @param plane the plane to assign
         */
        assign(plane: Plane): void;
        /**
         * Returns true if the normal and d value are the same.
         * @param plane
         */
        equals(plane: Plane): boolean;
        static createFromPointAndNormal(point: Point3, normal: Point3): Plane;
        static createFromPoints(p1: Point3, p2: Point3, p3: Point3): Plane;
        static createFromCoefficients(a: number, b: number, c: number, d: number): Plane;
    }
}
declare namespace Communicator {
    class Point4 {
        x: number;
        y: number;
        z: number;
        w: number;
        constructor(x: number, y: number, z: number, w: number);
        scale(k: number): Point4;
        set(x: number, y: number, z: number, w: number): void;
        assign(point: Point4): void;
        static zero(): Point4;
    }
}
/**
 * Operators provide hooks into various events provided by the web browser and perform well defined actions based on user input. An example of using an Operator can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/operators/operators.html).
 * @preferred
 */
declare namespace Communicator.Operator {
    interface Operator {
        readonly onMouseDown?: (event: Event.MouseInputEvent) => void | Promise<void>;
        readonly onMouseMove?: (event: Event.MouseInputEvent) => void | Promise<void>;
        readonly onMouseUp?: (event: Event.MouseInputEvent) => void | Promise<void>;
        readonly onMousewheel?: (event: Event.MouseWheelInputEvent) => void | Promise<void>;
        readonly onTouchStart?: (event: Event.TouchInputEvent) => void | Promise<void>;
        readonly onTouchMove?: (event: Event.TouchInputEvent) => void | Promise<void>;
        readonly onTouchEnd?: (event: Event.TouchInputEvent) => void | Promise<void>;
        readonly onKeyDown?: (event: Event.KeyInputEvent) => void | Promise<void>;
        readonly onKeyUp?: (event: Event.KeyInputEvent) => void | Promise<void>;
        readonly onDeactivate?: () => void | Promise<void>;
        readonly onActivate?: () => void | Promise<void>;
        readonly onViewOrientationChange?: () => void | Promise<void>;
        /**
         * Stops an operator from interacting with the scene.
         */
        readonly stopInteraction?: () => void | Promise<void>;
    }
}
declare namespace Communicator.Operator {
    /** @hidden */
    class ButtonModifier {
        private _button;
        private _modifier;
        constructor(button: Button, modifier: KeyModifiers);
        getButton(): Button;
        getModifier(): KeyModifiers;
    }
    /** @hidden */
    class OperatorBase implements Operator {
        /** @hidden */
        protected _viewer: WebViewer;
        /** @hidden */
        protected _ptFirst: Point2;
        /** @hidden */
        protected _ptPrevious: Point2;
        /** @hidden */
        protected _ptCurrent: Point2;
        /** @hidden */
        protected _dragging: boolean;
        /** @hidden */
        protected _dragCount: number;
        /** @hidden */
        protected _primaryTouchId: number | null;
        /** @hidden */
        protected _mapping: ButtonModifier[];
        /** @hidden */
        protected _buttonModifierActive: boolean;
        /** @hidden */
        protected _doubleClickInterval: number;
        /** @hidden */
        protected _firstMouseDownTime: number | null;
        /** @hidden */
        protected _isDoubleClick: boolean;
        /** @hidden */
        constructor(viewer: WebViewer);
        /** @hidden */
        onDoubleClick(_event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(_event: Event.MouseInputEvent): void;
        /** @hidden */
        stopInteraction(): void;
        /** @hidden */
        isDragging(): boolean;
        /** @hidden */
        isActive(): boolean;
        /** @hidden */
        onTouchStart(event: Event.TouchInputEvent): void;
        /** @hidden */
        onTouchMove(event: Event.TouchInputEvent): void;
        /** @hidden */
        onTouchEnd(event: Event.TouchInputEvent): void;
        /**
         * Adds a button and key modifier mapping for the operator. If no mapping is provided, all combinations are considered valid.
         * All mappings require a mouse button, but a key modifier is optional.
         * @param button
         * @param modifier
         */
        addMapping(button: Button, modifier?: KeyModifiers): void;
        /**
         * Clears any button and key modifier mappings for the operator.
         */
        clearMapping(): void;
        /**
         * Sets the button and key modifier mapping for the operator.
         * @param button
         * @param modifier
         */
        setMapping(button: Button, modifier?: KeyModifiers): void;
        /** @hidden */
        checkMapping(event: Event.MouseInputEvent): boolean;
        /** @hidden */
        setHandled(): boolean;
        /** @hidden */
        onDeactivate(): void | Promise<void>;
    }
}
declare namespace Communicator.Operator {
    class AreaSelectionOperator extends OperatorBase {
        private _incrementalSelection;
        private _rectangleMarkup;
        private _forceEffectiveSceneVisibilityMask;
        /** @hidden */
        constructor(viewer: WebViewer);
        /**
         * Gets the mask used for forcing effective scene visibility during selection.
         */
        getForceEffectiveSceneVisibilityMask(): SelectionMask;
        /**
         * Sets the mask used for forcing effective scene visibility during selection.
         */
        setForceEffectiveSceneVisibilityMask(mask: SelectionMask): void;
        hasActiveSelection(): boolean;
        waitForIdle(): Promise<void>;
        clearSelection(): Promise<void>;
        private _allowSelection;
        private _createBeginConfig;
        private _performSelection;
        /** @hidden */
        setHandled(): boolean;
        /** @hidden */
        onKeyUp(e: Event.KeyInputEvent): void;
        /** @hidden */
        onMouseDown(e: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseMove(e: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(e: Event.MouseInputEvent): void;
    }
}
declare namespace Communicator.Operator {
    class AxisTriadOperator extends OperatorBase {
        private readonly _axisTriad;
        private readonly _pickConfig;
        /** @hidden */
        constructor(viewer: WebViewer);
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): Promise<void>;
    }
}
declare namespace Communicator.Operator {
    /** @hidden */
    class CuttingPlaneOperator extends OperatorBase {
        private _cuttingManager;
        /**
         * The context will only be non-null after a successful selection of the cutting plane has happened, and
         * only for the duration of the mouse up-move-down sequence.
         */
        private _context;
        /** @hidden */
        constructor(viewer: WebViewer, cuttingManager: CuttingManager);
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): Promise<void>;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): Promise<void>;
        private _updatePlane;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): Promise<void>;
        /** @hidden */
        setHandled(): boolean;
        /**
         * Perform the selection operation. If successful, the cutting plane context will be properly
         * setup, otherwise the cutting plane context will be null.
         */
        private _startSelection;
    }
}
declare namespace Communicator.Operator {
    class FloorplanOperator extends OperatorBase {
        private readonly _manager;
        private _draggingAvatar;
        private _restrictToAvatar;
        private _floorLocked;
        /** @hidden */
        constructor(viewer: WebViewer);
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): Promise<void>;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): Promise<void>;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        /**
         * Set whether or not dragging is restricted to the avatar. If true the operator will only function if
         * the selection begins on the avatar
         */
        restrictToAvatar(restrict: boolean): void;
    }
}
declare namespace Communicator.Operator {
    /**
     * Handles are added scene elements that can update the position of your parts through user interaction. Find more information [here](https://docs.techsoft3d.com/communicator/latest/build/tutorials/additive-manufacturing/handles.html).
     */
    class HandleOperator extends OperatorBase {
        private _draggingHandle;
        private _newRotationMatrix;
        private _translation;
        private _newTranslation;
        private _nodeIdGroupMap;
        private _groupIdCount;
        private _activeChildrenGroupIds;
        private _initialLocalNodeMatrices;
        private _newLocalNodeMatrices;
        private _handleMarkup;
        private _trackedPoints;
        private _trackedPointsPositions;
        private _trackedPointCount;
        private _previousContextClick;
        private _overlayIndex;
        private _activeHandleNodeId;
        private _handleEventType;
        private _highlightedHandleId;
        private _handleSize;
        private _explodeActive;
        private _measureActive;
        private _settingMatrixInProgress;
        private _pickConfig;
        constructor(viewer: WebViewer);
        /**
         * Sets the mesh data for axis handles.
         * @param meshData
         */
        setAxisMeshData(meshData: MeshData): Promise<void>;
        /**
         * Sets the mesh data for plane handles.
         * @param meshData
         */
        setPlaneMeshData(meshData: MeshData): Promise<void>;
        /**
         * Sets the mesh data for view plane handles.
         * @param meshData
         */
        setViewPlaneMeshData(meshData: MeshData): Promise<void>;
        /**
         * Sets the mesh data for rotation handles.
         * @param meshData
         */
        setRotateMeshData(meshData: MeshData): Promise<void>;
        /**
         * Add a point to the tracked points list. When the handle moves, these points will update in world space.
         * @param point
         * @returns point index
         */
        addTrackedPoint(point: Point3): number;
        /**
         * Gets the tracked point list.
         */
        getTrackedPoints(): Point3[];
        /**
         * Clear the list of tracked points.
         */
        clearTrackedPoints(): void;
        /**
         * Returns a boolean value indicating if handles are available to be added to the scene
         * If there is an active explode, active measure, or the model is a 2d drawing.
         * this will be false.
         */
        isEnabled(): boolean;
        private _guardEnabled;
        /**
         * Takes a scale value to change the handle size with 1 representing the default size
         * @param size
         */
        setHandleSize(size: number): void;
        /**
         * Adds all handles into the scene, oriented along the primary axes
         * @param nodeIds corresponding to the parts that will move with the handles
         * @param position world space coordinates the the handle position
         */
        addHandles(nodeIds: NodeId[], position?: Point3 | null, groupId?: number | null): Promise<void>;
        /**
         * Returns the group id associated to the given group of node ids, returns null if does not exist
         * @param nodeIds
         */
        private _findGroupId;
        /**
         * This will generate a unique id to associate a group of handles with a group of NodeIds.
         */
        generateGroupId(): number;
        private _massageGroupId;
        /**
         * Adds a handle that moves along an axis.
         * @param position center of the handle.
         * @param axis axis to move along
         * @param color color of the handle geometry
         * @param positionNormal optional vector to control the orientation of the handle geometry.
         * @param groupId optional parameter to associate this handle with a group of NodeIds
         */
        addAxisTranslationHandle(position: Point3, axis: Point3, color: Color, positionNormal?: Point3 | null, groupId?: number | null): Promise<NodeId>;
        /**
         * Adds a handle that rotates around an axis
         * @param position center of the handle.
         * @param axis axis to rotate around
         * @param color color of the handle geometry
         * @param positionNormal optional vector to control the orientation of the handle geometry.
         * @param groupId optional parameter to associate this handle with a group of NodeIds
         */
        addAxisRotationHandle(position: Point3, axis: Point3, color: Color, positionNormal?: Point3 | null, groupId?: number | null): Promise<NodeId>;
        /**
         * Adds a handle that restricts movement to a plane.
         * @param position center of the handle.
         * @param normal normal of the plane
         * @param faceColor face color of the handle geometry
         * @param lineColor outline color of the handle geometry
         * @param positionNormal optional vector to control the orientation of the handle geometry.
         * @param groupId optional parameter to associate this handle with a group of NodeIds
         */
        addPlaneTranslationHandle(position: Point3, normal: Point3, faceColor: Color, lineColor: Color, positionNormal?: Point3 | null, groupId?: number | null): Promise<NodeId>;
        /**
         * Adds a handle that restricts movement to the viewplane.
         * @param position center of the handle
         * @param color geometry color
         * @param groupId optional parameter to associate this handle with a group of NodeIds
         */
        addViewPlaneTranslationHandle(position: Point3, color: Color, groupId?: number | null): Promise<NodeId>;
        /**
         * Sets the NodeIds that any handles in the scene will move.
         * @param nodeIds
         * @param groupId optional parameter that associates a group of NodeIds with a group of handles.
         */
        setNodeIds(nodeIds: NodeId[], groupId?: number | null): void;
        /**
         * Gets the NodeIds that the handles in the scene will move.
         * @param groupId optional paramater that specifies if the NodeIds to retrieve are part of a group.
         */
        getNodeIds(groupId?: number | null): NodeId[];
        /**
         * Shows any handles that have been added to the scene.
         */
        showHandles(): void;
        /**
         * Updates the current handle position.
         * @param translation additional translation
         * @param rotation additional rotation
         * @param finalizePosition keep translation and rotation. If true, added translation and rotation
         * will not reset the next time the position is updated.
         */
        updatePosition(translation: Point3, rotation: Matrix, finalizePosition: boolean, groupId?: number | null): Promise<void>;
        /**
         * @returns the current handle position or null if not currently active.
         */
        getPosition(): Point3 | null;
        /**
         * Removes all handles from the scene.
         */
        removeHandles(): Promise<void>;
        /**
         * @returns the total translation applied to the handles.
         */
        getTranslation(): Point3;
        private _initLocalNodeMatrices;
        private _getHandleEventType;
        private _rotate;
        private _translate;
        private _genericTransform;
        /** @hidden */
        _testRotate(rotationAxis: Point3, rotationAngle: Degrees, groupId?: number | null): Promise<void>;
        /** @hidden */
        _testTranslate(translation: Point3, groupId?: number | null): Promise<void>;
        private _getActiveNodeIdByGroupId;
        private _startDragging;
        private _stopDragging;
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): Promise<void>;
        private _onHandleDrag;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): Promise<void>;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        /** @hidden */
        setHandled(): boolean;
        private _getClosestPoint;
        private _getTranslationComponent;
        private _clearHighlightedHandle;
        private _highlightHandle;
        private _getPlaneIntersectionPoint;
        private _getRotationAngle;
        private _getRotationMatrix;
    }
}
declare namespace Communicator.Operator {
    class NavCubeOperator extends OperatorBase {
        private readonly _navCube;
        private readonly _pickConfig;
        /** @hidden */
        constructor(viewer: WebViewer);
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): Promise<void>;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): Promise<void>;
    }
}
declare namespace Communicator.Operator {
    class NoteOperator extends OperatorBase {
        private _insertNoteButton;
        private _callbackFlag;
        private _noteTextManager;
        /** @hidden */
        constructor(viewer: WebViewer, noteTextManager: Markup.Note.NoteTextManager);
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        /**
         * @returns a NoteTextElement that can be used to configure the NoteText HTML container.
         */
        getNoteTextElement(): Markup.Note.NoteTextElement;
        /**
         * @param noteTextElement
         */
        setNoteTextElement(noteTextElement: Markup.Note.NoteTextElement): void;
        /**
         * Returns true if the nodeId is the id of a note pin instance.
         * @param nodeId
         */
        checkPinInstance(nodeId: NodeId): boolean;
    }
}
declare namespace Communicator.Operator {
    class RayDrillSelectionOperator extends OperatorBase {
        private _incrementalSelection;
        private _selectionButton;
        private _ignoreTransparency;
        private _forceEffectiveSceneVisibilityMask;
        /** @hidden */
        constructor(viewer: WebViewer);
        /**
         * Gets the mask used for forcing effective scene visibility during selection.
         */
        getForceEffectiveSceneVisibilityMask(): SelectionMask;
        /**
         * Sets the mask used for forcing effective scene visibility during selection.
         */
        setForceEffectiveSceneVisibilityMask(mask: SelectionMask): void;
        setIgnoreTransparency(value: boolean): void;
        getIgnoreTransparency(): boolean;
        hasActiveSelection(): boolean;
        waitForIdle(): Promise<void>;
        clearSelection(): Promise<void>;
        private _createBeginConfig;
        private _selectionPredicate;
        private _performSelection;
        /** @hidden */
        setHandled(): boolean;
        /** @hidden */
        onKeyUp(e: Event.KeyInputEvent): void;
        /** @hidden */
        onMouseUp(e: Event.MouseInputEvent): void;
    }
}
declare namespace Communicator.Operator {
    class SelectionOperator extends OperatorBase {
        private _selectionButton;
        private _noteTextManager;
        private _pickConfig;
        private _forceEffectiveSceneVisibilityMask;
        private _doubleClickFitWorld;
        /** @hidden */
        constructor(viewer: WebViewer, noteTextManager: Markup.Note.NoteTextManager);
        /** Sets the [[PickConfig]] that will be passed to [[View.pickFromPoint]]. */
        setPickConfig(config: PickConfig): void;
        /** Returns the [[PickConfig]] that will be passed to [[View.pickFromPoint]]. */
        getPickConfig(): PickConfig;
        /**
         * Gets the mask used for forcing effective scene visibility during selection.
         * @deprecated Use [[getPickConfig]] instead.
         */
        getForceEffectiveSceneVisibilityMask(): SelectionMask;
        /**
         * Sets the mask used for forcing effective scene visibility during
         * selection.
         *
         * This setting overrides the value passed to [[setPickConfig]]. Passing
         * `null` causes the value passed to [[setPickConfig]] to be used.
         *
         * @deprecated Use [[setPickConfig]] instead.
         */
        setForceEffectiveSceneVisibilityMask(mask: SelectionMask | null): void;
        /**
         * Gets the button used for selection.
         * @returns Button
         */
        getSelectionButton(): Button;
        /**
         * Sets the button used for selection
         * @param button
         */
        setSelectionButton(button: Button): void;
        /** @hidden */
        onKeyUp(event: Event.KeyInputEvent): void;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        /** @hidden */
        onDoubleClick(): Promise<void>;
        /**
         * When enabled, a double click will fit the view to the model bounding box.
         * @param doubleClickFitWorld
         */
        setDoubleClickFitWorldEnabled(doubleClickFitWorld: boolean): void;
        private _getSelectionOrParentIfSelected;
        private _processSelectionClick;
    }
}
declare namespace Communicator.Markup.Measure {
    /**
     * Base class for Measure Markup. It should not be used directly.
     */
    class MeasureMarkup extends MarkupItem {
        /** @hidden */
        protected _viewer: WebViewer;
        /** @hidden */
        protected _stage: number;
        /** @hidden */
        protected _finalized: boolean;
        /** @hidden */
        protected _uniqueId: Uuid;
        /** @hidden */
        protected _positions: Point3[];
        /** @hidden */
        protected _lineShapes: Shape.Line[];
        /** @hidden */
        protected _name: string;
        /** @hidden */
        protected _measurementValue: number;
        /** @hidden */
        protected _unitMultiplier: number;
        /** @hidden */
        protected _textShape: Shape.TextBox;
        /** @hidden */
        protected _visibility: boolean;
        /** @hidden */
        constructor(viewer: WebViewer);
        /**
         * Gets the name of this measurement.
         * @returns the measurement name
         */
        getName(): string;
        /**
         * Sets the name of this measurement
         * @param name the name to set
         */
        setName(name: string): void;
        /** @hidden */
        _getStage(): number;
        /** @hidden */
        _nextStage(): void;
        /** @hidden */
        _setId(id: Uuid): void;
        /** @hidden */
        _getId(): Uuid;
        /** @hidden */
        adjust(position: Point2): void;
        /** @hidden */
        _isFinalized(): boolean;
        /** @hidden */
        update(): void;
        /** @hidden */
        draw(): void;
        setVisibility(visibility: boolean): void;
        getVisibility(): boolean;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Returns the unit agnostic value for this measurement.
         * In the case where this value represents distance, use [[getUnitMultiplier]] to determine the measurement units.
         * In other cases, this value will be the angle measurement in degrees.
         * @returns the measurement value
         */
        getMeasurementValue(): number;
        /**
         * Returns the unit multiplier incorporated into the measurement value.
         * This number is a multiplier of millimeters (for example inches will be `25.4`).
         * The default value is `1.0`.
         */
        getUnitMultiplier(): number;
        /**
         * Sets the measurement text that is rendered with this measurement.
         * @param measurementText the text to render with this measurement
         */
        setMeasurementText(measurementText: string): void;
        /**
         * Gets the text for this measurement. By default this will contain the measurement value and units for the model in the cases where the measurement is a distance.
         * In other cases it will contain the angle in degrees.
         */
        getMeasurementText(): string;
        /** @hidden */
        protected _setMeasurementValue(millimeters: number): void;
        /** @hidden */
        protected static _serializePointArray(points: Point3[]): Object[];
        /** @hidden */
        protected static _constructPointArray(pointObjs: Object[]): Point3[];
    }
}
declare namespace Communicator.Operator {
    /** @hidden */
    class SelectionRectangleMarkup extends Markup.Measure.MeasureMarkup {
        private _rectangle;
        private _markupHandle;
        private _dim;
        private _constantStrokeColor;
        initialPosition: Point2;
        currentPosition: Point2;
        min: Point2;
        max: Point2;
        constructor(viewer: WebViewer, constantStrokeColor: boolean);
        draw(): void;
        updateCurrentPosition(currentPosition: Point2): void;
        private _updateRectangleVertices;
        activate(initialPosition: Point2): void;
        deactivate(): void;
        isActive(): boolean;
    }
}
declare namespace Communicator.Operator {
    /**
     * Provide camera movement for the 3Dconnexion SpaceMouse.
     */
    class SpaceMouseOperator extends OperatorBase {
        private _modelBounding;
        private _selectionBounding;
        private _pivot;
        private _hitRayOrigin;
        private _hitRayDirection;
        private _hitRayAperture;
        private _hitRaySelectionOnly;
        private _hitRaySelectionItem;
        private _connexion;
        private _3dMouseInitialized;
        private _updateModelBounding;
        private _updateSelectionBounding;
        private _updateHitTest;
        constructor(viewer: WebViewer);
    }
}
declare namespace Communicator.Operator {
    /** @hidden */
    class CameraWalkBaseOperator extends OperatorBase {
        private _elevationSpeed;
        private _rotationSpeed;
        private _viewAngle;
        private _zoomDistance;
        private _walkDistance;
        private _tilt;
        private _majorAxis;
        private _maxExtents;
        private _walkActive;
        private readonly _activeWalk;
        private _bimModeEnabled;
        private readonly _synchronizedToggleBimMode;
        private readonly _doorCache;
        private _downAxis;
        private _initialInteractiveDrawLimitIncreaseStatus;
        private readonly _logical;
        private readonly _effective;
        /** @hidden */
        constructor(viewer: WebViewer);
        private _updateSceneFloor;
        isBimModeEnabled(): boolean;
        private _enableBimMode;
        private _disableBimMode;
        /**
         * Enables BIM mode, which includes collision detection
         */
        enableBimMode(): Promise<void>;
        /**
         * Disables BIM mode, which includes collision detection
         */
        disableBimMode(): Promise<void>;
        /**
         * Toggles BIM mode, deactivating it if it's activated and activating it if it's deactivated
         */
        toggleBimMode(): Promise<void>;
        /** @hidden */
        onActivate(): Promise<void>;
        /** @hidden */
        onDeactivate(): Promise<void>;
        /**
         * Sets the walk, rotate, and mouse look speeds to the default values.
         */
        resetDefaultWalkSpeeds(): Promise<void>;
        /**
         * Gets the floor distance config used by BIM mode.
         * See also: [[enableBimMode]].
         */
        getBimFloorConfig(): CameraWalkBaseOperator.Bim.FloorConfig;
        /**
         * Sets the floor distance config used by BIM mode.
         * See also: [[enableBimMode]].
         */
        setBimFloorConfig(floorConfig: CameraWalkBaseOperator.Bim.FloorConfig): void;
        /**
         * Gets the wall distance config used by BIM mode.
         * See also: [[enableBimMode]].
         */
        getBimWallConfig(): CameraWalkBaseOperator.Bim.WallConfig;
        /**
         * Sets the wall distance config used by BIM mode.
         * See also: [[enableBimMode]].
         */
        setBimWallConfig(wallConfig: CameraWalkBaseOperator.Bim.WallConfig): void;
        /**
         * Gets the door distance config used by BIM mode.
         * See also: [[enableBimMode]].
         */
        getBimDoorConfig(): CameraWalkBaseOperator.Bim.DoorConfig;
        /**
         * Sets the door distance config used by BIM mode.
         */
        setBimDoorConfig(doorConfig: CameraWalkBaseOperator.Bim.DoorConfig): void;
        private _scaleAgainstModelUnit;
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        /** @hidden */
        protected _applyGravity(): Promise<void>;
        /** @hidden */
        protected _updateNearbyDoors(): Promise<void>;
        private _updateCamera;
        /** @hidden */
        protected _applyWalkDelta(camera: Camera, walkDelta: Point3): void;
        /** @hidden */
        protected _applyWalkDeltaWithCollisionCheck(camera: Camera, walkDelta: Point3, upDir: Point3): Promise<void>;
        private _testWallCollision;
        private _walkBackward;
        private _walkForward;
        private _walkLeft;
        private _walkRight;
        walkBackward(walkDistance: number): void;
        walkForward(walkDistance: number): void;
        walkLeft(walkDistance: number): void;
        walkRight(walkDistance: number): void;
        walkBackwardWithCollision(walkDistance: number): Promise<void>;
        walkForwardWithCollision(walkDistance: number): Promise<void>;
        walkLeftWithCollision(walkDistance: number): Promise<void>;
        walkRightWithCollision(walkDistance: number): Promise<void>;
        walkDown(walkDistance: number): void;
        walkUp(walkDistance: number): void;
        rotateRight(degrees: number): void;
        rotateLeft(degrees: number): void;
        tiltDown(degrees: number): void;
        tiltUp(degrees: number): void;
        /** @hidden */
        protected _calculateInitialPosition(): void;
        private _updateCameraViewAngle;
        private _updateCameraTilt;
        private _calculateInitialTilt;
        /** @hidden */
        protected _resetPosition(camera: Camera): void;
        /** @hidden */
        protected _calculateMajorAxis(camera: Camera): void;
        /**
         * Sets the speed to walk when using the mouse scroll wheel.
         * @param zoomSpeed distance for walking with the mouse scroll wheel.
         */
        setZoomSpeed(zoomSpeed: number): void;
        /**
         * Gets the speed used when walking with the mouse scroll wheel.
         */
        getZoomSpeed(): number;
        /**
         * Sets the tilt value. Values must be between -45 and 45 degrees.
         * @param tilt
         */
        setTilt(tilt: number): void;
        /**
         * Gets the tilt value.
         */
        getTilt(): number;
        /**
         * Sets the view angle. Values must be between 30 and 150 degrees.
         * @param viewAngle
         */
        setViewAngle(degrees: number): void;
        /**
         * Gets the view angle.
         */
        getViewAngle(): number;
        /**
         * Sets the walkSpeed for walking forward, backwards, left, and right.
         * @param walkSpeed The camera will move by walkSpeed per second.
         */
        setWalkSpeed(walkSpeed: number): void;
        /**
         * Gets the walkSpeed for walking forward, backwards, left, and right.
         */
        getWalkSpeed(): number;
        /**
         * Sets the elevation speed for moving the camera up and down.
         * @param elevationSpeed The camera will move by elevationSpeed per second.
         */
        setElevationSpeed(elevationSpeed: number): void;
        /**
         * Gets the elevation speed for moving the camera up and down.
         */
        getElevationSpeed(): number;
        /**
         * Sets the rotation speed for tilt and rotate.
         * @param rotationSpeed The camera will rotate by rotationSpeed degrees per second.
         */
        setRotationSpeed(rotationSpeed: number): void;
        /**
         * Gets the rotation speed for tilt and rotate.
         */
        getRotationSpeed(): number;
        /** @hidden */
        setWalkActive(active: boolean): void;
        /**
         * Returns true if walking is currently active
         */
        getWalkActive(): boolean;
        /**
         * Returns true if BIM mode is currently active
         */
        getBimModeEnabled(): boolean;
        /**
         * Get major axis
         */
        getMajorAxis(): Axis;
        /** @hidden */
        protected getActiveWalk(): Util.CurrentAction;
    }
    namespace CameraWalkBaseOperator.Bim {
        /**
         * Distance configuration used when BIM mode is enabled.
         * See also: [[CameraWalkBaseOperator.enableBimMode]].
         */
        interface FloorConfig {
            /**
             * The offset from the floor used for the avatar.
             */
            avatarOffset: number;
            /**
             * The maximum gain in height the avatar is allowed to scale.
             */
            maxClimbHeight: number;
            /**
             * Any gain in height less than this distance does not cause the avatar to buoy upward.
             */
            negligibleClimbHeight: number;
            /**
             * The maximum distance the avatar can fall.
             */
            maxFallDistance: number;
        }
        /**
         * Distance configuration used when BIM mode is enabled.
         * See also: [[CameraWalkBaseOperator.enableBimMode]].
         */
        interface WallConfig {
            /**
             * The offset from walls used for the avatar.
             */
            avatarOffset: number;
        }
        /**
         * Distance configuration used when BIM mode is enabled.
         * See also: [[CameraWalkBaseOperator.enableBimMode]].
         */
        interface DoorConfig {
            /**
             * The range from the avatar used to turn doors transparent.
             */
            transparencyRange: number;
        }
        namespace Default {
            /**
             * The defaults used for [[CameraWalkBaseOperator.Bim.FloorConfig]].
             */
            enum FloorConfig {
                avatarOffset = 1500,
                maxClimbHeight = 600,
                negligibleClimbHeight = 20,
                maxFallDistance = 5000
            }
            /**
             * The defaults used for [[CameraWalkBaseOperator.Bim.WallConfig]].
             */
            enum WallConfig {
                avatarOffset = 150
            }
            /**
             * The defaults used for [[CameraWalkBaseOperator.Bim.DoorConfig]].
             */
            enum DoorConfig {
                transparencyRange = 4000
            }
        }
    }
}
declare namespace Communicator.Operator {
    class CameraKeyboardWalkOperator extends CameraWalkBaseOperator {
        private readonly _keyWalkMapping;
        private readonly _keyUpMap;
        private readonly _keyDownMap;
        private _mouseLookSpeed;
        private _mouseLookEnabled;
        private _previousWalkTime;
        private _tickTimerId;
        /** @hidden */
        constructor(viewer: WebViewer);
        /**
         * Adds a key mapping for a walk direction.
         * @param key
         * @param walkDirection
         */
        addKeyMapping(key: KeyCode, walkDirection: WalkDirection): void;
        /**
         * Gets the walk direction key mapping.
         */
        getKeyMapping(): Map<KeyCode, WalkDirection>;
        /**
         * Clears all key mappings.
         */
        clearKeyMappings(): void;
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMousewheel(event: Event.MouseWheelInputEvent): void;
        /** @hidden */
        onKeyDown(event: Event.KeyInputEvent): void;
        /** @hidden */
        onKeyUp(event: Event.KeyInputEvent): void;
        private _keyCodeActive;
        private _onKeyChange;
        /**
         * Sets the speed for mouse look.
         * @param mouseLookSpeed
         */
        setMouseLookSpeed(mouseLookSpeed: number): void;
        /**
         * Gets the mouse look speed.
         */
        getMouseLookSpeed(): number;
        /**
         * Sets whether the mouse look is enabled. If enabled, mouse move events will not continue down the operator stack.
         * @param mouseLookEnabled
         */
        setMouseLookEnabled(mouseLookEnabled: boolean): void;
        /**
         * Gets whether the mouse look is enabled. If enabled, mouse move events will not continue down the operator stack.
         */
        getMouseLookEnabled(): boolean;
        resetDefaultWalkSpeeds(): Promise<void>;
        private _execWalkDirection;
        private _queueWalkDirections;
        /** @hidden */
        protected _onTick(): void;
    }
}
declare namespace Communicator.Operator {
    /** @hidden */
    namespace CameraOrbitBaseOperator {
        type CameraRotateFunction = (turnTilt: number[]) => void;
    }
    /** @hidden */
    class CameraOrbitBaseOperator extends OperatorBase {
        private _cameraRotateFunction;
        private _cameraRotationMomentumEnabled;
        private _isDown;
        private _mouseDragged;
        private _averagedMousePoints;
        private _averageTimeIntervalMilliseconds;
        private _previousMouseMovePoint;
        private _mouseMovePoint;
        private _mouseMoveOffset;
        private _previousMouseMoveTime;
        private _mouseMoveTime;
        private _mouseMoveElapsedTimeSeconds;
        private _rotationDegreesPerSecond;
        private _animationLastTickTime;
        private _animationElapsedTimeSeconds;
        private _animationIntervalResult;
        private _preferredAnimationIntervalMilliseconds;
        private _momentum;
        private _momentumLossPerSecond;
        private _degreesPerPixel;
        private _maxRotationMagnitudeScale;
        private _initialSelectionPosition;
        /** @hidden */
        constructor(viewer: WebViewer, rotateFunction: CameraOrbitBaseOperator.CameraRotateFunction);
        getCameraRotationMomentumEnabled(): boolean;
        setCameraRotationMomentumEnabled(val: boolean): void;
        isCurrentlyAnimating(): boolean;
        /** @hidden */
        onDeactivate(): void | Promise<void>;
        /** @hidden */
        onViewOrientationChange(): void;
        supportsAnimation(): boolean;
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        private _rotateCamera;
        stopAnimation(): void;
        getMomentum(): number;
        /**
         * Sets proportion of momentum lost per second if camera rotation momentum is enabled. At 0
         * no momentum is lost and the camera will orbit indefinitely. Above 1 the camera will stop
         * orbiting within a second of release. Only values greater than or equal to 0 are accepted.
         * @param amountLost Proportion of momentum lost per second
         */
        setMomentumLossPerSecond(amountLost: number): void;
        getMomentumLossPerSecond(): number;
        isAnimating(): boolean;
        private _startAnimation;
        private _getMouseMoveOffsetForRotation;
        private _onTick;
    }
}
declare namespace Communicator.Operator {
    /** @hidden */
    class OrbitMarkup extends Markup.MarkupItem {
        private _viewer;
        private _circle;
        private _position;
        constructor(viewer: WebViewer, position: Point3, radius: number);
        draw(): void;
    }
    class CameraOrbitOperator extends CameraOrbitBaseOperator {
        private _orbitTarget;
        private _orbitFallbackMode;
        private _modelCenter;
        private _circleMarkupHandler;
        private _circleRadius;
        private readonly _updateCameraCenterAction;
        private readonly _updateCameraCenterTimer;
        private _primaryButton;
        private _pickPosition;
        private _bimOrbitEnabled;
        /** @hidden */
        constructor(viewer: WebViewer);
        private _updateModelCenter;
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): Promise<void>;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        /** @hidden */
        onDeactivate(): void | Promise<void>;
        /**
         * BIM orbit is intended to make orbiting building models easier.
         * It slows the rotation speed, clamps vertical rotation to 180 degrees, and restricts horizontal rotation to rotate around the vertical axis.
         * @param bimOrbitEnabled
         */
        setBimOrbitEnabled(bimOrbitEnabled: boolean): void;
        /**
         * Returns true if BIM orbit is enabled.
         */
        getBimOrbitEnabled(): boolean;
        /** @hidden */
        _removeMarkup(): void;
        private _getClampedRotationMatrix;
        private _orbitByTurnTiltWithTarget;
        /**
         * Sets the fallback mode. This is used to specify whether to orbit
         * around a set target, the model center, or camera target.
         */
        setOrbitFallbackMode(fallbackMode: OrbitFallbackMode): void;
        /**
         * Gets the orbit fallback mode.
         * @returns orbit fallback mode
         */
        getOrbitFallbackMode(): OrbitFallbackMode;
        /**
         * Sets the orbit target for the orbit fallback mode OrbitTarget.
         * @param orbitTarget
         */
        setOrbitTarget(orbitTarget: Point3): void;
        /**
         * Gets the orbit target point.
         * @returns orbit target
         */
        getOrbitTarget(): Point3;
        /**
         * Sets the primary mouse button. When this button is pressed, we will orbit around the selected point on the model.
         * If there is no selected point, the orbit fallback mode will be used for orbit.
         * @param button
         */
        setPrimaryButton(button: Button): void;
        /**
         * @returns the primary orbit button
         */
        getPrimaryButton(): Button;
    }
}
declare namespace Communicator.Operator {
    class CameraPanOperator extends OperatorBase {
        private _cameraPtPrevious;
        /** @hidden */
        constructor(viewer: WebViewer);
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
    }
}
declare namespace Communicator.Operator {
    class CameraZoomOperator extends OperatorBase {
        private _mouseMoveZoomDelta;
        private _mouseWheelZoomDelta;
        private _pinchZoomModifier;
        private _zoomToMousePosition;
        private _dollyZoomEnabled;
        private _adjustCameraTarget;
        private _preserveViewAngle;
        private _mouseMoveZoomFactor;
        private _mouseWheelZoomFactor;
        private _secondaryTouchId;
        private _lastTouch1;
        private _lastTouch2;
        private _prevLen;
        /** @hidden */
        constructor(viewer: WebViewer);
        /**
         * When true, scrolling up will zoom towards the model.
         * @param inverted
         */
        setMouseWheelZoomInverted(inverted: boolean): void;
        getMouseWheelZoomInverted(): boolean;
        /**
         * When true, moving the mouse up will zoom towards the model.
         * @param inverted
         */
        setMouseMoveZoomInverted(inverted: boolean): void;
        getMouseMoveZoomInverted(): boolean;
        /**
         * Sets the delta to zoom when moving the mouse
         * @param delta
         */
        setMouseMoveZoomDelta(delta: number): void;
        /**
         * Gets the mouse move zoom delta
         * @returns number
         */
        getMouseMoveZoomDelta(): number;
        /**
         * Sets the delta to zoom when scrolling
         * @param delta
         */
        setMouseWheelZoomDelta(delta: number): void;
        /**
         * Gets the scrollwheel zoom delta
         * @returns number
         */
        getMouseWheelZoomDelta(): number;
        /**
         * When set, the zoom will be towards the mouse position. When not set, the zoom will be from the center of the screen.
         * @param zoom
         */
        setZoomToMousePosition(zoom: boolean): void;
        /**
         * @returns boolean When true, the zoom will be towards the mouse position. When false, the zoom will be towards the center of the screen.
         */
        getZoomToMousePosition(): boolean;
        /**
         * When dolly zoom is enabled, the camera position will move towards the camera target when zooming.
         * @moveCameraPositon
         */
        setDollyZoomEnabled(dollyZoomEnabled: boolean): void;
        /**
         * Returns true if dolly zoom is enabled.
         */
        getDollyZoomEnabled(): boolean;
        /**
         * When enabled, the camera target will be updated to the selection position while zooming.
         * This can provide a better zoom behavior in perspective projection mode,
         * but comes at the cost of performing a selection on the model during each mouse scroll,
         * which may not be ideal for performance on large models.
         *
         * This setting is disabled by default.
         */
        setMouseWheelAdjustCameraTarget(value: boolean): void;
        /**
         * Returns whether the camera target will be updated to the selection
         * position while zooming. See [[setMouseWheelAdjustCameraTarget]].
         */
        getMouseWheelAdjustCameraTarget(): boolean;
        /**
         * Sets whether to maintain a constant view angle while zooming. If
         * enabled, when zooming causes the camera's field of view to shrink or
         * grow, the camera's position will also be moved toward or away from
         * the target, respectively.
         *
         * This may prevent confusing camera behavior when perspective
         * projection is used or might be used. When using only orthographic
         * projection, it is better to disable this.
         *
         * If mouse wheel zoom is being using in conjunction with window zoom
         * this setting should be the same in both.
         *
         * This setting is enabled by default.
         */
        setPreserveViewAngle(value: boolean): void;
        /**
         * Gets whether to maintain a constant view angle while zooming. See
         * [[setPreserveViewAngle]].
         */
        getPreserveViewAngle(): boolean;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): Promise<void>;
        /** @hidden */
        onMousewheel(event: Event.MouseWheelInputEvent): Promise<void>;
        /** @hidden */
        onTouchStart(event: Event.TouchInputEvent): void;
        /** @hidden */
        onTouchMove(event: Event.TouchInputEvent): void;
        /** @hidden */
        onTouchEnd(event: Event.TouchInputEvent): void;
        /** @hidden */
        onDeactivate(): void;
        private _updateCameraViewAngle;
        private _dollyZoom;
        private _doZoom;
        private _zoomHelper;
    }
}
declare namespace Communicator.Operator {
    class CameraNavigationOperator extends OperatorBase {
        private _orbitOperator;
        private _panOperator;
        private _zoomOperator;
        private _activeOperator;
        private _activeTouchCount;
        private _touchMoveCount;
        private _returnToOrbit;
        private _bimNavigationEnabled;
        /** @hidden */
        constructor(viewer: WebViewer, orbitOperator: CameraOrbitOperator, panOperator: CameraPanOperator, zoomOperator: CameraZoomOperator);
        /**
         * When BIM navigation is enabled, the following controls for orbit, pan, and zoom are set:
         * Left mouse button: orbit
         * Middle mouse wheel: zoom
         * Middle mouse button: pan
         * Right mouse button: zoom
         * @param bimNavigation
         */
        setBimNavigationEnabled(bimNavigation: boolean): void;
        private _setBimCamera;
        /**
         * Returns true if BIM navigation is enabled.
         */
        getBimNavigationEnabled(): boolean;
        /** @hidden */
        onViewOrientationChange(): void;
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMousewheel(event: Event.MouseWheelInputEvent): Promise<void>;
        /** @hidden */
        onTouchStart(event: Event.TouchInputEvent): void;
        /** @hidden */
        onTouchMove(event: Event.TouchInputEvent): void;
        /** @hidden */
        onTouchEnd(event: Event.TouchInputEvent): void;
        /** @hidden */
        stopInteraction(): void | Promise<void>;
        private _setActiveOperatorForMouseInput;
        /** @hidden */
        onDeactivate(): void;
    }
}
declare namespace Communicator.Operator {
    class CameraTurntableOperator extends CameraOrbitBaseOperator {
        private _rotationAxis;
        private _tiltAmount;
        /** @hidden */
        constructor(viewer: WebViewer);
        private _rotateAroundAxis;
        /** @hidden */
        onMousewheel(event: Event.MouseWheelInputEvent): void;
        /**
         * Sets the rotation axis.
         * @param axis
         */
        setRotationAxis(axis: Axis): boolean;
    }
}
declare namespace Communicator.Operator {
    class CameraWalkModeOperator implements Operator {
        private _keyboardWalkOperator;
        private _walkOperator;
        private _activeOperator;
        private _walkMode;
        private _active;
        /** @hidden */
        constructor(_viewer: WebViewer, walkOperator: CameraWalkOperator, keyboardWalkOperator: CameraKeyboardWalkOperator);
        /**
         * Sets the walk mode to Mouse or Keyboard.
         * @param walkMode
         */
        setWalkMode(walkMode: WalkMode): Promise<void>;
        /**
         * Gets the walk mode.
         * @returns Keyboard or Mouse
         */
        getWalkMode(): WalkMode;
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMousewheel(event: Event.MouseWheelInputEvent): void;
        /** @hidden */
        onTouchStart(event: Event.TouchInputEvent): void;
        /** @hidden */
        onTouchMove(event: Event.TouchInputEvent): void;
        /** @hidden */
        onTouchEnd(event: Event.TouchInputEvent): void;
        /** @hidden */
        onKeyDown(event: Event.KeyInputEvent): void;
        /** @hidden */
        onKeyUp(event: Event.KeyInputEvent): void;
        /** @hidden */
        onDeactivate(): void | Promise<void>;
        /** @hidden */
        onActivate(): void | Promise<void>;
        /** @hidden */
        onViewOrientationChange(): void;
        /** @hidden */
        stopInteraction(): void | Promise<void>;
        /**
         * Sets BIM mode enables/disabled on both mouse and keyboard walk
         */
        setBimModeEnabled(enabled: boolean): Promise<void>;
        /**
         * Resets speeds to defaults on both mouse and keyboard walk
         */
        resetDefaultWalkSpeeds(): Promise<void>;
        /**
         * Sets BIM floor config on both mouse and keyboard walk
         */
        setBimFloorConfig(floorConfig: CameraWalkBaseOperator.Bim.FloorConfig): void;
        /**
         * Sets BIM wall config on both mouse and keyboard walk
         */
        setBimWallConfig(wallConfig: CameraWalkBaseOperator.Bim.WallConfig): void;
        /**
         * Sets BIM door config on both mouse and keyboard walk
         */
        setBimDoorConfig(doorConfig: CameraWalkBaseOperator.Bim.DoorConfig): void;
        /**
         * Sets zoom speed on both mouse and keyboard walk
         */
        setZoomSpeed(speed: number): void;
        /**
         * Sets walk speed for both mouse and keyboard walk
         */
        setWalkSpeed(speed: number): void;
        /**
         * Sets elevation speed for both mouse and keyboard walk
         */
        setElevationSpeed(speed: number): void;
        /**
         * Sets rotation speed for both mouse and keyboard walk
         */
        setRotationSpeed(speed: number): void;
        /**
         * Sets view angle (FOV) for both mouse and keyboard walk operators
         */
        setViewAngle(angle: number): void;
    }
}
declare namespace Communicator.Operator {
    class CameraWalkOperator extends CameraWalkBaseOperator {
        private _timerId;
        private _walkButton;
        private _previousTimestamp;
        private _activeTouchCount;
        private _maxDistance;
        /** @hidden */
        constructor(viewer: WebViewer);
        /** @hidden */
        onActivate(): Promise<void>;
        /** @hidden */
        onKeyDown(event: Event.KeyInputEvent): void;
        /** @hidden */
        onDeactivate(): Promise<void>;
        private _checkProjection;
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        /** @hidden */
        onTouchStart(event: Event.TouchInputEvent): void;
        /** @hidden */
        onTouchMove(event: Event.TouchInputEvent): void;
        /** @hidden */
        onTouchEnd(event: Event.TouchInputEvent): void;
        /** @hidden */
        onMousewheel(event: Event.MouseWheelInputEvent): void;
        /** @hidden */
        stopWalking(): void;
        /** @hidden */
        _testWalk(walkSpeed: number, walkDuration: number, button: Button): Promise<void>;
        /** @hidden */
        protected _onTick(): void;
        private _adjustTilt;
        private _resetCameraTarget;
    }
}
declare namespace Communicator.Operator {
    class CameraWindowZoomOperator extends OperatorBase {
        private _rectangleMarkup;
        private _view;
        private _computeTarget;
        private _preserveViewAngle;
        /** @hidden */
        constructor(viewer: WebViewer);
        /**
         * When enabled, the camera target will be computed using selection while zooming.
         * This can provide a better zoom behavior in perspective projection mode,
         * but comes at the cost of performing a selection on the model during each zoom operation,
         * which may not be ideal for performance on large models.
         *
         * This setting is disabled by default.
         */
        setComputeTarget(compute: boolean): void;
        /**
         * Returns whether a new camera target will be computed using selection.
         * See [[setComputeTarget]]
         */
        getComputeTarget(): boolean;
        /**
         * Sets whether to maintain a constant view angle while zooming. If
         * enabled, when zooming causes the camera's field of view to shrink or
         * grow, the camera's position will also be moved toward or away from
         * the target, respectively.
         *
         * This may prevent confusing camera behavior when perspective
         * projection is used or might be used. When using only orthographic
         * projection, it is better to disable this.
         *
         * If window zoom is being using in conjunction with mouse wheel zoom
         * this setting should be the same in both.
         *
         * This setting is enabled by default.
         */
        setPreserveViewAngle(preserve: boolean): void;
        /**
         * Gets whether to maintain a constant view angle while zooming. See
         * [[setPreserveViewAngle]].
         */
        getPreserveViewAngle(): boolean;
        private adjustPositionToPlane;
        private computeNewField;
        private computeReasonableTarget;
        private getCameraTarget;
        doZoom(rectMin: Point2, rectMax: Point2): Promise<void>;
        /** @hidden */
        onMouseDown(e: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseMove(e: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(e: Event.MouseInputEvent): Promise<void>;
    }
}
declare namespace Communicator.Markup.Note {
    class NoteTextElement {
        private _container;
        private _textArea;
        private _positionOffset;
        private _position;
        private _activeNoteText;
        constructor();
        private _createTextBox;
        /**
         * Sets the corner offset position of the HTML container.
         * @param positionOffset
         */
        setPositionOffset(positionOffset: Point2): void;
        /**
         * @returns the current HTML container offset position.
         */
        getPositionOffset(): Point2;
        /**
         * Sets the position of the HTML container, taking into account the position offset.
         * @param position
         */
        setPosition(position: Point2): void;
        /**
         * @returns the position of the HTML container, taking into account the position offset.
         */
        getPosition(): Point2;
        /**
         * Sets the text in the HTML container text area.
         * @param text
         */
        setText(text: string): void;
        /**
         * @returns the current text in the HTML container text area.
         */
        getText(): string;
        /**
         * Sets the size of the HTML container.
         * @param size
         */
        setSize(size: Point2): void;
        /**
         * @returns the size of the HTML container.
         */
        getSize(): Point2;
        /**
         * Puts the cursor focus in the HTML container text area.
         */
        focus(): void;
        /**
         * Removes the cursor focus from the HTML container text area.
         */
        blur(): void;
        /**
         * Hides the HTML container.
         */
        hide(): void;
        /**
         * Sets the active NoteText and shows the HTML container.
         * @param noteText
         */
        show(noteText: NoteText): void;
        /**
         * @returns the HTML container element.
         */
        getHtmlContainer(): HTMLDivElement;
        /**
         * Sets the HTML container element.
         * @param container
         */
        setHtmlContainer(container: HTMLDivElement): void;
    }
}
/**
 * The Markup module factilitates interactions with markup in the WebViewer. More information can be found [here](https://docs.techsoft3d.com/communicator/latest/build/prog_guide/viewing/markup/markup-basics.html).
 * @preferred
 */
declare namespace Communicator.Markup {
    /** @hidden */
    class HandleMarkup extends MarkupItem {
        static readonly className = "Communicator.Markup.HandleMarkup";
        static readonly defaultGroupId = -1;
        private readonly _viewer;
        private readonly _meshIds;
        private static readonly _defaultScale;
        private static readonly _cylinderRadius;
        private static readonly _coneBaseRadius;
        private static readonly _cylinderHeight;
        private static readonly _capHeight;
        private static readonly _taperHeight;
        private static readonly _segmentCount;
        private static readonly _planeOffset;
        private static readonly _planeLength;
        private _scaleModifier;
        private static readonly _xColor;
        private static readonly _yColor;
        private static readonly _zColor;
        private static readonly _viewPlaneColor;
        private _id;
        private _handleData;
        private readonly _translationFromInitialHandlePosition;
        private _groupIdRotationMatrix;
        private _callbacks;
        constructor(viewer: WebViewer);
        remove(): void;
        private _getAxisMeshData;
        private _getPlaneMeshData;
        private _getViewPlaneMeshData;
        private _getRotateMeshData;
        setAxisMeshData(meshData: MeshData): Promise<void>;
        setPlaneMeshData(meshData: MeshData): Promise<void>;
        setViewPlaneMeshData(meshData: MeshData): Promise<void>;
        setRotateMeshData(meshData: MeshData): Promise<void>;
        /**
         * Gets the associated overlay id
         */
        getOverlayId(): OverlayIndex;
        private _hideOverlay;
        hideOverlay(): DeprecatedPromise;
        private _showOverlay;
        showOverlay(): DeprecatedPromise;
        private _updateViewport;
        updateViewport(): DeprecatedPromise;
        addHandles(position: Point3, scaleModifier: number, groupId: number): Promise<void>;
        private _updateCamera;
        getVector(nodeId: NodeId): Point3 | null;
        getHandleType(nodeId: NodeId): HandleType | null;
        getHandleGroupId(nodeId: NodeId): number;
        getPosition(nodeId: NodeId): Point3 | null;
        getHandleNodeIds(groupId?: number | null): NodeId[];
        removeHandles(groupId?: number | null): Promise<void>;
        isEmpty(): boolean;
        createDefaultHandles(position: Point3, groupId: number): Promise<void>;
        private _createMeshId;
        addAxisTranslationHandle(position: Point3, translationAxis: Point3, color: Color, positionNormal: Point3 | null, groupId: number): Promise<NodeId>;
        addViewPlaneHandle(position: Point3, color: Color, groupId: number): Promise<NodeId>;
        addPlaneTranslationHandle(position: Point3, planeNormal: Point3, faceColor: Color, lineColor: Color, positionNormal: Point3 | null, groupId: number): Promise<NodeId>;
        addRotateHandle(position: Point3, rotateAxis: Point3, instanceColor: Color, positionNormal: Point3 | null, groupId: number): Promise<NodeId>;
        private _getRotationMatrixFromVector;
        private _createMeshInstance;
        private _createTransformationMatrix;
        private _getHandlePosition;
        getGroupIdRotationMatrix(groupId: number): Matrix;
        updatePosition(newTranslation: Point3, newRotation: Matrix, finalizePosition: boolean, groupId: number, childrenGroupIds: Map<number, NodeId>): Promise<void>;
        resetTranslation(): void;
        getTranslation(): Point3;
    }
}
declare namespace Communicator.Markup.Measure {
    /** @hidden */
    class MeasureBodyBodyDistanceMarkup extends MeasureMarkup {
        private _firstNode;
        private _firstPointShape;
        private _secondPointShape;
        private _arrowsInvert;
        private _measurePoint1;
        private _measurePoint2;
        private _leaderPoint1;
        private _leaderPoint2;
        private _textPoint;
        private initCircle;
        constructor(viewer: WebViewer);
        setUnitMultiplier(value: number): void;
        setFirstNode(node: NodeId): void;
        getFirstNode(): NodeId | null;
        setSecondNode(node: NodeId): Promise<void>;
        _getStage(): number;
        finalize(): void;
        adjust(position: Point2): void;
        private _updateArrowsInverted;
        update(): void;
        draw(): void;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /**
         * Creates a new [[MeasureBodyBodyDistanceMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): MeasureBodyBodyDistanceMarkup;
        getClassName(): string;
    }
}
declare namespace Communicator.Markup.Measure {
    /** @hidden */
    class MeasureLengthMarkup extends MeasureMarkup {
        protected _lineEdgeShape: Shape.Polyline;
        protected _linePositions: Point3[];
        /** @hidden */
        constructor(viewer: WebViewer);
        setLineGeometry(linePoints: Point3[]): void;
        setMeasurementEdgeColor(color: Color): void;
        reset(): void;
        adjust(position: Point2): void;
        draw(): void;
        getLineEdgeShape(): Shape.Polyline;
        getClassName(): string;
    }
}
declare namespace Communicator.Markup.Measure {
    /** @hidden */
    class MeasureCircleEdgeLengthMarkup extends MeasureLengthMarkup {
        private _lineProperties;
        private _circlePoints;
        private _matrix;
        private _radius;
        private _surfaceCenter;
        private _circlePlane;
        private _arrowsInvert;
        constructor(viewer: WebViewer, lineProperties: SubentityProperties.CircleElement, matrix: Matrix, unitMultiplier: number);
        private createCircleData;
        setLineGeometry(linePoints: Point3[]): void;
        adjust(position: Point2): void;
        private _updateArrowsInverted;
        update(): void;
        draw(): void;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[MeasureCircleEdgeLengthMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): MeasureCircleEdgeLengthMarkup;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any, viewer: WebViewer): MeasureCircleEdgeLengthMarkup;
        getClassName(): string;
    }
}
declare namespace Communicator.Markup.Measure {
    /** @hidden */
    class MeasureFaceFaceAngleMarkup extends MeasureMarkup {
        private _faceSelection;
        private _arcArray;
        private _lineGeometryShape;
        private planeIntersectionLine;
        private _pointOnLine;
        private _clickpointOriginal2;
        private _clickpointOriginal1;
        private _plane1;
        private _plane2;
        private _secondPoint;
        private _firstPoint;
        private _textPos;
        private _intermediatePoint;
        private _textAnchorPoint;
        private _angle;
        private _useAuthoredNormals;
        constructor(viewer: WebViewer);
        private _getNormalAndPositionFromSelection;
        getFirstSelection(): Selection.FaceSelectionItem;
        setFirstFace(sr: Selection.FaceSelectionItem): Promise<void>;
        setSecondFace(sr: Selection.FaceSelectionItem): Promise<boolean>;
        adjust(position: Point2): void;
        _nextStage(): void;
        cleanup(): void;
        update(): void;
        draw(): void;
        /**
         * Sets whether created markup will use authored normals or use selection results to calculate angles
         * @param use
         */
        setUseAuthoredNormals(use: boolean): void;
        /**
         * Gets whether created markup will use authored normals or use selection results to calculate angles
         */
        getUseAuthoredNormals(): boolean;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[MeasureFaceFaceAngleMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): MeasureFaceFaceAngleMarkup;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any, viewer: WebViewer): MeasureFaceFaceAngleMarkup;
        getClassName(): string;
    }
}
declare namespace Communicator.Markup.Measure {
    /** @hidden */
    class MeasureFaceFaceDistanceMarkup extends MeasureMarkup {
        private _faceSelection;
        private _line1PreviewShape1;
        private _line1PreviewShape2;
        private _line2PreviewShape1;
        private _line2PreviewShape2;
        private _matrix1;
        private _matrix2;
        private _lineGeometryShape;
        private _parallelFaces;
        private _triangulatedDistance;
        private _pointsOnSameRay;
        private _arrowsInvert;
        private _faceData;
        private _distance;
        private _surfaceCenter;
        private _surfaceAxis1;
        private _surfaceAxis2;
        private _cylinderAxisInfinite1;
        private _cylinderAxisInfinite2;
        private _secondPointInitial;
        private _firstPointHelper;
        private _secondPointHelper;
        private _secondPoint;
        private _firstPoint;
        private _textPos;
        constructor(viewer: WebViewer);
        setUnitMultiplier(value: number): void;
        setFirstFace(sr: Selection.FaceSelectionItem, faceProperties: SubentityProperties.Base, matrix: Matrix, bbox: Box): void;
        getFirstSelection(): Selection.FaceSelectionItem | null;
        getFirstFaceData(): SubentityProperties.Base | null;
        cleanup(): void;
        private createCylinderData;
        setSecondFace(point: Point2, sr: Selection.FaceSelectionItem, faceProperties: SubentityProperties.Base, matrix: Matrix, bbox: Box): Promise<void>;
        adjust(position: Point2): void;
        private _updateArrowsInverted;
        _nextStage(): void;
        /** @hidden */
        update(): void;
        draw(): void;
        private static _serializeFaceProp;
        private static _constructFaceProp;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[MeasureFaceFaceDistanceMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): MeasureFaceFaceDistanceMarkup;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any, viewer: WebViewer): MeasureFaceFaceDistanceMarkup;
        getClassName(): string;
    }
}
declare namespace Communicator.Markup.Measure {
    /** @hidden */
    class MeasureLineLineAngleMarkup extends MeasureMarkup {
        private _anchorLinePoint;
        private _firstLinePoint;
        private _secondLinePoint;
        private _selectionPosition;
        private _lineGeometryShape;
        constructor(viewer: WebViewer);
        addPoint(position: Point3): boolean;
        setSelectionPosition(selectionPosition: Point3 | null): void;
        getLineGeometryShape(): Shape.Polyline;
        private _drawPreviewLine;
        private _drawAngleMarkup;
        draw(): void;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /**
         * Creates a new [[MeasurePointPointDistanceMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): MeasureLineLineAngleMarkup;
        getClassName(): string;
    }
}
declare namespace Communicator.Markup.Measure {
    /** @hidden */
    class MeasurePointPointDistanceMarkup extends MeasureMarkup {
        private _firstPointShape;
        private _secondPointShape;
        private _arrowsInvert;
        private initCircle;
        constructor(viewer: WebViewer);
        setUnitMultiplier(value: number): void;
        setFirstPointPosition(position: Point3): void;
        setSecondPointPosition(position: Point3): void;
        _getStage(): number;
        finalize(): void;
        getFirstPointPosition(): Point3;
        getSecondPointPosition(): Point3;
        adjust(position: Point2): void;
        private _updateArrowsInverted;
        update(): void;
        draw(): void;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[MeasurePointPointDistanceMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): MeasurePointPointDistanceMarkup;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any, viewer: WebViewer): MeasurePointPointDistanceMarkup;
        getClassName(): string;
    }
}
declare namespace Communicator.Markup.Measure {
    /** @hidden */
    class MeasurePolygonAreaMarkup extends MeasureMarkup {
        private readonly _initialPoint;
        private readonly _leaderLine;
        private readonly _endpoints;
        private readonly _textboxCorners;
        private readonly _polygon;
        private _plane;
        textPosition: Point3;
        leaderPosition: Point3;
        pointRadius: number;
        constructor(viewer: WebViewer);
        private _calculateArea;
        /**
         * Adds a point to the point list and updates the calculated polygon area.
         * Only points that are coplanar will be added.
         * Returns a bool representing if the point was accepted or not
         */
        addPoint(point: Point3): boolean;
        getPoints(): Point3[];
        getLast(): Point3 | null;
        finalize(): void;
        setUnitMultiplier(value: number): void;
        isValid(): boolean;
        getMeasurementText(): string;
        /** Calculates the screen position for each point in the polygon */
        private _updateProjectedPoints;
        private _updateTextBoxCorners;
        /** Finds and returns the closest corner of the text box.  Used as the endpoint of the leader line. */
        private _calculateLeaderEndpoint;
        draw(): void;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /**
         * Creates a new [[MeasurePolygonAreaMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): MeasurePolygonAreaMarkup;
        /** This measurement only allows clicking on the text box portion of the markup. */
        hit(point: Point2): boolean;
        getClassName(): string;
    }
}
declare namespace Communicator.Markup.Measure {
    /** @hidden */
    class MeasurePolylineDistanceMarkup extends MeasureMarkup {
        private readonly _polyline;
        private readonly _initialPoint;
        private readonly _leaderLine;
        private readonly _endpoints;
        private readonly _textboxCorners;
        textPosition: Point3;
        leaderPosition: Point3;
        isLoop: boolean;
        pointRadius: number;
        constructor(viewer: WebViewer);
        /** Adds a point to the pointlist and updates the calculated polyline distance */
        addPoint(point: Point3): void;
        getPoints(): Point3[];
        getlast(): Point3 | null;
        finalize(): void;
        setUnitMultiplier(value: number): void;
        isValid(): boolean;
        getMeasurementText(): string;
        /** Calculates the screen position for each point in the polyline */
        private _updateProjectedPoints;
        private _updateTextBoxCorners;
        /** Finds and returns the closest corner of the text box.  Used as the endpoint of the leader line. */
        private _calculateLeaderEndpoint;
        draw(): void;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /**
         * Creates a new [[MeasurePolylineDistanceMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): MeasurePolylineDistanceMarkup;
        /** This measurement only allows clicking on the text box portion of the markup. */
        hit(point: Point2): boolean;
        getClassName(): string;
    }
}
declare namespace Communicator.Markup.Measure {
    /** @hidden */
    class MeasureStraightEdgeLengthMarkup extends MeasureLengthMarkup {
        private _lineProperties;
        private _matrix;
        private _worldSpaceLength;
        private _arrowsInvert;
        /** @hidden */
        constructor(viewer: WebViewer, lineProperties: SubentityProperties.LineElement | SubentityProperties.OtherEdgeElement | null, matrix: Matrix, unitMultiplier: number);
        /** @hidden */
        setLineGeometry(linePoints: Point3[]): void;
        /** @hidden */
        adjust(position: Point2): void;
        private _updateArrowsInverted;
        /** @hidden */
        update(): void;
        /** @hidden */
        draw(): void;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[MeasureStraightEdgeLengthMarkup]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): MeasureStraightEdgeLengthMarkup;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any, viewer: WebViewer): MeasureStraightEdgeLengthMarkup;
        getClassName(): string;
    }
}
declare namespace Communicator.Markup.Note {
    /** @hidden */
    class NoteText extends MarkupItem {
        static className: string;
        private _viewer;
        private _noteTextManager;
        private _uniqueId;
        private _noteElementId;
        private _sphereInstanceId?;
        private _stemInstanceId?;
        private _position;
        private _selectionPosition;
        private _selectionNormal;
        private _partId;
        private _pinBoundingBox?;
        private _text;
        private _color;
        private _sphereRadius;
        private _deleted;
        private _active;
        private _callbacks;
        constructor(viewer: WebViewer, noteTextManager: NoteTextManager, selectionPosition: Point3, selectionNormal: Point3, partId: PartId);
        private _init;
        private _matchPartVisibility;
        updatePosition(): Promise<void>;
        private _restore;
        restore(): Promise<void>;
        setText(text: string): void;
        saveTextValue(): void;
        draw(): Promise<void>;
        hit(point: Point2): boolean;
        hitWithTolerance(point: Point2, pickTolerance: number): boolean;
        getClassName(): string;
        getUniqueId(): Uuid;
        getSphereInstanceId(): NodeId | undefined;
        getStemInstanceId(): NodeId | undefined;
        onSelect(): void;
        onDeselect(): void;
        hide(): void;
        private _show;
        show(): void;
        remove(): Promise<void>;
        getRemoved(): boolean;
        setColor(color: Color): DeprecatedPromise;
        getColor(): Color;
        getPartId(): PartId;
        private _updateColor;
        private _createPinTransformationMatrix;
        private _createPinStemInstance;
        private _createPinSphereInstance;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        private static _fromJson;
        /**
         * Creates a new [[NoteText]] from an object given by [[toJson]].
         * @param An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(obj: any, viewer: WebViewer, noteTextManager: NoteTextManager): Promise<NoteText | null>;
    }
}
declare namespace Communicator.Markup.Note {
    class NoteTextManager extends MarkupTypeManager {
        private static _globalPinSphereMeshData;
        private static _globalPinStemMeshData;
        private _pinSphereMeshId;
        private _pinStemMeshId;
        private _viewer;
        private _noteTextElement;
        private _noteTextList;
        private _activeItemHandle;
        private _activeItem;
        private _explodeActive;
        private _isolateActive;
        private _stemLength;
        private _sphereIterations;
        constructor(viewer: WebViewer);
        private _init;
        private _createPinStemMeshData;
        private _createPinSphereMeshData;
        /**
         * Retrieves the mesh id of the stem of the note pin, if there is one
         * @returns MeshId of the note pin stem, or null if there is none
         */
        getPinStemMeshId(): MeshId | null;
        /**
         * Retrieves the mesh id of the spherical head of the note pin, if there is one
         * @returns MeshId of the note pin sphere, or null if there is none
         */
        getPinSphereMeshId(): MeshId | null;
        /**
         * Retrieves the note text element
         * @returns note text element
         */
        getNoteTextElement(): NoteTextElement;
        /**
         * Sets the note text element
         * @param noteTextElement
         */
        setNoteTextElement(noteTextElement: NoteTextElement): void;
        /**
         * Gets an array of all NoteText items that have been added to the manager
         * @returns array of all NoteText items
         */
        getNoteTextList(): NoteText[];
        /**
         * Adds a note and makes it active
         * @param note NoteText to be added to the manager
         */
        addNote(note: NoteText): void;
        /**
         * Removes a note from the manager
         * @param note NoteText to be removed from the manager
         */
        removeNote(note: NoteText): void;
        /**
         * Updates note pin visibility based on manager state (namely the current explode state)
         */
        updatePinVisibility(): Promise<void>;
        /**
         * Sets manager explode state based on explosion magnitude. Active explosion hides note pins
         * @param magnitude Explosion magnitude
         */
        explode(magnitude: number): Promise<void>;
        /**
         * Gets managers explosion state. Active explosion hides note pins
         */
        getExplodeActive(): boolean;
        /**
         * Sets whether an isolate is currently active or not
         * @param isolateActive
         */
        setIsolateActive(isolateActive: boolean): void;
        /**
         * Gets whether an isolate is currently active or not
         * @returns isolate status
         */
        getIsolateActive(): boolean;
        /**
         * Get the currently active note text
         * @returns Currently active note text
         */
        getActiveItem(): NoteText | null;
        /**
         * Sets a new currently active note text
         * @param activeItem note text to be marked as currently active
         */
        setActiveItem(activeItem: NoteText | null): void;
        /**
         * Get the active handle string, such as the one returned by [[MarkupManager.registerMarkup]]
         * @returns Active handle string
         */
        getActiveItemHandle(): string | null;
        /**
         * Set the active handle string, should be provided by [[MarkupManager.registerMarkup]]
         * @param activeItemHandle Active handle string
         */
        setActiveItemHandle(activeItemHandle: string | null): void;
        /**
         * Attempts to set the active note to the one associated with the
         * pins elected by the provided [[SelectionItem]]
         * @param selection SelectionItem to attempt to find note from
         */
        selectPin(selection: Selection.SelectionItem): boolean;
        /**
         * Checks if a nodeId is part of a note pin
         * @param nodeId NodeId to be checked
         */
        checkPinInstance(nodeId: NodeId): boolean;
        private _getNoteTextFromNodeId;
        /**
         * Checks if a UUID is associated with any existing notes
         * @param id UUID to check
         */
        findById(id: Uuid): boolean;
        /**
         * Loads notes from an iterable of JSON data like that returned by [[exportMarkup]]
         * @param notes JSON note data iterable
         */
        loadData(notes: any): Promise<boolean[]>;
        /**
         * Exports note texts to an array of JSON Objects that can be restored via [[loadData]]
         * @returns Array of JSON objects representing notes
         */
        exportMarkup(): Object[];
    }
}
declare namespace Communicator.Markup.Redline {
    /** @hidden */
    class RedlineCircle extends RedlineItem {
        private _uniqueId;
        private _centerPt;
        private _radiusPt;
        private _circleShape;
        private static _validRadiusTolerance;
        private _previousDragPlanePosition;
        constructor(viewer: WebViewer);
        setCenter(center: Point3): void;
        getCenter(): Point3;
        setRadiusPoint(radiusPoint: Point3): void;
        getRadiusPoint(): Point3;
        getUniqueId(): Uuid;
        private _update;
        draw(): void;
        hit(point: Point2): boolean;
        hitWithTolerance(point: Point2, pickTolerance: number): boolean;
        onSelect(): void;
        onDeselect(): void;
        isValid(): boolean;
        onDragStart(position: Point2): boolean;
        onDragMove(position: Point2): boolean;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[RedlineCircle]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): RedlineCircle;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any, viewer: WebViewer): RedlineCircle;
        getClassName(): string;
    }
}
declare namespace Communicator.Markup.Redline {
    /** @hidden */
    class RedlinePolyline extends RedlineItem {
        private _uniqueId;
        private _points;
        private _polylineShape;
        private _previousDragPlanePosition;
        constructor(viewer: WebViewer);
        addPoint(point: Point3): void;
        getPoints(): Point3[];
        private _update;
        draw(): void;
        hit(point: Point2): boolean;
        hitWithTolerance(point: Point2, pickTolerance: number): boolean;
        onSelect(): void;
        onDeselect(): void;
        getClassName(): string;
        isValid(): boolean;
        onDragStart(position: Point2): boolean;
        onDragMove(position: Point2): boolean;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[RedlinePolyline]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): RedlinePolyline;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any, viewer: WebViewer): RedlinePolyline;
    }
}
declare namespace Communicator.Markup.Redline {
    /** @hidden */
    class RedlineRectangle extends RedlineItem {
        private _uniqueId;
        private _point1;
        private _point2;
        private _rectangleShape;
        private static _validSizeTolerance;
        private _previousDragPlanePosition;
        constructor(viewer: WebViewer);
        setPoint1(point1: Point3): void;
        getPoint1(): Point3;
        setPoint2(point2: Point3): void;
        getPoint2(): Point3;
        getUniqueId(): Uuid;
        private _update;
        draw(): void;
        hit(point: Point2): boolean;
        hitWithTolerance(point: Point2, pickTolerance: number): boolean;
        onSelect(): void;
        onDeselect(): void;
        isValid(): boolean;
        onDragStart(position: Point2): boolean;
        onDragMove(position: Point2): boolean;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[RedlineRectangle]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): RedlineRectangle;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any, viewer: WebViewer): RedlineRectangle;
        getClassName(): string;
    }
}
declare namespace Communicator.Markup.Redline {
    /** @hidden */
    class RedlineTextElement {
        private static _defaultSize;
        private _textArea;
        private _currentSize;
        private _sizeChanged;
        private _sizeUpdateCallback;
        private _textUpdateCallback;
        constructor(sizeUpdateCallback: (size: Point2) => void, textUpdateCallback: (text: string) => void);
        private _createTextBox;
        setPosition(pos: Point2): void;
        setBorderWidth(borderWidth: number): void;
        setText(text: string): void;
        setSize(size: Point2): void;
        focus(): void;
        blur(): void;
        getTextArea(): HTMLTextAreaElement;
    }
}
declare namespace Communicator.Markup.Redline {
    /** @hidden */
    class RedlineText extends RedlineItem {
        private _uniqueId;
        private _position;
        private _size;
        private _text;
        private _redlineTextElement;
        private _redlineElementId;
        static className: string;
        private static defaultText;
        private _previousDragPlanePosition;
        private _callbacks;
        constructor(viewer: WebViewer, text?: string);
        setPosition(point: Point3): void;
        getPosition(): Point3;
        setSize(size: Point2): void;
        getSize(): Point2;
        setText(text: string): void;
        getText(): string;
        draw(): void;
        hit(point: Point2): boolean;
        hitWithTolerance(point: Point2, pickTolerance: number): boolean;
        getClassName(): string;
        onSelect(): void;
        onDeselect(): void;
        isValid(): boolean;
        remove(): void;
        onDragStart(position: Point2): boolean;
        onDragMove(position: Point2): boolean;
        /**
         * Creates an object ready for JSON serialization.
         * @returns The prepared object.
         */
        toJson(): Object;
        private _toJson;
        /** @deprecated Use [[toJson]] instead. */
        forJson(): Object;
        /**
         * Creates a new [[RedlineText]] from an object given by [[toJson]].
         * @param objData An object given by [[toJson]].
         * @returns The prepared object.
         */
        static fromJson(objData: any, viewer: WebViewer): RedlineText;
        /** @deprecated Use [[fromJson]] instead. */
        static construct(obj: any, viewer: WebViewer): RedlineText;
    }
}
declare namespace Communicator.Operator {
    /**
     * This operator allows you to measure the minimum distance between two bodies.
     * Moving the mouse over the model will highlight the body that will be measured.
     * Clicking will select the first node to be measured, it will stay highlighted as
     * you move the mouse away. Clicking a second time on a different body will begin the
     * measurement. Once the measurement is completed you can move the mouse to position the
     * measurement text box. The markup drawn represents the shortest distance between the
     * two bodies you selected. Clicking a final time will place the measurement text box
     * and finalize the measurement.
     */
    class MeasureBodyBodyDistanceOperator extends OperatorBase {
        private readonly _measureManager;
        private readonly _moveSelectionAction;
        private _currentMoveHighlight;
        private _currentSelectHighlight;
        private _markup;
        constructor(viewer: WebViewer, measureManager: MeasureManager);
        private _unsetCurrentMoveHighlight;
        private _unsetCurrentSelectionHighlight;
        private _performMoveSelection;
        private _performUpSelection;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        private _onMouseUpImpl;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): Promise<void>;
        /** @hidden */
        setDraggingEnabled(dragging: boolean): void;
        /** @hidden */
        onKeyUp(_event: Event.KeyInputEvent): void;
        /** @hidden */
        onKeyDown(event: Event.KeyInputEvent): void;
        /** @hidden */
        setHandled(): boolean;
        /** @hidden */
        onDeactivate(): void;
    }
}
declare namespace Communicator.Operator {
    class MeasureEdgeLengthOperator extends OperatorBase {
        private readonly _measureManager;
        private readonly _pickConfig;
        private readonly _moveSelectionAction;
        private _lengthMarkup;
        private _edgeMarkup;
        /** @hidden */
        constructor(viewer: WebViewer, measureManager: MeasureManager);
        /** @hidden */
        onActivate(): void;
        private _unregisterEdgeMarkup;
        private _registerEdgeMarkup;
        private _resetEdgeMarkup;
        private _performMoveSelection;
        private _performUpSelection;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        private _onMouseUpImpl;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        /** @hidden */
        setDraggingEnabled(dragging: boolean): void;
        /** @hidden */
        onKeyUp(_event: Event.KeyInputEvent): void;
        /** @hidden */
        onKeyDown(event: Event.KeyInputEvent): void;
        /** @hidden */
        setHandled(): boolean;
        /** @hidden */
        onDeactivate(): void;
    }
}
declare namespace Communicator.Operator {
    class MeasureFaceFaceAngleOperator extends OperatorBase {
        private readonly _measureManager;
        private readonly _moveSelectionAction;
        private _currentHighlight;
        private _markup;
        private _useAuthoredNormals;
        constructor(viewer: WebViewer, measureManager: MeasureManager);
        private _unsetCurrentHighlight;
        private _performMoveSelection;
        private _performUpSelection;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        private _onMouseUpImpl;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        /** @hidden */
        setDraggingEnabled(dragging: boolean): void;
        /** @hidden */
        onKeyUp(_event: Event.KeyInputEvent): void;
        /** @hidden */
        onKeyDown(event: Event.KeyInputEvent): void;
        /** @hidden */
        setHandled(): boolean;
        /** @hidden */
        onDeactivate(): void;
        /**
         * Sets whether created markup will use authored normals or use selection results to calculate angles
         * @param use
         */
        setUseAuthoredNormals(use: boolean): void;
        /**
         * Gets whether created markup will use authored normals or use selection results to calculate angles
         */
        getUseAuthoredNormals(): boolean;
    }
}
declare namespace Communicator.Operator {
    class MeasureFaceFaceDistanceOperator extends OperatorBase {
        private readonly _measureManager;
        private readonly _moveSelectionAction;
        private _currentHighlight;
        private _markup;
        constructor(viewer: WebViewer, measureManager: MeasureManager);
        private _unsetCurrentHighlight;
        private _performMoveSelection;
        private _performUpSelection;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        private _onMouseUpImpl;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        /** @hidden */
        setDraggingEnabled(dragging: boolean): void;
        /** @hidden */
        onKeyUp(_event: Event.KeyInputEvent): void;
        /** @hidden */
        onKeyDown(event: Event.KeyInputEvent): void;
        /** @hidden */
        setHandled(): boolean;
        /** @hidden */
        onDeactivate(): void;
    }
}
declare namespace Communicator.Operator {
    /**
     * This operator allows you to measure the angle between two lines.
     * The measured angle can be between 0 - 180 degrees.
     * Click to add points to create the lines. A cursor will show where the next point will be placed.
     * The operator will perform vertex snapping by default. Holding down the alt key will disable this feature.
     * The first point placed is the common point between the lines.
     * The second and third points placed create two lines using the first point.
     * After the third point has been placed, the measurement will be finalized, and the angle between the two lines will be displayed.
     * If a measurement is currently being created, pressing the Escape key will discard it, otherwise the last created measurement will be discarded.
     */
    class MeasureLineLineAngleOperator extends OperatorBase {
        private _cursor;
        private _markupItem;
        private _measureManager;
        private _cameraInteractionActive;
        constructor(viewer: WebViewer, measureManager: MeasureManager);
        private _onBeginInteraction;
        private _onEndInteraction;
        /**
         * Determine if the given mouse event should cause snapping.
         * This is influenced by the snap configuration enabled value.
         */
        private _useSnapping;
        private _addPoint;
        private _updateMarkupSelectionPosition;
        onMouseMove(event: Event.MouseInputEvent): Promise<void>;
        onMouseUp(event: Event.MouseInputEvent): Promise<void>;
        onKeyDown(event: Event.KeyInputEvent): void;
        private _clearMeasurement;
        setHandled(): boolean;
        onActivate(): void;
        onDeactivate(): void;
    }
}
declare namespace Communicator.Operator {
    class MeasurePointPointDistanceOperator extends OperatorBase {
        private readonly _measureManager;
        private _measureMarkup;
        private _cursor;
        private _cameraInteractionActive;
        /** @hidden */
        constructor(viewer: WebViewer, measureManager: MeasureManager);
        private _onBeginInteraction;
        private _onEndInteraction;
        private _getStage;
        private _draw;
        private _finalizeMeasurement;
        private _getFirstPickPosition;
        private _updateMeasurementPoints;
        /**
         * Determine if the given mouse event should cause snapping. This is influenced by
         * the snap configuration enabled value.
         */
        private _useSnapping;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): Promise<void>;
        /** @hidden */
        onKeyUp(_event: Event.KeyInputEvent): void;
        private _clearMeasurement;
        /** @hidden */
        onKeyDown(event: Event.KeyInputEvent): void;
        /** @hidden */
        setHandled(): boolean;
        /** @hidden */
        onActivate(): void;
        /** @hidden */
        onDeactivate(): void;
    }
}
declare namespace Communicator.Operator {
    enum MeasurePolygonAreaAnchor {
        /** Text box indicating measurement value will be anchored to the first point of the polygon. */
        First = 0,
        /** Text box indicating measurement value will be anchored to the last point of the polygon.*/
        Last = 1,
        /** Text box indicating measurement value will be anchored to the midpoint of the polygon.*/
        Midpoint = 2
    }
    /**
     * This operator allows you to create a polygon and measure its area.
     * Click to add points to the polygon. A cursor will show where the point will be placed.
     * The operator will perform vertex snapping by default. Holding down the alt key will disable this feature.
     * To complete a measurement, double click when placing a point.
     * When there is no active measurement being created, click on a text box to drag and reposition it relative to its anchor point.
     * If a measurement is currently being created, pressing the Escape key will discard it, otherwise the last created measurement will be discarded.
     */
    class MeasurePolygonAreaOperator extends OperatorBase {
        private _cursor;
        private _markupItem;
        private _measureManager;
        private _cameraInteractionActive;
        private _textShapeOffset;
        private _anchor;
        private _dragPlane;
        /** @hidden */
        constructor(viewer: WebViewer, measureManager: MeasureManager);
        /** @hidden */
        getMarkupItem(): Markup.Measure.MeasurePolygonAreaMarkup | null;
        /** Sets the anchor type that will be set for markups created by this operator. */
        setAnchor(anchor: MeasurePolygonAreaAnchor): void;
        /**
         * Determine if the given mouse event should cause snapping. This is influenced by
         * the snap configuration enabled value.
         */
        private _useSnapping;
        private _getLastSelectedPoint;
        private _createNewMarkupItem;
        private _updateMarkupItem;
        private _updateMeasurementItem;
        private _isDraggingText;
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): Promise<void>;
        /** @hidden */
        onDoubleClick(_event: Event.MouseInputEvent): void;
        private _dragMarkupText;
        private _finalizeMeasurement;
        private _updateAnchor;
        private _calculateSelectionPlane;
        private _calculateAnchorPos;
        _clearMeasurement(): void;
        private _draw;
        protected _pickExisting(selectPoint: Point2): boolean;
        /** @hidden */
        onActivate(): void;
        /** @hidden */
        onDeactivate(): void;
        /** @hidden */
        onKeyDown(event: Event.KeyInputEvent): void;
        private _onBeginInteraction;
        private _onEndInteraction;
    }
}
declare namespace Communicator.Operator {
    enum MeasurePolylineDistanceAnchor {
        /** Text box indicating measurement value will be anchored to the first point of the polyline. */
        First = 0,
        /** Text box indicating measurement value will be anchored to the last point of the polyline.*/
        Last = 1,
        /** Text box indicating measurement value will be anchored to the midpoint of the polyline.*/
        Midpoint = 2
    }
    /**
     * This operator allows you to create a polyline and measure its distance.
     * Click to add points to the polyline.  A cursor will show where the point will be placed.
     * The operator will perform vertex snapping by default.  Holding down the alt key will disable this feature.
     * To complete a measurement, double click when placing a point to create an open line measurement, or single click on the first point to create a closed loop.
     * When there is no active measurement being created, click on a text box to drag and reposition it relative to its anchor point.
     * If a measurement is currently being created, pressing the Escape key will discard it, otherwise the last created measurement will be discarded.
     */
    class MeasurePolylineDistanceOperator extends OperatorBase {
        private _cursor;
        private _markupItem;
        private _measureManager;
        private _cameraInteractionActive;
        private _textShapeOffset;
        private _anchor;
        private _dragPlane;
        /** @hidden */
        constructor(viewer: WebViewer, measureManager: MeasureManager);
        /** @hidden */
        getMarkupItem(): Markup.Measure.MeasurePolylineDistanceMarkup | null;
        /** Sets the anchor type that will be set for markups created by this operator. */
        setAnchor(anchor: MeasurePolylineDistanceAnchor): void;
        /**
         * Determine if the given mouse event should cause snapping. This is influenced by
         * the snap configuration enabled value.
         */
        private _useSnapping;
        private _getLastSelectedPoint;
        private _createNewMarkupItem;
        private _updateMarkupItem;
        private _updateMeasurementItem;
        private _isDraggingText;
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): Promise<void>;
        /** @hidden */
        onDoubleClick(_event: Event.MouseInputEvent): void;
        private _dragMarkupText;
        private _finalizeMeasurement;
        private _updateAnchor;
        private _calculateSelectionPlane;
        private _calculateAnchorPos;
        _clearMeasurement(): void;
        private _draw;
        protected _pickExisting(selectPoint: Point2): boolean;
        /** @hidden */
        onActivate(): void;
        /** @hidden */
        onDeactivate(): void;
        /** @hidden */
        onKeyDown(event: Event.KeyInputEvent): void;
        private _onBeginInteraction;
        private _onEndInteraction;
    }
}
/** @hidden */
declare namespace Communicator.Operator.Common {
    function worldPointToScreenPoint(viewer: WebViewer, worldPosition: Point3): Point2;
    class SelectionPoints {
        readonly worldPosition: Point3 | null;
        readonly screenPosition: Point2;
        readonly selectionItem: Selection.SelectionItem;
        constructor(worldPosition: Point3 | null, screenPosition: Point2, selectionItem: Selection.SelectionItem);
    }
    interface SnappingConfig {
        enabled: boolean;
        preferVertices: boolean;
    }
    class CursorMarkup extends Markup.Measure.MeasureMarkup {
        private readonly _cursorSprite;
        private readonly _markupId;
        constructor(viewer: WebViewer);
        draw(): void;
        enable(enable: boolean): void;
        isEnabled(): boolean;
        setPosition(point: Point2): void;
        destroy(): void;
    }
    class PointCursor {
        private _viewer;
        _cursorMarkup: CursorMarkup | null;
        readonly snappingConfig: SnappingConfig;
        private readonly _updateCursorSpriteAction;
        constructor(viewer: WebViewer);
        getSelectionCursorPoints(mousePosition: Point2, useSnapping: boolean, previousPickPoint: Point3 | null): Promise<SelectionPoints | null>;
        updateCursorSprite(mousePosition: Point2, useSnapping: boolean, firstSelectedPoint: Point3 | null): void;
        private _updateCursorSpriteImpl;
        draw(): void;
        activateCursorSprite(enable: boolean): void;
        /**
         * Finds the best point to use for the given lineEntity given the snapping behavior and settings.
         */
        private _getLineSnapPoint;
        private _clearCursorMarkup;
        onOperatorActivate(): void;
        onOperatorDeactivate(): void;
    }
}
declare namespace Communicator {
    /** @hidden */
    class RedlineOperator extends Operator.OperatorBase {
        protected _viewer: WebViewer;
        private _activeRedlineItem;
        private _newRedlineItem;
        /** @hidden */
        constructor(viewer: WebViewer);
        /** @hidden */
        createRedlineItem(position: Point2): Markup.Redline.RedlineItem | null;
        /** @hidden */
        updateRedlineItem(position: Point2): void;
        /** @hidden */
        finalizeRedlineItem(position: Point2): Markup.Redline.RedlineItem | null;
        /** @hidden */
        onMouseDown(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseMove(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMouseUp(event: Event.MouseInputEvent): void;
        /** @hidden */
        onMousewheel(event: Event.MouseWheelInputEvent): void;
        /** @hidden */
        setDraggingEnabled(dragging: boolean): void;
        /** @hidden */
        setHandled(): boolean;
        private _isRedlineItem;
        /** @hidden */
        onKeyUp(event: Event.KeyInputEvent): void;
        private _removeRedlineTextIfInvalid;
        private _redlineOperatorStart;
        private _redlineOperatorMove;
        private _redlineOperatorEnd;
        private _attachNewMarkupToView;
        private _markupIsTextArea;
    }
}
declare namespace Communicator.Operator {
    class RedlineCircleOperator extends RedlineOperator {
        private _redlineCircle;
        private _previewHandle;
        private _centerSet;
        /** @hidden */
        constructor(viewer: WebViewer);
        /** @hidden */
        createRedlineItem(position: Point2): Markup.Redline.RedlineItem;
        /** @hidden */
        updateRedlineItem(position: Point2): void;
        /** @hidden */
        finalizeRedlineItem(_position: Point2): Markup.Redline.RedlineItem | null;
    }
}
declare namespace Communicator.Operator {
    class RedlinePolylineOperator extends RedlineOperator {
        private _redlinePolyline;
        private _previewHandle;
        /** @hidden */
        constructor(viewer: WebViewer);
        /** @hidden */
        createRedlineItem(position: Point2): Markup.Redline.RedlineItem;
        /** @hidden */
        updateRedlineItem(position: Point2): void;
        /** @hidden */
        finalizeRedlineItem(_position: Point2): Markup.Redline.RedlineItem | null;
    }
}
declare namespace Communicator.Operator {
    class RedlineRectangleOperator extends RedlineOperator {
        private _redlineRectangle;
        private _previewHandle;
        /** @hidden */
        constructor(viewer: WebViewer);
        /** @hidden */
        createRedlineItem(position: Point2): Markup.Redline.RedlineItem;
        /** @hidden */
        updateRedlineItem(position: Point2): void;
        /** @hidden */
        finalizeRedlineItem(_position: Point2): Markup.Redline.RedlineItem | null;
    }
}
declare namespace Communicator.Operator {
    class RedlineTextOperator extends RedlineOperator {
        private _redlineText;
        /** @hidden */
        constructor(viewer: WebViewer);
        /** @hidden */
        createRedlineItem(_position: Point2): Markup.Redline.RedlineItem;
        /** @hidden */
        finalizeRedlineItem(position: Point2): Markup.Redline.RedlineItem | null;
    }
}
