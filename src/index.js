import 'jquery';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import * as _ from 'lodash';
import MarkdownIt from 'markdown-it';

const { Menu, MenuItem } = nw;

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
            'renderPreview'
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

        const menu = new Menu({ type: 'menubar' });
        menu.createMacBuiltin('Markdown Editor');

        const fileMenu = new Menu();
        fileMenu.append(new MenuItem({ label: 'New' }));
        fileMenu.append(new MenuItem({ label: 'Open' }));
        fileMenu.append(new MenuItem({ label: 'Save' }));
        fileMenu.append(new MenuItem({ label: 'Save As' }));

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


        viewMenu.append(new MenuItem({ label: 'Show Preview Window', click: () => {
            const { converted, preview } = this.state;
            if(preview) return;
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
        }}));

        if(process.platform === 'darwin') {

            menu.insert(new MenuItem({ label: 'File', submenu: fileMenu }), 1);
            menu.insert(new MenuItem({ label: 'View', submenu: viewMenu }), 3);
        } else {
            fileMenu.append(new MenuItem({ label: 'Quit' }), 0);
            menu.append(new MenuItem({ label: 'File', submenu: fileMenu }), 1);
        }
        nw.Window.get().menu = menu;
        this._menu = menu;

        const win = nw.Window.get();
        win.on('close', () => {
            if(this.state.preview) {
                this._previewWindow.close(true);
            }
            win.close(true);
        });

    }

    componentDidMount() {
        this.textAreaNode.focus();
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
            }
        };

        return (
            <div>
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
