const vscode = require('vscode');


function clearHoverProviders(hoverProviders) {
    for (const hoverProvider of hoverProviders.values()) {
        hoverProvider.dispose(); // Dispose of the hover provider
    }
    hoverProviders.clear(); // Clear the map
}

function processFiles(fileData, apiData, fileType, context, hoverProviders) {
    
    const matches = []; // Store matches to highlight later
    const documentPromises = []; // To accumulate promises for opening documents

    for (const fileMap of fileData) {
        for (const [fileName, fileData] of fileMap) {
            const fileURL = fileData.filePath;
            if (fileData.apiLocations.size !== 0) {
                for (const [key, value] of apiData) {
                    for (const [key1, value1] of fileData.apiLocations) {
                        let newVal = value1;
                        if(value1.includes('|'))
                        {
                            newVal = value1.split('|')[1].trim();
                        }

                        const newURL = key.match(/https?:\/\//i);
                        let url;
                        if(newURL)
                        {
                            url = key.substring(newURL.index)
                        }
                        if (newVal.includes(url)) {

                            const fileUri = vscode.Uri.file(fileURL);

                            // Open the document and accumulate matches
                            const docPromise = vscode.workspace.openTextDocument(fileUri).then((d) => {
                                if(value.markdown == undefined)
                                {
                                    matches.push({ document: d, keyToHighlight: value1.split('|')[0].trim(), text: value });
                                } else
                                {
                                    matches.push({ document: d, keyToHighlight: value1.split('|')[0].trim(), text: value.markdown });
                                }
                            }, (error) => {
                                vscode.window.showErrorMessage(`Could not open ${fileType} file: ${error.message}`);
                            });

                            documentPromises.push(docPromise); // Push the promise to the array
                        }
                    }
                }
            }
        }
    }

    Promise.all(documentPromises).then(() => {
        if (matches.length > 0) {
            highlightMatchesInFile(matches, context, hoverProviders);
        }
    });
}

function highlightMatchesInFile(matches, context, hoverProviders) {


    const ranges = []; // Store all ranges to highlight
    const indicatorLine = [];
    const hoverData = new Map(); // To store hover text based on range
    const editor = vscode.window.activeTextEditor;
        
    const decorationType = vscode.window.createTextEditorDecorationType({
        before: {
            contentText: '➡️',  // Unicode for an arrow
            color: 'blue',      // Optional: You can change the color
            margin: '0 1em 0 0' // Optional: Adjust the spacing around the arrow
        }
    });

    
    for (const { document, keyToHighlight, text } of matches) {
        for (let line = 0; line < document.lineCount; line++) {
            const lineText = document.lineAt(line).text.trim();
            const index = lineText.indexOf(keyToHighlight.trim());
            if (index !== -1) {
                const startPos = new vscode.Position(line, index);
                const endPos = new vscode.Position(line, index + keyToHighlight.length);
                const range = new vscode.Range(startPos, endPos);
                ranges.push(range);
                const rangeKey = `${line}:${index}`;
                hoverData.set(rangeKey, text); // Store hover text for each range
                break;
            }
        }
    }


    const documentUri = matches[0].document.uri.toString(); // Get the URI from the first match
    if (!hoverProviders.has(documentUri)) {
        const hoverProvider = vscode.languages.registerHoverProvider(matches[0].document.languageId, {
            provideHover(document, position) {
                const currentRange = ranges.find(range => range.contains(position));
                if (currentRange) {
                    const line = currentRange.start.line;
                    const character = currentRange.start.character;
                    const hoverKey = `${line}:${character}`; // Create the same key to retrieve hover text
                    const hoverText = hoverData.get(hoverKey);
                    if (hoverText) {
                        return new vscode.Hover(hoverText);
                    }
                }
                return null; // No hover information
            }
        });

        
        // vscode.window.onDidChangeActiveTextEditor(editor => {
        //     if (editor) {
        //         const visibleRanges = editor.visibleRanges;
        //         // Reapply decoration for each stored range that should still be visible
        //         indicatorLine.forEach(range => {
        //             // Check if the range is still in the visible area of the editor
        //             if (visibleRanges.some(v => v.intersection(range))) {
        //                 editor.setDecorations(decorationType, [range]);
        //             }
        //         });
        //     }
        // });

        hoverProviders.set(documentUri, hoverProvider);
        context.subscriptions.push(hoverProvider);
    }

    
}

module.exports = { processFiles };
