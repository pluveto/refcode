import * as vscode from 'vscode';
import { TemplateData, renderTemplate } from './render';
import { getCurrentFileName } from './vscode_util';
import { execExternalCommand } from './process-util';

type Template = {
    name: string;
    template: string;
    postActions?: string[];
};

type RefCodeConfiguration = {
    templates?: Template[]
    defaultTemplate?: string
} & vscode.WorkspaceConfiguration;


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
        const commands = {
            [RefCodeApp.COMMAND_REF_DEFAULT]: this.onCommandRefDefault,
            [RefCodeApp.COMMAND_REF_CUSTOM]: this.onCommandRefCustom,
            [RefCodeApp.COMMAND_SET_DEFAULT]: this.onCommandSetDefault,
        };
        return [
            ...Object.entries(commands).
                map(([key, value]) =>
                    vscode.commands.registerCommand(key, value.bind(this))
                ),
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

    onCommandRefCustom(): void {
        this.showPickTemplateDialog().then(template => {
            if (!template) {
                vscode.window.showErrorMessage("No template found. Using fallback template");
                template = RefCodeApp.FALLBACK_TEMPLATE;
            }

            this.executeWithTemplate(template);
        });
    }

    onCommandSetDefault(): void {
        this.showPickTemplateDialog().then(template => {
            if (!template) {
                vscode.window.showErrorMessage("No template found. Using fallback template");
                template = RefCodeApp.FALLBACK_TEMPLATE;
            }

            let settingKey: keyof RefCodeConfiguration = 'defaultTemplate';
            this.config.update(settingKey.toString(), template.name);
            vscode.window.showInformationMessage(`Default template set to ${template.name}`);
        });
    }

    showPickTemplateDialog(): Promise<Template | undefined> {
        let templates = this.config.templates;
        if (!templates) {
            vscode.window.showErrorMessage("No template found. Using fallback template");
            return Promise.resolve(undefined);
        }

        let templateNames = templates.map(t => t.name);
        let r = vscode.window
            .showQuickPick(templateNames, { canPickMany: false })
            .then(selected => {
                if (!selected) {
                    return undefined;
                }
                if (!templates) {
                    return undefined;
                }
                return templates.filter(t => t.name === selected)[0];
            });

        return new Promise((resolve, reject) => {
            r.then(resolve, reject);
        });
    }

    executeWithTemplate(template: Template): void {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found");
            return;
        }

        let rendered = renderTemplate(template.template, collectDataForTemplate(editor));
        let postActions = template.postActions || [];
        console.log(postActions);

        for (let action of postActions) {
            if (action === 'strip') {
                rendered = rendered.trim();
                continue;
            }
            let ret = execExternalCommand(action, rendered);
            if (!ret.ok) {
                vscode.window.showErrorMessage(`Error when executing post action ${action}: ${ret.error}`);
                return;
            } else {
                rendered = ret.output || '';
            }
        }

        vscode.env.clipboard.writeText(rendered);
        vscode.window.showInformationMessage("Code copied");
    }

    createRefcodeButton(): vscode.StatusBarItem {
        let iconButton = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );

        iconButton.text = `$(explorer-view-icon) refcode`;
        iconButton.command = RefCodeApp.COMMAND_REF_CUSTOM;
        iconButton.tooltip = "Copy code to clipboard use specified template";
        iconButton.show();

        return iconButton;
    }
}

export function collectDataForTemplate(editor: vscode.TextEditor): TemplateData {
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
