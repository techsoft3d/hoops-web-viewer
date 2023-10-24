/** @hidden */
declare module SC {
    export const enum AttachScope {
        OfInitialEmptyModel = 0,
    }

    export const enum Key {
        Invalid = 0xffffffff,
    }

    export const enum MasterModelKey {
        Invalid = Key.Invalid,
        Local = 0,
    }

    export const enum CuttingSectionKey {
        Invalid = Key.Invalid,
    }
    export const enum DataKey {
        Invalid = Key.Invalid,
    }
    export const enum GroupKey {
        Invalid = Key.Invalid,
    }
    export const enum ImageKey {
        Invalid = Key.Invalid,
    }
    export const enum InclusionKey {
        Invalid = Key.Invalid,
        Local = 0,
    }
    export const enum InstanceKey {
        Invalid = Key.Invalid,
    }
    export const enum LightKey {
        Invalid = Key.Invalid,
    }
    export const enum MatrixKey {
        Invalid = Key.Invalid,
    }
    export const enum MeshKey {
        Invalid = Key.Invalid,
    }
    export const enum ModelKey {
        Invalid = Key.Invalid,
        Empty = 0xfffffffe,
        Local = 0,
    }
    export const enum ViewKey {
        Invalid = Key.Invalid,
    }

    export type Id<Key> = [ModelKey, Key];
    export type CuttingSectionId = Id<CuttingSectionKey>;
    export type DataId = Id<DataKey>;
    export type GroupId = Id<GroupKey>;
    export type ImageId = Id<ImageKey>;
    export type InclusionId = Id<InclusionKey>;
    export type InstanceId = Id<InstanceKey>;
    export type MatrixId = Id<MatrixKey>;
    export type MeshId = Id<MeshKey>;
    export type ModelId = Id<ModelKey>;
    export type ViewId = Id<ViewKey>;

    export type Inc<Key> = [InclusionKey, Key];
    export type CuttingSectionInc = Inc<CuttingSectionKey>;
    export type DataInc = Inc<DataKey>;
    export type GroupInc = Inc<GroupKey>;
    export type ImageInc = Inc<ImageKey>;
    export type InclusionInc = Inc<InclusionKey>;
    export type InstanceInc = Inc<InstanceKey>;
    export type MatrixInc = Inc<MatrixKey>;
    export type MeshInc = Inc<MeshKey>;
    export type ModelInc = Inc<ModelKey>;
    export type ViewInc = Inc<ViewKey>;

    export type Ids<Key> = (ModelKey | Key)[];
    export type CuttingSectionIds = Ids<CuttingSectionKey>;
    export type DataIds = Ids<DataKey>;
    export type GroupIds = Ids<GroupKey>;
    export type ImageIds = Ids<ImageKey>;
    export type InclusionIds = Ids<InclusionKey>;
    export type InstanceIds = Ids<InstanceKey>;
    export type MatrixIds = Ids<MatrixKey>;
    export type MeshIds = Ids<MeshKey>;
    export type ModelIds = Ids<ModelKey>;
    export type ViewIds = Ids<ViewKey>;

    export type Incs<Key> = (InclusionKey | Key)[];
    export type CuttingSectionIncs = Incs<CuttingSectionKey>;
    export type DataIncs = Incs<DataKey>;
    export type GroupIncs = Incs<GroupKey>;
    export type ImageIncs = Incs<ImageKey>;
    export type InclusionIncs = Incs<InclusionKey>;
    export type InstanceIncs = Incs<InstanceKey>;
    export type MatrixIncs = Incs<MatrixKey>;
    export type MeshIncs = Incs<MeshKey>;
    export type ModelIncs = Incs<ModelKey>;
    export type ViewIncs = Incs<ViewKey>;

    export type Uvs = number[];

    export type Rgb = [number, number, number];
    export type Rgbs = number[];

    export type Rgba = [number, number, number, number];
    export type Rgbas = number[];

    export type Point3 = [number, number, number];
    export type Point3s = number[];

    export type Vector3 = [number, number, number];
    export type Vector3s = number[];

    export type Plane3 = [number, number, number, number];

    export type Matrix9 = [number, number, number, number, number, number, number, number, number];
    export type Matrix12 = [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
    ];
    export type Matrix16 = [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
    ];

    export type OverlayIndex = number;
    export type IncrementalSelectionHandle = number;

    export interface CuttingSectionLimits {
        maxCuttingSections: number;
        maxCuttingPlanesPerSection: number;
    }

    export interface Camera {
        reset(
            projection: Projection,
            position: Point3,
            target: Point3,
            up: Vector3,
            width: number,
            height: number,
        ): void;

        position(): Point3;
        target(): Point3;
        upVector(): Vector3;

        projection(): Projection;

        setPosition(position: Point3): void;
        setTarget(target: Point3): void;
        setUpVector(upVector: Vector3): void;

        fieldWidth(): number;
        fieldHeight(): number;

        setNearLimit(nearLimit: number): void;
        nearLimit(): number;

        projectionMatrix(): Matrix16;
        viewMatrix(): Matrix16;
        fullMatrix(): Matrix16;
    }

    export interface FaceFaceDistanceObject {
        distance: number;
        point1: Point3;
        point2: Point3;
    }

    export interface Ray {
        origin: Point3;
        direction: Vector3;
    }

    export interface EntityBase {
        instanceInc: InstanceInc;
        meshLevelId: MeshId;
        meshLevel: number;
        elementIndex: number;
        elementBits: number;
        overlayIndex: OverlayIndex;
    }

    export interface Box {
        min: Point3;
        max: Point3;
    }

    export interface Range {
        min: number;
        max: number;
    }

    export interface Statistics {
        elementCount: number;
        triangleCount: number;
    }

    export type ProximityEntity = EntityBase & {
        radialMetric: number;
        zMetric: number;
    };

    export interface FaceEntity extends EntityBase {
        triangleIndex: number;
        normal: Vector3;
        bounding: Box;
        rayPoint: Point3;
    }

    export interface ProximityFaceEntity extends FaceEntity {
        radialMetric: number;
        zMetric: number;
    }

    export interface LineEntity extends EntityBase {
        lineIndex: number;
        bounding: Box;
        point: Point3;
        lineSegmentVertices: Point3s;
        bestLineSegmentVertexIndex: number;
        radialMetric: number;
        zMetric: number;
    }

    export interface PointEntity extends EntityBase {
        pointIndex: number;
        point: Point3;
        radialMetric: number;
        zMetric: number;
    }

    export interface FacePickResult {
        entities: FaceEntity[];
    }

    export interface LinePickResult {
        entities: LineEntity[];
    }

    export interface PointPickResult {
        entities: PointEntity[];
    }

    export interface ProximityFacePickResult {
        entities: ProximityFaceEntity[];
    }

    export interface OpenModelFailedData {
        reason: string;
        name: string;
    }

