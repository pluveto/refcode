import * as vscode from 'vscode';
import { RefCodeApp } from './app';

let extension = new RefCodeApp();

export function activate({ subscriptions }: vscode.ExtensionContext) {
	extension.activate().map((item) => subscriptions.push(item));
}

// This method is called when your extension is deactivated
export function deactivate() {
}
