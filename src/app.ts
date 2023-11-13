import * as vscode from 'vscode';
import { TemplateData, renderTemplate } from './render';

type Template = {
    name: string;
    template: string;
};

type RefCodeConfiguration = {
    templates?: Template[]
    defaultTemplate?: string
};


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

export function collectData(editor: vscode.TextEditor): TemplateData {
    return {
        path: getCurrentFileName(editor, false) || '',
        relpath: getCurrentFileName(editor, true) || '',
        lineno: (editor.selection.start.line + 1).toString(),
        colno: (editor.selection.start.character + 1).toString(),
        linenoEnd: (editor.selection.end.line + 1).toString(),
        colnoEnd: (editor.selection.end.character + 1).toString(),
        lang: editor.document.languageId,
        content: editor.document.getText(editor.selection)
    };
}

export class RefCodeApp {
    static readonly COMMAND_REF_DEFAULT = 'refcode.refer-use-default-template';
    static readonly COMMAND_REF_CUSTOM = 'refcode.refer-use-custom-template';
    static readonly COMMAND_SET_DEFAULT = 'refcode.set-default-template';



    static readonly FALLBACK_TEMPLATE: Template = {
        name: "fallback",
        template: "`{relpath}`:\n```{lang}\n{#stripIndent}{content}{/stripIndent}\n```",
    };

    constructor() { }

    get config() { return vscode.workspace.getConfiguration('refcode') as RefCodeConfiguration; }

    public activate(): {
        dispose(): any;
    }[] {
        return [
            vscode.commands.registerCommand(RefCodeApp.COMMAND_REF_DEFAULT, this.onCommandRefDefault.bind(this)),
            this.createRefcodeButton(),
        ];
    }

    get currentTemplate(): Template | undefined {
        return this.config.templates?.filter(t => t.name === this.config.defaultTemplate)?.[0];
    }

    onCommandRefDefault(): void {
        let template = this.currentTemplate;
        if (!template) {
            vscode.window.showErrorMessage("No template found. Using fallback template");
            template = RefCodeApp.FALLBACK_TEMPLATE;
        }

        this.executeWithTemplate(template);
    }

    executeWithTemplate(template: Template): void {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found");
            return;
        }

        let rendered = renderTemplate(template.template, collectData(editor));
        vscode.env.clipboard.writeText(rendered);
        vscode.window.showInformationMessage("Code copied");
    }

    createRefcodeButton(): vscode.StatusBarItem {
        let iconButton = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );

        iconButton.text = `$(explorer-view-icon) refcode`;
        iconButton.command = RefCodeApp.COMMAND_REF_DEFAULT;
        iconButton.show();

        return iconButton;
    }
}