    export interface BadDataData {
        type: string;
        expected: string; // only relevant when (type === "STORE_VERSION_MISMATCHED" || type === "STREAM_VERSION_MISMATCHED")
        actual: string; // only relevant when (type === "STORE_VERSION_MISMATCHED" || type === "STREAM_VERSION_MISMATCHED")
    }

    export interface PickResult {
        face: FacePickResult | null;
        line: LinePickResult | null;
        point: PointPickResult | null;
        proximityFace: ProximityFacePickResult | null;
    }

    export interface CullingVector {
        space: CullingVectorSpace;
        vector: Vector3;
        toleranceDegrees: number;
    }

    export interface RaySelectionConfig {
        /**
         * If true, selection will try to return only the most relevant entities.
         *
         * A face is considered suboptimal if any of the following hold:
         *  (*) The face is behind another selected face.
         *  (*) The face is selected by proximity and another face is selected at closer proximity.
         *
         * A line is considered suboptimal if:
         *  (*) The line is selected by proximity and another line is selected at closer proximity.
         *
         * A point is considered suboptimal if:
         *  (*) The point is selected by proximity and another point is selected at closer proximity.
         *
         */
        cullSuboptimalEntities?: boolean;

        enableOcclusionChecks?: boolean;
        enableProximityFaces?: boolean;
        bimMask?: Communicator.BimMask;
        ignoreCappingGeometry?: boolean;
        ignoreOverlays?: boolean;
        maxWorldDistance?: number;
        oneEntityPerTypePerInstance?: boolean;
        rejectionBitsAll?: number;
        rejectionBitsAny?: number;
        requiredBitsAll?: number;
        requiredBitsAny?: number;
        respectDepthRange?: boolean;
        respectVisibility?: boolean;
        restrictLinesAndPointsToSelectedFaceInstances?: boolean;
        restrictToOverlays?: boolean;
        returnElementBounding?: boolean;
    }

    export interface VolumeSelectionConfig {
        mustBeFullyContained?: boolean;
        respectVisibility?: boolean;
        allowFaces?: boolean;
        allowLines?: boolean;
        allowPoints?: boolean;
        ignoreCuttingSections?: boolean;
        onlyStreamedInstances?: boolean;
        bimMask?: Communicator.BimMask;
    }

    export interface SsrQualityConfig {
        scaleLow?: number;
        scaleHigh?: number;
        jpegQualityLow?: number;
        jpegQualityHigh?: number;
        jpegChromaSamplesLow?: number;
        jpegChromaSamplesHigh?: number;
    }

    export interface SvgConfig {
        svgXmlPrologEnabled?: boolean;
        svgBackgroundCssColor?: string;
        silhouettesEnabled?: boolean;
        linesDrawModelLinesEnabled?: boolean;
        linesStrokeWidth?: number;
        linesCssColor?: string;
        linesClipProximityToPlane?: number;
        linesClipZNudgeFactor?: number;
        polygonsForceDrawCssColor?: string;
        logProgress?: boolean;
        logDiagnostics?: boolean;
    }

    export interface Error<ErrorType> {
        scFunction: string;
        data: ErrorType;
    }

    export interface DiscriminatedError<Discriminant extends string, ErrorType>
        extends Error<ErrorType> {
        scFunction: Discriminant;
        data: ErrorType;
    }

    export type OpaqueError =
        | DiscriminatedError<"getMetaData", DataIds>
        | DiscriminatedError<"metaDataKeyInfo", ModelKey>
        | DiscriminatedError<"beginScreenAreaSelection", void>
        | DiscriminatedError<"beginConvexPolyhedronSelection", void>
        | DiscriminatedError<"beginRayDrillSelection", void>
        | DiscriminatedError<"beginSphereSelection", void>
        | DiscriminatedError<"advanceVolumeSelection", void>;

    // Mirrors C++ `TC::Web::AntiAliasingMode`
    export const enum AntiAliasingMode {
        None,
        SMAA,
    }

    // Mirrors C++ `TC::Web::BimType`
    export const enum BimType {
        Floor = 0,
        Wall = 1,
        Door = 2,
    }

    // Mirrors C++ `TC::Web::BlurIntervalUnit`
    export const enum BlurIntervalUnit {
        Pixels,
        ProportionOfWidth,
        ProportionOfHeight,
    }

    // Mirrors C++ `TC::Web::CullingVectorSpace`
    export const enum CullingVectorSpace {
        Object,
        World,
    }

    // Mirrors C++ `TC::Web::DrawMode`
    export const enum DrawMode {
        Default,
        Highlight,
        HiddenLine,
        XRay,
        Gooch,
        Toon,
    }

    export const enum DrawStrategy {
        FixedFramerate,
        OcclusionCulling,
    }

    // Mirrors C++ `TC::Web::ElementType`
    export const enum ElementType {
        Faces,
        Lines,
        Points,
    }

    // Mirrors C++ `TC::Web::ElementMask::Bits`
    export const enum ElementMask {
        None = 0,
        Faces = 1 << ElementType.Faces,
        Lines = 1 << ElementType.Lines,
        Points = 1 << ElementType.Points,
        All = Faces | Lines | Points,
    }

    // Mirrors C++ `TC::Web::HighlightFilter`
    export const enum HighlightFilter {
        None,
        Modulate,
        Desaturate,
        Colorize,
    }

    // Mirrors C++ `TC::Web::HighlightMode`
    export const enum HighlightMode {
        Visible,
        VisibleWithFullOutline,
    }

    // Mirrors C++ `TC::Stream::Reader::ImageFormat`
    export const enum ImageFormat {
        Rgba32,
        Rgb24,
        Gray8,
        GrayAlpha16,
        Jpeg,
        Png,
    }

    // Mirrors C++ `TC::Web::LightSpace`
    export const enum LightSpace {
        World,
        Camera,
    }

    // Mirrors C++ `TC::Web::LightType`
    export const enum LightType {
        Directional,
    }

    // Mirrors C++ `TC::Web::LinePatternLengthUnit`
    export const enum LinePatternLengthUnit {
        Object,
        World,
        ProportionOfScreenWidth,
        ProportionOfScreenHeight,
    }

    // Mirrors C++ `TC::Web::OverlayAnchor`
    export const enum OverlayAnchor {
        UpperLeftCorner,
        LowerLeftCorner,
        LowerRightCorner,
        UpperRightCorner,
        TopCenter,
        LeftCenter,
        RightCenter,
        BottomCenter,
        Center,
    }

    // Mirrors C++ `TC::Web::OverlayUnit`
    export const enum OverlayUnit {
        Pixels,
        ProportionOfScreen,
        ProportionOfOtherDimension,
    }

    // Mirrors C++ `TC::Web::PointShape`
    export const enum PointShape {
        Square,
        Disk,
        Sphere,
    }

    // Mirrors C++ `TC::Web::PointSizeUnit`
    export const enum PointSizeUnit {
        ScreenPixels,
        CSSPixels,
        World,
        ProportionOfScreenWidth,
        ProportionOfScreenHeight,
        ProportionOfBoundingDiagonal,
    }

