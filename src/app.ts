import * as vscode from 'vscode';
import { TemplateData, renderTemplate } from './render';
import { getCurrentFileName } from './vscode_util';
import { execExternalCommand } from './process-util';

type Template = {
    name: string;
    template: string;
    postActions?: string[];
    multiSelections?: boolean;
    joinString?: string;
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
        let editor = vscode.window.activeTextEditor as vscode.TextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found");
            return;
        }

        if (template.multiSelections) {
            return this.executeWithTemplateSelections(template);
        }

        let rendered = renderTemplate(template.template, collectDataForTemplate(editor));
        rendered = this.applyPostActions(
            rendered,
            editor.selection,
            template.postActions
        );

        const postActions = template.postActions || [];
        if (postActions.includes('replace') || postActions.includes('writeback')) {
            editor.edit(editBuilder => {
                editBuilder.replace(editor.selection, rendered);
            });
            return;
        }
        // if has last action and last action is no-copy
        if (postActions.length > 0 && postActions[postActions.length - 1] === 'no-copy') {
            return;
        }

        vscode.env.clipboard.writeText(rendered);
        vscode.window.showInformationMessage("Code copied");
    }

    executeWithTemplateSelections(template: Template): void {
        let editor = vscode.window.activeTextEditor as vscode.TextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found");
            return;
        }

        let rendereds = collectDataForTemplateSelections(editor).map(d => renderTemplate(template.template, d));
        rendereds = rendereds.map(
            (r, i) => this.applyPostActions(
                r,
                editor.selections[i],
                template.postActions
            )
        );

        const rendered = rendereds.join(template.joinString || '\n');
        const postActions = template.postActions || [];
        // if has replace action, apply all
        if (postActions.includes('replace') || postActions.includes('writeback')) {
            editor.edit(editBuilder => {
                editor.selections.forEach((s,i) => {
                    editBuilder.replace(s, rendereds[i]);
                });
            });
            return;
        }
        // if has last action and last action is no-copy
        if (postActions.length > 0 && postActions[postActions.length - 1] === 'no-copy') {
            return;
        }

        vscode.env.clipboard.writeText(rendered);
        vscode.window.showInformationMessage("Code copied");
    }

    applyPostActions(rendered_: string, selection: vscode.Selection, postActions: string[] | undefined) {
        let rendered = rendered_;
        let replaceQueue: string[] = [];
        if (!postActions) {
            return rendered;
        }

        for (let action of postActions) {
            if (action === 'strip') {
                rendered = rendered.trim();
                continue;
            }

            if (action === 'writeback' || action === 'replace') {
                continue;
            }

            if (action.startsWith("eval")) {
                const fnStr = action.slice(4).trim();
                const escapedInput = JSON.stringify(rendered);
                rendered = eval('(' + fnStr + ')(' + escapedInput + ')');
                continue;
            }

            if (action.startsWith("no-copy")) {
                continue;
            }

            // otherwise, it's a command
            let ret = execExternalCommand(action, rendered);
            if (!ret.ok) {
                vscode.window.showErrorMessage(`Error when executing post action ${action}: ${ret.error}`);
                return rendered;
            } else {
                rendered = ret.output || '';
            }
        }

        return rendered;
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
export function collectDataForTemplateSelections(editor: vscode.TextEditor): TemplateData[] {
    return editor.selections.map(s => {
        return {
            path: getCurrentFileName(editor, false) || '',
            relpath: getCurrentFileName(editor, true) || '',
            lineno: (s.start.line + 1).toString(),
            colno: (s.start.character + 1).toString(),
            linenoEnd: (s.end.line + 1).toString(),
            colnoEnd: (s.end.character + 1).toString(),
            lang: editor.document.languageId,
            content: editor.document.getText(s)
        };
    });
}
