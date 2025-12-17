let pyodide = null;
const STORAGE_PREFIX = 'python_script_';
const STORAGE_INDEX_KEY = 'python_scripts_index';

// Initialize Pyodide
async function initPyodide() {
    const terminal = document.getElementById('terminal');
    addTerminalOutput('Initializing Pyodide...', 'terminal-prompt');
    
    try {
        pyodide = await loadPyodide();
        addTerminalOutput('Pyodide ready!', 'terminal-success');
        addTerminalOutput('Python ' + pyodide.version, 'terminal-success');
    } catch (error) {
        addTerminalOutput('Error loading Pyodide: ' + error.message, 'terminal-error');
    }
}

// Terminal output functions
function addTerminalOutput(text, className = 'terminal-output') {
    const terminal = document.getElementById('terminal');
    const line = document.createElement('div');
    line.className = className;
    line.textContent = text;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

function clearTerminal() {
    const terminal = document.getElementById('terminal');
    terminal.innerHTML = '';
}

// Script management
function getScriptIndex() {
    const index = localStorage.getItem(STORAGE_INDEX_KEY);
    return index ? JSON.parse(index) : [];
}

function saveScriptIndex(index) {
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
}

function saveScript(name, code) {
    const index = getScriptIndex();
    if (!index.includes(name)) {
        index.push(name);
        saveScriptIndex(index);
    }
    localStorage.setItem(STORAGE_PREFIX + name, code);
    updateScriptSelector();
    document.getElementById('script-selector').value = name;
}

function loadScript(name) {
    const code = localStorage.getItem(STORAGE_PREFIX + name);
    return code || '';
}

function deleteScript(name) {
    const index = getScriptIndex();
    const newIndex = index.filter(n => n !== name);
    saveScriptIndex(newIndex);
    localStorage.removeItem(STORAGE_PREFIX + name);
    updateScriptSelector();
    if (document.getElementById('script-selector').value === name) {
        document.getElementById('script-selector').value = '';
        document.getElementById('editor').value = '';
    }
}

function updateScriptSelector() {
    const selector = document.getElementById('script-selector');
    const currentValue = selector.value;
    const index = getScriptIndex();
    
    // Clear existing options except "New Script"
    selector.innerHTML = '<option value="">New Script</option>';
    
    // Add saved scripts
    index.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        selector.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (currentValue && index.includes(currentValue)) {
        selector.value = currentValue;
    }
}

// Download script
function downloadScript() {
    const code = document.getElementById('editor').value.trim();
    if (!code) {
        alert('No code to download.');
        return;
    }
    
    const scriptName = document.getElementById('script-selector').value || 'script';
    const filename = scriptName.endsWith('.py') ? scriptName : scriptName + '.py';
    
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Run Python code
async function runCode() {
    if (!pyodide) {
        addTerminalOutput('Pyodide not initialized yet. Please wait...', 'terminal-error');
        return;
    }
    
    const code = document.getElementById('editor').value.trim();
    if (!code) {
        addTerminalOutput('No code to run.', 'terminal-error');
        return;
    }
    
    clearTerminal();
    addTerminalOutput('>>> Running code...', 'terminal-prompt');
    addTerminalOutput('', 'terminal-output');
    
    try {
        // Capture stdout
        pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
`);
        
        // Run user code
        pyodide.runPython(code);
        
        // Get output
        const stdout = pyodide.runPython('sys.stdout.getvalue()');
        
        if (stdout) {
            addTerminalOutput(stdout, 'terminal-output');
        } else {
            addTerminalOutput('Code executed successfully (no output)', 'terminal-success');
        }
        
        // Restore stdout
        pyodide.runPython(`
import sys
sys.stdout = sys.__stdout__
`);
    } catch (error) {
        addTerminalOutput('Error: ' + error.message, 'terminal-error');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Pyodide
    initPyodide();
    
    // Load saved scripts list
    updateScriptSelector();
    
    // Script selector change
    document.getElementById('script-selector').addEventListener('change', (e) => {
        const name = e.target.value;
        if (name) {
            document.getElementById('editor').value = loadScript(name);
        } else {
            document.getElementById('editor').value = '';
        }
    });
    
    // Save button
    document.getElementById('save-btn').addEventListener('click', () => {
        const code = document.getElementById('editor').value.trim();
        if (!code) {
            alert('Cannot save empty script.');
            return;
        }
        
        const currentName = document.getElementById('script-selector').value;
        let name = currentName;
        
        if (!name) {
            name = prompt('Enter a name for this script:');
            if (!name) return;
            if (name.trim() === '') {
                alert('Script name cannot be empty.');
                return;
            }
            name = name.trim();
        }
        
        saveScript(name, code);
        alert('Script saved!');
    });
    
    // Download button
    document.getElementById('download-btn').addEventListener('click', downloadScript);
    
    // Delete button
    document.getElementById('delete-btn').addEventListener('click', () => {
        const name = document.getElementById('script-selector').value;
        if (!name) {
            alert('No script selected to delete.');
            return;
        }
        
        if (confirm(`Delete script "${name}"?`)) {
            deleteScript(name);
            alert('Script deleted!');
        }
    });
    
    // Run button
    document.getElementById('run-btn').addEventListener('click', runCode);
    
    // Allow Ctrl+Enter to run code
    document.getElementById('editor').addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            runCode();
        }
    });
});