    // Mirrors C++ `TC::Web::Camera::Projection`
    export const enum Projection {
        Perspective,
        Orthographic,
        Stretched,
    }

    // Mirrors C++ `::SessionType` (in web_client.cpp)
    export const enum SessionType {
        Uninitialized,
        Network,
        Scs,
    }

    // Mirrors C++ `TC::Network::Command::SetVisibility`
    export const enum SetVisibility {
        Hide,
        Show,
        Initial,
    }

    // Mirrors C++ `TC::Web::SimpleReflectionAttenuationUnit`
    export const enum SimpleReflectionAttenuationUnit {
        World,
        ProportionOfBoundingHeight,
    }

    // Mirrors C++ `TC::Web::SmaaQuality`
    export const enum SmaaQuality {
        Low,
        Medium,
        High,
        Ultra,
    }

    // Mirrors C++ `TC::Web::StateFailure`
    export const enum StateFailure {
        SessionNotStarted,
        Cancelled,
        CorruptRpcMessage,
    }

    // Mirrors C++ `TC::Web::TextureFlags::Interpolation`
    export const enum TextureInterpolation {
        On,
        Off,
    }

    // Mirrors C++ `TC::Web::TextureFlags::MipMapping`
    export const enum TextureMipMapping {
        On,
        Off,
    }

    // Mirrors C++ `TC::Web::TextureFlags::Modifiers`
    export const enum TextureModifier {
        None,
        Decal,
    }

    // Mirrors C++ `TC::Web::TextureFlags::Parameterization`
    export const enum TextureParameterization {
        UV,
    }

    // Mirrors C++ `TC::Web::TextureFlags::Tiling`
    export const enum TextureTiling {
        Repeat,
        Clamp,
        Trim,
    }

    // Mirrors C++ `TC::Web::TransparencyMode`
    export const enum TransparencyMode {
        Unsorted,
        SingleLayer,
    }

    // Mirrors C++ `TC::Web::XRayGroup::Type`
    export const enum XRayGroup {
        Selected,
        Unselected,
    }

