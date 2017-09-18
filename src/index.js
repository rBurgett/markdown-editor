import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { bindAll } from 'lodash';
import MarkdownIt from 'markdown-it';
import moment from 'moment';
import fs from 'fs-extra';
import path from 'path';

const handleError = err => {
    console.error(err);
    alert(`ERROR! ${err.message}`);
};

process.on('uncaughtException', handleError);

const { App, Menu, MenuItem, Shell, Shortcut } = nw;

const dataPath = App.dataPath;
const configFilePath = path.join(dataPath, 'config.json');

const sansFont = 'PT Sans';
const serifFont = 'PT Serif';

const md = new MarkdownIt();

const countWords = str => {
    const spacePatt = /[\n\s]+/g;
    const newStr = str.replace(spacePatt, ' ');
    return newStr
        .split(' ')
        .map(s => s.replace(/\W/g, ''))
        .filter(s => s ? true : false)
        .length;
};
const makeTitle = (text, filePath, changed) => {
    const count = countWords(text);
    const titleBarText = filePath ? `${changed ? '*' : ''}${path.basename(filePath)} - Markdown Editor` : 'Markdown Editor';
    return `${count === 1 ? `${count} word` : `${count} words`} - ${titleBarText}`;
};

const readConfigFile = () => {

    fs.ensureFileSync(configFilePath);

    try {
        const data = fs.readJsonSync(configFilePath);
        return data;
    } catch(err) {
        return {};
    }

};

const writeConfigFile = data => {
    fs.writeJson(configFilePath, data);
};

class MarkdownEditor extends Component {

    constructor(props) {
        super(props);

        const { sans = false, size = 16 } = readConfigFile();

        this.state = {
            text: '',
            changed: false,
            count: '',
            converted: '',
            sans,
            size,
            filePath: '',
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            preview: false
        };
        bindAll(this, [
            'onChange',
            'onNew',
            'onOpen',
            'onOpenInputChange',
            'onSave',
            'onSaveInputChange',
            'openHelp',
            'closeHelp',
            'openPreviewWindow',
            'renderPreview',
            'saveFile'
        ]);
    }

