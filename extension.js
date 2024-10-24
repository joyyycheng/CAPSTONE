const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { extractElements} = require('./RegularExpression');
const { matchFileInfo } = require('./FileMatch');
const { matchAPIs } = require('./FindAPI');
const { processFiles } = require('./HighlightandMessage');
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    let disposable = vscode.commands.registerCommand('firstextension.search_stackoverflow', async function () {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const globPattern = '**/*.{js,py,cs}';
            const files = await vscode.workspace.findFiles(globPattern);
            const jsFile =[]
            const pyFile =[]
            for (const file of files) {
                const document = await vscode.workspace.openTextDocument(file);
                const fileExtension = document.fileName.split('.').pop();
                const fileContent = document.getText();
                if (file.fsPath.includes('node_modules')|| file.fsPath.includes('vscode') || file.fsPath.includes('__pycache__')) {
                    continue; // Skip this file
                }
                switch (fileExtension) {
                    case "js":
                        const js = extractElements(fileContent, path.basename(document.fileName, path.extname(document.fileName)), fileExtension);
                        jsFile.push(js)
                        break;
                    case "py":
                        const py = extractElements(fileContent, path.basename(document.fileName, path.extname(document.fileName)), fileExtension);
                        pyFile.push(py)
                        break;
                    default:
                        vscode.window.showInformationMessage('No specific action for this file extension.');
                        break;
                }
            }

            // from here since the file name and line of code was added here, match the line and hover over the code to show the new url
            matchFileInfo(jsFile);
            
            console.log("js: ", jsFile);
            let i = matchAPIs(jsFile, "js");
            console.log("js api: ", i);
            processFiles(jsFile, i, "js", context);
            
            matchFileInfo(pyFile);
            
            console.log("py: ", pyFile);
            let p = matchAPIs(pyFile, "py");
            console.log("py api: ", p);
            //processFiles(pyFile, p, "py", context);
        }
    });

    context.subscriptions.push(disposable);
}



// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
};
