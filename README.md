# Refcode

**Refcode** is a Visual Studio Code extension that enhances your coding experience by allowing you to copy selected code and render it using a customizable template to your clipboard. It supports various template variables and filters to customize the output. Additionally, it provides a status bar icon for quick copying of code using the specified template. It also supports post-actions, enabling you to call custom commands to process the rendered text, such as uploading it to a code bin.

## Features

- Copy selected code rendered using a template.
- Supports the following template variables to handle the selected code:
  - `path`: The file path.
  - `relpath`: The relative file path.
  - `outline`: The outline path of it. Like `Foo » useEffect() callback`
  - `lineno`: The starting line number of it.
  - `colno`: The starting column number of it.
  - `linenoEnd`: The ending line number of it.
  - `colnoEnd`: The ending column number of it.
  - `lang`: The language of the code.
  - `content`: The content of it.
- Allows template filters, including `stripIndent` and `strip`.
- Here is a template example: "`{relpath}`:\n```{lang}\n{#stripIndent}{content}{/stripIndent}\n```".
- Displays a status bar icon for quick copying using the given template.
- Supports post-actions, allowing you to call custom commands to process the rendered text.

NOTE:

- If you want to customize a post-action command, your program should print the result to stdout.
  - If the command exits with a non-zero status or has stderr output,
    the copy operation will be aborted. An error message will be raised, and nothing will be copied.

## Commands

- `refcode.refer-use-default-template`: Copy selected code using the default template.
- `refcode.refer-use-custom-template`: Copy selected code using a custom template.
- `refcode.set-default-template`: Set the default template.

## Shortcut

This extension doesn't provide any shortcut by default. You can add a shortcut by yourself.

To set up a shortcut follow these steps:

1. Go to the "File" menu and select "Preferences", then choose "Keyboard Shortcuts" (or use the shortcut `Ctrl+K Ctrl+S`). This will open the Keyboard Shortcuts editor.
2. On the right-hand side, you will see a search box. Type the name of the command you want to set a shortcut for. For example, if you want to set a shortcut for `refcode.refer-use-default-template`, type "refcode.refer-use-default-template" in the search box. The matching command will appear in the list below the search box.
3. Click on the "+" icon next to the command name to add a new keybinding. A text input field will appear. Enter your desired shortcut key combination. For example, you can use `Ctrl+Shift+C` for the `refcode.refer-use-default-template` command.
4. Once you've entered the shortcut, press Enter to save it.

## License

This extension is released under the MIT License. See the [LICENSE](LICENSE) file for more information.
