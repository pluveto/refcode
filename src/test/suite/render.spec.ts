import assert from 'assert';
import { renderTemplate, stripIndent, TemplateData } from '../../render';

suite('renderTemplate', () => {
    test('should replace placeholders with corresponding values', () => {
        const template = 'Hello, {name}! Your age is {age}.';
        const data: TemplateData = {
            name: 'John',
            age: '25',
        };

        const result = renderTemplate(template, data);
        assert.strictEqual(result, 'Hello, John! Your age is 25.');
    });

    test('should remove unmatched placeholders', () => {
        const template = 'Hello, {name}! Your age is {age}.';
        const data: TemplateData = {
            name: 'John',
        };

        const result = renderTemplate(template, data);
        assert.strictEqual(result, 'Hello, John! Your age is .');
    });

    test('should handle empty data object', () => {
        const template = 'Hello, {name}! Your age is {age}.';
        const data: TemplateData = {};

        const result = renderTemplate(template, data);
        assert.strictEqual(result, 'Hello, ! Your age is .');
    });

    test('should handle empty template string', () => {
        const template = '';
        const data: TemplateData = {
            name: 'John',
            age: '25',
        };

        const result = renderTemplate(template, data);
        assert.strictEqual(result, '');
    });

    test('should handle empty template string and empty data object', () => {
        const template = '';
        const data: TemplateData = {};

        const result = renderTemplate(template, data);
        assert.strictEqual(result, '');
    });

    test('should handle spaces inside placeholders', () => {
        const template = 'Hello, { name }! Your age is { age }.';
        const data: TemplateData = {
            name: 'John',
            age: '25',
        };

        const result = renderTemplate(template, data);
        assert.strictEqual(result, 'Hello, John! Your age is 25.');
    });

    test('should handle missing properties in data object', () => {
        const template = 'Hello, {name}! Your age is {age}.';
        const data: TemplateData = {
            name: 'John',
            missingProp: 'This should not appear',
        };

        const result = renderTemplate(template, data);
        assert.strictEqual(result, 'Hello, John! Your age is .');
    });
});

suite('stripIndent', () => {
    test('should strip indent', () => {
        const text = `
            Hello
            World
        `;
        const result = stripIndent(text);
        assert.strictEqual(result, '\nHello\nWorld\n');
    });
    test('should strip indent with empty lines', () => {
        const text = `
            Hello
            
            World
        `;
        const result = stripIndent(text);
        assert.strictEqual(result, '\nHello\n\nWorld\n');
    });
});
