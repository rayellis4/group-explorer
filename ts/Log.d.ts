type logLevelString = 'debug' | 'info' | 'warn' | 'err' | 'none';
export declare function isActive(levelString: logLevelString): boolean;
export declare function debug(...args: any[]): void;
export declare function info(...args: any[]): void;
export declare function warn(...args: any[]): void;
export declare function err(...args: any[]): void;
export {};
