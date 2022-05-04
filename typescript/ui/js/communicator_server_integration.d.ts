declare namespace Communicator {
    class ServiceBroker {
        private _endpoint;
        constructor(endpoint: string);
        request(serviceRequest: ServiceRequest): Promise<ServiceResponse>;
        private _encodeServiceRequest;
        private _parseServerSuccessResponse;
        private _parseServerError;
    }
}
declare namespace Communicator {
    enum ServiceClass {
        CSR_Session = 0,
        SSR_Session = 1
    }
    class ServiceRequest {
        private _serviceClass;
        private _modelSearchDirectories;
        private _model;
        private _readyEndpoint;
        private _statusEndpoint;
        private _disconnectEndpoint;
        private _statusUpdateFrequency;
        private _sessionToken;
        constructor(serviceClass?: ServiceClass);
        setServiceClass(serviceClass: ServiceClass): void;
        getServiceClass(): ServiceClass;
        addModelSearchDirectory(modelSearchDirectory: string): void;
        getModelSearchDirectories(): string[];
        getModel(): string | null;
        setModel(model: string): void;
        getReadyEndpoint(): string | null;
        setReadyEndpoint(readyEndpoint: string): void;
        getStatusEndpoint(): string | null;
        setStatusEndpoint(statusEndpoint: string): void;
        getDisconnectEndpoint(): string | null;
        setDisconnectEndpoint(disconnectEndpoint: string): void;
        getStatusUpdateFrequency(): number;
        setStatusUpdateFrequency(statusUpdateFrequency: number): void;
        getSessionToken(): string | null;
        setSessionToken(sessionToken: string): void;
    }
}
declare namespace Communicator {
    enum ServiceProtocol {
        WS = 0,
        WSS = 1,
        HTTP = 2,
        HTTPS = 3
    }
    interface ServiceProtocolStringMap {
        [protocol: string]: string;
    }
    class ServiceResponse {
        private _isOk;
        private _reason;
        private _serviceId;
        private _endpoints;
        getIsOk(): boolean;
        getReason(): string | null;
        getServiceId(): string | null;
        getEndpoints(): ServiceProtocolStringMap;
        /** @hidden */
        _setIsOk(isOk: boolean): void;
        /** @hidden */
        _setReason(reason: string): void;
        /** @hidden */
        _setServiceId(serviceId: string): void;
        /** @hidden */
        _addEndpoint(protocol: ServiceProtocol, endpoint: string): void;
    }
}
