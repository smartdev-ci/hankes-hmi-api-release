interface Notification {
    id: string;
    userId: string;
    titre: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
    estLue: boolean;
    dateLecture: Date | null;
    metadata: any | null;
    createdAt: Date;
}
interface NotificationInsert {
    userId: string;
    titre: string;
    message: string;
    type?: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
    estLue?: boolean;
    dateLecture?: Date | null;
    metadata?: any | null;
}
export declare class NotificationService {
    static findAll(): Promise<Notification[]>;
    static findById(id: string): Promise<Notification | null>;
    static findByUser(userId: string): Promise<Notification[]>;
    static create(data: NotificationInsert): Promise<Notification>;
    static markAsRead(id: string): Promise<Notification>;
    static markAllAsRead(userId: string): Promise<number>;
    static delete(id: string): Promise<void>;
}
export {};