    export interface MeshInstanceInterface {
        clearAllElementHighlight(incs: InstanceIncs): void;
        clearAllElementVisible(incs: InstanceIncs): void;
        clearAllElementXRay(incs: InstanceIncs): void;
        clearElementColors(incs: InstanceIncs, elementType: ElementType): void;
        clearElementHighlight(incs: InstanceIncs, elementType: ElementType): void;
        clearElementVisible(incs: InstanceIncs, elementType: ElementType): void;
        clearElementXRay(incs: InstanceIncs, elementType: ElementType): void;
        computeMinimalBodyBodyDistance(
            inc1: InstanceInc,
            inc2: InstanceInc,
        ): Promise<FaceFaceDistanceObject>;
        computeMinimalFaceFaceDistance(
            inc1: InstanceInc,
            faceIndex1: number,
            inc2: InstanceInc,
            faceIndex2: number,
        ): Promise<FaceFaceDistanceObject>;
        computeMinimalFaceLineDistance(
            inc: InstanceInc,
            faceIndex: number,
            ray: Ray,
        ): Promise<FaceFaceDistanceObject>;
        computeMinimalFaceRayDistance(
            inc: InstanceInc,
            faceIndex: number,
            ray: Ray,
        ): Promise<FaceFaceDistanceObject>;
        create(
            meshId: MeshId,
            matrixInc: MatrixInc,
            faceColor: Rgba,
            lineColor: Rgba,
            pointColor: Rgba,
            flags?: number,
            overlayIndex?: OverlayIndex,
        ): Promise<InstanceInc>;
        destroy(incs: InstanceIncs): Promise<void>;
        discardAnonymousMatrix(incs: InstanceIncs): Promise<void>;
        getAlwaysDraw(incs: InstanceIncs): Promise<boolean[]>;
        getColor(incs: InstanceIncs, elementType: ElementType): Promise<(Rgb | null)[]>;
        getCullingVector(incs: InstanceIncs): Promise<CullingVector[]>;
        getDoNotCut(incs: InstanceIncs): Promise<boolean[]>;
        getDoNotExplode(incs: InstanceIncs): Promise<boolean[]>;
        getDoNotLight(incs: InstanceIncs): Promise<boolean[]>;
        getDoNotOutlineHighlight(incs: InstanceIncs): Promise<boolean[]>;
        getDoNotSelect(incs: InstanceIncs): Promise<boolean[]>;
        getDoNotUseVertexColors(incs: InstanceIncs): Promise<boolean[]>;
        getDrawnWorldSpaceBounding(): Promise<Box>;
        getDrawnWorldSpaceBounding(incs: InstanceIncs): Promise<Box>;
        getEffectiveColor(incs: InstanceIncs, elementType: ElementType): Promise<Rgb[]>;
        getEffectiveElementColor(
            incs: InstanceIncs,
            elementType: ElementType,
            index: number,
        ): Promise<Rgb[]>;
        getEffectiveOpacity(incs: InstanceIncs, elementType: ElementType): Promise<number[]>;
        getElementColor(
            incs: InstanceIncs,
            elementType: ElementType,
            index: number,
        ): Promise<(Rgb | null)[]>;
        getElementHighlighted(
            incs: InstanceIncs,
            elementType: ElementType,
            elementIndex: number,
        ): Promise<boolean[]>;
        getElementVisible(
            incs: InstanceIncs,
            elementType: ElementType,
            elementIndex: number,
        ): Promise<boolean[]>;
        getElementXRay(
            incs: InstanceIncs,
            elementType: ElementType,
            elementIndex: number,
        ): Promise<boolean[]>;
        getExcludeBounding(incs: InstanceIncs): Promise<boolean[]>;
        getFaceElementBounding(elementIndices: number[], inc: InstanceInc): Promise<Box>;
        getFacesVisible(incs: InstanceIncs): Promise<boolean[]>;
        getHighlighted(incs: InstanceIncs): Promise<boolean[]>;
        getLayerCount(): number;
        getLineElementBounding(elementIndices: number[], inc: InstanceInc): Promise<Box>;
        getLinesVisible(incs: InstanceIncs): Promise<boolean[]>;
        getMatrix(incs: InstanceIncs, layer: number): Promise<MatrixIncs>;
        getMeshData(incs: InstanceIncs): Promise<MeshIds>;
        getMetallicRoughness(incs: SC.InstanceIncs): Promise<number[]>;
        getObjectSpaceBounding(incs: InstanceIncs): Promise<Box[]>;
        getOpacity(incs: InstanceIncs, elementType: ElementType): (number | null)[];
        getOverrideSceneVisibility(incs: InstanceIncs): Promise<boolean[]>;
        getPointElementBounding(elementIndices: number[], inc: InstanceInc): Promise<Box>;
        getPointsVisible(incs: InstanceIncs): Promise<boolean[]>;
        getScreenOriented(incs: InstanceIncs): Promise<boolean[]>;
        getScreenSpace(incs: InstanceIncs): Promise<boolean[]>;
        getScreenSpaceStretched(incs: InstanceIncs): Promise<boolean[]>;
        getSuppressCameraScale(incs: InstanceIncs): Promise<boolean[]>;
        getWorldSpaceBounding(
            incs: InstanceIncs,
            ignoreInvisible: boolean,
            includeExcluded: boolean,
            tightBounding: boolean,
        ): Promise<Box>;
        hasDepthRange(incs: InstanceIncs): Promise<boolean[]>;
        hasTransparency(incs: InstanceIncs, elementType: ElementType): Promise<boolean[]>;
        linesToIncidentFaces(elementIndices: number[], inc: InstanceInc): Promise<number[]>;
        matrixPreMultiply(incs: InstanceIncs, matrix: Matrix16): Promise<void>;
        reifyAnonymousMatrix(incs: InstanceIncs): Promise<MatrixIncs>;
        setAlwaysDraw(incs: InstanceIncs, value: boolean): void;
        setAnonymousMatrix(incs: InstanceIncs, matrix: Matrix16): void;
        setAnonymousMatrices(incs: InstanceIncs, matrices: number[]): void;
        setColor(incs: InstanceIncs, elementType: ElementType, color: Rgb): void;
        setCullingVector(
            incs: InstanceIncs,
            space: CullingVectorSpace,
            vector: Vector3,
            toleranceDegrees: number,
        ): void;
        setDepthRange(incs: InstanceIncs, min: number, max: number): void;
        setDoNotCut(incs: InstanceIncs, doNotCut: boolean): void;
        setDoNotExplode(incs: InstanceIncs, doNotExplode: boolean): void;
        setDoNotLight(incs: InstanceIncs, value: boolean): void;
        setDoNotOutlineHighlight(incs: InstanceIncs, value: boolean): void;
        setDoNotSelect(incs: InstanceIncs, doNotSelect: boolean): void;
        setDoNotUseVertexColors(incs: InstanceIncs, value: boolean): void;
        setDoNotXRay(incs: InstanceIncs, value: boolean): void;
        setElementColor(
            incs: InstanceIncs,
            elementType: ElementType,
            elementOffset: number,
            elementCount: number,
            color: Rgb,
        ): void;
        setElementHighlighted(
            incs: InstanceIncs,
            elementType: ElementType,
            elementIndex: number,
            elementCount: number,
            value: boolean,
        ): void;
        setElementVisible(
            incs: InstanceIncs,
            elementType: ElementType,
            elementIndex: number,
            elementCount: number,
            value: boolean,
        ): void;
        setElementXRay(
            incs: InstanceIncs,
            elementType: ElementType,
            elementIndex: number,
            elementCount: number,
            value: boolean,
        ): void;
        setExcludeBounding(incs: InstanceIncs, value: boolean): void;
        setFacesVisible(incs: InstanceIncs, visible: boolean): void;
        setHighlighted(incs: InstanceIncs, highlighted: boolean): void;
        setLinePattern(
            incs: InstanceIncs,
            pattern: number[] | Uint8Array,
            patternLength: number,
            patternLengthUnit: LinePatternLengthUnit,
        ): void;
        setLinesVisible(incs: InstanceIncs, visible: boolean): void;
        setMatrix(incs: InstanceIncs, layer: number, matrixInc: MatrixInc): Promise<void>;
        setMeshLevel(incs: InstanceIncs, meshLevel: number): void;
        setMetallicRoughness(
            incs: InstanceIncs,
            metallicFactor: number,
            roughnessFactor: number,
        ): void;
        unsetMetallicRoughness(incs: InstanceIncs): void;
        setOpacity(incs: InstanceIncs, elementType: ElementType, opacity: number): void;
        setOverlayIndex(incs: InstanceIncs, index: OverlayIndex): void;
        setOverrideSceneVisibility(incs: InstanceIncs, overrideSceneVisibility: boolean): void;
        setPointsVisible(incs: InstanceIncs, visible: boolean): void;
        setScreenOriented(incs: InstanceIncs, value: boolean): void;
        setScreenSpace(incs: InstanceIncs, value: boolean): void;
        setScreenSpaceStretched(incs: InstanceIncs, value: boolean): void;
        setStreamCutoffScale(value: number): void;
        setSuppressCameraScale(incs: InstanceIncs, suppressCameraScale: boolean): void;
        setTexture(
            incs: InstanceIncs,
            elementType: ElementType,
            imageId: ImageId,
            matrix: Matrix16,
            tiling: TextureTiling,
            interpolation: TextureInterpolation,
            mipMapping: TextureMipMapping,
            parameterization: TextureParameterization,
            modifiers: TextureModifier,
        ): Promise<void>;
        setVisible(incs: InstanceIncs, visible: boolean, onlyDemanded: boolean): void;
        setXRay(incs: InstanceIncs, value: boolean): void;
        synchronizeVisibilities(incs: InstanceIncs, visible: boolean): void;
        unsetColor(incs: InstanceIncs, elementType: ElementType): void;
        unsetCullingVector(incs: InstanceIncs): void;
        unsetDepthRange(incs: InstanceIncs): void;
        unsetElementColor(
            incs: InstanceIncs,
            elementType: ElementType,
            elementOffset: number,
            elementCount: number,
        ): void;
        unsetLinePattern(incs: InstanceIncs): void;
        unsetMatrix(incs: InstanceIncs, layer: number): Promise<void>;
        unsetOpacity(incs: InstanceIncs, elementType: ElementType): void;
        unsetTexture(incs: InstanceIncs, elementType: ElementType): void;
    }
    export interface Instance {
        MeshInstance: MeshInstanceInterface;
    }

    export interface OverlayInterface {
        destroy(index: OverlayIndex): void;
        maxIndex(): OverlayIndex;
        setCamera(index: OverlayIndex, Camera: Camera): void;
        setViewport(
            index: OverlayIndex,
            anchor: OverlayAnchor,
            xOffset: number,
            xUnit: OverlayUnit,
            yOffset: number,
            yUnit: OverlayUnit,
            width: number,
            widthUnit: OverlayUnit,
            height: number,
            heightUnit: OverlayUnit,
        ): void;
        setVisible(index: OverlayIndex, visibility: boolean): void;
    }
    export interface Instance {
        Overlay: OverlayInterface;
    }

    export interface MeshDataBuilderFaceOptions {
        normals?: Vector3s | Float32Array;
        uvs?: Uvs | Float32Array;
        rgba32s?: Rgbas | Uint8Array;
        bits?: number;
    }

    export interface MeshDataBuilderLineOptions {
        rgba32s?: Rgbas | Uint8Array;
        bits?: number;
    }

    export interface MeshDataBuilderPointOptions {
        rgba32s?: Rgbas | Uint8Array;
        bits?: number;
    }

