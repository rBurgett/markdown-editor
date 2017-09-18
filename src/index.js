import $ from 'jquery';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import * as _ from 'lodash';
import MarkdownIt from 'markdown-it';
import moment from 'moment';
import fs from 'fs';
import path from 'path';

// window.$ = $;
// const { swal } = require('promise-alert');
// window.swal = swal;

const { App, Menu, MenuItem, Shortcut } = nw;

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

class MarkdownEditor extends Component {

    constructor(props) {
        super(props);
        this.state = {
            text: '',
            count: '',
            converted: '',
            serif: true,
            size: 16,
            filePath: '',
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            preview: false
        };
        _.bindAll(this, [
            'onChange',
            'onNew',
            'onOpen',
            'onOpenInputChange',
            'onSave',
            'onSaveInputChange',
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
            this.setState({
                ...this.state,
                serif: true
            });
        }}));
        fontTypeMenu.append(new MenuItem({ label: 'Sans-Serif', click: () => {
            this.setState({
                ...this.state,
                serif: false
            });
        }}));
        viewMenu.append(new MenuItem({ label: 'Display Font Type', submenu: fontTypeMenu }));

        const fontSizeMenu = new Menu();
        fontSizeMenu.append(new MenuItem({ label: '12px', click: () => {
            this.setState({
                ...this.state,
                size: 12
            });
        }}));
        fontSizeMenu.append(new MenuItem({ label: '14px', click: () => {
            this.setState({
                ...this.state,
                size: 14
            });
        }}));
        fontSizeMenu.append(new MenuItem({ label: '16px (default)', click: () => {
            this.setState({
                ...this.state,
                size: 16
            });
        }}));
        fontSizeMenu.append(new MenuItem({ label: '18px', click: () => {
            this.setState({
                ...this.state,
                size: 18
            });
        }}));
        fontSizeMenu.append(new MenuItem({ label: '20px', click: () => {
            this.setState({
                ...this.state,
                size: 20
            });
        }}));

        viewMenu.append(new MenuItem({ label: 'Display Font Size', submenu: fontSizeMenu }));

        viewMenu.append(new MenuItem({ label: 'Show Preview Window', click: this.openPreviewWindow}));

        if(process.platform === 'darwin') {
            menu.insert(new MenuItem({ label: 'File', submenu: fileMenu }), 1);
            menu.insert(new MenuItem({ label: 'View', submenu: viewMenu }), 3);
        } else {
            fileMenu.append(new MenuItem({ label: 'Quit', click: () => win.close(true) }), 0);
            menu.append(new MenuItem({ label: 'File', submenu: fileMenu }), 1);
        }
        nw.Window.get().menu = menu;
        this._menu = menu;

        win.on('close', () => {
            if(this.state.preview) {
                this._previewWindow.close(true);
            }
            win.close(true);
        });

        App.registerGlobalHotKey(new Shortcut({
            key: process.platform === 'darwin' ? 'Command+P' : 'Ctrl+P',
            active: this.openPreviewWindow,
            failed: () => console.log('Oops!')
        }));
        App.registerGlobalHotKey(new Shortcut({
            key: process.platform === 'darwin' ? 'Command+S' : 'Ctrl+S',
            active: this.onSave,
            failed: () => console.log('Oops!')
        }));
        App.registerGlobalHotKey(new Shortcut({
            key: process.platform === 'darwin' ? 'Command+O' : 'Ctrl+O',
            active: this.onOpen,
            failed: () => console.log('Oops!')
        }));
        App.registerGlobalHotKey(new Shortcut({
            key: process.platform === 'darwin' ? 'Command+N' : 'Ctrl+N',
            active: this.onNew,
            failed: () => console.log('Oops!')
        }));

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
        const { filePath, text } = this.state;
        if(filePath) {
            const confirmed = confirm('Would you like to save your changes?');
            if(confirmed) this.saveFile(filePath, text, true);
        }
        $(this.openFileInput)[0].click();
    }

    onNew() {
        const { filePath, text } = this.state;
        if(filePath) {
            const confirmed = confirm('Would you like to save your changes?');
            if(confirmed) this.saveFile(filePath, text, true);
        }
        this.setState({
            ...this.state,
            text: '',
            converted: '',
            count: 0,
            filePath: ''
        });
        this.renderPreview('');
    }

    componentDidMount() {
        this.textAreaNode.focus();
        $(this.saveFileInputForm)
            .find('input')
            .attr('nwsaveas', `${moment().format('YYYY-MM-DD')}.md`);
    }

    openPreviewWindow() {
        const { converted, preview } = this.state;
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
        previewWindow.scrollTo(0, previewWindow.window.document.body.scrollHeight);
    }

    onChange(e) {
        e.preventDefault();
        const { preview } = this.state;
        const text = e.target.value;
        const converted = md.render(text);
        const count = countWords(text);
        document.title = `${count === 1 ? `${count} word` : `${count} words`} - Markdown Editor`;
        this.setState({
            text,
            converted,
            count
        });
        if(preview) this.renderPreview(converted);
    }

    saveFile(filePath, text, skipAlert) {
        fs.writeFileSync(path.normalize(filePath), text, 'utf8');
        // swal('Success!', 'File successfully saved', 'success');
        if(!skipAlert) alert('File successfully saved!');
    }

    onSaveInputChange(e) {
        e.preventDefault();
        const [ file ] = e.target.files;
        const filePath = file.path;
        this.saveFile(filePath, this.state.text);
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
            filePath
        });
        if(preview) this.renderPreview(converted);
    }

    render() {
        const {
            serif,
            size,
            text,
            windowHeight
        } = this.state;

        const styles = {
            textarea: {
                fontFamily: serif ? 'PT Serif' : 'PT Sans',
                resize: 'none',
                height: windowHeight,
                border: 0,
                fontSize: size
            },
            fileInput: {
                display: 'none'
            }
        };

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
            </div>

        );
    }

}

ReactDOM.render(
    <MarkdownEditor />,
    document.getElementById('js-main')
);
