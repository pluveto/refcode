import * as vscode from 'vscode';

export function getCurrentFileName(editor: vscode.TextEditor, relative: boolean): string | undefined {
    if (!editor) {
        return undefined;
    }

    let doc = editor.document;
    let path = doc.uri.fsPath; // absolute path

    let ret = path;
    if (relative) {
        ret = vscode.workspace.asRelativePath(path);
    }

    return ret;
}