    export interface MeshDataBuilder {
        addFace(vertexData: Point3s | Float32Array, options?: MeshDataBuilderFaceOptions): void;
        addPolyline(
            polylineData: Point3s | Float32Array,
            options?: MeshDataBuilderLineOptions,
        ): void;
        addPoints(pointData: Point3s | Float32Array, options?: MeshDataBuilderPointOptions): void;
        formatBits: number;
    }
    export interface Instance {
        MeshDataBuilder: { new (): MeshDataBuilder };
    }

    export interface MeshDataInterface {
        create(meshDataBuilder: MeshDataBuilder): Promise<MeshId>;
        destroy(ids: MeshIds): Promise<void>;
        getData(id: MeshId): Promise<Communicator.MeshDataCopy>;
        lineElementSegments(meshId: MeshId, lineElementIndex: number): Promise<Point3s>;
        linesToIncidentFaces(lineElementIndices: number[], meshId: MeshId): Promise<number[]>;
        replace(id: MeshId, meshDataBuilder: MeshDataBuilder): Promise<void>;
    }
    export interface Instance {
        MeshData: MeshDataInterface;
    }

    export interface MatrixInterface {
        create(elements?: Matrix16): Promise<MatrixInc>;
        destroy(incs: MatrixIncs): Promise<void>;
        getElements(incs: MatrixIncs): Promise<Matrix16[]>;
        setElements(incs: MatrixIncs, matrix: Matrix16): Promise<void>;
    }
    export interface Instance {
        Matrix: MatrixInterface;
    }

    export interface ImageInterface {
        create(
            mainFormat: ImageFormat,
            mainData: Uint8Array,
            mainHasAlpha: boolean,
            mainWidth?: number,
            mainHeight?: number,
            thumbFormat?: ImageFormat,
            thumbData?: Uint8Array,
            thumbHasAlpha?: boolean,
            thumbWidth?: number,
            thumbHeight?: number,
        ): Promise<ImageId>;

        destroy(imageIds: ImageIds): Promise<void>;
    }
    export interface Instance {
        Image: ImageInterface;
    }

    export interface LoadConfig {
        uri?: string;
        buffer?: Uint8Array;
        empty?: boolean;
        model?: string;
        sessionToken?: string;
        limitMiB?: number;
        meshLevel?: number;
        streamCutoffScale?: number;
        serverSideRendering?: boolean;
        streamCulled?: boolean;
        streamMetaDataOnIdle?: boolean;
        streamNoLimit?: boolean;
        streamInstancesOnDemand?: boolean;
        streamAggressiveCompression?: boolean;
        streamModelBoundingPreviews?: boolean;
        streamInstanceBoundingPreviews?: boolean;
        streamOnlyInterestingBoundingPreviews?: boolean;
        streamEjectedBoundingPreviews?: boolean;
        XHRonprogress?: (this: XMLHttpRequestEventTarget, ev: ProgressEvent) => any;
        XHRonerror?: (this: XMLHttpRequestEventTarget, ev: ErrorEvent) => any;
        XHRonloadend?: (this: any, ev: ProgressEvent, status: number, uri: string) => any;
    }

    // XXX: It's a little unfortunate that this is not camel-cased.
    export interface FrameStats {
        frames_per_second: number;
        draw_call_count: number;
        triangle_count: number;
        line_segment_count: number;
        point_count: number;
    }

    export interface Instance {
        setEventHandler(
            eventName: "announce_model",
            callback: (
                eventName: string,
                attachScope: AttachScope,
                masterModelKey: MasterModelKey,
            ) => void,
        ): void;
        setEventHandler(
            eventName: "bad_data",
            callback: (eventName: string, data: BadDataData) => void,
        ): void;
        setEventHandler(eventName: "bounding", callback: (eventName: string) => void): void;
        setEventHandler(eventName: "camera_set", callback: (eventName: string) => void): void;
        setEventHandler(
            eventName: "capping_idle",
            callback: (eventName: string, isIdle: boolean, cappedInstanceCount: number) => void,
        ): void;
        setEventHandler(
            eventName: "client_message",
            callback: (eventName: string, data: string) => void,
        ): void;
        setEventHandler(eventName: "draw_complete", callback: (eventName: string) => void): void;
        setEventHandler(eventName: "draw_idle", callback: (eventName: string) => void): void;
        setEventHandler(eventName: "first_instance", callback: (eventName: string) => void): void;
        setEventHandler(
            eventName: "inclusion",
            callback: (
                eventName: string,
                attachScope: SC.AttachScope,
                inclusionKey: InclusionKey,
                modelKey: ModelKey,
            ) => void,
        ): void;
        setEventHandler(
            eventName: "meta_data",
            callback: (
                eventName: string,
                modelKey: ModelKey,
                dataKey: DataKey,
                data: Uint8Array,
            ) => void,
        ): void;
        setEventHandler(
            eventName: "missing_model",
            callback: (eventName: string, attachScope: SC.AttachScope, modelPath: string) => void,
        ): void;
        setEventHandler(
            eventName: "network_receive_data",
            callback: (eventName: string, dataSize: number) => void,
        ): void;
        setEventHandler(
            eventName: "open_model_failed",
            callback: (eventName: string, data: OpenModelFailedData) => void,
        ): void;
        setEventHandler(
            eventName: "post_draw",
            callback: (
                eventName: string,
                stats: FrameStats,
                camera: Camera,
                visiblePoints: number[],
            ) => void,
        ): void;
        setEventHandler(
            eventName: "post_draw_json",
            callback: (eventName: string, metadataJson: string) => void,
        ): void;
        setEventHandler(
            eventName: "priority_meta_data_sent",
            callback: (
                eventName: string,
                attachScope: SC.AttachScope,
                prototypeInstanceCount: number,
            ) => void,
        ): void;
        setEventHandler(
            eventName: "remap_inclusion",
            callback: (
                eventName: string,
                attachScope: SC.AttachScope,
                effectiveModelKey: ModelKey,
                effectiveInclusionKey: InclusionKey,
                originalInclusionKey: InclusionKey,
            ) => void,
        ): void;
        setEventHandler(
            eventName: "remap_model",
            callback: (
                eventName: string,
                attachScope: SC.AttachScope,
                effectiveModelKey: ModelKey,
                originalModelKey: ModelKey,
            ) => void,
        ): void;
        setEventHandler(
            eventName: "session_started",
            callback: (eventName: string, primaryModelKey: ModelKey) => void,
        ): void;
        setEventHandler(eventName: "socket_error", callback: (eventName: string) => void): void;
        setEventHandler(
            eventName: "socket_open_failed",
            callback: (eventName: string) => void,
        ): void;
        setEventHandler(eventName: "stream_active", callback: (eventName: string) => void): void;
        setEventHandler(eventName: "stream_idle", callback: (eventName: string) => void): void;
        setEventHandler(
            eventName: "webgl_context_lost",
            callback: (eventName: string) => void,
        ): void;
        setEventHandler(
            eventName: "websocket_connection_closed",
            callback: (eventName: string) => void,
        ): void;