    componentWillMount() {

        window.addEventListener('resize', e => {
            const { innerWidth, innerHeight } = e.target;
            this.setState({
                windowWidth: innerWidth,
                windowHeight: innerHeight
            });
        });

        const win = nw.Window.get();

        const menu = new Menu({ type: 'menubar' });
        menu.createMacBuiltin('Markdown Editor');

        const fileMenu = new Menu();
        fileMenu.append(new MenuItem({ label: 'New', click: this.onNew }));
        fileMenu.append(new MenuItem({ label: 'Open', click: this.onOpen }));
        fileMenu.append(new MenuItem({ label: 'Save', click: this.onSave}));
        fileMenu.append(new MenuItem({ label: 'Save As', click: () => {
            $(this.saveFileInputForm).find('input')[0].click();
        }}));

        const viewMenu = new Menu();

        const fontTypeMenu = new Menu();
        fontTypeMenu.append(new MenuItem({ label: 'Serif', click: () => {
            const { size, preview } = this.state;
            const sans = false;
            writeConfigFile({
                sans,
                size
            });
            this.setState({
                ...this.state,
                sans
            });
            if(preview) {
                const previewWindow = this._previewWindow;
                const target = previewWindow.window.document.getElementById('js-main');
                target.style.fontFamily = serifFont;
            }
        }}));
        fontTypeMenu.append(new MenuItem({ label: 'Sans-Serif', click: () => {
            const { size, preview } = this.state;
            const sans = true;
            writeConfigFile({
                sans,
                size
            });
            this.setState({
                ...this.state,
                sans
            });
            if(preview) {
                const previewWindow = this._previewWindow;
                const target = previewWindow.window.document.getElementById('js-main');
                target.style.fontFamily = sansFont;
            }
        }}));
        viewMenu.append(new MenuItem({ label: 'Display Font Type', submenu: fontTypeMenu }));

        const fontSizeMenu = new Menu();
        fontSizeMenu.append(new MenuItem({ label: '12px', click: () => {
            const { sans } = this.state;
            const size = 12;
            writeConfigFile({
                sans,
                size
            });
            this.setState({
                ...this.state,
                size
            });
        }}));
        fontSizeMenu.append(new MenuItem({ label: '14px', click: () => {
            const { sans } = this.state;
            const size = 14;
            writeConfigFile({
                sans,
                size
            });
            this.setState({
                ...this.state,
                size
            });
        }}));
        fontSizeMenu.append(new MenuItem({ label: '16px (default)', click: () => {
            const { sans } = this.state;
            const size = 16;
            writeConfigFile({
                sans,
                size
            });
            this.setState({
                ...this.state,
                size: 16
            });
        }}));
        fontSizeMenu.append(new MenuItem({ label: '18px', click: () => {
            const { sans } = this.state;
            const size = 18;
            writeConfigFile({
                sans,
                size
            });
            this.setState({
                ...this.state,
                size
            });
        }}));
        fontSizeMenu.append(new MenuItem({ label: '20px', click: () => {
            const { sans } = this.state;
            const size = 20;
            writeConfigFile({
                sans,
                size
            });
            this.setState({
                ...this.state,
                size
            });
        }}));

        viewMenu.append(new MenuItem({ label: 'Display Font Size', submenu: fontSizeMenu }));

        viewMenu.append(new MenuItem({ label: 'Show Preview Window', click: this.openPreviewWindow}));

        const helpMenu = new Menu();
        helpMenu.append(new MenuItem({ label: 'Keyboard Shortcuts', click: () => {
            this.openHelp();
        }}));
        helpMenu.append(new MenuItem({ label: 'Markdown Reference', click: () => {
            this.openMarkdownReference();
        }}));

        if(process.platform === 'darwin') {
            viewMenu.append(new MenuItem({ type: 'separator' }));
            menu.insert(new MenuItem({ label: 'File', submenu: fileMenu }), 1);
            menu.insert(new MenuItem({ label: 'View', submenu: viewMenu }), 3);
        } else {
            fileMenu.append(new MenuItem({ label: 'Quit', click: () => win.close(true) }), 0);
            menu.append(new MenuItem({ label: 'File', submenu: fileMenu }), 1);
        }
        menu.append(new MenuItem({ label: 'Help', submenu: helpMenu }));
        nw.Window.get().menu = menu;
        this._menu = menu;

        win.on('close', () => {
            const { changed } = this.state;
            if(changed) {
                const confirmed = confirm('Would you like to abandon your unsaved changes?');
                if(!confirmed) return;
            }
            if(this.state.preview) {
                this._previewWindow.close(true);
            }
            win.close(true);
        });

        App.registerGlobalHotKey(new Shortcut({
            key: process.platform === 'darwin' ? 'Command+P' : 'Ctrl+P',
            active: this.openPreviewWindow
        }));
        App.registerGlobalHotKey(new Shortcut({
            key: process.platform === 'darwin' ? 'Command+S' : 'Ctrl+S',
            active: this.onSave
        }));
        App.registerGlobalHotKey(new Shortcut({
            key: process.platform === 'darwin' ? 'Command+O' : 'Ctrl+O',
            active: this.onOpen
        }));
        App.registerGlobalHotKey(new Shortcut({
            key: process.platform === 'darwin' ? 'Command+N' : 'Ctrl+N',
            active: this.onNew
        }));
        App.registerGlobalHotKey(new Shortcut({
            key: process.platform === 'darwin' ? 'Command+M' : 'Ctrl+M',
            active: this.openMarkdownReference
        }));
        App.registerGlobalHotKey(new Shortcut({
            key: process.platform === 'darwin' ? 'Command+=' : 'Ctrl+=',
            active: () => {
                const { size, sans } = this.state;
                if(size < 20) {
                    const newSize = size + 2;
                    writeConfigFile({
                        sans,
                        size: newSize
                    });
                    this.setState({
                        ...this.state,
                        size: newSize
                    });
                }
            }
        }));
        App.registerGlobalHotKey(new Shortcut({
            key: process.platform === 'darwin' ? 'Command+-' : 'Ctrl+-',
            active: () => {
                const { size, sans } = this.state;
                if(size > 12) {
                    const newSize = size - 2;
                    writeConfigFile({
                        sans,
                        size: newSize
                    });
                    this.setState({
                        ...this.state,
                        size: newSize
                    });
                }
            }
        }));
        App.registerGlobalHotKey(new Shortcut({
            key: process.platform === 'darwin' ? 'Command+H' : 'Ctrl+H',
            active: this.openHelp
        }));

    }

    componentDidMount() {
        this.textAreaNode.focus();
        $(this.saveFileInputForm)
            .find('input')
            .attr('nwsaveas', `${moment().format('YYYY-MM-DD')}.md`);
    }

    onSave() {
        const { filePath, text } = this.state;
        if(filePath) {
            this.saveFile(filePath, text);
        } else {
            $(this.saveFileInputForm).find('input')[0].click();
        }
    }

    onOpen() {
        const { changed } = this.state;
        if(changed) {
            const confirmed = confirm('Would you like to abandon your unsaved changes?');
            if(!confirmed) return;
        }
        $(this.openFileInput)[0].click();
    }

    onNew() {
        const { changed } = this.state;
        if(changed) {
            const confirmed = confirm('Would you like to abandon your unsaved changes?');
            if(!confirmed) return;
        }
        this.setState({
            ...this.state,
            text: '',
            converted: '',
            count: 0,
            changed: false,
            filePath: ''
        });
        this.renderPreview('');
    }

    openPreviewWindow() {
        const { sans, converted, preview } = this.state;
        if(preview) {
            this._previewWindow.focus();
            return;
        }
        nw.Window.open('preview.html', {width: 580, height: 580}, win => {
            this._previewWindow = win;
            win.on('loaded', () => {
                this.setState({
                    ...this.state,
                    preview: true
                });
                const target = win.window.document.getElementById('js-main');
                target.style.fontFamily = sans ? sansFont : serifFont;
                this.renderPreview(converted);
            });
            win.on('close', () => {
                this.setState({
                    ...this.state,
                    preview: false
                });
                win.close(true);
            });
        });
    }

