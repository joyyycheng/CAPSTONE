function extractElements(code, fileName, extension)
{
    let variableRegex;
    let functionRegex;
    let importRegex;

    switch(extension)
    {
        case "py":
            variableRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/gm;
            functionRegex = /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)\s*:/gm;
            importRegex = /^\s*(import|from)\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*(?:import\s+([a-zA-Z_][a-zA-Z0-9_,\s]*))?\s*$/gm;
            break;
        case "js":
            variableRegex = /^\s*(let|const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.*?);?$/gm;
            functionRegex = /^\s*(async\s+)?(function\s+([a-zA-Z_][a-zA-Z0-9_]*)|\(?\s*([a-zA-Z_][a-zA-Z0-9_]*)?\s*\)?\s*=>)\s*\((.*?)\)/gm;
            importRegex = /^\s*const\s+(\{[^}]+\})\s*=\s*require\(\s*['"`]([^'"]+)['"`]\s*\);?$/gm;
            break;
        case "cs":
            variableRegex = /^\s*(int|double|float|string|var|bool|char)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/gm;
            functionRegex = /^\s*(public|private|protected|internal)?\s*(static)?\s*(void|int|double|string|bool)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(.*\)/gm;
            importRegex = /^\s*using\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*;/gm;
            break;
        default:
            console.log("Unsupported file type: " + extension);
            return;
    }

    // Arrays to store the matches
    const variables = new Map();
    const functions = new Map();
    const imports = new Map();
    const functionCalls = new Map();
    const extractedData = new Map();
    const apiLocations = new Map();

    let match;

    while ((match = variableRegex.exec(code)) !== null) {
        if(extension == "js")
        {
            variables.set(match[2], match[3]);
            if(match[3].includes("https"))
            {
                const i = match[0].replace(/^\n/, '')
                console.log(i);
                apiLocations.set(fileName, match[0].replace(/^\n/, ''));// Store the length for highlighting
            }
        } else if (extension == "py")
        {
            variables.set(match[1], match[2]);
            if(match[2].includes("https"))
            {
                const j = match[0].replace(/^\n/, '')
                console.log(j);
                apiLocations.set(fileName, match[0].replace(/^\n/, '')); // Store the length for highlighting
            } 
        }
    }

    while ((match = functionRegex.exec(code)) !== null) {
        if(extension == "js")
        {
            if(match[1] == 'async ')
                {
                    const functionName = match[3]; // match[2] for named functions, match[3] for arrow functions
                    if (functionName) {
                        functions.set(functionName, match[5]);
                    }
                } else
                {
                    const functionName = match[3]; // match[2] for named functions, match[3] for arrow functions
                    if (functionName) {
                        functions.set(functionName, match[5]);
                    } 
                }
        } else if (extension == "py")
        {
            functions.set(match[1], match[2]);
        }
        
        
    }
    // Find import statements
    while ((match = importRegex.exec(code)) !== null) {
        if(extension == "js")
        {
            const importedNames = match[1].replace(/[{}]/g, '').split(',').map(name => name.trim()); // Extract names inside curly braces
            const modulePath = match[2];
            const moduleName = modulePath.split('/').pop().replace(/\.[^.]+$/, ''); 
            imports.set(importedNames, moduleName);
        } else if(extension == "py")
        {
            const importType = match[1]; // 'import' or 'from'
            const modulePath = match[2]; // the module being imported
        
            // If it's a 'from' import, we need to handle the imported functions or classes
            let importedNames = [];
            if (importType === 'from') {
                const specificImports = match[3]; // e.g., 'get_weathers, process_data'
                if (specificImports) {
                    if (specificImports.includes(',')) { 
                        importedNames = specificImports
                            .split(',')
                            .map(name => name.trim().replace(/['"]/g, '')); // Clean quotes
                    } else {
                        // If no comma is present, trim the specific import and add it
                        importedNames = [specificImports.trim().replace(/['"]/g, '')];
                    }
                }
            } else {
                // For a standard import, we can just set the module name as the imported name
                importedNames = [modulePath.trim()];
            }
        
            // You may want to adjust how you set the imports based on your existing logic
            // Assuming you want to store the module name as the key and the imported names as values
            imports.set(modulePath, importedNames);
        }
    }

    functions.forEach((params, functionName) => {
        // Create a regex pattern for the function name to find its calls
        const regex = new RegExp(`(?<!\\w)(${functionName})\\s*\\((.*?)\\)`, 'g');
        const calls = [];
        let match;

        // Search for function calls using the regex
        while ((match = regex.exec(code)) !== null) {
            const args = match[2] ? match[2].split(',').map(arg => arg.trim()) : []; // Get arguments
            calls.push(args); // Store the arguments for the call
        }

        // Store the calls in the results object
        if (calls.length > 0) {
            functionCalls.set(functionName, calls)
        }
    });

    imports.forEach((params, functionName) => {
        // Create a regex pattern for the function name to find its calls
        if(extension == "js")
        {
            const regex = new RegExp(`(?<!\\w)(${functionName})\\s*\\((.*?)\\)`, 'g');
            let match;
            // Search for function calls using the regex
            while ((match = regex.exec(code)) !== null) {
                const args = match[2] ? match[2].split(',').map(arg => arg.trim()) : []; // Get arguments  
                functionCalls.set(functionName, args)
            }
        } else if(extension == "py")
        {
            const regex = new RegExp(`(?<!\\w)(${params})\\s*\\((.*?)\\)`, 'g');
            let match;
            // Search for function calls using the regex
            while ((match = regex.exec(code)) !== null) {
                const args = match[2] ? match[2].split(',').map(arg => arg.trim()) : []; // Get arguments  
                functionCalls.set(params, args)
            }
        }
        

    });

    extractedData.set(fileName, {
        name: fileName,
        variables: variables,
        functions: functions,
        imports: imports,
        functionCalls: functionCalls, 
        apiLocations: apiLocations
    })

    return extractedData;
}

module.exports = {extractElements };