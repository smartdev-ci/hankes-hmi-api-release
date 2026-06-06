export declare const config: {
    port: string | number;
    nodeEnv: string;
    jwt: {
        secret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    database: {
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
    };
    redis: {
        host: string;
        port: number;
        password: string | undefined;
    };
    audio: {
        maxFileSizeBytes: number;
        minConfidence: number;
        duplicateWindowMinutes: number;
    };
    fingerprint: {
        fpcalcPath: string;
        timeoutMs: number;
        allowHashFallback: boolean;
    };
    recognitionCache: {
        enabled: boolean;
        ttlSeconds: number;
    };
    twilio: {
        accountSid: string;
        authToken: string;
        fromNumber: string;
    };
    acrcloud: {
        apiKey: string;
        apiSecret: string;
        host: string;
    };
    audd: {
        apiToken: string;
    };
    s3: {
        bucket: string;
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
    };
    ses: {
        region: string;
        fromEmail: string;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
};
export default config;