        // Currently [[unsetEventHandler]] is unsafe to call during the execution of an event handler with the same event name.
        unsetEventHandler(
            eventName: "announce_model",
            callback: (eventName: string, attachScope: AttachScope, modelKey: ModelKey) => void,
        ): void;
        unsetEventHandler(
            eventName: "bad_data",
            callback: (eventName: string, data: BadDataData) => void,
        ): void;
        unsetEventHandler(eventName: "bounding", callback: (eventName: string) => void): void;
        unsetEventHandler(eventName: "camera_set", callback: (eventName: string) => void): void;
        unsetEventHandler(
            eventName: "capping_idle",
            callback: (eventName: string, isIdle: boolean, cappedInstanceCount: number) => void,
        ): void;
        unsetEventHandler(
            eventName: "client_message",
            callback: (eventName: string, data: string) => void,
        ): void;
        unsetEventHandler(eventName: "draw_complete", callback: (eventName: string) => void): void;
        unsetEventHandler(eventName: "draw_idle", callback: (eventName: string) => void): void;
        unsetEventHandler(
            eventName: "inclusion",
            callback: (
                eventName: string,
                attachScope: SC.AttachScope,
                inclusionKey: InclusionKey,
                modelKey: ModelKey,
            ) => void,
        ): void;
        unsetEventHandler(
            eventName: "meta_data",
            callback: (
                eventName: string,
                modelKey: ModelKey,
                dataKey: DataKey,
                data: Uint8Array,
            ) => void,
        ): void;
        unsetEventHandler(
            eventName: "missing_model",
            callback: (eventName: string, attachScope: SC.AttachScope, modelPath: string) => void,
        ): void;
        unsetEventHandler(
            eventName: "network_receive_data",
            callback: (eventName: string, dataSize: number) => void,
        ): void;
        unsetEventHandler(
            eventName: "open_model_failed",
            callback: (eventName: string, data: OpenModelFailedData) => void,
        ): void;
        unsetEventHandler(
            eventName: "post_draw",
            callback: (
                eventName: string,
                stats: FrameStats,
                camera: Camera,
                visiblePoints: number[],
            ) => void,
        ): void;
        unsetEventHandler(
            eventName: "post_draw_json",
            callback: (eventName: string, metadataJson: string) => void,
        ): void;
        unsetEventHandler(
            eventName: "priority_meta_data_sent",
            callback: (
                eventName: string,
                attachScope: SC.AttachScope,
                prototypeInstanceCount: number,
            ) => void,
        ): void;
        unsetEventHandler(
            eventName: "remap_inclusion",
            callback: (
                eventName: string,
                attachScope: SC.AttachScope,
                effectiveModelKey: ModelKey,
                effectiveInclusionKey: InclusionKey,
                originalInclusionKey: InclusionKey,
            ) => void,
        ): void;
        unsetEventHandler(
            eventName: "remap_model",
            callback: (
                eventName: string,
                attachScope: SC.AttachScope,
                effectiveModelKey: ModelKey,
                originalModelKey: ModelKey,
            ) => void,
        ): void;
        unsetEventHandler(
            eventName: "session_started",
            callback: (eventName: string, primaryModelKey: ModelKey) => void,
        ): void;
        unsetEventHandler(eventName: "socket_error", callback: (eventName: string) => void): void;
        unsetEventHandler(
            eventName: "socket_open_failed",
            callback: (eventName: string) => void,
        ): void;
        unsetEventHandler(eventName: "stream_active", callback: (eventName: string) => void): void;
        unsetEventHandler(eventName: "stream_idle", callback: (eventName: string) => void): void;
        unsetEventHandler(
            eventName: "webgl_context_lost",
            callback: (eventName: string) => void,
        ): void;
        unsetEventHandler(
            eventName: "websocket_connection_closed",
            callback: (eventName: string) => void,
        ): void;

        allowHighDpi: boolean;
        container: Element;