    renderPreview(converted) {
        const previewWindow = this._previewWindow;
        const target = previewWindow.window.document.getElementById('js-main');
        target.innerHTML = converted;
        previewWindow.window.scrollTo(0, previewWindow.window.document.body.scrollHeight);
    }

    onChange(e) {
        e.preventDefault();
        const { preview, filePath } = this.state;
        const text = e.target.value;
        const converted = md.render(text);
        const count = countWords(text);
        this.setState({
            text,
            converted,
            count,
            changed: true
        });
        document.title = makeTitle(text, filePath, true);
        if(preview) this.renderPreview(converted);
    }

    saveFile(filePath, text) {
        fs.writeFileSync(path.normalize(filePath), text, 'utf8');
        this.setState({
            ...this.state,
            changed: false
        });
        document.title = makeTitle(text, filePath, false);
    }

    onSaveInputChange(e) {
        e.preventDefault();
        const { text } = this.state;
        const [ file ] = e.target.files;
        const filePath = file.path;
        this.saveFile(filePath, text);
        this.setState({
            ...this.state,
            filePath
        });
    }

    onOpenInputChange(e) {
        e.preventDefault();
        const { preview } = this.state;
        const [ file ] = e.target.files;
        const filePath = file.path;
        if(path.extname(filePath) !== '.md') {
            alert('You can only open markdown (.md) files.');
            return;
        }
        const text = fs.readFileSync(path.normalize(filePath), 'utf8');
        const converted = md.render(text);
        const count = countWords(text);
        this.setState({
            text,
            converted,
            count,
            filePath,
            changed: false
        });
        document.title = makeTitle(text, filePath, false);
        if(preview) this.renderPreview(converted);
    }

    openHelp() {
        const $target = $('#js-helpModal');
        $target.modal('show');
        $target
            .off('hidden.bs.modal')
            .on('hidden.bs.modal', () => {
                this.textAreaNode.focus();
            });
    }

    closeHelp() {
        $('#js-helpModal').modal('hide');
    }

    openMarkdownReference() {
        Shell.openExternal('http://commonmark.org/help/');
    }

    render() {
        const {
            sans,
            size,
            text,
            windowHeight
        } = this.state;

        const styles = {
            textarea: {
                fontFamily: sans ? sansFont : serifFont,
                resize: 'none',
                height: windowHeight,
                border: 0,
                fontSize: size
            },
            fileInput: {
                display: 'none'
            }
        };

        const darwin = process.platform === 'darwin';

        return (
            <div>
                <input ref={node => this.openFileInput = node} style={styles.fileInput} type={'file'} onChange={this.onOpenInputChange} accept={'.md'} />
                <form ref={node => this.saveFileInputForm = node}>
                    <input style={styles.fileInput} type={'file'} onChange={this.onSaveInputChange} />
                </form>
                <textarea
                    ref={node => this.textAreaNode = node}
                    style={styles.textarea}
                    className={'form-control'}
                    value={text}
                    onChange={this.onChange} />

                <div id={'js-helpModal'} className={'modal fade'} tabIndex={'-1'}>
                    <div className={'modal-dialog'}>
                        <div className={'modal-content'}>
                            <div className={'modal-header'}>
                                <button type={'button'} className={'close'} onClick={this.closeHelp}><span>&times;</span></button>
                                <h4 className={'modal-title'}>Keyboard Shortcuts</h4>
                            </div>
                            <div className={'modal-body'}>
                                <table className={'table'}>
                                    <tbody>
                                        <tr>
                                            <td>{darwin ? 'Cmd + N' : 'Ctrl + N'}</td>
                                            <td>New</td>
                                        </tr>
                                        <tr>
                                            <td>{darwin ? 'Cmd + O' : 'Ctrl + O'}</td>
                                            <td>Open</td>
                                        </tr>
                                        <tr>
                                            <td>{darwin ? 'Cmd + S' : 'Ctrl + S'}</td>
                                            <td>Save/Save As</td>
                                        </tr>
                                        <tr>
                                            <td>{darwin ? 'Cmd + =' : 'Ctrl + ='}</td>
                                            <td>Increase Font Size</td>
                                        </tr>
                                        <tr>
                                            <td>{darwin ? 'Cmd + -' : 'Ctrl + -'}</td>
                                            <td>Decrease Font Size</td>
                                        </tr>
                                        <tr>
                                            <td>{darwin ? 'Cmd + P' : 'Ctrl + P'}</td>
                                            <td>Show Preview Window</td>
                                        </tr>
                                        <tr>
                                            <td>{darwin ? 'Cmd + H' : 'Ctrl + H'}</td>
                                            <td>Show Keyboard Shortcuts</td>
                                        </tr>
                                        <tr>
                                            <td>{darwin ? 'Cmd + M' : 'Ctrl + M'}</td>
                                            <td>Open Markdown Reference</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className={'modal-footer'}>
                                <button type={'button'} className={'btn btn-default'} onClick={this.closeHelp}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        );
    }

}

ReactDOM.render(
    <MarkdownEditor />,
    document.getElementById('js-main')
);
