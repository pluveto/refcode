import * as Mustache from 'mustache';

export type TemplateData = {
    path?: string;
    relpath?: string;
    lineno?: string;
    colno?: string;
    linenoEnd?: string;
    colnoEnd?: string;
    lang?: string;
    content?: string;
} & { [key: string]: string };

export function stripIndent(text?: string): string {
    if (!text) {
        console.error('stripIndent: text is undefined');
        return '';
    }

    let lines = text.split('\n');
    let minIndent = lines.reduce((min, line) => {
        if (line.trim() === '') {
            return min;
        }

        let match = line.match(/^\s*/) || [''];
        let indent = match[0].length;
        return Math.min(min, indent);
    }, Infinity);

    return lines.map(line => line.slice(minIndent)).join('\n');
}

export function strip(text?: string): string {
    if (!text) {
        console.error('strip: text is undefined');
        return '';
    }
    return text.trim();
}

function decorate(strFn: (s: string) => string) {
    return (text: string, render: Function) => strFn(render(text));
}

export function renderTemplate(template: string, data: TemplateData): string {
    let fns = {
        stripIndent: () => decorate(stripIndent),
        strip: () => decorate(strip),
    };
    return Mustache.render(template, { ...data, ...fns }, {}, {
        tags: ['{', '}'],
        escape: text => text,
    });
}
