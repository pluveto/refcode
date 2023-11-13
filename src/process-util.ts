import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';

export interface Result {
    ok: boolean;
    error?: string;
    output?: string;
}

export function execExternalCommand(command: string, input: string): Result {
    let options: ExecSyncOptionsWithStringEncoding = {
        input: input,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
    };

    try {
        let output = execSync(command, options);
        return { ok: true, output: output };
    } catch (error) {
        if (Object.prototype.hasOwnProperty.call(error, 'stderr')) {
            // @ts-ignore
            let stderr = error.stderr;
            return { ok: false, error: stderr };
        }
        return { ok: false };
    }
}