        addCuttingSection(cuttingPlanes: Plane3[]): Promise<CuttingSectionKey>;
        addLight(
            type: LightType,
            space: LightSpace,
            position: Point3,
            color: Rgb,
        ): Promise<LightKey>;
        advanceVolumeSelection(
            handle: IncrementalSelectionHandle,
            batchCapacity: number,
        ): Promise<InstanceIncs>;
        attachModels(
            attachScope: AttachScope,
            modelNameWithTransform: [Communicator.ScModelName, Matrix12][],
            attachMeasurementUnit: number,
            attachInvisibly: boolean,
        ): Promise<void>;
        attachScsBuffer(
            attachScope: AttachScope,
            buffer: Communicator.ScsBuffer,
            inclusionMatrix: Matrix12,
            attachMeasurementUnit: number,
            attachInvisibly: boolean,
            resolveOnFullyLoaded: boolean,
        ): Promise<void>; // Actually returns Promise<ModelIncs>, but I don't want the code to depend on that if possible.
        feedScsBuffer(attachScope: AttachScope, buffer: Communicator.ScsBuffer | null): void;
        attachScsModelByKey(
            attachScope: AttachScope,
            matrix: Matrix12,
            modelKey: SC.ModelKey,
            attachMeasurementUnit: number,
            attachInvisibly: boolean,
        ): InclusionKey;
        beginConvexPolyhedronSelection(
            volumePlaneCoeffs: Plane3[],
            heuristicOrigin: Point3,
            config: VolumeSelectionConfig,
        ): Promise<IncrementalSelectionHandle>;
        beginRayDrillSelection(
            rayCssOriginX: number,
            rayCssOriginY: number,
            rayCssBoxRadius: number,
            config: VolumeSelectionConfig,
        ): Promise<IncrementalSelectionHandle>;
        beginScreenAreaSelection(
            areaCssMinX: number,
            areaCssMinY: number,
            areaCssMaxX: number,
            areaCssMaxY: number,
            config: VolumeSelectionConfig,
        ): Promise<IncrementalSelectionHandle>;
        beginSphereSelection(
            sphereCenter: Point3,
            sphereRadius: number,
            config: VolumeSelectionConfig,
        ): Promise<IncrementalSelectionHandle>;
        clearLights(): void;
        cuttingSectionLimits(): CuttingSectionLimits;
        debug_log(message: string): Promise<void>;
        debug_stateFailure(stateFailureValue: number): Promise<void>;
        debug_sync(): Promise<void>;
        demandMeshInstances(incs: InstanceIncs): void;
        detachInclusions(inclusionKeys: InclusionKey[]): Promise<void>;
        disableCapping(): void;
        disconnectNetwork(): void;
        enableCapping(lineColor: Rgba, faceColor: Rgba, quantizationGranularity: number): void;
        endComparison(): void;
        endVolumeSelection(handle: IncrementalSelectionHandle): void;
        explode(distance: number): void;
        createFloorplanMesh(incs: InstanceIncs): Promise<InstanceIncs>;
        exportToSvg(config: SvgConfig): Promise<number[]>;
        beginExportToSvg(config: SvgConfig): Promise<void>;
        advanceExportToSvg(): Promise<number[]>;
        flushMetaDataCache(): void;
        getAmbientOcclusionEnabled(): Promise<boolean>;
        getAmbientOcclusionRadius(): Promise<number>;
        getBackFacesVisible(): Promise<boolean>;
        getBackgroundGradient(): Promise<[Rgba, Rgba]>;
        getCamera(): Camera;
        getCameraPromise(): Promise<Camera>;
        getCuttingSections(sectionKeys: CuttingSectionKey[]): Promise<Plane3[]>;
        getDefaultDepthRange(): Promise<Range>;
        getElementCount(): Promise<number>;
        getEyeDomeLightingBlurEdgeDistance(): Promise<number>;
        getEyeDomeLightingBlurInterval(): Promise<number>;
        getEyeDomeLightingBlurSamples(): Promise<number>;
        getEyeDomeLightingEnabled(): Promise<boolean>;
        getEyeDomeLightingOpacity(): Promise<number>;
        getEyeDomeLightingShadingEdgeDistance(): Promise<number>;
        getFacesVisible(): Promise<boolean>;
        getFaceWindingFlipped(): Promise<boolean>;
        getFrontFacesVisible(): Promise<boolean>;
        getInteractiveDrawLimitIncreaseEnabled(): Promise<boolean>;
        getLinesVisible(): Promise<boolean>;
        getLooseBounding(): Promise<Box>;
        getMetaData(ids: DataIds): Promise<Uint8Array[]>;
        getMinFrameRate(): Promise<number>;
        getNetworkVersion(): number;
        getPointShape(): Promise<PointShape>;
        getPointSize(): Promise<number>;
        getPointSizeUnit(): Promise<PointSizeUnit>;
        getPointsVisible(): Promise<boolean>;
        getStatistics(): Promise<Statistics>;
        getStreamedBounding(): Promise<Box>;
        getStreamVersion(): number;
        getTriangleCount(): Promise<number>;
        load(configuration: LoadConfig): SessionType;
        markAllMeshInstancesInteresting(interesting: boolean): void;
        markCameraAsEmpty(): void;
        meshInstanceKeyInfo(
            modelKeyOrAttachScope: ModelKey | AttachScope,
            byModel: boolean,
            keyCountOnly: boolean,
        ): Promise<(ModelKey | InstanceKey)[] | [number]>;
        metaDataKeyInfo(
            modelKeyOrAttachScope: ModelKey | AttachScope,
            byModel: boolean,
            keyCountOnly: boolean,
        ): Promise<(ModelKey | DataKey)[] | [number]>;
        modelKeysFromInclusionKeys(inclusionKeys: InclusionKey[]): Promise<ModelKey[]>;
        onResize(): void;
        pauseCapping(): void;
        primaryModelKey(): Promise<ModelKey>;
        queueRedraw(): void;
        registerBimInstances(incs: InstanceIncs, bimType: BimType): void;
        removeAllCuttingSections(): void;
        removeCuttingSections(sectionHandles: CuttingSectionKey[]): Promise<void>;
        removeLight(key: LightKey): void;
        replaceCuttingSection(cuttingPlanes: Plane3[], key: CuttingSectionKey): Promise<void>;
        requestGroups(groupIds: GroupIds, obtainDependentGroups: boolean): Promise<void>;
        requestImages(imageIds: ImageIds, wantThumbnails: boolean): Promise<void>;
        requestMeshInstances(
            incs: InstanceIncs,
            withMeshData: boolean,
            ignoreFailure: boolean,
        ): Promise<void>;
        requestMeshInstancesByGroup(
            groupId: GroupIds,
            withMeshData: boolean,
            expandGroups: boolean,
        ): Promise<void>;
        resetExplode(): void;
        resetToEmpty(
            whitelistInstances: SC.InstanceKey[],
            whitelistMeshes: SC.MeshKey[],
        ): Promise<void>;
        resumeCapping(): void;
        resumeDrawing(): void;
        screenSelectByRay(
            elementMask: number,
            canvasX: number,
            canvasY: number,
            maxPixelTolerance: number,
            config: RaySelectionConfig,
        ): Promise<PickResult>;
        serverSideRendering(): boolean;
        setAmbientLightColor(value: Rgb): void;
        setAmbientOcclusionBias(bias: number): void;
        setAmbientOcclusionBlurInterval(interval: number): void;
        setAmbientOcclusionBlurSamples(samples: number): void;
        setAmbientOcclusionContrast(contrast: number): void;
        setAmbientOcclusionEdgeDistance(distance: number): void;
        setAmbientOcclusionEnabled(enabled: boolean): void;
        setAmbientOcclusionIntensity(intensity: number): void;
        setAmbientOcclusionNoiseSize(size: number): void;
        setAmbientOcclusionOpacity(opacity: number): void;
        setAmbientOcclusionRadius(radius: number): void;
        setAmbientOcclusionSamples(samples: number): void;
        setAntiAliasingMode(antiAliasingMode: AntiAliasingMode): void;
        setBackFacesVisible(visible: boolean): void;
        setBackgroundColor(color: Rgba): void;
        setBackgroundGradient(top: Rgba, bottom: Rgba): void;
        setBloomBlurInterval(layer: number, value: number, unit: BlurIntervalUnit): void;
        setBloomBlurSamples(layer: number, value: number): void;
        setBloomEnabled(value: boolean): void;
        setBloomIntensity(layer: number, value: number): void;
        setBloomIntensityScale(value: number): void;
        setBloomLayerCount(value: number): void;
        setBloomThreshold(value: number): void;
        setBloomThresholdRampWidth(value: number): void;
        setBoundingPreviewUnderdrawColor(color: Rgba): void;
        setBoundingPreviewTestedColor(color: Rgba): void;
        setBoundingPreviewEjectedColor(color: Rgba): void;
        setBoundingPreviewColor(color: Rgba): void;
        setBoundingPreviewUnderdraw(points: Vector3[]): void;
        setBoundingPreviewTested(points: Vector3[]): void;
        setBoundingPreviewEjected(points: Vector3[]): void;
        setBoundingDebugLevel(level: number): void;
        setCamera(camera: Camera): void;
        setCappingIdleHookEnabled(enable: boolean): Promise<boolean>;
        setClumpingEnabled(value: boolean): void;
        setComparisonColors(sameColor: Rgb, only1Color: Rgb, only2Color: Rgb): void;
        setCurrentView(view: ViewKey): void;
        setDefaultDepthRange(min: number, max: number): void;
        setDefaultGloss(gloss: number): void;
        setDefaultMirror(mirror: number): void;
        setDefaultSpecularMix(mix: number): void;
        setDefaultSphereMap(imageId: ImageId): void;
        setDisplayIncompleteFrames(value: boolean): void;
        setDrawIdleDelay(delay: number): void;
        setDrawMode(drawMode: DrawMode): void;
        setDrawStrategy(strategy: DrawStrategy): void;
        setEyeDomeLightingBlurEdgeDistance(value: number): void;
        setEyeDomeLightingBlurInterval(value: number): void;
        setEyeDomeLightingBlurSamples(value: number): void;
        setEyeDomeLightingEnabled(enabled: boolean): void;
        setEyeDomeLightingOpacity(value: number): void;
        setEyeDomeLightingShadingEdgeDistance(value: number): void;
        setFacesVisible(visible: boolean): void;
        setFaceWindingFlipped(flipped: boolean): void;
        setFixedDrawLimit(value: number): void;
        setFrontFacesVisible(visible: boolean): void;
        setGoochBaseColorProminence(prominence: number): void;
        setGoochBlue(blue: number): void;
        setGoochLuminanceShiftStrength(shiftStrength: number): void;
        setGoochYellow(yellow: number): void;
        setGroundPlane(normal: Vector3): void;
        setGroundPlaneWithPosition(normal: Vector3, position?: Point3): void;
        setHardEdgeColor(value: Rgb): void;
        setHardEdgeOpacity(value: number): void;
        setHardEdgesEnabled(value: boolean): void;
        setHardEdgeThreshold(value: number): void;
        setHardEdgeThresholdRampWidth(value: number): void;
        setHiddenLineHiddenLineColor(color: Rgba): void;
        setHiddenLineHighlightedElementFillColor(color: Rgba): void;
        setHiddenLineHighlightedElementOutlineColor(color: Rgba): void;
        setHiddenLineHighlightedInstanceFillColor(color: Rgba): void;
        setHiddenLineHighlightedInstanceOutlineColor(color: Rgba): void;
        setHiddenLineVisibleLineColor(color: Rgba): void;
        setHighlightColorizeCompression(compressionLevel: number): void;
        setHighlightedElementColor(color: Rgba): void;
        setHighlightedElementFilter(highlightedFilter: HighlightFilter): void;
        setHighlightedElementOutlineColor(highlightedOutlineColor: Rgba): void;
        setHighlightedInstanceColor(color: Rgba): void;
        setHighlightedInstanceFilter(highlightedFilter: HighlightFilter): void;
        setHighlightedInstanceOutlineColor(highlightedOutlineColor: Rgba): void;
        setHighlightMode(highlightMode: HighlightMode): void;
        setImageBasedLightingEnabled(value: boolean): void;
        setImageBasedLightingEnvironment(data: Uint8Array): void;
        setImageBasedLightingEnvironmentToDefault(): void;
        setImageBasedLightingIntensity(value: number): void;
        setImageBasedLightingMatrix(value: Matrix9): void;
        setInstancingEnabled(value: boolean): void;
        setInteractiveDrawLimitIncreaseEnabled(enable: boolean): void;
        setInteractiveDrawLimitIncreaseInterval(milliseconds: number): void;
        setLightingEnabled(enabled: boolean): void;
        setLineJitterEnabled(enabled: boolean): void;
        setLineJitterFrequency(value: number): void;
        setLineJitterInstanceCount(value: number): void;
        setLineJitterRadius(value: number): void;
        setLinesVisible(visible: boolean): void;
        setMeshLevel(incs: InstanceIncs, level: number): void;
        setMetallicRoughnessMaterialOverride(
            defaultMetallicFactor: number,
            defaultRoughnessFactor: number,
        ): void;
        setMinDrawLimit(value: number): void;
        setMinFrameRate(value: number): void;
        setMinIncrementalFrameRate(value: number): void;
        setMinInteractiveFrameRate(value: number): void;
        setPointShape(shape: PointShape): void;
        setPointSize(size: number, unit: PointSizeUnit): void;
        setPointsVisible(visible: boolean): void;
        setPointVisibilityTest(points: Vector3[]): void;
        setPostInputDelay(value: number): void;
        setSilhouetteColor(value: Rgb): void;
        setSilhouetteEnabled(value: boolean): void;
        setSilhouetteOpacity(value: number): void;
        setSilhouetteThreshold(value: number): void;
        setSilhouetteThresholdRampWidth(value: number): void;
        setSimpleReflectionAttenuation(
            nearDistance: number,
            farDistance: number,
            unit: SimpleReflectionAttenuationUnit,
        ): void;
        setSimpleReflectionBlurInterval(value: number, unit: BlurIntervalUnit): void;
        setSimpleReflectionBlurSamples(value: number): void;
        setSimpleReflectionEnabled(value: boolean): void;
        setSimpleReflectionFadeAngle(degrees: number): void;
        setSimpleReflectionOpacity(value: number): void;
        setSimpleShadowBlurInterval(value: number): void;
        setSimpleShadowBlurSamples(value: number): void;
        setSimpleShadowColor(value: Rgb): void;
        setSimpleShadowEnabled(value: boolean): void;
        setSimpleShadowInteractiveUpdateEnabled(value: boolean): void;
        setSimpleShadowOpacity(value: number): void;
        setSimpleShadowResolution(pixels: number): void;
        setSsrQuality(opts: SsrQualityConfig): void;
        setStreamCutoffScale(value: number): void;
        setStreamIdleMarker(): Promise<void>;
        setToonBandCount(bandCount: number): void;
        setToonSpecularFactor(specularFactor: number): void;
        setTransparencyMode(value: TransparencyMode): void;
        setUnhighlightedColor(color: Rgba): void;
        setUnhighlightedFilter(highlightedFilter: HighlightFilter): void;
        setVisibilityByAttachment(attachScope: AttachScope, setVisibility: SetVisibility): void;
        setXRayMaterial(group: XRayGroup, element: ElementType, color: Rgba): void;
        setXRayOpacity(element: ElementType, value: number): void;
        setXRayTransparencyMode(value: TransparencyMode): void;
        shutDown(): void;
        startComparison(instanceSet1: InstanceIncs, instanceSet2: InstanceIncs): void;
        startExplode(incs: InstanceIncs, center: Point3): void;
        suspendDrawing(): void;
        testPointVisibility(points: Vector3[]): Promise<number[]>;
        throttleLoad(
            newPauseInterval: Communicator.Milliseconds,
            throttleDuration: Communicator.Milliseconds,
        ): void;
        triangulatePolygon(polygonPoints: Float32Array | number[], normal: Vector3): number[];
        truncateMetaData(dataIds: DataIds): Promise<void>;
        unsetAllColors(): void;
        unsetAllHighlighted(): void;
        unsetAllOpacity(): void;
        unsetAllXRay(): void;
        unsetCurrentView(): void;
        unsetXRayMaterial(group: XRayGroup, element: ElementType): Promise<void>;
        updateLight(
            key: LightKey,
            type: LightType,
            space: LightSpace,
            position: Point3,
            color: Rgb,
        ): void;
        waitForImageDecoding(): Promise<void>;
        worldSelectByRay(ray: Ray, config: RaySelectionConfig): Promise<PickResult>;

        _loseWebGlContext(): boolean;
    }

    export interface StartArgs {
        container: string | HTMLElement;
        onReady: (sc: Instance) => void;
        onError: (message: string) => void;
        enginePath?: string;
    }

    export interface Global {
        createInstance(args: StartArgs): Instance;
    }
}

declare var _SC: SC.Global;
